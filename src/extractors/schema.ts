/**
 * @file extractors/schema.ts
 * @description Parses Moodle db/install.xml files to extract database schema.
 *
 * Uses fast-xml-parser with Zod validation to ensure extracted data is
 * always well-typed — malformed XML produces empty results rather than
 * corrupt data passed silently to generators.
 *
 * XMLDB format reference: https://docs.moodle.org/dev/XMLDB_Documentation
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const ZField = z.object({
  "@_NAME":     z.string().default(""),
  "@_TYPE":     z.string().default(""),
  "@_LENGTH":   z.string().optional(),
  "@_NOTNULL":  z.string().optional(),
  "@_DEFAULT":  z.string().optional(),
  "@_SEQUENCE": z.string().optional(),
  "@_COMMENT":  z.string().optional(),
});

const ZKey = z.object({
  "@_NAME":     z.string().default(""),
  "@_TYPE":     z.string().default(""),
  "@_FIELDS":   z.string().default(""),
  "@_REFTABLE": z.string().optional(),
});

const ZIndex = z.object({
  "@_NAME":   z.string().default(""),
  "@_UNIQUE": z.string().optional(),
  "@_FIELDS": z.string().default(""),
});

const ZTable = z.object({
  "@_NAME":    z.string().default(""),
  "@_COMMENT": z.string().default(""),
  FIELDS: z.object({ FIELD:  z.array(ZField).default([]) }).optional(),
  KEYS:   z.object({ KEY:    z.array(ZKey).default([]) }).optional(),
  INDEXES:z.object({ INDEX:  z.array(ZIndex).default([]) }).optional(),
});

const ZXmldb = z.object({
  XMLDB: z.object({
    TABLES: z.object({
      TABLE: z.array(ZTable).default([]),
    }).optional(),
  }).optional(),
});

// ---------------------------------------------------------------------------
// Types (derived from Zod)
// ---------------------------------------------------------------------------

export interface DbField {
  name:      string;
  type:      string;
  length?:   string;
  notnull:   boolean;
  default?:  string;
  sequence:  boolean;
  comment?:  string;
}

export interface DbKey {
  name:   string;
  type:   string;
  fields: string[];
  ref?:   string;
}

export interface DbIndex {
  name:   string;
  unique: boolean;
  fields: string[];
}

export interface DbTable {
  name:    string;
  comment: string;
  fields:  DbField[];
  keys:    DbKey[];
  indexes: DbIndex[];
}

export interface DbSchema {
  file:   string;
  tables: DbTable[];
}

// ---------------------------------------------------------------------------
// XML parser configuration
// ---------------------------------------------------------------------------

const parser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: "@_",
  isArray: (name) => ["TABLE", "FIELD", "KEY", "INDEX"].includes(name),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBool(value: string | undefined): boolean {
  return value === "true";
}

function splitFields(fields: string): string[] {
  return fields.split(",").map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a single db/install.xml file and returns its schema.
 * Returns null if the file does not exist.
 * Returns a schema with empty tables[] if the file is malformed.
 */
export function parseInstallXml(xmlFilePath: string): DbSchema | null {
  if (!existsSync(xmlFilePath)) return null;

  let raw: unknown;
  try {
    const content = readFileSync(xmlFilePath, "utf-8");
    raw = parser.parse(content);
  } catch {
    return { file: xmlFilePath, tables: [] };
  }

  const result = ZXmldb.safeParse(raw);
  if (!result.success) return { file: xmlFilePath, tables: [] };

  const rawTables = result.data.XMLDB?.TABLES?.TABLE ?? [];

  const tables: DbTable[] = rawTables.map((t) => ({
    name:    t["@_NAME"],
    comment: t["@_COMMENT"],

    fields: (t.FIELDS?.FIELD ?? []).map((f) => ({
      name:     f["@_NAME"],
      type:     f["@_TYPE"],
      length:   f["@_LENGTH"],
      notnull:  toBool(f["@_NOTNULL"]),
      default:  f["@_DEFAULT"],
      sequence: toBool(f["@_SEQUENCE"]),
      comment:  f["@_COMMENT"],
    })),

    keys: (t.KEYS?.KEY ?? []).map((k) => ({
      name:   k["@_NAME"],
      type:   k["@_TYPE"],
      fields: splitFields(k["@_FIELDS"]),
      ref:    k["@_REFTABLE"],
    })),

    indexes: (t.INDEXES?.INDEX ?? []).map((i) => ({
      name:   i["@_NAME"],
      unique: toBool(i["@_UNIQUE"]),
      fields: splitFields(i["@_FIELDS"]),
    })),
  }));

  return { file: xmlFilePath, tables };
}

/**
 * Parses the db/install.xml of a plugin directory.
 */
export function extractPluginSchema(pluginPath: string): DbSchema | null {
  return parseInstallXml(join(pluginPath, "db", "install.xml"));
}

/**
 * Returns all table names from a schema.
 */
export function getTableNames(schema: DbSchema): string[] {
  return schema.tables.map((t) => t.name);
}

/**
 * Formats a DbTable as a Markdown description block.
 */
export function tableToMarkdown(table: DbTable): string {
  const lines: string[] = [];

  lines.push(`### ${table.name}`);
  if (table.comment) lines.push(`> ${table.comment}`);
  lines.push("");
  lines.push("**Fields:**");
  lines.push("");
  lines.push("| Field | Type | Length | Not Null | Default | Sequence |");
  lines.push("|-------|------|--------|----------|---------|----------|");

  for (const f of table.fields) {
    lines.push(
      `| ${f.name} | ${f.type} | ${f.length ?? "-"} | ${f.notnull ? "✔" : ""} | ${f.default ?? "-"} | ${f.sequence ? "✔" : ""} |`
    );
  }

  if (table.keys.length > 0) {
    lines.push("");
    lines.push("**Keys:**");
    for (const k of table.keys) {
      const ref = k.ref ? ` → ${k.ref}` : "";
      lines.push(`- \`${k.name}\` (${k.type}): ${k.fields.join(", ")}${ref}`);
    }
  }

  if (table.indexes.length > 0) {
    lines.push("");
    lines.push("**Indexes:**");
    for (const i of table.indexes) {
      lines.push(`- \`${i.name}\`${i.unique ? " [unique]" : ""}: ${i.fields.join(", ")}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
