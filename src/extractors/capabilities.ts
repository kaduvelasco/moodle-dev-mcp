/**
 * @file extractors/capabilities.ts
 * @description Parses Moodle db/access.php files to extract capability definitions.
 *
 * Uses bracket-depth block splitting to correctly handle nested archetypes
 * arrays, with Zod validation on the extracted capability data.
 *
 * Reference: https://docs.moodle.org/dev/Access_API
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const ZCapability = z.object({
  name:         z.string(),
  captype:      z.string().default("read"),
  contextlevel: z.string().default(""),
  riskbitmask:  z.string().default(""),
  archetypes:   z.record(z.string()).default({}),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Capability {
  name:         string;
  captype:      string;
  contextlevel: string;
  riskbitmask:  string;
  archetypes:   Record<string, string>;
}

export interface CapabilitiesExtraction {
  file:         string;
  capabilities: Capability[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the $capabilities array body from a PHP file.
 */
function extractCapabilitiesBody(content: string): string | null {
  const startMatch = content.match(/\$capabilities\s*=\s*[\[|(array\s*\(]/);
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

  if (end === -1) return null;
  return content.slice(startIdx + 1, end);
}

/**
 * Splits the capabilities body into named entries.
 * Keys follow the pattern: 'component/name:action' => [...]
 */
function splitCapabilityEntries(
  body: string
): Array<{ name: string; body: string }> {
  const entries: Array<{ name: string; body: string }> = [];

  // Match capability name keys: 'component/name:action' =>
  const keyPattern = /'([a-zA-Z0-9_/]+:[a-zA-Z0-9_]+)'\s*=>\s*\[/g;
  let match: RegExpExecArray | null;

  while ((match = keyPattern.exec(body)) !== null) {
    const name       = match[1];
    const blockStart = match.index + match[0].length - 1;

    let depth = 0;
    let end   = -1;

    for (let i = blockStart; i < body.length; i++) {
      if (body[i] === "[") depth++;
      else if (body[i] === "]") {
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

function extractString(block: string, key: string): string {
  const strMatch = block.match(
    new RegExp(`['"]${key}['"]\\s*=>\\s*['"]([^'"]+)['"]`)
  );
  if (strMatch) return strMatch[1];

  const constMatch = block.match(
    new RegExp(`['"]${key}['"]\\s*=>\\s*([A-Z_0-9]+)`)
  );
  return constMatch ? constMatch[1] : "";
}

function extractArchetypes(block: string): Record<string, string> {
  const archetypes: Record<string, string> = {};

  const archetypeBlockMatch = block.match(/'archetypes'\s*=>\s*\[([^\]]+)\]/s);
  if (!archetypeBlockMatch) return archetypes;

  const blockContent = archetypeBlockMatch[1];
  const entryPattern = /'([a-zA-Z_]+)'\s*=>\s*([A-Z_0-9]+)/g;

  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(blockContent)) !== null) {
    archetypes[match[1]] = match[2];
  }

  return archetypes;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a db/access.php file and returns all capability definitions.
 * Each capability is validated with Zod — malformed entries are skipped.
 *
 * @param filePath - Absolute path to the access.php file
 */
export function parseAccessPhp(filePath: string): CapabilitiesExtraction | null {
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, "utf-8");
  const body    = extractCapabilitiesBody(content);

  if (body === null) return { file: filePath, capabilities: [] };

  const entries      = splitCapabilityEntries(body);
  const capabilities: Capability[] = [];

  for (const { name, body: entryBody } of entries) {
    const raw = {
      name,
      captype:      extractString(entryBody, "captype"),
      contextlevel: extractString(entryBody, "contextlevel"),
      riskbitmask:  extractString(entryBody, "riskbitmask"),
      archetypes:   extractArchetypes(entryBody),
    };

    const result = ZCapability.safeParse(raw);
    if (result.success) {
      capabilities.push(result.data);
    }
  }

  return { file: filePath, capabilities };
}

/**
 * Extracts capabilities from a plugin directory.
 */
export function extractPluginCapabilities(pluginPath: string): CapabilitiesExtraction | null {
  return parseAccessPhp(join(pluginPath, "db", "access.php"));
}

/**
 * Returns only the capability names (sorted).
 */
export function getCapabilityNames(extraction: CapabilitiesExtraction): string[] {
  return extraction.capabilities.map((c) => c.name).sort();
}
