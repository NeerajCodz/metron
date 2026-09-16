import { describe, expect, it } from "vitest";

import {
  calculateHealthFactorWad,
  calculateNetDeltaWad,
  isDeltaRebalanceEligible,
  WAD,
} from "../src/index.js";

describe("risk math", () => {
  it("calculates weighted health factor with integer arithmetic", () => {
    const result = calculateHealthFactorWad(
      [
        { valueUsdWad: 1_000n * WAD, liquidationThresholdBps: 8_000n },
        { valueUsdWad: 500n * WAD, liquidationThresholdBps: 7_000n },
      ],
      500n * WAD,
    );
    expect(result).toBe(2_300_000_000_000_000_000n);
  });

  it("returns the maximum unsigned value when there is no debt", () => {
    expect(calculateHealthFactorWad([], 0n)).toBe((1n << 256n) - 1n);
  });

  it("calculates signed net delta and uses a strict tolerance boundary", () => {
    const delta = calculateNetDeltaWad([
      { quantityWad: 2n * WAD, unitDeltaWad: WAD },
      { quantityWad: WAD, unitDeltaWad: -WAD },
    ]);
    expect(delta).toBe(WAD);
    expect(isDeltaRebalanceEligible(delta, 0n, WAD)).toBe(false);
    expect(isDeltaRebalanceEligible(delta + 1n, 0n, WAD)).toBe(true);
  });
});
