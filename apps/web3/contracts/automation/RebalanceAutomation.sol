// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {PositionAutomation} from "./PositionAutomation.sol";

contract RebalanceAutomation {
    struct RebalanceEnvelope {
        PositionAutomation.RebalanceCall call;
        uint256 maxGasPriceWei;
        uint256 minimumLiquidityBps;
        uint256 observedLiquidityBps;
        uint256 observedVolatilityBps;
        uint256 maximumSlippageBps;
        uint256 maximumVolatilityBps;
    }

    error InvalidTarget();
    error GasPriceTooHigh(uint256 maximum, uint256 observed);
    error LiquidityTooShallow(uint256 minimum, uint256 observed);
    error VolatilityTooHigh(uint256 maximum, uint256 observed);
    error SlippageTooHigh();

    PositionAutomation public immutable positionAutomation;

    constructor(PositionAutomation positionAutomation_) {
        if (address(positionAutomation_) == address(0)) revert InvalidTarget();
        positionAutomation = positionAutomation_;
    }

    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData) {
        RebalanceEnvelope memory envelope = abi.decode(checkData, (RebalanceEnvelope));
        PositionAutomation.RebalanceCall memory call = envelope.call;
        upkeepNeeded = positionAutomation.hedgeManager().canRebalance(call.positionId, call.observedDeltaWad)
            && tx.gasprice <= envelope.maxGasPriceWei
            && envelope.observedLiquidityBps >= envelope.minimumLiquidityBps
            && envelope.observedVolatilityBps <= envelope.maximumVolatilityBps
            && call.constraints.slippageBps <= envelope.maximumSlippageBps;
    }

    function performUpkeep(bytes calldata performData) external {
        RebalanceEnvelope memory envelope = abi.decode(performData, (RebalanceEnvelope));
        if (tx.gasprice > envelope.maxGasPriceWei) revert GasPriceTooHigh(envelope.maxGasPriceWei, tx.gasprice);
        if (envelope.observedLiquidityBps < envelope.minimumLiquidityBps) {
            revert LiquidityTooShallow(envelope.minimumLiquidityBps, envelope.observedLiquidityBps);
        }
        if (envelope.observedVolatilityBps > envelope.maximumVolatilityBps) {
            revert VolatilityTooHigh(envelope.maximumVolatilityBps, envelope.observedVolatilityBps);
        }
        if (envelope.call.constraints.slippageBps > 10_000) revert SlippageTooHigh();
        if (!positionAutomation.hedgeManager().canRebalance(envelope.call.positionId, envelope.call.observedDeltaWad)) {
            revert PositionAutomation.NotEligible();
        }
        positionAutomation.performUpkeep(abi.encode(envelope.call));
    }
}
