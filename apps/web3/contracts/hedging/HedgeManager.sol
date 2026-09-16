// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPositionManager} from "../interfaces/IPositionManager.sol";
import {IRiskController} from "../interfaces/IRiskController.sol";
import {IStrategyAdapter} from "../interfaces/IStrategyAdapter.sol";
import {IVault} from "../interfaces/IVault.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

contract HedgeManager is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct HedgePolicy {
        int256 targetDeltaWad;
        uint256 toleranceWad;
        uint256 cooldown;
        uint256 minimumBenefitWad;
        uint64 lastRebalancedAt;
        bool configured;
    }

    error InvalidAddress();
    error InvalidPolicy();
    error UnauthorizedOwner(address caller, address owner);
    error PositionNotActive(bytes32 positionId);
    error RebalanceNotEligible(bytes32 positionId);
    error DeadlineExpired(uint64 deadline);
    error DeltaOutsideTolerance(int256 deltaWad, int256 targetDeltaWad, uint256 toleranceWad);
    error MinimumBenefitNotMet(uint256 benefitWad, uint256 minimumBenefitWad);
    error OutputBelowMinimum(uint256 minimumOutput, uint256 received);
    error DuplicateExecution(bytes32 executionId);

    IPositionManager public immutable positionManager;
    IRiskController public immutable riskController;
    IVault public immutable vault;
    mapping(bytes32 positionId => HedgePolicy policy) public policies;
    mapping(bytes32 executionId => bool used) public usedExecutions;

    event HedgePolicyConfigured(
        bytes32 indexed positionId,
        address indexed owner,
        int256 targetDeltaWad,
        uint256 toleranceWad,
        uint256 cooldown,
        uint256 minimumBenefitWad
    );
    event HedgeRebalanced(
        bytes32 indexed positionId,
        bytes32 indexed executionId,
        bytes32 indexed traceId,
        int256 observedDeltaWad,
        int256 resultingDeltaWad,
        uint256 inputAmount,
        uint256 outputAmount
    );

    constructor(address admin, IPositionManager positionManager_, IRiskController riskController_, IVault vault_) {
        if (
            admin == address(0) || address(positionManager_) == address(0) || address(riskController_) == address(0)
                || address(vault_) == address(0)
        ) revert InvalidAddress();
        positionManager = positionManager_;
        riskController = riskController_;
        vault = vault_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KEEPER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function configurePolicy(
        bytes32 positionId,
        int256 targetDeltaWad,
        uint256 toleranceWad,
        uint256 cooldown,
        uint256 minimumBenefitWad
    ) external {
        MetronTypes.Position memory position = positionManager.getPosition(positionId);
        if (position.owner == address(0)) revert InvalidPolicy();
        if (msg.sender != position.owner) revert UnauthorizedOwner(msg.sender, position.owner);
        if (toleranceWad == 0 || cooldown == 0) revert InvalidPolicy();
        policies[positionId] = HedgePolicy({
            targetDeltaWad: targetDeltaWad,
            toleranceWad: toleranceWad,
            cooldown: cooldown,
            minimumBenefitWad: minimumBenefitWad,
            lastRebalancedAt: 0,
            configured: true
        });
        emit HedgePolicyConfigured(
            positionId, msg.sender, targetDeltaWad, toleranceWad, cooldown, minimumBenefitWad
        );
    }

    function canRebalance(bytes32 positionId, int256 observedDeltaWad) public view returns (bool) {
        MetronTypes.Position memory position = positionManager.getPosition(positionId);
        HedgePolicy memory policy = policies[positionId];
        if (!policy.configured || position.status != MetronTypes.PositionStatus.ACTIVE) return false;
        if (block.timestamp < uint256(policy.lastRebalancedAt) + policy.cooldown) return false;
        uint256 benefit = _difference(observedDeltaWad, policy.targetDeltaWad);
        return benefit > policy.toleranceWad && benefit >= policy.minimumBenefitWad;
    }

    function rebalance(
        bytes32 positionId,
        bytes32 traceId,
        int256 observedDeltaWad,
        int256 resultingDeltaWad,
        address inputAsset,
        address outputAsset,
        bytes32 reservationId,
        uint256 inputAmount,
        uint256 minimumOutput,
        MetronTypes.ExecutionConstraints calldata constraints,
        uint64 deadline,
        IStrategyAdapter adapter,
        bytes calldata data
    ) external onlyRole(KEEPER_ROLE) whenNotPaused nonReentrant returns (bytes32 executionId, uint256 outputAmount) {
        if (traceId == bytes32(0) || reservationId == bytes32(0) || address(adapter) == address(0)) revert InvalidPolicy();
        if (block.timestamp > deadline) revert DeadlineExpired(deadline);
        MetronTypes.Position memory position = positionManager.getPosition(positionId);
        if (position.status != MetronTypes.PositionStatus.ACTIVE) revert PositionNotActive(positionId);
        HedgePolicy storage policy = policies[positionId];
        if (!policy.configured || block.timestamp < uint256(policy.lastRebalancedAt) + policy.cooldown) {
            revert RebalanceNotEligible(positionId);
        }
        uint256 benefit = _difference(observedDeltaWad, policy.targetDeltaWad);
        if (benefit <= policy.toleranceWad) revert RebalanceNotEligible(positionId);
        if (benefit < policy.minimumBenefitWad) revert MinimumBenefitNotMet(benefit, policy.minimumBenefitWad);
        if (_difference(resultingDeltaWad, policy.targetDeltaWad) > policy.toleranceWad) {
            revert DeltaOutsideTolerance(resultingDeltaWad, policy.targetDeltaWad, policy.toleranceWad);
        }
        if (constraints.actionRisk != MetronTypes.ActionRisk.RISK_REDUCING) revert InvalidPolicy();
        if (constraints.automationKind != MetronTypes.AutomationKind.REBALANCE) revert InvalidPolicy();
        riskController.validateExecution(position.intentId, constraints);

        executionId = keccak256(abi.encode(positionId, reservationId, observedDeltaWad, resultingDeltaWad, deadline));
        if (usedExecutions[executionId]) revert DuplicateExecution(executionId);
        usedExecutions[executionId] = true;
        uint256 beforeBalance = IERC20(outputAsset).balanceOf(address(this));
        vault.consume(position.owner, inputAsset, reservationId, inputAmount, address(adapter));
        adapter.execute(position.owner, inputAsset, outputAsset, inputAmount, data);
        outputAmount = IERC20(outputAsset).balanceOf(address(this)) - beforeBalance;
        if (outputAmount < minimumOutput) revert OutputBelowMinimum(minimumOutput, outputAmount);
        IERC20(outputAsset).forceApprove(address(vault), outputAmount);
        vault.deposit(outputAsset, outputAmount, position.owner);
        IERC20(outputAsset).forceApprove(address(vault), 0);
        policy.lastRebalancedAt = uint64(block.timestamp);
        emit HedgeRebalanced(
            positionId, executionId, traceId, observedDeltaWad, resultingDeltaWad, inputAmount, outputAmount
        );
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _difference(int256 left, int256 right) private pure returns (uint256) {
        return left >= right ? uint256(left - right) : uint256(right - left);
    }
}
