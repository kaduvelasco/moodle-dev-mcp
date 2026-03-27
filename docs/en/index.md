# Documentation — moodle-dev-mcp 🎓

🌐 [Português](../../pt-br/index.md) | **English** | 🏠 [Back to README](../../README.md)

---

**moodle-dev-mcp** is an MCP server (Model Context Protocol) designed to expose Moodle’s internal structure to AI assistants, enabling faster, safer and more standardized plugin development.

Use this index to navigate through the entire documentation.

---

## 🚀 Getting Started

Set up your environment and get the server running in minutes.

- [Installation](./getting-started/installation.md) — System requirements and installation methods (NPM and Git).
- [Quickstart](./getting-started/quickstart.md) — Your first command and how to synchronize the AI with your Moodle.
- [Creating your First Plugin](./getting-started/first-plugin.md) — Using the scaffold to start a project from scratch.

---

## 🧠 Concepts

Understand what MCP is, why this server exists and how it works internally.

- [What is MCP?](./concepts/what-is-mcp.md) — Introduction to the Model Context Protocol.
- [Why moodle-dev-mcp?](./concepts/why-moodle-dev-mcp.md) — The problem the server solves and when to use it.
- [How the server works](./concepts/how-moodle-dev-mcp-works.md) — The flow between Extractors, Generators and your AI.
- [Architecture](./concepts/architecture.md) — Overview of components and data flow.
- [Glossary](./concepts/glossary.md) — Terms and concepts used in this documentation.

---

## 📖 Guides

### MCP Clients

Configure the server in your preferred AI assistant.

- [Claude Code](./guides/clients/claude-code.md)
- [Gemini Code Assist](./guides/clients/gemini-code-assist.md)
- [OpenAI Codex](./guides/clients/codex.md)

### Environments

- [Using Docker](./guides/environments/docker.md) — Integration with containerized environments.

### Workflows

- [Usage examples](./guides/workflows/examples.md) — Real use cases and development workflows.

---

## 🛠️ Technical Reference

Consult the resources and commands available on the server.

- [Tools](./reference/tools.md) — Actions the AI can execute (e.g. `get_plugin_info`, `search_api`, `explain_plugin`).
- [Resources](./reference/resources.md) — Context that the AI reads passively (e.g. API indexes, plugins, database and events).
- [Prompts](./reference/prompts.md) — Pre-configured prompt templates for common tasks.
- [Generated Files](./reference/generated-files.md) — The `.md` files created in your Moodle installation.

---

## 🔬 Internal Architecture

For those who want to understand or contribute to the server code.

- [Extractors](./architecture/extractors.md) — How the server reads and analyzes the Moodle installation.
- [Generators](./architecture/generators.md) — How context content is generated for the AI.
- [Cache System](./architecture/cache-system.md) — Cache and invalidation strategy.

---

## 🆘 Troubleshooting

- [Common Issues](./troubleshooting/common-issues.md) — Permission errors, PATH configuration and outdated cache.

---

> 💡 **Tip:** If you are using Claude Code or Gemini Code Assist, try asking directly: _"What tools does moodle-dev-mcp provide?"_ — the AI will query the server in real time and respond with the updated list.
