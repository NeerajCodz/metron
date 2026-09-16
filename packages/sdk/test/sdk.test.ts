import { describe, expect, it } from "vitest";
import { decodeAbiParameters } from "viem";
import type { Hash } from "viem";
import { MetronAiClient, MetronConvexClient } from "../clients.js";
import { MetronSdk } from "../index.js";
const addresses = {
  intentManager: "0x0000000000000000000000000000000000000001",
  intentSettlement: "0x0000000000000000000000000000000000000002",
  vault: "0x0000000000000000000000000000000000000003",
  positionManager: "0x0000000000000000000000000000000000000004",
  solverSettlement: "0x0000000000000000000000000000000000000005",
  recoveryExecutor: "0x0000000000000000000000000000000000000006",
} as const;

describe("MetronSdk", () => {
  it("hashes equivalent JSON payloads deterministically", () => {
    const sdk = new MetronSdk({ publicClient: {} as never, addresses });
    expect(sdk.hashIntentPayload({ action: "deposit", amount: 10 })).toBe(
      sdk.hashIntentPayload({ action: "deposit", amount: 10 }),
    );
  });
  it("runs a proof runner and round-trips ABI public inputs", async () => {
    const publicInputs = [`0x${"11".repeat(32)}` as Hash];
    const sdk = new MetronSdk({
      publicClient: {} as never,
      addresses,
      zkProofRunner: async (circuit, witness) => {
        expect(circuit).toBe("intent");
        expect(witness).toEqual({ nonce: 1 });
        return { proof: "0x1234", publicInputs };
      },
    });

    const proof = await sdk.generateProof("intent", { nonce: 1 });
    const encoded = sdk.encodeProofPublicInputs(proof.publicInputs);

    expect(proof.proof).toBe("0x1234");
    expect(decodeAbiParameters([{ type: "bytes32[]" }], encoded)[0]).toEqual(publicInputs);
  });

  it("sends authenticated AI requests through the domain client", async () => {
    const calls: RequestInit[] = [];
    const ai = new MetronAiClient({
      baseUrl: "https://ai.example",
      serviceToken: "service-token",
      fetcher: async (_input, init) => {
        calls.push(init ?? {});
        return new Response(JSON.stringify({ trace_id: "trace-1" }), { status: 200 });
      },
    });
    const response = await ai.answerPosition<{ question: string }, { trace_id: string }>({
      question: "health?",
    });
    expect(response.trace_id).toBe("trace-1");
    expect(calls[0]?.headers).toMatchObject({ "x-metron-service-token": "service-token" });
  });

  it("keeps Convex transport behind domain operations", async () => {
    const operations: string[] = [];
    const convex = new MetronConvexClient(async (operation) => {
      operations.push(operation);
      return { ok: true };
    });
    await convex.getPosition("position-1" as never);
    expect(operations).toEqual(["positions.get"]);
  });
});
