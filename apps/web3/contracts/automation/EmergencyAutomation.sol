// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPositionManager} from "../interfaces/IPositionManager.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";
import {RecoveryExecutor} from "../core/RecoveryExecutor.sol";

contract EmergencyAutomation {
    struct EmergencyCall {
        bytes32 positionId;
        MetronTypes.StrategyAction[] actions;
        uint256 deadline;
        MetronTypes.PositionStatus finalStatus;
        uint256 currentHealthFactorWad;
        uint256 minimumHealthFactorWad;
    }

    error InvalidTarget();
    error NotEligible();
    error HealthFactorSafe();
    error DeadlineExpired();

    IPositionManager public immutable positionManager;
    RecoveryExecutor public immutable recoveryExecutor;

    constructor(IPositionManager positionManager_, RecoveryExecutor recoveryExecutor_) {
        if (address(positionManager_) == address(0) || address(recoveryExecutor_) == address(0)) revert InvalidTarget();
        positionManager = positionManager_;
        recoveryExecutor = recoveryExecutor_;
    }

    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData) {
        EmergencyCall memory call = abi.decode(checkData, (EmergencyCall));
        MetronTypes.Position memory position = positionManager.getPosition(call.positionId);
        upkeepNeeded = call.actions.length > 0 && call.deadline >= block.timestamp
            && call.currentHealthFactorWad < call.minimumHealthFactorWad
            && (position.status == MetronTypes.PositionStatus.ACTIVE
                || position.status == MetronTypes.PositionStatus.RESTRICTED
                || position.status == MetronTypes.PositionStatus.EMERGENCY
                || position.status == MetronTypes.PositionStatus.UNWINDING);
        performData = checkData;
    }

    function performUpkeep(bytes calldata performData) external {
        EmergencyCall memory call = abi.decode(performData, (EmergencyCall));
        if (call.deadline < block.timestamp) revert DeadlineExpired();
        if (call.currentHealthFactorWad >= call.minimumHealthFactorWad) revert HealthFactorSafe();
        MetronTypes.Position memory position = positionManager.getPosition(call.positionId);
        if (
            position.status != MetronTypes.PositionStatus.ACTIVE
                && position.status != MetronTypes.PositionStatus.RESTRICTED
                && position.status != MetronTypes.PositionStatus.EMERGENCY
                && position.status != MetronTypes.PositionStatus.UNWINDING
        ) revert NotEligible();
        recoveryExecutor.recoverPosition(call.positionId, call.actions, call.deadline, call.finalStatus);
    }
}
