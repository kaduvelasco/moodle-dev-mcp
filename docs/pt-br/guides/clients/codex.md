🌐 [English](../../../en/guides/clients/codex.md) | **Português (BR)** | 🏠 [Índice](../../index.md)

---

# Usando com OpenAI Codex

O **OpenAI Codex** é o agente de desenvolvimento da OpenAI, disponível como CLI (`codex`) e como extensão para VS Code. Diferente dos outros clientes, o Codex usa o formato **TOML** para configuração e um arquivo **`AGENTS.md`** como contexto persistente — em vez de JSON e `CLAUDE.md`/`GEMINI.md`.

> **Importante:** A CLI e a extensão VS Code compartilham o mesmo arquivo de configuração `~/.codex/config.toml`. Configurar em um lugar ativa para os dois.

---

## 🛠️ Configuração do Servidor MCP

### Opção 1 — Via CLI (recomendado)

```bash
codex mcp add moodle-dev-mcp \
  --env MOODLE_PATH=/home/usuario/workspace/www/html/moodle \
  -- npx -y moodle-dev-mcp
```

Verifique se foi registrado:

```bash
codex mcp list
# → moodle-dev-mcp  (stdio)
```

### Opção 2 — Editando o config.toml diretamente

Crie ou edite `~/.codex/config.toml`:

```toml
[mcp_servers.moodle-dev-mcp]
command = "npx"
args    = ["-y", "moodle-dev-mcp"]
env     = { MOODLE_PATH = "/home/usuario/workspace/www/html/moodle" }
```

Para configuração por projeto (apenas em projetos marcados como confiáveis), crie `.codex/config.toml` na raiz do workspace.

> **Atenção ao TOML:** um erro de sintaxe no `config.toml` quebra **tanto** o CLI quanto a extensão VS Code simultaneamente. Valide o arquivo antes de salvar em [toml-lint.com](https://www.toml-lint.com) ou com `codex --config` para verificação rápida.

### Problema com nvm / mise / asdf

O Codex pode não herdar o PATH do seu shell. Se `npx` não for encontrado, use `env_vars` para herdar o PATH do ambiente pai, ou especifique o PATH explicitamente:

```toml
[mcp_servers.moodle-dev-mcp]
command  = "npx"
args     = ["-y", "moodle-dev-mcp"]
env_vars = ["PATH"]
env      = { MOODLE_PATH = "/home/usuario/workspace/www/html/moodle" }
```

Ou com caminho absoluto:

```toml
[mcp_servers.moodle-dev-mcp]
command = "/home/usuario/.nvm/versions/node/v22.0.0/bin/npx"
args    = ["-y", "moodle-dev-mcp"]
env     = { MOODLE_PATH = "/home/usuario/workspace/www/html/moodle" }
```

Execute `which npx` no terminal para encontrar o caminho correto.

---

## 📄 Turbinando com AGENTS.md

O `AGENTS.md` é o equivalente do `CLAUDE.md` e do `GEMINI.md` no Codex. É lido automaticamente a cada sessão — do escopo global ao mais específico:

| Escopo | Localização |
|--------|-------------|
| Global | `~/.codex/AGENTS.md` |
| Raiz do projeto | `AGENTS.md` na raiz do workspace (Git root) |
| Subdiretório | `AGENTS.md` em qualquer subpasta do projeto |

O Codex carrega os arquivos em cascata — do global ao mais específico — e o mais próximo ao diretório atual tem precedência.

Crie o arquivo na raiz da sua instalação Moodle:

```bash
touch /home/usuario/workspace/www/html/moodle/AGENTS.md
```

**Template recomendado:**

```markdown
# Contexto de Desenvolvimento Moodle

## Ambiente
- Versão do Moodle: 4.4 (ajuste conforme sua instalação)
- Caminho: /home/usuario/workspace/www/html/moodle
- Stack: Docker com Nginx + PHP-FPM + MariaDB

## moodle-dev-mcp
O servidor MCP moodle-dev-mcp está configurado.
Use get_plugin_info para carregar contexto antes de analisar um plugin.
Use search_api para encontrar funções do core antes de sugerir alternativas.
Após mudanças significativas em um plugin, execute generate_plugin_context.
Após instalar novos plugins no Moodle, execute update_indexes.

## Plugins em desenvolvimento
- local_myplugin — descreva brevemente o propósito

## Convenções
- Padrão de código: Moodle Coding Style (PSR-12 + Frankenstyle)
- Todo acesso ao banco via $DB — nunca SQL direto
- Todo output via $OUTPUT ou renderers — nunca echo direto
- Capabilities sempre verificadas com require_capability() ou has_capability()
```

---

## 💡 Fluxos de Trabalho Recomendados

### Iniciando uma sessão

```bash
# Entrar no diretório do Moodle antes de iniciar o Codex
cd /home/usuario/workspace/www/html/moodle
codex
```

Iniciar a partir do diretório do Moodle garante que o `AGENTS.md` do projeto seja carregado e que o Codex entenda o contexto do workspace.

Na primeira sessão após configurar:

```
Inicialize o contexto do moodle-dev-mcp para esta instalação Moodle.
```

### Carregando contexto de um plugin

```
Carregue o contexto do plugin local_myplugin e me dê um resumo
da arquitetura, banco de dados e funções principais.
```

### Buscando na API do core

```
Use a tool search_api para encontrar funções da API do core Moodle
relacionadas a enrollment que não estejam depreciadas.
```

### Criando um novo plugin

```
scaffold_plugin
  type="local"
  name="audit_log"
  description="Histórico de auditoria das ações dos usuários"
  features="database tables, scheduled tasks, capabilities, event observers"
```

### Revisão antes do commit

```
/review_plugin plugin="local/myplugin" focus="security"
```

---

## ⚠️ Troubleshooting

### Servidor não aparece após adicionar

O Codex lê o `config.toml` na inicialização. Após editar o arquivo, reinicie a sessão:

```bash
# Encerrar a sessão atual e iniciar uma nova
exit
codex
```

Na extensão VS Code, recarregue a janela: `Ctrl+Shift+P` → **Developer: Reload Window**.

### Erro de sintaxe TOML quebra CLI e VS Code simultaneamente

Esta é uma característica da configuração compartilhada. Se ambos pararem de funcionar após uma edição, o problema quase certamente é sintaxe TOML inválida. Verifique:

- Strings devem usar aspas duplas: `"valor"`, não `'valor'`
- Arrays usam colchetes: `args = ["-y", "moodle-dev-mcp"]`
- O nome da seção deve ser exato: `[mcp_servers.moodle-dev-mcp]`

Valide o arquivo:
```bash
# Sintaxe básica via Python (disponível na maioria dos sistemas)
python3 -c "import tomllib; tomllib.load(open('/home/usuario/.codex/config.toml', 'rb'))"
```

### SSE não é suportado

O Codex suporta apenas **stdio** para servidores locais. O `moodle-dev-mcp` usa stdio por padrão — sem configuração adicional necessária. O modo HTTP (`--http`) do servidor não é compatível com o Codex para uso local.

### Contexto desatualizado após mudanças

- **Mudanças em um plugin:** _"Regenere o contexto do plugin local_myplugin."_
- **Novo plugin instalado:** _"Regenere todos os índices globais do Moodle."_

---

## ➡️ Próximos Passos

- [Claude Code](./claude-code.md) — CLI da Anthropic com configuração JSON
- [Gemini Code Assist](./gemini-code-assist.md) — extensão VS Code com Agent Mode
- [Exemplos de workflows](../workflows/examples.md) — prompts prontos para cenários reais
- [Referência de Tools](../../reference/tools.md) — parâmetros completos de todas as tools
- [Voltar ao Índice](../../index.md)
