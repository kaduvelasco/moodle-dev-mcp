🌐 [English](../../../en/guides/clients/gemini-code-assist.md) | **Português (BR)** | 🏠 [Índice](../../index.md)

---

# Usando com Gemini Code Assist

O **Gemini Code Assist** está disponível como CLI de terminal (`gemini`) e como extensão para o VS Code. Ambos suportam servidores MCP e compartilham o mesmo arquivo de configuração `~/.gemini/settings.json`.

---

## 🛠️ Configuração do Servidor MCP

### Opção 1 — Via CLI (recomendado)

```bash
gemini mcp add moodle-dev-mcp \
  --command "npx" \
  --args "-y,moodle-dev-mcp" \
  --env MOODLE_PATH=/caminho/para/seu/moodle
```

Verifique se foi registrado:

```bash
gemini mcp list
# → moodle-dev-mcp: npx -y moodle-dev-mcp
```

### Opção 2 — Editando o settings.json diretamente

O arquivo de configuração fica em:

| Sistema operacional | Caminho |
|---------------------|---------|
| Linux / macOS | `~/.gemini/settings.json` |
| Windows | `%USERPROFILE%\.gemini\settings.json` |

**Via NPM:**

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "command": "npx",
            "args": ["-y", "moodle-dev-mcp"],
            "env": {
                "MOODLE_PATH": "/caminho/para/seu/moodle"
            }
        }
    }
}
```

**Via repositório clonado:**

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "command": "node",
            "args": ["/caminho/absoluto/para/moodle-dev-mcp/dist/index.js"],
            "env": {
                "MOODLE_PATH": "/caminho/para/seu/moodle"
            }
        }
    }
}
```

> **Problema com nvm / mise / asdf:** o Gemini herda o ambiente do processo pai, que pode não incluir o PATH do seu shell. Se `npx` não for encontrado, adicione o PATH explicitamente:
> ```json
> "env": {
>     "PATH": "/home/usuario/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin",
>     "MOODLE_PATH": "/caminho/para/seu/moodle"
> }
> ```
> Execute `which node` no terminal para encontrar o caminho correto.

### Após configurar

**CLI:** reinicie a sessão do Gemini (`Ctrl+C` e `gemini` novamente) para carregar o novo servidor.

**VS Code:** recarregue a janela após salvar o `settings.json`:

`Ctrl+Shift+P` → **Developer: Reload Window**

---


## 🤖 Ativando o Agent Mode

Os servidores MCP **só funcionam no Agent Mode** — não no chat padrão do Gemini.

1. Abra o painel do Gemini no VS Code (ícone na barra de atividades)
2. Clique no toggle **Agent** no topo do painel
3. Verifique se o servidor foi detectado digitando no chat:

```
/mcp
```

Você verá `moodle-dev-mcp` listado como conectado com as 11 tools disponíveis. Se não aparecer, veja a seção de [Troubleshooting](#️-solução-de-problemas).

### Inicializar o contexto Moodle

Na primeira sessão, peça ao Gemini:

```
Inicialize o contexto do moodle-dev-mcp para minha instalação Moodle.
```

O Gemini chamará `init_moodle_context`, detectará a versão e gerará todos os índices globais.

---

## 📄 Turbinando com GEMINI.md

O Gemini Code Assist lê automaticamente arquivos `GEMINI.md` ao iniciar cada sessão. Ele suporta múltiplos escopos — do mais geral ao mais específico:

| Escopo | Localização |
|--------|-------------|
| Global | `~/.gemini/GEMINI.md` |
| Raiz do projeto | `GEMINI.md` na raiz do workspace |
| Subdiretório | `GEMINI.md` dentro de qualquer subpasta |

Crie o arquivo na raiz da sua instalação Moodle:

```bash
touch /home/usuario/workspace/www/html/moodle/GEMINI.md
```

**Template recomendado:**

```markdown
# Contexto de Desenvolvimento Moodle

## Ambiente
- Versão do Moodle: 4.4 (ajuste conforme sua instalação)
- Caminho: /home/usuario/workspace/www/html/moodle
- Stack: Docker com Nginx + PHP-FPM + MariaDB

## moodle-dev-mcp
O servidor MCP moodle-dev-mcp está conectado no modo Agent.
Use get_plugin_info para carregar contexto antes de analisar um plugin.
Use search_api para encontrar funções do core antes de sugerir alternativas.
Use os slash commands /scaffold_plugin, /review_plugin e /debug_plugin
para tarefas complexas de desenvolvimento.

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

### Iniciando uma sessão de desenvolvimento

No início de cada sessão no modo Agent, carregue o contexto do plugin:

```
Estou trabalhando no plugin local_myplugin. Carregue o contexto completo.
```

O Gemini chamará `get_plugin_info` e passará a conhecer a arquitetura, banco de dados, funções e padrões do plugin.

### Consultando a API do core

```
Quais funções da API do core devo usar para verificar se um usuário
está matriculado em um curso? Prefira funções públicas e não depreciadas.
```

O Gemini usará `search_api` e retornará as funções com assinaturas e arquivos fonte.

### Consultando a estrutura do banco

```
Quais são os campos da tabela mdl_course? Use o moodle-dev-mcp para verificar.
```

O Gemini consultará o resource `moodle://db-tables` sem necessidade de abrir o banco de dados.

### Criação de novos plugins com slash command

No modo Agent, use o slash command diretamente:

```
/scaffold_plugin type="local" name="web_service_test" description="Plugin de teste de web services" features="web services, capabilities"
```

Após criar os arquivos, gere o contexto:

```
Gere o contexto de IA para o plugin local_web_service_test.
```

### Revisão antes de um commit

```
/review_plugin plugin="local/myplugin" focus="security"
```

---

## ⚠️ Solução de Problemas

### Primeiro passo: verificar a conexão

Execute `/mcp` no chat do Agent Mode. Se `moodle-dev-mcp` não aparecer, o problema está na configuração — não no seu prompt.

### O servidor aparece como "Connecting..." e trava

Problema comum no VS Code. Solução:

1. Confirme que está no **Agent Mode** — MCP não funciona no chat padrão
2. Recarregue a janela: `Ctrl+Shift+P` → **Developer: Reload Window**
3. Verifique se o `node` ou `npx` está acessível pelo PATH configurado no `settings.json`

### Caminhos relativos não funcionam

O `settings.json` exige caminhos **absolutos**. Caminhos relativos como `./dist/index.js` não são resolvidos pelo Gemini Code Assist.

### MOODLE_PATH incorreto

Certifique-se de que `MOODLE_PATH` aponta para o diretório que contém o arquivo `version.php`. O servidor falha silenciosamente se não conseguir validar a instalação.

### Contexto desatualizado após mudanças

- **Novo plugin instalado:** _"Regenere todos os índices globais do Moodle."_ → `update_indexes`
- **Mudanças em um plugin:** _"Regenere o contexto do plugin local_myplugin."_ → `generate_plugin_context`

---

## ➡️ Próximos Passos

- [Claude Code](./claude-code.md) — CLI da Anthropic com suporte nativo a MCP
- [OpenAI Codex](./codex.md) — CLI da OpenAI com configuração TOML
- [OpenCode](./opencode.md) — agente open source com interface TUI
- [Exemplos de workflows](../workflows/examples.md) — casos de uso reais e prompts prontos
- [Referência de Tools](../../reference/tools.md) — parâmetros completos de todas as tools
- [Problemas Comuns](../../troubleshooting/common-issues.md) — troubleshooting detalhado
- [Voltar ao Índice](../../index.md)
