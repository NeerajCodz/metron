// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IntentManager} from "../../contracts/core/IntentManager.sol";
import {RiskController} from "../../contracts/risk/RiskController.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";

contract RiskControllerTest is Test {
    bytes32 private constant AAVE_PROTOCOL = keccak256("aave-v3");

    address private admin = makeAddr("admin");
    address private owner = makeAddr("owner");
    address private stranger = makeAddr("stranger");
    address private usdc = makeAddr("usdc");

    IntentManager private intentManager;
    RiskController private riskController;
    MetronTypes.AutomationPolicy private userPolicy;
    bytes32 private intentId;

    function setUp() public {
        intentManager = new IntentManager(admin);
        userPolicy = MetronTypes.AutomationPolicy({
            maxCapitalMoveBps: 1_000,
            maxCollateralSaleBps: 800,
            maxSlippageBps: 100,
            maxRepaymentAmount: 500e6,
            maxGasFeeWei: 0.1 ether,
            minHealthFactorWad: 1.2e18,
            rebalanceEnabled: true,
            recoveryEnabled: true,
            emergencyUnwindEnabled: true
        });
        MetronTypes.AutomationPolicy memory protocolLimits = MetronTypes.AutomationPolicy({
            maxCapitalMoveBps: 2_500,
            maxCollateralSaleBps: 1_000,
            maxSlippageBps: 500,
            maxRepaymentAmount: 10_000e6,
            maxGasFeeWei: 1 ether,
            minHealthFactorWad: 1.1e18,
            rebalanceEnabled: true,
            recoveryEnabled: true,
            emergencyUnwindEnabled: true
        });
        riskController = new RiskController(admin, intentManager, protocolLimits);
        intentId = _submitIntent(riskController.hashAutomationPolicy(userPolicy));
    }

    function test_OwnerConfiguresPolicyThatMatchesIntentHash() public {
        vm.prank(owner);
        riskController.configureIntentPolicy(intentId, userPolicy);

        assertTrue(riskController.policyConfigured(intentId));
        assertEq(riskController.getIntentPolicy(intentId).maxSlippageBps, 100);
    }

    function test_AnotherAccountCannotConfigurePolicy() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(RiskController.UnauthorizedOwner.selector, stranger, owner));
        riskController.configureIntentPolicy(intentId, userPolicy);
    }

    function test_PolicyCannotExceedProtocolLimits() public {
        userPolicy.maxSlippageBps = 501;
        bytes32 oversizedIntentId = _submitIntent(riskController.hashAutomationPolicy(userPolicy));

        vm.prank(owner);
        vm.expectRevert(RiskController.InvalidPolicy.selector);
        riskController.configureIntentPolicy(oversizedIntentId, userPolicy);
    }

    function test_NormalModeAcceptsBoundedRiskIncreasingExecution() public {
        _configurePolicy();
        MetronTypes.ExecutionConstraints memory constraints = _validConstraints();
        constraints.actionRisk = MetronTypes.ActionRisk.RISK_INCREASING;
        constraints.automationKind = MetronTypes.AutomationKind.REBALANCE;

        assertTrue(riskController.validateExecution(intentId, constraints));
    }

    function test_HardLimitsRejectExecution() public {
        _configurePolicy();
        MetronTypes.ExecutionConstraints memory constraints = _validConstraints();
        constraints.slippageBps = 101;

        vm.expectRevert(abi.encodeWithSelector(RiskController.SlippageLimitExceeded.selector, 100, 101));
        riskController.validateExecution(intentId, constraints);
    }

    function test_RestrictedModeBlocksRiskIncreaseButAllowsRecovery() public {
        _configurePolicy();
        vm.prank(admin);
        riskController.setOperationMode(MetronTypes.OperationMode.RESTRICTED, keccak256("market-liquidity-stress"));

        MetronTypes.ExecutionConstraints memory constraints = _validConstraints();
        constraints.actionRisk = MetronTypes.ActionRisk.RISK_INCREASING;
        vm.expectRevert(
            abi.encodeWithSelector(
                RiskController.ActionBlockedByMode.selector,
                MetronTypes.OperationMode.RESTRICTED,
                MetronTypes.ActionRisk.RISK_INCREASING
            )
        );
        riskController.validateExecution(intentId, constraints);

        constraints.actionRisk = MetronTypes.ActionRisk.RISK_REDUCING;
        constraints.automationKind = MetronTypes.AutomationKind.RECOVERY;
        assertTrue(riskController.validateExecution(intentId, constraints));
    }

    function test_EmergencyModeAllowsOnlyRiskReducingActions() public {
        _configurePolicy();
        vm.prank(admin);
        riskController.setOperationMode(MetronTypes.OperationMode.EMERGENCY, keccak256("oracle-and-liquidity-failure"));

        MetronTypes.ExecutionConstraints memory constraints = _validConstraints();
        constraints.actionRisk = MetronTypes.ActionRisk.NEUTRAL;
        vm.expectRevert(
            abi.encodeWithSelector(
                RiskController.ActionBlockedByMode.selector,
                MetronTypes.OperationMode.EMERGENCY,
                MetronTypes.ActionRisk.NEUTRAL
            )
        );
        riskController.validateExecution(intentId, constraints);

        constraints.actionRisk = MetronTypes.ActionRisk.RISK_REDUCING;
        constraints.automationKind = MetronTypes.AutomationKind.EMERGENCY_UNWIND;
        assertTrue(riskController.validateExecution(intentId, constraints));
    }

    function test_DisabledAutomationCannotExecute() public {
        userPolicy.rebalanceEnabled = false;
        bytes32 disabledIntentId = _submitIntent(riskController.hashAutomationPolicy(userPolicy));
        vm.prank(owner);
        riskController.configureIntentPolicy(disabledIntentId, userPolicy);

        MetronTypes.ExecutionConstraints memory constraints = _validConstraints();
        constraints.automationKind = MetronTypes.AutomationKind.REBALANCE;
        vm.expectRevert(
            abi.encodeWithSelector(RiskController.AutomationDisabled.selector, MetronTypes.AutomationKind.REBALANCE)
        );
        riskController.validateExecution(disabledIntentId, constraints);
    }

    function _configurePolicy() private {
        vm.prank(owner);
        riskController.configureIntentPolicy(intentId, userPolicy);
    }

    function _validConstraints() private pure returns (MetronTypes.ExecutionConstraints memory) {
        return MetronTypes.ExecutionConstraints({
            slippageBps: 50,
            capitalMoveBps: 500,
            collateralSaleBps: 200,
            repaymentAmount: 100e6,
            resultingHealthFactorWad: 1.5e18,
            gasFeeWei: 0.01 ether,
            actionRisk: MetronTypes.ActionRisk.NEUTRAL,
            automationKind: MetronTypes.AutomationKind.MANUAL
        });
    }

    function _submitIntent(bytes32 policyHash) private returns (bytes32) {
        uint256[] memory chains = new uint256[](1);
        chains[0] = block.chainid;
        bytes32[] memory protocols = new bytes32[](1);
        protocols[0] = AAVE_PROTOCOL;
        address[] memory assets = new address[](1);
        assets[0] = usdc;

        IntentManager.IntentSubmission memory submission = IntentManager.IntentSubmission({
            owner: owner,
            traceId: keccak256(abi.encodePacked("trace", intentManager.nonces(owner))),
            commitment: keccak256(abi.encodePacked("intent", intentManager.nonces(owner))),
            policyHash: policyHash,
            nonce: intentManager.nonces(owner),
            expiresAt: uint64(block.timestamp + 1 days),
            targetDeltaWad: 0,
            deltaToleranceWad: 0.1e18,
            chainsHash: keccak256(abi.encodePacked(chains)),
            protocolsHash: keccak256(abi.encodePacked(protocols)),
            assetsHash: keccak256(abi.encodePacked(assets))
        });

        vm.prank(owner);
        return intentManager.submitIntent(submission, chains, protocols, assets);
    }
}
