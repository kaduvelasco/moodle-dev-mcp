/**
 * @file prompts/debug.ts
 * @description MCP Prompt: debug_plugin
 *
 * Improvements over initial version:
 *   - Few-shot example (user/assistant pair) showing expected debug output
 *   - All messages in English
 */

import { McpServer }                from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync, readFileSync } from "fs";
import { resolvePluginPath }           from "../utils/plugin-types.js";
import { join }         from "path";
import { z }                        from "zod";
import { loadConfig }               from "../config.js";
import { detectPlugin }             from "../extractors/plugin.js";

function readFileIfExists(filePath: string): string {
  if (!existsSync(filePath)) return "";
  return readFileSync(filePath, "utf-8");
}

function getDebuggingTips(error: string): string[] {
  const lower = error.toLowerCase();
  const tips: string[] = [];

  if (lower.includes("capability") || lower.includes("access denied")) {
    tips.push("**Capability hints:**",
      "- Check `db/access.php` — capability defined with correct component prefix?",
      "- Verify `require_capability()` uses correct context level",
      "- Clear caches: `php admin/cli/purge_caches.php`");
  }

  if (lower.includes("table") || lower.includes("column") || lower.includes("sql")) {
    tips.push("**Database hints:**",
      "- Run `php admin/cli/upgrade.php` to check pending upgrades",
      "- Verify `db/install.xml` has correct XMLDB syntax",
      "- Check `$plugin->version` was incremented after schema changes");
  }

  if (lower.includes("class not found") || lower.includes("autoload") || lower.includes("namespace")) {
    tips.push("**Autoloading hints:**",
      "- Namespace must match path: `classes/output/renderer.php` → `namespace component\\output;`",
      "- Clear caches: `php admin/cli/purge_caches.php`");
  }

  if (lower.includes("event") || lower.includes("observer")) {
    tips.push("**Event hints:**",
      "- Check `db/events.php` — `eventname` must be a fully-qualified class name",
      "- Clear caches after modifying `db/events.php`");
  }

  if (lower.includes("task") || lower.includes("cron")) {
    tips.push("**Task hints:**",
      "- Verify task class extends `\\core\\task\\scheduled_task`",
      "- Run manually: `php admin/tool/task/cli/schedule_task.php --execute=\\\\component\\\\task\\\\my_task`");
  }

  if (lower.includes("web service") || lower.includes("external") || lower.includes("ajax")) {
    tips.push("**Web service hints:**",
      "- Verify function registered in `db/services.php`",
      "- Check external class implements `execute_parameters()` and `execute_returns()`",
      "- Enable Moodle debugging to see full AJAX error response");
  }

  if (tips.length === 0) {
    tips.push("**General hints:**",
      "- Enable debugging: Admin → Development → Debugging → DEVELOPER",
      "- Check PHP error log and Moodle log (Admin → Reports → Logs)",
      "- Clear all caches: `php admin/cli/purge_caches.php`");
  }

  return tips;
}

export function registerDebugPrompt(server: McpServer): void {
  server.prompt(
    "debug_plugin",
    "Generates a debugging prompt with full plugin context and targeted Moodle hints. " +
    "Includes a few-shot example showing the expected diagnosis format.",

    {
      plugin: z.string().describe("Plugin component or path"),
      error:  z.string().describe("The full error message or stack trace"),
      context: z.string().optional().describe("When/how the error occurs"),
    },

    async ({ plugin, error, context }) => {
      const config        = loadConfig();
      const moodlePath    = config?.moodlePath    ?? "";
      const moodleVersion = config?.moodleVersion ?? "unknown";

      const pluginPath = (moodlePath ? resolvePluginPath(plugin, moodlePath) : null) ?? plugin;

      let component     = plugin;
      let pluginType    = "";
      let pluginVersion = "";

      if (existsSync(pluginPath)) {
        try {
          const info = detectPlugin(pluginPath);
          component    = info.component;
          pluginType   = info.type;
          pluginVersion = info.version;
        } catch { /* continue */ }
      }

      const aiContext    = readFileIfExists(join(pluginPath, "PLUGIN_AI_CONTEXT.md")).substring(0, 3000);
      const runtimeFlow  = readFileIfExists(join(pluginPath, "PLUGIN_RUNTIME_FLOW.md")).substring(0, 2000);
      const dbTables     = readFileIfExists(join(pluginPath, "PLUGIN_DB_TABLES.md")).substring(0, 1500);
      const debugTips    = getDebuggingTips(error);

      // -----------------------------------------------------------------------
      // Few-shot: show the AI the expected diagnosis format
      // -----------------------------------------------------------------------
      const fewShotUser = [
        "Debug this Moodle error in local_attendance:",
        "```",
        "Error: Call to a member function get_name() on null",
        "in /var/www/moodle/local/attendance/classes/task/send_reminders.php line 42",
        "```",
      ].join("\n");

      const fewShotAssistant = [
        "## Root Cause",
        "",
        "The scheduled task is calling `get_name()` on a null object at line 42. " +
        "In Moodle tasks, this typically means a `$course` or `$user` record was not found via `$DB->get_record()` " +
        "and the code proceeded without checking for null.",
        "",
        "## Evidence",
        "",
        "- The error is in `classes/task/send_reminders.php` — a scheduled task class",
        "- `get_name()` is a method commonly called on `$course`, `$user`, or similar Moodle objects",
        "- Tasks run in the background without a user session, so `$USER` globals are not populated",
        "",
        "## Fix",
        "",
        "```php",
        "// Before (line ~40):",
        "$course = $DB->get_record('course', ['id' => $courseid]);",
        "echo $course->get_name(); // crashes if $course is null",
        "",
        "// After:",
        "$course = $DB->get_record('course', ['id' => $courseid]);",
        "if (!$course) {",
        "    mtrace(\"Course {$courseid} not found — skipping.\");",
        "    continue;",
        "}",
        "echo format_string($course->fullname);",
        "```",
        "",
        "## Prevention",
        "",
        "Always check the return value of `get_record()` in scheduled tasks. " +
        "Use `MUST_EXIST` when the record must be present, or check for null when it may be missing.",
      ].join("\n");

      // -----------------------------------------------------------------------
      // Main prompt
      // -----------------------------------------------------------------------
      const parts: string[] = [
        `# Debug Session: ${component}`,
        "",
        `**Plugin:** \`${component}\``,
        pluginType    ? `**Type:** ${pluginType}` : "",
        pluginVersion ? `**Version:** ${pluginVersion}` : "",
        `**Moodle:** ${moodleVersion}`,
        "",
        "---",
        "",
        "## Error",
        "",
        "```",
        error,
        "```",
        "",
      ].filter(Boolean);

      if (context) parts.push("## When It Occurs", "", context, "", "---", "");

      parts.push("## Moodle Debugging Hints", "", ...debugTips, "", "---", "");

      if (runtimeFlow) parts.push("## Plugin Runtime Flow", "", runtimeFlow, "", "---", "");
      if (dbTables)    parts.push("## Database Schema", "", dbTables, "", "---", "");
      if (aiContext)   parts.push("## Plugin Context", "", aiContext, "", "---", "");

      parts.push(
        "## Task",
        "",
        "Analyse the error in the context of this Moodle plugin and provide:",
        "",
        "### Root Cause",
        "_What is likely causing this error_",
        "",
        "### Evidence",
        "_Which parts of the plugin context support your diagnosis_",
        "",
        "### Fix",
        "_Exact code changes needed: file path + before/after_",
        "",
        "### Prevention",
        "_How to avoid this class of issue in future_",
        "",
        "Be specific to Moodle conventions — reference APIs, hooks, and patterns by name.",
      );

      return {
        messages: [
          { role: "user" as const,      content: { type: "text" as const, text: fewShotUser } },
          { role: "assistant" as const, content: { type: "text" as const, text: fewShotAssistant } },
          { role: "user" as const,      content: { type: "text" as const, text: parts.join("\n") } },
        ],
      };
    }
  );
}
