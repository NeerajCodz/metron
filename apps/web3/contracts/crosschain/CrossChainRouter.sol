// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ILayerZeroAdapter} from "../interfaces/ILayerZeroAdapter.sol";

contract CrossChainRouter is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant DISPATCH_ROLE = keccak256("DISPATCH_ROLE");

    struct DispatchState {
        bytes32 positionId;
        uint32 dstEid;
        address target;
        uint8 actionType;
        bytes32 payloadHash;
        uint64 nonce;
        uint64 expiresAt;
        bytes32 guid;
        bool dispatched;
    }

    error InvalidAddress();
    error InvalidIdentifier();
    error InvalidExpiry(uint256 expiry);
    error TargetNotAllowed(address target);
    error DispatchAlreadySubmitted(bytes32 dispatchId);
    error InvalidGuid();

    ILayerZeroAdapter public immutable adapter;
    mapping(address target => bool allowed) public allowedTargets;
    mapping(bytes32 dispatchId => DispatchState state) public dispatches;
    uint64 public nextDispatchNonce;

    event TargetConfigured(address indexed target, bool allowed);
    event DispatchSubmitted(
        bytes32 indexed dispatchId,
        bytes32 indexed positionId,
        uint32 indexed dstEid,
        address target,
        bytes32 payloadHash,
        uint64 expiresAt,
        bytes32 guid
    );

    constructor(address admin, ILayerZeroAdapter adapter_) {
        if (admin == address(0) || address(adapter_) == address(0)) revert InvalidAddress();
        adapter = adapter_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function configureTarget(address target, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (target == address(0)) revert InvalidAddress();
        allowedTargets[target] = allowed;
        emit TargetConfigured(target, allowed);
    }

    function quote(uint32 dstEid, bytes32 receiver, bytes calldata message, bytes calldata options)
        external
        view
        returns (uint256 nativeFee, uint256 lzTokenFee)
    {
        return adapter.quote(dstEid, receiver, message, options);
    }

    function dispatch(
        bytes32 positionId,
        uint32 dstEid,
        bytes32 receiver,
        uint8 actionType,
        address target,
        bytes calldata data,
        bytes calldata options,
        uint64 expiresAt,
        address refundAddress
    ) external payable onlyRole(DISPATCH_ROLE) whenNotPaused nonReentrant returns (bytes32 dispatchId, bytes32 guid) {
        if (positionId == bytes32(0) || receiver == bytes32(0) || actionType == 0 || data.length == 0) {
            revert InvalidIdentifier();
        }
        if (!allowedTargets[target]) revert TargetNotAllowed(target);
        if (expiresAt <= block.timestamp) revert InvalidExpiry(expiresAt);
        uint64 nonce = nextDispatchNonce++;
        bytes32 payloadHash = keccak256(data);
        dispatchId = keccak256(abi.encode(address(this), block.chainid, positionId, nonce, target, data));
        if (dispatches[dispatchId].dispatched) revert DispatchAlreadySubmitted(dispatchId);
        bytes memory message = abi.encode(
            dispatchId,
            uint8(1),
            block.chainid,
            address(this),
            positionId,
            actionType,
            target,
            payloadHash,
            nonce,
            expiresAt,
            data
        );
        guid = adapter.sendMessage{value: msg.value}(dstEid, receiver, message, options, expiresAt, refundAddress);
        if (guid == bytes32(0)) revert InvalidGuid();
        dispatches[dispatchId] = DispatchState({
            positionId: positionId,
            dstEid: dstEid,
            target: target,
            actionType: actionType,
            payloadHash: payloadHash,
            nonce: nonce,
            expiresAt: expiresAt,
            guid: guid,
            dispatched: true
        });
        emit DispatchSubmitted(dispatchId, positionId, dstEid, target, payloadHash, expiresAt, guid);
    }
}
