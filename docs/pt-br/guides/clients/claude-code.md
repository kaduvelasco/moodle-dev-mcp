🌐 [English](../../../en/guides/clients/claude-code.md) | **Português (BR)** | 🏠 [Índice](../../index.md)

---

# Usando com Claude Code

O **Claude Code** é o CLI da Anthropic para desenvolvimento assistido por IA. É um dos clientes MCP mais eficientes para desenvolvimento Moodle, pois permite um fluxo de trabalho baseado inteiramente em terminal e automação, com suporte nativo ao protocolo MCP via stdio.

---

## 🛠️ Configuração Inicial

### 1. Adicionar o servidor

No seu terminal, execute (ajuste os caminhos conforme sua máquina):

```bash
claude mcp add moodle-dev-mcp \
  -e MOODLE_PATH=/home/usuario/workspace/www/html/moodle \
  -- npx -y moodle-dev-mcp
```

O Claude criará ou editará o arquivo `~/.claude.json`. A partir deste momento, sempre que você iniciar o `claude`, ele se conectará automaticamente ao servidor MCP em segundo plano.

### 2. Verificar a conexão

Dentro de uma sessão do Claude Code, execute:

```
/mcp
```

Você verá `moodle-dev-mcp` listado como conectado, com as 11 tools disponíveis. Se o servidor não aparecer, veja a seção de [Troubleshooting](#️-troubleshooting).

### 3. Inicializar o contexto Moodle

Na primeira sessão após a configuração, peça ao Claude:

```
Inicialize o contexto do moodle-dev-mcp para minha instalação Moodle.
```

O Claude chamará `init_moodle_context`, detectará a versão do Moodle e gerará todos os índices globais. Este passo só precisa ser feito uma vez por instalação.

---

## 📄 Turbinando com CLAUDE.md

O Claude Code lê automaticamente o arquivo `CLAUDE.md` na raiz do projeto ao iniciar cada sessão — eliminando a necessidade de re-explicar o ambiente toda vez.

Crie o arquivo na raiz da sua instalação Moodle:

```bash
touch /home/usuario/workspace/www/html/moodle/CLAUDE.md
```

**Template recomendado:**

```markdown
# Contexto de Desenvolvimento Moodle

## Ambiente
- Versão do Moodle: 4.4 (ajuste conforme sua instalação)
- Caminho: /home/usuario/workspace/www/html/moodle
- Stack: Docker com Nginx + PHP-FPM + MariaDB

## moodle-dev-mcp
O servidor MCP moodle-dev-mcp está conectado e os índices foram gerados.
Tools disponíveis: init_moodle_context, generate_plugin_context, plugin_batch,
update_indexes, watch_plugins, search_plugins, search_api, get_plugin_info,
list_dev_plugins, doctor, explain_plugin.

## Plugins em desenvolvimento
- local_myplugin — descreva brevemente o propósito

## Convenções
- Padrão de código: Moodle Coding Style (PSR-12 + Frankenstyle)
- Todo acesso ao banco via $DB — nunca SQL direto
- Todo output via $OUTPUT ou renderers — nunca echo direto
- Capabilities sempre verificadas com require_capability() ou has_capability()

## Fluxo de trabalho
1. Antes de trabalhar em um plugin, carregue o contexto com get_plugin_info.
2. Use search_api antes de sugerir funções do core — prefira APIs documentadas.
3. Após adicionar novos plugins à instalação, execute update_indexes.
4. Após mudanças significativas em um plugin, execute generate_plugin_context.
```

---

## 💡 Fluxos de Trabalho Recomendados

### Iniciando uma sessão de desenvolvimento

No início de cada sessão, carregue o contexto do plugin em que vai trabalhar:

```
Estou trabalhando no plugin local_myplugin. Carregue o contexto completo.
```

O Claude chamará `get_plugin_info` e passará a conhecer a arquitetura, banco de dados, funções, eventos e padrões de código do plugin.

### Pesquisa na API do core

Em vez de abrir o navegador para consultar a documentação oficial:

```
Quais funções da API do core devo usar para lidar com persistência
de notas (grades)? Prefira funções públicas e não depreciadas.
```

O Claude usará `search_api` e retornará as funções com assinaturas, arquivos fonte e indicação de versão (`@since`).

### Criação de novos plugins

Use o prompt `scaffold_plugin` para criar a estrutura completa de um plugin:

```
scaffold_plugin
  type="block"
  name="monitor_alunos"
  description="Exibe um resumo de atividade dos alunos para professores"
  features="capabilities, caching"
```

Após criar os arquivos, gere o contexto para que o Claude passe a conhecer o novo plugin:

```
Gere o contexto de IA para o plugin block_monitor_alunos e me explique
a estrutura de classes gerada.
```

### Debugging de erros

Cole o erro diretamente no chat:

```
Estou recebendo este erro no Moodle:

[COLE O ERRO AQUI]

Carregue o contexto do plugin local_myplugin e ajude a identificar
a causa raiz e a correção.
```

### Ativando watch mode durante o desenvolvimento

Para que o contexto se atualize automaticamente enquanto você codifica:

```
Inicie o monitoramento do plugin local_myplugin para alterações.
```

O Claude chamará `watch_plugins action="start"`. Qualquer arquivo PHP salvo no plugin dispara uma atualização de contexto em background.

---

## ⚠️ Troubleshooting

### Primeiro passo: verificar a conexão

Antes de qualquer outra investigação, execute `/mcp` dentro da sessão do Claude. Se `moodle-dev-mcp` não aparecer como conectado, o problema está na configuração do servidor, não no seu prompt.

### `node: command not found`

O Claude Code não herda o PATH do seu shell. Se o Node.js foi instalado via gerenciador de versão (nvm, mise, asdf), forneça o caminho absoluto no bloco `env`:

```bash
# Encontre o caminho correto
which node
# → /home/usuario/.nvm/versions/node/v22.0.0/bin/node

# Re-adicione o servidor com o PATH explícito
claude mcp remove moodle-dev-mcp
claude mcp add moodle-dev-mcp \
  -e MOODLE_PATH=/home/usuario/workspace/www/html/moodle \
  -e PATH=/home/usuario/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin \
  -- npx -y moodle-dev-mcp
```

### Erros de permissão

Se o Claude Code reclamar que não consegue executar o servidor, verifique se o `node` e o `npx` têm permissão de execução:

```bash
which npx && npx --version
```

### Servidor conectado mas tools não respondem

Execute o diagnóstico pedindo ao Claude:

```
Execute o doctor do moodle-dev-mcp.
```

O Claude chamará a tool `doctor` e retornará um relatório com o status do servidor, versão do Moodle, atualidade dos índices e stats de cache.

### Contexto desatualizado após mudanças

- **Novo plugin instalado no Moodle:** _"Regenere todos os índices globais do Moodle."_ → `update_indexes`
- **Mudanças significativas em um plugin:** _"Regenere o contexto do plugin local_myplugin."_ → `generate_plugin_context`

---

## ➡️ Próximos Passos

- [Gemini Code Assist](./gemini-code-assist.md) — guia equivalente para VS Code
- [Exemplos de workflows](../workflows/examples.md) — casos de uso reais e prompts prontos
- [Referência de Tools](../../reference/tools.md) — parâmetros completos de todas as tools
- [Voltar ao Índice](../../index.md)
