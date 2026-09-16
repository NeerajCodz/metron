// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

contract CircuitBreaker is AccessControl {
    bytes32 public constant MODE_MANAGER_ROLE = keccak256("MODE_MANAGER_ROLE");
    bytes32 public constant AUTOMATION_ROLE = keccak256("AUTOMATION_ROLE");

    MetronTypes.OperationMode public mode;

    error InvalidReason();
    error InvalidModeTransition(MetronTypes.OperationMode previousMode, MetronTypes.OperationMode nextMode);
    error ActionBlocked(MetronTypes.OperationMode mode, MetronTypes.ActionRisk risk);

    event ModeChanged(
        MetronTypes.OperationMode indexed previousMode,
        MetronTypes.OperationMode indexed nextMode,
        address indexed caller,
        bytes32 reason
    );

    constructor(address admin) {
        if (admin == address(0)) revert InvalidReason();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MODE_MANAGER_ROLE, admin);
        _grantRole(AUTOMATION_ROLE, admin);
        mode = MetronTypes.OperationMode.NORMAL;
    }

    function setMode(MetronTypes.OperationMode nextMode, bytes32 reason) external onlyRole(MODE_MANAGER_ROLE) {
        _setMode(nextMode, reason);
    }

    function triggerEmergency(bytes32 reason) external onlyRole(AUTOMATION_ROLE) {
        _setMode(MetronTypes.OperationMode.EMERGENCY, reason);
    }

    function canExecute(MetronTypes.ActionRisk risk, bool recovery, bool safeWithdrawal) public view returns (bool) {
        if (mode == MetronTypes.OperationMode.NORMAL) return true;
        if (safeWithdrawal || recovery) return true;
        return mode == MetronTypes.OperationMode.RESTRICTED && risk != MetronTypes.ActionRisk.RISK_INCREASING;
    }

    function requireAllowed(MetronTypes.ActionRisk risk, bool recovery, bool safeWithdrawal)
        external
        view
        returns (bool)
    {
        if (!canExecute(risk, recovery, safeWithdrawal)) revert ActionBlocked(mode, risk);
        return true;
    }

    function _setMode(MetronTypes.OperationMode nextMode, bytes32 reason) private {
        if (reason == bytes32(0)) revert InvalidReason();
        MetronTypes.OperationMode previousMode = mode;
        if (nextMode == previousMode) revert InvalidModeTransition(previousMode, nextMode);
        if (uint8(nextMode) > uint8(previousMode) && uint8(nextMode) > uint8(MetronTypes.OperationMode.EMERGENCY)) {
            revert InvalidModeTransition(previousMode, nextMode);
        }
        mode = nextMode;
        emit ModeChanged(previousMode, nextMode, msg.sender, reason);
    }
}
