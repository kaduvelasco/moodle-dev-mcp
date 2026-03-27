/**
 * @file tests/extractors.test.ts
 * @description Unit tests for moodle-mcp extractors.
 *
 * Tests the PHP parsing logic (regex, block splitters, Zod validation)
 * against realistic fixture strings — no filesystem required.
 *
 * Run with:
 *   npm test
 *
 * Framework: Node.js built-in test runner (node:test) — no extra deps.
 */

import { describe, it } from "node:test";
import assert           from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join }         from "path";
import { tmpdir }       from "os";

// ---------------------------------------------------------------------------
// Helpers — temporary fixture files
// ---------------------------------------------------------------------------

let TMP_DIR = "";

function setup(): string {
  TMP_DIR = join(tmpdir(), `moodle-mcp-test-${Date.now()}`);
  mkdirSync(TMP_DIR, { recursive: true });
  mkdirSync(join(TMP_DIR, "db"), { recursive: true });
  mkdirSync(join(TMP_DIR, "classes", "hook"), { recursive: true });
  mkdirSync(join(TMP_DIR, "lang", "en"), { recursive: true });
  return TMP_DIR;
}

function teardown(): void {
  if (TMP_DIR && existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
}

function write(relPath: string, content: string): string {
  const full = join(TMP_DIR, relPath);
  writeFileSync(full, content, "utf-8");
  return full;
}

// ---------------------------------------------------------------------------
// events.ts
// ---------------------------------------------------------------------------

describe("extractors/events", () => {
  it("parses a well-formed db/events.php", async () => {
    const dir = setup();
    write("db/events.php", `<?php
$observers = [
    [
        'eventname'  => '\\\\core\\\\event\\\\course_viewed',
        'callback'   => '\\\\local_test\\\\event\\\\observer::course_viewed',
        'priority'   => 100,
        'internal'   => false,
    ],
    [
        'eventname'  => '\\\\core\\\\event\\\\user_loggedin',
        'callback'   => '\\\\local_test\\\\event\\\\observer::user_loggedin',
    ],
];`);

    const { parseEventsPhp } = await import("../extractors/events.js");
    const result = parseEventsPhp(join(dir, "db", "events.php"));

    assert.ok(result, "should return extraction");
    assert.equal(result!.observers.length, 2, "should find 2 observers");

    const [first, second] = result!.observers;
    assert.equal(first.eventname, "\\core\\event\\course_viewed");
    assert.equal(first.callback,  "\\local_test\\event\\observer::course_viewed");
    assert.equal(first.priority,  100);
    assert.equal(first.internal,  false);

    // Second entry has no priority/internal — should default
    assert.equal(second.priority, 0,     "missing priority defaults to 0");
    assert.equal(second.internal, false, "missing internal defaults to false");

    teardown();
  });

  it("returns empty observers for empty $observers array", async () => {
    const dir = setup();
    write("db/events.php", "<?php\n$observers = [];\n");

    const { parseEventsPhp } = await import("../extractors/events.js");
    const result = parseEventsPhp(join(dir, "db", "events.php"));

    assert.ok(result);
    assert.equal(result!.observers.length, 0);
    teardown();
  });

  it("returns null for missing file", async () => {
    const { parseEventsPhp } = await import("../extractors/events.js");
    const result = parseEventsPhp("/nonexistent/db/events.php");
    assert.equal(result, null);
  });
});

// ---------------------------------------------------------------------------
// services.ts
// ---------------------------------------------------------------------------

describe("extractors/services", () => {
  it("parses a well-formed db/services.php with nested arrays", async () => {
    const dir = setup();
    write("db/services.php", `<?php
$functions = [
    'local_test_get_data' => [
        'classname'    => '\\\\local_test\\\\external\\\\get_data',
        'methodname'   => 'execute',
        'description'  => 'Returns plugin data.',
        'type'         => 'read',
        'ajax'         => true,
        'capabilities' => 'local/test:view',
    ],
    'local_test_save_data' => [
        'classname'    => '\\\\local_test\\\\external\\\\save_data',
        'description'  => 'Saves plugin data.',
        'type'         => 'write',
        'ajax'         => false,
    ],
];`);

    const { parseServicesPhp } = await import("../extractors/services.js");
    const result = parseServicesPhp(join(dir, "db", "services.php"));

    assert.ok(result);
    assert.equal(result!.functions.length, 2);

    const fn = result!.functions[0];
    assert.equal(fn.name,         "local_test_get_data");
    assert.equal(fn.type,         "read");
    assert.equal(fn.ajax,         true);
    assert.equal(fn.capabilities, "local/test:view");

    const fn2 = result!.functions[1];
    assert.equal(fn2.name, "local_test_save_data");
    assert.equal(fn2.ajax, false);
    assert.equal(fn2.type, "write");

    teardown();
  });

  it("returns empty functions for empty $functions array", async () => {
    const dir = setup();
    write("db/services.php", "<?php\n$functions = [];\n");

    const { parseServicesPhp } = await import("../extractors/services.js");
    const result = parseServicesPhp(join(dir, "db", "services.php"));

    assert.ok(result);
    assert.equal(result!.functions.length, 0);
    teardown();
  });
});

// ---------------------------------------------------------------------------
// tasks.ts
// ---------------------------------------------------------------------------

describe("extractors/tasks", () => {
  it("parses db/tasks.php with all fields", async () => {
    const dir = setup();
    write("db/tasks.php", `<?php
$tasks = [
    [
        'classname'  => '\\\\local_test\\\\task\\\\cleanup_task',
        'blocking'   => 0,
        'minute'     => '0',
        'hour'       => '*/2',
        'day'        => '*',
        'month'      => '*',
        'dayofweek'  => '*',
    ],
];`);

    const { parseTasksPhp, formatCronSchedule } = await import("../extractors/tasks.js");
    const result = parseTasksPhp(join(dir, "db", "tasks.php"));

    assert.ok(result);
    assert.equal(result!.tasks.length, 1);

    const task = result!.tasks[0];
    assert.equal(task.classname,  "\\local_test\\task\\cleanup_task");
    assert.equal(task.blocking,   false);
    assert.equal(task.minute,     "0");
    assert.equal(task.hour,       "*/2");
    assert.equal(formatCronSchedule(task), "0 */2 * * *");

    teardown();
  });
});

// ---------------------------------------------------------------------------
// schema.ts
// ---------------------------------------------------------------------------

describe("extractors/schema", () => {
  it("parses a well-formed db/install.xml", async () => {
    const dir = setup();
    write("db/install.xml", `<?xml version="1.0" encoding="UTF-8" ?>
<XMLDB PATH="local/test/db" VERSION="20240101">
  <TABLES>
    <TABLE NAME="local_test_records" COMMENT="Test records">
      <FIELDS>
        <FIELD NAME="id"     TYPE="int"  LENGTH="10" NOTNULL="true" SEQUENCE="true"/>
        <FIELD NAME="name"   TYPE="char" LENGTH="255" NOTNULL="true"/>
        <FIELD NAME="value"  TYPE="text" NOTNULL="false"/>
      </FIELDS>
      <KEYS>
        <KEY NAME="primary" TYPE="primary" FIELDS="id"/>
      </KEYS>
      <INDEXES>
        <INDEX NAME="name_idx" UNIQUE="false" FIELDS="name"/>
      </INDEXES>
    </TABLE>
  </TABLES>
</XMLDB>`);

    const { parseInstallXml } = await import("../extractors/schema.js");
    const result = parseInstallXml(join(dir, "db", "install.xml"));

    assert.ok(result);
    assert.equal(result!.tables.length, 1);

    const table = result!.tables[0];
    assert.equal(table.name,          "local_test_records");
    assert.equal(table.fields.length, 3);
    assert.equal(table.keys.length,   1);
    assert.equal(table.indexes.length,1);

    const idField = table.fields[0];
    assert.equal(idField.name,     "id");
    assert.equal(idField.type,     "int");
    assert.equal(idField.notnull,  true);
    assert.equal(idField.sequence, true);

    teardown();
  });

  it("returns schema with empty tables for malformed XML", async () => {
    const dir = setup();
    write("db/install.xml", "this is not xml <<>>");

    const { parseInstallXml } = await import("../extractors/schema.js");
    const result = parseInstallXml(join(dir, "db", "install.xml"));

    assert.ok(result, "should not return null");
    assert.equal(result!.tables.length, 0, "malformed XML → empty tables");
    teardown();
  });
});

// ---------------------------------------------------------------------------
// capabilities.ts
// ---------------------------------------------------------------------------

describe("extractors/capabilities", () => {
  it("parses db/access.php with archetypes", async () => {
    const dir = setup();
    write("db/access.php", `<?php
$capabilities = [
    'local/test:view' => [
        'riskbitmask'  => RISK_PERSONAL,
        'captype'      => 'read',
        'contextlevel' => CONTEXT_COURSE,
        'archetypes'   => [
            'teacher'        => CAP_ALLOW,
            'editingteacher' => CAP_ALLOW,
            'manager'        => CAP_ALLOW,
        ],
    ],
    'local/test:manage' => [
        'captype'      => 'write',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes'   => [
            'manager' => CAP_ALLOW,
        ],
    ],
];`);

    const { parseAccessPhp } = await import("../extractors/capabilities.js");
    const result = parseAccessPhp(join(dir, "db", "access.php"));

    assert.ok(result);
    assert.equal(result!.capabilities.length, 2);

    const cap = result!.capabilities[0];
    assert.equal(cap.name,         "local/test:view");
    assert.equal(cap.captype,      "read");
    assert.equal(cap.contextlevel, "CONTEXT_COURSE");
    assert.equal(cap.archetypes["teacher"], "CAP_ALLOW");

    teardown();
  });
});

// ---------------------------------------------------------------------------
// plugin.ts
// ---------------------------------------------------------------------------

describe("extractors/plugin", () => {
  it("detects plugin metadata from version.php and lang file", async () => {
    const dir = setup();

    write("version.php", `<?php
defined('MOODLE_INTERNAL') || die();
$plugin->component = 'local_test';
$plugin->version   = 2024010100;
$plugin->requires  = 2023100900;
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0.0';
`);

    write("lang/en/local_test.php", `<?php
$string['pluginname'] = 'Test Plugin';
`);

    const { detectPlugin } = await import("../extractors/plugin.js");
    const info = detectPlugin(dir);

    assert.equal(info.component,    "local_test");
    assert.equal(info.version,      "2024010100");
    assert.equal(info.requires,     "2023100900");
    assert.equal(info.maturity,     "MATURITY_STABLE");
    assert.equal(info.displayName,  "Test Plugin");

    teardown();
  });

  it("throws for non-existent directory", async () => {
    const { detectPlugin } = await import("../extractors/plugin.js");
    assert.throws(() => detectPlugin("/nonexistent/plugin"), /not found/i);
  });
});

// ---------------------------------------------------------------------------
// hooks.ts
// ---------------------------------------------------------------------------

describe("extractors/hooks", () => {
  it("parses db/hooks.php callbacks", async () => {
    const dir = setup();
    write("db/hooks.php", `<?php
$callbacks = [
    [
        'hookname'       => '\\\\core\\\\hook\\\\output\\\\before_http_headers',
        'callback'       => '\\\\local_test\\\\hook_callbacks::before_headers',
        'priority'       => 500,
        'defaultenabled' => true,
    ],
];`);

    const { extractPluginHooks } = await import("../extractors/hooks.js");
    const result = await extractPluginHooks(dir, "local_test");

    assert.equal(result.callbacks.length, 1);
    assert.equal(result.callbacks[0].hookname, "\\core\\hook\\output\\before_http_headers");
    assert.equal(result.callbacks[0].priority, 500);

    teardown();
  });

  it("detects legacy callbacks that have hook replacements", async () => {
    const dir = setup();
    write("lib.php", `<?php
function local_test_before_footer() {
    // legacy callback
}
function local_test_some_other_function() {
    // not a known legacy callback
}
`);

    const { extractPluginHooks } = await import("../extractors/hooks.js");
    const result = await extractPluginHooks(dir, "local_test");

    assert.equal(result.legacyWarnings.length, 1);
    assert.equal(result.legacyWarnings[0].legacyFunction, "local_test_before_footer");
    assert.ok(result.legacyWarnings[0].replacedBy.includes("before_footer"));

    teardown();
  });
});

// ---------------------------------------------------------------------------
// config.ts
// ---------------------------------------------------------------------------

describe("config", () => {
  it("loads config from environment variables", async () => {
    const originalPath    = process.env["MOODLE_PATH"];
    const originalVersion = process.env["MOODLE_VERSION"];

    process.env["MOODLE_PATH"]    = "/tmp/test-moodle";
    process.env["MOODLE_VERSION"] = "4.4";

    // Re-import to pick up env changes
    const { loadConfig } = await import("../config.js");
    const config = loadConfig();

    assert.ok(config,                              "should return config from ENV");
    assert.equal(config!.moodlePath,    "/tmp/test-moodle");
    assert.equal(config!.moodleVersion, "4.4");
    assert.equal(config!.source,        "env");

    // Restore
    if (originalPath    !== undefined) process.env["MOODLE_PATH"]    = originalPath;
    else delete process.env["MOODLE_PATH"];
    if (originalVersion !== undefined) process.env["MOODLE_VERSION"] = originalVersion;
    else delete process.env["MOODLE_VERSION"];
  });
});

// ---------------------------------------------------------------------------
// utils/plugin-types.ts
// ---------------------------------------------------------------------------

describe("utils/plugin-types", () => {
  it("resolves component format to path", async () => {
    const dir = setup();
    // Create a fake plugin dir
    const pluginDir = join(dir, "local", "myplugin");
    mkdirSync(pluginDir, { recursive: true });

    const { resolvePluginPath } = await import("../utils/plugin-types.js");
    const resolved = resolvePluginPath("local_myplugin", dir);

    assert.equal(resolved, pluginDir);
    teardown();
  });

  it("resolves relative path format", async () => {
    const dir = setup();
    const pluginDir = join(dir, "mod", "quiz");
    mkdirSync(pluginDir, { recursive: true });

    const { resolvePluginPath } = await import("../utils/plugin-types.js");
    const resolved = resolvePluginPath("mod/quiz", dir);

    assert.equal(resolved, pluginDir);
    teardown();
  });

  it("returns null for non-existent path", async () => {
    const { resolvePluginPath } = await import("../utils/plugin-types.js");
    const resolved = resolvePluginPath("local_nonexistent", "/tmp");
    assert.equal(resolved, null);
  });
});
