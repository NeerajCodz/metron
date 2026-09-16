// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract SolverRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    struct Solver {
        address operator;
        bytes32 metadataHash;
        uint256 bond;
        uint256 reputationBps;
        bool enabled;
    }

    error InvalidSolverId();
    error InvalidOperator();
    error SolverExists(bytes32 solverId);
    error SolverNotFound(bytes32 solverId);
    error UnauthorizedOperator(address expected, address caller);
    error SolverDisabled(bytes32 solverId);
    error InvalidReputation(uint256 reputationBps);

    mapping(bytes32 solverId => Solver solver) private solvers;

    event SolverRegistered(bytes32 indexed solverId, address indexed operator, bytes32 metadataHash, uint256 bond);
    event SolverUpdated(bytes32 indexed solverId, bytes32 metadataHash, uint256 bond, uint256 reputationBps);
    event SolverStatusChanged(bytes32 indexed solverId, bool enabled);

    constructor(address admin) {
        if (admin == address(0)) revert InvalidOperator();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    function registerSolver(bytes32 solverId, address operator, bytes32 metadataHash, uint256 bond)
        external
        onlyRole(REGISTRAR_ROLE)
    {
        if (solverId == bytes32(0)) revert InvalidSolverId();
        if (operator == address(0)) revert InvalidOperator();
        if (solvers[solverId].operator != address(0)) revert SolverExists(solverId);
        solvers[solverId] =
            Solver({operator: operator, metadataHash: metadataHash, bond: bond, reputationBps: 5_000, enabled: true});
        emit SolverRegistered(solverId, operator, metadataHash, bond);
    }

    function updateSolver(bytes32 solverId, bytes32 metadataHash, uint256 bond, uint256 reputationBps)
        external
        onlyRole(REGISTRAR_ROLE)
    {
        Solver storage solver = _requireSolver(solverId);
        if (reputationBps > 10_000) revert InvalidReputation(reputationBps);
        solver.metadataHash = metadataHash;
        solver.bond = bond;
        solver.reputationBps = reputationBps;
        emit SolverUpdated(solverId, metadataHash, bond, reputationBps);
    }

    function setSolverEnabled(bytes32 solverId, bool enabled) external onlyRole(REGISTRAR_ROLE) {
        Solver storage solver = _requireSolver(solverId);
        solver.enabled = enabled;
        emit SolverStatusChanged(solverId, enabled);
    }

    function requireOperator(bytes32 solverId, address operator) external view returns (Solver memory solver) {
        solver = _requireSolver(solverId);
        if (!solver.enabled) revert SolverDisabled(solverId);
        if (solver.operator != operator) revert UnauthorizedOperator(solver.operator, operator);
    }

    function getSolver(bytes32 solverId) external view returns (Solver memory) {
        return _requireSolver(solverId);
    }

    function isEnabled(bytes32 solverId) external view returns (bool) {
        Solver storage solver = solvers[solverId];
        return solver.operator != address(0) && solver.enabled;
    }

    function _requireSolver(bytes32 solverId) private view returns (Solver storage solver) {
        solver = solvers[solverId];
        if (solver.operator == address(0)) revert SolverNotFound(solverId);
    }
}
