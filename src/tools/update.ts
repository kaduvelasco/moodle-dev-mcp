/**
 * @file tools/update.ts
 * @description MCP tools: update_indexes, watch_plugins
 *
 * Fixes over initial version:
 *   - join(marker, "..") replaced with resolve() for correct path resolution
 *   - watch_plugins tool added, backed by MoodleWatcher
 *   - Cache invalidation before forced update
 *   - All messages in English
 */

import { McpServer }              from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolve }                from "path";
import { z }                      from "zod";
import { glob }                   from "glob";

import { loadConfig, saveConfig } from "../config.js";
import { generateAll }            from "../generators/moodle.js";
import { generateAllForPlugin }   from "../generators/plugin.js";
import { detectMoodleVersionFromPath } from "../extractors/moodle-detect.js";
import { globalCache }            from "../cache.js";
import { MoodleWatcher }          from "../watcher.js";

// ---------------------------------------------------------------------------
// Module-level watcher instance (one per server process)
// ---------------------------------------------------------------------------

let activeWatcher: MoodleWatcher | null = null;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerUpdateTool(server: McpServer): void {

  // -------------------------------------------------------------------------
  // update_indexes
  // -------------------------------------------------------------------------
  server.tool(
    "update_indexes",

    "Regenerates all global Moodle index files (API, events, tasks, services, " +
    "DB tables, classes, capabilities, plugin map, workspace). " +
    "Optionally also refreshes context for all plugins marked as in development. " +
    "Uses file mtime cache — unchanged files are skipped automatically. " +
    "Pass force: true to bypass the cache and regenerate everything.",

    {
      include_plugins: z
        .boolean().optional().default(false)
        .describe("Also regenerate context for all dev plugins (.moodle-mcp-dev)."),

      force: z
        .boolean().optional().default(false)
        .describe("Bypass cache and regenerate all files unconditionally."),
    },

    async ({ include_plugins, force }) => {
      const config = loadConfig();
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "❌ Run `init_moodle_context` first." }],
          isError: true,
        };
      }

      const { moodlePath } = config;

      // Re-detect version (may have been upgraded)
      const moodleVersion = detectMoodleVersionFromPath(moodlePath) ?? config.moodleVersion;
      if (moodleVersion !== config.moodleVersion) {
        saveConfig({ moodlePath, moodleVersion });
      }

      // Bust cache if forced
      if (force) globalCache.invalidateAll();

      const globalResults = await generateAll(moodlePath, moodleVersion);
      const globalSucceeded = globalResults.filter((r) => r.success && !r.skipped);
      const globalSkipped   = globalResults.filter((r) => r.skipped);
      const globalFailed    = globalResults.filter((r) => !r.success);

      const lines: string[] = [
        "✅ Indexes updated.",
        "",
        `Moodle path:    ${moodlePath}`,
        `Moodle version: ${moodleVersion}`,
        "",
        `Files regenerated: ${globalSucceeded.length}`,
        `Files skipped (cached): ${globalSkipped.length}`,
      ];

      if (globalFailed.length > 0) {
        lines.push(`Files failed: ${globalFailed.length}`);
        for (const f of globalFailed) lines.push(`  ✖ ${f.file}: ${f.error}`);
      }

      if (include_plugins) {
        lines.push("", "## Plugin Context Updates", "");

        const devMarkers = await glob("**/.moodle-mcp-dev", {
          cwd: moodlePath, absolute: true,
          ignore: ["vendor/**", "node_modules/**"],
        });

        if (devMarkers.length === 0) {
          lines.push("No plugins marked as in development (.moodle-mcp-dev).");
        } else {
          lines.push(`Dev plugins found: ${devMarkers.length}`, "");

          for (const marker of devMarkers) {
            // Use resolve() — not join() — to correctly navigate from absolute path
            const pluginDir = resolve(marker, "..");

            try {
              if (force) {
                // Invalidate all plugin context files from cache
                const pluginFiles = [
                  "PLUGIN_AI_CONTEXT.md", "PLUGIN_CONTEXT.md", "PLUGIN_STRUCTURE.md",
                  "PLUGIN_DB_TABLES.md", "PLUGIN_EVENTS.md", "PLUGIN_DEPENDENCIES.md",
                  "PLUGIN_ARCHITECTURE.md", "PLUGIN_FUNCTION_INDEX.md",
                  "PLUGIN_CALLBACK_INDEX.md", "PLUGIN_ENDPOINT_INDEX.md", "PLUGIN_RUNTIME_FLOW.md",
                ];
                for (const f of pluginFiles) {
                  globalCache.invalidate(`${pluginDir}/${f}`);
                }
              }

              const result = await generateAllForPlugin(pluginDir, moodlePath);
              const ok     = result.files.filter((f) => f.success && !f.skipped).length;
              const skip   = result.files.filter((f) => f.skipped).length;
              const fail   = result.files.filter((f) => !f.success).length;

              lines.push(
                fail === 0
                  ? `  ✔ ${result.plugin} (${ok} regenerated, ${skip} cached)`
                  : `  ⚠ ${result.plugin} (${ok} ok, ${skip} cached, ${fail} failed)`
              );
            } catch (e) {
              lines.push(`  ✖ ${pluginDir}: ${String(e)}`);
            }
          }
        }
      }

      const stats = globalCache.getStats();
      lines.push("", `Cache — hits: ${stats.hits}, misses: ${stats.misses}, skips: ${stats.skips}`);

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  // -------------------------------------------------------------------------
  // watch_plugins
  // -------------------------------------------------------------------------
  server.tool(
    "watch_plugins",

    "Starts or stops the file watcher for dev plugins. " +
    "When started, watches db/*.php and version.php inside all plugins marked " +
    "with .moodle-mcp-dev and automatically regenerates context when files change. " +
    "Pass action: 'stop' to stop an active watcher.",

    {
      action: z
        .enum(["start", "stop", "status"])
        .optional().default("start")
        .describe("'start' to begin watching, 'stop' to stop, 'status' to check."),
    },

    async ({ action }) => {
      const config = loadConfig();
      if (!config && action === "start") {
        return {
          content: [{ type: "text" as const, text: "❌ Run `init_moodle_context` first." }],
          isError: true,
        };
      }

      if (action === "status") {
        return {
          content: [{
            type: "text" as const,
            text: activeWatcher?.isRunning()
              ? "✔ Watcher is active."
              : "Watcher is not running.",
          }],
        };
      }

      if (action === "stop") {
        if (!activeWatcher) {
          return { content: [{ type: "text" as const, text: "No active watcher to stop." }] };
        }
        activeWatcher.stop();
        activeWatcher = null;
        return { content: [{ type: "text" as const, text: "✔ Watcher stopped." }] };
      }

      // action === "start"
      if (activeWatcher?.isRunning()) {
        return { content: [{ type: "text" as const, text: "⚠ Watcher is already running. Use action: 'stop' first." }] };
      }

      const { moodlePath, moodleVersion } = config!;
      activeWatcher = new MoodleWatcher(moodlePath, moodleVersion);
      const count   = await activeWatcher.start();

      return {
        content: [{
          type: "text" as const,
          text: [
            `✅ Watcher started — monitoring ${count} files across dev plugins.`,
            "",
            "Context will be regenerated automatically when db/*.php or version.php change.",
            "Use `watch_plugins action='stop'` to stop.",
          ].join("\n"),
        }],
      };
    }
  );
}
