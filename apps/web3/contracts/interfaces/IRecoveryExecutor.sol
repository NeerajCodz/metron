// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MetronTypes} from "../libraries/MetronTypes.sol";

interface IRecoveryExecutor {
    function recoverPosition(
        bytes32 positionId,
        MetronTypes.StrategyAction[] calldata actions,
        uint256 deadline,
        MetronTypes.PositionStatus finalStatus
    ) external returns (bytes32 recoveryId);
}
