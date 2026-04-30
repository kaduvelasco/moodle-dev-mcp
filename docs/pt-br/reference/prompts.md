🌐 [English](../../en/reference/prompts.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Referência de Prompts (MCP)

Os **Prompts MCP** são templates especializados que combinam instruções precisas com o contexto em tempo real da sua instalação Moodle. Diferente de uma tool — que executa uma ação —, um prompt orienta a IA sobre **como** realizar uma tarefa complexa, injetando automaticamente padrões de código, exemplos few-shot e os índices relevantes da instalação.

---

## Como os Prompts funcionam

Quando você invoca um prompt MCP, o servidor monta automaticamente uma instrução estruturada em três camadas antes de enviá-la à IA:

```
┌─────────────────────────────────────────────┐
│  1. System Instruction                       │
│     Define o papel da IA: Moodle Core        │
│     Developer com conhecimento da versão     │
│     detectada da sua instalação.             │
├─────────────────────────────────────────────┤
│  2. Context Injection (automático)           │
│     Anexa MOODLE_DEV_RULES.md,               │
│     MOODLE_API_INDEX.md e os arquivos        │
│     PLUGIN_*.md relevantes para a tarefa.   │
├─────────────────────────────────────────────┤
│  3. Few-Shot Examples                        │
│     Fornece exemplos de entrada/saída para  │
│     garantir o formato correto de código.   │
└─────────────────────────────────────────────┘
```

**Sem prompt MCP:** a IA responde com conhecimento genérico de Moodle, sem saber sua versão, plugins instalados ou padrões da sua instalação.

**Com prompt MCP:** a IA recebe o contexto real da instalação + padrões específicos da versão + exemplos do formato esperado — antes mesmo de você digitar o que quer fazer.

---

## Prompts disponíveis

### `scaffold_plugin`

Gera a estrutura completa de um novo plugin Moodle seguindo os padrões da versão detectada na instalação.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `type` | string | ✅ | Tipo do plugin: `local`, `mod`, `block`, `auth`, `enrol`, `report`, etc. |
| `name` | string | ✅ | Nome curto do plugin em minúsculas sem hífens (ex: `mytools`, `relatorios`) |
| `description` | string | ✅ | Descrição do propósito do plugin em uma frase |
| `features` | string | ❌ | Funcionalidades desejadas separadas por vírgula: `database tables`, `scheduled tasks`, `capabilities`, `web services`, `event observers`, `hooks` |

**Como usar:**

```
scaffold_plugin
  type="local"
  name="audit_log"
  description="Registra histórico de auditoria das ações dos usuários"
  features="database tables, scheduled tasks, capabilities, event observers"
```

No Gemini Code Assist (modo Agent):
```
/scaffold_plugin type="local" name="audit_log" description="Histórico de auditoria" features="database tables, capabilities"
```

**O que é injetado automaticamente:** versão do Moodle detectada, convenções de namespace, estrutura de diretórios esperada, formato correto de `version.php`, exemplos de `db/install.xml` e padrões de nomenclatura de capabilities.

→ Exemplos práticos: [Scaffold de Plugins](../guides/prompts/plugin-scaffold.md)

---

### `review_plugin`

Realiza uma revisão de código técnica e contextualizada em um plugin existente, com foco configurável.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `plugin` | string | ✅ | Frankenstyle do plugin (`local/mytools`) ou caminho relativo |
| `focus` | string | ❌ | Foco da revisão. Padrão: `all` |

**Opções de `focus`:**

| Valor | O que verifica |
|-------|---------------|
| `all` | Revisão completa cobrindo todos os aspectos abaixo |
| `security` | `require_capability()` faltando, output sem escaping, `required_param()` ausente, SQL com concatenação direta |
| `performance` | N+1 queries, falta de cache para dados raramente alterados, `get_records` onde um único registro bastaria, paginação ausente |
| `standards` | Namespace e nomenclatura Frankenstyle, visibilidade de métodos, PHPDoc, convenções de arquivos |
| `database` | Índices faltando em colunas de `WHERE`, `get_in_or_equal()` ausente para cláusulas `IN`, upgrade steps sem validação de versão |
| `apis` | Funções depreciadas em uso, alternativas disponíveis na versão instalada, uso incorreto de APIs do core |

**Como usar:**

```
/review_plugin plugin="local/mytools" focus="security"
```

```
Execute o review_plugin no plugin local_mytools com foco em segurança
e padrões de código Moodle.
```

**O que é injetado automaticamente:** contexto completo do plugin (`PLUGIN_AI_CONTEXT.md`), padrões de código (`MOODLE_DEV_RULES.md`), índice de API para verificar depreciações, e exemplos few-shot do formato esperado de revisão com níveis de severidade.

→ Exemplos práticos: [Prompts de Revisão](../guides/prompts/reviews.md)

---

### `debug_plugin`

Diagnostica um erro específico do Moodle com contexto completo do plugin afetado. Detecta automaticamente o tipo de erro e injeta as estratégias de debug mais relevantes.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `plugin` | string | ✅ | Frankenstyle (`local_mytools`) ou caminho do plugin |
| `error` | string | ✅ | Mensagem de erro completa copiada do log ou da tela |
| `context` | string | ❌ | Contexto adicional: quando o erro ocorre, qual usuário, qual página |

**Como usar:**

```
/debug_plugin
  plugin="local_mytools"
  error="Table 'moodle.mdl_local_mytools_sessions' doesn't exist"
  context="Ocorre ao abrir a página principal para usuários não-administradores"
```

```
Use o debug_plugin para analisar este erro no plugin local_mytools:
"Cannot find class 'local_mytools\output\renderer'"
O erro aparece somente na página de relatórios.
```

**Tipos de erro detectados automaticamente:** DML exceptions (tabelas, campos, índices), class not found (namespace, autoloader), permission denied (capabilities, context), scheduled task failures (configuração, permissões), e erros de upgrade (versão, install.xml).

**O que é injetado automaticamente:** contexto completo do plugin, schema do banco de dados, índice de funções, estrutura de classes e exemplos few-shot de diagnóstico com causa raiz e passos de correção.

→ Exemplos práticos: [Prompts de Depuração](../guides/prompts/debugging.md)

---

## Como chamar um prompt por cliente

| Cliente | Como invocar |
|---------|-------------|
| **Claude Code** | Em linguagem natural: _"Use o scaffold_plugin para..."_ ou com a sintaxe de parâmetros diretamente no chat |
| **Gemini Code Assist (Agent Mode)** | Slash command: `/scaffold_plugin`, `/review_plugin`, `/debug_plugin` — com autocomplete de parâmetros |
| **OpenAI Codex** | Em linguagem natural no chat, citando o nome do prompt: _"Execute o scaffold_plugin com type='local'..."_ |
| **OpenCode** | Em linguagem natural no chat, citando o nome do prompt: _"Use o review_plugin com foco em segurança..."_ |
| **Cursor** | Em linguagem natural no chat, citando o nome do prompt: _"Execute o review_plugin com foco em segurança..."_ |

> No Gemini Code Assist, os slash commands só estão disponíveis no **Agent Mode**. No chat padrão, use linguagem natural.

---

## Contribuindo com novos prompts

Se você quiser adicionar prompts customizados ao servidor (em `src/prompts/`), siga as diretrizes em [CONTRIBUINDO.md](../../../../CONTRIBUINDO.md). Boas práticas:

- **Verifique a versão do Moodle:** injete `AI_CONTEXT.md` e oriente a IA a verificar a versão antes de sugerir Hooks (4.3+) ou APIs com `@since`.
- **Exija localização:** instrua o prompt a sugerir strings de tradução em `lang/en/` em vez de texto fixo no código.
- **Valide o schema:** prompts de banco de dados devem seguir o formato do `install.xml` e incluir os atributos `NOTNULL`, `SEQUENCE` e `NEXT`.

---

## Veja também

- [Referência de Tools](./tools.md) — ações executáveis pela IA
- [Referência de Resources](./resources.md) — dados lidos passivamente
- [Exemplos de uso](../guides/workflows/examples.md) — cenários reais com os três prompts em ação

---

[🏠 Voltar ao Índice](../index.md)
