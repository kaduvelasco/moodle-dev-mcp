# moodle-dev-mcp 🎓🤖

<p align="center">
    <img src="docs/img/logo2.png" alt="moodle-dev-mcp" width="200px">
</p>

> **Turn your AI assistant into a Moodle expert.**
> MCP server that connects AI assistants (Claude, Gemini and others) directly to Moodle's internal structure to accelerate plugin development.

<p align="center">

[![NPM Version](https://img.shields.io/npm/v/moodle-dev-mcp.svg)](https://www.npmjs.com/package/moodle-dev-mcp)
[![NPM Downloads](https://img.shields.io/npm/dm/moodle-dev-mcp)](https://www.npmjs.com/package/moodle-dev-mcp)
[![Node Version](https://img.shields.io/node/v/moodle-dev-mcp)](https://nodejs.org)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](./LICENSE)
[![Protocol: MCP](https://img.shields.io/badge/protocol-MCP-purple.svg)](https://modelcontextprotocol.io)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.pt-BR.md)

</p>

🇧🇷 [Leia em Português](./README.pt-br.md) | 📚 [Full Documentation](./docs/en/index.md)

---

## 🎬 Demonstration

<p align="center">
    <img src="docs/img/demo.gif" alt="Application Demonstration" width="100%">
</p>

---

## 📑 Index

- [What is it](#-what-is-moodle-dev-mcp)
- [Why use it](#-why-use)
- [Use cases](#-use-cases)
- [Quick example](#-quick-example)
- [Simplified architecture](#-simplified-architecture)
- [Project status](#-project-status)
- [Requirements](#-requirements)
- [Compatible MCP clients](#-compatible-mcp-clients)
- [Installation](#-installation)
- [MCP client configuration](#️-mcp-client-configuration)
- [Available resources](#-available-resources)
- [Security](#-security)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [Author](#-author)
- [License](#-license)

---

## 🚀 What is moodle-dev-mcp?

**moodle-dev-mcp** connects your local Moodle installation to AI assistants using the **Model Context Protocol (MCP)**.

Instead of relying only on the AI's generic knowledge about Moodle, the server automatically exposes the real structure of your installation, including:

- **Core APIs:** native Moodle functions, classes and libraries.
- **Installed plugins:** complete mapping of `local`, `mod`, `auth`, `block` and other types.
- **Database:** table structure and field definitions.
- **Ecosystem:** events, Hooks (Moodle 4.3+), Tasks and Capabilities.

---

## ✨ Why use it?

### 🧠 Real code awareness

The AI starts to know **your installation**, not a generic Moodle. It automatically detects the Moodle version in use, the plugins already installed and how the database tables are structured — and uses this context when generating or reviewing code.

### ⚡ Zero configuration in Moodle

Unlike Web Services, you do not need to configure tokens, create service users or expose APIs. The server reads **directly from local filesystem files**.

### 🔁 Natural integration in the development workflow

Commands in natural language in the AI chat are translated into concrete actions: creating plugins, auditing code, querying the database and much more — without leaving your editor.

---

## 💡 Use cases

| Scenario           | What you do                            | What the server delivers                                             |
| ------------------ | -------------------------------------- | -------------------------------------------------------------------- |
| **New plugin**     | Ask to create a plugin of type `local` | Complete structure with `version.php`, `lang/`, `db/` and base files |
| **Security audit** | Request review of an existing plugin   | Analysis focused on real Moodle conventions and APIs                 |
| **Database query** | Ask about the structure of a table     | Returns the real `install.xml` definition from your installation     |
| **Onboarding**     | Ask for an environment map             | Complete report of version, plugins and available capabilities       |

---

## ⚡ Quick example

After configuring the server, you can give commands in natural language in the AI chat:

```

// 1. Initialize the Moodle context
"Map my Moodle environment and give me a summary."

// 2. Create a plugin
"Create a local plugin called 'minhas_ferramentas' with capability support."

// 3. Audit code
"Review the plugin local_minhas_ferramentas focusing on security."

```

> For a complete list of commands, see the [Tools Reference](./docs/en/reference/tools.md).

---

## 🏗️ Simplified architecture

```

AI Assistant (Claude, Gemini...)
│
│  Model Context Protocol (MCP)
▼
┌─────────────────────────┐
│      moodle-dev-mcp     │
│  ┌───────────────────┐  │
│  │    Tools          │  │  ← Actions: scaffold, audit, API search...
│  │    Resources      │  │  ← Context: structure, plugins, DB
│  │    Prompts        │  │  ← Ready-to-use templates
│  └───────────────────┘  │
└──────────┬──────────────┘
│  Reading PHP files + writing context .md files
▼
Local Moodle installation
/var/www/moodle (or equivalent)

```

The server **never communicates with external servers** and **never modifies Moodle PHP files**. All analysis is performed locally. The only files written are context `.md` files generated inside plugin directories.

---

## 📊 Project status

> **⚠️ Beta:** the server is functional and ready for use in development environments, but APIs and behaviors may change between minor versions until the stable v1.0.

### Available Tools

| Tool                      | Description                                                   | Status       |
| ------------------------- | ------------------------------------------------------------- | ------------ |
| `init_moodle_context`     | Initializes the complete context of the Moodle installation   | ✅ Available |
| `generate_plugin_context` | Generates the complete AI context for a specific plugin       | ✅ Available |
| `plugin_batch`            | Generates or updates context for multiple plugins at once     | ✅ Available |
| `update_indexes`          | Regenerates global indexes (with intelligent cache by mtime)  | ✅ Available |
| `watch_plugins`           | Monitors plugins and updates context automatically on save    | ✅ Available |
| `search_plugins`          | Searches installed plugins by name, component or type         | ✅ Available |
| `search_api`              | Searches Moodle core API functions by name and visibility     | ✅ Available |
| `get_plugin_info`         | Loads the complete context of a plugin into the AI session    | ✅ Available |
| `list_dev_plugins`        | Lists all plugins marked as in development                    | ✅ Available |
| `doctor`                  | Diagnoses the environment: Node.js, Moodle, indexes and cache | ✅ Available |
| `explain_plugin`          | Explains the architecture of a plugin, by section or complete | ✅ Available |

For full details of parameters and examples, see the [Tools Reference](./docs/en/reference/tools.md).

---

## 📋 Requirements

| Component        | Minimum version | Notes                              |
| ---------------- | --------------- | ---------------------------------- |
| Node.js          | 18.x            | LTS recommended                    |
| Moodle           | 4.1             | Hook API requires Moodle 4.3+      |
| Operating system | Any             | Linux, macOS and Windows supported |

> The Docker environment is optional. Any local Moodle installation accessible via the filesystem works.

---

## 🔌 Compatible MCP clients

| Client             | Support     | Configuration guide                                          |
| ------------------ | ----------- | ------------------------------------------------------------ |
| Claude Code        | ✅ Official | [View guide](./docs/en/guides/clients/claude-code.md)        |
| Gemini Code Assist | ✅ Official | [View guide](./docs/en/guides/clients/gemini-code-assist.md) |
| OpenAI Codex       | ✅ Official | [View guide](./docs/en/guides/clients/codex.md)              |

> Other MCP clients compatible with the `stdio` protocol should work, but are not officially tested.

---

## 🛠️ Installation

### Via NPM (recommended)

```bash
npm install -g moodle-dev-mcp
```

### Via repository (development)

```bash
git clone https://github.com/kaduvelasco/moodle-dev-mcp.git
cd moodle-dev-mcp
chmod +x setup.sh
./setup.sh
```

---

## ⚙️ MCP client configuration

The server requires the environment variable `MOODLE_PATH` pointing to the root of your Moodle installation.

### Claude Code

```bash
claude mcp add moodle-dev-mcp \
  -e MOODLE_PATH=/your/moodle/path \
  -- npx -y moodle-dev-mcp
```

### Gemini Code Assist (VS Code)

Edit the file `~/.gemini/settings.json`:

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "command": "npx",
            "args": ["-y", "moodle-dev-mcp"],
            "env": {
                "MOODLE_PATH": "/your/moodle/path"
            }
        }
    }
}
```

> For detailed instructions for each client, including PATH configuration for version managers (nvm, mise, asdf), see the [Client Guides](./docs/en/guides/clients/).

---

## 📦 Available resources

The server implements the three primitives of the MCP protocol:

### 🔧 Tools

Actions executable by the AI: create plugins, audit code, query the database and map the environment. → [Full reference](./docs/en/reference/tools.md)

### 📄 Resources

Structured context exposed to the AI: directory structure, plugin list, database schema and core metadata. → [Full reference](./docs/en/reference/resources.md)

### 💬 Prompts

Pre-configured prompt templates for common Moodle development tasks. → [Full reference](./docs/en/reference/prompts.md)

---

## 🔒 Security

- The server operates **exclusively on the local filesystem** — no network port is opened in default mode and no data is sent to external servers.
- The server **never modifies Moodle PHP files**. Writing is limited to context `.md` files generated inside plugin directories.
- It is recommended to use the server only in **development environments**, never in production instances.
- The `MOODLE_PATH` variable must point only to local and isolated installations.

---

## 📚 Documentation

Full documentation is available in `docs/`:

- 👉 [Quick start](./docs/en/getting-started/quickstart.md)
- 👉 [Creating your first plugin](./docs/en/getting-started/first-plugin.md)
- 👉 [Tools Reference](./docs/en/reference/tools.md)
- 👉 [Resources Reference](./docs/en/reference/resources.md)
- 👉 [Prompts Reference](./docs/en/reference/prompts.md)
- 👉 [Troubleshooting](./docs/en/troubleshooting/common-issues.md)

---

## 🛠️ Support Utility (support.sh)

The repository includes the `support.sh` script in the root as an auxiliary utility for developers. It **is not part of the MCP server** and its use is completely optional.

```bash
chmod +x support.sh
./support.sh
```

The interactive menu offers:

- **Install Claude Code, Gemini CLI or OpenAI Codex** via CLI — checks dependencies and installs the correct npm packages
- **Generate instruction file** (`CLAUDE.md`, `GEMINI.md` or `AGENTS.md`) — asks questions about the Moodle version and installation path, and generates the ready-to-use context file for your AI assistant

> The focus of the project is the MCP server. `support.sh` is only a convenience shortcut for new users.

---

## 🤝 Contributing

Contributions are welcome! See the [Contribution Guide](./CONTRIBUTING.pt-BR.md) to learn how to report bugs, suggest improvements or submit pull requests.

---

## 👤 Author

**Kadu Velasco**

- GitHub: [@kaduvelasco](https://github.com/kaduvelasco)

---

## 📄 License

Distributed under the **GPL-3.0** license. See the [LICENSE](./LICENSE) file for more details.
