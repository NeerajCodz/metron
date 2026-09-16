// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

library DeltaMath {
    error DeltaOverflow();

    function absoluteDeviation(int256 currentDeltaWad, int256 targetDeltaWad) internal pure returns (uint256) {
        if (
            (targetDeltaWad > 0 && currentDeltaWad < type(int256).min + targetDeltaWad)
                || (targetDeltaWad < 0 && currentDeltaWad > type(int256).max + targetDeltaWad)
        ) {
            revert DeltaOverflow();
        }
        int256 difference = currentDeltaWad - targetDeltaWad;
        if (difference == type(int256).min) revert DeltaOverflow();
        return uint256(difference < 0 ? -difference : difference);
    }

    function isRebalanceEligible(int256 currentDeltaWad, int256 targetDeltaWad, uint256 toleranceWad)
        internal
        pure
        returns (bool)
    {
        return absoluteDeviation(currentDeltaWad, targetDeltaWad) > toleranceWad;
    }
}
