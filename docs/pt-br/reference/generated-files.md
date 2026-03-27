🌐 [English](../../en/reference/generated-files.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Arquivos de Contexto Gerados

O `moodle-dev-mcp` gera arquivos Markdown estruturados diretamente na sua instalação Moodle. Esses arquivos servem como uma "ponte de conhecimento" — permitem que o assistente de IA entenda a arquitetura do seu código sem precisar ler milhares de linhas de PHP bruto.

Os arquivos são gerados pelas tools do servidor e mantidos atualizados pelo sistema de cache mtime: um arquivo só é reescrito se o código-fonte PHP ou XML correspondente tiver sido modificado desde a última execução.

---

## 📂 Arquivos Globais (raiz do Moodle)

Gerados pelas tools `init_moodle_context` e `update_indexes`. Mapeiam toda a instalação.

| Arquivo | Descrição |
| :------ | :-------- |
| `AI_CONTEXT.md` | Resumo da instalação: versão, caminhos e diretrizes de desenvolvimento |
| `MOODLE_AI_INDEX.md` | Índice mestre de todos os arquivos de contexto gerados |
| `MOODLE_AI_WORKSPACE.md` | Guia para a IA sobre como navegar e trabalhar no workspace |
| `MOODLE_API_INDEX.md` | Catálogo de funções do core com assinaturas, visibilidade e `@since` |
| `MOODLE_CLASSES_INDEX.md` | Índice de classes PHP, interfaces e traits |
| `MOODLE_CAPABILITIES_INDEX.md` | Todas as capabilities (permissões) disponíveis na instalação |
| `MOODLE_DB_TABLES_INDEX.md` | Estrutura completa de todas as tabelas `mdl_` |
| `MOODLE_EVENTS_INDEX.md` | Todos os observers de eventos registrados na instalação |
| `MOODLE_PLUGIN_INDEX.md` | Mapa de todos os plugins instalados com versões e caminhos |
| `MOODLE_SERVICES_INDEX.md` | Todas as funções de web service registradas |
| `MOODLE_TASKS_INDEX.md` | Todas as scheduled tasks e ad-hoc tasks |
| `MOODLE_DEV_RULES.md` | Padrões de código Moodle (Moodle Coding Style) para referência da IA |
| `MOODLE_PLUGIN_GUIDE.md` | Referência rápida de estrutura por tipo de plugin |
| `tags` | Arquivo ctags para navegação rápida de símbolos (gerado se `universal-ctags` estiver instalado) |

---

## 🧩 Arquivos por Plugin

Gerados pela tool `generate_plugin_context` (ou `plugin_batch`). Criados dentro do diretório de cada plugin — por exemplo: `local/myplugin/`.

### Contexto principal

| Arquivo | Descrição |
| :------ | :-------- |
| `PLUGIN_AI_CONTEXT.md` | **Arquivo principal.** Consolida o contexto mais relevante do plugin — carregue este primeiro em qualquer sessão de desenvolvimento |
| `PLUGIN_CONTEXT.md` | Metadados do plugin: component, tipo, versão, caminho e dependências declaradas |

### Estrutura e arquitetura

| Arquivo | Descrição |
| :------ | :-------- |
| `PLUGIN_STRUCTURE.md` | Árvore de diretórios do plugin (arquivos `.md` gerados excluídos) |
| `PLUGIN_ARCHITECTURE.md` | Visão geral da arquitetura e notas de design |
| `PLUGIN_RUNTIME_FLOW.md` | Entry points e fluxo de execução do plugin |

### Banco de dados

| Arquivo | Descrição |
| :------ | :-------- |
| `PLUGIN_DB_TABLES.md` | Schema completo extraído de `db/install.xml`: tabelas, campos, tipos e índices |

### Código e funções

| Arquivo | Descrição |
| :------ | :-------- |
| `PLUGIN_FUNCTION_INDEX.md` | Todas as funções PHP do plugin com arquivo, linha e assinatura |
| `PLUGIN_CALLBACK_INDEX.md` | Callbacks legados do `lib.php` e registros da Hook API (Moodle 4.3+) |

### Integrações

| Arquivo | Descrição |
| :------ | :-------- |
| `PLUGIN_EVENTS.md` | Observers de eventos registrados em `db/events.php` |
| `PLUGIN_ENDPOINT_INDEX.md` | Web services e endpoints AJAX definidos pelo plugin |
| `PLUGIN_DEPENDENCIES.md` | Tasks agendadas, capabilities, web services e histórico de upgrades |

---

## ❓ Perguntas Frequentes

### Devo versionar esses arquivos no Git?

**Não recomendado.** Esses arquivos são gerados automaticamente e mudam sempre que o código-fonte é atualizado. Adicione ao `.gitignore` do projeto:

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

### Esses arquivos pesam no servidor?

Não. São arquivos de texto simples em Markdown, geralmente com poucos KB cada. O sistema de cache mtime garante que apenas arquivos cujos fontes PHP ou XML foram modificados são reescritos — execuções subsequentes são rápidas.

### Posso editar esses arquivos manualmente?

Não é recomendado. Qualquer edição manual será sobrescrita na próxima vez que o servidor regenerar o contexto. Para adicionar notas persistentes para a IA sobre um projeto ou plugin, use o `CLAUDE.md` (Claude Code) ou `GEMINI.md` (Gemini Code Assist) na raiz da instalação. Esses arquivos são lidos automaticamente pelo cliente de IA a cada sessão e nunca são tocados pelo servidor.

### Por que um arquivo não foi atualizado após eu mudar o código?

O sistema de cache compara o `mtime` (data de modificação) do arquivo PHP com o do arquivo `.md` correspondente. Se o `.md` for mais recente, o arquivo é pulado. Para forçar regeneração completa, peça ao assistente: _"Regenere o contexto do plugin local_myplugin ignorando o cache."_ A IA chamará `generate_plugin_context` com `force=true`.

---

## Veja também

- [Como o servidor funciona](../concepts/how-moodle-dev-mcp-works.md) — pipeline de Extractors e Generators
- [Sistema de Cache](../architecture/cache-system.md) — estratégia de cache e invalidação
- [Referência de Resources](./resources.md) — como esses arquivos são expostos via URIs MCP
- [Referência de Tools](./tools.md) — tools que geram e atualizam estes arquivos

---

[🏠 Voltar ao Índice](../index.md)
