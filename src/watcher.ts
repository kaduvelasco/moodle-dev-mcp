/**
 * @file watcher.ts
 * @description File watcher for automatic context regeneration.
 *
 * Watches db/*.php and version.php files inside plugins marked as
 * in development (.moodle-mcp-dev), triggering regeneration when
 * any of those files change.
 *
 * Uses Node.js native fs.watch() — no extra dependencies.
 * Debounces rapid consecutive changes (e.g. editor save + format)
 * with a 500ms delay before triggering regeneration.
 *
 * Usage (called by update tool with watch: true):
 *   const watcher = new MoodleWatcher(moodlePath, moodleVersion);
 *   await watcher.start();
 *   // ... watcher runs until watcher.stop() or process exit
 */

import { watch, existsSync, FSWatcher } from "fs";
import { join, relative, resolve }      from "path";
import { glob }                         from "glob";
import { globalCache }                  from "./cache.js";
import { generateAllForPlugin }         from "./generators/plugin.js";
import { generateAiIndex }              from "./generators/moodle.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WatchEvent {
  pluginPath: string;
  component:  string;
  file:       string;
  timestamp:  string;
}

export type WatchCallback = (event: WatchEvent) => void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEBOUNCE_MS        = 500;
/** Maximum number of plugins to watch simultaneously to avoid hitting ulimit. */
const MAX_WATCHED_PLUGINS = 20;

const WATCHED_FILES = [
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

// ---------------------------------------------------------------------------
// MoodleWatcher
// ---------------------------------------------------------------------------

export class MoodleWatcher {
  private readonly moodlePath:    string;
  private readonly moodleVersion: string;
  private watchers:               FSWatcher[]          = [];
  private timers:                 Map<string, NodeJS.Timeout> = new Map();
  private regenerating:           Set<string>          = new Set();
  private callbacks:              WatchCallback[]       = [];
  private running                                       = false;

  constructor(moodlePath: string, moodleVersion: string) {
    this.moodlePath    = moodlePath;
    this.moodleVersion = moodleVersion;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Starts watching all dev plugins for file changes.
   * Returns the number of watch targets registered.
   */
  async start(): Promise<number> {
    if (this.running) return 0;

    const devMarkers = await glob("**/.moodle-mcp-dev", {
      cwd:    this.moodlePath,
      absolute: true,
      ignore: ["vendor/**", "node_modules/**"],
    });

    let count = 0;

    for (const marker of devMarkers.slice(0, MAX_WATCHED_PLUGINS)) {
      const pluginDir = resolve(marker, "..");
      count += this.watchPlugin(pluginDir);
    }

    this.running = true;
    if (devMarkers.length > MAX_WATCHED_PLUGINS) {
      this.stderr(
        `Warning: ${devMarkers.length} dev plugins found but only watching the first ` +
        `${MAX_WATCHED_PLUGINS} to avoid exhausting file descriptors (ulimit). ` +
        `Remove .moodle-mcp-dev from inactive plugins to free up slots.`
      );
    }

    this.stderr(`Watching ${Math.min(devMarkers.length, MAX_WATCHED_PLUGINS)} dev plugins (${count} files)`);

    return count;
  }

  /**
   * Stops all file watchers and clears pending debounce timers.
   */
  stop(): void {
    for (const w of this.watchers) {
      try { w.close(); } catch { /* ignore */ }
    }
    for (const t of this.timers.values()) {
      clearTimeout(t);
    }
    this.watchers = [];
    this.timers.clear();
    this.running  = false;
    this.stderr("Watcher stopped.");
  }

  /**
   * Registers a callback invoked after each successful regeneration.
   */
  onChange(cb: WatchCallback): void {
    this.callbacks.push(cb);
  }

  /**
   * Returns whether the watcher is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private watchPlugin(pluginDir: string): number {
    let count = 0;

    for (const filename of WATCHED_FILES) {
      const filePath = join(pluginDir, filename);
      if (!existsSync(filePath)) continue;

      try {
        const watcher = watch(filePath, () => {
          this.onFileChange(pluginDir, filePath);
        });
        this.watchers.push(watcher);
        count++;
      } catch {
        // File may not be watchable — skip silently
      }
    }

    return count;
  }

  /**
   * Debounced handler: waits DEBOUNCE_MS after last change before regenerating.
   */
  private onFileChange(pluginDir: string, filePath: string): void {
    const key = pluginDir;

    // Clear existing debounce timer for this plugin
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.timers.delete(key);
      await this.regeneratePlugin(pluginDir, filePath);
    }, DEBOUNCE_MS);

    this.timers.set(key, timer);
  }

  private async regeneratePlugin(pluginDir: string, changedFile: string): Promise<void> {
    if (this.regenerating.has(pluginDir)) {
      this.stderr(`Regeneration already in progress for ${relative(this.moodlePath, pluginDir)} — skipping`);
      return;
    }

    const rel = relative(this.moodlePath, changedFile);
    this.stderr(`Change detected: ${rel} — regenerating...`);

    // Invalidate cache for this plugin
    globalCache.invalidate(join(pluginDir, "PLUGIN_AI_CONTEXT.md"));

    this.regenerating.add(pluginDir);
    try {
      const result = await generateAllForPlugin(pluginDir, this.moodlePath);
      await generateAiIndex(this.moodlePath, this.moodleVersion);

      const ok   = result.files.filter((f) => f.success).length;
      const fail = result.files.filter((f) => !f.success).length;

      this.stderr(
        `Regenerated ${result.plugin}: ${ok} files OK${fail > 0 ? `, ${fail} failed` : ""}`
      );

      // Notify callbacks
      const event: WatchEvent = {
        pluginPath: pluginDir,
        component:  result.plugin,
        file:       rel,
        timestamp:  new Date().toISOString(),
      };

      for (const cb of this.callbacks) {
        try { cb(event); } catch { /* ignore callback errors */ }
      }

    } catch (e) {
      this.stderr(`Regeneration failed for ${pluginDir}: ${String(e)}`);
    } finally {
      this.regenerating.delete(pluginDir);
    }
  }

  /** Writes to stderr — never pollutes the MCP stdio channel. */
  private stderr(msg: string): void {
    process.stderr.write(`[moodle-mcp watcher] ${msg}\n`);
  }
}
