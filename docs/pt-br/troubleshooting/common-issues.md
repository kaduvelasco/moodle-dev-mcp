🌐 [English](../../en/troubleshooting/common-issues.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Solução de Problemas

Encontrou algum problema ao usar o `moodle-dev-mcp`? Esta página cobre os erros mais comuns com soluções diretas.

---

## 🔍 Diagnóstico inicial

Antes de investigar qualquer problema específico, execute estes dois passos — eles resolvem a maioria dos casos:

**Passo 1 — Verificar se o servidor está conectado:**

No chat do seu cliente de IA, execute:
```
/mcp
```

Se `moodle-dev-mcp` aparecer como conectado com 11 tools, o servidor está funcionando. O problema está na configuração do contexto, não na conexão.

Se não aparecer, o problema está na configuração do servidor — veja as seções de [Erros de Conexão](#-erros-de-conexão-e-path) abaixo.

**Passo 2 — Verificar a saúde do ambiente:**

```
Execute o doctor do moodle-dev-mcp.
```

A IA chamará a tool `doctor` e retornará um relatório com: versão do Node.js, caminho do Moodle, versão detectada, atualidade dos índices e estatísticas de cache. Qualquer problema de configuração aparecerá aqui.

---

## 🚫 Erros de Conexão e PATH

### O cliente de IA não encontra o `node` ou `npx`

**Sintoma:** O Claude Code ou Gemini Code Assist reportam que não conseguem conectar ao servidor, ou o servidor aparece como "Connecting..." e nunca completa.

**Causa:** Gerenciadores de versão como `nvm`, `asdf` e `mise` instalam o Node em diretórios não incluídos no PATH global do sistema — que é o PATH que o IDE herda, não o do seu shell interativo.

**Solução:** Adicione o PATH explicitamente no bloco `env` da configuração do servidor.

```bash
# Encontre o caminho correto
which node
# → /home/usuario/.nvm/versions/node/v22.0.0/bin/node
```

**Claude Code (`~/.claude.json`):**
```json
{
  "mcpServers": {
    "moodle-dev-mcp": {
      "command": "npx",
      "args": ["-y", "moodle-dev-mcp"],
      "env": {
        "PATH": "/home/usuario/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin",
        "MOODLE_PATH": "/home/usuario/workspace/www/html/moodle"
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
      "command": "npx",
      "args": ["-y", "moodle-dev-mcp"],
      "env": {
        "PATH": "/home/usuario/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin",
        "MOODLE_PATH": "/home/usuario/workspace/www/html/moodle"
      }
    }
  }
}
```

**OpenAI Codex (`~/.codex/config.toml`):**
```toml
[mcp_servers.moodle-dev-mcp]
command  = "npx"
args     = ["-y", "moodle-dev-mcp"]
env_vars = ["PATH"]
env      = { MOODLE_PATH = "/home/usuario/workspace/www/html/moodle" }
```

---

### Gemini travado em "Connecting..."

**Sintoma:** O servidor aparece mas nunca sai do estado "Connecting...". Nenhuma tool é listada.

**No VS Code (Gemini Code Assist):**

**Causa:** O Gemini Code Assist só carrega servidores MCP no **Agent Mode**. No chat padrão, o servidor não é inicializado.

**Solução:**
1. Confirme que o toggle **Agent** está ativo no topo do painel do Gemini
2. Recarregue a janela: `Ctrl+Shift+P` → **Developer: Reload Window**
3. Execute `/mcp` novamente no chat do Agent Mode

**No CLI (gemini):**

Se o servidor foi adicionado com `gemini mcp add` mas não aparece, reinicie a sessão:

```bash
# Encerrar a sessão atual e iniciar uma nova
Ctrl+C
gemini
```

Dentro da sessão, verifique com `/mcp`.

---

### Caminho do Moodle não encontrado

**Sintoma:** O servidor inicia mas retorna: _"Invalid Moodle path: version.php not found"_.

**Causa:** `MOODLE_PATH` aponta para um subdiretório ou usa caminho relativo.

**Solução:**
- O caminho deve apontar para a **raiz** do Moodle — o diretório que contém `version.php` e as pastas `admin/`, `local/`, `mod/`
- Use caminho **absoluto** (ex: `/home/usuario/workspace/www/html/moodle`), nunca relativo (ex: `./moodle`)
- No LuminaStack, o caminho correto é `~/workspace/www/html/<nome-do-projeto>`

---

## 🛠️ Erros de Build e Execução

### A pasta `dist/` não existe

**Sintoma:** Erro ao tentar executar `node dist/index.js` após clonar o repositório.

**Causa:** O TypeScript precisa ser compilado antes do uso. A pasta `dist/` não é versionada no git.

**Solução:**
```bash
# Opção 1 — script de setup completo (recomendado)
./setup.sh

# Opção 2 — apenas compilar
npm run build
```

Após isso, `dist/index.js` estará disponível. Sempre que modificar o código-fonte em `src/`, execute `npm run build` novamente.

---

### Permissão negada ao criar arquivos `.md` (EACCES)

**Sintoma:** O servidor conecta, mas ao gerar contexto retorna erro de permissão. Os arquivos `PLUGIN_*.md` não são criados.

**Causa:** O usuário que executa o Node não tem permissão de escrita no diretório do Moodle ou nos diretórios de plugin.

**Solução no Linux (instalação direta):**
```bash
sudo chown -R $USER:$USER /caminho/para/seu/moodle/local/
```

**Solução com Docker (Cenário B — sidecar):**

Certifique-se de que o volume não está montado como `:ro` (read-only). O servidor precisa escrever os arquivos `.md` de contexto:

```yaml
volumes:
  - ./www/html/moodle:/var/www/moodle  # sem :ro
```

---

## 🔄 Problemas de Contexto e Cache

### A IA sugere código de uma versão antiga do plugin

**Sintoma:** Você modificou `db/install.xml` ou um arquivo PHP, mas a IA ainda cita a versão anterior dos campos ou funções.

**Causa:** O cache mtime pode não ter detectado a mudança, ou o contexto do plugin não foi regenerado após as alterações.

**Solução — para um plugin específico:**
```
Regenere o contexto do plugin local_myplugin.
```

**Solução — para todos os índices globais:**
```
Regenere todos os índices do Moodle ignorando o cache.
```

A IA chamará `update_indexes` com `force=true`, limpando o cache e regenerando todos os arquivos.

---

### Contexto desatualizado após upgrade do Moodle

**Sintoma:** Após atualizar o Moodle para uma nova versão, a IA ainda reporta a versão antiga e funções que foram depreciadas ou removidas.

**Solução:**
```
Reinicialize o contexto do moodle-dev-mcp para a instalação Moodle.
```

A IA chamará `init_moodle_context`, detectará a nova versão e regenerará todos os 13 índices globais do zero.

---

### Watch mode para após reiniciar o servidor

**Sintoma:** O monitoramento automático de plugins para de funcionar após reiniciar o VS Code, o Claude Code ou o servidor MCP.

**Causa:** O watch mode é **in-memory** — não persiste entre reinicializações do servidor.

**Solução:** Reative o monitoramento após cada reinício:
```
Inicie o monitoramento do plugin local_myplugin para alterações de arquivo.
```

---

### Arquivos `.md` aparecendo no `git status`

**Sintoma:** O `git status` mostra dezenas de novos arquivos Markdown na instalação Moodle.

**Solução:** Adicione ao `.gitignore` na raiz do Moodle:

```gitignore
# moodle-dev-mcp context files
AI_CONTEXT.md
MOODLE_AI_*.md
MOODLE_*_INDEX.md
MOODLE_DEV_RULES.md
MOODLE_PLUGIN_GUIDE.md
PLUGIN_AI_*.md
PLUGIN_*_INDEX.md
PLUGIN_STRUCTURE.md
PLUGIN_DB_TABLES.md
PLUGIN_EVENTS.md
PLUGIN_ARCHITECTURE.md
PLUGIN_RUNTIME_FLOW.md
.moodle-mcp
```

---

## 🐳 Docker e Ambientes Virtuais

### O MCP no host não enxerga o Moodle no Docker

**Sintoma:** O servidor retorna que a pasta está vazia ou não existe, mesmo com o Moodle rodando nos containers.

**Causa:** `MOODLE_PATH` precisa ser o caminho **no host** (sua máquina), não o caminho interno do container.

**Solução:** No LuminaStack ou qualquer stack com volume montado, use o caminho do host:

```json
"env": {
  "MOODLE_PATH": "/home/usuario/workspace/www/html/moodle"
}
```

O MCP no host lê diretamente os arquivos do volume montado — sem precisar acessar o container.

---

## ❓ Dúvidas comuns

### `scaffold_plugin` não aparece como tool no `/mcp`

**Isso é esperado.** O `scaffold_plugin` é um **Prompt MCP**, não uma Tool. Ele não aparece na lista `/mcp` de tools — é invocado diretamente no chat como prompt ou slash command:

```
/scaffold_plugin type="local" name="mytools" description="..."
```

Para a lista completa de tools vs. prompts, veja a [Referência de Tools](../reference/tools.md) e a [Referência de Prompts](../reference/prompts.md).

---

### A IA diz que não conhece o `moodle-dev-mcp`

**Sintoma:** A IA responde que não tem acesso ao servidor ou não sabe o que é o `moodle-dev-mcp`.

**Solução:** Seja mais explícito na instrução:

```
Use a tool get_plugin_info para carregar o contexto do plugin local_myplugin.
```

```
Use a tool search_api para buscar funções relacionadas a enrollment.
```

Nomear a tool explicitamente garante que a IA a utilize em vez de responder com conhecimento genérico.

---

## 📝 Reportando um novo bug

Se o seu problema não está listado aqui:

1. Peça ao assistente: _"Execute o doctor do moodle-dev-mcp"_ e copie a saída completa
2. Anote qual cliente de IA está usando (Claude Code, Gemini Code Assist) e a versão
3. Abra uma **Issue** no GitHub: [github.com/kaduvelasco/moodle-dev-mcp/issues](https://github.com/kaduvelasco/moodle-dev-mcp/issues)
4. Descreva os passos para reproduzir o erro e inclua a saída do `doctor`

---

> **Dica:** Reiniciar o IDE ou o processo do cliente de IA resolve boa parte dos problemas de travamento do servidor MCP — especialmente após editar arquivos de configuração como `~/.claude.json` ou `~/.gemini/settings.json`.

---

[🏠 Voltar ao Índice](../index.md)
