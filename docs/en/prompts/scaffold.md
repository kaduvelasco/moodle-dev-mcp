# Plugin Scaffold Prompts

[🇧🇷 Leia em Português](../../pt-br/prompts/plugin-scaffold.md)  |  [← Back to Index](../index.md)

---

Prompts for scaffolding complete Moodle plugins from scratch.

## Local plugin

```
Scaffold a complete Moodle 4.4 local plugin called local_relatorios.
Purpose: generates custom attendance and participation reports.
Required:
- DB tables: local_relatorios_config (per-course settings) and
  local_relatorios_cache (cached report data with expiry)
- Scheduled task: rebuild expired cache entries every 6 hours
- Capability: local/relatorios:viewreports (for teachers)
- Web service: local_relatorios_get_report (returns JSON data)
- Event observer: listens to core\event\course_viewed to track access
Generate all required files with proper Moodle coding standards.
```

## Activity module

```
Scaffold a Moodle 4.4 activity module called mod_checklist.
Purpose: allows teachers to create checklists that students complete.
Required:
- Standard mod callbacks in lib.php (add/update/delete_instance,
  supports, get_coursemodule_info)
- DB table: checklist_item (id, checklistid, text, sortorder)
- Capability: mod/checklist:submit (students), mod/checklist:manage (teachers)
- View page: view.php with completion tracking
Generate all required files following the standard mod structure.
```

## Block plugin

```
Scaffold a Moodle 4.4 block plugin called block_coursestats.
Purpose: displays course statistics in a sidebar block.
Required:
- block_base class extension with applicable_formats() for courses
- Caching using Moodle's MUC (Cache API)
- Capability: block/coursestats:view
Generate all required files.
```

## Using the scaffold_plugin prompt

The built-in `scaffold_plugin` MCP prompt injects full Moodle context automatically:

```
scaffold_plugin
  type="local"
  name="mytools"
  description="Provides custom reporting tools for course managers"
  features="database tables, scheduled tasks, web services, capabilities"
```

Available as `/scaffold_plugin` slash command in Gemini Code Assist Agent mode.

## Marking the Plugin as Under Development

After scaffolding, mark the plugin so the server recognizes it as under development:

```bash
touch /your/moodle/local/myplugin/.moodle-mcp-dev
```

Or ask the assistant directly:

```
Generate context for local_mytools and mark it as under development.
```

With the marker in place, `watch_plugins`, `plugin_batch mode="dev"`, and `list_dev_plugins` will automatically include this plugin.

## Maintaining Context Between Sessions

When starting a new development session for the plugin, include the current state in your prompt:

```
Load the context for local_mytools.
Continuing from yesterday: the structure was created with scaffold_plugin.
Next step: implement the scheduled task in classes/task/sync_task.php.
```

Or ask the assistant to update the project context file:

```
Update CLAUDE.md with the current state: local_mytools plugin created with scaffold,
next step is to implement the scheduled task.
```


---

[← Back to Index](../index.md)
