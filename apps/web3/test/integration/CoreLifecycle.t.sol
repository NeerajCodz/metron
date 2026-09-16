// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Test} from "forge-std/Test.sol";
import {IntentManager} from "../../contracts/core/IntentManager.sol";
import {PositionManager} from "../../contracts/core/PositionManager.sol";
import {StrategyExecutor} from "../../contracts/core/StrategyExecutor.sol";
import {Vault} from "../../contracts/core/Vault.sol";
import {IStrategyAdapter} from "../../contracts/interfaces/IStrategyAdapter.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";
import {RiskController} from "../../contracts/risk/RiskController.sol";

contract LifecycleToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract LifecycleAdapter is IStrategyAdapter {
    uint256 public outputAmount;

    function setOutputAmount(uint256 amount) external {
        outputAmount = amount;
    }

    function execute(address, address, address outputAsset, uint256, bytes calldata data)
        external
        returns (bytes32 resultHash)
    {
        IERC20(outputAsset).transfer(msg.sender, outputAmount);
        return keccak256(data);
    }
}

contract CoreLifecycleIntegrationTest is Test {
    bytes32 private constant PROTOCOL_ID = keccak256("lifecycle-protocol");
    bytes32 private constant STRATEGY_ID = keccak256("lifecycle-strategy");
    bytes32 private constant RESERVATION_ID = keccak256("lifecycle-reservation");
    uint256 private constant INPUT_AMOUNT = 1_000e18;
    uint256 private constant OUTPUT_AMOUNT = 990e18;

    address private admin = makeAddr("lifecycle-admin");
    address private keeper = makeAddr("lifecycle-keeper");
    address private owner = makeAddr("lifecycle-owner");
    address private recipient = makeAddr("lifecycle-recipient");

    IntentManager private intentManager;
    PositionManager private positionManager;
    RiskController private riskController;
    Vault private vault;
    StrategyExecutor private strategyExecutor;
    LifecycleAdapter private adapter;
    LifecycleToken private inputToken;
    LifecycleToken private outputToken;
    bytes32 private intentId;

    function setUp() public {
        inputToken = new LifecycleToken("Lifecycle Input", "LIN");
        outputToken = new LifecycleToken("Lifecycle Output", "LOUT");
        intentManager = new IntentManager(admin);
        positionManager = new PositionManager(admin, intentManager);
        vault = new Vault(admin);
        riskController = new RiskController(admin, intentManager, _protocolLimits());
        strategyExecutor = new StrategyExecutor(admin, intentManager, positionManager, riskController, vault);
        adapter = new LifecycleAdapter();

        vm.startPrank(admin);
        vault.grantRole(vault.EXECUTOR_ROLE(), address(strategyExecutor));
        positionManager.grantRole(positionManager.EXECUTOR_ROLE(), address(strategyExecutor));
        strategyExecutor.grantRole(strategyExecutor.EXECUTOR_ROLE(), keeper);
        strategyExecutor.configureAdapter(address(adapter), PROTOCOL_ID, true);
        vm.stopPrank();

        inputToken.mint(owner, INPUT_AMOUNT);
        outputToken.mint(address(adapter), OUTPUT_AMOUNT);
        intentId = _submitIntent();

        vm.startPrank(owner);
        inputToken.approve(address(vault), INPUT_AMOUNT);
        vault.deposit(address(inputToken), INPUT_AMOUNT, owner);
        vault.reserveSelf(address(inputToken), INPUT_AMOUNT, RESERVATION_ID);
        vm.stopPrank();
        adapter.setOutputAmount(OUTPUT_AMOUNT);
    }

    function testDepositIntentExecutionCloseAndWithdrawal() public {
        MetronTypes.StrategyAction[] memory actions = new MetronTypes.StrategyAction[](1);
        actions[0] = MetronTypes.StrategyAction({
            adapter: address(adapter),
            asset: address(inputToken),
            outputAsset: address(outputToken),
            protocolId: PROTOCOL_ID,
            reservationId: RESERVATION_ID,
            amount: INPUT_AMOUNT,
            minimumOutput: OUTPUT_AMOUNT,
            data: bytes("lifecycle-route"),
            constraints: MetronTypes.ExecutionConstraints({
                slippageBps: 100,
                capitalMoveBps: 1_000,
                collateralSaleBps: 0,
                repaymentAmount: 0,
                resultingHealthFactorWad: 1.5e18,
                gasFeeWei: 0.01 ether,
                actionRisk: MetronTypes.ActionRisk.NEUTRAL,
                automationKind: MetronTypes.AutomationKind.MANUAL
            })
        });

        vm.prank(keeper);
        (, bytes32 positionId) = strategyExecutor.executeStrategy(
            intentId, STRATEGY_ID, actions, block.timestamp + 10 minutes
        );

        assertEq(vault.availableBalance(owner, address(outputToken)), OUTPUT_AMOUNT);
        assertEq(uint256(positionManager.getPosition(positionId).status), uint256(MetronTypes.PositionStatus.ACTIVE));

        vm.prank(owner);
        positionManager.requestClose(positionId);
        vm.prank(address(strategyExecutor));
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.CLOSED);

        vm.prank(owner);
        vault.withdraw(address(outputToken), OUTPUT_AMOUNT, recipient);
        assertEq(outputToken.balanceOf(recipient), OUTPUT_AMOUNT);
        assertEq(vault.availableBalance(owner, address(outputToken)), 0);
    }

    function _submitIntent() private returns (bytes32 newIntentId) {
        uint256[] memory chains = new uint256[](1);
        chains[0] = block.chainid;
        bytes32[] memory protocols = new bytes32[](1);
        protocols[0] = PROTOCOL_ID;
        address[] memory assets = new address[](2);
        assets[0] = address(inputToken);
        assets[1] = address(outputToken);
        MetronTypes.AutomationPolicy memory policy = _policy();
        IntentManager.IntentSubmission memory submission = IntentManager.IntentSubmission({
            owner: owner,
            traceId: keccak256("lifecycle-trace"),
            commitment: keccak256("lifecycle-commitment"),
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

    function _policy() private pure returns (MetronTypes.AutomationPolicy memory) {
        return MetronTypes.AutomationPolicy({
            maxCapitalMoveBps: 1_000,
            maxCollateralSaleBps: 500,
            maxSlippageBps: 100,
            maxRepaymentAmount: 10_000e18,
            maxGasFeeWei: 0.05 ether,
            minHealthFactorWad: 1.2e18,
            rebalanceEnabled: true,
            recoveryEnabled: true,
            emergencyUnwindEnabled: true
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
