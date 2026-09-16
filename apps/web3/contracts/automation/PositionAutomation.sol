// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {HedgeManager} from "../hedging/HedgeManager.sol";
import {IStrategyAdapter} from "../interfaces/IStrategyAdapter.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

contract PositionAutomation {
    struct RebalanceCall {
        bytes32 positionId;
        bytes32 traceId;
        int256 observedDeltaWad;
        int256 resultingDeltaWad;
        address inputAsset;
        address outputAsset;
        bytes32 reservationId;
        uint256 inputAmount;
        uint256 minimumOutput;
        MetronTypes.ExecutionConstraints constraints;
        uint64 deadline;
        address adapter;
        bytes data;
    }

    error InvalidTarget();
    error NotEligible();

    HedgeManager public immutable hedgeManager;

    constructor(HedgeManager hedgeManager_) {
        if (address(hedgeManager_) == address(0)) revert InvalidTarget();
        hedgeManager = hedgeManager_;
    }

    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData) {
        RebalanceCall memory call = abi.decode(checkData, (RebalanceCall));
        upkeepNeeded = hedgeManager.canRebalance(call.positionId, call.observedDeltaWad);
        performData = checkData;
    }

    function performUpkeep(bytes calldata performData) external {
        RebalanceCall memory call = abi.decode(performData, (RebalanceCall));
        if (!hedgeManager.canRebalance(call.positionId, call.observedDeltaWad)) revert NotEligible();
        hedgeManager.rebalance(
            call.positionId,
            call.traceId,
            call.observedDeltaWad,
            call.resultingDeltaWad,
            call.inputAsset,
            call.outputAsset,
            call.reservationId,
            call.inputAmount,
            call.minimumOutput,
            call.constraints,
            call.deadline,
            IStrategyAdapter(call.adapter),
            call.data
        );
    }
}
