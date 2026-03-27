🌐 [English](../../en/concepts/glossary.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Glossário

Termos técnicos usados na documentação do `moodle-dev-mcp`, organizados alfabeticamente.

---

## Cache mtime

Mecanismo de cache usado pelos Generators para evitar regeneração desnecessária de arquivos. Antes de reescrever um arquivo `.md` de contexto, o servidor compara a data de modificação (`mtime`) do arquivo-fonte PHP com a do arquivo `.md` correspondente. Se o PHP não mudou desde a última geração, o arquivo é pulado.

Para forçar a regeneração completa, peça ao assistente: _"Regenere todos os índices ignorando o cache"_. A IA chamará `update_indexes` com `force=true`.

→ Veja: [Sistema de Cache](../architecture/cache-system.md)

---

## Component

Identificador único de um plugin Moodle no formato **frankenstyle** — `tipo_nome`. É o valor que aparece no `version.php` de cada plugin e é usado como parâmetro nas tools do servidor.

Exemplos: `local_myplugin`, `mod_quiz`, `block_html`, `auth_ldap`.

→ Veja: [Frankenstyle](#frankenstyle)

---

## Extractor

Módulo interno do `moodle-dev-mcp` responsável por ler e fazer parse de um tipo específico de arquivo PHP do Moodle. Cada extractor produz dados estruturados que são consumidos pelos Generators.

Exemplos: `schema.ts` lê `db/install.xml`; `events.ts` lê `db/events.php`; `api.ts` lê `lib/*.php`.

→ Veja: [Extractors](../architecture/extractors.md) · [Como o servidor funciona](./how-moodle-dev-mcp-works.md)

---

## Frankenstyle

Convenção de nomenclatura do Moodle para identificar plugins de forma única. O formato é `tipo_nome`, onde `tipo` é o tipo do plugin (`local`, `mod`, `block`, `auth`, etc.) e `nome` é o identificador do plugin em minúsculas sem hífens.

Exemplos: `local_mytools`, `mod_checklist`, `block_coursestats`.

O frankenstyle é usado como prefixo de tabelas no banco de dados, como namespace PHP e como parâmetro nas tools do servidor (parâmetro `plugin` em `get_plugin_info`, por exemplo).

---

## Generator

Módulo interno do `moodle-dev-mcp` responsável por transformar os dados produzidos pelos Extractors em arquivos `.md` de contexto escritos diretamente na instalação Moodle. Existem dois tipos: generators globais (escrevem na raiz do Moodle) e generators de plugin (escrevem dentro de cada diretório de plugin).

→ Veja: [Generators](../architecture/generators.md) · [Arquivos Gerados](../reference/generated-files.md)

---

## Hook API

Sistema de extensão do Moodle introduzido na versão 4.3 que substitui progressivamente os callbacks legados do `lib.php`. Permite que plugins se registrem para receber notificações de eventos do core de forma mais estruturada e com melhor suporte a tipagem PHP.

O `moodle-dev-mcp` detecta e indexa tanto os callbacks legados quanto as definições da Hook API em `db/hooks.php` e `classes/hook/`.

---

## MCP (Model Context Protocol)

Padrão aberto criado pela Anthropic que define como assistentes de IA se comunicam com ferramentas e fontes de dados externas. Permite que um único servidor seja usado por qualquer cliente compatível — Claude Code, Gemini Code Assist, Cursor e outros.

O `moodle-dev-mcp` é um servidor MCP especializado em desenvolvimento de plugins Moodle.

→ Veja: [O que é MCP?](./what-is-mcp.md)

---

## `.moodle-mcp`

Arquivo de configuração gerado automaticamente pelo servidor quando `init_moodle_context` é executado pela primeira vez. Armazena o caminho da instalação Moodle e a versão detectada, eliminando a necessidade de passar esses dados a cada sessão.

É lido pelo `config.ts` na inicialização do servidor. Variáveis de ambiente (`MOODLE_PATH`) têm prioridade sobre este arquivo.

---

## `PLUGIN_AI_CONTEXT.md`

Arquivo principal de contexto gerado pelo servidor dentro de cada diretório de plugin. Consolida as informações mais relevantes do plugin — arquitetura, banco de dados, funções, eventos, callbacks e fluxo de execução — em um único arquivo otimizado para consumo pelo assistente de IA.

É o ponto de entrada recomendado para iniciar qualquer sessão de desenvolvimento em um plugin existente.

→ Veja: [Arquivos Gerados](../reference/generated-files.md)

---

## Prompt (MCP)

Template de prompt pré-construído exposto pelo servidor MCP que injeta automaticamente o contexto completo do Moodle e da instalação antes de executar uma tarefa. Diferente das Tools — que executam ações —, os Prompts orientam a IA sobre **como** realizar uma tarefa complexa, com exemplos e padrões específicos do Moodle.

O `moodle-dev-mcp` expõe três prompts:

| Prompt | Para que serve |
|--------|---------------|
| `scaffold_plugin` | Criar a estrutura completa de um novo plugin |
| `review_plugin` | Revisar o código de um plugin com foco configurável |
| `debug_plugin` | Depurar um erro com contexto completo do plugin |

No Gemini Code Assist (modo Agent), os prompts estão disponíveis como slash commands: `/scaffold_plugin`, `/review_plugin`, `/debug_plugin`.

→ Veja: [Referência de Prompts](../reference/prompts.md)

---

## Resource (MCP)

Dado estruturado exposto pelo servidor MCP via URI que o cliente de IA lê passivamente como contexto — sem necessidade de chamada explícita pelo usuário. Os resources são atualizados sempre que os arquivos `.md` de contexto são regenerados.

Exemplos de URIs: `moodle://api-index`, `moodle://plugin/local_myplugin`, `moodle://db-tables`.

→ Veja: [Referência de Resources](../reference/resources.md)

---

## stdio

Modo de transporte padrão do MCP em que o servidor roda como subprocesso do cliente de IA, comunicando-se via entrada e saída padrão (stdin/stdout). Não abre portas de rede. Recomendado para uso local quando o Moodle está na mesma máquina que o cliente de IA.

→ Veja: [Arquitetura — Modos de transporte](./architecture.md#modos-de-transporte)

---

## Streamable HTTP

Modo de transporte alternativo do MCP em que o servidor roda como serviço HTTP independente. Usado quando o Moodle está em uma máquina diferente da que executa o cliente de IA (ex: servidor remoto, ambiente Docker isolado). Requer configuração de autenticação via token Bearer.

→ Veja: [Arquitetura — Modos de transporte](./architecture.md#modos-de-transporte) · [Docker & Ambientes](../guides/environments/docker.md)

---

## Tool (MCP)

Função executável exposta pelo servidor MCP que o assistente de IA pode chamar explicitamente para realizar uma ação. Diferente dos Resources — que são lidos passivamente —, as Tools são invocadas sob demanda, geralmente em resposta a um pedido do usuário em linguagem natural.

O `moodle-dev-mcp` expõe 11 tools:

| Tool | O que faz |
|------|-----------|
| `init_moodle_context` | Inicializa o contexto completo da instalação |
| `generate_plugin_context` | Gera contexto de IA para um plugin específico |
| `plugin_batch` | Gera contexto para múltiplos plugins de uma vez |
| `update_indexes` | Regenera os índices globais |
| `watch_plugins` | Monitora plugins e atualiza contexto ao salvar |
| `search_plugins` | Pesquisa plugins instalados |
| `search_api` | Pesquisa funções da API core do Moodle |
| `get_plugin_info` | Carrega contexto completo de um plugin na sessão |
| `list_dev_plugins` | Lista plugins em desenvolvimento |
| `doctor` | Diagnostica o ambiente e reporta saúde do servidor |
| `explain_plugin` | Explica a arquitetura de um plugin por seção |

→ Veja: [Referência de Tools](../reference/tools.md)

---

[🏠 Voltar ao Índice](../index.md)
