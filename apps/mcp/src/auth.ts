import { createHash, timingSafeEqual } from "node:crypto";

export type McpScope = "read" | "simulate" | "execute" | "admin";

export type McpPrincipal = {
  tokenId: string;
  scopes: ReadonlySet<McpScope>;
};

export type McpAuthConfig = {
  tokens: ReadonlyMap<string, McpPrincipal>;
  allowedOrigins: ReadonlySet<string>;
  allowedHosts: ReadonlySet<string>;
  requestsPerMinute: number;
};

type RateBucket = { startedAt: number; count: number };

export class McpAuthError extends Error {
  public readonly status: 401 | 403 | 429;
  public readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "RATE_LIMITED";

  public constructor(
    message: string,
    status: 401 | 403 | 429,
    code: "UNAUTHORIZED" | "FORBIDDEN" | "RATE_LIMITED",
  ) {
    super(message);
    this.name = "McpAuthError";
    this.status = status;
    this.code = code;
  }
}

function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tokenEquals(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function parseScope(value: string): McpScope {
  if (value !== "read" && value !== "simulate" && value !== "execute" && value !== "admin") {
    throw new Error(`unsupported MCP scope: ${value}`);
  }
  return value;
}

export function loadMcpAuthConfig(env: NodeJS.ProcessEnv = process.env): McpAuthConfig {
  const tokens = new Map<string, McpPrincipal>();
  const configured = env.METRON_MCP_TOKENS?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? [];
  const single = env.METRON_MCP_TOKEN?.trim();
  if (single) configured.push(`${single}=read|simulate`);
  if (configured.length === 0) {
    throw new Error("METRON_MCP_TOKENS or METRON_MCP_TOKEN is required");
  }
  for (const entry of configured) {
    const separator = entry.indexOf("=");
    if (separator <= 0) throw new Error("MCP token entries must use token=scope|scope format");
    const token = entry.slice(0, separator).trim();
    if (token.length < 32) throw new Error("MCP tokens must contain at least 32 characters");
    const scopes = new Set(entry.slice(separator + 1).split("|").map((scope) => parseScope(scope)));
    if (scopes.size === 0) throw new Error("MCP tokens must have at least one scope");
    tokens.set(tokenDigest(token), { tokenId: tokenDigest(token).slice(0, 16), scopes });
  }
  const split = (value: string | undefined): ReadonlySet<string> =>
    new Set(value?.split(",").map((item) => item.trim()).filter(Boolean) ?? []);
  const requestsPerMinute = Number(env.METRON_MCP_REQUESTS_PER_MINUTE ?? 120);
  if (!Number.isInteger(requestsPerMinute) || requestsPerMinute < 1 || requestsPerMinute > 10_000) {
    throw new Error("METRON_MCP_REQUESTS_PER_MINUTE must be an integer between 1 and 10000");
  }
  return {
    tokens,
    allowedOrigins: split(env.METRON_MCP_ALLOWED_ORIGINS),
    allowedHosts: split(env.METRON_MCP_ALLOWED_HOSTS),
    requestsPerMinute,
  };
}

export class McpAuthorizer {
  private readonly buckets = new Map<string, RateBucket>();

  public constructor(private readonly config: McpAuthConfig, private readonly now = () => Date.now()) {}

  public authenticate(headers: Headers, origin?: string, host?: string): McpPrincipal {
    if (this.config.allowedOrigins.size > 0 && origin && !this.config.allowedOrigins.has(origin)) {
      throw new McpAuthError("origin is not allowed", 403, "FORBIDDEN");
    }
    if (this.config.allowedHosts.size > 0 && host && !this.config.allowedHosts.has(host)) {
      throw new McpAuthError("host is not allowed", 403, "FORBIDDEN");
    }
    const authorization = headers.get("authorization");
    const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const supplied = bearer ?? headers.get("x-metron-mcp-token");
    if (!supplied) throw new McpAuthError("MCP bearer token is required", 401, "UNAUTHORIZED");
    const digest = tokenDigest(supplied);
    const principalEntry = [...this.config.tokens.entries()].find(([configuredDigest]) =>
      tokenEquals(configuredDigest, digest),
    );
    if (!principalEntry) throw new McpAuthError("MCP bearer token is invalid", 401, "UNAUTHORIZED");
    this.consumeRate(principalEntry[1].tokenId);
    return principalEntry[1];
  }

  public requireScope(principal: McpPrincipal, scope: McpScope): void {
    if (!principal.scopes.has(scope) && !principal.scopes.has("admin")) {
      throw new McpAuthError(`MCP scope '${scope}' is required`, 403, "FORBIDDEN");
    }
  }

  private consumeRate(tokenId: string): void {
    const current = this.now();
    const bucket = this.buckets.get(tokenId);
    if (!bucket || current - bucket.startedAt >= 60_000) {
      this.buckets.set(tokenId, { startedAt: current, count: 1 });
      return;
    }
    bucket.count += 1;
    if (bucket.count > this.config.requestsPerMinute) {
      throw new McpAuthError("MCP rate limit exceeded; retry after the current window", 429, "RATE_LIMITED");
    }
  }
}
