// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Test} from "forge-std/Test.sol";
import {AaveV3Adapter} from "../../contracts/defi/AaveV3Adapter.sol";
import {IntentManager} from "../../contracts/core/IntentManager.sol";
import {LiquidityManager} from "../../contracts/defi/LiquidityManager.sol";
import {RiskController} from "../../contracts/risk/RiskController.sol";
import {UniswapV4Adapter} from "../../contracts/defi/UniswapV4Adapter.sol";
import {Vault} from "../../contracts/core/Vault.sol";
import {IUniswapV4PoolManager} from "../../contracts/interfaces/IUniswapV4PoolManager.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";

contract LiquidityToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract LiquidityPoolManagerMock is IUniswapV4PoolManager {
    int256 public callerDelta;
    int256 public feesAccrued;

    function setDelta(int128 amount0, int128 amount1, int256 fees) external {
        callerDelta = (int256(amount0) << 128) | int256(uint256(uint128(amount1)));
        feesAccrued = fees;
    }

    function unlock(bytes calldata data) external returns (bytes memory result) {
        return UniswapV4Adapter(msg.sender).unlockCallback(data);
    }

    function swap(PoolKey calldata, SwapParams calldata, bytes calldata) external pure returns (int256) {
        return 0;
    }

    function modifyLiquidity(PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        external
        view
        returns (int256, int256)
    {
        return (callerDelta, feesAccrued);
    }

    function sync(address) external {}

    function take(address currency, address to, uint256 amount) external {
        IERC20(currency).transfer(to, amount);
    }

    function settle() external payable returns (uint256 paid) {
        return 0;
    }
}

contract LiquidityManagerTest is Test {
    bytes32 private constant PROTOCOL_ID = keccak256("uniswap-v4");
    bytes32 private constant RESERVATION_0 = keccak256("reserve-0");
    bytes32 private constant RESERVATION_1 = keccak256("reserve-1");
    uint256 private constant AMOUNT_0 = 100e18;
    uint256 private constant AMOUNT_1 = 200e18;

    address private admin = makeAddr("admin");
    address private keeper = makeAddr("keeper");
    address private owner = makeAddr("owner");
    LiquidityToken private token0;
    LiquidityToken private token1;
    IntentManager private intentManager;
    Vault private vault;
    RiskController private riskController;
    LiquidityPoolManagerMock private poolManager;
    UniswapV4Adapter private adapter;
    LiquidityManager private liquidityManager;
    IUniswapV4PoolManager.PoolKey private poolKey;
    bytes32 private intentId;
    bytes32 private positionId;

    function setUp() public {
        token0 = new LiquidityToken("Token 0", "T0");
        token1 = new LiquidityToken("Token 1", "T1");
        intentManager = new IntentManager(admin);
        vault = new Vault(admin);
        riskController = new RiskController(admin, intentManager, _protocolLimits());
        poolManager = new LiquidityPoolManagerMock();
        adapter = new UniswapV4Adapter(admin, poolManager);
        liquidityManager = new LiquidityManager(admin, intentManager, adapter, riskController, vault);
        poolKey = _poolKey();

        vm.startPrank(admin);
        adapter.grantRole(adapter.CALLER_ROLE(), address(liquidityManager));
        vault.grantRole(vault.EXECUTOR_ROLE(), address(liquidityManager));
        liquidityManager.grantRole(liquidityManager.EXECUTOR_ROLE(), keeper);
        liquidityManager.configureAsset(poolKey.currency0, true);
        liquidityManager.configureAsset(poolKey.currency1, true);
        vm.stopPrank();

        intentId = _submitIntent();
        LiquidityToken(poolKey.currency0).mint(owner, AMOUNT_0);
        LiquidityToken(poolKey.currency1).mint(owner, AMOUNT_1);
        vm.startPrank(owner);
        IERC20(poolKey.currency0).approve(address(vault), AMOUNT_0);
        IERC20(poolKey.currency1).approve(address(vault), AMOUNT_1);
        vault.deposit(poolKey.currency0, AMOUNT_0, owner);
        vault.deposit(poolKey.currency1, AMOUNT_1, owner);
        vault.reserveSelf(poolKey.currency0, AMOUNT_0, RESERVATION_0);
        vault.reserveSelf(poolKey.currency1, AMOUNT_1, RESERVATION_1);
        vm.stopPrank();
        poolManager.setDelta(-int128(int256(AMOUNT_0)), -int128(int256(AMOUNT_1)), 3e18);
    }

    function test_AddLiquidityConsumesReservationsAndRecordsPosition() public {
        vm.prank(keeper);
        positionId = liquidityManager.addLiquidity(
            intentId,
            poolKey,
            -600,
            600,
            1_000e18,
            keccak256("salt"),
            RESERVATION_0,
            AMOUNT_0,
            RESERVATION_1,
            AMOUNT_1,
            _constraints(),
            bytes("hook")
        );

        LiquidityManager.LiquidityPosition memory position = liquidityManager.getPosition(positionId);
        assertEq(position.owner, owner);
        assertEq(position.intentId, intentId);
        assertEq(position.liquidity, 1_000e18);
        assertTrue(position.active);
        assertEq(vault.reservedBalance(owner, poolKey.currency0, RESERVATION_0), 0);
        assertEq(vault.reservedBalance(owner, poolKey.currency1, RESERVATION_1), 0);
        assertEq(IERC20(poolKey.currency0).balanceOf(address(poolManager)), AMOUNT_0);
        assertEq(IERC20(poolKey.currency1).balanceOf(address(poolManager)), AMOUNT_1);
    }

    function test_CloseLiquidityCreditsReturnedTokensAndDeactivatesPosition() public {
        vm.prank(keeper);
        positionId = liquidityManager.addLiquidity(
            intentId,
            poolKey,
            -600,
            600,
            1_000e18,
            keccak256("salt"),
            RESERVATION_0,
            AMOUNT_0,
            RESERVATION_1,
            AMOUNT_1,
            _constraints(),
            bytes("")
        );
        poolManager.setDelta(int128(90e18), int128(180e18), 4e18);

        vm.prank(keeper);
        (uint256 output0, uint256 output1) = liquidityManager.closeLiquidity(positionId, 90e18, 180e18, bytes(""));

        assertEq(output0, 90e18);
        assertEq(output1, 180e18);
        assertEq(vault.availableBalance(owner, poolKey.currency0), 90e18);
        assertEq(vault.availableBalance(owner, poolKey.currency1), 180e18);
        assertFalse(liquidityManager.getPosition(positionId).active);
    }

    function test_DeltaExceedingReservationFailsAtomically() public {
        poolManager.setDelta(-int128(int256(AMOUNT_0 + 1)), -int128(int256(AMOUNT_1)), 0);
        vm.prank(keeper);
        vm.expectRevert();
        liquidityManager.addLiquidity(
            intentId,
            poolKey,
            -600,
            600,
            1_000e18,
            keccak256("salt"),
            RESERVATION_0,
            AMOUNT_0,
            RESERVATION_1,
            AMOUNT_1,
            _constraints(),
            bytes("")
        );
        assertEq(vault.reservedBalance(owner, poolKey.currency0, RESERVATION_0), AMOUNT_0);
    }

    function _poolKey() private view returns (IUniswapV4PoolManager.PoolKey memory key) {
        if (address(token0) < address(token1)) {
            return IUniswapV4PoolManager.PoolKey(address(token0), address(token1), 3_000, 60, address(1));
        }
        return IUniswapV4PoolManager.PoolKey(address(token1), address(token0), 3_000, 60, address(1));
    }

    function _submitIntent() private returns (bytes32 newIntentId) {
        MetronTypes.AutomationPolicy memory policy = MetronTypes.AutomationPolicy({
            maxCapitalMoveBps: 1_000,
            maxCollateralSaleBps: 1_000,
            maxSlippageBps: 100,
            maxRepaymentAmount: 10_000e18,
            maxGasFeeWei: 0.05 ether,
            minHealthFactorWad: 1.2e18,
            rebalanceEnabled: true,
            recoveryEnabled: true,
            emergencyUnwindEnabled: true
        });
        uint256[] memory chains = new uint256[](1);
        chains[0] = block.chainid;
        bytes32[] memory protocols = new bytes32[](1);
        protocols[0] = PROTOCOL_ID;
        address[] memory assets = new address[](2);
        assets[0] = poolKey.currency0;
        assets[1] = poolKey.currency1;
        IntentManager.IntentSubmission memory submission = IntentManager.IntentSubmission({
            owner: owner,
            traceId: keccak256("liquidity-trace"),
            commitment: keccak256("liquidity-intent"),
            policyHash: keccak256(abi.encode(policy)),
            nonce: 0,
            expiresAt: uint64(block.timestamp + 1 days),
            targetDeltaWad: 0,
            deltaToleranceWad: 0.1e18,
            chainsHash: keccak256(abi.encodePacked(chains)),
            protocolsHash: keccak256(abi.encodePacked(protocols)),
            assetsHash: keccak256(abi.encodePacked(assets))
        });
        vm.prank(owner);
        newIntentId = intentManager.submitIntent(submission, chains, protocols, assets);
        vm.prank(owner);
        riskController.configureIntentPolicy(newIntentId, policy);
    }

    function _constraints() private pure returns (MetronTypes.ExecutionConstraints memory) {
        return MetronTypes.ExecutionConstraints({
            slippageBps: 100,
            capitalMoveBps: 1_000,
            collateralSaleBps: 0,
            repaymentAmount: 0,
            resultingHealthFactorWad: 1.5e18,
            gasFeeWei: 0.01 ether,
            actionRisk: MetronTypes.ActionRisk.NEUTRAL,
            automationKind: MetronTypes.AutomationKind.MANUAL
        });
    }

    function _protocolLimits() private pure returns (MetronTypes.AutomationPolicy memory) {
        return MetronTypes.AutomationPolicy({
            maxCapitalMoveBps: 2_000,
            maxCollateralSaleBps: 1_000,
            maxSlippageBps: 300,
            maxRepaymentAmount: type(uint128).max,
            maxGasFeeWei: 1 ether,
            minHealthFactorWad: 1.1e18,
            rebalanceEnabled: true,
            recoveryEnabled: true,
            emergencyUnwindEnabled: true
        });
    }
}
