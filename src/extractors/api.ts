/**
 * @file extractors/api.ts
 * @description Extracts and classifies public API functions from Moodle's lib/ directory.
 *
 * Improvements over initial version:
 *   - Full PHPDoc block parsing (not just the summary line)
 *   - Visibility classification: public | internal | deprecated | private
 *   - Filters out internal/private functions by default
 *   - Extracts @param, @return, @since, @deprecated tags
 *   - Detects Moodle-specific markers: @access private, _internal suffix,
 *     leading underscore convention, @deprecated tag
 *   - ApiFunction now carries structured metadata for richer index generation
 *
 * Visibility rules applied (in priority order):
 *   1. @access private         → private   (explicit PHPDoc tag)
 *   2. @internal               → internal  (PSR-19 internal marker)
 *   3. @deprecated             → deprecated (still public, marked obsolete)
 *   4. Name starts with _      → private   (Moodle underscore convention)
 *   5. Name ends with _internal→ internal  (Moodle naming convention)
 *   6. No PHPDoc at all        → unverified (included but flagged)
 *   7. PHPDoc present, no markers → public
 *
 * The extractor never excludes @deprecated functions — they are public API
 * and developers need to know about them to avoid or migrate away from them.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApiVisibility =
  | "public"       // documented, no private/internal markers
  | "deprecated"   // @deprecated tag present — still public
  | "internal"     // @internal tag or _internal suffix
  | "private"      // @access private or leading underscore
  | "unverified";  // no PHPDoc — cannot confirm public intent

export interface PhpDocBlock {
  /** Full raw text of the doc block */
  raw:        string;
  /** First non-tag line — the function summary */
  summary:    string;
  /** @param lines, e.g. ["$course Course object", "$userid int User ID"] */
  params:     string[];
  /** @return description */
  returns:    string;
  /** @since version string */
  since:      string;
  /** @deprecated message (empty if not deprecated) */
  deprecated: string;
  /** @throws class names */
  throws:     string[];
  /** True if @access private is present */
  accessPrivate: boolean;
  /** True if @internal is present */
  internal:      boolean;
}

export interface ApiFunction {
  /** Function name, e.g. "has_capability" */
  name:       string;
  /** Source file (basename), e.g. "accesslib.php" */
  file:       string;
  /** Absolute path to the source file */
  filePath:   string;
  /** Computed visibility classification */
  visibility: ApiVisibility;
  /** Parsed PHPDoc block, or null if absent */
  doc:        PhpDocBlock | null;
  /** Line number in the source file (1-based) */
  line:       number;
}

export interface ApiExtraction {
  /** Root directory scanned */
  directory:  string;
  /** All functions found (public + deprecated + internal + private + unverified) */
  functions:  ApiFunction[];
  /** Summary counts by visibility */
  counts: {
    public:     number;
    deprecated: number;
    internal:   number;
    private:    number;
    unverified: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Priority lib files — scanned first, most relevant for Moodle developers.
 */
const PRIORITY_FILES = [
  "moodlelib.php",
  "accesslib.php",
  "filelib.php",
  "weblib.php",
  "gradelib.php",
  "completionlib.php",
  "enrollib.php",
  "grouplib.php",
  "datalib.php",
  "outputlib.php",
  "navigationlib.php",
  "formslib.php",
  "filterlib.php",
  "messagelib.php",
  "badgeslib.php",
  "blocklib.php",
  "cronlib.php",
  "dmllib.php",
  "eventslib.php",
  "externallib.php",
  "grade/gradelib.php",
];

const SKIP_PATTERNS = [/vendor\//, /node_modules\//, /classes\//];

// ---------------------------------------------------------------------------
// PHPDoc parser
// ---------------------------------------------------------------------------

/**
 * Parses a raw PHPDoc block string into structured fields.
 * Input: the full block including /** and * /
 */
function parseDocBlock(raw: string): PhpDocBlock {
  const lines = raw
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s?/, "").trim())  // strip leading * and whitespace
    .filter((l) => l !== "/**" && l !== "*/");

  let summary    = "";
  const params:  string[] = [];
  let returns    = "";
  let since      = "";
  let deprecated = "";
  const throws:  string[] = [];
  let accessPrivate = false;
  let internal      = false;

  let inSummary = true;

  for (const line of lines) {
    // Summary: first non-empty, non-tag line
    if (inSummary) {
      if (line.startsWith("@")) {
        inSummary = false;
      } else if (line !== "") {
        summary = summary === "" ? line : `${summary} ${line}`;
        continue;
      } else if (summary !== "") {
        inSummary = false; // blank line after summary text = end of summary
        continue;
      }
    }

    // Tags
    if (line.startsWith("@param")) {
      params.push(line.replace(/^@param\s*/, "").trim());
    } else if (line.startsWith("@return")) {
      returns = line.replace(/^@return\s*/, "").trim();
    } else if (line.startsWith("@since")) {
      since = line.replace(/^@since\s*/, "").trim();
    } else if (line.startsWith("@deprecated")) {
      deprecated = line.replace(/^@deprecated\s*/, "").trim() || "yes";
    } else if (line.startsWith("@throws")) {
      throws.push(line.replace(/^@throws\s*/, "").trim());
    } else if (line.startsWith("@access")) {
      const val = line.replace(/^@access\s*/, "").trim().toLowerCase();
      if (val === "private" || val === "protected") {
        accessPrivate = true;
      }
    } else if (line.startsWith("@internal")) {
      internal = true;
    }
  }

  return { raw, summary, params, returns, since, deprecated, throws, accessPrivate, internal };
}

/**
 * Walks backward from a function declaration line to find the
 * immediately preceding PHPDoc block (/**...* /).
 * Returns null if no doc block is found within a reasonable window.
 */
function findDocBlock(lines: string[], funcLineIndex: number): PhpDocBlock | null {
  // Allow up to 3 blank lines between doc block and function declaration
  let blankCount = 0;
  let closeIndex = -1;

  for (let i = funcLineIndex - 1; i >= 0 && i >= funcLineIndex - 5; i--) {
    const trimmed = lines[i].trim();

    if (trimmed === "") {
      blankCount++;
      if (blankCount > 3) break;
      continue;
    }

    if (trimmed === "*/") {
      closeIndex = i;
      break;
    }

    // Hit code before finding */ — no doc block
    break;
  }

  if (closeIndex === -1) return null;

  // Walk backward to find /**
  let openIndex = -1;
  for (let i = closeIndex - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("/**") || trimmed === "/*") {
      openIndex = i;
      break;
    }
    // If we hit something that's not a doc line, stop
    if (!trimmed.startsWith("*") && trimmed !== "") break;
  }

  if (openIndex === -1) return null;

  const raw = lines.slice(openIndex, closeIndex + 1).join("\n");
  return parseDocBlock(raw);
}

// ---------------------------------------------------------------------------
// Visibility classifier
// ---------------------------------------------------------------------------

/**
 * Determines the visibility of a function based on its name and PHPDoc.
 */
function classifyVisibility(name: string, doc: PhpDocBlock | null): ApiVisibility {
  // 1. Explicit @access private in PHPDoc
  if (doc?.accessPrivate) return "private";

  // 2. @internal tag
  if (doc?.internal) return "internal";

  // 3. Name starts with underscore (Moodle private convention)
  if (name.startsWith("_")) return "private";

  // 4. Name ends with _internal (Moodle naming convention)
  if (name.endsWith("_internal")) return "internal";

  // 5. @deprecated — still public, but marked
  if (doc?.deprecated) return "deprecated";

  // 6. No PHPDoc at all — unverified
  if (doc === null) return "unverified";

  // 7. Has PHPDoc, no negative markers — public
  return "public";
}

// ---------------------------------------------------------------------------
// File scanner
// ---------------------------------------------------------------------------

function scanPhpFile(filePath: string): ApiFunction[] {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }

  const lines   = content.split("\n");
  const file    = basename(filePath);
  const results: ApiFunction[] = [];

  // Only match top-level (non-indented) function declarations
  const funcPattern = /^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const match = funcPattern.exec(lines[i]);
    if (!match) continue;

    const name = match[1];

    // Always skip magic methods
    if (name.startsWith("__")) continue;

    const doc        = findDocBlock(lines, i);
    const visibility = classifyVisibility(name, doc);

    results.push({
      name,
      file,
      filePath,
      visibility,
      doc,
      line: i + 1,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function getPhpFiles(dirPath: string, recurse = false): string[] {
  if (!existsSync(dirPath)) return [];

  const files: string[]    = [];
  const seen:  Set<string> = new Set();

  // Priority files first
  for (const pf of PRIORITY_FILES) {
    const fullPath = join(dirPath, pf);
    if (existsSync(fullPath)) {
      files.push(fullPath);
      seen.add(fullPath);
    }
  }

  try {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat     = statSync(fullPath);

      if (stat.isDirectory() && recurse) {
        if (SKIP_PATTERNS.some((p) => p.test(fullPath))) continue;
        files.push(...getPhpFiles(fullPath, recurse));
        continue;
      }

      if (stat.isFile() && entry.endsWith(".php") && !seen.has(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch { /* unreadable dir */ }

  return files;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extracts and classifies all functions from Moodle's lib/ directory.
 *
 * @param moodlePath      - Absolute path to the Moodle root
 * @param includePrivate  - Include private/internal functions (default: false)
 * @param includeUnverified - Include functions without PHPDoc (default: false)
 */
export function extractMoodleApi(
  moodlePath:         string,
  includePrivate      = false,
  includeUnverified   = false,
): ApiExtraction {
  const libPath  = join(moodlePath, "lib");
  const phpFiles = getPhpFiles(libPath);

  const all: ApiFunction[] = [];

  for (const file of phpFiles) {
    try {
      all.push(...scanPhpFile(file));
    } catch { /* skip unreadable file */ }
  }

  // Count by visibility before filtering
  const counts = {
    public:     all.filter((f) => f.visibility === "public").length,
    deprecated: all.filter((f) => f.visibility === "deprecated").length,
    internal:   all.filter((f) => f.visibility === "internal").length,
    private:    all.filter((f) => f.visibility === "private").length,
    unverified: all.filter((f) => f.visibility === "unverified").length,
  };

  // Apply visibility filter
  const functions = all.filter((f) => {
    if (f.visibility === "public" || f.visibility === "deprecated") return true;
    if (f.visibility === "private" || f.visibility === "internal") return includePrivate;
    if (f.visibility === "unverified") return includeUnverified;
    return false;
  });

  // Sort: public first, then deprecated; within each group by file then name
  functions.sort((a, b) => {
    const vOrder: Record<ApiVisibility, number> = {
      public: 0, deprecated: 1, unverified: 2, internal: 3, private: 4,
    };
    const vDiff = vOrder[a.visibility] - vOrder[b.visibility];
    if (vDiff !== 0) return vDiff;
    return a.file.localeCompare(b.file) || a.name.localeCompare(b.name);
  });

  return { directory: libPath, functions, counts };
}

/**
 * Extracts functions from a specific PHP file.
 */
export function extractFunctionsFromPhpFile(filePath: string): ApiFunction[] {
  if (!existsSync(filePath)) return [];
  return scanPhpFile(filePath);
}

/**
 * Returns only function names (deduplicated, sorted).
 */
export function getFunctionNames(extraction: ApiExtraction): string[] {
  return [...new Set(extraction.functions.map((f) => f.name))].sort();
}

/**
 * Filters an extraction to a specific visibility level.
 */
export function filterByVisibility(
  extraction: ApiExtraction,
  visibility: ApiVisibility,
): ApiFunction[] {
  return extraction.functions.filter((f) => f.visibility === visibility);
}
