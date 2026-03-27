/**
 * @file tools/plugin.ts
 * @description MCP tool: generate_plugin_context
 *
 * Generates a complete AI context package for a single Moodle plugin.
 * The plugin path can be provided either as a relative path from the
 * Moodle root (e.g. "local/myplugin") or as an absolute path.
 *
 * Depends on: init_moodle_context having been run first.
 *
 * MCP Tool name: generate_plugin_context
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync } from "fs";
import { join, isAbsolute } from "path";
import { z } from "zod";

import { loadConfig }              from "../config.js";
import { generateAllForPlugin }    from "../generators/plugin.js";
import { generateAiIndex }         from "../generators/moodle.js";
import { detectPlugin }            from "../extractors/plugin.js";

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers the generate_plugin_context tool on the MCP server.
 */
export function registerPluginTool(server: McpServer): void {
  server.tool(
    "generate_plugin_context",

    "Generates a complete AI context package for a specific Moodle plugin. " +
    "Produces PLUGIN_AI_CONTEXT.md, PLUGIN_STRUCTURE.md, PLUGIN_DB_TABLES.md, " +
    "PLUGIN_EVENTS.md, PLUGIN_DEPENDENCIES.md, PLUGIN_ARCHITECTURE.md, " +
    "PLUGIN_FUNCTION_INDEX.md, PLUGIN_CALLBACK_INDEX.md, PLUGIN_ENDPOINT_INDEX.md, " +
    "and PLUGIN_RUNTIME_FLOW.md inside the plugin directory. " +
    "Requires init_moodle_context to have been run first.",

    {
      plugin_path: z
        .string()
        .describe(
          "Plugin path — either relative to the Moodle root (e.g. 'local/myplugin') " +
          "or an absolute path (e.g. '/var/www/moodle/local/myplugin')"
        ),
    },

    async ({ plugin_path }) => {
      // ------------------------------------------------------------------
      // Load config
      // ------------------------------------------------------------------
      const config = loadConfig();

      if (!config) {
        return {
          content: [
            {
              type: "text" as const,
              text: "❌ moodle-mcp is not initialized. Run `init_moodle_context` first.",
            },
          ],
          isError: true,
        };
      }

      const { moodlePath, moodleVersion } = config;

      // ------------------------------------------------------------------
      // Resolve plugin path
      // ------------------------------------------------------------------
      const fullPluginPath = isAbsolute(plugin_path)
        ? plugin_path
        : join(moodlePath, plugin_path);

      if (!existsSync(fullPluginPath)) {
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `❌ Plugin directory not found: ${fullPluginPath}`,
                "",
                "Check that the path is correct relative to the Moodle root.",
                `Moodle root: ${moodlePath}`,
              ].join("\n"),
            },
          ],
          isError: true,
        };
      }

      // ------------------------------------------------------------------
      // Validate it's a plugin (has version.php)
      // ------------------------------------------------------------------
      if (!existsSync(join(fullPluginPath, "version.php"))) {
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `❌ ${fullPluginPath} does not appear to be a Moodle plugin.`,
                "",
                "A plugin must have a version.php file at its root.",
              ].join("\n"),
            },
          ],
          isError: true,
        };
      }

      // ------------------------------------------------------------------
      // Detect plugin info for early feedback
      // ------------------------------------------------------------------
      let pluginInfo;
      try {
        pluginInfo = detectPlugin(fullPluginPath);
      } catch (e) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Failed to detect plugin: ${String(e)}`,
            },
          ],
          isError: true,
        };
      }

      // ------------------------------------------------------------------
      // Generate all plugin context files
      // ------------------------------------------------------------------
      const result = await generateAllForPlugin(fullPluginPath, moodlePath);

      // ------------------------------------------------------------------
      // Update global AI index to include new plugin
      // ------------------------------------------------------------------
      await generateAiIndex(moodlePath, moodleVersion);

      // ------------------------------------------------------------------
      // Build response
      // ------------------------------------------------------------------
      const succeeded = result.files.filter((f) => f.success);
      const failed    = result.files.filter((f) => !f.success);

      const lines: string[] = [
        `✅ Plugin context generated for \`${result.plugin}\``,
        "",
        `Plugin:  ${pluginInfo.displayName || pluginInfo.name}`,
        `Type:    ${pluginInfo.type}`,
        `Version: ${pluginInfo.version}`,
        `Path:    ${fullPluginPath}`,
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
      for (const f of succeeded) {
        const rel = f.file.replace(fullPluginPath + "/", "");
        lines.push(`  ✔ ${rel}`);
      }

      lines.push("");
      lines.push("Primary context file:");
      lines.push(`  ${fullPluginPath}/PLUGIN_AI_CONTEXT.md`);

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );
}
