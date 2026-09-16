import { httpAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { httpRouter } from "convex/server";

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requireInternalToken(request: Request): void {
  const expected = process.env.METRON_INTERNAL_TOKEN;
  const provided = request.headers.get("x-metron-internal-token");
  if (!expected || !provided || provided !== expected) throw new Error("unauthorized");
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("JSON object required");
  return body as Record<string, unknown>;
}

function stringField(body: Record<string, unknown>, name: string): string {
  const value = body[name];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

function numberField(body: Record<string, unknown>, name: string): number {
  const value = body[name];
  if (typeof value !== "number" || !Number.isSafeInteger(value))
    throw new Error(`${name} must be an integer`);
  return value;
}

function responseFromError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "request failed";
  if (message === "unauthorized") return unauthorized();
  return jsonResponse({ error: message }, 400);
}

const internalAction = (handler: Parameters<typeof httpAction>[0]) =>
  httpAction(async (ctx, request) => {
    try {
      requireInternalToken(request);
      return await handler(ctx, request);
    } catch (error) {
      return responseFromError(error);
    }
  });

const router = httpRouter();

router.route({
  path: "/internal/indexer/transaction",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const body = await readJson(request);
    return jsonResponse(
      await ctx.runMutation(internal.indexing.recordChainTransaction, {
        chainId: numberField(body, "chainId"),
        transactionHash: stringField(body, "transactionHash"),
        blockNumber: numberField(body, "blockNumber"),
        blockHash: stringField(body, "blockHash"),
        transactionIndex: numberField(body, "transactionIndex"),
        status: body.status as "confirmed" | "reverted" | "orphaned",
        ...(body.traceId === undefined ? {} : { traceId: stringField(body, "traceId") }),
      }),
    );
  }),
});

router.route({
  path: "/internal/indexer/cursor",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const body = await readJson(request);
    return jsonResponse(
      await ctx.runMutation(internal.indexing.advanceCursor, {
        chainId: numberField(body, "chainId"),
        stream: stringField(body, "stream"),
        blockNumber: numberField(body, "blockNumber"),
        blockHash: stringField(body, "blockHash"),
        confirmations: numberField(body, "confirmations"),
      }),
    );
  }),
});

router.route({
  path: "/internal/solver/commit",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const body = await readJson(request);
    return jsonResponse(
      await ctx.runMutation(internal.solvers.commitBid, {
        intentId: stringField(body, "intentId") as never,
        solverId: stringField(body, "solverId"),
        commitment: stringField(body, "commitment"),
        traceId: stringField(body, "traceId"),
      }),
    );
  }),
});

router.route({
  path: "/internal/solver/reveal",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const body = await readJson(request);
    return jsonResponse(
      await ctx.runMutation(internal.solvers.revealBid, {
        intentId: stringField(body, "intentId") as never,
        solverId: stringField(body, "solverId"),
        salt: stringField(body, "salt"),
        routeJson: stringField(body, "routeJson"),
      }),
    );
  }),
});

router.route({
  path: "/internal/solver/select",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const body = await readJson(request);
    return jsonResponse(
      await ctx.runMutation(internal.solvers.selectWinner, {
        intentId: stringField(body, "intentId") as never,
      }),
    );
  }),
});

export default router;
