import { describe, expect, it } from "vitest";

import { KeeperRuntime, evaluateKeeperObservation } from "../keeper/index.js";
import type { KeeperObservation } from "../keeper/index.js";

const observation: KeeperObservation = {
  positionId: "position-1",
  observedDeltaWad: 100n,
  targetDeltaWad: 0n,
  deltaToleranceWad: 10n,
  healthFactorWad: 100n,
  minimumHealthFactorWad: 200n,
  lpDriftBps: 500,
  maximumLpDriftBps: 100,
  volatilityBps: 5000,
  maximumVolatilityBps: 1000,
  stablecoinDeviationBps: 200,
  maximumStablecoinDeviationBps: 100,
  protocolHealthy: false,
  crossChainTimedOut: true,
  riskScoreBps: 9000,
  maximumRiskScoreBps: 5000,
};

describe("keeper runtime", () => {
  it("emits bounded trigger kinds for every breached gate", () => {
    const triggers = evaluateKeeperObservation(observation);
    expect(triggers.map((trigger) => trigger.kind)).toEqual([
      "emergency_unwind",
      "hedge_rebalance",
      "lp_recenter",
      "message_recovery",
      "risk_restriction",
    ]);
  });

  it("does not duplicate successful delivery and retries failed delivery", async () => {
    const runtime = new KeeperRuntime();
    let attempts = 0;
    await expect(
      runtime.runCycle([observation], () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new Error("temporary RPC failure"))
          : Promise.resolve();
      }),
    ).rejects.toThrow("temporary RPC failure");
    const delivered = await runtime.runCycle([observation], () => {
      attempts += 1;
      return Promise.resolve();
    });
    expect(delivered).toHaveLength(5);
    expect(await runtime.runCycle([observation], () => Promise.resolve())).toHaveLength(0);
    expect(attempts).toBe(6);
  });
});
