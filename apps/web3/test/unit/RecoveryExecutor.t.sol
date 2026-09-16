// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Test} from "forge-std/Test.sol";
import {IntentManager} from "../../contracts/core/IntentManager.sol";
import {PositionManager} from "../../contracts/core/PositionManager.sol";
import {RecoveryExecutor} from "../../contracts/core/RecoveryExecutor.sol";
import {RiskController} from "../../contracts/risk/RiskController.sol";
import {IStrategyAdapter} from "../../contracts/interfaces/IStrategyAdapter.sol";
import {Vault} from "../../contracts/core/Vault.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";

contract RecoveryToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract RecoveryAdapterMock is IStrategyAdapter {
    uint256 public outputAmount;

    function setOutputAmount(uint256 amount) external {
        outputAmount = amount;
    }

    function execute(address, address, address outputAsset, uint256, bytes calldata)
        external
        returns (bytes32 resultHash)
    {
        IERC20(outputAsset).transfer(msg.sender, outputAmount);
        return keccak256("recovery");
    }
}

contract RecoveryExecutorTest is Test {
    bytes32 private constant PROTOCOL_ID = keccak256("aave-v3");
    bytes32 private constant STRATEGY_ID = keccak256("recovery-strategy");
    bytes32 private constant RESERVATION_ID = keccak256("recovery-reservation");
    uint256 private constant INPUT_AMOUNT = 1_000e18;
    uint256 private constant OUTPUT_AMOUNT = 980e18;

    address private admin = makeAddr("admin");
    address private keeper = makeAddr("keeper");
    address private owner = makeAddr("owner");

    IntentManager private intentManager;
    PositionManager private positionManager;
    RiskController private riskController;
    Vault private vault;
    RecoveryExecutor private recoveryExecutor;
    RecoveryAdapterMock private adapter;
    RecoveryToken private inputToken;
    RecoveryToken private outputToken;
    bytes32 private intentId;
    bytes32 private positionId;

    function setUp() public {
        inputToken = new RecoveryToken("Debt", "DEBT");
        outputToken = new RecoveryToken("Collateral", "COL");
        intentManager = new IntentManager(admin);
        positionManager = new PositionManager(admin, intentManager);
        vault = new Vault(admin);
        riskController = new RiskController(admin, intentManager, _protocolLimits());
        recoveryExecutor = new RecoveryExecutor(admin, intentManager, positionManager, riskController, vault);
        adapter = new RecoveryAdapterMock();

        vm.startPrank(admin);
        vault.grantRole(vault.EXECUTOR_ROLE(), address(recoveryExecutor));
        positionManager.grantRole(positionManager.EXECUTOR_ROLE(), address(recoveryExecutor));
        positionManager.grantRole(positionManager.EXECUTOR_ROLE(), keeper);
        recoveryExecutor.grantRole(recoveryExecutor.EXECUTOR_ROLE(), keeper);
        recoveryExecutor.configureAdapter(address(adapter), PROTOCOL_ID, true);
        vm.stopPrank();

        intentId = _submitAndConfigureIntent();
        inputToken.mint(owner, INPUT_AMOUNT);
        outputToken.mint(address(adapter), OUTPUT_AMOUNT * 10);
        vm.startPrank(owner);
        inputToken.approve(address(vault), INPUT_AMOUNT);
        vault.deposit(address(inputToken), INPUT_AMOUNT, owner);
        vault.reserveSelf(address(inputToken), INPUT_AMOUNT, RESERVATION_ID);
        vm.stopPrank();
        adapter.setOutputAmount(OUTPUT_AMOUNT);

        vm.prank(keeper);
        positionId = positionManager.createPosition(intentId, STRATEGY_ID);
        vm.prank(keeper);
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.ACTIVE);
    }

    function test_RecoveryCreditsOutputAndLeavesRestrictedPosition() public {
        MetronTypes.StrategyAction[] memory actions = _actions(MetronTypes.AutomationKind.RECOVERY, OUTPUT_AMOUNT);
        uint256 deadline = block.timestamp + 10 minutes;

        vm.prank(keeper);
        recoveryExecutor.recoverPosition(positionId, actions, deadline, MetronTypes.PositionStatus.RESTRICTED);

        assertEq(vault.reservedBalance(owner, address(inputToken), RESERVATION_ID), 0);
        assertEq(vault.availableBalance(owner, address(outputToken)), OUTPUT_AMOUNT);
        assertEq(
            uint256(positionManager.getPosition(positionId).status), uint256(MetronTypes.PositionStatus.RESTRICTED)
        );
    }

    function test_EmergencyUnwindCanClosePosition() public {
        vm.prank(keeper);
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.EMERGENCY);
        MetronTypes.StrategyAction[] memory actions =
            _actions(MetronTypes.AutomationKind.EMERGENCY_UNWIND, OUTPUT_AMOUNT);

        vm.prank(keeper);
        recoveryExecutor.recoverPosition(
            positionId, actions, block.timestamp + 10 minutes, MetronTypes.PositionStatus.CLOSED
        );

        assertEq(uint256(positionManager.getPosition(positionId).status), uint256(MetronTypes.PositionStatus.CLOSED));
    }

    function test_ManualActionIsRejectedBeforeCapitalMoves() public {
        MetronTypes.StrategyAction[] memory actions = _actions(MetronTypes.AutomationKind.MANUAL, OUTPUT_AMOUNT);

        vm.prank(keeper);
        vm.expectRevert(
            abi.encodeWithSelector(RecoveryExecutor.WrongAutomationKind.selector, MetronTypes.AutomationKind.MANUAL)
        );
        recoveryExecutor.recoverPosition(
            positionId, actions, block.timestamp + 10 minutes, MetronTypes.PositionStatus.RESTRICTED
        );

        assertEq(vault.reservedBalance(owner, address(inputToken), RESERVATION_ID), INPUT_AMOUNT);
    }

    function test_ReplayedRecoveryIsRejected() public {
        MetronTypes.StrategyAction[] memory actions = _actions(MetronTypes.AutomationKind.RECOVERY, OUTPUT_AMOUNT);
        uint256 deadline = block.timestamp + 10 minutes;
        bytes32 recoveryId =
            recoveryExecutor.computeRecoveryId(positionId, actions, deadline, MetronTypes.PositionStatus.RESTRICTED);

        vm.prank(keeper);
        recoveryExecutor.recoverPosition(positionId, actions, deadline, MetronTypes.PositionStatus.RESTRICTED);
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(RecoveryExecutor.ExecutionAlreadyCompleted.selector, recoveryId));
        recoveryExecutor.recoverPosition(positionId, actions, deadline, MetronTypes.PositionStatus.RESTRICTED);
    }

    function _actions(MetronTypes.AutomationKind kind, uint256 minimumOutput)
        private
        view
        returns (MetronTypes.StrategyAction[] memory actions)
    {
        actions = new MetronTypes.StrategyAction[](1);
        actions[0] = MetronTypes.StrategyAction({
            adapter: address(adapter),
            asset: address(inputToken),
            outputAsset: address(outputToken),
            protocolId: PROTOCOL_ID,
            reservationId: RESERVATION_ID,
            amount: INPUT_AMOUNT,
            minimumOutput: minimumOutput,
            data: bytes("bounded-recovery"),
            constraints: MetronTypes.ExecutionConstraints({
                slippageBps: 100,
                capitalMoveBps: 1_000,
                collateralSaleBps: 500,
                repaymentAmount: INPUT_AMOUNT,
                resultingHealthFactorWad: 1.5e18,
                gasFeeWei: 0.01 ether,
                actionRisk: MetronTypes.ActionRisk.RISK_REDUCING,
                automationKind: kind
            })
        });
    }

    function _submitAndConfigureIntent() private returns (bytes32 newIntentId) {
        MetronTypes.AutomationPolicy memory policy = MetronTypes.AutomationPolicy({
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
        uint256[] memory chains = new uint256[](1);
        chains[0] = block.chainid;
        bytes32[] memory protocols = new bytes32[](1);
        protocols[0] = PROTOCOL_ID;
        address[] memory assets = new address[](2);
        assets[0] = address(inputToken);
        assets[1] = address(outputToken);
        IntentManager.IntentSubmission memory submission = IntentManager.IntentSubmission({
            owner: owner,
            traceId: keccak256("recovery-trace"),
            commitment: keccak256("recovery-intent"),
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
