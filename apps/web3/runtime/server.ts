import { createServer, type IncomingMessage } from "node:http";

import { canonicalIntentSchema } from "@metron/validation";
import type { CanonicalIntent } from "@metron/types";
import { buildCandidateRoutes, buildComposedCandidateRoutes } from "../solver/routes.js";

const service = process.env.METRON_SERVICE ?? "web3-runtime";
const port = Number(process.env.PORT ?? 8787);
const configuredReady = process.env.METRON_RUNTIME_READY === "true";
const runtimeToken = process.env.METRON_RUNTIME_TOKEN;
const dependencyChecks = {
  convex: process.env.METRON_CONVEX_URL !== undefined,
  rpc: process.env.METRON_RPC_URL !== undefined,
  indexer: process.env.METRON_INDEXER_URL !== undefined,
};

function readiness() {
  const operational = configuredReady && Object.values(dependencyChecks).every(Boolean);
  const financial = operational && process.env.METRON_FINANCIAL_READINESS === "true";
  return { service, ready: operational, financialReadiness: financial, checks: dependencyChecks };
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (Buffer.concat(chunks).length > 1_000_000) throw new Error("request body is too large");
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function authorized(request: IncomingMessage): boolean {
  return Boolean(runtimeToken && request.headers["x-metron-runtime-token"] === runtimeToken);
}

const server = createServer(async (request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ service, status: "alive" }));
    return;
  }
  if (request.url === "/ready" || request.url === "/financial-ready") {
    const status = readiness();
    const financial = request.url === "/financial-ready";
    const ok = financial ? status.financialReadiness : status.ready;
    response.writeHead(ok ? 200 : 503, { "content-type": "application/json" });
    response.end(JSON.stringify(status));
    return;
  }
  if (
    request.method === "POST" &&
    (request.url === "/solver/routes" || request.url === "/solver/composed-routes")
  ) {
    if (!authorized(request)) {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    try {
      const body = await readJson(request);
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new Error("JSON object required");
      const payload = body as { intent?: unknown; context?: unknown };
      const intent = canonicalIntentSchema.parse(payload.intent) as unknown as CanonicalIntent;
      if (
        !payload.context ||
        typeof payload.context !== "object" ||
        Array.isArray(payload.context)
      ) {
        throw new Error("context is required");
      }
      const routes =
        request.url === "/solver/routes"
          ? buildCandidateRoutes(
              intent,
              payload.context as Parameters<typeof buildCandidateRoutes>[1],
            )
          : buildComposedCandidateRoutes(
              intent,
              payload.context as Parameters<typeof buildComposedCandidateRoutes>[1],
            );
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ routes, signingRequired: false }));
    } catch (error) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(
        JSON.stringify({ error: error instanceof Error ? error.message : "invalid request" }),
      );
    }
    return;
  }
  response.writeHead(404);
  response.end();
});

server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ service, port, status: "listening" }));
});
