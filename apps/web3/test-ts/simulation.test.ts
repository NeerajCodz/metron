import { describe, expect, it } from "vitest";

import { simulatePosition } from "../adapters/simulation/position.js";

describe("position simulation", () => {
  it("projects collateral shock, health factor, and net delta deterministically", () => {
    const result = simulatePosition({
      collateral: [
        {
          asset: "0x1111111111111111111111111111111111111111",
          valueUsdWad: 2_000n * 10n ** 18n,
          liquidationThresholdBps: 8_000n,
        },
      ],
      debtUsdWad: 1_000n * 10n ** 18n,
      deltaComponents: [
        { quantityWad: 2n * 10n ** 18n, unitDeltaWad: 10n ** 18n },
        { quantityWad: 1n * 10n ** 18n, unitDeltaWad: -(10n ** 18n) },
      ],
      targetDeltaWad: 0n,
      deltaToleranceWad: 0n,
      minimumHealthFactorWad: 1_2n * 10n ** 17n,
      collateralShockBps: 1_000n,
    });

    expect(result.projectedCollateralUsdWad).toBe(1_800n * 10n ** 18n);
    expect(result.projectedHealthFactorWad).toBe(1_440_000_000_000_000_000n);
    expect(result.projectedDeltaWad).toBe(1n * 10n ** 18n);
    expect(result.safe).toBe(false);
    expect(result.failureReasons).toEqual(["delta_tolerance"]);
  });

  it("fails closed when the projected health factor is below policy", () => {
    const result = simulatePosition({
      collateral: [
        {
          asset: "0x1111111111111111111111111111111111111111",
          valueUsdWad: 100n,
          liquidationThresholdBps: 8_000n,
        },
      ],
      debtUsdWad: 100n,
      deltaComponents: [],
      targetDeltaWad: 0n,
      deltaToleranceWad: 0n,
      minimumHealthFactorWad: 1n * 10n ** 18n,
      collateralShockBps: 0n,
    });
    expect(result.healthFactorSafe).toBe(false);
    expect(result.failureReasons).toEqual(["health_factor"]);
  });
});
