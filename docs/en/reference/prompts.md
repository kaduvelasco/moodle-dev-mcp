🌐 [Português](../../pt-br/reference/prompts.md) | **English** | 🏠 [Index](../index.md)

---

# Prompts Reference (MCP)

**MCP Prompts** are specialized templates that combine precise instructions with real-time context from your Moodle installation. Unlike a tool — which performs an action — a prompt guides the AI on **how** to perform a complex task, automatically injecting coding standards, few-shot examples, and the relevant installation indexes.

---

## How Prompts Work

When you invoke an MCP prompt, the server automatically assembles a structured instruction in three layers before sending it to the AI:

```
┌─────────────────────────────────────────────┐
│  1. System Instruction                       │
│     Defines the AI’s role: Moodle Core       │
│     Developer with knowledge of the version  │
│     detected in your installation.           │
├─────────────────────────────────────────────┤
│  2. Context Injection (automatic)            │
│     Attaches MOODLE_DEV_RULES.md,            │
│     MOODLE_API_INDEX.md and the relevant     │
│     PLUGIN_*.md files for the task.          │
├─────────────────────────────────────────────┤
│  3. Few-Shot Examples                        │
│     Provides input/output examples to        │
│     ensure the correct code format.          │
└─────────────────────────────────────────────┘
```

**Without an MCP prompt:** the AI responds with generic Moodle knowledge, without knowing your version, installed plugins, or installation standards.

**With an MCP prompt:** the AI receives the real installation context + version-specific standards + examples of the expected format — before you even type what you want to do.

---

## Available Prompts

### `scaffold_plugin`

Generates the complete structure of a new Moodle plugin following the standards of the version detected in the installation.

**Parameters:**

| Parameter     | Type   | Required | Description                                                                                                                            |
| ------------- | ------ | :------: | -------------------------------------------------------------------------------------------------------------------------------------- |
| `type`        | string |    ✅    | Plugin type: `local`, `mod`, `block`, `auth`, `enrol`, `report`, etc.                                                                  |
| `name`        | string |    ✅    | Short plugin name in lowercase without hyphens (e.g., `mytools`, `reports`)                                                            |
| `description` | string |    ✅    | Description of the plugin’s purpose in one sentence                                                                                    |
| `features`    | string |    ❌    | Desired features separated by commas: `database tables`, `scheduled tasks`, `capabilities`, `web services`, `event observers`, `hooks` |

**How to use:**

```
scaffold_plugin
  type="local"
  name="audit_log"
  description="Records an audit history of user actions"
  features="database tables, scheduled tasks, capabilities, event observers"
```

In Gemini Code Assist (Agent mode):

```
/scaffold_plugin type="local" name="audit_log" description="Audit history" features="database tables, capabilities"
```

**What is automatically injected:** detected Moodle version, namespace conventions, expected directory structure, correct `version.php` format, `db/install.xml` examples, and capability naming patterns.

→ Practical examples: [Plugin Scaffold](../guides/prompts/plugin-scaffold.md)

---

### `review_plugin`

Performs a contextualized technical code review on an existing plugin, with configurable focus.

**Parameters:**

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | :------: | ------------------------------------------------------ |
| `plugin`  | string |    ✅    | Plugin Frankenstyle (`local/mytools`) or relative path |
| `focus`   | string |    ❌    | Review focus. Default: `all`                           |

**`focus` options:**

| Value         | What it checks                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `all`         | Full review covering all aspects below                                                                                      |
| `security`    | Missing `require_capability()`, unescaped output, missing `required_param()`, direct SQL concatenation                      |
| `performance` | N+1 queries, missing caching for rarely changed data, `get_records` where a single record would suffice, missing pagination |
| `standards`   | Namespace and Frankenstyle naming, method visibility, PHPDoc, file conventions                                              |
| `database`    | Missing indexes in `WHERE` columns, missing `get_in_or_equal()` for `IN` clauses, upgrade steps without version validation  |
| `apis`        | Deprecated functions in use, available alternatives in the installed version, incorrect use of core APIs                    |

**How to use:**

```
/review_plugin plugin="local/mytools" focus="security"
```

```
Run review_plugin on plugin local_mytools focusing on security
and Moodle coding standards.
```

**What is automatically injected:** complete plugin context (`PLUGIN_AI_CONTEXT.md`), coding standards (`MOODLE_DEV_RULES.md`), API index to check deprecations, and few-shot examples of the expected review format with severity levels.

→ Practical examples: [Review Prompts](../guides/prompts/reviews.md)

---

### `debug_plugin`

Diagnoses a specific Moodle error with the full context of the affected plugin. Automatically detects the error type and injects the most relevant debugging strategies.

**Parameters:**

| Parameter | Type   | Required | Description                                                       |
| --------- | ------ | :------: | ----------------------------------------------------------------- |
| `plugin`  | string |    ✅    | Frankenstyle (`local_mytools`) or plugin path                     |
| `error`   | string |    ✅    | Full error message copied from the log or screen                  |
| `context` | string |    ❌    | Additional context: when the error occurs, which user, which page |

**How to use:**

```
/debug_plugin
  plugin="local_mytools"
  error="Table 'moodle.mdl_local_mytools_sessions' doesn't exist"
  context="Occurs when opening the main page for non-admin users"
```

```
Use debug_plugin to analyze this error in plugin local_mytools:
"Cannot find class 'local_mytools\output\renderer'"
The error appears only on the reports page.
```

**Automatically detected error types:** DML exceptions (tables, fields, indexes), class not found (namespace, autoloader), permission denied (capabilities, context), scheduled task failures (configuration, permissions), and upgrade errors (version, install.xml).

**What is automatically injected:** complete plugin context, database schema, function index, class structure, and few-shot examples of diagnosis with root cause and correction steps.

→ Practical examples: [Debugging Prompts](../guides/prompts/debugging.md)

---

## How to Invoke a Prompt by Client

| Client                              | How to invoke                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Claude Code**                     | Natural language: _"Use scaffold_plugin to..."_ or parameter syntax directly in the chat           |
| **Gemini Code Assist (Agent Mode)** | Slash command: `/scaffold_plugin`, `/review_plugin`, `/debug_plugin` — with parameter autocomplete |
| **OpenAI Codex**                    | Natural language in chat mentioning the prompt name: _"Run scaffold_plugin with type='local'..."_  |
| **OpenCode**                        | Natural language in chat mentioning the prompt name: _"Use review_plugin focusing on security..."_ |
| **Cursor**                          | Natural language in chat mentioning the prompt name: _"Run review_plugin focusing on security..."_ |

> In Gemini Code Assist, slash commands are only available in **Agent Mode**. In the standard chat, use natural language.

---

## Contributing New Prompts

If you want to add custom prompts to the server (in `src/prompts/`), follow the guidelines in [CONTRIBUTING.md](../../../../CONTRIBUTING.md). Best practices:

- **Check the Moodle version:** inject `AI_CONTEXT.md` and instruct the AI to verify the version before suggesting Hooks (4.3+) or APIs with `@since`.
- **Require localization:** instruct the prompt to suggest translation strings in `lang/en/` instead of fixed text in the code.
- **Validate the schema:** database prompts must follow the `install.xml` format and include the attributes `NOTNULL`, `SEQUENCE`, and `NEXT`.

---

## See also

- [Tools Reference](./tools.md) — executable actions for the AI
- [Resources Reference](./resources.md) — passively read data
- [Usage Examples](../guides/workflows/examples.md) — real scenarios using the three prompts in action

---

[🏠 Back to Index](../index.md)
