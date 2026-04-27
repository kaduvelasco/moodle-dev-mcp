/**
 * @file extractors/services.ts
 * @description Parses Moodle db/services.php files to extract web service definitions.
 *
 * Uses bracket-depth block splitting (same strategy as events.ts) to correctly
 * handle nested arrays inside function entries — fixing the regex fragility
 * of the previous implementation.
 *
 * Reference: https://docs.moodle.org/dev/Web_services_API
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebServiceFunction {
  name:          string;
  classname:     string;
  methodname:    string;
  description:   string;
  type:          string;
  ajax:          boolean;
  capabilities:  string;
  loginrequired: boolean;
}

export interface ServicesExtraction {
  file:      string;
  functions: WebServiceFunction[];
}

// ---------------------------------------------------------------------------
// Block splitter (reused pattern from events.ts)
// ---------------------------------------------------------------------------

/**
 * Extracts the $functions = [...] body from a PHP file.
 */
function extractFunctionsBody(content: string): string | null {
  const startMatch = content.match(/\$functions\s*=\s*/);
  if (!startMatch || startMatch.index === undefined) return null;

  let startIdx = -1;
  for (let i = startMatch.index + startMatch[0].length; i < content.length; i++) {
    if (content[i] === "[" || content[i] === "(") { startIdx = i; break; }
  }
  if (startIdx === -1) return null;

  const openChar  = content[startIdx];
  const closeChar = openChar === "[" ? "]" : ")";
  let depth = 0;
  let end   = -1;

  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === openChar) depth++;
    else if (content[i] === closeChar) {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) return null;
  return content.slice(startIdx + 1, end);
}

/**
 * Splits the $functions body into top-level named entries.
 * Each entry is: 'function_name' => [ ... ]
 * Returns array of { name, body } pairs.
 */
function splitFunctionEntries(body: string): Array<{ name: string; body: string }> {
  const entries: Array<{ name: string; body: string }> = [];

  // Match top-level keys: 'name' => [ or 'name' => array(
  const keyPattern = /['"]([a-zA-Z0-9_]+)['"]\s*=>\s*(\[|array\s*\()/g;
  let match: RegExpExecArray | null;

  while ((match = keyPattern.exec(body)) !== null) {
    const name       = match[1];
    const blockStart = match.index + match[0].length - 1;
    const openChar   = body[blockStart];
    const closeChar  = openChar === "[" ? "]" : ")";

    let depth = 0;
    let end   = -1;

    for (let i = blockStart; i < body.length; i++) {
      if (body[i] === openChar) depth++;
      else if (body[i] === closeChar) {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }

    if (end !== -1) {
      entries.push({ name, body: body.slice(blockStart, end + 1) });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Per-block field extractors
// ---------------------------------------------------------------------------

function extractString(block: string, key: string): string {
  const match = block.match(
    new RegExp(`['"]${key}['"]\\s*=>\\s*['"]([^'"]+)['"]`)
  );
  return match ? match[1] : "";
}

function extractBool(block: string, key: string, defaultVal = false): boolean {
  const match = block.match(
    new RegExp(`['"]${key}['"]\\s*=>\\s*(true|false|1|0)`, "i")
  );
  if (!match) return defaultVal;
  return match[1] === "true" || match[1] === "1";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a db/services.php file and returns all web service function definitions.
 *
 * @param filePath - Absolute path to the services.php file
 */
export function parseServicesPhp(filePath: string): ServicesExtraction | null {
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, "utf-8");
  const body    = extractFunctionsBody(content);

  if (body === null) return { file: filePath, functions: [] };

  const entries   = splitFunctionEntries(body);
  const functions: WebServiceFunction[] = [];

  for (const { name, body: entryBody } of entries) {
    const classname   = extractString(entryBody, "classname");
    const description = extractString(entryBody, "description");

    // Skip entries that don't look like function definitions
    if (!classname && !description) continue;

    functions.push({
      name,
      classname,
      methodname:    extractString(entryBody, "methodname") || "execute",
      description,
      type:          extractString(entryBody, "type") || "read",
      ajax:          extractBool(entryBody, "ajax",          false),
      capabilities:  extractString(entryBody, "capabilities"),
      loginrequired: extractBool(entryBody, "loginrequired", true),
    });
  }

  return { file: filePath, functions };
}

/**
 * Extracts web services from a plugin directory.
 */
export function extractPluginServices(pluginPath: string): ServicesExtraction | null {
  return parseServicesPhp(join(pluginPath, "db", "services.php"));
}

/**
 * Returns only the function names (sorted).
 */
export function getFunctionNames(extraction: ServicesExtraction): string[] {
  return extraction.functions.map((f) => f.name).sort();
}
