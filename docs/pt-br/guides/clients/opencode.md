🌐 [English](../../../en/guides/clients/opencode.md) | **Português (BR)** | 🏠 [Índice](../../index.md)

---

# Usando com OpenCode

O **OpenCode** é um agente de desenvolvimento de código aberto que roda no terminal, com suporte nativo a servidores MCP. Sua interface TUI (Text User Interface) permite um fluxo de trabalho totalmente baseado em terminal, similar ao Claude Code.

> **Instalação mais completa disponível:** O projeto **Lumia Dev** oferece uma instalação pré-configurada e mais completa do OpenCode, com integrações e ajustes prontos para desenvolvimento Moodle. Se você usa ou planeja usar o Lumia Dev, considere utilizar a configuração de lá.

---

## 🛠️ Instalação do OpenCode

### Verificar se já está instalado

Antes de instalar, verifique se o OpenCode já está disponível no seu sistema:

```bash
which opencode && opencode --version
```

Se um caminho e uma versão forem exibidos, o OpenCode já está instalado — pule para a seção de [Configuração do Servidor MCP](#️-configuração-do-servidor-mcp).

### Instalar via npm (recomendado)

```bash
npm install -g opencode-ai
```

Verifique a instalação:

```bash
opencode --version
```

### Instalar via script oficial

```bash
curl -fsSL https://opencode.ai/install | bash
```

> **Instalação mais completa:** O projeto **Lumia Dev** possui uma configuração mais completa do OpenCode, com scripts de setup, integrações adicionais e ajustes de ambiente prontos para uso. Se você já utiliza o Lumia Dev ou planeja utilizá-lo, prefira a instalação e configuração disponíveis lá.

---

## ⚙️ Configuração do Servidor MCP

O OpenCode lê a configuração de servidores MCP a partir do arquivo `opencode.json` na raiz do projeto ou em `~/.config/opencode/config.json` para configuração global.

### Opção 1 — Configuração por projeto (recomendado)

Crie ou edite `opencode.json` na raiz da sua instalação Moodle:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "moodle-dev-mcp": {
      "type": "local",
      "command": ["npx", "-y", "moodle-dev-mcp"],
      "environment": {
        "MOODLE_PATH": "/home/usuario/workspace/www/html/moodle"
      }
    }
  }
}
```

> **Atenção:** O OpenCode usa `"command"` como **array** (não string) e `"environment"` (não `"env"`). O campo `"args"` separado não é suportado — incluir campos inválidos gera o erro `Configuration is invalid`.

### Opção 2 — Configuração global

Crie ou edite `~/.config/opencode/config.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "moodle-dev-mcp": {
      "type": "local",
      "command": ["npx", "-y", "moodle-dev-mcp"],
      "environment": {
        "MOODLE_PATH": "/home/usuario/workspace/www/html/moodle"
      }
    }
  }
}
```

### Problema com nvm / mise / asdf

O OpenCode pode não herdar o PATH do seu shell. Se `npx` não for encontrado, especifique o caminho absoluto como primeiro elemento do array `command`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "moodle-dev-mcp": {
      "type": "local",
      "command": ["/home/usuario/.nvm/versions/node/v22.0.0/bin/npx", "-y", "moodle-dev-mcp"],
      "environment": {
        "MOODLE_PATH": "/home/usuario/workspace/www/html/moodle"
      }
    }
  }
}
```

Execute `which npx` no terminal para encontrar o caminho correto.

### Verificar a conexão

Inicie o OpenCode no diretório da sua instalação Moodle:

```bash
cd /home/usuario/workspace/www/html/moodle
opencode
```

Dentro da sessão, verifique se o servidor está conectado — o `moodle-dev-mcp` deve aparecer na lista de servidores MCP ativos.

---

## 📄 Turbinando com AGENTS.md

O OpenCode lê automaticamente o arquivo `AGENTS.md` para carregar o contexto do projeto a cada sessão.

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
# Entrar no diretório do Moodle antes de iniciar o OpenCode
cd /home/usuario/workspace/www/html/moodle
opencode
```

Iniciar a partir do diretório do Moodle garante que o `AGENTS.md` do projeto seja carregado.

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

### Servidor não aparece após configurar

O OpenCode lê o `opencode.json` na inicialização. Após editar o arquivo, reinicie a sessão.

Verifique também se o JSON está bem formado — um erro de sintaxe impede o carregamento da configuração inteira:

```bash
node -e "JSON.parse(require('fs').readFileSync('opencode.json', 'utf8'))" && echo "JSON válido"
```

### `npx` ou `node` não encontrado

Se o OpenCode não herdar o PATH do shell, use o caminho absoluto no campo `command` (veja a seção de configuração acima).

```bash
# Encontre o caminho correto
which npx
# → /home/usuario/.nvm/versions/node/v22.0.0/bin/npx
```

### Contexto desatualizado após mudanças

- **Mudanças em um plugin:** _"Regenere o contexto do plugin local_myplugin."_
- **Novo plugin instalado:** _"Regenere todos os índices globais do Moodle."_

---

## ➡️ Próximos Passos

- [Claude Code](./claude-code.md) — CLI da Anthropic com configuração JSON
- [OpenAI Codex](./codex.md) — CLI da OpenAI com configuração TOML
- [Exemplos de workflows](../workflows/examples.md) — prompts prontos para cenários reais
- [Referência de Tools](../../reference/tools.md) — parâmetros completos de todas as tools
- [Voltar ao Índice](../../index.md)
