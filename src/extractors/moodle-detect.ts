/**
 * @file extractors/moodle-detect.ts
 * @description Detects Moodle installation metadata from the filesystem.
 *
 * Provides version detection and installation validation utilities
 * used by tools that need to read or update the Moodle configuration.
 *
 * Reads version.php to extract:
 *   - $release  → human-readable version string (e.g. "4.3+ (Build: 20231109)")
 *   - $version  → numeric build version (e.g. 2023110900)
 *   - $branch   → branch string (e.g. "403")
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MoodleInstallInfo {
  /** Human-readable version, e.g. "4.3" */
  version:  string;
  /** Numeric build number, e.g. "2023110900" */
  build:    string;
  /** Branch string, e.g. "403" */
  branch:   string;
  /** Full release string from version.php */
  release:  string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detects the Moodle version from a version.php file.
 * Returns null if the file does not exist or cannot be parsed.
 */
export function detectMoodleVersionFromPath(moodlePath: string): string | null {
  const versionFile = join(moodlePath, "version.php");

  if (!existsSync(versionFile)) return null;

  try {
    const content = readFileSync(versionFile, "utf-8");

    const releaseMatch = content.match(/\$release\s*=\s*['"]([^'"]+)['"]/);
    if (releaseMatch) {
      const version = releaseMatch[1].match(/^(\d+\.\d+[+.]?\d*)/);
      if (version) return version[1];
    }

    const versionMatch = content.match(/\$version\s*=\s*([\d.]+)/);
    if (versionMatch) return versionMatch[1];
  } catch {
    // Fall through
  }

  return null;
}

/**
 * Returns full Moodle installation metadata from version.php.
 * Returns null if the file cannot be read or parsed.
 */
export function detectMoodleInstall(moodlePath: string): MoodleInstallInfo | null {
  const versionFile = join(moodlePath, "version.php");

  if (!existsSync(versionFile)) return null;

  try {
    const content = readFileSync(versionFile, "utf-8");

    const releaseMatch = content.match(/\$release\s*=\s*['"]([^'"]+)['"]/);
    const buildMatch   = content.match(/\$version\s*=\s*([\d.]+)/);
    const branchMatch  = content.match(/\$branch\s*=\s*['"]([^'"]+)['"]/);

    const release = releaseMatch?.[1] ?? "";
    const build   = buildMatch?.[1]   ?? "";
    const branch  = branchMatch?.[1]  ?? "";

    const versionNum = release.match(/^(\d+\.\d+[+.]?\d*)/)?.[1] ?? build;

    return { version: versionNum, build, branch, release };
  } catch {
    return null;
  }
}

/**
 * Validates that a directory is a Moodle installation root.
 */
export function isMoodleRoot(dirPath: string): boolean {
  return (
    existsSync(join(dirPath, "version.php")) &&
    existsSync(join(dirPath, "lib")) &&
    (
      existsSync(join(dirPath, "config.php")) ||
      existsSync(join(dirPath, "config-dist.php"))
    )
  );
}
