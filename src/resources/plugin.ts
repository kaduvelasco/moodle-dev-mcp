/**
 * @file resources/plugin.ts
 * @description MCP Resources for per-plugin AI context.
 *
 * Fixes over initial version:
 *   - ResourceTemplate imported from correct SDK path
 *   - list handler implemented on all plugin resource templates
 *   - Plugin path resolution uses resolve() instead of join() for markers
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative, resolve }                          from "path";
import { glob }                                             from "glob";
import { loadConfig }                                       from "../config.js";
import { detectPlugin }                                     from "../extractors/plugin.js";
import { PLUGIN_TYPE_TO_DIR }                               from "../utils/plugin-types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PluginFileResource {
  suffix:      string;
  filename:    string;
  label:       string;
  description: string;
}

// ---------------------------------------------------------------------------
// Plugin file resource definitions
// ---------------------------------------------------------------------------

const PLUGIN_FILE_RESOURCES: PluginFileResource[] = [
  { suffix: "",              filename: "PLUGIN_AI_CONTEXT.md",     label: "AI Context",       description: "Complete AI context — start here." },
  { suffix: "/context",      filename: "PLUGIN_CONTEXT.md",        label: "Context",          description: "Plugin metadata summary." },
  { suffix: "/structure",    filename: "PLUGIN_STRUCTURE.md",      label: "Structure",        description: "Directory tree and file inventory." },
  { suffix: "/database",     filename: "PLUGIN_DB_TABLES.md",      label: "Database",         description: "Full DB schema: tables, fields, keys, indexes." },
  { suffix: "/events",       filename: "PLUGIN_EVENTS.md",         label: "Events",           description: "Event observers registered by this plugin." },
  { suffix: "/dependencies", filename: "PLUGIN_DEPENDENCIES.md",   label: "Dependencies",     description: "Tasks, services, capabilities, and upgrade history." },
  { suffix: "/architecture", filename: "PLUGIN_ARCHITECTURE.md",   label: "Architecture",     description: "Architecture overview and class structure." },
  { suffix: "/functions",    filename: "PLUGIN_FUNCTION_INDEX.md", label: "Functions",        description: "All PHP functions declared in this plugin." },
  { suffix: "/callbacks",    filename: "PLUGIN_CALLBACK_INDEX.md", label: "Callbacks",        description: "Moodle hook callbacks." },
  { suffix: "/endpoints",    filename: "PLUGIN_ENDPOINT_INDEX.md", label: "Endpoints",        description: "Web services, AJAX endpoints, and AMD modules." },
  { suffix: "/flow",         filename: "PLUGIN_RUNTIME_FLOW.md",   label: "Runtime Flow",     description: "Entry points and execution flow." },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolvePluginPath(component: string, moodlePath: string): string | null {
  const underscoreIdx = component.indexOf("_");
  if (underscoreIdx === -1) return null;

  const type    = component.substring(0, underscoreIdx);
  const name    = component.substring(underscoreIdx + 1);
  const typeDir = PLUGIN_TYPE_TO_DIR[type];

  if (typeDir) {
    const candidate = join(moodlePath, typeDir, name);
    if (existsSync(candidate)) return candidate;
  }

  // Fallback: search two levels deep
  try {
    const topDirs = readdirSync(moodlePath).filter((d) => {
      try { return statSync(join(moodlePath, d)).isDirectory(); } catch { return false; }
    });

    for (const topDir of topDirs) {
      const candidate = join(moodlePath, topDir, name);
      if (existsSync(join(candidate, "version.php"))) return candidate;
    }
  } catch { /* ignore */ }

  return null;
}

function readPluginFile(component: string, filename: string, moodlePath: string): string {
  const pluginPath = resolvePluginPath(component, moodlePath);

  if (!pluginPath) {
    return [
      `# Plugin not found: ${component}`,
      "",
      `Could not resolve directory for \`${component}\`.`,
      "Use `search_plugins` to find available plugins.",
    ].join("\n");
  }

  const filePath = join(pluginPath, filename);

  if (!existsSync(filePath)) {
    return [
      `# ${filename} — Not found`,
      "",
      `Plugin: \`${component}\``,
      `Expected at: ${filePath}`,
      "",
      "Run `generate_plugin_context` to generate context files for this plugin.",
    ].join("\n");
  }

  return readFileSync(filePath, "utf-8");
}

/**
 * Returns the list of all plugin components that have a specific context file.
 */
async function listPluginsWithFile(
  moodlePath: string,
  filename: string
): Promise<Array<{ uri: string; name: string }>> {
  const files = await glob(`**/${filename}`, {
    cwd:      moodlePath,
    absolute: true,
    ignore:   ["vendor/**", "node_modules/**"],
  });

  const items: Array<{ uri: string; name: string }> = [];

  for (const file of files.sort()) {
    const pluginDir = resolve(file, "..");
    try {
      const info = detectPlugin(pluginDir);
      items.push({
        uri:  `moodle://plugin/${info.component}`,
        name: info.displayName || info.name,
      });
    } catch {
      // skip undetectable plugins
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function registerPluginResources(server: McpServer): Promise<void> {

  // -------------------------------------------------------------------------
  // Static: moodle://plugins/with-context
  // -------------------------------------------------------------------------
  server.resource(
    "Plugins With AI Context",
    "moodle://plugins/with-context",
    {
      description: "Lists all Moodle plugins that have AI context files generated.",
      mimeType:    "text/markdown",
    },
    async () => {
      const config = loadConfig();

      if (!config) {
        return {
          contents: [{
            uri: "moodle://plugins/with-context", mimeType: "text/markdown",
            text: "moodle-mcp not initialized. Run `init_moodle_context` first.",
          }],
        };
      }

      const contextFiles = await glob("**/PLUGIN_AI_CONTEXT.md", {
        cwd: config.moodlePath, absolute: true,
        ignore: ["vendor/**", "node_modules/**"],
      });

      const lines = [
        "# Plugins With AI Context",
        "",
        `_${contextFiles.length} plugins with generated context_`,
        "",
        "| Component | Type | Path |",
        "|-----------|------|------|",
      ];

      for (const file of contextFiles.sort()) {
        const pluginDir = resolve(file, "..");
        try {
          const info = detectPlugin(pluginDir);
          const rel  = relative(config.moodlePath, pluginDir);
          lines.push(`| \`${info.component}\` | ${info.type} | ${rel} |`);
        } catch {
          const rel = relative(config.moodlePath, pluginDir);
          lines.push(`| _(unknown)_ | — | ${rel} |`);
        }
      }

      lines.push("", "## Usage", "",
        "```",
        "moodle://plugin/{component}              → Complete AI context",
        "moodle://plugin/{component}/database     → DB schema",
        "moodle://plugin/{component}/events       → Event observers",
        "moodle://plugin/{component}/architecture → Architecture overview",
        "```"
      );

      return {
        contents: [{
          uri: "moodle://plugins/with-context", mimeType: "text/markdown",
          text: lines.join("\n"),
        }],
      };
    }
  );

  // -------------------------------------------------------------------------
  // Dynamic templates: moodle://plugin/{component}[/suffix]
  // -------------------------------------------------------------------------
  for (const def of PLUGIN_FILE_RESOURCES) {
    const uriTemplate = `moodle://plugin/{component}${def.suffix}`;
    const filename    = def.filename;

    server.resource(
      `Plugin ${def.label}`,
      new ResourceTemplate(uriTemplate, {
        list: async () => {
          const config = loadConfig();
          if (!config) return { resources: [] };

          const items = await listPluginsWithFile(config.moodlePath, filename);
          return {
            resources: items.map(({ uri, name }) => ({
              uri:         uri + def.suffix,
              name:        `${name} — ${def.label}`,
              mimeType:    "text/markdown",
              description: def.description,
            })),
          };
        },
      }),
      {
        description: def.description,
        mimeType:    "text/markdown",
      },
      async (uri, { component }) => {
        const config = loadConfig();

        if (!config) {
          return {
            contents: [{
              uri: uri.href, mimeType: "text/markdown",
              text: "moodle-mcp not initialized. Run `init_moodle_context` first.",
            }],
          };
        }

        return {
          contents: [{
            uri:      uri.href,
            mimeType: "text/markdown",
            text:     readPluginFile(String(component), filename, config.moodlePath),
          }],
        };
      }
    );
  }
}
