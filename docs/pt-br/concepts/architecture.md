🌐 [English](../../en/concepts/architecture.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Arquitetura

Visão geral dos componentes do `moodle-dev-mcp`, do fluxo de dados e dos modos de operação.

---

## Estrutura do projeto

```
moodle-dev-mcp/
├── .env.example          ← referência de variáveis de ambiente
├── .npmignore            ← exclui src/, docs/ e scripts do pacote npm
├── package.json          ← dependências, scripts e metadados npm
├── setup.sh              ← setup em um passo: verificar + instalar + build
├── tsconfig.json
├── server.json           ← manifesto para o MCP Registry oficial
├── PUBLISHING.md         ← guia de publicação no npm (uso do maintainer)
├── docs/                 ← documentação completa (en/ e pt-br/)
└── src/
    ├── index.ts          ← entry point — stdio (padrão) ou HTTP (--http)
    ├── server.ts         ← factory do servidor MCP
    ├── config.ts         ← carregador de config: ENV vars → .moodle-mcp
    ├── cache.ts          ← cache in-memory por mtime
    ├── http.ts           ← transporte Streamable HTTP (Express, sessões, auth)
    ├── watcher.ts        ← regeneração automática via fs.watch()
    ├── extractors/       ← lê e faz parse dos arquivos PHP do Moodle
    ├── generators/       ← escreve arquivos .md de contexto em disco
    ├── tools/            ← 11 MCP tools
    ├── resources/        ← 14+ URIs de MCP resource
    ├── prompts/          ← 3 templates de MCP prompt
    ├── tests/            ← testes unitários (node:test, sem dependências extras)
    └── utils/            ← mapa compartilhado PLUGIN_TYPE_TO_DIR (30+ tipos)
```

---

## Fluxo de dados

```
1. Assistente de IA chama init_moodle_context
   └─ config.ts detecta a versão do Moodle via version.php
   └─ config.ts salva MOODLE_PATH e versão em .moodle-mcp

2. Generators chamam Extractors
   └─ cada extractor lê um tipo de arquivo PHP do Moodle
   └─ generator escreve .md na raiz do Moodle ou no diretório do plugin
   └─ cache.ts verifica mtime — pula arquivos inalterados

3. Cliente de IA lê Resources (passivamente)
   └─ moodle://plugin/local_myplugin → PLUGIN_AI_CONTEXT.md
   └─ moodle://api-index → MOODLE_API_INDEX.md

4. Cliente de IA chama Tools (explicitamente)
   └─ get_plugin_info → carrega todos os PLUGIN_*.md de um plugin
   └─ search_api → pesquisa no MOODLE_API_INDEX.md
   └─ watch_plugins → ativa fs.watch() nos diretórios de plugins dev

5. Cliente de IA usa Prompts
   └─ scaffold_plugin → injeta contexto Moodle + template few-shot
   └─ review_plugin → injeta contexto do plugin + checklist de revisão
   └─ debug_plugin → injeta contexto + detecção automática do tipo de erro
```

---

## Resolução de configuração

O servidor determina o caminho do Moodle seguindo esta ordem de prioridade:

```
Variável de ambiente MOODLE_PATH
         │ (maior prioridade)
         ▼
Arquivo .moodle-mcp (escrito pelo init_moodle_context)
         │
         ▼
Parâmetro direto na tool (moodle_path="...")
```

> **Nota sobre `MOODLE_VERSION`:** a variável de ambiente `MOODLE_VERSION` existe mas é ignorada quando `init_moodle_context` ou `update_indexes` são chamados — nesses casos, a versão é sempre detectada automaticamente de `version.php`. O `MOODLE_VERSION` só é efetivamente usado quando o init é pulado ou quando a detecção automática falha. Veja detalhes em [Instalação](../getting-started/installation.md).

---

## Modos de transporte

| Modo | Quando usar | Como iniciar |
|------|-------------|-------------|
| **stdio** | Moodle local — mesma máquina (LuminaStack, instalação direta) | `node dist/index.js` |
| **HTTP** | Moodle remoto — servidor separado ou ambiente isolado | `node dist/index.js --http --port 3000 --host 0.0.0.0 --token seu-token` |

Flags disponíveis no modo HTTP:

| Flag | Padrão | Descrição |
|------|--------|-----------|
| `--port` | `3000` | Porta TCP |
| `--host` | `127.0.0.1` | Endereço de bind (`0.0.0.0` para todas as interfaces) |
| `--token` | — | Token Bearer para autenticação — obrigatório em redes não-loopback |
| `--allowed-host` | — | Hostname extra permitido pela validação do header Host (repetível) |

> Para uso com Docker ou LuminaStack, veja o guia [Docker & Ambientes](../guides/environments/docker.md).

---

## Veja também

- [Como o moodle-dev-mcp funciona](./how-moodle-dev-mcp-works.md) — pipeline completo de Extractors e Generators
- [Extractors](../architecture/extractors.md) — como os arquivos PHP são lidos e interpretados
- [Generators](../architecture/generators.md) — como os arquivos `.md` de contexto são gerados
- [Sistema de Cache](../architecture/cache-system.md) — estratégia de cache e invalidação

---

[🏠 Voltar ao Índice](../index.md)
