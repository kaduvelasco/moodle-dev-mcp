/**
 * @file config.ts
 * @description Manages persistent configuration for moodle-mcp.
 *
 * Configuration is resolved in the following priority order:
 *
 *   1. Environment variables  (MOODLE_PATH, MOODLE_VERSION)
 *   2. .moodle-mcp file       (written by init_moodle_context)
 *
 * This allows Docker/CI deployments to inject configuration via ENV
 * without requiring the init tool to be run first, while preserving
 * the interactive file-based workflow for local development.
 *
 * .moodle-mcp file format (key=value):
 *   MOODLE_PATH=/var/www/moodle
 *   MOODLE_VERSION=4.3
 *   MOODLE_FULLVERSION=2022112822.00
 *
 * Environment variables:
 *   MOODLE_PATH         - Absolute path to the Moodle installation root
 *   MOODLE_VERSION      - Human-readable version string (optional, auto-detected)
 *   MOODLE_FULLVERSION  - Numeric build from $version in version.php (optional, auto-detected)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MoodleConfig {
  moodlePath:         string;
  moodleVersion:      string;
  /** Numeric build from $version in version.php, e.g. "2022112822.00" */
  moodleFullVersion:  string;
  /** Origin of the configuration — useful for diagnostics */
  source: "env" | "file";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIG_FILENAME = ".moodle-mcp";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConfigPath(): string {
  return resolve(homedir(), CONFIG_FILENAME);
}

function loadFromFile(): MoodleConfig | null {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) return null;

  const raw    = readFileSync(configPath, "utf-8");
  const parsed: Record<string, string> = {};

  for (const line of raw.split("\n").filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))) {
    const [key, ...rest] = line.split("=");
    parsed[key.trim()]   = rest.join("=").trim();
  }

  const moodlePath = parsed["MOODLE_PATH"] ?? "";
  if (!moodlePath) return null;

  return {
    moodlePath,
    moodleVersion:     parsed["MOODLE_VERSION"]     ?? "",
    moodleFullVersion: parsed["MOODLE_FULLVERSION"] ?? "",
    source: "file",
  };
}

function loadFromEnv(): MoodleConfig | null {
  const moodlePath = process.env["MOODLE_PATH"]?.trim() ?? "";
  if (!moodlePath) return null;

  return {
    moodlePath,
    moodleVersion:     process.env["MOODLE_VERSION"]?.trim()     ?? "",
    moodleFullVersion: process.env["MOODLE_FULLVERSION"]?.trim() ?? "",
    source: "env",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Loads the moodle-mcp configuration.
 *
 * Resolution order:
 *   1. MOODLE_PATH environment variable (Docker/CI friendly)
 *   2. .moodle-mcp file in the current working directory
 *
 * Returns null if neither source provides a MOODLE_PATH.
 */
export function loadConfig(): MoodleConfig | null {
  return loadFromEnv() ?? loadFromFile();
}

/**
 * Saves the configuration to the .moodle-mcp file.
 * ENV-sourced config is not persisted (ENV is the source of truth there).
 */
export function saveConfig(config: Omit<MoodleConfig, "source">): void {
  const content = [
    `MOODLE_PATH=${config.moodlePath}`,
    `MOODLE_VERSION=${config.moodleVersion}`,
    `MOODLE_FULLVERSION=${config.moodleFullVersion}`,
    "",
  ].join("\n");

  try {
    writeFileSync(getConfigPath(), content, "utf-8");
  } catch (e) {
    throw new Error(`Failed to save config to ${getConfigPath()}: ${String(e)}`);
  }
}

/**
 * Returns true if a .moodle-mcp file exists OR MOODLE_PATH env var is set.
 */
export function configExists(): boolean {
  return !!(process.env["MOODLE_PATH"] || existsSync(getConfigPath()));
}

/**
 * Returns the .moodle-mcp file path (for diagnostic messages).
 */
export function getConfigFilePath(): string {
  return getConfigPath();
}
