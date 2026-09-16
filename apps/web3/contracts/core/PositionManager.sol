// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IIntentManager} from "../interfaces/IIntentManager.sol";
import {IPositionManager} from "../interfaces/IPositionManager.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

contract PositionManager is AccessControl, IPositionManager {
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    struct PositionComponent {
        uint256 chainId;
        bytes32 protocolId;
        bytes32 componentHash;
        uint64 updatedAt;
        bool active;
    }

    error InvalidAddress();
    error InvalidIdentifier();
    error IntentNotActive(bytes32 intentId);
    error PositionAlreadyExists(bytes32 positionId);
    error PositionNotFound(bytes32 positionId);
    error InvalidStatusTransition(MetronTypes.PositionStatus currentStatus, MetronTypes.PositionStatus requestedStatus);
    error UnauthorizedOwner(address caller, address owner);
    error TerminalPosition(bytes32 positionId);

    IIntentManager public immutable intentManager;
    mapping(bytes32 positionId => MetronTypes.Position position) private positions;
    mapping(bytes32 positionId => mapping(bytes32 componentKey => PositionComponent component)) private components;
    mapping(bytes32 positionId => bytes32[] componentKeys) private positionComponentKeys;
    mapping(bytes32 positionId => mapping(bytes32 componentKey => bool exists)) private componentExists;

    event PositionCreated(
        bytes32 indexed positionId, bytes32 indexed intentId, bytes32 indexed strategyId, address owner, bytes32 traceId
    );
    event PositionStatusChanged(
        bytes32 indexed positionId,
        MetronTypes.PositionStatus previousStatus,
        MetronTypes.PositionStatus newStatus,
        bytes32 indexed traceId
    );
    event PositionComponentUpdated(
        bytes32 indexed positionId,
        bytes32 indexed componentKey,
        uint256 indexed chainId,
        bytes32 protocolId,
        bytes32 componentHash,
        bool active,
        bytes32 traceId
    );

    constructor(address admin, IIntentManager intentManager_) {
        if (admin == address(0) || address(intentManager_) == address(0)) revert InvalidAddress();
        intentManager = intentManager_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function createPosition(bytes32 intentId, bytes32 strategyId)
        external
        override
        onlyRole(EXECUTOR_ROLE)
        returns (bytes32 positionId)
    {
        if (strategyId == bytes32(0)) revert InvalidIdentifier();
        MetronTypes.IntentAuthorization memory authorization = intentManager.getIntent(intentId);
        if (authorization.status != MetronTypes.IntentStatus.ACTIVE || block.timestamp > authorization.expiresAt) {
            revert IntentNotActive(intentId);
        }

        positionId = computePositionId(intentId, strategyId, authorization.owner);
        if (positions[positionId].status != MetronTypes.PositionStatus.NONE) {
            revert PositionAlreadyExists(positionId);
        }
        uint64 timestamp = uint64(block.timestamp);
        positions[positionId] = MetronTypes.Position({
            owner: authorization.owner,
            intentId: intentId,
            strategyId: strategyId,
            traceId: authorization.traceId,
            policyHash: authorization.policyHash,
            coordinationChainId: block.chainid,
            createdAt: timestamp,
            updatedAt: timestamp,
            status: MetronTypes.PositionStatus.PENDING
        });
        emit PositionCreated(positionId, intentId, strategyId, authorization.owner, authorization.traceId);
    }

    function transitionStatus(bytes32 positionId, MetronTypes.PositionStatus newStatus)
        external
        override
        onlyRole(EXECUTOR_ROLE)
    {
        _transition(positionId, newStatus);
    }

    function requestClose(bytes32 positionId) external {
        MetronTypes.Position storage position = positions[positionId];
        if (position.status == MetronTypes.PositionStatus.NONE) revert PositionNotFound(positionId);
        if (msg.sender != position.owner) revert UnauthorizedOwner(msg.sender, position.owner);
        _transition(positionId, MetronTypes.PositionStatus.UNWINDING);
    }

    function upsertComponent(
        bytes32 positionId,
        bytes32 componentKey,
        uint256 chainId,
        bytes32 protocolId,
        bytes32 componentHash,
        bool active
    ) external onlyRole(EXECUTOR_ROLE) {
        MetronTypes.Position storage position = positions[positionId];
        if (position.status == MetronTypes.PositionStatus.NONE) revert PositionNotFound(positionId);
        if (
            position.status == MetronTypes.PositionStatus.CLOSED || position.status == MetronTypes.PositionStatus.FAILED
        ) revert TerminalPosition(positionId);
        if (componentKey == bytes32(0) || protocolId == bytes32(0) || componentHash == bytes32(0) || chainId == 0) {
            revert InvalidIdentifier();
        }

        if (!componentExists[positionId][componentKey]) {
            componentExists[positionId][componentKey] = true;
            positionComponentKeys[positionId].push(componentKey);
        }
        components[positionId][componentKey] = PositionComponent({
            chainId: chainId,
            protocolId: protocolId,
            componentHash: componentHash,
            updatedAt: uint64(block.timestamp),
            active: active
        });
        position.updatedAt = uint64(block.timestamp);
        emit PositionComponentUpdated(
            positionId, componentKey, chainId, protocolId, componentHash, active, position.traceId
        );
    }

    function getPosition(bytes32 positionId) external view override returns (MetronTypes.Position memory) {
        return positions[positionId];
    }

    function getComponent(bytes32 positionId, bytes32 componentKey) external view returns (PositionComponent memory) {
        return components[positionId][componentKey];
    }

    function getComponentKeys(bytes32 positionId) external view returns (bytes32[] memory) {
        return positionComponentKeys[positionId];
    }

    function computePositionId(bytes32 intentId, bytes32 strategyId, address owner) public pure returns (bytes32) {
        return keccak256(abi.encode(intentId, strategyId, owner));
    }

    function _transition(bytes32 positionId, MetronTypes.PositionStatus newStatus) private {
        MetronTypes.Position storage position = positions[positionId];
        MetronTypes.PositionStatus currentStatus = position.status;
        if (currentStatus == MetronTypes.PositionStatus.NONE) revert PositionNotFound(positionId);
        if (!_canTransition(currentStatus, newStatus)) {
            revert InvalidStatusTransition(currentStatus, newStatus);
        }
        position.status = newStatus;
        position.updatedAt = uint64(block.timestamp);
        emit PositionStatusChanged(positionId, currentStatus, newStatus, position.traceId);
    }

    function _canTransition(MetronTypes.PositionStatus currentStatus, MetronTypes.PositionStatus newStatus)
        private
        pure
        returns (bool)
    {
        if (currentStatus == MetronTypes.PositionStatus.PENDING) {
            return newStatus == MetronTypes.PositionStatus.ACTIVE || newStatus == MetronTypes.PositionStatus.FAILED;
        }
        if (currentStatus == MetronTypes.PositionStatus.ACTIVE) {
            return newStatus == MetronTypes.PositionStatus.RESTRICTED
                || newStatus == MetronTypes.PositionStatus.EMERGENCY
                || newStatus == MetronTypes.PositionStatus.UNWINDING || newStatus == MetronTypes.PositionStatus.CLOSED
                || newStatus == MetronTypes.PositionStatus.FAILED;
        }
        if (currentStatus == MetronTypes.PositionStatus.RESTRICTED) {
            return newStatus == MetronTypes.PositionStatus.ACTIVE || newStatus == MetronTypes.PositionStatus.EMERGENCY
                || newStatus == MetronTypes.PositionStatus.UNWINDING || newStatus == MetronTypes.PositionStatus.CLOSED
                || newStatus == MetronTypes.PositionStatus.FAILED;
        }
        if (currentStatus == MetronTypes.PositionStatus.EMERGENCY) {
            return newStatus == MetronTypes.PositionStatus.RESTRICTED
                || newStatus == MetronTypes.PositionStatus.UNWINDING || newStatus == MetronTypes.PositionStatus.CLOSED
                || newStatus == MetronTypes.PositionStatus.FAILED;
        }
        if (currentStatus == MetronTypes.PositionStatus.UNWINDING) {
            return newStatus == MetronTypes.PositionStatus.CLOSED || newStatus == MetronTypes.PositionStatus.FAILED;
        }
        return false;
    }
}
