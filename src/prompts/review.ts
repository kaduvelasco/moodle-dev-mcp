/**
 * @file prompts/review.ts
 * @description MCP Prompt: review_plugin
 *
 * Improvements over initial version:
 *   - Few-shot example (user/assistant pair) showing expected review format
 *   - All messages in English
 */

import { McpServer }                from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync, readFileSync } from "fs";
import { resolvePluginPath }           from "../utils/plugin-types.js";
import { join }         from "path";
import { z }                        from "zod";
import { loadConfig }               from "../config.js";
import { detectPlugin }             from "../extractors/plugin.js";

type ReviewFocus = "all" | "security" | "performance" | "standards" | "database" | "apis";

function readFileIfExists(filePath: string): string {
  if (!existsSync(filePath)) return "";
  return readFileSync(filePath, "utf-8");
}

function getFocusCriteria(focus: ReviewFocus): string[] {
  const criteria: Record<Exclude<ReviewFocus, "all">, string[]> = {
    security: [
      "**Authentication & Authorization**",
      "- Is `require_login()` called on every page requiring a logged-in user?",
      "- Are capabilities checked with `require_capability()` before sensitive operations?",
      "",
      "**Input Validation**",
      "- Are all inputs validated with `required_param()` / `optional_param()` and correct PARAM_ types?",
      "- Any direct `$_GET`, `$_POST`, or `$_REQUEST` access bypassing Moodle validation?",
      "- Is `sesskey` checked for all state-changing operations?",
      "",
      "**Output Escaping**",
      "- Is user-supplied output escaped with `s()`, `format_string()`, or `format_text()`?",
      "- Any raw `echo` with unescaped variables?",
      "- Are SQL values properly parameterised?",
    ],
    performance: [
      "**Database Queries**",
      "- Any N+1 query patterns (queries inside loops)?",
      "- Are `get_records()` calls fetching only needed columns?",
      "- Are large result sets paginated?",
      "- Is MUC (Moodle Universal Cache) used for expensive operations?",
      "",
      "**Memory & Tasks**",
      "- Are large files streamed rather than read into memory?",
      "- Do scheduled tasks handle timeouts for large datasets?",
    ],
    standards: [
      "**Naming Conventions**",
      "- Functions: snake_case, global functions prefixed with component name",
      "- Classes: PascalCase, namespace matches directory path under classes/",
      "- Constants: UPPER_CASE",
      "",
      "**Code Style**",
      "- 4-space indentation (no tabs)?",
      "- PHPDoc on all functions and classes?",
      "- `defined('MOODLE_INTERNAL') || die();` in all non-entry files?",
    ],
    database: [
      "**Schema**",
      "- Tables defined in db/install.xml using XMLDB format?",
      "- Appropriate column types and indexes?",
      "- Foreign key relationships defined in XML?",
      "",
      "**Queries**",
      "- Parameterised queries everywhere (no raw string interpolation)?",
      "- `MUST_EXIST` used where appropriate?",
      "- Transactions used for multi-step operations?",
      "",
      "**Upgrades**",
      "- db/upgrade.php present and version-gated correctly?",
      "- Plugin version in version.php matches latest upgrade step?",
    ],
    apis: [
      "**Moodle API Compliance**",
      "- Events using new event system (classes/event/*, triggered with ->trigger())?",
      "- Scheduled tasks extending core\\task\\scheduled_task?",
      "- Web services using external_function_parameters and external_value?",
      "",
      "**Hooks & Callbacks**",
      "- lib.php callbacks follow correct naming pattern?",
      "- Deprecated callbacks replaced with modern equivalents?",
      "",
      "**Output & Forms**",
      "- HTML output through renderers or Mustache templates?",
      "- Forms extending moodleform with is_cancelled() + get_data() pattern?",
    ],
  };

  if (focus === "all") {
    return [
      "## Security", ...criteria.security, "",
      "## Performance", ...criteria.performance, "",
      "## Standards", ...criteria.standards, "",
      "## Database", ...criteria.database, "",
      "## API Usage", ...criteria.apis,
    ];
  }

  return [`## ${focus.charAt(0).toUpperCase() + focus.slice(1)} Review`, ...criteria[focus]];
}

export function registerReviewPrompt(server: McpServer): void {
  server.prompt(
    "review_plugin",
    "Generates a thorough, Moodle-specific code review prompt. " +
    "Includes a few-shot example showing the expected review output format.",

    {
      plugin: z.string().describe("Plugin component (e.g. 'local_myplugin') or relative path"),
      focus: z.enum(["all","security","performance","standards","database","apis"]).optional().default("all"),
      files: z.string().optional().describe("Comma-separated list of specific files to review"),
    },

    async ({ plugin, focus, files }) => {
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

      const aiContext = readFileIfExists(join(pluginPath, "PLUGIN_AI_CONTEXT.md")).substring(0, 3000);
      const devRules  = moodlePath ? readFileIfExists(join(moodlePath, "MOODLE_DEV_RULES.md")).substring(0, 1500) : "";
      const fileList  = files ? files.split(",").map((f) => f.trim()).filter(Boolean) : [];

      // -----------------------------------------------------------------------
      // Few-shot: show the AI the expected review output format
      // -----------------------------------------------------------------------
      const fewShotUser = "Review this Moodle code snippet for security issues:\n```php\n$id = $_GET['id'];\n$record = $DB->get_record('mdl_course', ['id' => $id]);\necho $record->fullname;\n```";

      const fewShotAssistant = [
        "### Issue 1 — Unvalidated user input",
        "**Severity:** Critical",
        "**File:** (snippet)",
        "**Problem:** `$_GET['id']` bypasses Moodle's input validation. Any value can be injected.",
        "**Fix:**",
        "```php",
        "$id = required_param('id', PARAM_INT);",
        "```",
        "",
        "### Issue 2 — Missing authentication",
        "**Severity:** High",
        "**Problem:** No `require_login()` call before accessing course data.",
        "**Fix:** Add at the top of the script:",
        "```php",
        "require_login($course, true, $cm);",
        "```",
        "",
        "### Issue 3 — Unescaped output",
        "**Severity:** High",
        "**Problem:** `echo $record->fullname` outputs raw DB content — XSS risk.",
        "**Fix:**",
        "```php",
        "echo format_string($record->fullname);",
        "```",
      ].join("\n");

      // -----------------------------------------------------------------------
      // Main prompt
      // -----------------------------------------------------------------------
      const parts: string[] = [
        `# Code Review: ${component}`,
        "",
        `**Moodle:** ${moodleVersion}`,
        `**Plugin:** \`${component}\``,
        pluginType    ? `**Type:** ${pluginType}` : "",
        pluginVersion ? `**Version:** ${pluginVersion}` : "",
        `**Focus:** ${focus}`,
        "",
      ].filter(Boolean);

      if (aiContext) parts.push("## Plugin Context", "", aiContext, "", "---", "");
      if (devRules)  parts.push("## Standards Reference", "", devRules, "", "---", "");

      parts.push("## Review Criteria", "", ...getFocusCriteria(focus as ReviewFocus), "", "---", "", "## Instructions", "");

      if (fileList.length > 0) {
        parts.push(`Review these files from \`${component}\`:`);
        fileList.forEach((f) => parts.push(`- \`${f}\``));
      } else {
        parts.push(`Perform a complete review of \`${component}\`.`);
      }

      parts.push(
        "",
        "For each issue:",
        "1. `### Issue N — Short title`",
        "2. **Severity:** Critical / High / Medium / Low",
        "3. **File:** path (if known)",
        "4. **Problem:** what is wrong and why it matters in Moodle",
        "5. **Fix:** corrected code",
        "",
        "Group by severity, Critical first.",
        "End with a **Summary** of: overall assessment, top 3 priorities, any positive patterns.",
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
