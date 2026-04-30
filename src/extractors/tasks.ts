/**
 * @file extractors/tasks.ts
 * @description Parses Moodle db/tasks.php files to extract scheduled tasks.
 *
 * Moodle plugins define scheduled tasks in db/tasks.php.
 * Each task entry maps a classname to scheduling parameters
 * (minute, hour, day, month, dayofweek) and optional flags.
 *
 * Example db/tasks.php structure:
 *   $tasks = [
 *     [
 *       'classname'   => '\local_myplugin\task\my_task',
 *       'blocking'    => 0,
 *       'minute'      => '0',
 *       'hour'        => '* /2',
 *       'day'         => '*',
 *       'month'       => '*',
 *       'dayofweek'   => '*',
 *     ],
 *   ];
 *
 * Reference: https://docs.moodle.org/dev/Scheduled_tasks
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduledTask {
  /** Fully-qualified class name, e.g. \local_myplugin\task\my_task */
  classname:  string;
  /** Whether this task blocks other tasks while running */
  blocking:   boolean;
  /** Cron minute expression, e.g. "0", "* /5", "*" */
  minute:     string;
  /** Cron hour expression */
  hour:       string;
  /** Cron day-of-month expression */
  day:        string;
  /** Cron month expression */
  month:      string;
  /** Cron day-of-week expression */
  dayofweek:  string;
  /** Whether task is disabled by default */
  disabled:   boolean;
}

export interface TasksExtraction {
  /** Source file path */
  file:  string;
  tasks: ScheduledTask[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the $tasks = [...] body from a PHP file.
 */
function extractTasksBody(content: string): string | null {
  const startMatch = content.match(/\$tasks\s*=\s*/);
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

/**
 * Splits a PHP array body into individual entry blocks.
 * Tracks bracket depth to handle nested arrays correctly.
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

function extractString(block: string, key: string): string {
  const match = block.match(
    new RegExp(`['"]${key}['"]\\s*=>\\s*['"]([^'"]*)['"]`)
  );
  return match ? match[1] : "";
}

function extractFlag(block: string, key: string): boolean {
  const match = block.match(new RegExp(`['"]${key}['"]\\s*=>\\s*([01])`));
  return match ? match[1] === "1" : false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a db/tasks.php file and returns all scheduled task definitions.
 * Each entry is parsed from its own block — missing optional fields (blocking,
 * disabled) default to false without affecting other entries.
 *
 * @param filePath - Absolute path to the tasks.php file
 */
export function parseTasksPhp(filePath: string): TasksExtraction | null {
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, "utf-8");
  const body    = extractTasksBody(content);

  if (body === null) return { file: filePath, tasks: [] };

  const blocks = splitIntoBlocks(body);
  const tasks: ScheduledTask[] = [];

  for (const block of blocks) {
    const classname = extractString(block, "classname");
    if (!classname) continue;

    tasks.push({
      classname,
      blocking:  extractFlag(block, "blocking"),
      minute:    extractString(block, "minute")    || "*",
      hour:      extractString(block, "hour")       || "*",
      day:       extractString(block, "day")        || "*",
      month:     extractString(block, "month")      || "*",
      dayofweek: extractString(block, "dayofweek")  || "*",
      disabled:  extractFlag(block, "disabled"),
    });
  }

  return { file: filePath, tasks };
}

/**
 * Extracts scheduled tasks from a plugin directory.
 *
 * @param pluginPath - Absolute path to the plugin root directory
 */
export function extractPluginTasks(pluginPath: string): TasksExtraction | null {
  return parseTasksPhp(join(pluginPath, "db", "tasks.php"));
}

/**
 * Returns only the task class names (sorted).
 * Useful for building quick index lists.
 */
export function getTaskClassnames(extraction: TasksExtraction): string[] {
  return extraction.tasks.map((t) => t.classname).sort();
}

/**
 * Formats a cron schedule as a human-readable string.
 * e.g. { minute: "0", hour: "* /2", day: "*", month: "*", dayofweek: "*" }
 *      => "0 * /2 * * *"
 */
export function formatCronSchedule(task: ScheduledTask): string {
  return [task.minute, task.hour, task.day, task.month, task.dayofweek].join(" ");
}
