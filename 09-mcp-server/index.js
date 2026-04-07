import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const server = createServer();
const transport = new StdioServerTransport();

await server.connect(transport);
// Server is now running — reads from stdin, writes to stdout
// MCP clients communicate via this stdio channel