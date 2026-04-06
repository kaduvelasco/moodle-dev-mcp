🌐 [English](../../en/getting-started/quickstart.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Início Rápido (Quickstart)

Este guia ajudará você a conectar o `moodle-dev-mcp` ao seu assistente de IA e realizar sua primeira tarefa de desenvolvimento em menos de 5 minutos.

---

## 1. Conecte seu Assistente

O MCP funciona como uma ponte. Você precisa dizer ao seu assistente de IA onde encontrar o servidor e qual instalação Moodle ele deve analisar.

### Claude Code

```bash
claude mcp add moodle-dev-mcp \
  -e MOODLE_PATH=/var/www/html/moodle \
  -- npx -y moodle-dev-mcp
```

Verifique se o servidor foi registrado:

```bash
claude mcp list
# → moodle-dev-mcp: npx -y moodle-dev-mcp (user scope)
```

### Gemini Code Assist (CLI e VS Code)

**Via CLI (recomendado):**

```bash
gemini mcp add moodle-dev-mcp \
  --command "npx" \
  --args "-y,moodle-dev-mcp" \
  --env MOODLE_PATH=/var/www/html/moodle
```

**Via arquivo de configuração** — crie ou edite `~/.gemini/settings.json`:

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

Após configurar, reinicie a sessão do Gemini CLI ou recarregue a janela do VS Code (`Ctrl+Shift+P` → **Developer: Reload Window**) e ative o **modo Agent** no painel do Gemini.

### OpenAI Codex

```bash
codex mcp add moodle-dev-mcp \
  --env MOODLE_PATH=/var/www/html/moodle \
  -- npx -y moodle-dev-mcp
```

Ou edite diretamente `~/.codex/config.toml`:

```toml
[mcp_servers.moodle-dev-mcp]
command = "npx"
args    = ["-y", "moodle-dev-mcp"]
env     = { MOODLE_PATH = "/var/www/html/moodle" }
```

### OpenCode

Crie ou edite `opencode.json` na raiz da sua instalação Moodle:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "moodle-dev-mcp": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "moodle-dev-mcp"],
      "env": {
        "MOODLE_PATH": "/var/www/html/moodle"
      }
    }
  }
}
```

> Para instruções detalhadas de cada cliente — incluindo configuração de PATH para gerenciadores de versão como nvm, mise e asdf — veja os guias completos:
> [Claude Code](../guides/clients/claude-code.md) · [Gemini Code Assist](../guides/clients/gemini-code-assist.md) · [OpenAI Codex](../guides/clients/codex.md) · [OpenCode](../guides/clients/opencode.md)

---

## 2. Inicialize o Contexto

Com o servidor conectado, abra um chat com a IA e peça para inicializar o ambiente. Este passo mapeia a versão do Moodle e gera todos os índices globais.

> **Antes de continuar:** confirme que `MOODLE_PATH` está apontando para a raiz correta da sua instalação Moodle — o diretório que contém `version.php`. Você também pode passar o caminho diretamente no prompt:

**Digite no chat:**

```
Inicialize o contexto do moodle-dev-mcp para a instalação em /var/www/html/moodle.
```

A IA executará a tool `init_moodle_context` e confirmará a versão encontrada (ex: Moodle 4.5) e os índices gerados. Este passo leva de 1 a 3 minutos dependendo do número de plugins instalados.

---

## 3. Sua Primeira Tarefa: Explorar a API

Agora que a IA tem "olhos" dentro do seu Moodle, peça para ela buscar algo na API oficial.

**Tente este prompt:**

```
Busque na API do core funções relacionadas a "enrollment" (matrícula) que não estejam depreciadas.
```

A IA usará a tool `search_api` e listará as funções com suas respectivas assinaturas e arquivos onde estão definidas.

---

## 4. Analisando um Plugin Existente

Se você já tem um plugin em desenvolvimento, peça para a IA entendê-lo profundamente.

**Tente este prompt:**

```
Gere o contexto de IA para o meu plugin local_caedauth e me dê um resumo das tabelas de banco de dados que ele usa.
```

O servidor criará os arquivos `PLUGIN_*.md` dentro do diretório do plugin e a IA explicará a estrutura completa para você.

---

## 🎯 Próximos Passos

Agora que você está conectado, explore o potencial máximo do servidor:

- **Criar do zero:** Use o guia [Meu Primeiro Plugin](./first-plugin.md) para fazer o scaffold de um novo componente.
- **Corrigir bugs:** Peça para a IA analisar um erro usando a tool `doctor` ou o prompt `debug_plugin`.
- **Revisar código:** Antes de um commit, peça: _"Faça um code review do meu plugin focado em segurança e padrões Moodle"_.
- [Voltar ao Índice](../index.md)

---

> 💡 **Dica de Ouro:** Se a IA disser que não conhece o comando, tente ser explícito: _"Use a tool MCP `search_api` para encontrar..."_.
