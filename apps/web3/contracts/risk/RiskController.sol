// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IIntentManager} from "../interfaces/IIntentManager.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

contract RiskController is AccessControl {
    bytes32 public constant MODE_MANAGER_ROLE = keccak256("MODE_MANAGER_ROLE");

    error InvalidAddress();
    error InvalidPolicy();
    error PolicyAlreadyConfigured(bytes32 intentId);
    error UnauthorizedOwner(address caller, address owner);
    error IntentNotActive(bytes32 intentId);
    error PolicyHashMismatch(bytes32 expected, bytes32 received);
    error SlippageLimitExceeded(uint256 maximum, uint256 received);
    error CapitalMoveLimitExceeded(uint256 maximum, uint256 received);
    error CollateralSaleLimitExceeded(uint256 maximum, uint256 received);
    error RepaymentLimitExceeded(uint256 maximum, uint256 received);
    error GasLimitExceeded(uint256 maximum, uint256 received);
    error HealthFactorTooLow(uint256 minimum, uint256 received);
    error ActionBlockedByMode(MetronTypes.OperationMode mode, MetronTypes.ActionRisk actionRisk);
    error AutomationDisabled(MetronTypes.AutomationKind kind);

    IIntentManager public immutable intentManager;
    MetronTypes.AutomationPolicy public protocolLimits;
    MetronTypes.OperationMode public operationMode;

    mapping(bytes32 intentId => MetronTypes.AutomationPolicy policy) private intentPolicies;
    mapping(bytes32 intentId => bool configured) public policyConfigured;

    event IntentPolicyConfigured(bytes32 indexed intentId, address indexed owner, bytes32 policyHash);
    event OperationModeChanged(
        MetronTypes.OperationMode indexed previousMode,
        MetronTypes.OperationMode indexed newMode,
        address indexed caller,
        bytes32 reason
    );

    constructor(address admin, IIntentManager intentManager_, MetronTypes.AutomationPolicy memory protocolLimits_) {
        if (admin == address(0) || address(intentManager_) == address(0)) revert InvalidAddress();
        _validateProtocolLimits(protocolLimits_);
        intentManager = intentManager_;
        protocolLimits = protocolLimits_;
        operationMode = MetronTypes.OperationMode.NORMAL;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MODE_MANAGER_ROLE, admin);
    }

    function configureIntentPolicy(bytes32 intentId, MetronTypes.AutomationPolicy calldata policy) external {
        if (policyConfigured[intentId]) revert PolicyAlreadyConfigured(intentId);
        MetronTypes.IntentAuthorization memory authorization = intentManager.getIntent(intentId);
        if (authorization.status != MetronTypes.IntentStatus.ACTIVE) revert IntentNotActive(intentId);
        if (msg.sender != authorization.owner) {
            revert UnauthorizedOwner(msg.sender, authorization.owner);
        }
        _validateUserPolicy(policy);

        bytes32 receivedHash = hashAutomationPolicy(policy);
        if (receivedHash != authorization.policyHash) {
            revert PolicyHashMismatch(authorization.policyHash, receivedHash);
        }
        intentPolicies[intentId] = policy;
        policyConfigured[intentId] = true;
        emit IntentPolicyConfigured(intentId, msg.sender, receivedHash);
    }

    function setOperationMode(MetronTypes.OperationMode newMode, bytes32 reason) external onlyRole(MODE_MANAGER_ROLE) {
        if (reason == bytes32(0)) revert InvalidPolicy();
        MetronTypes.OperationMode previousMode = operationMode;
        operationMode = newMode;
        emit OperationModeChanged(previousMode, newMode, msg.sender, reason);
    }

    function validateExecution(bytes32 intentId, MetronTypes.ExecutionConstraints calldata constraints)
        external
        view
        returns (bool)
    {
        if (!policyConfigured[intentId]) revert InvalidPolicy();
        MetronTypes.IntentAuthorization memory authorization = intentManager.getIntent(intentId);
        if (authorization.status != MetronTypes.IntentStatus.ACTIVE || block.timestamp > authorization.expiresAt) {
            revert IntentNotActive(intentId);
        }

        MetronTypes.AutomationPolicy storage policy = intentPolicies[intentId];
        if (constraints.slippageBps > policy.maxSlippageBps) {
            revert SlippageLimitExceeded(policy.maxSlippageBps, constraints.slippageBps);
        }
        if (constraints.capitalMoveBps > policy.maxCapitalMoveBps) {
            revert CapitalMoveLimitExceeded(policy.maxCapitalMoveBps, constraints.capitalMoveBps);
        }
        if (constraints.collateralSaleBps > policy.maxCollateralSaleBps) {
            revert CollateralSaleLimitExceeded(policy.maxCollateralSaleBps, constraints.collateralSaleBps);
        }
        if (constraints.repaymentAmount > policy.maxRepaymentAmount) {
            revert RepaymentLimitExceeded(policy.maxRepaymentAmount, constraints.repaymentAmount);
        }
        if (constraints.gasFeeWei > policy.maxGasFeeWei) {
            revert GasLimitExceeded(policy.maxGasFeeWei, constraints.gasFeeWei);
        }
        if (constraints.resultingHealthFactorWad < policy.minHealthFactorWad) {
            revert HealthFactorTooLow(policy.minHealthFactorWad, constraints.resultingHealthFactorWad);
        }

        _validateAutomationEnabled(policy, constraints.automationKind);
        _validateMode(constraints.actionRisk);
        return true;
    }

    function getIntentPolicy(bytes32 intentId) external view returns (MetronTypes.AutomationPolicy memory) {
        return intentPolicies[intentId];
    }

    function hashAutomationPolicy(MetronTypes.AutomationPolicy memory policy) public pure returns (bytes32) {
        return keccak256(abi.encode(policy));
    }

    function _validateProtocolLimits(MetronTypes.AutomationPolicy memory limits) private pure {
        if (
            limits.maxCapitalMoveBps > 10_000 || limits.maxCollateralSaleBps > 10_000 || limits.maxSlippageBps > 10_000
                || limits.maxRepaymentAmount == 0 || limits.maxGasFeeWei == 0 || limits.minHealthFactorWad == 0
        ) revert InvalidPolicy();
    }

    function _validateUserPolicy(MetronTypes.AutomationPolicy calldata policy) private view {
        if (
            policy.maxCapitalMoveBps > protocolLimits.maxCapitalMoveBps
                || policy.maxCollateralSaleBps > protocolLimits.maxCollateralSaleBps
                || policy.maxSlippageBps > protocolLimits.maxSlippageBps
                || policy.maxRepaymentAmount > protocolLimits.maxRepaymentAmount
                || policy.maxGasFeeWei > protocolLimits.maxGasFeeWei
                || policy.minHealthFactorWad < protocolLimits.minHealthFactorWad
        ) revert InvalidPolicy();
    }

    function _validateAutomationEnabled(MetronTypes.AutomationPolicy storage policy, MetronTypes.AutomationKind kind)
        private
        view
    {
        if (kind == MetronTypes.AutomationKind.MANUAL) return;
        if (kind == MetronTypes.AutomationKind.REBALANCE && policy.rebalanceEnabled) return;
        if (kind == MetronTypes.AutomationKind.RECOVERY && policy.recoveryEnabled) return;
        if (kind == MetronTypes.AutomationKind.EMERGENCY_UNWIND && policy.emergencyUnwindEnabled) return;
        revert AutomationDisabled(kind);
    }

    function _validateMode(MetronTypes.ActionRisk actionRisk) private view {
        if (operationMode == MetronTypes.OperationMode.NORMAL) return;
        if (
            operationMode == MetronTypes.OperationMode.RESTRICTED
                && actionRisk != MetronTypes.ActionRisk.RISK_INCREASING
        ) return;
        if (operationMode == MetronTypes.OperationMode.EMERGENCY && actionRisk == MetronTypes.ActionRisk.RISK_REDUCING) return;
        revert ActionBlockedByMode(operationMode, actionRisk);
    }
}
