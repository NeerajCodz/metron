// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

library HealthFactorMath {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant BPS = 10_000;

    error InvalidLiquidationThreshold(uint256 value);

    function calculate(uint256 collateralValue, uint256 liquidationThresholdBps, uint256 debtValue)
        internal
        pure
        returns (uint256)
    {
        if (liquidationThresholdBps > BPS) {
            revert InvalidLiquidationThreshold(liquidationThresholdBps);
        }
        if (debtValue == 0) return type(uint256).max;
        uint256 adjustedCollateral = Math.mulDiv(collateralValue, liquidationThresholdBps, BPS);
        return Math.mulDiv(adjustedCollateral, WAD, debtValue);
    }
}
