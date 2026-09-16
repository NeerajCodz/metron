// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

library RiskMath {
    uint256 internal constant BPS = 10_000;

    error InvalidBasisPoints(uint256 value);

    function applyBps(uint256 amount, uint256 basisPoints) internal pure returns (uint256) {
        if (basisPoints > BPS) revert InvalidBasisPoints(basisPoints);
        return Math.mulDiv(amount, basisPoints, BPS);
    }

    function ratioBps(uint256 numerator, uint256 denominator) internal pure returns (uint256) {
        if (denominator == 0) return type(uint256).max;
        return Math.mulDiv(numerator, BPS, denominator);
    }

    function isWithinBps(uint256 value, uint256 baseline, uint256 maximumDeviationBps) internal pure returns (bool) {
        if (maximumDeviationBps > BPS) revert InvalidBasisPoints(maximumDeviationBps);
        if (baseline == 0) return value == 0;
        uint256 deviation = value >= baseline ? value - baseline : baseline - value;
        return Math.mulDiv(deviation, BPS, baseline) <= maximumDeviationBps;
    }
}
