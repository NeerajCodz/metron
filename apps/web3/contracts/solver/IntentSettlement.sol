// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IIntentManager} from "../interfaces/IIntentManager.sol";
import {SolverRegistry} from "./SolverRegistry.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

contract IntentSettlement is AccessControl {
    bytes32 public constant AUCTION_ROLE = keccak256("AUCTION_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

    struct Authorization {
        bytes32 solverId;
        bytes32 routeHash;
        bytes32 traceId;
        uint256 minimumOutput;
        uint64 deadline;
        bool settled;
    }

    error InvalidAddress();
    error InvalidIdentifier();
    error InvalidDeadline(uint64 deadline);
    error IntentNotActive(bytes32 intentId);
    error SettlementNotAuthorized(bytes32 intentId);
    error SettlementExpired(bytes32 intentId);
    error UnauthorizedSolver(address expected, address caller);
    error SettlementAlreadyUsed(bytes32 intentId);

    IIntentManager public immutable intentManager;
    SolverRegistry public immutable solverRegistry;
    mapping(bytes32 intentId => Authorization authorization) public authorizations;

    event SettlementAuthorized(
        bytes32 indexed intentId,
        bytes32 indexed solverId,
        bytes32 routeHash,
        bytes32 traceId,
        uint256 minimumOutput,
        uint64 deadline
    );
    event SettlementCompleted(bytes32 indexed intentId, bytes32 indexed solverId, bytes32 routeHash, bytes32 traceId);

    constructor(address admin, address intentManager_, address solverRegistry_) {
        if (admin == address(0) || intentManager_ == address(0) || solverRegistry_ == address(0)) {
            revert InvalidAddress();
        }
        intentManager = IIntentManager(intentManager_);
        solverRegistry = SolverRegistry(solverRegistry_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AUCTION_ROLE, admin);
        _grantRole(EXECUTOR_ROLE, admin);
        _grantRole(SETTLER_ROLE, address(this));
    }

    function authorizeSettlement(
        bytes32 intentId,
        bytes32 solverId,
        bytes32 routeHash,
        bytes32 traceId,
        uint256 minimumOutput,
        uint64 deadline
    ) external onlyRole(AUCTION_ROLE) {
        if (intentId == bytes32(0) || solverId == bytes32(0) || routeHash == bytes32(0) || traceId == bytes32(0)) {
            revert InvalidIdentifier();
        }
        if (deadline <= block.timestamp) revert InvalidDeadline(deadline);
        MetronTypes.IntentAuthorization memory intent = intentManager.getIntent(intentId);
        if (intent.status != MetronTypes.IntentStatus.ACTIVE) revert IntentNotActive(intentId);
        solverRegistry.getSolver(solverId);
        Authorization storage existing = authorizations[intentId];
        if (existing.routeHash != bytes32(0) && !existing.settled) revert SettlementAlreadyUsed(intentId);
        authorizations[intentId] = Authorization({
            solverId: solverId,
            routeHash: routeHash,
            traceId: traceId,
            minimumOutput: minimumOutput,
            deadline: deadline,
            settled: false
        });
        emit SettlementAuthorized(intentId, solverId, routeHash, traceId, minimumOutput, deadline);
    }

    function settle(bytes32 intentId) external onlyRole(EXECUTOR_ROLE) {
        Authorization storage authorization = authorizations[intentId];
        if (authorization.routeHash == bytes32(0) || authorization.settled) revert SettlementNotAuthorized(intentId);
        if (block.timestamp > authorization.deadline) revert SettlementExpired(intentId);
        SolverRegistry.Solver memory solver = solverRegistry.requireOperator(authorization.solverId, msg.sender);
        if (solver.operator != msg.sender) revert UnauthorizedSolver(solver.operator, msg.sender);
        authorization.settled = true;
        intentManager.settleIntent(intentId);
        emit SettlementCompleted(intentId, authorization.solverId, authorization.routeHash, authorization.traceId);
    }

    function getAuthorization(bytes32 intentId) external view returns (Authorization memory) {
        return authorizations[intentId];
    }
}
