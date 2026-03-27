🌐 [Português](../../pt-br/getting-started/quickstart.md) | **English** | 🏠 [Index](../index.md)

---

# Quick Start (Quickstart)

This guide will help you connect `moodle-dev-mcp` to your AI assistant and perform your first development task in less than 5 minutes.

---

## 1. Connect your Assistant

MCP works as a bridge. You need to tell your AI assistant where to find the server and which Moodle installation it should analyze.

### Claude Code

```bash
claude mcp add moodle-dev-mcp \
  -e MOODLE_PATH=/var/www/html/moodle \
  -- npx -y moodle-dev-mcp
```

Check if the server was registered:

```bash
claude mcp list
# → moodle-dev-mcp: npx -y moodle-dev-mcp (user scope)
```

### Gemini Code Assist (VS Code)

Create or edit the file `~/.gemini/settings.json`:

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "command": "npx",
            "args": ["-y", "moodle-dev-mcp"],
            "env": {
                "MOODLE_PATH": "/var/www/html/moodle"
            }
        }
    }
}
```

After saving, reload the VS Code window (`Ctrl+Shift+P` → **Developer: Reload Window**) and enable **Agent mode** in the Gemini panel.

> For detailed instructions for each client — including PATH configuration for version managers such as nvm, mise, and asdf — see the full guides:
> [Claude Code](../guides/clients/claude-code.md) · [Gemini Code Assist](../guides/clients/gemini-code-assist.md)

---

## 2. Initialize the Context

With the server connected, open a chat with the AI and ask it to initialize the environment. This step maps the Moodle version and generates all global indexes.

> **Before continuing:** confirm that `MOODLE_PATH` is pointing to the correct root of your Moodle installation — the directory that contains `version.php`. You can also pass the path directly in the prompt:

**Type in the chat:**

```
Initialize the moodle-dev-mcp context for the installation at /var/www/html/moodle.
```

The AI will execute the `init_moodle_context` tool and confirm the detected version (e.g., Moodle 4.5) and the generated indexes. This step takes 1 to 3 minutes depending on the number of installed plugins.

---

## 3. Your First Task: Exploring the API

Now that the AI has "eyes" inside your Moodle, ask it to search for something in the official API.

**Try this prompt:**

```
Search the core API for functions related to "enrollment" that are not deprecated.
```

The AI will use the `search_api` tool and list the functions with their respective signatures and files where they are defined.

---

## 4. Analyzing an Existing Plugin

If you already have a plugin in development, ask the AI to understand it deeply.

**Try this prompt:**

```
Generate the AI context for my plugin local_caedauth and give me a summary of the database tables it uses.
```

The server will create the `PLUGIN_*.md` files inside the plugin directory and the AI will explain the complete structure to you.

---

## 🎯 Next Steps

Now that you are connected, explore the server’s full potential:

- **Create from scratch:** Use the guide [My First Plugin](./first-plugin.md) to scaffold a new component.
- **Fix bugs:** Ask the AI to analyze an error using the `doctor` tool or the `debug_plugin` prompt.
- **Review code:** Before a commit, ask: _"Do a code review of my plugin focused on security and Moodle standards"_.
- [Back to Index](../index.md)

---

> 💡 **Golden Tip:** If the AI says it does not recognize the command, try being explicit: _"Use the MCP tool `search_api` to find..."_.
