// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IRemoteExecutor} from "../interfaces/IRemoteExecutor.sol";

contract RemoteExecutor is AccessControl, Pausable, ReentrancyGuard, IRemoteExecutor {
    bytes32 public constant CONFIG_ROLE = keccak256("CONFIG_ROLE");

    struct RemoteMessage {
        bytes32 dispatchId;
        uint8 version;
        uint256 sourceChainId;
        address sourceContract;
        bytes32 positionId;
        uint8 actionType;
        address target;
        bytes32 payloadHash;
        uint64 nonce;
        uint64 expiresAt;
        bytes data;
    }

    error InvalidAddress();
    error OnlyAdapter();
    error InvalidMessage();
    error MessageExpired(uint256 expiresAt);
    error TargetNotAllowed(address target);
    error SourceRouterNotAllowed(uint32 srcEid, address sourceContract);
    error SourceChainNotAllowed(uint32 srcEid, uint256 sourceChainId);
    error UnsupportedVersion(uint8 version);
    error MessageAlreadyExecuted(bytes32 guid);
    error InvalidNonce(uint64 expected, uint64 received);

    address public immutable adapter;
    mapping(address target => bool allowed) public allowedTargets;
    mapping(uint32 srcEid => address sourceRouter) public sourceRouters;
    mapping(uint32 srcEid => uint256 sourceChainId) public sourceChainIds;
    mapping(bytes32 guid => bool executed) public executedMessages;
    mapping(uint32 srcEid => mapping(address sourceRouter => uint64 nextNonce)) public nextNonces;
    event TargetConfigured(address indexed target, bool allowed);
    event SourceRouterConfigured(uint32 indexed srcEid, address indexed sourceRouter);
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

    function configureSourceRouter(uint32 srcEid, address sourceRouter, uint256 sourceChainId)
        external
        onlyRole(CONFIG_ROLE)
    {
        if (srcEid == 0 || sourceRouter == address(0) || sourceChainId == 0) revert InvalidAddress();
        sourceRouters[srcEid] = sourceRouter;
        sourceChainIds[srcEid] = sourceChainId;
        emit SourceRouterConfigured(srcEid, sourceRouter);
    }

    function executeRemote(uint32 srcEid, bytes32 guid, bytes calldata message)
        external
        whenNotPaused
        nonReentrant
        returns (bool success)
    {
        if (msg.sender != adapter) revert OnlyAdapter();
        if (executedMessages[guid]) revert MessageAlreadyExecuted(guid);
        if (message.length == 0) revert InvalidMessage();
        (
            bytes32 dispatchId,
            uint8 version,
            uint256 sourceChainId,
            address sourceContract,
            bytes32 positionId,
            uint8 actionType,
            address target,
            bytes32 payloadHash,
            uint64 nonce,
            uint64 expiresAt,
            bytes memory data
        ) = abi.decode(
            message,
            (bytes32, uint8, uint256, address, bytes32, uint8, address, bytes32, uint64, uint64, bytes)
        );
        if (version != 1) revert UnsupportedVersion(version);
        if (sourceChainIds[srcEid] != sourceChainId) revert SourceChainNotAllowed(srcEid, sourceChainId);
        if (positionId == bytes32(0) || actionType == 0) revert InvalidMessage();
        if (sourceRouters[srcEid] != sourceContract) revert SourceRouterNotAllowed(srcEid, sourceContract);
        if (payloadHash != keccak256(data)) revert InvalidMessage();
        uint64 expectedNonce = nextNonces[srcEid][sourceContract];
        if (nonce != expectedNonce) revert InvalidNonce(expectedNonce, nonce);
        nextNonces[srcEid][sourceContract] = expectedNonce + 1;
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
