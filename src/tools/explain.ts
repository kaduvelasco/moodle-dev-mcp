/**
 * @file tools/explain.ts
 * @description MCP tool: explain_plugin
 *
 * Provides a structured explanation of a Moodle plugin's architecture,
 * combining data from generated context files with live extraction
 * when context files are not available.
 *
 * The explanation covers:
 *   - Plugin metadata (component, type, version)
 *   - Architecture overview (class structure)
 *   - Runtime flow (entry points, events, tasks)
 *   - Database schema summary
 *   - Web services and endpoints
 *   - Hook callbacks
 *
 * This tool is optimised for feeding context to an AI assistant that
 * is about to work on the plugin — it produces a compact but complete
 * summary rather than the full verbose index files.
 *
 * MCP Tool name: explain_plugin
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";

import { loadConfig }                from "../config.js";
import { detectPlugin }              from "../extractors/plugin.js";
import { extractPluginSchema }       from "../extractors/schema.js";
import { extractPluginEvents }       from "../extractors/events.js";
import { extractPluginTasks, formatCronSchedule } from "../extractors/tasks.js";
import { extractPluginServices }     from "../extractors/services.js";
import { extractPluginCapabilities } from "../extractors/capabilities.js";
import { extractPluginClasses }      from "../extractors/classes.js";
import { resolvePluginPath } from "../utils/plugin-types.js";

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers the explain_plugin tool on the MCP server.
 */
export function registerExplainTool(server: McpServer): void {
  server.tool(
    "explain_plugin",

    "Returns a structured explanation of a Moodle plugin's architecture. " +
    "If AI context files exist (from generate_plugin_context), uses those. " +
    "Otherwise, performs live extraction from the plugin source files. " +
    "Ideal for loading plugin context before starting development work.",

    {
      plugin: z
        .string()
        .describe(
          "Plugin component (e.g. 'local_myplugin'), path relative to Moodle root " +
          "(e.g. 'local/myplugin'), or absolute path"
        ),

      section: z
        .enum(["all", "overview", "database", "events", "classes", "services", "flow"])
        .optional()
        .default("all")
        .describe(
          "Which section to return. 'all' returns the complete explanation. " +
          "Use specific sections to reduce context size when focusing on one area."
        ),
    },

    async ({ plugin, section }) => {
      // ------------------------------------------------------------------
      // Load config
      // ------------------------------------------------------------------
      const config = loadConfig();

      if (!config) {
        return {
          content: [{ type: "text" as const, text: "❌ Run `init_moodle_context` first." }],
          isError: true,
        };
      }

      const { moodlePath } = config;

      // ------------------------------------------------------------------
      // Resolve plugin path
      // ------------------------------------------------------------------
      const pluginPath = resolvePluginPath(plugin, moodlePath) ?? join(moodlePath, plugin);

      if (!existsSync(pluginPath)) {
        return {
          content: [{ type: "text" as const, text: `❌ Plugin not found: ${pluginPath}` }],
          isError: true,
        };
      }

      // ------------------------------------------------------------------
      // If full AI context file exists and section is "all", return it
      // ------------------------------------------------------------------
      const aiContextFile = join(pluginPath, "PLUGIN_AI_CONTEXT.md");
      if (section === "all" && existsSync(aiContextFile)) {
        const content = readFileSync(aiContextFile, "utf-8");
        return { content: [{ type: "text" as const, text: content }] };
      }

      // ------------------------------------------------------------------
      // Live extraction
      // ------------------------------------------------------------------
      let info;
      try {
        info = detectPlugin(pluginPath);
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `❌ Cannot read plugin: ${String(e)}` }],
          isError: true,
        };
      }

      const lines: string[] = [];

      // ------------------------------------------------------------------
      // Overview
      // ------------------------------------------------------------------
      if (section === "all" || section === "overview") {
        lines.push(`# Plugin: ${info.component}`);
        lines.push("");
        lines.push(`| Property | Value |`);
        lines.push(`|----------|-------|`);
        lines.push(`| Component    | \`${info.component}\` |`);
        lines.push(`| Type         | ${info.type} |`);
        lines.push(`| Display Name | ${info.displayName || info.name} |`);
        lines.push(`| Version      | ${info.version} |`);
        lines.push(`| Requires     | ${info.requires} |`);
        lines.push(`| Maturity     | ${info.maturity} |`);
        lines.push(`| Path         | \`${info.path}\` |`);
        lines.push("");

        // Key files
        const keyFiles = [
          ["version.php", "Plugin metadata"],
          ["lib.php",     "Hook callbacks"],
          ["settings.php","Admin settings"],
          ["db/install.xml", "DB tables"],
          ["db/access.php",  "Capabilities"],
          ["db/events.php",  "Event observers"],
          ["db/tasks.php",   "Scheduled tasks"],
          ["db/services.php","Web services"],
        ];

        const presentFiles = keyFiles.filter(([f]) => existsSync(join(pluginPath, f)));
        if (presentFiles.length > 0) {
          lines.push("**Key files present:**");
          for (const [f, desc] of presentFiles) {
            lines.push(`- \`${f}\` — ${desc}`);
          }
          lines.push("");
        }

        if (section === "overview") {
          return { content: [{ type: "text" as const, text: lines.join("\n") }] };
        }

        lines.push("---");
        lines.push("");
      }

      // ------------------------------------------------------------------
      // Database
      // ------------------------------------------------------------------
      if (section === "all" || section === "database") {
        lines.push("## Database Tables");
        lines.push("");

        const schema = extractPluginSchema(pluginPath);
        if (!schema || schema.tables.length === 0) {
          lines.push("_No database tables defined._");
        } else {
          lines.push("| Table | Fields | Keys |");
          lines.push("|-------|--------|------|");
          for (const t of schema.tables) {
            lines.push(`| \`${t.name}\` | ${t.fields.length} | ${t.keys.length} |`);
          }
        }
        lines.push("");

        if (section === "database") {
          return { content: [{ type: "text" as const, text: lines.join("\n") }] };
        }

        lines.push("---");
        lines.push("");
      }

      // ------------------------------------------------------------------
      // Classes
      // ------------------------------------------------------------------
      if (section === "all" || section === "classes") {
        lines.push("## Classes");
        lines.push("");

        const classes = await extractPluginClasses(pluginPath);
        if (classes.classes.length === 0) {
          lines.push("_No autoloaded classes found._");
        } else {
          lines.push("| FQN | Kind | Extends |");
          lines.push("|-----|------|---------|");
          for (const cls of classes.classes) {
            lines.push(`| \`${cls.fqn}\` | ${cls.kind} | ${cls.extends ? `\`${cls.extends}\`` : ""} |`);
          }
        }
        lines.push("");

        if (section === "classes") {
          return { content: [{ type: "text" as const, text: lines.join("\n") }] };
        }

        lines.push("---");
        lines.push("");
      }

      // ------------------------------------------------------------------
      // Events
      // ------------------------------------------------------------------
      if (section === "all" || section === "events") {
        lines.push("## Event Observers");
        lines.push("");

        const events = extractPluginEvents(pluginPath);
        if (!events || events.observers.length === 0) {
          lines.push("_No event observers registered._");
        } else {
          for (const obs of events.observers) {
            lines.push(`- \`${obs.eventname}\` → \`${obs.callback}\``);
          }
        }
        lines.push("");

        if (section === "events") {
          return { content: [{ type: "text" as const, text: lines.join("\n") }] };
        }

        lines.push("---");
        lines.push("");
      }

      // ------------------------------------------------------------------
      // Services
      // ------------------------------------------------------------------
      if (section === "all" || section === "services") {
        lines.push("## Web Services");
        lines.push("");

        const services = extractPluginServices(pluginPath);
        if (!services || services.functions.length === 0) {
          lines.push("_No web services defined._");
        } else {
          lines.push("| Function | Type | AJAX |");
          lines.push("|----------|------|------|");
          for (const fn of services.functions) {
            lines.push(`| \`${fn.name}\` | ${fn.type} | ${fn.ajax ? "✔" : ""} |`);
          }
        }
        lines.push("");

        const caps = extractPluginCapabilities(pluginPath);
        if (caps && caps.capabilities.length > 0) {
          lines.push("## Capabilities");
          lines.push("");
          for (const cap of caps.capabilities) {
            lines.push(`- \`${cap.name}\` (${cap.captype})`);
          }
          lines.push("");
        }

        if (section === "services") {
          return { content: [{ type: "text" as const, text: lines.join("\n") }] };
        }

        lines.push("---");
        lines.push("");
      }

      // ------------------------------------------------------------------
      // Runtime flow
      // ------------------------------------------------------------------
      if (section === "all" || section === "flow") {
        lines.push("## Runtime Flow");
        lines.push("");

        const entryPoints = ["index.php", "view.php", "edit.php", "manage.php", "ajax.php"];
        const found = entryPoints.filter((f) => existsSync(join(pluginPath, f)));

        if (found.length > 0) {
          lines.push("**Entry points:**");
          for (const f of found) lines.push(`- \`${f}\``);
          lines.push("");
        }

        const tasks = extractPluginTasks(pluginPath);
        if (tasks && tasks.tasks.length > 0) {
          lines.push("**Scheduled tasks:**");
          for (const t of tasks.tasks) {
            lines.push(`- \`${t.classname}\` — \`${formatCronSchedule(t)}\``);
          }
          lines.push("");
        }

        if (section === "flow") {
          return { content: [{ type: "text" as const, text: lines.join("\n") }] };
        }
      }

      // ------------------------------------------------------------------
      // Footer hint
      // ------------------------------------------------------------------
      if (section === "all") {
        lines.push("---");
        lines.push("");
        lines.push(
          "_Run `generate_plugin_context` to generate persistent context files for this plugin._"
        );
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );
}
