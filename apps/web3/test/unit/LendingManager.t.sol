// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Test} from "forge-std/Test.sol";
import {AaveV3Adapter} from "../../contracts/defi/AaveV3Adapter.sol";
import {IntentManager} from "../../contracts/core/IntentManager.sol";
import {LendingManager} from "../../contracts/defi/LendingManager.sol";
import {RiskController} from "../../contracts/risk/RiskController.sol";
import {Vault} from "../../contracts/core/Vault.sol";
import {IAaveV3Pool} from "../../contracts/interfaces/IAaveV3Pool.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";

contract LendingToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract AavePoolMock is IAaveV3Pool {
    mapping(address asset => uint256 collateral) public supplied;
    mapping(address asset => uint256 debt) public debts;
    uint256 public healthFactor = 2e18;

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        supplied[asset] += amount;
        onBehalfOf;
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256 withdrawn) {
        withdrawn = amount > supplied[asset] ? supplied[asset] : amount;
        supplied[asset] -= withdrawn;
        IERC20(asset).transfer(to, withdrawn);
    }

    function borrow(address asset, uint256 amount, uint256, uint16, address onBehalfOf) external {
        debts[asset] += amount;
        IERC20(asset).transfer(onBehalfOf, amount);
    }

    function repay(address asset, uint256 amount, uint256, address) external returns (uint256 repaid) {
        repaid = amount > debts[asset] ? debts[asset] : amount;
        debts[asset] -= repaid;
        IERC20(asset).transferFrom(msg.sender, address(this), repaid);
    }

    function getUserAccountData(address) external view returns (uint256, uint256, uint256, uint256, uint256, uint256) {
        return (1_000e18, 500e18, 500e18, 8_500, 7_500, healthFactor);
    }

    function flashLoanSimple(address, address, uint256, bytes calldata, uint16) external {}
}

contract LendingManagerTest is Test {
    bytes32 private constant AAVE_PROTOCOL_ID = keccak256("aave-v3");
    bytes32 private constant RESERVATION_ID = keccak256("repayment");
    uint256 private constant SUPPLY_AMOUNT = 1_000e18;
    uint256 private constant BORROW_AMOUNT = 250e18;

    address private admin = makeAddr("admin");
    address private keeper = makeAddr("keeper");
    address private owner = makeAddr("owner");
    address private collateral = makeAddr("collateral");

    LendingToken private collateralToken;
    LendingToken private debtToken;
    IntentManager private intentManager;
    Vault private vault;
    AavePoolMock private pool;
    AaveV3Adapter private adapter;
    RiskController private riskController;
    LendingManager private lendingManager;
    bytes32 private intentId;

    function setUp() public {
        collateralToken = new LendingToken("Collateral", "COL");
        debtToken = new LendingToken("Debt", "DEBT");
        intentManager = new IntentManager(admin);
        vault = new Vault(admin);
        pool = new AavePoolMock();
        adapter = new AaveV3Adapter(admin, pool);
        riskController = new RiskController(admin, intentManager, _protocolLimits());
        lendingManager = new LendingManager(admin, intentManager, adapter, riskController, vault);

        vm.startPrank(admin);
        adapter.grantRole(adapter.CALLER_ROLE(), address(lendingManager));
        vault.grantRole(vault.EXECUTOR_ROLE(), address(lendingManager));
        lendingManager.grantRole(lendingManager.EXECUTOR_ROLE(), keeper);
        lendingManager.configureAsset(address(collateralToken), true);
        lendingManager.configureAsset(address(debtToken), true);
        vm.stopPrank();

        debtToken.mint(address(pool), 10_000e18);
        collateralToken.mint(owner, SUPPLY_AMOUNT);
        intentId = _submitIntent();
        vm.startPrank(owner);
        collateralToken.approve(address(vault), SUPPLY_AMOUNT);
        vault.deposit(address(collateralToken), SUPPLY_AMOUNT, owner);
        vault.reserveSelf(address(collateralToken), SUPPLY_AMOUNT, keccak256("supply"));
        vm.stopPrank();
    }

    function test_SupplyUsesVaultReservationAndAuthoritativeAccountData() public {
        vm.prank(keeper);
        lendingManager.supply(
            intentId,
            address(collateralToken),
            SUPPLY_AMOUNT,
            keccak256("supply"),
            _constraints(MetronTypes.ActionRisk.NEUTRAL, MetronTypes.AutomationKind.MANUAL)
        );

        assertEq(pool.supplied(address(collateralToken)), SUPPLY_AMOUNT);
        assertEq(vault.reservedBalance(owner, address(collateralToken), keccak256("supply")), 0);
        (,,,,, uint256 healthFactor) = lendingManager.accountData();
        assertEq(healthFactor, 2e18);
    }

    function test_BorrowCreditsVaultAndRepayConsumesReservation() public {
        vm.prank(keeper);
        uint256 credited = lendingManager.borrow(
            intentId,
            address(debtToken),
            BORROW_AMOUNT,
            2,
            BORROW_AMOUNT,
            _constraints(MetronTypes.ActionRisk.RISK_INCREASING, MetronTypes.AutomationKind.MANUAL)
        );
        assertEq(credited, BORROW_AMOUNT);
        assertEq(vault.availableBalance(owner, address(debtToken)), BORROW_AMOUNT);

        vm.startPrank(owner);
        vault.reserveSelf(address(debtToken), BORROW_AMOUNT, RESERVATION_ID);
        vm.stopPrank();
        vm.prank(keeper);
        uint256 repaid = lendingManager.repay(
            intentId,
            address(debtToken),
            BORROW_AMOUNT,
            RESERVATION_ID,
            2,
            _constraints(MetronTypes.ActionRisk.RISK_REDUCING, MetronTypes.AutomationKind.RECOVERY)
        );
        assertEq(repaid, BORROW_AMOUNT);
        assertEq(pool.debts(address(debtToken)), 0);
    }

    function test_UnapprovedAssetFailsBeforeCapitalMovement() public {
        address unknownAsset = makeAddr("unknown-asset");
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(LendingManager.AssetNotApproved.selector, unknownAsset));
        lendingManager.borrow(
            intentId,
            unknownAsset,
            1e18,
            2,
            1e18,
            _constraints(MetronTypes.ActionRisk.RISK_INCREASING, MetronTypes.AutomationKind.MANUAL)
        );
    }

    function test_RiskModeBlocksRiskIncreasingBorrowBeforeCapitalMovement() public {
        vm.prank(admin);
        riskController.setOperationMode(MetronTypes.OperationMode.RESTRICTED, keccak256("stress"));

        vm.prank(keeper);
        vm.expectRevert(
            abi.encodeWithSelector(
                RiskController.ActionBlockedByMode.selector,
                MetronTypes.OperationMode.RESTRICTED,
                MetronTypes.ActionRisk.RISK_INCREASING
            )
        );
        lendingManager.borrow(
            intentId,
            address(debtToken),
            BORROW_AMOUNT,
            2,
            BORROW_AMOUNT,
            _constraints(MetronTypes.ActionRisk.RISK_INCREASING, MetronTypes.AutomationKind.MANUAL)
        );
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
        protocols[0] = AAVE_PROTOCOL_ID;
        address[] memory assets = new address[](2);
        assets[0] = address(collateralToken);
        assets[1] = address(debtToken);
        IntentManager.IntentSubmission memory submission = IntentManager.IntentSubmission({
            owner: owner,
            traceId: keccak256("lending-trace"),
            commitment: keccak256("lending-intent"),
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

    function _constraints(MetronTypes.ActionRisk actionRisk, MetronTypes.AutomationKind automationKind)
        private
        pure
        returns (MetronTypes.ExecutionConstraints memory)
    {
        return MetronTypes.ExecutionConstraints({
            slippageBps: 50,
            capitalMoveBps: 1_000,
            collateralSaleBps: 0,
            repaymentAmount: BORROW_AMOUNT,
            resultingHealthFactorWad: 1.5e18,
            gasFeeWei: 0.01 ether,
            actionRisk: actionRisk,
            automationKind: automationKind
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
