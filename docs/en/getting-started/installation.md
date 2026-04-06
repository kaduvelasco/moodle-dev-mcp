🌐 [Português](../../pt-br/getting-started/installation.md) | **English** | 🏠 [Index](../index.md)

---

# Installation Guide

**moodle-dev-mcp** can be installed globally via NPM or cloned locally for development and contribution.

---

## 📋 Prerequisites

Before starting, make sure you have the following installed on your machine:

| Component        | Minimum version | Notes                                   |
| :--------------- | :-------------- | :-------------------------------------- |
| Node.js          | 18.x            | LTS version recommended                 |
| npm              | —               | Installed automatically with Node.js    |
| Moodle           | 4.1             | Hook API requires Moodle 4.3+           |
| Operating system | Any             | Linux, macOS, and Windows are supported |

You will also need a **compatible MCP client** to interact with the server. See the officially supported clients:

- [Claude Code](../guides/clients/claude-code.md)
- [Gemini Code Assist](../guides/clients/gemini-code-assist.md)
- [OpenAI Codex](../guides/clients/codex.md)
- [OpenCode](../guides/clients/opencode.md)

---

## 🚀 Option 1: Installation via NPM (Recommended)

The fastest way to use the server in any project.

```bash
npm install -g moodle-dev-mcp
```

After installation, the server will be available via `npx moodle-dev-mcp` or as a global executable.

---

## 🛠️ Option 2: Installation via Git (Development)

Use this method if you intend to contribute to the project or test features firsthand.

**1. Clone the repository:**

```bash
git clone https://github.com/kaduvelasco/moodle-dev-mcp.git
cd moodle-dev-mcp
```

**2. Run the setup script:**

```bash
chmod +x setup.sh
./setup.sh
```

The script automatically performs the following steps:

| Step                     | What it does                                 |
| :----------------------- | :------------------------------------------- |
| **Check Node.js**        | Confirms that version >= 18 is installed     |
| **Check npm**            | Confirms that npm is available in PATH       |
| **Install dependencies** | Runs `npm install`                           |
| **Type check**           | Runs `tsc --noEmit` to validate TypeScript   |
| **Build**                | Compiles `src/` → `dist/` via `tsc`          |
| **Summary**              | Displays ready-to-use configuration examples |

**3. Verify the build:**

The compiled code will be in the `dist/` folder. The main entry point is `dist/index.js`.

> The `dist/` directory is generated locally and is not versioned in git. Run `npm run build` whenever you modify the source code.

---

## ⚙️ Environment Variables

The server is configured exclusively via environment variables. You can define them directly in your MCP client configuration or create a `.env` file in the project root based on the `.env.example` included in the repository.

| Variable         | Required | Description                                                                           |
| :--------------- | :------: | :------------------------------------------------------------------------------------ |
| `MOODLE_PATH`    |  ✅ Yes  | Absolute path to the root of the Moodle installation. Example: `/var/www/html/moodle` |
| `MOODLE_VERSION` |  ❌ No   | Forces a specific Moodle version. Example: `4.5`. See note below.                     |

### About `MOODLE_VERSION`

In most cases, **you do not need to define this variable**. When running `init_moodle_context` or `update_indexes`, the server automatically detects the version from the `version.php` file in your installation and ignores the ENV value.

`MOODLE_VERSION` is only effectively used in two scenarios:

- **Without running `init_moodle_context`:** when you provide only `MOODLE_PATH` and skip initialization, the version will come from this variable.
- **When automatic detection fails:** if `version.php` is malformed or inaccessible, the server uses the value of this variable as a fallback.

---

## 🔍 Verifying the Installation

After installing and configuring the MCP client, you can verify that the server is working correctly by asking your AI assistant:

```
Run the moodle-dev-mcp doctor
```

The AI will call the `doctor` tool via the MCP protocol and return a report with the server status: detected Moodle version, configured path, index freshness, and optional tools available.

> **Note:** `doctor` is an MCP tool, not a CLI command. It can only be executed within an active session with a compatible client (Claude Code, Gemini Code Assist, OpenAI Codex, or OpenCode).

---

## ➡️ Next steps

With the server installed, configure your MCP client:

- [Configure Claude Code](../guides/clients/claude-code.md)
- [Configure Gemini Code Assist](../guides/clients/gemini-code-assist.md)
- [Configure OpenAI Codex](../guides/clients/codex.md)
- [Configure OpenCode](../guides/clients/opencode.md)

Or jump straight to usage:

- [Quickstart](./quickstart.md)
- [Back to Index](../index.md)
