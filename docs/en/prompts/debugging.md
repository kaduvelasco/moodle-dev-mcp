🌐 [Português](../../pt-br/prompts/debugging.md) | **English**
🏠 [Home](../index.md)

# Debugging Prompts

Specialized prompts for diagnosing errors, analyzing execution flows, and migrating legacy Moodle code.

---

## 🔍 Active Error Diagnosis

Helps identify the root cause of a specific error.

**Example Prompt:**

> "The plugin `local_myplugin` is generating this error: 'Table mdl_local_myplugin_data doesn't exist'. It happens when a teacher opens the settings page. What is the root cause and how do I fix it?"

---

## 🔄 Execution Flow Analysis

Useful for understanding complex or legacy plugins.

**Example Prompt:**

> "Analyze the execution flow of `local_myplugin`. Starting from the main entry points, trace what happens when a teacher accesses the plugin's main page."

---

## 🎣 Migration to the Hook API (Moodle 4.3+)

Keep your plugin modernized.

**Example Prompt:**

> "Check `local_myplugin` for legacy callbacks in `lib.php` that were replaced by the Hook API in Moodle 4.3+. For each one found, show the migration steps."

---

## ⚙️ Task and Permission Errors

Solve problems that only happen during cron execution.

**Example Prompt:**

> "The scheduled task `\local_myplugin\task\cleanup_task` is failing with 'Permission denied' when cron runs. Which file permissions or capabilities could be causing this?"

---

## 🛠️ Using the `debug_plugin` Tool

With MCP active, you can provide the error log directly:

```bash
debug_plugin
  plugin="local_myplugin"
  error="Error: Table 'mdl_local_myplugin_data' doesn't exist"
  context="Occurs when saving the settings form."
```

[← Back to Index](../index.md)
