/**
 * @file resources/moodle.ts
 * @description MCP Resources for global Moodle installation context.
 *
 * Exposes the generated global index files as MCP resources, allowing
 * AI clients to passively consume Moodle context without calling tools.
 *
 * Resources are read-only and served directly from the generated markdown
 * files on disk. If a file does not exist yet, the resource returns a
 * helpful message directing the user to run init_moodle_context.
 *
 * Resource URI scheme:
 *   moodle://context              → AI_CONTEXT.md
 *   moodle://index                → MOODLE_AI_INDEX.md
 *   moodle://workspace            → MOODLE_AI_WORKSPACE.md
 *   moodle://api-index            → MOODLE_API_INDEX.md
 *   moodle://events-index         → MOODLE_EVENTS_INDEX.md
 *   moodle://tasks-index          → MOODLE_TASKS_INDEX.md
 *   moodle://services-index       → MOODLE_SERVICES_INDEX.md
 *   moodle://db-tables            → MOODLE_DB_TABLES_INDEX.md
 *   moodle://classes-index        → MOODLE_CLASSES_INDEX.md
 *   moodle://capabilities-index   → MOODLE_CAPABILITIES_INDEX.md
 *   moodle://plugin-index         → MOODLE_PLUGIN_INDEX.md
 *   moodle://dev-rules            → MOODLE_DEV_RULES.md
 *   moodle://plugin-guide         → MOODLE_PLUGIN_GUIDE.md
 */

import { McpServer }              from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync, readFileSync } from "fs";
import { join }                   from "path";
import { loadConfig }             from "../config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResourceDefinition {
  /** MCP resource URI, e.g. "moodle://context" */
  uri:         string;
  /** Human-readable name shown in MCP clients */
  name:        string;
  /** Short description of what the resource contains */
  description: string;
  /** Filename in the Moodle root directory */
  filename:    string;
}

// ---------------------------------------------------------------------------
// Resource definitions
// ---------------------------------------------------------------------------

const GLOBAL_RESOURCES: ResourceDefinition[] = [
  {
    uri:         "moodle://context",
    name:        "Moodle AI Context",
    description: "High-level overview of the Moodle installation: version, directory structure, key APIs, and coding guidelines.",
    filename:    "AI_CONTEXT.md",
  },
  {
    uri:         "moodle://index",
    name:        "Moodle AI Index",
    description: "Master index linking all generated context files and plugin AI contexts.",
    filename:    "MOODLE_AI_INDEX.md",
  },
  {
    uri:         "moodle://workspace",
    name:        "Moodle AI Workspace",
    description: "Workspace guide listing Moodle version, all plugins, dev plugins, and plugins with AI context.",
    filename:    "MOODLE_AI_WORKSPACE.md",
  },
  {
    uri:         "moodle://api-index",
    name:        "Moodle API Index",
    description: "All public functions extracted from Moodle's lib/ directory, grouped by source file.",
    filename:    "MOODLE_API_INDEX.md",
  },
  {
    uri:         "moodle://events-index",
    name:        "Moodle Events Index",
    description: "All event observers registered across all plugins, with eventname, callback, and source file.",
    filename:    "MOODLE_EVENTS_INDEX.md",
  },
  {
    uri:         "moodle://tasks-index",
    name:        "Moodle Tasks Index",
    description: "All scheduled tasks registered across all plugins, with classname, cron schedule, and source.",
    filename:    "MOODLE_TASKS_INDEX.md",
  },
  {
    uri:         "moodle://services-index",
    name:        "Moodle Services Index",
    description: "All web service functions registered across all plugins, with type, AJAX flag, and classname.",
    filename:    "MOODLE_SERVICES_INDEX.md",
  },
  {
    uri:         "moodle://db-tables",
    name:        "Moodle DB Tables Index",
    description: "All database tables defined across all plugins, with field counts and source files.",
    filename:    "MOODLE_DB_TABLES_INDEX.md",
  },
  {
    uri:         "moodle://classes-index",
    name:        "Moodle Classes Index",
    description: "All PHP classes, interfaces, traits, and enums across the installation, with fully-qualified names.",
    filename:    "MOODLE_CLASSES_INDEX.md",
  },
  {
    uri:         "moodle://capabilities-index",
    name:        "Moodle Capabilities Index",
    description: "All capabilities (permissions) defined across all plugins, with type, context level, and source.",
    filename:    "MOODLE_CAPABILITIES_INDEX.md",
  },
  {
    uri:         "moodle://plugin-index",
    name:        "Moodle Plugin Index",
    description: "Map of all installed plugins: component, type, name, version, and path.",
    filename:    "MOODLE_PLUGIN_INDEX.md",
  },
  {
    uri:         "moodle://dev-rules",
    name:        "Moodle Dev Rules",
    description: "Moodle coding standards, security rules, database conventions, and plugin file structure reference.",
    filename:    "MOODLE_DEV_RULES.md",
  },
  {
    uri:         "moodle://plugin-guide",
    name:        "Moodle Plugin Guide",
    description: "Plugin development quick reference: component naming, required files, version.php template, hooks, and autoloading.",
    filename:    "MOODLE_PLUGIN_GUIDE.md",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads a generated markdown file from the Moodle root.
 * Returns a helpful error message if the file or config is missing.
 */
function readMoodleFile(filename: string): string {
  const config = loadConfig();

  if (!config) {
    return [
      `# Resource not available`,
      "",
      "moodle-mcp has not been initialized.",
      "",
      "Run the `init_moodle_context` tool to generate context files.",
    ].join("\n");
  }

  const filePath = join(config.moodlePath, filename);

  if (!existsSync(filePath)) {
    return [
      `# ${filename} — Not found`,
      "",
      `Expected at: ${filePath}`,
      "",
      "This file has not been generated yet.",
      "Run `init_moodle_context` or `update_indexes` to generate it.",
    ].join("\n");
  }

  return readFileSync(filePath, "utf-8");
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers all global Moodle resources on the MCP server.
 *
 * Each resource maps a stable URI to a generated markdown file,
 * allowing AI clients to fetch Moodle context on demand.
 */
export function registerMoodleResources(server: McpServer): void {
  for (const resource of GLOBAL_RESOURCES) {
    server.resource(
      resource.name,
      resource.uri,
      {
        description: resource.description,
        mimeType:    "text/markdown",
      },
      async () => ({
        contents: [
          {
            uri:      resource.uri,
            mimeType: "text/markdown",
            text:     readMoodleFile(resource.filename),
          },
        ],
      })
    );
  }
}
