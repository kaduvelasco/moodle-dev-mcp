/**
 * @file cache.ts
 * @description File-based mtime cache for moodle-mcp generators.
 *
 * Prevents unnecessary re-extraction and re-generation by tracking the
 * last-modified time of source files. A generator is skipped when all
 * its input source files are older than its output file.
 *
 * Cache state is stored in-memory per server run — there is no persistent
 * cache file. This means the cache is warm within a session but cold on
 * restart, which is the safest default (no stale cache across upgrades).
 *
 * Usage:
 *   const cache = new MtimeCache();
 *
 *   // Check before generating
 *   if (cache.isStale(outputFile, [...sourceFiles])) {
 *     await generateSomething(outputFile);
 *     cache.mark(outputFile);
 *   }
 */

import { existsSync, statSync } from "fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheStats {
  hits:   number;
  misses: number;
  skips:  number;
}

// ---------------------------------------------------------------------------
// MtimeCache
// ---------------------------------------------------------------------------

export class MtimeCache {
  /** In-memory record: outputPath → timestamp when last marked fresh */
  private readonly marked = new Map<string, number>();
  private stats: CacheStats = { hits: 0, misses: 0, skips: 0 };

  /**
   * Returns true when the output file needs to be regenerated.
   *
   * Conditions for "stale" (needs regeneration):
   *   1. Output file does not exist
   *   2. Any source file is newer than the output file
   *   3. The output was not marked fresh in this session
   *
   * @param outputFile  - The generated .md file
   * @param sourceFiles - Source files the output depends on (may not all exist)
   */
  isStale(outputFile: string, sourceFiles: string[]): boolean {
    // Output doesn't exist → always regenerate
    if (!existsSync(outputFile)) {
      this.stats.misses++;
      return true;
    }

    // Already marked fresh this session → skip
    if (this.marked.has(outputFile)) {
      this.stats.hits++;
      return false;
    }

    const outputMtime = this.getMtime(outputFile);

    // Any source newer than output → regenerate
    for (const src of sourceFiles) {
      if (!existsSync(src)) continue;
      if (this.getMtime(src) > outputMtime) {
        this.stats.misses++;
        return true;
      }
    }

    // All sources older than output → skip
    this.stats.skips++;
    return false;
  }

  /**
   * Marks an output file as freshly generated in this session.
   * Prevents redundant re-generation within the same run.
   */
  mark(outputFile: string): void {
    this.marked.set(outputFile, Date.now());
  }

  /**
   * Invalidates a specific output file, forcing regeneration next check.
   */
  invalidate(outputFile: string): void {
    this.marked.delete(outputFile);
  }

  /**
   * Invalidates all cached entries — forces full regeneration.
   */
  invalidateAll(): void {
    this.marked.clear();
  }

  /**
   * Returns cache statistics for the current session.
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Resets statistics counters.
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, skips: 0 };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private getMtime(filePath: string): number {
    try {
      return statSync(filePath).mtimeMs;
    } catch {
      return 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/**
 * Shared cache instance for the server process.
 * All generators use this instance so hits/misses are tracked globally.
 */
export const globalCache = new MtimeCache();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the list of db/ source files for a plugin that affect its context.
 * Used to determine staleness of PLUGIN_* generated files.
 */
export function getPluginSourceFiles(pluginPath: string): string[] {
  const candidates = [
    "version.php",
    "lib.php",
    "locallib.php",
    "db/install.xml",
    "db/access.php",
    "db/events.php",
    "db/tasks.php",
    "db/services.php",
    "db/upgrade.php",
    "db/hooks.php",
  ];

  return candidates.map((f) => `${pluginPath}/${f}`);
}

/**
 * Returns the list of source files that affect global Moodle indexes.
 * These are scanned broadly — any db/ file under the Moodle root.
 */
export function getMoodleSourcePatterns(moodlePath: string): string[] {
  return [
    `${moodlePath}/version.php`,
    `${moodlePath}/lib/moodlelib.php`,
    `${moodlePath}/lib/accesslib.php`,
  ];
}
