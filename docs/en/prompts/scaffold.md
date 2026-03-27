🌐 [Português](../../pt-br/prompts/plugin-scaffold.md) | **English**
🏠 [Home](../index.md)

# Scaffold Prompts (Plugin Creation)

These prompts help generate the complete structure of a Moodle plugin from scratch, ensuring that no essential file (such as `version.php` or `db/install.xml`) is forgotten.

---

## 🏗️ Creating a Local Plugin

Use this prompt for general logic plugins or integrations.

**Example Prompt:**

> "Create the complete scaffold of a Moodle 4.5 local plugin called `local_reports`.
> Objective: generate custom attendance reports.
> Required: Table `local_reports_config`, a daily scheduled Task, and a Capability for teachers."

---

## 🧩 Creating an Activity Module (mod)

Ideal for activities that appear in the course timeline.

**Example Prompt:**

> "Create the scaffold of an activity module called `mod_checklist`.
> Include the standard functions in `lib.php` (add/update/delete_instance) and a `checklist_item` table in the database."

---

## ⚡ Using the `scaffold_plugin` Tool

If you are using an MCP-compatible client (such as Gemini Agent or Claude Code), you can use the tool directly in a simplified way:

scaffold_plugin
type="local"
name="mytools"
description="Reporting tools for coordinators"
features="database, tasks, capabilities"

---

[← Back to Index](../index.md)
