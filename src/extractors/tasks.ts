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
 * Extracts string values for a given PHP array key.
 */
function extractStringValues(content: string, key: string): string[] {
  const pattern = new RegExp(
    `'${key}'\\s*=>\\s*['"]([^'"]*)['"\\s,]`,
    "g"
  );

  const results: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    results.push(match[1]);
  }

  return results;
}

/**
 * Extracts integer/boolean values for a given PHP array key.
 * Returns true when value is "1", false when "0".
 */
function extractFlagValues(content: string, key: string): boolean[] {
  const pattern = new RegExp(
    `'${key}'\\s*=>\\s*([01])`,
    "g"
  );

  const results: boolean[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    results.push(match[1] === "1");
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a db/tasks.php file and returns all scheduled task definitions.
 *
 * @param filePath - Absolute path to the tasks.php file
 */
export function parseTasksPhp(filePath: string): TasksExtraction | null {
  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, "utf-8");

  const classnames  = extractStringValues(content, "classname");
  const minutes     = extractStringValues(content, "minute");
  const hours       = extractStringValues(content, "hour");
  const days        = extractStringValues(content, "day");
  const months      = extractStringValues(content, "month");
  const daysOfWeek  = extractStringValues(content, "dayofweek");
  const blockings   = extractFlagValues(content, "blocking");
  const disableds   = extractFlagValues(content, "disabled");

  const count = classnames.length;
  const tasks: ScheduledTask[] = [];

  for (let i = 0; i < count; i++) {
    tasks.push({
      classname:  classnames[i]  ?? "",
      blocking:   blockings[i]   ?? false,
      minute:     minutes[i]     ?? "*",
      hour:       hours[i]       ?? "*",
      day:        days[i]        ?? "*",
      month:      months[i]      ?? "*",
      dayofweek:  daysOfWeek[i]  ?? "*",
      disabled:   disableds[i]   ?? false,
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
