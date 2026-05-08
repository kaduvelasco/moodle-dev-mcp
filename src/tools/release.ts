/**
 * @file tools/release.ts
 * @description MCP tool: release_plugin
 *
 * Packages a Moodle plugin into a versioned ZIP file ready for distribution.
 * The ZIP is named {component}_{version}.zip (e.g. local_caedauth_2026041000.zip)
 * and contains a single root folder named after the plugin directory (e.g. caedauth/).
 * Empty directories are not included in the ZIP.
 *
 * Files and directories excluded from the ZIP (kept in the project):
 *   - moodle-dev-mcp generated docs: PLUGIN_*.md
 *   - AI assistant context files: CLAUDE.md, GEMINI.md, AGENTS.md
 *   - AI tool config files: .claudeignore, .geminiignore, .aiexclude
 *   - Development marker: .moodle-mcp-dev
 *   - Dependencies: node_modules
 */

import { McpServer }                                          from "@modelcontextprotocol/sdk/server/mcp.js";
import { createWriteStream, existsSync, readdirSync, statSync } from "fs";
import { basename, join, relative, resolve }                  from "path";
import { z }                                                  from "zod";
import archiver                                               from "archiver";

import { loadConfig }     from "../config.js";
import { detectPlugin }   from "../extractors/plugin.js";
import { resolvePluginPath } from "../utils/plugin-types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXCLUDED_NAMES = new Set([
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
  // AI tool config files
  ".claudeignore",
  ".geminiignore",
  ".aiexclude",
  // Development marker
  ".moodle-mcp-dev",
  // Dependencies
  "node_modules",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively collects file paths, skipping excluded names and empty directories.
 */
function collectFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: string[];

  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (EXCLUDED_NAMES.has(entry)) continue;

    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      const subFiles = collectFiles(fullPath);
      // Empty directories are skipped — only pushed if they contain files
      results.push(...subFiles);
    } else if (stat.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

function createZip(pluginPath: string, outputPath: string, folderName: string): Promise<void> {
  return new Promise((res, rej) => {
    const files   = collectFiles(pluginPath);
    const output  = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => res());
    archive.on("error", (err) => rej(err));
    archive.pipe(output);

    for (const filePath of files) {
      const relPath = relative(pluginPath, filePath);
      archive.file(filePath, { name: join(folderName, relPath) });
    }

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
    "and contains a single root folder named after the plugin directory (e.g. caedauth/). " +
    "Empty directories are excluded from the ZIP. " +
    "Also excludes: moodle-dev-mcp generated files (PLUGIN_*.md), AI context files " +
    "(CLAUDE.md, GEMINI.md, AGENTS.md), AI tool config files (.claudeignore, " +
    ".geminiignore, .aiexclude), development markers (.moodle-mcp-dev), " +
    "and dependencies (node_modules). " +
    "The version is read from the plugin's version.php ($plugin->version). " +
    "Triggers: 'Gere uma versão desse plugin', 'Publique este plugin', 'release plugin'.",

    {
      component: z
        .string()
        .describe(
          "Moodle plugin component in the format {type}_{name} — e.g. 'local_caedauth'. " +
          "This is required. If you do not know the component, ask the user for it."
        ),
      outputDir: z
        .string()
        .optional()
        .describe(
          "Directory where the ZIP file will be saved. Defaults to the current working directory."
        ),
    },

    async ({ component, outputDir }) => {
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
      // Validate outputDir if provided
      // ------------------------------------------------------------------
      if (outputDir && !existsSync(resolve(outputDir))) {
        return {
          content: [{
            type: "text" as const,
            text: `❌ Output directory does not exist: ${resolve(outputDir)}`,
          }],
          isError: true,
        };
      }

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
      const folderName  = basename(pluginPath);
      const zipName     = `${component}_${plugin.version}.zip`;
      const destination = resolve(outputDir ?? process.cwd(), zipName);

      // ------------------------------------------------------------------
      // Create ZIP
      // ------------------------------------------------------------------
      try {
        await createZip(pluginPath, destination, folderName);
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
      // Report excluded files that actually exist in the plugin
      // ------------------------------------------------------------------
      const excluded = [...EXCLUDED_NAMES].filter((f) =>
        existsSync(join(pluginPath, f))
      );

      const lines: string[] = [
        `✅ Plugin packaged successfully: ${zipName}`,
        "",
        `Component:  ${component}`,
        `Version:    ${plugin.version}`,
        `ZIP folder: ${folderName}/`,
        `Output:     ${destination}`,
        `Source:     ${pluginPath}`,
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
