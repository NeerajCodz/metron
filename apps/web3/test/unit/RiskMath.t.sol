// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {RiskMath} from "../../contracts/libraries/RiskMath.sol";

contract RiskMathTest is Test {
    function test_ApplyBpsRoundsDown() public pure {
        assertEq(RiskMath.applyBps(101, 5_000), 50);
    }

    function test_ZeroReferenceOnlyAcceptsZeroValue() public pure {
        assertTrue(RiskMath.isWithinBps(0, 0, 100));
        assertFalse(RiskMath.isWithinBps(1, 0, 100));
    }

    function testFuzz_RatioRoundTripAccountsForIntegerRounding(uint128 amount, uint16 bps) public pure {
        bps = uint16(bound(bps, 0, 10_000));
        amount = uint128(bound(amount, 1, type(uint128).max));
        uint256 portion = RiskMath.applyBps(amount, bps);
        uint256 recovered = RiskMath.ratioBps(portion, amount);
        assertLe(portion, amount);
        assertLe(recovered, bps);
        assertLt((uint256(bps) - recovered) * amount, uint256(amount) + 10_000);
    }
}
