🌐 [Português](../../../pt-br/guides/environments/docker.md) | **English** | 🏠 [Index](../../index.md)

---

# Using with Docker and LuminaStack

`moodle-dev-mcp` was designed to be flexible in containerized environments. If you use **LuminaStack** or any Docker stack (Nginx + PHP-FPM + MariaDB), there are two main deployment scenarios.

---

# 🚀 Scenario A: MCP on the Host (Recommended)

In this setup, the MCP server runs directly on your host machine while Moodle runs inside containers. This is the recommended option for most developers using LuminaStack, Cursor, VS Code, or Claude Code.

## Why use it this way?

- **Performance:** File reading without Docker filesystem overhead (especially on macOS and Windows).
- **Simplicity:** The AI assistant running on the host can access the MCP executable without network configuration.
- **Persistence:** Context `.md` files are written to the host-mounted volume and become immediately visible inside the Moodle container.

---

## How it works with LuminaStack

In LuminaStack, the Moodle directory usually lives in:

```
~/workspace/www/html/<project>/
```

This directory is mounted from the host into the PHP containers.
`moodle-dev-mcp` runs on the host and reads these files directly as a normal local directory.

---

### AI Client Configuration (Claude Code)

```bash
claude mcp add moodle-dev-mcp \
  -e MOODLE_PATH=/home/user/workspace/www/html/moodle \
  -- npx -y moodle-dev-mcp
```

---

### AI Client Configuration (Gemini Code Assist — `~/.gemini/settings.json`)

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "command": "npx",
            "args": ["-y", "moodle-dev-mcp"],
            "env": {
                "MOODLE_PATH": "/home/user/workspace/www/html/moodle"
            }
        }
    }
}
```

### AI Client Configuration (OpenCode — `opencode.json` at the Moodle root)

```json
{
    "$schema": "https://opencode.ai/config.json",
    "mcp": {
        "moodle-dev-mcp": {
            "type": "local",
            "command": "npx",
            "args": ["-y", "moodle-dev-mcp"],
            "env": {
                "MOODLE_PATH": "/home/user/workspace/www/html/moodle"
            }
        }
    }
}
```

---

### Initializing the context

Once the client is configured, ask your AI assistant:

```
Initialize the moodle-dev-mcp context for my Moodle installation.
```

The assistant will call `init_moodle_context`, detect the Moodle version, and generate all global indexes — without any additional terminal commands.

---

# 🐳 Scenario B: MCP as a Sidecar (Docker Compose)

Use this scenario when the MCP server must be part of the infrastructure and accessible via the network — for example, for teams sharing a remote Moodle instance.

---

## docker-compose.yml configuration

```yaml
services:
    moodle-dev-mcp:
        image: node:18-slim
        container_name: moodle-dev-mcp
        working_dir: /app
        volumes:
            - ./moodle-dev-mcp:/app
            - ./www/html/moodle:/var/www/moodle
        environment:
            - MOODLE_PATH=/var/www/moodle
            - MOODLE_VERSION=4.5
            - MOODLE_MCP_TOKEN=my-secret-token
        command: node dist/index.js --http --port 3000 --host 0.0.0.0 --token my-secret-token
        ports:
            - "3000:3000"
```

> **Why not use `:ro`?**
> The server needs **write permission** to create context `.md` files inside plugin directories (e.g. `PLUGIN_AI_CONTEXT.md`, `PLUGIN_DB_TABLES.md`). Mount the volume without `:ro` so context generation works correctly.

---

## Configuring the AI client for HTTP mode

After starting the container, configure your AI client to connect via URL.

### Claude Code

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "url": "http://localhost:3000/mcp",
            "headers": {
                "Authorization": "Bearer my-secret-token"
            }
        }
    }
}
```

---

### Gemini Code Assist (`~/.gemini/settings.json`)

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "url": "http://localhost:3000/mcp",
            "headers": {
                "Authorization": "Bearer my-secret-token"
            }
        }
    }
}
```

> To access it from another machine on the network, replace `localhost` with the server IP or hostname.
> In production, use a reverse proxy (nginx, Caddy) with TLS.

---

# 🛠️ Resolving Permission Conflicts

When running MCP on the host (Scenario A) while Moodle runs inside Docker containers, you may encounter write permission issues in plugin directories.

---

## LuminaStack

In LuminaStack, files under:

```
~/workspace/www/html/moodle/
```

belong to the host user.
Since `moodle-dev-mcp` also runs as the host user, writing `.md` context files works without additional configuration.

If containers create files (e.g., Moodle uploads) with a different UID, conflicts may occur.

### Fix

```bash
# Check plugin file ownership
ls -la ~/workspace/www/html/moodle/local/

# Adjust ownership if needed
sudo chown -R $USER:$USER ~/workspace/www/html/moodle/local/
```

---

## Generic Docker (Scenario B)

In Scenario B the container runs as the `node` user (UID **1000** in `node:18-slim`). Ensure the mounted volume allows write access.

```bash
sudo chown -R 1000:1000 ./www/html/moodle/local/
```

---

# 📋 Useful Commands (Scenario B)

```bash
# Check if the server is running
curl http://localhost:3000/health
```

```bash
# Follow logs in real time
docker logs -f moodle-dev-mcp
```

```bash
# Restart after updating MCP code
docker compose restart moodle-dev-mcp
```

---

# ➡️ Next Steps

- [Claude Code](../clients/claude-code.md) — detailed configuration
- [Gemini Code Assist](../clients/gemini-code-assist.md) — detailed configuration
- [OpenAI Codex](../clients/codex.md) — detailed configuration
- [OpenCode](../clients/opencode.md) — detailed configuration
- [Common Issues](../../troubleshooting/common-issues.md) — permission and PATH errors
- [Back to Index](../../index.md)
