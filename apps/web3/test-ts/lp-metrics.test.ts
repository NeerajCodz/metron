import { describe, expect, it } from "vitest";

import { computeLpMetrics } from "../adapters/uniswap/metrics.js";

describe("concentrated LP metrics", () => {
  it("annualizes fees, prices impermanent loss, and bounds range utilization", () => {
    const metrics = computeLpMetrics({
      positionValueUsd: 10_000,
      feesUsd: 100,
      gasUsd: 10,
      poolDepthUsd: 100_000,
      entryPrice: 1_000,
      currentPrice: 1_000,
      lowerTick: -100,
      upperTick: 100,
      currentTick: 200,
      elapsedSeconds: 30 * 24 * 60 * 60,
    });
    expect(metrics.impermanentLossBps).toBe(0);
    expect(metrics.rangeUtilizationBps).toBe(10_000);
    expect(metrics.feeAprBps).toBe(1_217);
    expect(metrics.capitalEfficiencyBps).toBe(1_000);
    expect(metrics.realizedPnlUsd).toBe(90);
  });

  it("rejects invalid prices, ranges, and zero-duration observations", () => {
    expect(() =>
      computeLpMetrics({
        positionValueUsd: 1,
        feesUsd: 0,
        gasUsd: 0,
        poolDepthUsd: 1,
        entryPrice: 0,
        currentPrice: 1,
        lowerTick: 1,
        upperTick: 0,
        currentTick: 0,
        elapsedSeconds: 0,
      }),
    ).toThrow();
  });
});
