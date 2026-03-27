/**
 * @file http.ts
 * @description HTTP transport server for moodle-mcp.
 *
 * Implements the MCP Streamable HTTP transport (spec 2025-03-26), which
 * replaces the deprecated HTTP+SSE transport from 2024-11-05.
 *
 * The server exposes a single `/mcp` endpoint that handles both POST
 * (client → server requests) and GET (server → client SSE streams).
 * For backwards compatibility with older clients, a legacy `/sse` + `/messages`
 * endpoint pair is also provided.
 *
 * Authentication:
 *   When --token is provided, every request must include either:
 *     Authorization: Bearer <token>
 *   or the query parameter:
 *     ?token=<token>
 *   Requests without a valid token receive HTTP 401.
 *
 * Session management:
 *   Each MCP client session gets a unique UUID. The server maintains a
 *   transport instance per session and cleans up on disconnect. This allows
 *   multiple AI clients to connect to the same moodle-mcp instance
 *   simultaneously (useful in team environments).
 *
 * Security:
 *   - Host header validation rejects DNS rebinding attacks
 *   - Allowed hosts default to localhost only
 *   - Token authentication for remote deployments
 *   - CORS headers are not set — use a reverse proxy for browser access
 *
 * Usage:
 *   node dist/index.js --http [--port 3000] [--host 127.0.0.1] [--token secret]
 */

import express, { Request, Response, NextFunction } from "express";
import { randomUUID }                                from "crypto";
import { McpServer }                                 from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport }             from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport }                        from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest }                       from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HttpServerOptions {
  /** TCP port to listen on. Default: 3000 */
  port:      number;
  /** Host/IP to bind to. Default: "127.0.0.1" */
  host:      string;
  /** Optional Bearer token for authentication. If empty, auth is disabled. */
  token:     string;
  /** Additional hostnames allowed beyond "localhost" and "127.0.0.1" */
  allowedHosts: string[];
  /** Factory that creates a fresh McpServer instance */
  serverFactory: () => Promise<McpServer>;
}

// ---------------------------------------------------------------------------
// Session store
// ---------------------------------------------------------------------------

/** Active Streamable HTTP transport sessions */
const streamableSessions = new Map<string, StreamableHTTPServerTransport>();

/** Active SSE transport sessions (legacy) */
const sseSessions         = new Map<string, SSEServerTransport>();

// ---------------------------------------------------------------------------
// Middleware factories
// ---------------------------------------------------------------------------

/**
 * Token authentication middleware.
 * Skipped entirely when options.token is empty.
 */
function makeAuthMiddleware(token: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!token) { next(); return; }

    // Accept Bearer token in Authorization header or query param
    const authHeader = req.headers["authorization"] ?? "";
    const queryToken = req.query["token"] as string | undefined;

    const provided =
      authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : queryToken?.trim() ?? "";

    if (provided !== token) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Valid Bearer token required. " +
          "Set Authorization: Bearer <token> header or ?token=<token> query param.",
      });
      return;
    }

    next();
  };
}

/**
 * Host header validation middleware — blocks DNS rebinding attacks.
 * Allows: localhost, 127.0.0.1, ::1, and any additional hosts provided.
 */
function makeHostValidationMiddleware(allowedHosts: string[], bindHost: string) {
  const allowed = new Set([
    "localhost",
    "127.0.0.1",
    "::1",
    bindHost,
    ...allowedHosts,
  ]);

  return (req: Request, res: Response, next: NextFunction): void => {
    const host = (req.headers["host"] ?? "").split(":")[0].toLowerCase();

    if (!allowed.has(host)) {
      res.status(403).json({
        error: "Forbidden",
        message: `Host '${host}' is not allowed. Use --allowed-host to permit additional hosts.`,
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * Streamable HTTP endpoint — handles both POST and GET at /mcp.
 *
 * POST: client sends a JSON-RPC request; server responds with JSON or SSE stream.
 * GET:  client opens an SSE stream for server-initiated messages.
 * DELETE: client terminates its session.
 */
function makeStreamableHandler(serverFactory: () => Promise<McpServer>) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      // ----------------------------------------------------------------
      // POST — new request from client
      // ----------------------------------------------------------------
      if (req.method === "POST") {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        // Existing session: reuse transport
        if (sessionId && streamableSessions.has(sessionId)) {
          const transport = streamableSessions.get(sessionId)!;
          await transport.handleRequest(req, res, req.body);
          return;
        }

        // New session: must be an InitializeRequest
        if (sessionId && !isInitializeRequest(req.body)) {
          res.status(400).json({
            error: "Bad Request",
            message: "Session not found. Send an InitializeRequest to start a new session.",
          });
          return;
        }

        // Create new session
        const newSessionId = randomUUID();
        const transport    = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
        });

        streamableSessions.set(newSessionId, transport);

        res.on("close", () => {
          streamableSessions.delete(newSessionId);
        });

        const server = await serverFactory();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // ----------------------------------------------------------------
      // GET — open SSE stream for server-initiated messages
      // ----------------------------------------------------------------
      if (req.method === "GET") {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        if (!sessionId || !streamableSessions.has(sessionId)) {
          res.status(400).json({
            error: "Bad Request",
            message: "Mcp-Session-Id header required for GET requests.",
          });
          return;
        }

        const transport = streamableSessions.get(sessionId)!;
        await transport.handleRequest(req, res);
        return;
      }

      // ----------------------------------------------------------------
      // DELETE — client terminates session
      // ----------------------------------------------------------------
      if (req.method === "DELETE") {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        if (sessionId && streamableSessions.has(sessionId)) {
          const transport = streamableSessions.get(sessionId)!;
          await transport.close();
          streamableSessions.delete(sessionId);
        }

        res.status(204).end();
        return;
      }

      res.status(405).json({ error: "Method Not Allowed" });

    } catch (e) {
      process.stderr.write(`[http] /mcp error: ${String(e)}\n`);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error", message: String(e) });
      }
    }
  };
}

/**
 * Legacy SSE endpoint — GET /sse opens a persistent SSE connection.
 * Kept for backwards compatibility with older MCP clients.
 */
function makeLegacySseHandler(serverFactory: () => Promise<McpServer>) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const transport = new SSEServerTransport("/messages", res);

      // sessionId is assigned by the transport after construction.
      // We register the session after connect so the ID is guaranteed.
      const server = await serverFactory();
      await server.connect(transport);

      // After connect, sessionId is available
      const sessionId = transport.sessionId ?? randomUUID();
      sseSessions.set(sessionId, transport);

      res.on("close", () => {
        sseSessions.delete(sessionId);
      });

    } catch (e) {
      process.stderr.write(`[http] /sse error: ${String(e)}\n`);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  };
}

/**
 * Legacy message endpoint — POST /messages routes to the correct SSE session.
 */
function makeLegacyMessageHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.query["sessionId"] as string | undefined;

    if (!sessionId || !sseSessions.has(sessionId)) {
      res.status(400).json({
        error: "Bad Request",
        message: "Valid sessionId query parameter required.",
      });
      return;
    }

    try {
      const transport = sseSessions.get(sessionId)!;

      // SDK 1.10+ uses handleRequest; older versions used handlePostMessage.
      // Support both to maintain backwards compatibility.
      if (typeof (transport as unknown as Record<string, unknown>)["handleRequest"] === "function") {
        await (transport as unknown as { handleRequest: (req: Request, res: Response) => Promise<void> })
          .handleRequest(req, res);
      } else {
        await transport.handlePostMessage(req, res);
      }
    } catch (e) {
      process.stderr.write(`[http] /messages error: ${String(e)}\n`);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Health & info endpoints
// ---------------------------------------------------------------------------

function makeHealthHandler() {
  return (_req: Request, res: Response): void => {
    res.json({
      status:   "ok",
      server:   "moodle-mcp",
      transport:"streamable-http",
      sessions: {
        streamable: streamableSessions.size,
        sse:        sseSessions.size,
      },
    });
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Starts the HTTP MCP server with Streamable HTTP transport.
 *
 * @param options - Server configuration
 * @returns A cleanup function that closes the server
 */
export async function startHttpServer(options: HttpServerOptions): Promise<() => void> {
  const { port, host, token, allowedHosts, serverFactory } = options;

  const app = express();

  // Parse JSON bodies (required for MCP requests)
  app.use(express.json());

  // Global middleware
  app.use(makeHostValidationMiddleware(allowedHosts, host));
  app.use(makeAuthMiddleware(token));

  // Health check (no auth required — middleware runs after this if we skip it,
  // but for simplicity health is also protected when token is set)
  app.get("/health", makeHealthHandler());

  // Modern Streamable HTTP endpoint
  app.all("/mcp", makeStreamableHandler(serverFactory));

  // Legacy SSE endpoints (backwards compatibility)
  app.get("/sse",          makeLegacySseHandler(serverFactory));
  app.post("/messages",    makeLegacyMessageHandler());

  // 404 fallback
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error:    "Not Found",
      endpoints: ["/mcp", "/sse", "/messages", "/health"],
    });
  });

  // Start listening
  const httpServer = app.listen(port, host, () => {
    process.stderr.write(
      `[moodle-mcp] HTTP server listening on http://${host}:${port}\n` +
      `[moodle-mcp] MCP endpoint:    http://${host}:${port}/mcp\n` +
      `[moodle-mcp] Legacy SSE:      http://${host}:${port}/sse\n` +
      `[moodle-mcp] Health check:    http://${host}:${port}/health\n` +
      (token ? `[moodle-mcp] Auth:             Bearer token required\n` : "") +
      `[moodle-mcp] Active sessions: streamable=${streamableSessions.size} sse=${sseSessions.size}\n`
    );
  });

  return () => {
    httpServer.close();
    for (const t of streamableSessions.values()) t.close().catch(() => {});
    for (const t of sseSessions.values())         t.close().catch(() => {});
    streamableSessions.clear();
    sseSessions.clear();
  };
}
