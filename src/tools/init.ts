/**
 * @file tools/init.ts
 * @description MCP tool: init_moodle_context
 *
 * Initializes the AI context for a Moodle installation by:
 *   1. Validating the provided path is a valid Moodle installation
 *   2. Detecting the Moodle version from version.php
 *   3. Saving the configuration to .moodle-mcp
 *   4. Running all global generators (indexes, guides, workspace)
 *
 * This is the first tool a user should call. All other tools depend
 * on the configuration written by this one.
 *
 * MCP Tool name: init_moodle_context
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync } from "fs";
import { join } from "path";
import { z } from "zod";

import { saveConfig, loadConfig }  from "../config.js";
import { generateAll }             from "../generators/moodle.js";
import { detectMoodleVersionFromPath } from "../extractors/moodle-detect.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates that a path looks like a Moodle installation root.
 * Checks for version.php and the lib/ directory.
 */
function validateMoodlePath(moodlePath: string): { valid: boolean; reason?: string } {
  if (!existsSync(moodlePath)) {
    return { valid: false, reason: `Directory not found: ${moodlePath}` };
  }

  if (!existsSync(join(moodlePath, "version.php"))) {
    return { valid: false, reason: `version.php not found in ${moodlePath} — is this a Moodle root?` };
  }

  if (!existsSync(join(moodlePath, "lib"))) {
    return { valid: false, reason: `lib/ directory not found in ${moodlePath}` };
  }

  if (!existsSync(join(moodlePath, "config.php")) && !existsSync(join(moodlePath, "config-dist.php"))) {
    return { valid: false, reason: `config.php not found — this may not be a Moodle root` };
  }

  return { valid: true };
}


// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers the init_moodle_context tool on the MCP server.
 */
export function registerInitTool(server: McpServer): void {
  server.tool(
    "init_moodle_context",

    "Initializes AI context for a Moodle installation. " +
    "Validates the path, detects the version, saves configuration, and generates " +
    "all global index files (API index, events, tasks, services, DB tables, classes, " +
    "capabilities, plugin map, dev rules, workspace). " +
    "Run this first before using any other moodle-mcp tool.",

    {
      moodle_path: z
        .string()
        .describe("Absolute path to the Moodle installation root directory"),

      force: z
        .boolean()
        .optional()
        .default(false)
        .describe("Re-initialize even if configuration already exists"),
    },

    async ({ moodle_path, force }) => {
      // ------------------------------------------------------------------
      // Check if already initialized
      // ------------------------------------------------------------------
      const existing = loadConfig();

      if (existing && !force) {
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "⚠️  moodle-mcp is already initialized.",
                "",
                `Moodle path:    ${existing.moodlePath}`,
                `Moodle version: ${existing.moodleVersion}`,
                "",
                "Use `force: true` to re-initialize, or `update_indexes` to refresh indexes.",
              ].join("\n"),
            },
          ],
        };
      }

      // ------------------------------------------------------------------
      // Validate path
      // ------------------------------------------------------------------
      const validation = validateMoodlePath(moodle_path);

      if (!validation.valid) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Invalid Moodle path: ${validation.reason}`,
            },
          ],
          isError: true,
        };
      }

      // ------------------------------------------------------------------
      // Detect version
      // ------------------------------------------------------------------
      const moodleVersion = detectMoodleVersionFromPath(moodle_path) ?? "";

      // ------------------------------------------------------------------
      // Save configuration
      // ------------------------------------------------------------------
      saveConfig({ moodlePath: moodle_path, moodleVersion });

      // ------------------------------------------------------------------
      // Run all generators
      // ------------------------------------------------------------------
      const results = await generateAll(moodle_path, moodleVersion);

      const succeeded = results.filter((r) => r.success);
      const failed    = results.filter((r) => !r.success);

      const lines: string[] = [
        "✅ Moodle context initialized successfully!",
        "",
        `Moodle path:    ${moodle_path}`,
        `Moodle version: ${moodleVersion}`,
        "",
        `Files generated: ${succeeded.length}`,
      ];

      if (failed.length > 0) {
        lines.push(`Files failed:    ${failed.length}`);
        for (const f of failed) {
          lines.push(`  ✖ ${f.file}: ${f.error}`);
        }
      }

      lines.push("");
      lines.push("Generated files:");
      for (const r of succeeded) {
        const rel = r.file.replace(moodle_path + "/", "");
        lines.push(`  ✔ ${rel}`);
      }

      lines.push("");
      lines.push("Next steps:");
      lines.push("  • Run `generate_plugin_context` for each plugin you are developing");
      lines.push("  • Run `update_indexes` after making changes to your Moodle installation");
      lines.push("  • Use `search_plugins` to find plugins by name or component");

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );
}
