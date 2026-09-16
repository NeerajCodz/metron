// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {HealthFactorMath} from "../../contracts/libraries/HealthFactorMath.sol";

contract HealthFactorMathHarness {
    function calculate(uint256 collateralValue, uint256 liquidationThresholdBps, uint256 debtValue)
        external
        pure
        returns (uint256)
    {
        return HealthFactorMath.calculate(collateralValue, liquidationThresholdBps, debtValue);
    }
}

contract HealthFactorMathTest is Test {
    HealthFactorMathHarness private harness;

    function setUp() public {
        harness = new HealthFactorMathHarness();
    }

    function test_CalculatesHealthFactor() public pure {
        uint256 healthFactor = HealthFactorMath.calculate(1_000e18, 8_000, 500e18);
        assertEq(healthFactor, 1.6e18);
    }

    function test_NoDebtReturnsMaximumHealthFactor() public pure {
        assertEq(HealthFactorMath.calculate(1_000e18, 8_000, 0), type(uint256).max);
    }

    function testFuzz_RejectsInvalidThreshold(uint256 threshold) public {
        threshold = bound(threshold, 10_001, type(uint16).max);
        vm.expectRevert(abi.encodeWithSelector(HealthFactorMath.InvalidLiquidationThreshold.selector, threshold));
        harness.calculate(1_000e18, threshold, 500e18);
    }
}
