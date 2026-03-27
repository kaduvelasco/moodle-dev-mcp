🌐 [Português](../../../pt-br/guides/workflows/examples.md) | **English** | 🏠 [Index](../../index.md)

---

# Usage Examples

Real-world use cases with ready-to-use prompts, step sequences, and expected results. Use these examples as a starting point for your own development workflows.

---

# 1. Full Workflow: From Zero to a Working Plugin

This example shows the full development cycle — from scaffold to the first commit.

### Step 1 — Create the structure

```
scaffold_plugin
  type="local"
  name="audit_log"
  description="Logs an audit history of user actions"
  features="database tables, scheduled tasks, capabilities, event observers"
```

### Step 2 — Generate development context

```
Generate the AI context for the plugin local_audit_log that I just created.
```

### Step 3 — Enable monitoring

```
Start monitoring the plugin local_audit_log for file changes.
```

### Step 4 — Implement logic

```
Load the context of the plugin local_audit_log. I need to implement the
event observer for core\event\user_loggedin. It should register in the
table local_audit_log_entries the fields: userid, eventname, ip and timecreated.
```

### Step 5 — Review before commit

```
/review_plugin plugin="local/audit_log" focus="security"
```

### What the server does in each step

- **Step 1:** Injects Moodle context + version-specific patterns — the AI generates correct files
- **Step 2:** `generate_plugin_context` — creates 11 `PLUGIN_*.md` files in the plugin directory
- **Step 3:** `watch_plugins action="start"` — automatically updates context when files change
- **Step 4:** `get_plugin_info` — the AI reads `PLUGIN_DB_TABLES.md` and generates the observer with real table and field names
- **Step 5:** `review_plugin` prompt — analyzes capability checks, output escaping, and SQL injection risks

---

# 2. Creating a Local Plugin from Scratch

### Scenario

You need a local plugin that displays course participation reports for coordinators.

### Scaffold prompt

```
scaffold_plugin
  type="local"
  name="relatorios"
  description="Course participation and attendance reports for coordinators"
  features="database tables, web services, capabilities, scheduled tasks"
```

### After creating the files

```
Generate the context for plugin local_relatorios. Then create the table
local_relatorios_cache in db/install.xml with the fields: id, courseid,
userid, participation_count (int), last_access (int) and timegenerated (int).
```

```
Now create the scheduled task in classes/task/build_cache_task.php.
It should rebuild expired records (older than 24h) in the
local_relatorios_cache table using Moodle core data.
```

### Expected result

A plugin with:

- Complete structure
- Proper XMLDB table definition
- Correct `NOTNULL` and `SEQUENCE` attributes
- Scheduled task implementing `\core\task\scheduled_task`
- Capability `local/relatorios:viewreport`

---

# 3. Analyzing an Existing Plugin

### Scenario

You inherited maintenance of a legacy plugin and need to quickly understand what it does.

### Step 1 — Load context and request a summary

```
Load the context of plugin local_legado and give me a full analysis:
architecture, database tables, registered events, web services,
capabilities, and main execution flow.
```

### Step 2 — Dive deeper into a specific area

```
Use explain_plugin to explain the database section of
plugin local_legado in detail. Are there tables without indexes
or poorly typed fields?
```

### Step 3 — Check legacy callbacks

```
Does plugin local_legado use callbacks in lib.php that have been
replaced by the Hook API in Moodle 4.3+? List each one with
migration steps.
```

### Step 4 — Find core dependencies

```
Which core functions used by plugin local_legado are marked
as @deprecated? Suggest the correct replacements.
```

---

# 4. Debugging Errors

### Scenario A — Database error

```
The plugin local_myplugin is generating this error when opening
the main page:

"Table 'moodle.mdl_local_myplugin_sessions' doesn't exist"

Load the plugin context and help me identify the root cause.
The error occurs only for non-admin users.
```

---

### Scenario B — Class not found

```
I received this error in the Moodle log:

"Cannot find class 'local_myplugin\output\renderer'"

The error appears when accessing the plugin index.php page.
Analyze the plugin structure and tell me what is missing
or incorrectly namespaced.
```

---

### Scenario C — Scheduled task not running

```
The scheduled task \local_myplugin\task\sync_task does not
appear in the cron execution log. Load the plugin context
and check db/tasks.php for configuration issues.
```

---

### Using the debug_plugin prompt

```
/debug_plugin
  plugin="local_myplugin"
  error="Table 'moodle.mdl_local_myplugin_sessions' doesn't exist"
  context="Occurs when opening the main page for non-admin users"
```

---

# 5. Code Review Before Commit

### Security review

```
/review_plugin plugin="local/myplugin" focus="security"
```

Checks for:

- Missing `require_capability()`
- Unescaped output (missing `s()` or `format_text()`)
- Missing `required_param()` validation
- SQL concatenation instead of placeholders

---

### Coding standards review

```
/review_plugin plugin="local/myplugin" focus="standards"
```

Checks for:

- Namespace conventions
- Method visibility
- PHPDoc completeness
- Frankenstyle naming

---

### Database review

```
/review_plugin plugin="local/myplugin" focus="database"
```

Checks for:

- Missing indexes in `WHERE` columns
- N+1 query patterns
- Missing `$DB->get_in_or_equal()` in `IN` clauses

---

### Performance review

```
/review_plugin plugin="local/myplugin" focus="performance"
```

Checks for:

- Queries without caching
- Missing pagination for large listings
- Using `get_records()` when `get_record()` would suffice

---

# 6. API Search and Exploration

### Finding functions for a specific task

```
Which Moodle core API functions should I use to:
1. Check if a user is enrolled in a course
2. Send a notification message to a user
3. Get a user's grade for a specific activity

Use search_api and prefer public, non-deprecated functions.
```

---

### Checking if a function exists

```
Does the function enrol_get_course_users() exist in my Moodle version?
What is the full signature and in which file is it defined?
```

---

### Finding replacements for deprecated functions

```
Plugin local_myplugin uses add_to_log(). This function is deprecated.
Search the core API for the recommended alternative and
show how to migrate.
```

---

### Exploring available events

```
Which core events can I observe to track when a user
completes an activity? List events with their full
namespaces and available data.
```

---

# 7. Migrating to Hook API (Moodle 4.3+)

### Scenario

Your plugin uses legacy `lib.php` callbacks replaced by the Hook API.

---

### Step 1 — Identify legacy callbacks

```
Load the context of plugin local_myplugin and list all callbacks
in lib.php replaced by the Hook API in Moodle 4.3+.
For each one, show the equivalent hook and whether
migration is mandatory or optional.
```

---

### Step 2 — Generate the migration

```
Migrate the callback local_myplugin_before_footer() from lib.php
to the Hook API. Generate:

1. Entry in db/hooks.php
2. Callback class in classes/hook_callbacks.php
3. Method replacing the current logic

Keep the logic identical, only adapting the structure.
```

---

### Step 3 — Validate the migration

```
Regenerate the context of plugin local_myplugin and confirm
that callback local_myplugin_before_footer() is no longer
listed as legacy in the callback index.
```

---

# 💡 General Tips

### Be specific about the plugin

Instead of saying:

```
Analyze my plugin
```

Prefer:

```
Load the context of plugin local_myplugin and...
```

This ensures the AI calls the correct tool before answering.

---

### Use prompts for complex tasks

Prompts like:

- `scaffold_plugin`
- `review_plugin`
- `debug_plugin`

automatically inject additional context.

In Gemini Code Assist (Agent Mode), they are available as **slash commands**.

---

### Regenerate context after major changes

After adding new tables, classes, or callbacks, request:

```
Regenerate the context of plugin local_myplugin.
```

This keeps `PLUGIN_AI_CONTEXT.md` synchronized with the current code state.

---

# ➡️ Next Steps

- [Tools Reference](../../reference/tools.md) — full parameters for all tools
- [Prompts Reference](../../reference/prompts.md) — details about scaffold_plugin, review_plugin, and debug_plugin
- [Common Issues](../../troubleshooting/common-issues.md) — troubleshooting when something doesn't work as expected
- [Back to Index](../../index.md)
