/**
 * @file prompts/scaffold.ts
 * @description MCP Prompt: scaffold_plugin
 *
 * Improvements over initial version:
 *   - Few-shot example added (user/assistant pair) showing expected output format
 *   - All messages in English
 */

import { McpServer }                from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync, readFileSync } from "fs";
import { PLUGIN_TYPE_TO_DIR } from "../utils/plugin-types.js";
import { join }                     from "path";
import { z }                        from "zod";
import { loadConfig }               from "../config.js";

function readContextFile(moodlePath: string, filename: string): string {
  const filePath = join(moodlePath, filename);
  if (!existsSync(filePath)) return "";
  return readFileSync(filePath, "utf-8");
}

function getTypeDirectory(type: string): string {
  const dir = PLUGIN_TYPE_TO_DIR[type] ?? type;
  return `${dir}/{name}`;
}

function getTypeNotes(type: string, component: string): string {
  const notes: Record<string, string> = {
    mod: [
      "Activity modules must implement in lib.php:",
      `  - ${component}_add_instance($data, $mform)`,
      `  - ${component}_update_instance($data, $mform)`,
      `  - ${component}_delete_instance($id)`,
      "Entry points: index.php (list all instances) and view.php (single instance).",
      "The $cm (course module) object is central to all operations.",
    ].join("\n"),
    local: [
      "Local plugins are the most flexible type — no mandatory entry points.",
      "Common uses: custom APIs, event listeners, scheduled tasks, admin tools.",
    ].join("\n"),
    block: [
      "Block plugins must extend block_base.",
      "Required methods: init(), get_content().",
      `Block class file must be at block_${component.split("_")[1]}.php in the plugin root.`,
    ].join("\n"),
    auth: [
      "Auth plugins must extend auth_plugin_base.",
      "Implement user_login($username, $password) at minimum.",
      "The plugin class file must be at auth.php in the plugin root.",
    ].join("\n"),
    tool: [
      "Admin tool plugins appear under Site Administration.",
      "index.php is the standard entry point.",
    ].join("\n"),
  };
  return notes[type] ?? `Follow standard Moodle conventions for ${type} plugins.`;
}

export function registerScaffoldPrompt(server: McpServer): void {
  server.prompt(
    "scaffold_plugin",
    "Generates a complete, context-rich prompt for scaffolding a new Moodle plugin. " +
    "Includes a few-shot example so the AI knows exactly what output format is expected.",

    {
      type: z.string().describe("Plugin type (local, mod, block, auth, tool, enrol, theme, report, format, filter, qtype)"),
      name: z.string().describe("Plugin name — lowercase, letters and underscores only"),
      description: z.string().describe("What the plugin does"),
      features: z.string().optional().describe(
        "Comma-separated features: database tables, scheduled tasks, web services, events, capabilities, settings"
      ),
    },

    async ({ type, name, description, features }) => {
      const config        = loadConfig();
      const moodleVersion = config?.moodleVersion ?? "unknown";
      const moodlePath    = config?.moodlePath    ?? "";
      const component     = `${type}_${name}`;
      const directory     = getTypeDirectory(type).replace("{name}", name);
      const typeNotes     = getTypeNotes(type, component);

      const devRules    = moodlePath ? readContextFile(moodlePath, "MOODLE_DEV_RULES.md").substring(0, 2000)   : "";
      const featureList = features ? features.split(",").map((f) => f.trim().toLowerCase()).filter(Boolean) : [];

      const hasDb           = featureList.some((f) => f.includes("database") || f.includes("table"));
      const hasTasks        = featureList.some((f) => f.includes("task"));
      const hasServices     = featureList.some((f) => f.includes("service") || f.includes("api"));
      const hasEvents       = featureList.some((f) => f.includes("event"));
      const hasCapabilities = featureList.some((f) => f.includes("capabilit") || f.includes("permission"));
      const hasSettings     = featureList.some((f) => f.includes("setting"));

      // -----------------------------------------------------------------------
      // Few-shot: show the AI what a perfect version.php looks like
      // -----------------------------------------------------------------------
      const fewShotUser = `Scaffold version.php for a local plugin called 'demo' targeting Moodle 4.3.`;

      const fewShotAssistant = [
        "## `local/demo/version.php`",
        "",
        "```php",
        "<?php",
        "// This file is part of Moodle - https://moodle.org/",
        "//",
        "// Moodle is free software: you can redistribute it and/or modify",
        "// it under the terms of the GNU General Public License as published by",
        "// the Free Software Foundation, either version 3 of the License, or",
        "// (at your option) any later version.",
        "",
        "defined('MOODLE_INTERNAL') || die();",
        "",
        "$plugin->component = 'local_demo';",
        "$plugin->version   = 2024010100;",
        "$plugin->requires  = 2023100900; // Moodle 4.3",
        "$plugin->maturity  = MATURITY_STABLE;",
        "$plugin->release   = '1.0.0';",
        "```",
        "",
        "> **Decision:** Used `MATURITY_STABLE` because this is a production scaffold.",
        "> Version `2024010100` follows the YYYYMMDDXX convention.",
      ].join("\n");

      // -----------------------------------------------------------------------
      // Main prompt
      // -----------------------------------------------------------------------
      const mainParts: string[] = [
        `# Scaffold: ${component}`,
        "",
        `- **Component:** \`${component}\``,
        `- **Type:** ${type}`,
        `- **Directory:** \`${directory}\``,
        `- **Moodle version:** ${moodleVersion}`,
        `- **Description:** ${description}`,
        "",
      ];

      if (featureList.length > 0) {
        mainParts.push("## Features to Implement", "");
        featureList.forEach((f) => mainParts.push(`- ${f}`));
        mainParts.push("");
      }

      mainParts.push("## Type-Specific Notes", "", typeNotes, "");

      if (devRules) {
        mainParts.push("## Moodle Coding Standards", "", devRules, "");
      } else {
        mainParts.push(
          "## Moodle Coding Standards", "",
          "- 4-space indentation, snake_case functions, PascalCase classes",
          "- Use `$DB` for all database operations",
          "- `require_login()` and `require_capability()` on every protected page",
          "- `required_param()` / `optional_param()` for all input",
          "- `defined('MOODLE_INTERNAL') || die();` in all non-entry files",
          "",
        );
      }

      mainParts.push("## Files to Generate", "", "Generate ALL files listed below with complete, working content.", "");
      mainParts.push("### Required");
      mainParts.push(`- \`${directory}/version.php\``);
      mainParts.push(`- \`${directory}/lang/en/${component}.php\``);

      if (type === "mod" || type === "local" || type === "block" || type === "tool") {
        mainParts.push(`- \`${directory}/lib.php\``);
      }
      if (hasDb)           mainParts.push(`- \`${directory}/db/install.xml\``, `- \`${directory}/db/upgrade.php\``);
      if (hasCapabilities) mainParts.push(`- \`${directory}/db/access.php\``);
      if (hasEvents)       mainParts.push(`- \`${directory}/db/events.php\``, `- \`${directory}/classes/event/something_happened.php\``);
      if (hasTasks)        mainParts.push(`- \`${directory}/db/tasks.php\``,  `- \`${directory}/classes/task/main_task.php\``);
      if (hasServices)     mainParts.push(`- \`${directory}/db/services.php\``, `- \`${directory}/classes/external/get_data.php\``);
      if (hasSettings)     mainParts.push(`- \`${directory}/settings.php\``);
      if (type === "mod")  mainParts.push(`- \`${directory}/index.php\``, `- \`${directory}/view.php\``);

      mainParts.push(
        "",
        "## Output Format",
        "",
        "For EACH file:",
        "1. `## path/to/file.php` heading",
        "2. Complete file content in a ```php code block",
        "3. One-line `> Decision:` note explaining any non-obvious choices",
        "",
        "Start with `version.php`. Proceed in dependency order.",
      );

      return {
        messages: [
          // Few-shot pair
          { role: "user" as const,      content: { type: "text" as const, text: fewShotUser } },
          { role: "assistant" as const, content: { type: "text" as const, text: fewShotAssistant } },
          // Actual request
          { role: "user" as const,      content: { type: "text" as const, text: mainParts.join("\n") } },
        ],
      };
    }
  );
}
