🌐 [Português](../../pt-br/concepts/architecture.md) | **English** | 🏠 [Index](../index.md)

---

# Architecture

Overview of the components of `moodle-dev-mcp`, the data flow, and the operating modes.

---

## Project structure

```
moodle-dev-mcp/
├── .env.example          ← environment variables reference
├── .npmignore            ← excludes src/, docs/ and scripts from the npm package
├── package.json          ← dependencies, scripts and npm metadata
├── setup.sh              ← one-step setup: check + install + build
├── tsconfig.json
├── server.json           ← manifest for the official MCP Registry
├── PUBLISHING.md         ← npm publishing guide (maintainer use)
├── docs/                 ← full documentation (en/ and pt-br/)
└── src/
    ├── index.ts          ← entry point — stdio (default) or HTTP (--http)
    ├── server.ts         ← MCP server factory
    ├── config.ts         ← config loader: ENV vars → .moodle-mcp
    ├── cache.ts          ← in-memory cache by mtime
    ├── http.ts           ← Streamable HTTP transport (Express, sessions, auth)
    ├── watcher.ts        ← automatic regeneration via fs.watch()
    ├── extractors/       ← reads and parses Moodle PHP files
    ├── generators/       ← writes context .md files to disk
    ├── tools/            ← 11 MCP tools
    ├── resources/        ← 14+ MCP resource URIs
    ├── prompts/          ← 3 MCP prompt templates
    ├── tests/            ← unit tests (node:test, no extra dependencies)
    └── utils/            ← shared map PLUGIN_TYPE_TO_DIR (30+ types)
```

---

## Data flow

```
1. AI assistant calls init_moodle_context
   └─ config.ts detects the Moodle version via version.php
   └─ config.ts saves MOODLE_PATH and version in .moodle-mcp

2. Generators call Extractors
   └─ each extractor reads one type of Moodle PHP file
   └─ generator writes .md in the Moodle root or in the plugin directory
   └─ cache.ts checks mtime — skips unchanged files

3. AI client reads Resources (passively)
   └─ moodle://plugin/local_myplugin → PLUGIN_AI_CONTEXT.md
   └─ moodle://api-index → MOODLE_API_INDEX.md

4. AI client calls Tools (explicitly)
   └─ get_plugin_info → loads all PLUGIN_*.md from a plugin
   └─ search_api → searches in MOODLE_API_INDEX.md
   └─ watch_plugins → enables fs.watch() in dev plugin directories

5. AI client uses Prompts
   └─ scaffold_plugin → injects Moodle context + few-shot template
   └─ review_plugin → injects plugin context + review checklist
   └─ debug_plugin → injects context + automatic error type detection
```

---

## Configuration resolution

The server determines the Moodle path following this priority order:

```
Environment variable MOODLE_PATH
         │ (highest priority)
         ▼
.moodle-mcp file (written by init_moodle_context)
         │
         ▼
Direct parameter in the tool (moodle_path="...")
```

> **Note about `MOODLE_VERSION`:** the `MOODLE_VERSION` environment variable exists but is ignored when `init_moodle_context` or `update_indexes` are called — in those cases, the version is always automatically detected from `version.php`. `MOODLE_VERSION` is effectively used only when init is skipped or when automatic detection fails. See details in [Installation](/docs/en/getting-started/installation.md).

---

## Transport modes

| Mode      | When to use                                                    | How to start                                                              |
| --------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **stdio** | Local Moodle — same machine (LuminaStack, direct installation) | `node dist/index.js`                                                      |
| **HTTP**  | Remote Moodle — separate server or isolated environment        | `node dist/index.js --http --port 3000 --host 0.0.0.0 --token your-token` |

Available flags in HTTP mode:

| Flag             | Default     | Description                                                         |
| ---------------- | ----------- | ------------------------------------------------------------------- |
| `--port`         | `3000`      | TCP port                                                            |
| `--host`         | `127.0.0.1` | Bind address (`0.0.0.0` for all interfaces)                         |
| `--token`        | —           | Bearer token for authentication — required on non-loopback networks |
| `--allowed-host` | —           | Extra hostname allowed by Host header validation (repeatable)       |

> For use with Docker or LuminaStack, see the guide [Docker & Environments](../guides/environments/docker.md).

---

## See also

- [How moodle-dev-mcp works](./how-moodle-dev-mcp-works.md) — complete Extractors and Generators pipeline
- [Extractors](../architecture/extractors.md) — how PHP files are read and interpreted
- [Generators](../architecture/generators.md) — how context `.md` files are generated
- [Cache System](../architecture/cache-system.md) — cache strategy and invalidation

---

[🏠 Back to Index](../index.md)
