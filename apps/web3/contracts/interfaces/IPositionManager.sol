// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MetronTypes} from "../libraries/MetronTypes.sol";

interface IPositionManager {
    function createPosition(bytes32 intentId, bytes32 strategyId) external returns (bytes32 positionId);

    function transitionStatus(bytes32 positionId, MetronTypes.PositionStatus newStatus) external;
    function getPosition(bytes32 positionId) external view returns (MetronTypes.Position memory);
}
