#!/usr/bin/env node

/**
 * @file index.ts
 * @description Entry point for the moodle-mcp MCP server.
 *
 * Supports two transport modes, selected via CLI flags:
 *
 *   stdio (default)
 *     Standard MCP transport for local clients (Claude Desktop, Cursor, VS Code).
 *     No extra dependencies, no network exposure.
 *     Usage: node dist/index.js
 *
 *   HTTP (--http flag)
 *     Streamable HTTP transport (MCP spec 2025-03-26) for remote installations.
 *     Exposes a single /mcp endpoint plus legacy /sse + /messages for older clients.
 *     Usage: node dist/index.js --http [--port 3000] [--host 127.0.0.1] [--token secret]
 *
 * CLI flags (HTTP mode only):
 *   --http                  Enable HTTP transport (required to activate HTTP mode)
 *   --port <number>         TCP port (default: 3000)
 *   --host <address>        Bind address (default: 127.0.0.1)
 *   --token <secret>        Bearer token for authentication (default: none)
 *   --allowed-host <host>   Additional hostname allowed by Host header validation
 *                           (can be repeated for multiple hosts)
 *
 * Claude Desktop configuration (stdio):
 *   {
 *     "mcpServers": {
 *       "moodle-mcp": {
 *         "command": "node",
 *         "args": ["/absolute/path/to/moodle-mcp/dist/index.js"]
 *       }
 *     }
 *   }
 *
 * Claude Desktop configuration (HTTP — remote server):
 *   {
 *     "mcpServers": {
 *       "moodle-mcp-remote": {
 *         "url": "http://moodle-server.example.com:3000/mcp",
 *         "headers": {
 *           "Authorization": "Bearer your-secret-token"
 *         }
 *       }
 *     }
 *   }
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer }         from "./server.js";
import { startHttpServer }      from "./http.js";

// ---------------------------------------------------------------------------
// CLI argument parser
// ---------------------------------------------------------------------------

interface CliArgs {
  http:         boolean;
  port:         number;
  host:         string;
  token:        string;
  allowedHosts: string[];
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    http:         false,
    port:         3000,
    host:         "127.0.0.1",
    token:        "",
    allowedHosts: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--http") {
      args.http = true;
      continue;
    }

    if (arg === "--port" && argv[i + 1]) {
      const parsed = parseInt(argv[++i], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
        args.port = parsed;
      } else {
        process.stderr.write(`Warning: invalid --port value '${argv[i]}', using ${args.port}\n`);
      }
      continue;
    }

    if (arg === "--host" && argv[i + 1]) {
      args.host = argv[++i];
      continue;
    }

    if (arg === "--token" && argv[i + 1]) {
      args.token = argv[++i];
      continue;
    }

    if (arg === "--allowed-host" && argv[i + 1]) {
      args.allowedHosts.push(argv[++i]);
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp(): void {
  process.stdout.write([
    "moodle-mcp — MCP server for Moodle plugin development",
    "",
    "Usage:",
    "  node dist/index.js                         # stdio mode (default)",
    "  node dist/index.js --http                  # HTTP mode, port 3000",
    "  node dist/index.js --http --port 8080      # HTTP mode, custom port",
    "  node dist/index.js --http --token secret   # HTTP mode with auth",
    "",
    "Options:",
    "  --http                Enable HTTP/Streamable HTTP transport",
    "  --port <number>       TCP port for HTTP mode (default: 3000)",
    "  --host <address>      Bind address for HTTP mode (default: 127.0.0.1)",
    "  --token <secret>      Bearer token for HTTP authentication",
    "  --allowed-host <host> Additional hostname allowed beyond localhost",
    "  --help, -h            Show this help",
    "",
    "HTTP endpoints (when --http is set):",
    "  POST/GET /mcp         Streamable HTTP transport (MCP spec 2025-03-26)",
    "  GET      /sse         Legacy SSE transport (backwards compat)",
    "  POST     /messages    Legacy SSE message handler",
    "  GET      /health      Health check",
    "",
  ].join("\n"));
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // -------------------------------------------------------------------------
  // HTTP mode
  // -------------------------------------------------------------------------
  if (args.http) {
    const cleanup = await startHttpServer({
      port:          args.port,
      host:          args.host,
      token:         args.token,
      allowedHosts:  args.allowedHosts,
      serverFactory: createServer,
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      process.stderr.write(`[moodle-mcp] Received ${signal} — shutting down...\n`);
      cleanup();
      process.exit(0);
    };

    process.on("SIGINT",  () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    return; // Keep process alive — HTTP server holds the event loop
  }

  // -------------------------------------------------------------------------
  // stdio mode (default)
  // -------------------------------------------------------------------------
  const server    = await createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  process.stderr.write("moodle-mcp server running on stdio\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`Fatal error: ${String(error)}\n`);
  process.exit(1);
});
