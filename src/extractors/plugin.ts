/**
 * @file extractors/plugin.ts
 * @description Detects and describes a Moodle plugin from its directory.
 *
 * Extracts plugin metadata by:
 *   - Inferring type and name from the directory path convention (type/name)
 *   - Reading version.php for component, version, and requires fields
 *   - Reading the lang file for the human-readable plugin name
 *
 * Moodle plugin component format: {type}_{name}  (e.g. local_myplugin)
 * Directory convention:           {moodle_root}/{type_dir}/{name}/
 */

import { readFileSync, existsSync } from "fs";
import { basename, dirname, join } from "path";
import { PLUGIN_TYPE_TO_DIR }     from "../utils/plugin-types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PluginInfo {
  /** Plugin name (directory name), e.g. "myplugin" */
  name: string;
  /** Plugin type, e.g. "local", "mod", "block" */
  type: string;
  /** Full Moodle component string, e.g. "local_myplugin" */
  component: string;
  /** Absolute path to the plugin directory */
  path: string;
  /** Plugin version from version.php, e.g. "2024010100" */
  version: string;
  /** Minimum Moodle version required, e.g. "2023100900" */
  requires: string;
  /** Human-readable plugin name from lang file */
  displayName: string;
  /** Maturity level: MATURITY_ALPHA | MATURITY_BETA | MATURITY_STABLE */
  maturity: string;
  /**
   * Absolute path to the Moodle root — injected by generateAllForPlugin
   * so generators can produce relative paths in output files.
   * Not set when detectPlugin is called directly.
   */
  moodlePath?: string;
}

// ---------------------------------------------------------------------------
// Constants — known Moodle plugin type directory mappings
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a PHP string assignment value from a line.
 * Handles both single and double quoted strings.
 * Example: "$plugin->component = 'local_myplugin';" → "local_myplugin"
 */
function extractPhpStringValue(line: string): string {
  const match = line.match(/=\s*['"]([^'"]+)['"]/);
  return match ? match[1] : "";
}

/**
 * Extracts a PHP numeric assignment value from a line.
 * Example: "$plugin->version = 2024010100;" → "2024010100"
 */
function extractPhpNumericValue(line: string): string {
  const match = line.match(/=\s*(\d+)/);
  return match ? match[1] : "";
}

/**
 * Extracts a PHP constant or numeric value from a line.
 * Example: "$plugin->maturity = MATURITY_STABLE;" → "MATURITY_STABLE"
 */
function extractPhpConstantOrValue(line: string): string {
  const match = line.match(/=\s*([A-Z_0-9]+);/);
  return match ? match[1] : "";
}

/**
 * Reads version.php and returns its relevant fields.
 */
function readVersionPhp(pluginPath: string): Partial<PluginInfo> {
  const versionFile = join(pluginPath, "version.php");

  if (!existsSync(versionFile)) {
    return {};
  }

  const content = readFileSync(versionFile, "utf-8");
  const lines = content.split("\n");

  let component = "";
  let version = "";
  let requires = "";
  let maturity = "";

  for (const line of lines) {
    if (line.includes("$plugin->component")) {
      component = extractPhpStringValue(line);
    } else if (line.includes("$plugin->version")) {
      version = extractPhpNumericValue(line);
    } else if (line.includes("$plugin->requires")) {
      requires = extractPhpNumericValue(line);
    } else if (line.includes("$plugin->maturity")) {
      maturity = extractPhpConstantOrValue(line);
    }
  }

  return { component, version, requires, maturity };
}

/**
 * Reads the primary lang file and extracts the plugin display name.
 * Lang file path: lang/en/{type}_{name}.php
 * Key: $string['pluginname'] = 'My Plugin';
 */
function readDisplayName(pluginPath: string, component: string): string {
  const langFile = join(pluginPath, "lang", "en", `${component}.php`);

  if (!existsSync(langFile)) {
    return "";
  }

  const content = readFileSync(langFile, "utf-8");

  const match = content.match(/\$string\['pluginname'\]\s*=\s*['"]([^'"]+)['"]/);
  return match ? match[1] : "";
}

/**
 * Infers the plugin type from its parent directory name, using the
 * PLUGIN_TYPE_TO_DIR to reverse-map directory names to type strings.
 */
function inferTypeFromPath(pluginPath: string): string {
  const parentDir = basename(dirname(pluginPath));

  // Direct match (e.g. "local", "mod", "blocks")
  for (const [type, dir] of Object.entries(PLUGIN_TYPE_TO_DIR)) {
    if (dir === parentDir || dir.endsWith(`/${parentDir}`)) {
      return type;
    }
  }

  // Fallback: use parent directory name as type
  return parentDir;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detects and describes a Moodle plugin from its absolute directory path.
 *
 * @param pluginPath - Absolute path to the plugin root directory
 * @returns PluginInfo with all available metadata
 * @throws Error if the directory does not exist or lacks version.php
 */
export function detectPlugin(pluginPath: string): PluginInfo {
  if (!existsSync(pluginPath)) {
    throw new Error(`Plugin directory not found: ${pluginPath}`);
  }

  const name = basename(pluginPath);
  const type = inferTypeFromPath(pluginPath);

  const versionData = readVersionPhp(pluginPath);

  // Prefer component from version.php; fall back to inferred type_name
  const component = versionData.component || `${type}_${name}`;

  const displayName = readDisplayName(pluginPath, component);

  return {
    name,
    type,
    component,
    path:        pluginPath,
    version:     versionData.version     ?? "",
    requires:    versionData.requires    ?? "",
    maturity:    versionData.maturity    ?? "",
    displayName: displayName             || name,
  };
}

/**
 * Returns all known Moodle plugin type mappings.
 */
export function getPluginTypeMap(): Record<string, string> {
  return { ...PLUGIN_TYPE_TO_DIR };
}

/**
 * Checks whether a given directory looks like a Moodle plugin
 * (has a version.php file at its root).
 */
export function isPlugin(dirPath: string): boolean {
  return existsSync(join(dirPath, "version.php"));
}
