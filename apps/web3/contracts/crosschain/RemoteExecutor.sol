// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IRemoteExecutor} from "../interfaces/IRemoteExecutor.sol";

contract RemoteExecutor is AccessControl, Pausable, ReentrancyGuard, IRemoteExecutor {
    bytes32 public constant CONFIG_ROLE = keccak256("CONFIG_ROLE");

    error InvalidAddress();
    error OnlyAdapter();
    error InvalidMessage();
    error MessageExpired(uint256 expiresAt);
    error TargetNotAllowed(address target);
    error MessageAlreadyExecuted(bytes32 guid);

    address public immutable adapter;
    mapping(address target => bool allowed) public allowedTargets;
    mapping(bytes32 guid => bool executed) public executedMessages;

    event TargetConfigured(address indexed target, bool allowed);
    event RemoteExecution(bytes32 indexed guid, bytes32 indexed dispatchId, address indexed target, bool success);

    constructor(address admin, address adapter_) {
        if (admin == address(0) || adapter_ == address(0)) revert InvalidAddress();
        adapter = adapter_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CONFIG_ROLE, admin);
    }

    function configureTarget(address target, bool allowed) external onlyRole(CONFIG_ROLE) {
        if (target == address(0)) revert InvalidAddress();
        allowedTargets[target] = allowed;
        emit TargetConfigured(target, allowed);
    }

    function executeRemote(uint32, bytes32 guid, bytes calldata message)
        external
        whenNotPaused
        nonReentrant
        returns (bool success)
    {
        if (msg.sender != adapter) revert OnlyAdapter();
        if (executedMessages[guid]) revert MessageAlreadyExecuted(guid);
        if (message.length == 0) revert InvalidMessage();
        (bytes32 dispatchId, uint64 expiresAt, address target, bytes memory data) =
            abi.decode(message, (bytes32, uint64, address, bytes));
        if (expiresAt <= block.timestamp) revert MessageExpired(expiresAt);
        if (!allowedTargets[target]) revert TargetNotAllowed(target);
        executedMessages[guid] = true;
        (success,) = target.call(data);
        emit RemoteExecution(guid, dispatchId, target, success);
    }

    function pause() external onlyRole(CONFIG_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(CONFIG_ROLE) {
        _unpause();
    }
}
