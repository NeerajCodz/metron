// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIntentManager} from "../interfaces/IIntentManager.sol";
import {IPositionManager} from "../interfaces/IPositionManager.sol";
import {IRiskController} from "../interfaces/IRiskController.sol";
import {IStrategyAdapter} from "../interfaces/IStrategyAdapter.sol";
import {IVault} from "../interfaces/IVault.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

contract StrategyExecutor is AccessControl, Pausable, ReentrancyGuard {
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
    error ExecutionExpired(uint256 deadline);
    error ExecutionAlreadyCompleted(bytes32 executionId);
    error AdapterNotAllowed(address adapter, bytes32 protocolId);
    error ActionNotAuthorized(bytes32 intentId, uint256 chainId, bytes32 protocolId, address asset);
    error InsufficientOutput(uint256 minimum, uint256 received);
    error InvalidAdapterOutput(address outputAsset);

    IIntentManager public immutable intentManager;
    IPositionManager public immutable positionManager;
    IRiskController public immutable riskController;
    IVault public immutable vault;

    mapping(address adapter => AdapterConfig config) public adapters;
    mapping(bytes32 executionId => bool completed) public executionCompleted;

    event AdapterConfigured(address indexed adapter, bytes32 indexed protocolId, bool enabled);
    event StrategyActionExecuted(
        bytes32 indexed executionId,
        uint256 indexed actionIndex,
        address indexed adapter,
        bytes32 protocolId,
        address inputAsset,
        uint256 inputAmount,
        address outputAsset,
        uint256 outputAmount,
        bytes32 resultHash
    );
    event StrategyExecuted(
        bytes32 indexed executionId,
        bytes32 indexed intentId,
        bytes32 indexed positionId,
        bytes32 strategyId,
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

    function executeStrategy(
        bytes32 intentId,
        bytes32 strategyId,
        MetronTypes.StrategyAction[] calldata actions,
        uint256 deadline
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused nonReentrant returns (bytes32 executionId, bytes32 positionId) {
        if (intentId == bytes32(0) || strategyId == bytes32(0)) revert InvalidIdentifier();
        if (actions.length == 0) revert InvalidActions();
        if (block.timestamp > deadline) revert ExecutionExpired(deadline);

        bytes32 actionsHash = keccak256(abi.encode(actions));
        executionId = keccak256(abi.encode(address(this), block.chainid, intentId, strategyId, actionsHash, deadline));
        if (executionCompleted[executionId]) revert ExecutionAlreadyCompleted(executionId);
        executionCompleted[executionId] = true;

        MetronTypes.IntentAuthorization memory authorization = intentManager.getIntent(intentId);
        for (uint256 index; index < actions.length; ++index) {
            MetronTypes.StrategyAction calldata action = actions[index];
            AdapterConfig memory adapterConfig = adapters[action.adapter];
            if (!adapterConfig.enabled || adapterConfig.protocolId != action.protocolId) {
                revert AdapterNotAllowed(action.adapter, action.protocolId);
            }
            if (
                action.asset == address(0) || action.outputAsset == address(0) || action.reservationId == bytes32(0)
                    || action.amount == 0
            ) revert InvalidActions();
            if (!intentManager.isExecutionAuthorized(intentId, block.chainid, action.protocolId, action.asset)) {
                revert ActionNotAuthorized(intentId, block.chainid, action.protocolId, action.asset);
            }
            if (!intentManager.isExecutionAuthorized(intentId, block.chainid, action.protocolId, action.outputAsset)) {
                revert ActionNotAuthorized(intentId, block.chainid, action.protocolId, action.outputAsset);
            }
            riskController.validateExecution(intentId, action.constraints);

            uint256 balanceBefore = IERC20(action.outputAsset).balanceOf(address(this));
            vault.consume(authorization.owner, action.asset, action.reservationId, action.amount, action.adapter);
            bytes32 resultHash = IStrategyAdapter(action.adapter)
                .execute(authorization.owner, action.asset, action.outputAsset, action.amount, action.data);
            uint256 outputAmount = IERC20(action.outputAsset).balanceOf(address(this)) - balanceBefore;
            if (outputAmount == 0) revert InvalidAdapterOutput(action.outputAsset);

            IERC20(action.outputAsset).forceApprove(address(vault), outputAmount);
            uint256 creditedAmount = vault.deposit(action.outputAsset, outputAmount, authorization.owner);
            IERC20(action.outputAsset).forceApprove(address(vault), 0);
            if (creditedAmount < action.minimumOutput) {
                revert InsufficientOutput(action.minimumOutput, creditedAmount);
            }

            emit StrategyActionExecuted(
                executionId,
                index,
                action.adapter,
                action.protocolId,
                action.asset,
                action.amount,
                action.outputAsset,
                creditedAmount,
                resultHash
            );
        }

        positionId = positionManager.createPosition(intentId, strategyId);
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.ACTIVE);
        emit StrategyExecuted(executionId, intentId, positionId, strategyId, authorization.traceId);
    }

    function computeExecutionId(
        bytes32 intentId,
        bytes32 strategyId,
        MetronTypes.StrategyAction[] calldata actions,
        uint256 deadline
    ) external view returns (bytes32) {
        return keccak256(
            abi.encode(address(this), block.chainid, intentId, strategyId, keccak256(abi.encode(actions)), deadline)
        );
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
