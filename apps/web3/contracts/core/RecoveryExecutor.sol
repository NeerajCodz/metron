// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIntentManager} from "../interfaces/IIntentManager.sol";
import {IPositionManager} from "../interfaces/IPositionManager.sol";
import {IRiskController} from "../interfaces/IRiskController.sol";
import {IStrategyAdapter} from "../interfaces/IStrategyAdapter.sol";
import {IVault} from "../interfaces/IVault.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

contract RecoveryExecutor is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct AdapterConfig {
        bytes32 protocolId;
        bool enabled;
    }

    error InvalidAddress();
    error InvalidIdentifier();
    error InvalidActions();
    error InvalidFinalStatus(MetronTypes.PositionStatus status);
    error ExecutionExpired(uint256 deadline);
    error ExecutionAlreadyCompleted(bytes32 recoveryId);
    error AdapterNotAllowed(address adapter, bytes32 protocolId);
    error ActionNotAuthorized(bytes32 intentId, uint256 chainId, bytes32 protocolId, address asset);
    error WrongAutomationKind(MetronTypes.AutomationKind kind);
    error InvalidAdapterOutput(address outputAsset);
    error InsufficientOutput(uint256 minimum, uint256 received);

    IIntentManager public immutable intentManager;
    IPositionManager public immutable positionManager;
    IRiskController public immutable riskController;
    IVault public immutable vault;

    mapping(address adapter => AdapterConfig config) public adapters;
    mapping(bytes32 recoveryId => bool completed) public recoveryCompleted;

    event AdapterConfigured(address indexed adapter, bytes32 indexed protocolId, bool enabled);
    event RecoveryActionExecuted(
        bytes32 indexed recoveryId,
        uint256 indexed actionIndex,
        bytes32 indexed positionId,
        address adapter,
        bytes32 protocolId,
        address inputAsset,
        uint256 inputAmount,
        address outputAsset,
        uint256 outputAmount,
        bytes32 resultHash
    );
    event RecoveryExecuted(
        bytes32 indexed recoveryId,
        bytes32 indexed positionId,
        bytes32 indexed intentId,
        MetronTypes.PositionStatus finalStatus,
        bytes32 traceId
    );

    constructor(
        address admin,
        IIntentManager intentManager_,
        IPositionManager positionManager_,
        IRiskController riskController_,
        IVault vault_
    ) {
        if (
            admin == address(0) || address(intentManager_) == address(0) || address(positionManager_) == address(0)
                || address(riskController_) == address(0) || address(vault_) == address(0)
        ) revert InvalidAddress();
        intentManager = intentManager_;
        positionManager = positionManager_;
        riskController = riskController_;
        vault = vault_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function configureAdapter(address adapter, bytes32 protocolId, bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (adapter == address(0)) revert InvalidAddress();
        if (enabled && protocolId == bytes32(0)) revert InvalidIdentifier();
        adapters[adapter] = AdapterConfig({protocolId: protocolId, enabled: enabled});
        emit AdapterConfigured(adapter, protocolId, enabled);
    }

    function recoverPosition(
        bytes32 positionId,
        MetronTypes.StrategyAction[] calldata actions,
        uint256 deadline,
        MetronTypes.PositionStatus finalStatus
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused nonReentrant returns (bytes32 recoveryId) {
        if (actions.length == 0) revert InvalidActions();
        if (block.timestamp > deadline) revert ExecutionExpired(deadline);
        if (
            finalStatus != MetronTypes.PositionStatus.ACTIVE && finalStatus != MetronTypes.PositionStatus.RESTRICTED
                && finalStatus != MetronTypes.PositionStatus.CLOSED
        ) revert InvalidFinalStatus(finalStatus);

        MetronTypes.Position memory position = positionManager.getPosition(positionId);
        if (position.status == MetronTypes.PositionStatus.NONE) revert InvalidIdentifier();
        if (
            position.status != MetronTypes.PositionStatus.ACTIVE
                && position.status != MetronTypes.PositionStatus.RESTRICTED
                && position.status != MetronTypes.PositionStatus.EMERGENCY
                && position.status != MetronTypes.PositionStatus.UNWINDING
        ) revert InvalidFinalStatus(position.status);
        if (finalStatus != MetronTypes.PositionStatus.CLOSED && position.status == MetronTypes.PositionStatus.UNWINDING)
        {
            revert InvalidFinalStatus(finalStatus);
        }

        bytes32 actionsHash = keccak256(abi.encode(actions));
        recoveryId = keccak256(abi.encode(address(this), block.chainid, positionId, actionsHash, deadline, finalStatus));
        if (recoveryCompleted[recoveryId]) revert ExecutionAlreadyCompleted(recoveryId);
        recoveryCompleted[recoveryId] = true;

        for (uint256 index; index < actions.length; ++index) {
            MetronTypes.StrategyAction calldata action = actions[index];
            if (
                action.asset == address(0) || action.outputAsset == address(0) || action.reservationId == bytes32(0)
                    || action.amount == 0
            ) revert InvalidActions();
            if (
                action.constraints.automationKind != MetronTypes.AutomationKind.RECOVERY
                    && action.constraints.automationKind != MetronTypes.AutomationKind.EMERGENCY_UNWIND
            ) revert WrongAutomationKind(action.constraints.automationKind);
            AdapterConfig memory adapterConfig = adapters[action.adapter];
            if (!adapterConfig.enabled || adapterConfig.protocolId != action.protocolId) {
                revert AdapterNotAllowed(action.adapter, action.protocolId);
            }
            if (!intentManager.isExecutionAuthorized(position.intentId, block.chainid, action.protocolId, action.asset))
            {
                revert ActionNotAuthorized(position.intentId, block.chainid, action.protocolId, action.asset);
            }
            if (!intentManager.isExecutionAuthorized(
                    position.intentId, block.chainid, action.protocolId, action.outputAsset
                )) {
                revert ActionNotAuthorized(position.intentId, block.chainid, action.protocolId, action.outputAsset);
            }
            riskController.validateExecution(position.intentId, action.constraints);

            uint256 balanceBefore = IERC20(action.outputAsset).balanceOf(address(this));
            vault.consume(position.owner, action.asset, action.reservationId, action.amount, action.adapter);
            bytes32 resultHash = IStrategyAdapter(action.adapter)
                .execute(position.owner, action.asset, action.outputAsset, action.amount, action.data);
            uint256 outputAmount = IERC20(action.outputAsset).balanceOf(address(this)) - balanceBefore;
            if (outputAmount == 0) revert InvalidAdapterOutput(action.outputAsset);

            IERC20(action.outputAsset).forceApprove(address(vault), outputAmount);
            uint256 creditedAmount = vault.deposit(action.outputAsset, outputAmount, position.owner);
            IERC20(action.outputAsset).forceApprove(address(vault), 0);
            if (creditedAmount < action.minimumOutput) {
                revert InsufficientOutput(action.minimumOutput, creditedAmount);
            }
            emit RecoveryActionExecuted(
                recoveryId,
                index,
                positionId,
                action.adapter,
                action.protocolId,
                action.asset,
                action.amount,
                action.outputAsset,
                creditedAmount,
                resultHash
            );
        }

        positionManager.transitionStatus(positionId, finalStatus);
        emit RecoveryExecuted(recoveryId, positionId, position.intentId, finalStatus, position.traceId);
    }

    function computeRecoveryId(
        bytes32 positionId,
        MetronTypes.StrategyAction[] calldata actions,
        uint256 deadline,
        MetronTypes.PositionStatus finalStatus
    ) external view returns (bytes32) {
        return keccak256(
            abi.encode(address(this), block.chainid, positionId, keccak256(abi.encode(actions)), deadline, finalStatus)
        );
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
