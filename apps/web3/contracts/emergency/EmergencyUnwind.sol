// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {CircuitBreaker} from "./CircuitBreaker.sol";
import {IFlashLiquidityProvider} from "../interfaces/IFlashLiquidityProvider.sol";
import {IRecoveryExecutor} from "../interfaces/IRecoveryExecutor.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

interface IFlashCallback {
    function onFlashLoan(address token, uint256 amount, uint256 fee, bytes calldata data) external;
}

contract EmergencyUnwind is AccessControl, Pausable, ReentrancyGuard, IFlashCallback {
    using SafeERC20 for IERC20;

    bytes32 public constant UNWIND_ROLE = keccak256("UNWIND_ROLE");

    struct UnwindState {
        bytes32 positionId;
        address provider;
        address token;
        uint256 amount;
        uint256 fee;
        bool active;
        bool completed;
    }

    error InvalidAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error OnlyProvider();
    error UnwindAlreadyUsed(bytes32 unwindId);
    error UnwindNotActive();
    error RepaymentUnavailable(uint256 required, uint256 available);

    CircuitBreaker public immutable breaker;
    IRecoveryExecutor public immutable recoveryExecutor;
    mapping(bytes32 unwindId => bool completed) public completedUnwinds;
    UnwindState public activeUnwind;

    event UnwindStarted(bytes32 indexed unwindId, bytes32 indexed positionId, address provider, uint256 amount);
    event UnwindCompleted(bytes32 indexed unwindId, bytes32 indexed positionId, uint256 fee);

    constructor(address admin, CircuitBreaker breaker_, IRecoveryExecutor recoveryExecutor_) {
        if (admin == address(0) || address(breaker_) == address(0) || address(recoveryExecutor_) == address(0)) {
            revert InvalidAddress();
        }
        breaker = breaker_;
        recoveryExecutor = recoveryExecutor_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UNWIND_ROLE, admin);
    }

    function unwind(
        bytes32 positionId,
        MetronTypes.StrategyAction[] calldata actions,
        MetronTypes.PositionStatus finalStatus,
        IFlashLiquidityProvider provider,
        address token,
        uint256 amount,
        uint256 deadline
    ) external onlyRole(UNWIND_ROLE) whenNotPaused nonReentrant returns (bytes32 unwindId) {
        if (address(provider) == address(0) || token == address(0) || positionId == bytes32(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (deadline < block.timestamp || activeUnwind.active) revert InvalidDeadline();
        breaker.requireAllowed(MetronTypes.ActionRisk.RISK_REDUCING, true, false);
        unwindId = keccak256(abi.encode(address(this), block.chainid, positionId, address(provider), token, amount, deadline));
        if (completedUnwinds[unwindId]) revert UnwindAlreadyUsed(unwindId);
        activeUnwind = UnwindState(positionId, address(provider), token, amount, 0, true, false);
        emit UnwindStarted(unwindId, positionId, address(provider), amount);
        provider.flashLoan(address(this), token, amount, abi.encode(unwindId, actions, finalStatus, deadline));
        if (activeUnwind.active || !activeUnwind.completed) revert UnwindNotActive();
        completedUnwinds[unwindId] = true;
    }
    function onFlashLoan(address token, uint256 amount, uint256 fee, bytes calldata data)
        external
        whenNotPaused
    {
        UnwindState storage state = activeUnwind;
        if (!state.active || msg.sender != state.provider || token != state.token || amount != state.amount) revert OnlyProvider();
        (bytes32 unwindId, MetronTypes.StrategyAction[] memory actions, MetronTypes.PositionStatus finalStatus, uint256 deadline) =
            abi.decode(data, (bytes32, MetronTypes.StrategyAction[], MetronTypes.PositionStatus, uint256));
        recoveryExecutor.recoverPosition(state.positionId, actions, deadline, finalStatus);
        uint256 required = amount + fee;
        uint256 available = IERC20(token).balanceOf(address(this));
        if (available < required) revert RepaymentUnavailable(required, available);
        IERC20(token).forceApprove(msg.sender, required);
        IFlashLiquidityProvider(msg.sender).repay(token, required);
        IERC20(token).forceApprove(msg.sender, 0);
        state.fee = fee;
        state.active = false;
        state.completed = true;
        emit UnwindCompleted(unwindId, state.positionId, fee);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
