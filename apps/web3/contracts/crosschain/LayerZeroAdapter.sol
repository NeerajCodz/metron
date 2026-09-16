// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {
    ILayerZeroEndpointV2,
    LzMessagingParams,
    LzMessagingReceipt,
    LzOrigin
} from "../interfaces/ILayerZeroEndpointV2.sol";
import {IRemoteExecutor} from "../interfaces/IRemoteExecutor.sol";

contract LayerZeroAdapter is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");
    bytes32 public constant RECOVERY_ROLE = keccak256("RECOVERY_ROLE");

    enum MessageStatus {
        NONE,
        SENT,
        DELIVERED,
        FAILED,
        EXPIRED
    }

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

    struct MessageState {
        uint32 dstEid;
        bytes32 receiver;
        bytes32 messageHash;
        uint64 nonce;
        uint64 expiresAt;
        MessageStatus status;
    }

    error InvalidAddress();
    error InvalidPeer(uint32 eid, bytes32 peer);
    error InvalidMessage();
    error InvalidExpiry(uint256 expiry);
    error OnlyEndpoint();
    error InvalidReceiver();
    error MessageAlreadyHandled(bytes32 guid);
    error MessageNotRetryable(bytes32 guid, MessageStatus status);
    error MessageNotExpired(bytes32 guid);

    ILayerZeroEndpointV2 public immutable endpoint;
    IRemoteExecutor public remoteExecutor;
    mapping(uint32 eid => bytes32 peer) public peers;
    mapping(bytes32 guid => MessageState state) public messages;

    event PeerSet(uint32 indexed eid, bytes32 indexed peer);
    event RemoteExecutorSet(address indexed executor);
    event MessageSent(
        bytes32 indexed guid,
        uint32 indexed dstEid,
        bytes32 indexed receiver,
        bytes32 messageHash,
        uint64 nonce,
        uint64 expiresAt
    );
    event MessageDelivered(bytes32 indexed guid, bool success);
    event MessageExpired(bytes32 indexed guid);
    event MessageRetried(bytes32 indexed oldGuid, bytes32 indexed newGuid);

    constructor(address admin, ILayerZeroEndpointV2 endpoint_) {
        if (admin == address(0) || address(endpoint_) == address(0)) revert InvalidAddress();
        endpoint = endpoint_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RECOVERY_ROLE, admin);
    }

    function setPeer(uint32 eid, bytes32 peer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (eid == 0 || peer == bytes32(0)) revert InvalidPeer(eid, peer);
        peers[eid] = peer;
        emit PeerSet(eid, peer);
    }

    function setRemoteExecutor(IRemoteExecutor executor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(executor) == address(0)) revert InvalidAddress();
        remoteExecutor = executor;
        emit RemoteExecutorSet(address(executor));
    }

    function quote(uint32 dstEid, bytes32 receiver, bytes calldata message, bytes calldata options)
        external
        view
        returns (uint256 nativeFee, uint256 lzTokenFee)
    {
        LzMessagingParams memory params = LzMessagingParams(dstEid, receiver, message, options, false);
        return endpoint.quote(params, address(this));
    }

    function sendMessage(
        uint32 dstEid,
        bytes32 receiver,
        bytes calldata message,
        bytes calldata options,
        uint64 expiresAt,
        address refundAddress
    ) external payable onlyRole(ROUTER_ROLE) whenNotPaused nonReentrant returns (bytes32 guid) {
        return _sendMessage(dstEid, receiver, message, options, expiresAt, refundAddress, msg.value);
    }

    function retryMessage(
        bytes32 oldGuid,
        bytes calldata message,
        bytes calldata options,
        uint64 expiresAt,
        address refundAddress
    ) external payable onlyRole(ROUTER_ROLE) whenNotPaused nonReentrant returns (bytes32 newGuid) {
        MessageState storage previous = messages[oldGuid];
        if (previous.status != MessageStatus.FAILED && previous.status != MessageStatus.EXPIRED) {
            revert MessageNotRetryable(oldGuid, previous.status);
        }
        if (keccak256(message) != previous.messageHash) revert InvalidMessage();
        newGuid =
            _sendMessage(previous.dstEid, previous.receiver, message, options, expiresAt, refundAddress, msg.value);
        emit MessageRetried(oldGuid, newGuid);
    }

    function _sendMessage(
        uint32 dstEid,
        bytes32 receiver,
        bytes calldata message,
        bytes calldata options,
        uint64 expiresAt,
        address refundAddress,
        uint256 value
    ) internal returns (bytes32 guid) {
        if (peers[dstEid] != receiver || receiver == bytes32(0)) revert InvalidPeer(dstEid, receiver);
        if (message.length == 0 || expiresAt <= block.timestamp || refundAddress == address(0)) {
            revert InvalidMessage();
        }
        LzMessagingParams memory params = LzMessagingParams(dstEid, receiver, message, options, false);
        LzMessagingReceipt memory receipt = endpoint.send{value: value}(params, refundAddress);
        if (receipt.guid == bytes32(0)) revert InvalidMessage();
        messages[receipt.guid] = MessageState({
            dstEid: dstEid,
            receiver: receiver,
            messageHash: keccak256(message),
            nonce: receipt.nonce,
            expiresAt: expiresAt,
            status: MessageStatus.SENT
        });
        emit MessageSent(receipt.guid, dstEid, receiver, keccak256(message), receipt.nonce, expiresAt);
        return receipt.guid;
    }

    function markExpired(bytes32 guid) external onlyRole(RECOVERY_ROLE) {
        MessageState storage state = messages[guid];
        if (state.status != MessageStatus.SENT) revert MessageNotRetryable(guid, state.status);
        if (block.timestamp <= state.expiresAt) revert MessageNotExpired(guid);
        state.status = MessageStatus.EXPIRED;
        emit MessageExpired(guid);
    }

    function lzReceive(
        LzOrigin calldata origin,
        address receiver,
        bytes32 guid,
        bytes calldata message,
        bytes calldata extraData
    ) external payable whenNotPaused nonReentrant {
        extraData;
        if (msg.sender != address(endpoint)) revert OnlyEndpoint();
        if (receiver != address(this) || peers[origin.srcEid] != origin.sender) revert InvalidReceiver();
        MessageState storage state = messages[guid];
        if (state.status != MessageStatus.NONE) revert MessageAlreadyHandled(guid);
        if (message.length == 0) revert InvalidMessage();
        (,,,,,,,,, uint64 expiresAt,) = abi.decode(
            message, (bytes32, uint8, uint256, address, bytes32, uint8, address, bytes32, uint64, uint64, bytes)
        );
        if (expiresAt <= block.timestamp) {
            state.messageHash = keccak256(message);
            state.expiresAt = expiresAt;
            state.status = MessageStatus.EXPIRED;
            emit MessageExpired(guid);
            return;
        }
        bool success =
            address(remoteExecutor) != address(0) && remoteExecutor.executeRemote(origin.srcEid, guid, message);
        state.messageHash = keccak256(message);
        state.expiresAt = expiresAt;
        state.status = success ? MessageStatus.DELIVERED : MessageStatus.FAILED;
        emit MessageDelivered(guid, success);
    }
}
