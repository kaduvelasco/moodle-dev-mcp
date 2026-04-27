/**
 * @file tools/search.ts
 * @description MCP tools: search_plugins, search_api, get_plugin_info
 *
 * Provides search capabilities over generated index files:
 *
 *   search_plugins  — full-text search over MOODLE_PLUGIN_INDEX.md
 *   search_api      — search over MOODLE_API_INDEX.md for function names
 *   get_plugin_info — returns detailed info for a specific plugin component
 *
 * All searches read from the pre-generated markdown files on disk,
 * making them fast and dependency-free at query time.
 *
 * Depends on: init_moodle_context having been run first.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { z } from "zod";

import { loadConfig }   from "../config.js";
import { detectPlugin } from "../extractors/plugin.js";
import { glob }         from "glob";
import { resolvePluginPath } from "../utils/plugin-types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads an index file and returns lines matching the query (case-insensitive).
 */
function searchInFile(filePath: string, query: string): string[] {
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, "utf-8");
  const lowerQ  = query.toLowerCase();

  return content
    .split("\n")
    .filter((line) => line.toLowerCase().includes(lowerQ));
}

/**
 * Checks whether the moodle-mcp config exists and returns it,
 * or returns an error response.
 */
function requireConfig() {
  const config = loadConfig();
  if (!config) return null;
  return config;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers all search tools on the MCP server.
 */
export function registerSearchTools(server: McpServer): void {

  // -------------------------------------------------------------------------
  // search_plugins
  // -------------------------------------------------------------------------
  server.tool(
    "search_plugins",

    "Searches installed Moodle plugins by name, component, or type. " +
    "Returns matching rows from the plugin index. " +
    "Requires init_moodle_context to have been run first.",

    {
      query: z
        .string()
        .min(1)
        .describe("Search term — matched against component name, plugin name, and type"),

      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Maximum number of results to return (default 20)"),
    },

    async ({ query, limit }) => {
      const config = requireConfig();
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "❌ Run `init_moodle_context` first." }],
          isError: true,
        };
      }

      const indexFile = join(config.moodlePath, "MOODLE_PLUGIN_INDEX.md");

      if (!existsSync(indexFile)) {
        return {
          content: [{ type: "text" as const, text: "❌ Plugin index not found. Run `update_indexes`." }],
          isError: true,
        };
      }

      const matches = searchInFile(indexFile, query)
        .filter((line) => line.startsWith("|") && !line.includes("Component"))
        .slice(0, limit);

      if (matches.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No plugins found matching: "${query}"` }],
        };
      }

      const lines = [
        `Search results for: "${query}" (${matches.length} found)`,
        "",
        "| Component | Type | Name | Version | Path |",
        "|-----------|------|------|---------|------|",
        ...matches,
      ];

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  // -------------------------------------------------------------------------
  // search_api
  // -------------------------------------------------------------------------
  server.tool(
    "search_api",

    "Searches the Moodle core API index for function names. " +
    "Returns function name, visibility, summary, return type, and @since version. " +
    "By default returns only public and deprecated functions. " +
    "Use visibility: 'all' to include internal/private/unverified. " +
    "Requires init_moodle_context to have been run first.",

    {
      query: z
        .string()
        .min(1)
        .describe("Function name or partial name to search for"),

      visibility: z
        .enum(["public", "deprecated", "all"])
        .optional()
        .default("public")
        .describe(
          "'public' — only fully public functions (default). " +
          "'deprecated' — only deprecated functions. " +
          "'all' — public + deprecated (same as index default)."
        ),

      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(30)
        .describe("Maximum number of results to return (default 30)"),
    },

    async ({ query, visibility, limit }) => {
      const config = requireConfig();
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "❌ Run `init_moodle_context` first." }],
          isError: true,
        };
      }

      // Search the generated index file (fast path)
      const indexFile = join(config.moodlePath, "MOODLE_API_INDEX.md");

      if (!existsSync(indexFile)) {
        return {
          content: [{ type: "text" as const, text: "❌ API index not found. Run `update_indexes`." }],
          isError: true,
        };
      }

      let matches = searchInFile(indexFile, query)
        .filter((line) => line.startsWith("- `"));

      // Apply visibility filter on the rendered lines
      if (visibility === "public") {
        matches = matches.filter((line) => !line.includes("@deprecated"));
      } else if (visibility === "deprecated") {
        matches = matches.filter((line) => line.includes("@deprecated"));
      }
      // "all" keeps everything

      matches = matches.slice(0, limit);

      if (matches.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: `No API functions found matching: "${query}"` +
              (visibility !== "all" ? ` (visibility: ${visibility})` : ""),
          }],
        };
      }

      const lines = [
        `API functions matching: "${query}" — ${matches.length} result(s) (visibility: ${visibility})`,
        "",
        ...matches,
        "",
        "_Format: `name()` [~~@deprecated~~] — summary → return type (since version)_",
      ];

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  // -------------------------------------------------------------------------
  // get_plugin_info
  // -------------------------------------------------------------------------
  server.tool(
    "get_plugin_info",

    "Returns detailed information about a specific Moodle plugin by component name or path. " +
    "Includes metadata, DB tables, events, tasks, services, and capabilities. " +
    "If the plugin has an AI context file, returns that as well. " +
    "Requires init_moodle_context to have been run first.",

    {
      plugin: z
        .string()
        .describe(
          "Plugin component (e.g. 'local_myplugin') or path relative to Moodle root " +
          "(e.g. 'local/myplugin')"
        ),
    },

    async ({ plugin }) => {
      const config = requireConfig();
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "❌ Run `init_moodle_context` first." }],
          isError: true,
        };
      }

      const { moodlePath } = config;

      // Resolve path via shared utility (supports component, relative, absolute)
      const pluginPath = resolve(resolvePluginPath(plugin, moodlePath) ?? join(moodlePath, plugin));

      if (!pluginPath.startsWith(resolve(moodlePath) + "/")) {
        return {
          content: [{ type: "text" as const, text: "❌ Invalid plugin path: must be within the Moodle installation." }],
          isError: true,
        };
      }

      if (!existsSync(pluginPath)) {
        // Try searching the plugin index
        const indexFile = join(moodlePath, "MOODLE_PLUGIN_INDEX.md");
        const matches   = searchInFile(indexFile, plugin).filter((l) => l.startsWith("|"));

        if (matches.length > 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: [
                  `Plugin directory not found at: ${pluginPath}`,
                  "",
                  "Possible matches in index:",
                  ...matches.slice(0, 5),
                ].join("\n"),
              },
            ],
          };
        }

        return {
          content: [{ type: "text" as const, text: `❌ Plugin not found: ${plugin}` }],
          isError: true,
        };
      }

      // Load AI context file if it exists (most complete source)
      const aiContextFile = join(pluginPath, "PLUGIN_AI_CONTEXT.md");
      if (existsSync(aiContextFile)) {
        const content = readFileSync(aiContextFile, "utf-8");
        return {
          content: [{ type: "text" as const, text: content }],
        };
      }

      // Fall back to live detection
      try {
        const info = detectPlugin(pluginPath);

        const lines = [
          `## Plugin: ${info.component}`,
          "",
          `| Property | Value |`,
          `|----------|-------|`,
          `| Component | \`${info.component}\` |`,
          `| Type      | ${info.type} |`,
          `| Name      | ${info.displayName || info.name} |`,
          `| Version   | ${info.version} |`,
          `| Requires  | ${info.requires} |`,
          `| Maturity  | ${info.maturity} |`,
          `| Path      | ${info.path} |`,
          "",
          "_No AI context file found. Run `generate_plugin_context` to generate full context._",
        ];

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `❌ Error reading plugin: ${String(e)}` }],
          isError: true,
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // list_dev_plugins
  // -------------------------------------------------------------------------
  server.tool(
    "list_dev_plugins",

    "Lists all plugins currently marked as in development " +
    "(those containing a .moodle-mcp-dev file). " +
    "Requires init_moodle_context to have been run first.",

    {},

    async () => {
      const config = requireConfig();
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "❌ Run `init_moodle_context` first." }],
          isError: true,
        };
      }

      const devMarkers = await glob("**/.moodle-mcp-dev", {
        cwd:    config.moodlePath,
        absolute: true,
        ignore: ["vendor/**", "node_modules/**"],
      });

      if (devMarkers.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "No plugins marked as in development.",
                "",
                "Use `generate_plugin_context` to mark a plugin as in development.",
              ].join("\n"),
            },
          ],
        };
      }

      const lines = [
        `Dev plugins: ${devMarkers.length}`,
        "",
        "| Component | Path | Has AI Context |",
        "|-----------|------|----------------|",
      ];

      for (const marker of devMarkers.sort()) {
        const pluginDir = join(marker, "..");
        try {
          const info       = detectPlugin(pluginDir);
          const rel        = pluginDir.replace(config.moodlePath + "/", "");
          const hasContext = existsSync(join(pluginDir, "PLUGIN_AI_CONTEXT.md")) ? "✔" : "";
          lines.push(`| \`${info.component}\` | ${rel} | ${hasContext} |`);
        } catch {
          const rel = pluginDir.replace(config.moodlePath + "/", "");
          lines.push(`| _(unknown)_ | ${rel} | |`);
        }
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );
}
