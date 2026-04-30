/**
 * @file extractors/upgrade.ts
 * @description Parses Moodle db/upgrade.php files to extract upgrade step history.
 *
 * Moodle plugins define database upgrade steps in db/upgrade.php.
 * Each step is version-gated: if ($oldversion < YYYYMMDDXX) { ... }
 *
 * This extractor captures each step's version number and, where present,
 * a short description from an inline comment or xmldb_table reference.
 * This data is valuable for AI context when debugging upgrade issues or
 * understanding a plugin's schema evolution.
 *
 * Reference: https://docs.moodle.org/dev/Upgrade_API
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpgradeStep {
  /** Version number this step targets, e.g. 2024010101 */
  version:     string;
  /** Short description extracted from comment or first xmldb operation */
  description: string;
  /** Raw code block of the step (first 300 chars for context) */
  preview:     string;
}

export interface UpgradeExtraction {
  /** Source file path */
  file:  string;
  steps: UpgradeStep[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the xmldb_plugin_upgrade() function body from upgrade.php.
 */
function extractFunctionBody(content: string): string | null {
  // Match: function xmldb_{anything}_upgrade(
  const fnMatch = content.match(/function\s+xmldb_\w+_upgrade\s*\(/);
  if (!fnMatch || fnMatch.index === undefined) return null;

  // Find the opening brace of the function body
  const braceStart = content.indexOf("{", fnMatch.index);
  if (braceStart === -1) return null;

  let depth = 0;
  let end   = -1;

  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) return null;
  return content.slice(braceStart + 1, end);
}

/**
 * Extracts a short description from a step block.
 * Tries: inline comment on version line, first xmldb table name, first comment.
 */
function extractDescription(stepBlock: string): string {
  // Inline comment on the if line: // Some description
  const inlineMatch = stepBlock.match(/if\s*\([^)]+\)\s*\{?\s*\/\/\s*(.+)/);
  if (inlineMatch) return inlineMatch[1].trim().substring(0, 120);

  // First xmldb_table reference: new xmldb_table('tablename')
  const tableMatch = stepBlock.match(/new\s+xmldb_table\s*\(\s*['"]([^'"]+)['"]/);
  if (tableMatch) return `xmldb_table: ${tableMatch[1]}`;

  // First comment block
  const commentMatch = stepBlock.match(/\/\/\s*(.+)/);
  if (commentMatch) return commentMatch[1].trim().substring(0, 120);

  return "";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a db/upgrade.php file and returns all upgrade step definitions.
 *
 * @param filePath - Absolute path to the upgrade.php file
 */
export function parseUpgradePhp(filePath: string): UpgradeExtraction | null {
  if (!existsSync(filePath)) return null;

  const content    = readFileSync(filePath, "utf-8");
  const body       = extractFunctionBody(content);

  if (body === null) return { file: filePath, steps: [] };

  const steps: UpgradeStep[] = [];

  // Match all version-gated blocks: if ($oldversion < VERSIONNUM) {
  const stepPattern = /if\s*\(\s*\$oldversion\s*<\s*(\d{10})\s*\)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = stepPattern.exec(body)) !== null) {
    const version    = match[1];
    const blockStart = match.index;

    // Find matching closing brace
    let depth = 0;
    let end   = -1;

    for (let i = blockStart; i < body.length; i++) {
      if (body[i] === "{") depth++;
      else if (body[i] === "}") {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }

    const stepBlock  = end !== -1 ? body.slice(blockStart, end + 1) : body.slice(blockStart, blockStart + 500);
    const description = extractDescription(stepBlock);
    const preview     = stepBlock.replace(/\s+/g, " ").trim().substring(0, 300);

    steps.push({ version, description, preview });
  }

  // Sort ascending by version (numeric — format is always 10-digit YYYYMMDDXX)
  steps.sort((a, b) => parseInt(a.version, 10) - parseInt(b.version, 10));

  return { file: filePath, steps };
}

/**
 * Extracts upgrade steps from a plugin directory.
 */
export function extractPluginUpgrade(pluginPath: string): UpgradeExtraction | null {
  return parseUpgradePhp(join(pluginPath, "db", "upgrade.php"));
}

/**
 * Returns only version numbers (sorted ascending).
 */
export function getUpgradeVersions(extraction: UpgradeExtraction): string[] {
  return extraction.steps.map((s) => s.version);
}
