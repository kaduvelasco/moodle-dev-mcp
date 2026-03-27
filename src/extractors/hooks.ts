/**
 * @file extractors/hooks.ts
 * @description Parses Moodle 4.x Hook API files for a plugin.
 *
 * The Hook API (introduced in Moodle 4.3, expanded in 4.4) is a PSR-14-based
 * replacement for the legacy lib.php callback system. It provides:
 *
 *   db/hooks.php        — callback registrations (plugin listens to hooks)
 *   classes/hook/*.php  — hook definitions (plugin defines its own hooks)
 *
 * This extractor handles both sides:
 *
 *   1. HookCallback  — this plugin LISTENS to a hook fired by someone else
 *      Parsed from: db/hooks.php ($callbacks array)
 *      Fields: hookname, callback, priority, defaultenabled
 *
 *   2. HookDefinition — this plugin DEFINES a hook that others can listen to
 *      Parsed from: classes/hook/*.php (classes implementing described_hook)
 *      Fields: classname, description, tags, replaces (legacy callback)
 *
 * Legacy mapping:
 *   Some hook definitions carry a $callbacks entry with 'replaces' => 'legacycallback'.
 *   This extractor captures those to allow the generator to warn developers
 *   when their plugin still uses a deprecated lib.php callback that has been
 *   replaced by a hook.
 *
 * Reference: https://moodledev.io/docs/apis/core/hooks
 */

import { readFileSync, existsSync } from "fs";
import { join }                     from "path";
import { glob }                     from "glob";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HookCallback {
  /** Fully-qualified hook class name, e.g. \core\hook\output\before_http_headers */
  hookname:       string;
  /** PHP callable string or array notation, e.g. \local_myplugin\hook_callbacks::before_output */
  callback:       string;
  /** Execution priority — higher runs first. Default 0. */
  priority:       number;
  /** Whether this callback is enabled by default */
  defaultenabled: boolean;
}

export interface HookDefinition {
  /** Fully-qualified class name of the hook, e.g. \local_myplugin\hook\data_submitted */
  classname:   string;
  /** Hook description from get_hook_description() or PHPDoc */
  description: string;
  /** Tags from get_hook_tags(), e.g. ["form", "submission"] */
  tags:        string[];
  /**
   * Legacy lib.php callback name that this hook replaces, e.g. "before_http_headers".
   * Extracted from the 'replaces' key in the hook class or db/hooks.php.
   */
  replaces:    string;
}

export interface HooksExtraction {
  /** Source directory (plugin root) */
  pluginPath:   string;
  /** Callbacks registered in db/hooks.php */
  callbacks:    HookCallback[];
  /** Hook classes defined by this plugin under classes/hook/ */
  definitions:  HookDefinition[];
  /** Legacy lib.php callbacks that have known hook replacements */
  legacyWarnings: LegacyCallbackWarning[];
}

export interface LegacyCallbackWarning {
  /** Legacy function name in lib.php, e.g. "local_myplugin_before_http_headers" */
  legacyFunction: string;
  /** Hook class that replaces it */
  replacedBy:     string;
  /** Migration guide message */
  guidance:       string;
}

// ---------------------------------------------------------------------------
// Known legacy → hook migrations (Moodle 4.3/4.4)
// Source: https://moodledev.io/docs/apis/core/hooks (Replaced callbacks section)
// ---------------------------------------------------------------------------

const LEGACY_TO_HOOK_MAP: Record<string, string> = {
  // Output hooks
  "before_http_headers":        "\\core\\hook\\output\\before_http_headers",
  "before_footer":              "\\core\\hook\\output\\before_footer",
  "before_standard_html_head":  "\\core\\hook\\output\\before_standard_html_head",
  "after_config":               "\\core\\hook\\output\\after_config",
  "after_require_login":        "\\core\\hook\\output\\after_require_login",

  // Navigation hooks
  "extend_navigation":          "\\core\\hook\\navigation\\primary_extend",

  // User hooks
  "pre_signup_requests":        "\\core\\hook\\auth\\signup_page_info",
  "extend_signup_form":         "\\core\\hook\\auth\\signup_page_info",
  "validate_extend_signup_form":"\\core\\hook\\auth\\signup_page_info",

  // Course hooks
  "course_module_viewed":       "\\core\\hook\\coursemodule\\after_cm_page_view",
  "extend_course_navigation":   "\\core\\hook\\navigation\\primary_extend",

  // Cron hooks
  "cron":                       "\\core\\hook\\cron\\after_cron_task",
};

// ---------------------------------------------------------------------------
// Block splitter (reused pattern from events/services extractors)
// ---------------------------------------------------------------------------

function extractArrayBody(content: string, varName: string): string | null {
  const startMatch = content.match(
    new RegExp(`\\$${varName}\\s*=\\s*[\\[|(array\\s*\\()]`)
  );
  if (!startMatch || startMatch.index === undefined) return null;

  const startIdx = content.indexOf("[", startMatch.index);
  if (startIdx === -1) return null;

  let depth = 0;
  let end   = -1;

  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === "[") depth++;
    else if (content[i] === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  return end !== -1 ? content.slice(startIdx + 1, end) : null;
}

function splitIntoBlocks(body: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "[" || ch === "(") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "]" || ch === ")") {
      depth--;
      if (depth === 0 && start !== -1) {
        blocks.push(body.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return blocks;
}

function extractString(block: string, key: string): string {
  const match = block.match(
    new RegExp(`['"]${key}['"]\\s*=>\\s*['"]([^'"]+)['"]`)
  );
  return match ? match[1] : "";
}

function extractInt(block: string, key: string, defaultVal = 0): number {
  const match = block.match(
    new RegExp(`['"]${key}['"]\\s*=>\\s*(-?\\d+)`)
  );
  return match ? parseInt(match[1], 10) : defaultVal;
}

function extractBool(block: string, key: string, defaultVal = true): boolean {
  const match = block.match(
    new RegExp(`['"]${key}['"]\\s*=>\\s*(true|false|1|0)`, "i")
  );
  if (!match) return defaultVal;
  return match[1] === "true" || match[1] === "1";
}

// ---------------------------------------------------------------------------
// db/hooks.php parser
// ---------------------------------------------------------------------------

/**
 * Parses db/hooks.php and returns all registered hook callbacks.
 */
function parseHooksPhp(filePath: string): HookCallback[] {
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, "utf-8");
  const body    = extractArrayBody(content, "callbacks");

  if (body === null) return [];

  const blocks    = splitIntoBlocks(body);
  const callbacks: HookCallback[] = [];

  for (const block of blocks) {
    const hookname = extractString(block, "hookname") ||
                     extractString(block, "hook");
    const callback = extractString(block, "callback");

    if (!hookname && !callback) continue;

    callbacks.push({
      hookname,
      callback,
      priority:       extractInt(block,  "priority", 0),
      defaultenabled: extractBool(block, "defaultenabled", true),
    });
  }

  return callbacks;
}

// ---------------------------------------------------------------------------
// classes/hook/*.php parser
// ---------------------------------------------------------------------------

/**
 * Extracts PHPDoc description from a PHP file.
 */
function extractPhpDocDescription(content: string): string {
  // Find the first /** ... */ block
  const match = content.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return "";

  return match[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s?/, "").trim())
    .filter((l) => l !== "" && !l.startsWith("@"))
    .join(" ")
    .trim()
    .substring(0, 200);
}

/**
 * Extracts hook description from get_hook_description() method.
 */
function extractHookDescription(content: string): string {
  const match = content.match(
    /get_hook_description\s*\(\s*\)\s*:\s*string\s*\{[^}]*return\s*['"]([^'"]+)['"]/s
  );
  return match ? match[1] : "";
}

/**
 * Extracts hook tags from get_hook_tags() method.
 */
function extractHookTags(content: string): string[] {
  const match = content.match(
    /get_hook_tags\s*\(\s*\)\s*:\s*array\s*\{[^}]*return\s*\[([^\]]*)\]/s
  );
  if (!match) return [];

  return match[1]
    .split(",")
    .map((s) => s.replace(/['"]/g, "").trim())
    .filter(Boolean);
}

/**
 * Extracts the 'replaces' legacy callback name from a hook class or db/hooks.php entry.
 */
function extractReplaces(content: string): string {
  // From db/hooks.php: 'replaces' => 'before_footer'
  const dbMatch = content.match(/'replaces'\s*=>\s*'([^']+)'/);
  if (dbMatch) return dbMatch[1];

  // From hook class: const DEPRECATED_CALLBACK = 'before_footer';
  const constMatch = content.match(/DEPRECATED_CALLBACK\s*=\s*['"]([^'"]+)['"]/);
  if (constMatch) return constMatch[1];

  return "";
}

/**
 * Extracts the fully-qualified class name from a PHP file.
 */
function extractFQN(content: string): string {
  const nsMatch    = content.match(/^namespace\s+([a-zA-Z0-9_\\]+)\s*;/m);
  const classMatch = content.match(/^(?:final\s+)?class\s+([a-zA-Z0-9_]+)/m);

  if (!nsMatch || !classMatch) return "";

  return `\\${nsMatch[1]}\\${classMatch[1]}`;
}

/**
 * Scans classes/hook/ directory for hook definition classes.
 */
async function parseHookDefinitions(pluginPath: string): Promise<HookDefinition[]> {
  const hookDir = join(pluginPath, "classes", "hook");

  if (!existsSync(hookDir)) return [];

  const files = await glob("**/*.php", { cwd: hookDir, absolute: true });
  const definitions: HookDefinition[] = [];

  for (const file of files) {
    try {
      const content     = readFileSync(file, "utf-8");
      const classname   = extractFQN(content);

      if (!classname) continue;

      const description = extractHookDescription(content) ||
                          extractPhpDocDescription(content);
      const tags        = extractHookTags(content);
      const replaces    = extractReplaces(content);

      definitions.push({ classname, description, tags, replaces });
    } catch { /* skip unreadable file */ }
  }

  return definitions;
}

// ---------------------------------------------------------------------------
// Legacy callback detector
// ---------------------------------------------------------------------------

/**
 * Scans lib.php for functions that have known hook replacements.
 * Returns warnings for each legacy function still in use.
 */
function detectLegacyCallbacks(
  pluginPath: string,
  component:  string
): LegacyCallbackWarning[] {
  const libFile = join(pluginPath, "lib.php");
  if (!existsSync(libFile)) return [];

  const content  = readFileSync(libFile, "utf-8");
  const warnings: LegacyCallbackWarning[] = [];

  for (const [suffix, hookClass] of Object.entries(LEGACY_TO_HOOK_MAP)) {
    const legacyFunction = `${component}_${suffix}`;

    // Check if the function is defined in lib.php
    const pattern = new RegExp(`^function\\s+${legacyFunction}\\s*\\(`, "m");
    if (!pattern.test(content)) continue;

    warnings.push({
      legacyFunction,
      replacedBy: hookClass,
      guidance: [
        `Migrate \`${legacyFunction}()\` in lib.php to a Hook API callback.`,
        `1. Create \`db/hooks.php\` with a callback entry for \`${hookClass}\``,
        `2. Create \`classes/hook_callbacks.php\` with your callback method`,
        `3. Remove \`${legacyFunction}()\` from lib.php`,
      ].join(" "),
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extracts all Hook API information for a plugin.
 *
 * @param pluginPath - Absolute path to the plugin root directory
 * @param component  - Plugin component string (e.g. "local_myplugin")
 */
export async function extractPluginHooks(
  pluginPath: string,
  component:  string
): Promise<HooksExtraction> {
  const callbacks   = parseHooksPhp(join(pluginPath, "db", "hooks.php"));
  const definitions = await parseHookDefinitions(pluginPath);
  const legacyWarnings = detectLegacyCallbacks(pluginPath, component);

  return { pluginPath, callbacks, definitions, legacyWarnings };
}

/**
 * Returns true if the plugin uses any Hook API features.
 */
export function pluginUsesHookApi(extraction: HooksExtraction): boolean {
  return (
    extraction.callbacks.length > 0 ||
    extraction.definitions.length > 0
  );
}

/**
 * Returns true if the plugin has any legacy callbacks that should be migrated.
 */
export function pluginHasLegacyCallbacks(extraction: HooksExtraction): boolean {
  return extraction.legacyWarnings.length > 0;
}
