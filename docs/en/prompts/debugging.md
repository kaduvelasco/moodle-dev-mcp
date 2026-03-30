# Debugging Prompts

[🇧🇷 Leia em Português](../../pt-br/prompts/debugging.md)  |  [← Back to Index](../index.md)

---

Prompts for debugging Moodle plugin errors with full context.

## Error diagnosis

```
The plugin local_meuplugin throws this error:
"Table 'mdl_local_meuplugin_data' doesn't exist"
It happens when a teacher opens the settings page.
What is the root cause and how do I fix it?
```

```
local_meuplugin is triggering:
"Call to undefined method local_meuplugin\output\renderer::render_summary()"
Trace where render_summary should be defined based on the plugin structure.
```

```
The scheduled task \local_meuplugin\task\cleanup_task is failing
with "Permission denied" on cron runs. What file permissions or
capability definitions could be causing this?
```

## Runtime flow analysis

```
Analyze the runtime flow of local_meuplugin. Starting from the
main entry points, trace what happens when a teacher accesses
the plugin's main page.
```

## Hook API migration warnings

```
Check local_meuplugin for legacy lib.php callbacks that have
been replaced by the Hook API in Moodle 4.3+.
For each one found, show the migration steps.
```

## Using the debug_plugin prompt

The built-in `debug_plugin` MCP prompt auto-detects the error type:

```
debug_plugin
  plugin="local_meuplugin"
  error="Error: Table 'mdl_local_meuplugin_data' doesn't exist"
  context="Occurs when a teacher opens the plugin settings page"
```

Available as `/debug_plugin` slash command in Gemini Code Assist Agent mode.

## Maintaining Context in Long Debug Sessions

Complex debugging can require multiple iterations. To maintain continuity:

```
Load the context for local_myplugin.
Continuing yesterday's debug: the "Table doesn't exist" error for mdl_local_myplugin_data.
Already checked: db/install.xml is correct and the plugin was reinstalled.
The error persists only in course context (CONTEXT_COURSE).
Continue the investigation from here.
```

When the root cause is found, record it for future reference:

```
Update CLAUDE.md recording: the "Table doesn't exist" error in local_myplugin
was caused by X. Solution applied: Y.
```

**Gemini CLI** — to resume the debug session exactly where you left off:

```bash
/chat save debug-local-myplugin
# Next session:
/chat resume debug-local-myplugin
```

**OpenAI Codex** — to resume the most recent session:

```bash
codex resume --last
```


---

[← Back to Index](../index.md)
