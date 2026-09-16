import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { McpAuthorizer, type McpAuthConfig } from "../src/auth.js";

const readerDigest = createHash("sha256").update("reader").digest("hex");
const config: McpAuthConfig = {
  tokens: new Map([[readerDigest, { tokenId: "reader", scopes: new Set(["read"]) }]]),
  allowedOrigins: new Set(["https://claude.ai", "https://chatgpt.com"]),
  allowedHosts: new Set(["mcp.example.test"]),
  requestsPerMinute: 1,
};

describe("MCP authentication", () => {
  it("requires the configured origin, host, and bearer token", () => {
    const authorizer = new McpAuthorizer(config);
    expect(() =>
      authorizer.authenticate(new Headers(), "https://claude.ai", "mcp.example.test"),
    ).toThrow("MCP bearer token is required");
    expect(() =>
      authorizer.authenticate(
        new Headers({ authorization: "Bearer reader" }),
        "https://evil.example",
        "mcp.example.test",
      ),
    ).toThrow("origin is not allowed");
  });

  it("enforces scope and rate limits without revealing token material", () => {
    const authorizer = new McpAuthorizer(config);
    const principal = authorizer.authenticate(
      new Headers({ authorization: "Bearer reader" }),
      "https://claude.ai",
      "mcp.example.test",
    );
    expect(principal.tokenId).toBe("reader");
    expect(() => authorizer.requireScope(principal, "simulate")).toThrow(
      "MCP scope 'simulate' is required",
    );
    expect(() =>
      authorizer.authenticate(
        new Headers({ authorization: "Bearer reader" }),
        "https://claude.ai",
        "mcp.example.test",
      ),
    ).toThrow(/RATE_LIMITED|rate limit/i);
  });

  it("rejects conflicting authentication headers", () => {
    const authorizer = new McpAuthorizer(config);
    expect(() =>
      authorizer.authenticate(
        new Headers({
          authorization: "Bearer reader",
          "x-metron-mcp-token": "different-token",
        }),
        "https://claude.ai",
        "mcp.example.test",
      ),
    ).toThrow("MCP authentication headers disagree");
  });
});
