/**
 * @file utils/plugin-types.ts
 * @description Shared Moodle plugin type → directory mapping.
 *
 * Single source of truth for the type-to-directory map used across
 * tools (explain, search, batch) and extractors (plugin).
 * Previously this map was duplicated 3+ times with inconsistent coverage
 * — explain.ts and batch.ts were missing format, filter, qtype and others.
 */

import { existsSync }     from "fs";
import { join, isAbsolute } from "path";

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

/** Maps a Moodle plugin type string to its directory path under the Moodle root. */
export const PLUGIN_TYPE_TO_DIR: Record<string, string> = {
  mod:                "mod",
  block:              "blocks",
  local:              "local",
  tool:               "admin/tool",
  auth:               "auth",
  enrol:              "enrol",
  theme:              "theme",
  report:             "report",
  format:             "course/format",
  filter:             "filter",
  qtype:              "question/type",
  availability:       "availability/condition",
  assignsubmission:   "mod/assign/submission",
  assignfeedback:     "mod/assign/feedback",
  gradereport:        "grade/report",
  gradeimport:        "grade/import",
  gradeexport:        "grade/export",
  plagiarism:         "plagiarism",
  portfolio:          "portfolio/type",
  repository:         "repository",
  profilefield:       "user/profile/field",
  workshopform:       "mod/workshop/form",
  workshopallocation: "mod/workshop/allocation",
  workshopeval:       "mod/workshop/evaluation",
  datafield:          "mod/data/field",
  datapreset:         "mod/data/preset",
  ltisource:          "mod/lti/source",
  ltiservice:         "mod/lti/service",
  quizaccess:         "mod/quiz/accessrule",
  scormreport:        "mod/scorm/report",
  tinymce:            "lib/editor/tinymce/plugins",
  atto:               "lib/editor/atto/plugins",
  editor:             "lib/editor",
  adminpresets:       "admin/presets",
  antivirus:          "lib/antivirus",
  calendartype:       "calendar/type",
  logstore:           "admin/tool/log/store",
  paygw:              "payment/gateway",
  mlbackend:          "lib/mlbackend",
  search:             "search/engine",
};

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Resolves a plugin identifier to an absolute directory path.
 * Returns null if it cannot be resolved or the path does not exist.
 *
 * Accepts:
 *   - absolute path:  "/var/www/moodle/local/myplugin"  → returned as-is
 *   - relative path:  "local/myplugin"                   → joined with moodlePath
 *   - component:      "local_myplugin"                   → resolved via type map
 */
export function resolvePluginPath(
  identifier: string,
  moodlePath:  string,
): string | null {
  // Absolute path
  if (isAbsolute(identifier)) {
    return existsSync(identifier) ? identifier : null;
  }

  // Relative path (e.g. "local/myplugin")
  if (identifier.includes("/")) {
    const candidate = join(moodlePath, identifier);
    return existsSync(candidate) ? candidate : null;
  }

  // Component format (e.g. "local_myplugin")
  if (identifier.includes("_")) {
    const underscoreIdx = identifier.indexOf("_");
    const type          = identifier.substring(0, underscoreIdx);
    const name          = identifier.substring(underscoreIdx + 1);
    const dir           = PLUGIN_TYPE_TO_DIR[type] ?? type;
    const candidate     = join(moodlePath, dir, name);
    return existsSync(candidate) ? candidate : null;
  }

  return null;
}
