🌐 [English](../../en/reference/tools.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Referência de Tools (MCP)

As **Tools** são funções executáveis que o seu assistente de IA pode chamar para interagir com a instalação Moodle. Diferente dos Resources — que são leitura passiva —, as Tools realizam ações ativas como geração de contexto, buscas, diagnósticos e monitoramento.

## Como usar

Você não precisa memorizar os nomes das tools. Basta dar ordens em linguagem natural:

- _"Inicialize o contexto do moodle-dev-mcp para minha instalação Moodle."_
- _"Gere o contexto do plugin local_myplugin."_
- _"Busque funções da API do core relacionadas a matrículas."_

O assistente identifica qual tool chamar e executa automaticamente. Para tarefas de scaffold, revisão e debugging, use os **Prompts MCP** — que injetam contexto adicional automaticamente. Veja a [Referência de Prompts](./prompts.md).

---

## 🏗️ Gerenciamento de Contexto

### `init_moodle_context`

Inicializa o contexto para uma instalação Moodle. Deve ser executada uma vez por instalação — ou sempre que o Moodle for atualizado para uma nova versão maior.

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `moodle_path` | string | ✅ | Caminho absoluto para a raiz do Moodle (diretório que contém `version.php`) |

**O que faz:** detecta a versão do Moodle via `version.php`, gera todos os 13 arquivos de índice global (`MOODLE_API_INDEX.md`, `MOODLE_PLUGIN_INDEX.md`, etc.) e salva a configuração em `.moodle-mcp`.

> Pule esta tool se `MOODLE_PATH` já estiver definido como variável de ambiente — o servidor usará o caminho configurado automaticamente.

**Exemplo:**
```
Inicialize o contexto do moodle-dev-mcp para a instalação em
/home/usuario/workspace/www/html/moodle.
```

---

### `generate_plugin_context`

Gera o pacote completo de contexto de IA para um plugin específico. Cria todos os arquivos `PLUGIN_*.md` dentro do diretório do plugin.

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `plugin_path` | string | ✅ | Caminho relativo (`local/myplugin`) ou absoluto para o diretório do plugin |

**O que faz:** executa todos os extractors no plugin e gera 11 arquivos de contexto (`PLUGIN_AI_CONTEXT.md`, `PLUGIN_DB_TABLES.md`, `PLUGIN_FUNCTION_INDEX.md`, etc.).

**Exemplo:**
```
Gere o contexto de IA completo para o plugin local_myplugin.
```

---

### `plugin_batch`

Gera ou atualiza contexto para múltiplos plugins de uma vez. Útil para inicializar todos os plugins em desenvolvimento ou processar a instalação completa.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|:-----------:|--------|-----------|
| `mode` | string | ✅ | `dev` | `dev` — plugins com `.moodle-mcp-dev`; `all` — todos os plugins; `list` — lista específica |
| `plugins` | string[] | ⚠️ | — | Obrigatório quando `mode=list`. Lista de frankenstyles (ex: `["local_a", "local_b"]`) |
| `force` | boolean | ❌ | `false` | Se `true`, ignora o cache mtime e regenera tudo |
| `mark_as_dev` | boolean | ❌ | `false` | Se `true`, cria o arquivo `.moodle-mcp-dev` nos plugins processados |

**Exemplo:**
```
Gere o contexto para todos os plugins que estou desenvolvendo.
```
```
Gere o contexto para os plugins local_relatorios e local_auditoria,
marcando-os como em desenvolvimento.
```

---

### `update_indexes`

Regenera os índices globais do Moodle. Use após instalar ou remover plugins da instalação.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|:-----------:|--------|-----------|
| `force` | boolean | ❌ | `false` | Se `true`, ignora o cache mtime e regenera todos os arquivos |
| `include_plugins` | boolean | ❌ | `false` | Se `true`, regenera também o contexto dos plugins dev |

**O que faz:** re-escaneia a instalação usando cache mtime — arquivos PHP que não mudaram desde a última execução são pulados, tornando execuções subsequentes rápidas.

**Exemplo:**
```
Regenere todos os índices globais do Moodle.
```
```
Regenere todos os índices ignorando o cache — acabei de fazer upgrade do Moodle.
```

---

## 🔍 Busca e Descoberta

### `search_api`

Pesquisa funções na API do core do Moodle por nome ou palavra-chave.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|:-----------:|--------|-----------|
| `query` | string | ✅ | — | Nome da função ou palavra-chave |
| `visibility` | string | ❌ | `public` | `public` — apenas funções públicas; `deprecated` — apenas depreciadas; `all` — todas |
| `limit` | number | ❌ | `30` | Máximo de resultados retornados |

**Exemplo:**
```
Busque funções da API do core relacionadas a matrículas (enrollment)
que não estejam depreciadas.
```

---

### `search_plugins`

Localiza plugins instalados na instalação Moodle por nome, component ou tipo.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|:-----------:|--------|-----------|
| `query` | string | ✅ | — | Termo de busca — nome, frankenstyle ou tipo de plugin |
| `limit` | number | ❌ | `20` | Máximo de resultados retornados |

**Exemplo:**
```
Quais plugins do tipo "local" estão instalados nesta instância Moodle?
```

---

### `get_plugin_info`

Carrega o contexto completo de um plugin na sessão atual da IA. Use sempre antes de começar a trabalhar em um plugin existente.

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `plugin` | string | ✅ | Frankenstyle (`local_myplugin`), caminho relativo ou absoluto |

**O que faz:** lê todos os arquivos `PLUGIN_*.md` do plugin e os carrega no contexto da sessão. A IA passa a conhecer a arquitetura, banco de dados, funções, eventos e padrões do plugin.

**Exemplo:**
```
Carregue o contexto completo do plugin local_myplugin. Quero analisar
a estrutura de banco de dados dele.
```

---

### `list_dev_plugins`

Lista todos os plugins marcados como em desenvolvimento na instalação — ou seja, que possuem o arquivo `.moodle-mcp-dev` em seu diretório.

Sem parâmetros.

**Exemplo:**
```
Quais plugins estão marcados como em desenvolvimento?
```

---

## 🏷️ Marcando Plugins em Desenvolvimento

O servidor identifica quais plugins você está desenvolvendo pela presença do arquivo `.moodle-mcp-dev` no diretório do plugin. Esse marcador é usado por `list_dev_plugins`, `watch_plugins` e `plugin_batch mode="dev"`.

### Como marcar um plugin

**Opção 1 — Manual (mais simples):**

```bash
touch /seu/moodle/local/myplugin/.moodle-mcp-dev
```

**Opção 2 — Via assistente (ao gerar o contexto):**

```
Gere o contexto para o plugin local_myplugin e marque-o como em desenvolvimento.
```

O assistente chamará `plugin_batch` com `mark_as_dev=true`, criando o arquivo automaticamente.

**Opção 3 — Múltiplos plugins de uma vez:**

```
Gere o contexto para os plugins local_relatorios e local_auditoria
e marque ambos como em desenvolvimento.
```

### Como desmarcar um plugin

```bash
rm /seu/moodle/local/myplugin/.moodle-mcp-dev
```

Ou peça ao assistente:

```
Remova a marcação de desenvolvimento do plugin local_myplugin.
```

### Verificar quais plugins estão marcados

```
Quais plugins estão marcados como em desenvolvimento?
```

O assistente chamará `list_dev_plugins` e listará todos os diretórios com `.moodle-mcp-dev`.

### Por que usar marcadores?

Com os plugins marcados, você pode:

- **`watch_plugins action="start"`** — monitorar apenas os plugins dev automaticamente
- **`plugin_batch mode="dev"`** — regenerar o contexto de todos de uma vez
- **`list_dev_plugins`** — ter uma visão rápida do que está em andamento na instalação

---

## 🔁 Monitoramento

### `watch_plugins`

Ativa ou desativa o monitoramento automático de arquivos nos plugins em desenvolvimento. Quando ativo, qualquer arquivo PHP salvo dentro de um plugin dev dispara a regeneração do contexto em background.

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `action` | string | ✅ | `start` — inicia o monitoramento; `stop` — encerra; `status` — exibe o estado atual |

> O modo watch é **in-memory** — não sobrevive a reinicializações do servidor. Máximo de 20 plugins monitorados simultaneamente.

**Exemplo:**
```
Inicie o monitoramento do plugin local_myplugin para alterações de arquivo.
```
```
Qual o status atual do monitoramento de plugins?
```

---

## 🩺 Diagnóstico e Análise

### `explain_plugin`

Gera uma explicação arquitetural detalhada de um plugin. Pode ser solicitada para o plugin inteiro ou focada em uma seção específica.

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `plugin` | string | ✅ | Frankenstyle, caminho relativo ou absoluto |
| `section` | string | ❌ | Seção específica: `database`, `events`, `functions`, `callbacks`, `endpoints`, `flow` |

**Exemplo:**
```
Use explain_plugin para me explicar a arquitetura completa do plugin local_myplugin.
```
```
Explique apenas a seção de banco de dados do plugin local_myplugin.
H� tabelas sem índices ou campos mal tipados?
```

---

### `doctor`

Diagnostica o ambiente do `moodle-dev-mcp` e gera um relatório de saúde.

Sem parâmetros.

**Verificações realizadas:**
- Versão do Node.js (>= 18 requerido)
- Validade e acessibilidade do `MOODLE_PATH`
- Versão do Moodle detectada
- Atualidade e integridade dos índices globais
- Estatísticas do cache (hits, misses, skips)
- Ferramentas opcionais disponíveis (`universal-ctags`)

> `doctor` é uma **tool MCP** — não um comando CLI. Execute pedindo ao assistente: _"Execute o doctor do moodle-dev-mcp."_

**Exemplo:**
```
Execute o doctor do moodle-dev-mcp e me diga se há algum problema
com a configuração atual.
```

---

## Veja também

- [Referência de Resources](./resources.md) — dados que a IA lê passivamente
- [Referência de Prompts](./prompts.md) — scaffold_plugin, review_plugin, debug_plugin
- [Arquivos Gerados](./generated-files.md) — os arquivos `.md` criados na instalação
- [Exemplos de uso](../guides/workflows/examples.md) — prompts prontos para cenários reais

---

[🏠 Voltar ao Índice](../index.md)
