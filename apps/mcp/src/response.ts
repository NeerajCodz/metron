import { McpAuthError } from "./auth.js";

export const CHARACTER_LIMIT = 25_000;
export const RESPONSE_FORMATS = ["json", "markdown"] as const;
export type ResponseFormat = (typeof RESPONSE_FORMATS)[number];

export function toolResult(
  payload: Record<string, unknown>,
  responseFormat: ResponseFormat,
  title: string,
): {
  content: [{ type: "text"; text: string }];
  structuredContent: Record<string, unknown>;
} {
  const json = JSON.stringify(payload, null, 2);
  const text = responseFormat === "json" ? json : markdownResult(payload, title);
  return {
    content: [{ type: "text", text: truncate(text) }],
    structuredContent: payload,
  };
}

export function toolError(error: unknown): {
  isError: true;
  content: [{ type: "text"; text: string }];
} {
  if (error instanceof McpAuthError) {
    return { isError: true, content: [{ type: "text", text: `${error.code}: ${error.message}` }] };
  }
  const message = error instanceof Error ? error.message : "unexpected MCP tool failure";
  return { isError: true, content: [{ type: "text", text: `TOOL_ERROR: ${message}` }] };
}

function markdownResult(payload: Record<string, unknown>, title: string): string {
  const lines = [`# ${title}`, ""];
  for (const [key, value] of Object.entries(payload)) {
    const rendered = typeof value === "string" ? value : JSON.stringify(value);
    lines.push(`- **${key}**: ${rendered}`);
  }
  return lines.join("\n");
}

function truncate(value: string): string {
  if (value.length <= CHARACTER_LIMIT) return value;
  return `${value.slice(0, CHARACTER_LIMIT - 180)}\n\n[truncated: use pagination or narrower inputs]`;
}
