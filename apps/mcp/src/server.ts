import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { McpAuthorizer, McpAuthError, loadMcpAuthConfig, type McpPrincipal } from "./auth.js";
import { registerResourcesAndPrompts } from "./resources.js";
import { MetronServices, type McpServiceConfig } from "./services.js";
import { registerAnalysisTools } from "./tools/analysis.js";
import { registerExecutionTools } from "./tools/execute.js";
import { registerReadOnlyTools } from "./tools/read.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

class McpRequestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "McpRequestError";
  }
}

export type MetronMcpContext = {
  authorizer: McpAuthorizer;
  principal: McpPrincipal;
  services: MetronServices;
};

export function createMetronServer(context: MetronMcpContext): McpServer {
  const server = new McpServer({ name: "metron-mcp-server", version: "0.1.0" });
  registerReadOnlyTools(server, context);
  registerAnalysisTools(server, context);
  registerExecutionTools(server, context);
  registerResourcesAndPrompts(server, context);
  return server;
}

export function serviceConfigFromEnv(env: NodeJS.ProcessEnv = process.env): McpServiceConfig {
  return {
    aiBaseUrl: env.METRON_AI_BASE_URL,
    aiServiceToken: env.METRON_AI_SERVICE_TOKEN,
    convexUrl: env.METRON_CONVEX_URL,
    convexInternalToken: env.METRON_INTERNAL_TOKEN,
    executionGatewayUrl: env.METRON_EXECUTION_GATEWAY_URL,
    executionGatewayToken: env.METRON_EXECUTION_GATEWAY_TOKEN,
    timeoutMs: Number(env.METRON_MCP_UPSTREAM_TIMEOUT_MS ?? 30_000),
  };
}

export async function runStdio(): Promise<void> {
  const authConfig = loadMcpAuthConfig();
  const authorizer = new McpAuthorizer(authConfig);
  const token = process.env.METRON_MCP_STDIO_TOKEN ?? process.env.METRON_MCP_TOKEN;
  if (!token) throw new Error("METRON_MCP_STDIO_TOKEN or METRON_MCP_TOKEN is required for stdio");
  const principal = authorizer.authenticate(new Headers({ authorization: `Bearer ${token}` }));
  const server = createMetronServer({
    authorizer,
    principal,
    services: new MetronServices(serviceConfigFromEnv()),
  });
  await server.connect(new StdioServerTransport());
  console.error("metron-mcp-server listening on stdio");
}

export async function runHttp(): Promise<void> {
  const authConfig = loadMcpAuthConfig();
  const authorizer = new McpAuthorizer(authConfig);
  const services = new MetronServices(serviceConfigFromEnv());
  const host = process.env.METRON_MCP_HOST ?? "127.0.0.1";
  const port = parsePort(process.env.METRON_MCP_PORT ?? "8788");
  const httpServer = createServer((request, response) => {
    void handleHttpRequest(request, response, authorizer, services).catch((error: unknown) => {
      if (!response.headersSent) response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "internal MCP server error" }));
      console.error(error instanceof Error ? error.message : "unknown MCP server error");
    });
  });
  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, resolve);
  });
  console.error(`metron-mcp-server listening on http://${host}:${port}/mcp`);
}

async function handleHttpRequest(
  request: IncomingMessage,
  response: ServerResponse,
  authorizer: McpAuthorizer,
  services: MetronServices,
): Promise<void> {
  const origin = request.headers.origin;
  if (request.url !== "/mcp") {
    response.writeHead(404, { allow: "POST, OPTIONS" });
    response.end();
    return;
  }
  try {
    authorizer.validateRequest(origin, request.headers.host);
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        allow: "POST, OPTIONS",
        ...corsHeaders(origin),
      });
      response.end();
      return;
    }
    if (request.method !== "POST") {
      response.writeHead(405, { allow: "POST, OPTIONS" });
      response.end();
      return;
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === "string") headers.set(key, value);
    }
    const principal = authorizer.authenticate(headers, origin, request.headers.host);
    const body = await readBody(request);
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    const server = createMetronServer({ authorizer, principal, services });
    response.on("close", () => void transport.close());
    await server.connect(transport as unknown as Parameters<McpServer["connect"]>[0]);
    await transport.handleRequest(request, response, body);
  } catch (error) {
    if (error instanceof McpRequestError) {
      response.writeHead(400, {
        ...corsHeaders(origin),
        "content-type": "application/json",
      });
      response.end(JSON.stringify({ error: "BAD_REQUEST", message: error.message }));
      return;
    }
    if (error instanceof McpAuthError) {
      response.writeHead(error.status, {
        ...corsHeaders(origin),
        "content-type": "application/json",
        "www-authenticate": error.status === 401 ? "Bearer" : "Bearer error=insufficient_scope",
      });
      response.end(JSON.stringify({ error: error.code, message: error.message }));
      return;
    }
    throw error;
  }
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: string[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > 1_000_000) throw new McpRequestError("MCP request body exceeds the 1 MB limit");
    chunks.push(bytes.toString("utf8"));
  }
  const raw = chunks.join("");
  if (!raw) throw new McpRequestError("MCP request body is required");
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new McpRequestError("MCP request body must be valid JSON");
  }
}

function corsHeaders(origin: string | undefined): Record<string, string> {
  return origin
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-headers": "authorization,x-metron-mcp-token,content-type",
        "access-control-allow-methods": "POST,OPTIONS",
        vary: "Origin",
      }
    : {};
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535)
    throw new Error("METRON_MCP_PORT must be a valid TCP port");
  return port;
}
