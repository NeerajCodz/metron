import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createServiceLogger, withTrace } from "../src/index.js";

class MemoryDestination extends Writable {
  public readonly lines: string[] = [];

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.lines.push(chunk.toString());
    callback();
  }
}

describe("service logger", () => {
  it("correlates traces and redacts signing material", () => {
    const destination = new MemoryDestination();
    const logger = withTrace(
      createServiceLogger({ service: "solver", environment: "test", destination }),
      { traceId: "trace-1", intentId: "intent-1", chainId: 421614 },
    );

    logger.info({ privateKey: "0xsecret", actionType: "route_scored" }, "candidate scored");

    const record = JSON.parse(destination.lines[0] ?? "{}") as Record<string, unknown>;
    expect(record.traceId).toBe("trace-1");
    expect(record.intentId).toBe("intent-1");
    expect(record.chainId).toBe(421614);
    expect(record.privateKey).toBe("[REDACTED]");
    expect(record.actionType).toBe("route_scored");
  });
});
