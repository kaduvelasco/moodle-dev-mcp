/**
 * @file extractors/events.ts
 * @description Parses Moodle db/events.php files to extract event subscriptions.
 *
 * Extracts event observer definitions by parsing each array entry as a
 * self-contained block, avoiding the index-misalignment bug that occurs
 * when optional fields (priority, internal) are absent from some entries.
 *
 * Strategy:
 *   1. Isolate the $observers array body
 *   2. Split it into individual entry blocks using bracket depth tracking
 *   3. Extract all fields from each block independently
 *
 * Reference: https://docs.moodle.org/dev/Event_2
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventObserver {
  /** Fully-qualified event class name, e.g. \core\event\course_viewed */
  eventname: string;
  /** Callback class::method or function name */
  callback:  string;
  /** Observer priority (higher runs first). Default 0. */
  priority:  number;
  /** Whether to run before the transaction is committed */
  internal:  boolean;
}

export interface EventsExtraction {
  /** Source file path */
  file:      string;
  observers: EventObserver[];
}

// ---------------------------------------------------------------------------
// Block splitter
// ---------------------------------------------------------------------------

/**
 * Splits a PHP array body string into individual entry blocks.
 * Tracks bracket depth to correctly handle nested arrays.
 */
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

/**
 * Extracts the $observers = [...] body from a PHP file.
 */
function extractObserversBody(content: string): string | null {
  const startMatch = content.match(/\$observers\s*=\s*/);
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

// ---------------------------------------------------------------------------
// Per-block field extractors
// ---------------------------------------------------------------------------

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

function extractBool(block: string, key: string, defaultVal = false): boolean {
  const match = block.match(
    new RegExp(`['"]${key}['"]\\s*=>\\s*(true|false)`, "i")
  );
  if (!match) return defaultVal;
  return match[1].toLowerCase() === "true";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a db/events.php file and returns all event observer definitions.
 * Each entry is parsed independently — missing optional fields default
 * to safe values without affecting other entries.
 *
 * @param filePath - Absolute path to the events.php file
 */
export function parseEventsPhp(filePath: string): EventsExtraction | null {
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, "utf-8");
  const body    = extractObserversBody(content);

  if (body === null) return { file: filePath, observers: [] };

  const blocks    = splitIntoBlocks(body);
  const observers: EventObserver[] = [];

  for (const block of blocks) {
    const eventname = extractString(block, "eventname");
    const callback  = extractString(block, "callback");

    if (!eventname && !callback) continue;

    observers.push({
      eventname,
      callback,
      priority: extractInt(block,  "priority", 0),
      internal: extractBool(block, "internal", false),
    });
  }

  return { file: filePath, observers };
}

/**
 * Extracts event observers from a plugin directory.
 */
export function extractPluginEvents(pluginPath: string): EventsExtraction | null {
  return parseEventsPhp(join(pluginPath, "db", "events.php"));
}

/**
 * Returns only the event class names (deduplicated, sorted).
 */
export function getEventNames(extraction: EventsExtraction): string[] {
  return [...new Set(extraction.observers.map((o) => o.eventname))].sort();
}
