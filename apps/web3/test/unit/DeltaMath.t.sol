// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {DeltaMath} from "../../contracts/libraries/DeltaMath.sol";

contract DeltaMathHarness {
    function absoluteDeviation(int256 currentDeltaWad, int256 targetDeltaWad) external pure returns (uint256) {
        return DeltaMath.absoluteDeviation(currentDeltaWad, targetDeltaWad);
    }
}

contract DeltaMathTest is Test {
    DeltaMathHarness private harness;

    function setUp() public {
        harness = new DeltaMathHarness();
    }

    function test_UsesStrictToleranceBoundary() public pure {
        assertFalse(DeltaMath.isRebalanceEligible(1e18, 0, 1e18));
        assertTrue(DeltaMath.isRebalanceEligible(1e18 + 1, 0, 1e18));
    }

    function test_HandlesSignedTargets() public pure {
        assertEq(DeltaMath.absoluteDeviation(-2e18, 1e18), 3e18);
        assertEq(DeltaMath.absoluteDeviation(2e18, -1e18), 3e18);
    }

    function test_MinimumSignedDifferenceReverts() public {
        vm.expectRevert(DeltaMath.DeltaOverflow.selector);
        harness.absoluteDeviation(type(int256).min, 0);
    }
}
