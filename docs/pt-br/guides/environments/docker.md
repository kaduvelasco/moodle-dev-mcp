🌐 [English](../../../en/guides/environments/docker.md) | **Português (BR)** | 🏠 [Índice](../../index.md)

---

# Uso com Docker e LuminaStack

O `moodle-dev-mcp` foi projetado para ser flexível em ambientes containerizados. Se você utiliza o **LuminaStack** ou qualquer stack Docker (Nginx + PHP-FPM + MariaDB), existem dois cenários principais de operação.

---

## 🚀 Cenário A: MCP no Host (Recomendado)

Neste cenário, o servidor MCP roda diretamente na sua máquina física, enquanto o Moodle roda nos containers. Esta é a opção recomendada para a maioria dos desenvolvedores usando LuminaStack, Cursor, VS Code ou Claude Code.

### Por que usar assim?

- **Performance:** Leitura de arquivos sem o overhead do sistema de arquivos do Docker (especialmente no macOS e Windows).
- **Simplicidade:** O assistente de IA no host enxerga o executável do MCP sem configurações de rede.
- **Persistência:** Os arquivos `.md` de contexto são escritos no volume montado do host e ficam visíveis imediatamente dentro do container Moodle.

### Como funciona com o LuminaStack

No LuminaStack, o diretório Moodle fica em `~/workspace/www/html/<projeto>/` — montado do host para dentro dos containers PHP. O `moodle-dev-mcp` roda no host e lê esses arquivos diretamente, como se fossem um diretório local qualquer.

**Configuração do cliente de IA (Claude Code):**

```bash
claude mcp add moodle-dev-mcp \
  -e MOODLE_PATH=/home/usuario/workspace/www/html/moodle \
  -- npx -y moodle-dev-mcp
```

**Configuração do cliente de IA (Gemini Code Assist — `~/.gemini/settings.json`):**

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "command": "npx",
            "args": ["-y", "moodle-dev-mcp"],
            "env": {
                "MOODLE_PATH": "/home/usuario/workspace/www/html/moodle"
            }
        }
    }
}
```

**Configuração do cliente de IA (OpenCode — `opencode.json` na raiz do Moodle):**

```json
{
    "$schema": "https://opencode.ai/config.json",
    "mcp": {
        "moodle-dev-mcp": {
            "type": "local",
            "command": "npx",
            "args": ["-y", "moodle-dev-mcp"],
            "env": {
                "MOODLE_PATH": "/home/usuario/workspace/www/html/moodle"
            }
        }
    }
}
```

**Inicializando o contexto:**

Com o cliente configurado, peça ao assistente de IA:

```
Inicialize o contexto do moodle-dev-mcp para minha instalação Moodle.
```

O assistente chamará `init_moodle_context`, detectará a versão do Moodle e gerará todos os índices globais — sem qualquer comando de terminal adicional.

---

## 🐳 Cenário B: MCP como Sidecar (Docker Compose)

Use este cenário quando precisar que o servidor MCP faça parte da infraestrutura e seja acessível via rede — por exemplo, para equipes que compartilham uma instância Moodle remota.

### Configuração do docker-compose.yml

```yaml
services:
    moodle-dev-mcp:
        image: node:18-slim
        container_name: moodle-dev-mcp
        working_dir: /app
        volumes:
            - ./moodle-dev-mcp:/app # código do servidor MCP
            - ./www/html/moodle:/var/www/moodle # Moodle (leitura + escrita)
        environment:
            - MOODLE_PATH=/var/www/moodle
            - MOODLE_VERSION=4.5
            - MOODLE_MCP_TOKEN=meu-segredo-aqui
        command: node dist/index.js --http --port 3000 --host 0.0.0.0 --token meu-segredo-aqui
        ports:
            - "3000:3000"
```

> **Por que não usar `:ro`?** O servidor precisa de permissão de **escrita** para criar os arquivos `.md` de contexto dentro dos diretórios de plugin (ex: `PLUGIN_AI_CONTEXT.md`, `PLUGIN_DB_TABLES.md`). Monte o volume sem `:ro` para que a geração de contexto funcione corretamente.

### Configurando o cliente de IA para o modo HTTP

Após subir o container, configure seu cliente de IA para se conectar via URL:

**Claude Code:**

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "url": "http://localhost:3000/mcp",
            "headers": {
                "Authorization": "Bearer meu-segredo-aqui"
            }
        }
    }
}
```

**Gemini Code Assist (`~/.gemini/settings.json`):**

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "url": "http://localhost:3000/mcp",
            "headers": {
                "Authorization": "Bearer meu-segredo-aqui"
            }
        }
    }
}
```

> Para acessar de outra máquina na rede, substitua `localhost` pelo IP ou hostname do servidor. Em produção, use um reverse proxy (nginx, Caddy) com TLS.

---

## 🛠️ Resolvendo Conflitos de Permissão

Ao rodar o MCP no host (Cenário A) com o Moodle em containers Docker, podem ocorrer problemas de permissão de escrita nos diretórios de plugin.

### LuminaStack

No LuminaStack, os arquivos em `~/workspace/www/html/moodle/` pertencem ao usuário do host. O `moodle-dev-mcp` roda no host com esse mesmo usuário, então a escrita de arquivos `.md` de contexto funciona sem configuração adicional.

Se os containers criarem arquivos (ex: uploads do Moodle) com outro UID, pode haver conflito. Solução:

```bash
# Verificar o proprietário dos arquivos de plugin
ls -la ~/workspace/www/html/moodle/local/

# Se necessário, ajustar a propriedade
sudo chown -R $USER:$USER ~/workspace/www/html/moodle/local/
```

### Docker genérico (Cenário B)

No Cenário B, o container roda com o usuário `node` (UID 1000 por padrão na imagem `node:18-slim`). Certifique-se de que o volume montado tem permissão de escrita para esse usuário:

```bash
# Ajustar permissões do diretório Moodle no host
sudo chown -R 1000:1000 ./www/html/moodle/local/
```

---

## 📋 Comandos Úteis (Cenário B)

```bash
# Verificar se o servidor está ativo
curl http://localhost:3000/health

# Acompanhar logs em tempo real
docker logs -f moodle-dev-mcp

# Reiniciar após atualizar o código do MCP
docker compose restart moodle-dev-mcp
```

---

## ➡️ Próximos Passos

- [Claude Code](../clients/claude-code.md) — configuração detalhada
- [Gemini Code Assist](../clients/gemini-code-assist.md) — configuração detalhada
- [OpenAI Codex](../clients/codex.md) — configuração detalhada
- [OpenCode](../clients/opencode.md) — configuração detalhada
- [Problemas Comuns](../../troubleshooting/common-issues.md) — erros de permissão e PATH
- [Voltar ao Índice](../../index.md)
