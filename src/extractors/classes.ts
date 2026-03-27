/**
 * @file extractors/classes.ts
 * @description Extracts PHP class declarations from Moodle codebases.
 *
 * Scans PHP files for class, abstract class, interface, trait, and enum
 * declarations, capturing namespace context and inheritance.
 *
 * Each discovered class is validated with Zod before being included
 * in the output — malformed entries are silently skipped.
 */

import { readFileSync, existsSync } from "fs";
import { join, relative } from "path";
import { glob } from "glob";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const ZPhpClass = z.object({
  name:       z.string().min(1),
  namespace:  z.string().default(""),
  fqn:        z.string().min(1),
  kind:       z.enum(["class", "abstract class", "interface", "trait", "enum"]),
  file:       z.string().min(1),
  extends:    z.string().optional(),
  implements: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClassKind = "class" | "abstract class" | "interface" | "trait" | "enum";

export interface PhpClass {
  name:       string;
  namespace:  string;
  fqn:        string;
  kind:       ClassKind;
  file:       string;
  extends?:   string;
  implements: string[];
}

export interface ClassesExtraction {
  directory: string;
  classes:   PhpClass[];
}

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

const KIND_PATTERN =
  /^(abstract\s+class|class|interface|trait|enum)\s+([a-zA-Z_][a-zA-Z0-9_]*)/m;

const NAMESPACE_PATTERN = /^namespace\s+([a-zA-Z0-9_\\]+)\s*;/m;
const EXTENDS_PATTERN   = /\bextends\s+([a-zA-Z_\\][a-zA-Z0-9_\\]*)/;
const IMPLEMENTS_PATTERN = /\bimplements\s+([a-zA-Z_\\][a-zA-Z0-9_,\\\s]+?)(?:\{|$)/m;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePhpFile(filePath: string, root: string): PhpClass[] {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }

  const results: PhpClass[] = [];
  const nsMatch   = NAMESPACE_PATTERN.exec(content);
  const namespace = nsMatch ? nsMatch[1] : "";
  const lines     = content.split("\n");
  const relFile   = relative(root, filePath);

  for (const line of lines) {
    const kindMatch = KIND_PATTERN.exec(line);
    if (!kindMatch) continue;

    const rawKind      = kindMatch[1].replace(/\s+/g, " ").trim() as ClassKind;
    const name         = kindMatch[2];
    const extendsMatch = EXTENDS_PATTERN.exec(line);
    const implMatch    = IMPLEMENTS_PATTERN.exec(line);

    const implNames = implMatch
      ? implMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const fqn = namespace ? `\\${namespace}\\${name}` : `\\${name}`;

    const raw = {
      name,
      namespace,
      fqn,
      kind:       rawKind,
      file:       relFile,
      extends:    extendsMatch ? extendsMatch[1] : undefined,
      implements: implNames,
    };

    const result = ZPhpClass.safeParse(raw);
    if (result.success) {
      results.push(result.data as PhpClass);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extracts all PHP class declarations from a directory tree.
 */
export async function extractClasses(
  dirPath:   string,
  rootPath?: string
): Promise<ClassesExtraction> {
  const root = rootPath ?? dirPath;

  if (!existsSync(dirPath)) {
    return { directory: dirPath, classes: [] };
  }

  const files = await glob("**/*.php", {
    cwd:      dirPath,
    absolute: true,
    ignore:   ["**/vendor/**", "**/node_modules/**"],
  });

  const allClasses: PhpClass[] = [];

  for (const file of files) {
    allClasses.push(...parsePhpFile(file, root));
  }

  allClasses.sort((a, b) =>
    a.namespace.localeCompare(b.namespace) || a.name.localeCompare(b.name)
  );

  return { directory: dirPath, classes: allClasses };
}

/**
 * Extracts classes from the classes/ subdirectory of a plugin.
 */
export async function extractPluginClasses(pluginPath: string): Promise<ClassesExtraction> {
  return extractClasses(join(pluginPath, "classes"), pluginPath);
}

/**
 * Returns only fully-qualified class names (sorted).
 */
export function getClassFQNs(extraction: ClassesExtraction): string[] {
  return extraction.classes.map((c) => c.fqn).sort();
}

/**
 * Groups classes by kind.
 */
export function groupByKind(extraction: ClassesExtraction): Record<ClassKind, PhpClass[]> {
  const groups: Record<string, PhpClass[]> = {
    "class": [], "abstract class": [], "interface": [], "trait": [], "enum": [],
  };
  for (const cls of extraction.classes) {
    groups[cls.kind]?.push(cls);
  }
  return groups as Record<ClassKind, PhpClass[]>;
}
