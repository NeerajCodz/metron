import { describe, expect, it } from "vitest";
import { MetricsRegistry } from "../index.js";

describe("MetricsRegistry", () => {
  it("renders deterministic labeled Prometheus metrics", () => {
    const metrics = new MetricsRegistry();
    metrics.define("metron_keeper_triggers_total", "Keeper triggers", "counter");
    metrics.increment("metron_keeper_triggers_total", 2, {
      kind: "emergency_unwind",
      chain: "11155111",
    });
    metrics.increment("metron_keeper_triggers_total", 1, {
      chain: "11155111",
      kind: "hedge_rebalance",
    });
    expect(metrics.render()).toContain(
      'metron_keeper_triggers_total{chain="11155111",kind="emergency_unwind"} 2',
    );
    expect(metrics.render()).toContain(
      'metron_keeper_triggers_total{chain="11155111",kind="hedge_rebalance"} 1',
    );
  });

  it("rejects undefined metrics instead of silently dropping telemetry", () => {
    const metrics = new MetricsRegistry();
    expect(() => metrics.increment("missing")).toThrow("metric is not defined");
  });
});
