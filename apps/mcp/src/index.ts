import { runHttp, runStdio } from "./server.js";

export const MCP_PACKAGE_NAME = "@metron/mcp";

export async function main(): Promise<void> {
  const transport = process.env.METRON_MCP_TRANSPORT ?? "stdio";
  if (transport === "http") {
    await runHttp();
    return;
  }
  if (transport === "stdio") {
    await runStdio();
    return;
  }
  throw new Error("METRON_MCP_TRANSPORT must be 'stdio' or 'http'");
}

const isVitest = process.env.VITEST === "true";
if (!isVitest) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "MCP server failed to start");
    process.exitCode = 1;
  });
}
