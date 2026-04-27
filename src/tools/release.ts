/**
 * @file tools/release.ts
 * @description MCP tool: release_plugin
 *
 * Packages a Moodle plugin into a versioned ZIP file ready for distribution.
 * The ZIP is named {component}_{version}.zip (e.g. local_caedauth_2026041000.zip)
 * and saved to the current working directory.
 *
 * Files excluded from the ZIP (but kept in the project):
 *   - moodle-dev-mcp generated docs: PLUGIN_*.md
 *   - AI assistant context files: CLAUDE.md, GEMINI.md, AGENTS.md
 *   - Development marker: .moodle-mcp-dev
 */

import { McpServer }             from "@modelcontextprotocol/sdk/server/mcp.js";
import { createWriteStream, existsSync } from "fs";
import { join, resolve }         from "path";
import { z }                     from "zod";
import archiver                  from "archiver";

import { loadConfig }            from "../config.js";
import { detectPlugin }          from "../extractors/plugin.js";
import { resolvePluginPath }     from "../utils/plugin-types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXCLUDED_FILES = new Set([
  // moodle-dev-mcp generated context docs
  "PLUGIN_AI_CONTEXT.md",
  "PLUGIN_ARCHITECTURE.md",
  "PLUGIN_CALLBACK_INDEX.md",
  "PLUGIN_CONTEXT.md",
  "PLUGIN_DB_TABLES.md",
  "PLUGIN_DEPENDENCIES.md",
  "PLUGIN_ENDPOINT_INDEX.md",
  "PLUGIN_EVENTS.md",
  "PLUGIN_FUNCTION_INDEX.md",
  "PLUGIN_RUNTIME_FLOW.md",
  "PLUGIN_STRUCTURE.md",
  // AI assistant files
  "CLAUDE.md",
  "GEMINI.md",
  "AGENTS.md",
  // Development marker
  ".moodle-mcp-dev",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createZip(pluginPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output  = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

    archive.pipe(output);

    archive.glob("**/*", {
      cwd:  pluginPath,
      dot:  true,
      ignore: [...EXCLUDED_FILES, "**/node_modules/**"],
    });

    archive.finalize();
  });
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerReleaseTool(server: McpServer): void {
  server.tool(
    "release_plugin",

    "Packages a Moodle plugin into a versioned ZIP file ready for distribution. " +
    "The ZIP is named {component}_{version}.zip (e.g. local_caedauth_2026041000.zip) " +
    "and is saved to the current working directory. " +
    "Excludes moodle-dev-mcp generated files (PLUGIN_*.md), AI context files " +
    "(CLAUDE.md, GEMINI.md, AGENTS.md), and the .moodle-mcp-dev marker. " +
    "The version is read from the plugin's version.php ($plugin->version). " +
    "Triggers: 'Gere uma versão desse plugin', 'Publique este plugin', 'release plugin'.",

    {
      component: z
        .string()
        .describe(
          "Moodle plugin component in the format {type}_{name} — e.g. 'local_caedauth'. " +
          "This is required. If you do not know the component, ask the user for it."
        ),
    },

    async ({ component }) => {
      // ------------------------------------------------------------------
      // Validate component format
      // ------------------------------------------------------------------
      if (!component || !component.includes("_")) {
        return {
          content: [{
            type: "text" as const,
            text: [
              "❌ Component is required and must be in the format {type}_{name}.",
              "",
              "Examples: local_caedauth, mod_quiz, block_myblock",
              "",
              "Please provide the plugin component and try again.",
            ].join("\n"),
          }],
          isError: true,
        };
      }

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

      const { moodlePath } = config;

      // ------------------------------------------------------------------
      // Resolve plugin path from component
      // ------------------------------------------------------------------
      const pluginPath = resolvePluginPath(component, moodlePath);

      if (!pluginPath) {
        return {
          content: [{
            type: "text" as const,
            text: [
              `❌ Plugin not found for component: ${component}`,
              "",
              `Moodle root: ${moodlePath}`,
              "",
              "Check that the component format is correct (e.g. local_myplugin)",
              "and that the plugin directory exists.",
            ].join("\n"),
          }],
          isError: true,
        };
      }

      // ------------------------------------------------------------------
      // Detect plugin metadata (reads version.php)
      // ------------------------------------------------------------------
      let plugin;
      try {
        plugin = detectPlugin(pluginPath);
      } catch (e) {
        return {
          content: [{
            type: "text" as const,
            text: `❌ Failed to read plugin metadata: ${String(e)}`,
          }],
          isError: true,
        };
      }

      if (!plugin.version) {
        return {
          content: [{
            type: "text" as const,
            text: [
              `❌ Could not read version from ${pluginPath}/version.php`,
              "",
              "Ensure the file contains: $plugin->version = XXXXXXXXXX;",
            ].join("\n"),
          }],
          isError: true,
        };
      }

      // ------------------------------------------------------------------
      // Build output path
      // ------------------------------------------------------------------
      const zipName   = `${component}_${plugin.version}.zip`;
      const outputPath = resolve(process.cwd(), zipName);

      // ------------------------------------------------------------------
      // Create ZIP
      // ------------------------------------------------------------------
      try {
        await createZip(pluginPath, outputPath);
      } catch (e) {
        return {
          content: [{
            type: "text" as const,
            text: `❌ Failed to create ZIP: ${String(e)}`,
          }],
          isError: true,
        };
      }

      // ------------------------------------------------------------------
      // Confirm excluded files that actually exist in the plugin
      // ------------------------------------------------------------------
      const excluded = [...EXCLUDED_FILES].filter((f) =>
        existsSync(join(pluginPath, f))
      );

      const lines: string[] = [
        `✅ Plugin packaged successfully: ${zipName}`,
        "",
        `Component: ${component}`,
        `Version:   ${plugin.version}`,
        `Output:    ${outputPath}`,
        `Source:    ${pluginPath}`,
      ];

      if (excluded.length > 0) {
        lines.push("", "Excluded from ZIP (kept in project):");
        for (const f of excluded) {
          lines.push(`  ✖ ${f}`);
        }
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );
}
