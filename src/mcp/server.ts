/**
 * PHASE 5 – MCP-Server (baust du selbst)
 *
 * Pakete:  npm install @modelcontextprotocol/sdk zod
 * Doku:    https://modelcontextprotocol.io  (TypeScript SDK, "Build a server")
 *
 * Grober Aufbau:
 *   const server = new McpServer({ name: "lunagraph", version: "0.1.0" });
 *   server.registerTool("find_symbol", { description, inputSchema: { query: z.string() } }, handler);
 *   await server.connect(new StdioServerTransport());
 *
 * Wichtig bei stdio: NIE console.log im Server benutzen – stdout ist der Protokoll-Kanal.
 * Logs gehen auf console.error.
 *
 * Die sechs Tools stehen im Konzept (overview, find_symbol, get_symbol, callers, impact, table_usage).
 * Lege die Handler in tools.ts ab, damit du sie ohne MCP direkt testen kannst.
 *
 * Einbindung im Zielprojekt (.mcp.json):
 *   { "mcpServers": { "lunagraph": { "command": "npx",
 *       "args": ["tsx", "<pfad>/lunagraph/src/cli.ts", "serve", "."] } } }
 */
export async function startServer(_dbPath: string): Promise<void> {
  throw new Error("MCP-Server kommt in Phase 5");
}
