🇧🇷 [Português (BR)](../../../pt-br/guides/workflows/examples.md) | **English** | 🏠 [Index](../../index.md)

---

# Usage Examples

Real-world use cases with ready-to-use prompts, step sequences, and expected outcomes. Use these examples as a starting point for your own development workflows.

---

## 1. Full Workflow: From Zero to Working Plugin

This example shows the complete sequence of a development cycle, from scaffold to first commit.

**Step 1 — Create the structure:**

```
scaffold_plugin
  type="local"
  name="audit_log"
  description="Records an audit history of user actions"
  features="database tables, scheduled tasks, capabilities, event observers"
```

**Step 2 — Generate development context:**

```
Generate the AI context for the local_audit_log plugin I just created.
```

**Step 3 — Enable monitoring:**

```
Start monitoring local_audit_log for file changes.
```

**Step 4 — Implement logic:**

```
Load the context for local_audit_log. I need to implement the event observer
for core\event\user_loggedin. It should record in the
local_audit_log_entries table: userid, eventname, ip, and timecreated.
```

**Step 5 — Review before commit:**

```
/review_plugin plugin="local/audit_log" focus="security"
```

**What the server does at each step:**
- Step 1: injects Moodle context + standards for the detected version — AI generates correct files
- Step 2: `generate_plugin_context` — creates 11 `PLUGIN_*.md` files in the plugin directory
- Step 3: `watch_plugins action="start"` — updates context automatically on save
- Step 4: `get_plugin_info` — AI reads `PLUGIN_DB_TABLES.md` and generates the observer with real table and field names
- Step 5: `review_plugin` prompt — AI analyzes with focus on capability checks, output escaping, and SQL injection

---

## 2. Creating a Local Plugin from Scratch

**Scenario:** You need a local plugin that displays a participation report by course for coordinators.

**Scaffold prompt:**

```
scaffold_plugin
  type="local"
  name="reports"
  description="Participation and attendance reports by course for coordinators"
  features="database tables, web services, capabilities, scheduled tasks"
```

**After creating the files, load context and continue:**

```
Generate context for local_reports. Then create the
local_reports_cache table in db/install.xml with fields: id, courseid,
userid, participation_count (int), last_access (int), and timegenerated (int).
```

```
Now create the scheduled task in classes/task/build_cache_task.php.
It should rebuild expired records (older than 24h) from the
local_reports_cache table using Moodle core data.
```

**Expected result:** plugin with complete structure, correct XMLDB table with `NOTNULL` and `SEQUENCE` attributes, scheduled task implementing `\core\task\scheduled_task`, and `local/reports:viewreport` capability.

---

## 3. Analyzing an Existing Plugin

**Scenario:** You have taken over maintenance of a legacy plugin and need to quickly understand what it does.

**Step 1 — Load context and request summary:**

```
Load the context for local_legacy and give me a full analysis:
architecture, database tables, registered events, web services,
capabilities, and main execution flow.
```

**Step 2 — Drill down into a specific area:**

```
Use explain_plugin to explain in detail the database section
of local_legacy. Are there tables without indexes or poorly typed fields?
```

**Step 3 — Check for legacy callbacks:**

```
Does local_legacy use lib.php callbacks that have been replaced
by the Hook API in Moodle 4.3+? List each one with migration steps.
```

**Step 4 — Find core dependencies:**

```
Which core functions is local_legacy using that are marked
as @deprecated? Suggest the correct replacements.
```

---

## 4. Debugging Errors

**Scenario A — Database error:**

```
local_myplugin is throwing this error when opening the main page:

"Table 'moodle.mdl_local_myplugin_sessions' doesn't exist"

Load the plugin context and help me identify the root cause.
The error only occurs for non-administrator users.
```

**Scenario B — Class not found:**

```
I received this error in the Moodle log:

"Cannot find class 'local_myplugin\output\renderer'"

The error appears when accessing the plugin's index.php. Analyze the
structure of local_myplugin and tell me what is missing or
has an incorrect namespace.
```

**Scenario C — Silent scheduled task (not executing):**

```
The scheduled task \local_myplugin\task\sync_task does not appear in
the cron execution log. Load the plugin context and check the
definition in db/tasks.php for configuration errors.
```

**Using the debug_plugin prompt:**

```
/debug_plugin
  plugin="local_myplugin"
  error="Table 'moodle.mdl_local_myplugin_sessions' doesn't exist"
  context="Occurs when opening the main page for non-administrator users"
```

---

## 5. Code Review Before Committing

**Security review:**

```
/review_plugin plugin="local/myplugin" focus="security"
```

Checks: missing `require_capability()`, output without `s()` or `format_text()`, parameters without `required_param()`, queries with string concatenation instead of placeholders.

**Coding standards review:**

```
/review_plugin plugin="local/myplugin" focus="standards"
```

Checks: namespace conventions, method visibility, PHPDoc completeness, Frankenstyle naming.

**Database review:**

```
/review_plugin plugin="local/myplugin" focus="database"
```

Checks: missing indexes on columns used in `WHERE`, N+1 pattern (loop with `get_record` inside), missing `$DB->get_in_or_equal()` for `IN` clauses.

**Performance review:**

```
/review_plugin plugin="local/myplugin" focus="performance"
```

Checks: queries without cache for rarely changed data, missing pagination for large lists, unnecessary `get_records` when only one record is needed.

---

## 6. API Search and Queries

**Finding functions for a specific task:**

```
Which core API functions should I use to:
1. Check if a user is enrolled in a course
2. Send a notification message to a user
3. Get a user's grade for a specific activity

Use search_api and prefer public, non-deprecated functions.
```

**Checking if a function exists in the installed version:**

```
Does enrol_get_course_users() exist in my version of Moodle?
What is the full signature and in which file is it defined?
```

**Finding alternatives for deprecated functions:**

```
local_myplugin uses add_to_log(). This function is deprecated.
Search the core API for the recommended alternative and show how to migrate.
```

**Exploring available events:**

```
Which core events can I observe to track when a user
completes an activity? List the events with their full namespaces
and the data each one provides.
```

---

## 7. Migration to the Hook API (Moodle 4.3+)

**Scenario:** Your plugin uses legacy callbacks from `lib.php` that were replaced by the Hook API.

**Step 1 — Identify legacy callbacks:**

```
Load the context for local_myplugin and list all lib.php callbacks
that have been replaced by the Hook API in Moodle 4.3+.
For each one, provide the callback name, the equivalent hook, and
whether migration is mandatory or optional.
```

**Step 2 — Generate the migration:**

```
Migrate the local_myplugin_before_footer() callback from lib.php to the Hook API.
Generate:
1. The entry in db/hooks.php
2. The callback class in classes/hook_callbacks.php
3. The method that replaces the current logic
Keep the logic exactly the same, only adapting the structure.
```

**Step 3 — Verify the migration:**

```
Regenerate the context for local_myplugin and confirm that the
local_myplugin_before_footer() callback is no longer listed as legacy
in the callback index.
```

---

## 8. Packaging a Plugin for Distribution

**Scenario:** You have finished developing a plugin and want to generate a clean ZIP file to share or install on another Moodle instance.

**Package the plugin:**

```
Generate a release version of the local_caedauth plugin.
```

or

```
Publish the local_caedauth plugin.
```

The assistant will call `release_plugin` with `component="local_caedauth"`, read the version from `version.php`, and generate `local_caedauth_2026041000.zip` in the current working directory.

**What is excluded from the ZIP** (files remain in the project):

- `PLUGIN_*.md` — context files generated by moodle-dev-mcp
- `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` — AI assistant context files
- `.moodle-mcp-dev` — development marker

**Expected output:**

```
✅ Plugin packaged successfully: local_caedauth_2026041000.zip

Component: local_caedauth
Version:   2026041000
Output:    /current/working/dir/local_caedauth_2026041000.zip
Source:    /var/www/moodle/local/caedauth

Excluded from ZIP (kept in project):
  ✖ PLUGIN_AI_CONTEXT.md
  ✖ PLUGIN_STRUCTURE.md
  ✖ CLAUDE.md
  ✖ .moodle-mcp-dev
```

> If the component is not specified, the assistant will ask for it before proceeding.

---

## 💡 General Tips

**Be specific about the plugin:**
Instead of "analyze my plugin", prefer "load the context for `local_myplugin` and...". This ensures the AI uses the correct tool before responding.

**Use prompts for complex tasks:**
For scaffold, review, and debugging, the `scaffold_plugin`, `review_plugin`, and `debug_plugin` prompts inject additional context automatically. In Gemini Code Assist (Agent Mode), they are available as slash commands.

**Regenerate context after significant changes:**
After adding new tables, classes, or callbacks, ask: _"Regenerate the context for local_myplugin."_ This keeps `PLUGIN_AI_CONTEXT.md` in sync with the current state of the code.

---

## 🔖 Session Continuity

AI clients do not retain conversation memory between sessions by default. Each time you open a new session, the assistant starts fresh — without knowing which plugins you were working on, what decisions were made, or the current development state.

`CLAUDE.md`, `GEMINI.md`, and `AGENTS.md` are the most reliable way to maintain continuity — they work across any session without needing to remember anything manually.

### Recommended strategy: a living context file

Ask the assistant to update the context file at the end of each significant session:

```
Update CLAUDE.md with the current state of development:
which plugins are in progress, what was implemented today,
and what the next steps are.
```

The assistant will edit the file directly in the Moodle directory. In the next session, it will read that state automatically.

### Saving and resuming sessions by client

**Claude Code** — no native session history, but `CLAUDE.md` is read automatically. Update it at the end of long sessions.

**Gemini CLI** — supports saving and resuming sessions:

```bash
# Inside the Gemini CLI, save the current session
/chat save moodle-dev

# Next time, resume where you left off
/chat resume moodle-dev
```

**OpenAI Codex** — supports resuming the most recent session:

```bash
# Resume the most recent conversation from the current directory
codex resume --last
```

### Context state block template

Add a section like this to your `CLAUDE.md` / `GEMINI.md` / `AGENTS.md` and ask the assistant to update it regularly:

```markdown
## Current Development State

Last updated: 2025-01-15

### In progress
- local_reports — implementing cache task (build_cache_task.php)
  - local_reports_cache table created ✅
  - Scheduled task created ✅
  - Fill logic: pending ⏳

### Next steps
1. Implement the participation query in build_cache_task.php
2. Create the report page (index.php)
3. Add capability local/reports:viewreport

### Decisions made
- Cache with 24h TTL (records with timegenerated > now - 86400 are rebuilt)
- Report accessible only for managers and editingteachers
```

---

## ➡️ Next Steps

- [Tools Reference](../../reference/tools.md) — complete parameters for all tools
- [Prompts Reference](../../reference/prompts.md) — details of scaffold_plugin, review_plugin, and debug_plugin
- [Common Issues](../../troubleshooting/common-issues.md) — when something doesn't work as expected
- [Back to Index](../../index.md)
