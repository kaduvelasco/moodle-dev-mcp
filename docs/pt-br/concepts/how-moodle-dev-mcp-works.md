🌐 [English](../../en/concepts/how-moodle-dev-mcp-works.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Como o moodle-dev-mcp funciona

O `moodle-dev-mcp` lê sua instalação Moodle do disco e dá ao seu assistente de IA conhecimento profundo e preciso da sua base de código — sem copiar e colar nada manualmente.

---

## O pipeline

O fluxo tem três etapas: os **Extractors** leem os arquivos PHP, os **Generators** transformam esse conteúdo em arquivos `.md` de contexto, e o **Servidor MCP** serve esse contexto ao cliente de IA via Tools, Resources e Prompts.

```
Arquivos PHP do Moodle (em disco)
         │
         ▼  Extractors
    Fazem parse de db/install.xml, db/events.php, db/hooks.php,
    lib/*.php, classes/, db/tasks.php, db/services.php,
    db/access.php, db/upgrade.php
         │
         ▼  Generators + cache mtime
    Escrevem arquivos .md de contexto na instalação Moodle:
    MOODLE_API_INDEX.md, PLUGIN_AI_CONTEXT.md, etc.
    (arquivos inalterados são ignorados via cache mtime)
         │
         ▼  Servidor MCP
    Serve contexto via Tools, Resources e Prompts
    para o cliente de IA via stdio ou HTTP
```

---

## Extractors

Cada extractor faz parse de um tipo de arquivo PHP do Moodle e alimenta os generators com dados estruturados:

| Extractor | Faz parse de | Produz |
|-----------|-------------|--------|
| `api.ts` | `lib/*.php` | Funções com visibilidade PHPDoc → `MOODLE_API_INDEX.md` |
| `schema.ts` | `db/install.xml` | Schema do banco (tabelas, campos, chaves) → `PLUGIN_DB_TABLES.md` |
| `events.ts` | `db/events.php` | Registros de observers de eventos → `PLUGIN_EVENTS.md` |
| `hooks.ts` | `db/hooks.php` + `classes/hook/` | Callbacks da Hook API (4.3+) → `PLUGIN_CALLBACK_INDEX.md` |
| `tasks.ts` | `db/tasks.php` | Definições de tasks agendadas → `PLUGIN_DEPENDENCIES.md` |
| `services.ts` | `db/services.php` | Registros de web services → `PLUGIN_ENDPOINT_INDEX.md` |
| `capabilities.ts` | `db/access.php` | Definições de capabilities → `PLUGIN_DEPENDENCIES.md` |
| `upgrade.ts` | `db/upgrade.php` | Histórico de steps de upgrade → `PLUGIN_DEPENDENCIES.md` |
| `classes.ts` | `classes/**/*.php` | Classes, interfaces e traits PHP → `MOODLE_CLASSES_INDEX.md` |
| `plugin.ts` | `version.php` + arquivos de lang | Metadados do plugin → `PLUGIN_CONTEXT.md` |

Para a lista completa dos arquivos gerados, veja a [Referência de Arquivos Gerados](../reference/generated-files.md).

---

## Generators

Os generators recebem a saída dos extractors e escrevem arquivos Markdown estruturados diretamente na instalação Moodle:

- **Generators globais** — escrevem 13 arquivos na raiz do Moodle (`MOODLE_API_INDEX.md`, `MOODLE_PLUGIN_INDEX.md`, `MOODLE_DB_TABLES_INDEX.md`, etc.)
- **Generators de plugin** — escrevem 11 arquivos em cada diretório de plugin (`PLUGIN_AI_CONTEXT.md`, `PLUGIN_DB_TABLES.md`, `PLUGIN_FUNCTION_INDEX.md`, etc.)

O **cache mtime** compara a data de modificação de cada arquivo-fonte com a do arquivo `.md` correspondente e pula a regeneração quando nada mudou — tornando execuções subsequentes muito mais rápidas.

> Para forçar a regeneração completa ignorando o cache, peça ao assistente: _"Regenere todos os índices do Moodle ignorando o cache"_. A IA chamará `update_indexes` com `force=true`.

---

## Tools, Resources e Prompts

Com os arquivos de contexto criados, o servidor MCP os expõe ao cliente de IA de três formas:

- **Tools** — a IA as chama explicitamente para disparar ações (`init_moodle_context`, `search_api`, `get_plugin_info`, `watch_plugins`, etc.)
- **Resources** — a IA os lê passivamente como contexto, sem ação explícita do usuário (`moodle://api-index`, `moodle://plugin/{component}`, etc.)
- **Prompts** — templates pré-construídos que injetam contexto automaticamente e guiam a IA em tarefas complexas (`scaffold_plugin`, `review_plugin`, `debug_plugin`)

---

## Veja também

- [Por que moodle-dev-mcp?](./why-moodle-dev-mcp.md)
- [Arquitetura](./architecture.md)
- [Referência de Tools](../reference/tools.md)
- [Referência de Arquivos Gerados](../reference/generated-files.md)

---

[🏠 Voltar ao Índice](../index.md)
