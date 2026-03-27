/**
 * @file tools/doctor.ts
 * @description MCP tool: doctor
 *
 * Performs a comprehensive diagnostic of the moodle-mcp environment:
 *   1. Checks system dependencies (node, php, ctags)
 *   2. Validates the Moodle installation path
 *   3. Verifies all expected index files exist and are recent
 *   4. Reports plugins marked as in development
 *   5. Checks that dev plugins have up-to-date AI context files
 *
 * Designed to help users troubleshoot configuration issues and
 * identify stale indexes that need to be regenerated.
 *
 * MCP Tool name: doctor
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync, statSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { glob } from "glob";

import { loadConfig, getConfigFilePath } from "../config.js";
import { globalCache }                  from "../cache.js";
import { isMoodleRoot }                  from "../extractors/moodle-detect.js";
import { detectPlugin }                  from "../extractors/plugin.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPECTED_GLOBAL_FILES = [
  "AI_CONTEXT.md",
  "MOODLE_AI_INDEX.md",
  "MOODLE_AI_WORKSPACE.md",
  "MOODLE_API_INDEX.md",
  "MOODLE_EVENTS_INDEX.md",
  "MOODLE_TASKS_INDEX.md",
  "MOODLE_SERVICES_INDEX.md",
  "MOODLE_DB_TABLES_INDEX.md",
  "MOODLE_CLASSES_INDEX.md",
  "MOODLE_CAPABILITIES_INDEX.md",
  "MOODLE_PLUGIN_INDEX.md",
  "MOODLE_DEV_RULES.md",
  "MOODLE_PLUGIN_GUIDE.md",
];

const EXPECTED_PLUGIN_FILES = [
  "PLUGIN_AI_CONTEXT.md",
  "PLUGIN_CONTEXT.md",
  "PLUGIN_STRUCTURE.md",
  "PLUGIN_DB_TABLES.md",
  "PLUGIN_EVENTS.md",
  "PLUGIN_DEPENDENCIES.md",
  "PLUGIN_ARCHITECTURE.md",
  "PLUGIN_FUNCTION_INDEX.md",
  "PLUGIN_CALLBACK_INDEX.md",
  "PLUGIN_ENDPOINT_INDEX.md",
  "PLUGIN_RUNTIME_FLOW.md",
];

const STALE_THRESHOLD_DAYS = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Checks if a command is available on the system PATH.
 */
function commandExists(cmd: string): boolean {
  try {
    // "command -v" is POSIX (Linux/macOS). On Windows use "where".
    const check = process.platform === "win32"
      ? `where ${cmd}`
      : `command -v ${cmd}`;
    execSync(check, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the age of a file in days, or null if it doesn't exist.
 */
function fileAgeDays(filePath: string): number | null {
  if (!existsSync(filePath)) return null;

  const stat  = statSync(filePath);
  const ageMs = Date.now() - stat.mtimeMs;
  return Math.floor(ageMs / (1000 * 60 * 60 * 24));
}

type CheckResult = { label: string; status: "ok" | "warn" | "fail"; detail?: string };

function ok(label: string, detail?: string):   CheckResult { return { label, status: "ok",   detail }; }
function warn(label: string, detail?: string): CheckResult { return { label, status: "warn", detail }; }
function fail(label: string, detail?: string): CheckResult { return { label, status: "fail", detail }; }

function formatCheck(c: CheckResult): string {
  const icon = c.status === "ok" ? "✔" : c.status === "warn" ? "⚠" : "✖";
  const detail = c.detail ? ` — ${c.detail}` : "";
  return `  ${icon} ${c.label}${detail}`;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers the doctor tool on the MCP server.
 */
export function registerDoctorTool(server: McpServer): void {
  server.tool(
    "doctor",

    "Runs a full diagnostic of the moodle-mcp environment. " +
    "Checks system dependencies, validates the Moodle installation, " +
    "verifies all index files exist and are up to date, and reports " +
    "the status of plugins marked as in development.",

    {},

    async () => {
      const lines: string[] = [
        "# moodle-mcp Doctor",
        "",
        `Run at: ${new Date().toISOString()}`,
        "",
      ];

      // --------------------------------------------------------------------
      // 1. System dependencies
      // --------------------------------------------------------------------
      lines.push("## System Dependencies");
      lines.push("");

      const deps = [
        { cmd: "node",  label: "Node.js",  required: true  },
        { cmd: "php",   label: "PHP",      required: false },
        { cmd: "ctags", label: "ctags",    required: false },
        { cmd: "git",   label: "git",      required: false },
      ];

      const depChecks: CheckResult[] = deps.map(({ cmd, label, required }) => {
        if (commandExists(cmd)) {
          return ok(label);
        }
        return required ? fail(label, "not found — required") : warn(label, "not found — optional");
      });

      lines.push(...depChecks.map(formatCheck));
      lines.push("");

      // --------------------------------------------------------------------
      // 2. Configuration
      // --------------------------------------------------------------------
      lines.push("## Configuration");
      lines.push("");

      const configPath = getConfigFilePath();
      const config     = loadConfig();

      if (!config) {
        lines.push(formatCheck(fail("Config file", `not found at ${configPath}`)));
        lines.push("");
        lines.push("Run `init_moodle_context` to initialize.");
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      }

      lines.push(formatCheck(ok("Config file", configPath)));
      lines.push(formatCheck(ok("Moodle path", config.moodlePath)));
      lines.push(formatCheck(ok("Moodle version", config.moodleVersion)));
      lines.push("");

      // --------------------------------------------------------------------
      // 3. Moodle installation
      // --------------------------------------------------------------------
      lines.push("## Moodle Installation");
      lines.push("");

      if (!existsSync(config.moodlePath)) {
        lines.push(formatCheck(fail("Moodle directory", "not found")));
      } else if (!isMoodleRoot(config.moodlePath)) {
        lines.push(formatCheck(warn("Moodle root", "directory exists but may not be a valid Moodle installation")));
      } else {
        lines.push(formatCheck(ok("Moodle root", "valid installation detected")));
      }

      lines.push("");

      // --------------------------------------------------------------------
      // 4. Global index files
      // --------------------------------------------------------------------
      lines.push("## Global Index Files");
      lines.push("");

      for (const file of EXPECTED_GLOBAL_FILES) {
        const fullPath = join(config.moodlePath, file);
        const age      = fileAgeDays(fullPath);

        if (age === null) {
          lines.push(formatCheck(fail(file, "missing")));
        } else if (age > STALE_THRESHOLD_DAYS) {
          lines.push(formatCheck(warn(file, `${age} days old — consider running update_indexes`)));
        } else {
          lines.push(formatCheck(ok(file, `${age === 0 ? "today" : `${age}d ago`}`)));
        }
      }

      lines.push("");

      // --------------------------------------------------------------------
      // 5. Dev plugins
      // --------------------------------------------------------------------
      lines.push("## Development Plugins");
      lines.push("");

      const devMarkers = await glob("**/.moodle-mcp-dev", {
        cwd:    config.moodlePath,
        absolute: true,
        ignore: ["vendor/**", "node_modules/**"],
      });

      if (devMarkers.length === 0) {
        lines.push("  — No plugins marked as in development.");
      } else {
        for (const marker of devMarkers.sort()) {
          const pluginDir = join(marker, "..");
          let componentLabel = pluginDir.replace(config.moodlePath + "/", "");

          try {
            const info   = detectPlugin(pluginDir);
            componentLabel = info.component;
          } catch {
            // Keep path label
          }

          lines.push(`  Plugin: ${componentLabel}`);

          for (const file of EXPECTED_PLUGIN_FILES) {
            const fullPath = join(pluginDir, file);
            const age      = fileAgeDays(fullPath);

            if (age === null) {
              lines.push(formatCheck(fail(`  ${file}`, "missing")));
            } else if (age > STALE_THRESHOLD_DAYS) {
              lines.push(formatCheck(warn(`  ${file}`, `${age}d old`)));
            } else {
              lines.push(formatCheck(ok(`  ${file}`)));
            }
          }

          lines.push("");
        }
      }

      // --------------------------------------------------------------------
      // Summary
      // --------------------------------------------------------------------
      const allChecks = [
        ...depChecks,
      ];

      const hasFailures = allChecks.some((c) => c.status === "fail");
      const hasWarnings = allChecks.some((c) => c.status === "warn");

      // --------------------------------------------------------------------
      // 6. Cache stats
      // --------------------------------------------------------------------
      lines.push("## Cache");
      lines.push("");
      const stats = globalCache.getStats();
      lines.push(`  Hits:   ${stats.hits}`);
      lines.push(`  Misses: ${stats.misses}`);
      lines.push(`  Skips:  ${stats.skips}`);
      lines.push("  _Note: cache is in-memory and resets on server restart._");
      lines.push("");

      lines.push("---");
      lines.push("");

      if (hasFailures) {
        lines.push("❌ Issues found — see failures above.");
      } else if (hasWarnings) {
        lines.push("⚠️  Warnings found — review items above.");
      } else {
        lines.push("✅ All checks passed.");
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );
}
