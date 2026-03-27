🌐 [English](../../en/architecture/extractors.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Extractors

Os **Extractors** são os módulos responsáveis por ler e interpretar os arquivos PHP e XML da instalação Moodle. Cada extractor é especializado em um tipo de arquivo e produz dados estruturados que os [Generators](./generators.md) transformam em arquivos `.md` de contexto.

---

## Visão geral

```
src/extractors/
├── api.ts           ← lib/*.php
├── capabilities.ts  ← db/access.php
├── classes.ts       ← classes/**/*.php
├── events.ts        ← db/events.php
├── hooks.ts         ← db/hooks.php + classes/hook/
├── moodle-detect.ts ← version.php (raiz do Moodle)
├── plugin.ts        ← version.php (plugin) + lang/
├── schema.ts        ← db/install.xml
├── services.ts      ← db/services.php
├── tasks.ts         ← db/tasks.php
└── upgrade.ts       ← db/upgrade.php
```

Todos os extractors são funções puras: recebem um caminho de arquivo ou diretório, retornam dados estruturados (validados com Zod onde aplicável) e **nunca escrevem em disco** — isso é responsabilidade exclusiva dos Generators.

---

## Tabela de referência

| Extractor | Arquivo fonte | Dados produzidos | Validação |
|-----------|--------------|-----------------|-----------|
| `api.ts` | `lib/*.php` | Funções com nome, assinatura, visibilidade PHPDoc, `@since`, `@deprecated` | — |
| `capabilities.ts` | `db/access.php` | Capabilities com nome, riskbitmask e archetypes | Zod |
| `classes.ts` | `classes/**/*.php` | Classes, interfaces e traits com namespace e arquivo | Zod |
| `events.ts` | `db/events.php` | Observers com eventname, callback e includefile | — |
| `hooks.ts` | `db/hooks.php` + `classes/hook/` | Callbacks da Hook API com hook class, callback e prioridade | — |
| `moodle-detect.ts` | `version.php` | Versão do Moodle (string e numérica) | — |
| `plugin.ts` | `version.php` + `lang/` | Tipo, nome, component, versão e string de display | — |
| `schema.ts` | `db/install.xml` | Tabelas, campos, chaves e índices | Zod |
| `services.ts` | `db/services.php` | Web services com classname, methodname e capabilities | — |
| `tasks.ts` | `db/tasks.php` | Tasks com classname, tipo e schedule | — |
| `upgrade.ts` | `db/upgrade.php` | Histórico de steps com versão e descrição inferida | — |

---

## Detalhes por extractor

### `api.ts` — Funções do core

**Arquivo fonte:** `lib/*.php` na raiz do Moodle e em subdiretórios selecionados.

**Estratégia de parse:** leitura linha a linha com acumulação de bloco PHPDoc. O extractor identifica blocos `/** ... */` imediatamente seguidos de uma declaração `function`, extrai a assinatura e classifica a visibilidade pelo conteúdo do PHPDoc:

| Tag PHPDoc | Visibilidade atribuída |
|-----------|----------------------|
| `@deprecated` | `deprecated` |
| `@internal` | `internal` |
| `@access private` ou `@private` | `private` |
| Nenhuma tag restritiva | `public` |
| Sem PHPDoc | `unverified` |

**Dados produzidos:**
```typescript
{
  name: string,
  signature: string,
  visibility: 'public' | 'deprecated' | 'internal' | 'private' | 'unverified',
  since: string | null,
  file: string
}
```

**Alimenta:** `MOODLE_API_INDEX.md` via `generators/moodle.ts`.

---

### `schema.ts` — Banco de dados

**Arquivo fonte:** `db/install.xml` de qualquer plugin.

**Estratégia de parse:** usa `fast-xml-parser` para converter o XMLDB em objeto JavaScript, seguido de validação com Zod. O schema Zod rejeita silenciosamente tabelas malformadas sem lançar exceção, permitindo que o extractor continue processando o restante do arquivo.

**Caso especial:** o formato XMLDB usa atributos como `NOTNULL`, `SEQUENCE` e `NEXT` como strings `"true"`/`"false"` — o extractor normaliza para booleanos antes de retornar.

**Dados produzidos:**
```typescript
{
  tables: [{
    name: string,
    fields: [{ name, type, length, notnull, default, sequence }],
    keys:   [{ name, type, fields }],
    indexes:[{ name, unique, fields }]
  }]
}
```

**Alimenta:** `PLUGIN_DB_TABLES.md` e `MOODLE_DB_TABLES_INDEX.md`.

---

### `events.ts` — Observers de eventos

**Arquivo fonte:** `db/events.php` de qualquer plugin.

**Estratégia de parse:** **block splitter** em vez de regex simples. O texto é dividido em blocos delimitados por `[` e `]`, e cada bloco é parseado individualmente.

**Por que block splitter?** Regex falham quando há comentários inline, quebras de linha irregulares ou arrays aninhados — padrão comum em plugins reais. A correlação por bloco é mais robusta.

**Dados produzidos:**
```typescript
{
  observers: [{
    eventname: string,
    callback:  string,
    includefile: string | null
  }]
}
```

**Alimenta:** `PLUGIN_EVENTS.md` e `MOODLE_EVENTS_INDEX.md`.

---

### `hooks.ts` — Hook API (Moodle 4.3+)

**Arquivo fonte:** `db/hooks.php` (callbacks registrados) + `classes/hook/*.php` (definições de hooks).

**Estratégia de parse:** dois passes distintos:
1. `db/hooks.php` — block splitter para extrair registros de callbacks (hook class, callback class, prioridade)
2. `classes/hook/*.php` — leitura de classe PHP para extrair metadados do hook (description, tags)

**Caso especial:** o extractor detecta callbacks legados do `lib.php` que possuem equivalente na Hook API e os marca com um aviso de migração — essa informação aparece no `PLUGIN_CALLBACK_INDEX.md`.

**Dados produzidos:**
```typescript
{
  callbacks: [{
    hookclass:  string,
    callback:   string,
    priority:   number
  }],
  hookDefinitions: [{
    classname:   string,
    description: string | null
  }]
}
```

**Alimenta:** `PLUGIN_CALLBACK_INDEX.md` e `PLUGIN_DEPENDENCIES.md`.

---

### `capabilities.ts` — Capabilities

**Arquivo fonte:** `db/access.php` de qualquer plugin.

**Estratégia de parse:** block splitter + validação Zod. O arquivo PHP define um array `$capabilities` com chaves no formato `component:capabilityname` — o extractor normaliza as chaves e valida a estrutura de cada capability.

**Dados produzidos:**
```typescript
{
  capabilities: [{
    name:        string,
    riskbitmask: number,
    captype:     string,
    archetypes:  Record<string, number>
  }]
}
```

**Alimenta:** `PLUGIN_DEPENDENCIES.md` e `MOODLE_CAPABILITIES_INDEX.md`.

---

### `classes.ts` — Classes PHP

**Arquivo fonte:** `classes/**/*.php` de qualquer plugin ou do core.

**Estratégia de parse:** leitura linha a linha buscando declarações `class`, `interface` e `trait`, com captura do namespace via `namespace` statement. Valida com Zod antes de retornar.

**Dados produzidos:**
```typescript
{
  classes: [{
    name:      string,
    type:      'class' | 'interface' | 'trait',
    namespace: string | null,
    file:      string
  }]
}
```

**Alimenta:** `MOODLE_CLASSES_INDEX.md`.

---

### `services.ts` — Web services

**Arquivo fonte:** `db/services.php` de qualquer plugin.

**Estratégia de parse:** block splitter sobre o array `$functions` — cada entrada é parseada individualmente para extrair `classname`, `methodname`, `description` e `capabilities`.

**Dados produzidos:**
```typescript
{
  services: [{
    name:        string,
    classname:   string,
    methodname:  string,
    capabilities: string
  }]
}
```

**Alimenta:** `PLUGIN_ENDPOINT_INDEX.md` e `MOODLE_SERVICES_INDEX.md`.

---

### `tasks.ts` — Tasks agendadas

**Arquivo fonte:** `db/tasks.php` de qualquer plugin.

**Estratégia de parse:** block splitter sobre o array retornado pelo arquivo PHP, extraindo `classname`, tipo e schedule padrão.

**Dados produzidos:**
```typescript
{
  tasks: [{
    classname:  string,
    type:       'scheduled' | 'adhoc',
    minute:     string,
    hour:       string,
    day:        string,
    month:      string,
    dayofweek:  string
  }]
}
```

**Alimenta:** `PLUGIN_DEPENDENCIES.md` e `MOODLE_TASKS_INDEX.md`.

---

### `upgrade.ts` — Histórico de upgrades

**Arquivo fonte:** `db/upgrade.php` de qualquer plugin.

**Estratégia de parse:** leitura linha a linha buscando blocos `if ($oldversion < X.Y.Z)`, extraindo a versão e o comentário descritivo do step quando disponível.

**Dados produzidos:**
```typescript
{
  steps: [{
    version:     string,
    description: string | null
  }]
}
```

**Alimenta:** `PLUGIN_DEPENDENCIES.md`.

---

### `moodle-detect.ts` — Versão do Moodle

**Arquivo fonte:** `version.php` na raiz do Moodle.

**Estratégia de parse:** regex sobre as variáveis `$version` (numérica, ex: `2024042200`) e `$release` (string, ex: `4.4 (Build: 20240422)`). Normaliza ambas para uso no contexto.

**Alimenta:** configuração `.moodle-mcp` e cabeçalho do `AI_CONTEXT.md`.

---

### `plugin.ts` — Metadados de plugin

**Arquivo fonte:** `version.php` do plugin + `lang/en/<component>.php`.

**Estratégia de parse:** regex sobre `$plugin->component`, `$plugin->version` e `$plugin->requires`. Usa `utils/plugin-types.ts` (mapa `PLUGIN_TYPE_TO_DIR`) como **fonte única de verdade** para resolver o tipo do plugin a partir do caminho do diretório — evita duplicação de mapeamento que existia em 6 lugares antes da refatoração.

**Dados produzidos:**
```typescript
{
  component:   string,
  type:        string,
  name:        string,
  version:     string,
  requires:    string,
  displayName: string | null
}
```

**Alimenta:** `PLUGIN_CONTEXT.md` e `MOODLE_PLUGIN_INDEX.md`.

---

## Adicionando um novo extractor

Para adicionar suporte a um novo tipo de arquivo Moodle:

**1. Crie o arquivo em `src/extractors/`:**

```typescript
// src/extractors/meu-extractor.ts
export interface MeuDado {
  campo: string;
}

export function extractMeuDado(filePath: string): MeuDado[] {
  // leia o arquivo, faça parse, retorne dados estruturados
  return [];
}
```

**2. Adicione validação Zod (recomendado para dados críticos):**

```typescript
import { z } from 'zod';

const MeuDadoSchema = z.object({
  campo: z.string()
});
```

**3. Conecte ao generator relevante em `src/generators/`:**

Importe e chame o extractor dentro de `moodle.ts` (índices globais) ou `plugin.ts` (contexto de plugin).

**4. Adicione um caso de teste em `src/tests/extractors.test.ts`:**

```typescript
test('extractMeuDado retorna array vazio para arquivo inexistente', () => {
  const result = extractMeuDado('/caminho/inexistente.php');
  assert.deepEqual(result, []);
});
```

**5. Compile e teste:**

```bash
npm run build && npm test
```

---

## Veja também

- [Generators](./generators.md) — como os dados dos extractors viram arquivos `.md`
- [Sistema de Cache](./cache-system.md) — quando o extractor é chamado e quando é pulado
- [Arquivos Gerados](../reference/generated-files.md) — os arquivos `.md` que cada extractor alimenta

---

[🏠 Voltar ao Índice](../index.md)
