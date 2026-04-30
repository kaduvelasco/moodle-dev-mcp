/**
 * @file tools/batch.ts
 * @description MCP tool: plugin_batch
 *
 * Generates or refreshes AI context for multiple Moodle plugins in a
 * single call. Three modes of operation:
 *
 *   dev      (default) — all plugins marked with .moodle-mcp-dev
 *   all                — every plugin in the Moodle installation
 *   list               — a caller-provided list of paths or components
 *
 * Each plugin is processed sequentially to avoid overwhelming the
 * filesystem. The tool reports per-plugin results and a final summary
 * with counts of succeeded, skipped (cached), and failed plugins.
 *
 * Concurrency is intentionally kept at 1 (sequential) because:
 *   - Moodle installations can have 200+ plugins
 *   - Parallel glob + PHP file reads saturate disk I/O quickly
 *   - Sequential processing gives predictable, readable progress output
 *
 * MCP Tool name: plugin_batch
 */

import { McpServer }          from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync }         from "fs";
import { join, relative, resolve } from "path";
import { z }                  from "zod";
import { glob }               from "glob";

import { loadConfig }         from "../config.js";
import { generateAllForPlugin } from "../generators/plugin.js";
import { generateAiIndex }    from "../generators/moodle.js";
import { detectPlugin }       from "../extractors/plugin.js";
import { globalCache }        from "../cache.js";
import { resolvePluginPath } from "../utils/plugin-types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BatchPluginResult {
  component:  string;
  path:       string;
  generated:  number;
  skipped:    number;
  failed:     number;
  error?:     string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Finds all plugin directories marked as in development (.moodle-mcp-dev).
 */
async function findDevPlugins(moodlePath: string): Promise<string[]> {
  const markers = await glob("**/.moodle-mcp-dev", {
    cwd:      moodlePath,
    absolute: true,
    ignore:   ["vendor/**", "node_modules/**"],
  });

  // Use resolve() — not join() — to correctly navigate from absolute paths
  return markers.map((m) => resolve(m, ".."));
}

/**
 * Finds all plugin directories in the Moodle installation.
 * Scans exactly two levels deep for version.php.
 */
async function findAllPlugins(moodlePath: string): Promise<string[]> {
  const files = await glob("*/*/version.php", {
    cwd:      moodlePath,
    absolute: true,
    ignore:   ["vendor/**", "node_modules/**", "lib/**"],
  });

  return [...new Set(files.map((f) => f.replace(/\/version\.php$/, "")))];
}

// resolvePluginPath is imported from ../utils/plugin-types.js

/**
 * Processes a single plugin: generates context and returns a result summary.
 * Never throws — all errors are captured in the result.
 */
async function processPlugin(
  pluginPath: string,
  moodlePath: string,
  force:      boolean,
  markAsDev:  boolean
): Promise<BatchPluginResult> {
  let component = relative(moodlePath, pluginPath);

  try {
    const info = detectPlugin(pluginPath);
    component  = info.component;
  } catch {
    // Keep path as label if detection fails
  }

  try {
    if (force) {
      // Invalidate all cached context files for this plugin
      const pluginFiles = [
        "PLUGIN_AI_CONTEXT.md", "PLUGIN_CONTEXT.md", "PLUGIN_STRUCTURE.md",
        "PLUGIN_DB_TABLES.md", "PLUGIN_EVENTS.md", "PLUGIN_DEPENDENCIES.md",
        "PLUGIN_ARCHITECTURE.md", "PLUGIN_FUNCTION_INDEX.md",
        "PLUGIN_CALLBACK_INDEX.md", "PLUGIN_ENDPOINT_INDEX.md",
        "PLUGIN_RUNTIME_FLOW.md",
      ];
      for (const f of pluginFiles) {
        globalCache.invalidate(join(pluginPath, f));
      }
    }

    const result = await generateAllForPlugin(pluginPath, moodlePath, markAsDev);

    const generated = result.files.filter((f) => f.success && !f.skipped).length;
    const skipped   = result.files.filter((f) => f.skipped).length;
    const failed    = result.files.filter((f) => !f.success).length;

    return { component, path: pluginPath, generated, skipped, failed };

  } catch (e) {
    return {
      component,
      path:      pluginPath,
      generated: 0,
      skipped:   0,
      failed:    1,
      error:     String(e),
    };
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers the plugin_batch tool on the MCP server.
 */
export function registerBatchTool(server: McpServer): void {
  server.tool(
    "plugin_batch",

    "Generates or refreshes AI context for multiple Moodle plugins in one call. " +
    "Three modes: " +
    "'dev' (default) processes all plugins marked with .moodle-mcp-dev; " +
    "'all' processes every plugin in the installation; " +
    "'list' processes a caller-provided set of plugins. " +
    "Uses the mtime cache — unchanged plugins are skipped unless force: true is passed. " +
    "Requires init_moodle_context to have been run first.",

    {
      mode: z
        .enum(["dev", "all", "list"])
        .optional()
        .default("dev")
        .describe(
          "'dev' — only plugins marked with .moodle-mcp-dev (default). " +
          "'all' — every plugin in the Moodle installation (may be slow). " +
          "'list' — plugins provided in the plugins parameter."
        ),

      plugins: z
        .array(z.string())
        .optional()
        .describe(
          "Required when mode is 'list'. " +
          "Each entry can be a component (e.g. 'local_myplugin'), " +
          "a relative path (e.g. 'local/myplugin'), or an absolute path."
        ),

      force: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Bypass the mtime cache and regenerate all context files even if " +
          "source files have not changed. Defaults to false."
        ),

      mark_as_dev: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "When mode is 'all' or 'list', also mark processed plugins with " +
          ".moodle-mcp-dev so they are picked up by watch_plugins and future " +
          "'dev' mode runs. Has no effect when mode is 'dev'. Defaults to false."
        ),
    },

    async ({ mode, plugins: pluginList, force, mark_as_dev }) => {
      // ------------------------------------------------------------------
      // Load config
      // ------------------------------------------------------------------
      const config = loadConfig();

      if (!config) {
        return {
          content: [{
            type: "text" as const,
            text: "❌ moodle-mcp is not initialized. Run `init_moodle_context` first.",
          }],
          isError: true,
        };
      }

      const { moodlePath, moodleVersion } = config;

      // ------------------------------------------------------------------
      // Resolve plugin list based on mode
      // ------------------------------------------------------------------
      let pluginPaths: string[] = [];
      let modeDescription       = "";

      if (mode === "dev") {
        pluginPaths     = await findDevPlugins(moodlePath);
        modeDescription = "dev plugins (.moodle-mcp-dev)";

        if (pluginPaths.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: [
                "No plugins marked as in development.",
                "",
                "Use `generate_plugin_context` to mark a plugin as in development,",
                "or use `plugin_batch mode='all'` to process all installed plugins.",
              ].join("\n"),
            }],
          };
        }

      } else if (mode === "all") {
        pluginPaths     = await findAllPlugins(moodlePath);
        modeDescription = "all installed plugins";

        if (pluginPaths.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "❌ No plugins found in the Moodle installation.",
            }],
            isError: true,
          };
        }

      } else if (mode === "list") {
        if (!pluginList || pluginList.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "❌ mode 'list' requires the `plugins` parameter.",
            }],
            isError: true,
          };
        }

        // Resolve each identifier
        const unresolved: string[] = [];

        for (const identifier of pluginList) {
          const resolved = resolvePluginPath(identifier, moodlePath);
          if (resolved) {
            pluginPaths.push(resolved);
          } else {
            unresolved.push(identifier);
          }
        }

        if (unresolved.length > 0) {
          return {
            content: [{
              type: "text" as const,
              text: [
                `❌ Could not resolve ${unresolved.length} plugin(s):`,
                ...unresolved.map((u) => `  - ${u}`),
                "",
                "Check that paths are correct relative to the Moodle root,",
                "or use component format (e.g. 'local_myplugin').",
              ].join("\n"),
            }],
            isError: true,
          };
        }

        modeDescription = `${pluginPaths.length} plugin(s) from list`;
      }

      // ------------------------------------------------------------------
      // Process plugins sequentially
      // ------------------------------------------------------------------
      const total   = pluginPaths.length;
      const results: BatchPluginResult[] = [];

      const headerLines = [
        `Processing ${total} ${modeDescription}${force ? " (cache bypassed)" : ""}...`,
        "",
      ];

      // dev mode always marks; all/list modes respect the mark_as_dev flag
      const shouldMarkAsDev = mode === "dev" || mark_as_dev;

      // Stream-friendly: build result list as we go
      for (const pluginPath of pluginPaths.sort()) {
        const result = await processPlugin(pluginPath, moodlePath, force, shouldMarkAsDev);
        results.push(result);
      }

      // ------------------------------------------------------------------
      // Update global AI index to include any new plugins
      // ------------------------------------------------------------------
      await generateAiIndex(moodlePath, moodleVersion);

      // ------------------------------------------------------------------
      // Build response
      // ------------------------------------------------------------------
      const succeeded = results.filter((r) => r.failed === 0);
      const failed    = results.filter((r) => r.failed > 0 || r.error);
      const allSkipped = results.filter((r) => r.generated === 0 && r.skipped > 0 && r.failed === 0);
      const generated  = results.filter((r) => r.generated > 0 && r.failed === 0);

      const lines: string[] = [
        ...headerLines,
        "## Results",
        "",
        `Total plugins:     ${total}`,
        `Fully regenerated: ${generated.length}`,
        `Cached (skipped):  ${allSkipped.length}`,
        `Failed:            ${failed.length}`,
        "",
      ];

      // Per-plugin detail
      if (generated.length > 0) {
        lines.push("### Regenerated", "");
        for (const r of generated) {
          lines.push(`  ✔ \`${r.component}\` — ${r.generated} files regenerated, ${r.skipped} cached`);
        }
        lines.push("");
      }

      if (allSkipped.length > 0) {
        lines.push("### Cached (no changes detected)", "");
        for (const r of allSkipped) {
          lines.push(`  ─ \`${r.component}\` — ${r.skipped} files up to date`);
        }
        lines.push("");
      }

      if (failed.length > 0) {
        lines.push("### Failed", "");
        for (const r of failed) {
          const detail = r.error ? `: ${r.error}` : ` (${r.failed} file(s) failed)`;
          lines.push(`  ✖ \`${r.component}\`${detail}`);
        }
        lines.push("");
      }

      // Cache stats
      const cacheStats = globalCache.getStats();
      lines.push(
        "---",
        "",
        `Cache — hits: ${cacheStats.hits}, misses: ${cacheStats.misses}, skips: ${cacheStats.skips}`,
      );

      if ((mode === "all" || mode === "list") && succeeded.length > 0) {
        if (mark_as_dev) {
          lines.push(
            "",
            `Marked ${succeeded.length} plugin(s) with .moodle-mcp-dev for automatic watch ` +
            `and future 'dev' mode runs.`
          );
        } else {
          lines.push(
            "",
            `Tip: pass \`mark_as_dev: true\` to mark these ${succeeded.length} plugin(s) for ` +
            `automatic watch and future 'dev' mode runs.`
          );
        }
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );
}
