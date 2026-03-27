🌐 [English](../../en/architecture/cache-system.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Sistema de Cache

O `moodle-dev-mcp` usa um sistema de cache baseado em **mtime** (data de modificação de arquivo) para evitar regenerar arquivos de contexto desnecessariamente. Sem cache, cada chamada a `update_indexes` ou `generate_plugin_context` reprocessaria todos os arquivos PHP e XML da instalação — independentemente de terem mudado ou não.

---

## Como funciona

O cache compara a data de modificação (`mtime`) de cada arquivo-fonte PHP/XML com a do arquivo `.md` de contexto correspondente:

```
Arquivo PHP/XML (fonte)         Arquivo .md (saída)
        │                               │
        │  mtime: 2024-04-20 10:00      │  mtime: 2024-04-21 09:00
        │                               │
        └──────────── comparação ───────┘
                          │
              fonte mais antigo que saída?
                     │            │
                    SIM           NÃO
                     │             │
                  SKIP          REGENERAR
              (skipped: true)  (escreve .md)
```

**Três resultados possíveis por arquivo:**

| Resultado | Condição | Contabilizado como |
|-----------|----------|--------------------|
| **Hit** | Arquivo já foi marcado como fresco nesta sessão | `cache.hits` |
| **Skip** | Todos os fontes são mais antigos que a saída | `cache.skips` |
| **Miss** | Saída não existe ou algum fonte é mais recente | `cache.misses` |

---

## Implementação

O cache é implementado na classe `MtimeCache` em `src/cache.ts`. Uma única instância compartilhada — `globalCache` — é usada por todos os generators do processo.

```typescript
class MtimeCache {
  // Mapa in-memory: caminho do arquivo .md → timestamp de quando foi marcado
  private readonly marked = new Map<string, number>();
  private stats: CacheStats = { hits: 0, misses: 0, skips: 0 };

  isStale(outputFile: string, sourceFiles: string[]): boolean { ... }
  mark(outputFile: string): void { ... }
  invalidate(outputFile: string): void { ... }
  invalidateAll(): void { ... }
  getStats(): CacheStats { ... }
}

export const globalCache = new MtimeCache();
```

### Lógica de `isStale()`

A decisão de regenerar segue esta sequência:

```
1. O arquivo .md de saída existe?
   NÃO → miss (regenerar)
   SIM → continuar

2. O arquivo já foi marcado fresco nesta sessão (marked.has)?
   SIM → hit (pular)
   NÃO → continuar

3. Algum arquivo-fonte é mais recente que a saída?
   SIM → miss (regenerar)
   NÃO → skip (pular)
```

### Arquivos-fonte monitorados

**Para arquivos globais** (`getMoodleSourcePatterns`):
```
{moodlePath}/version.php
{moodlePath}/lib/moodlelib.php
{moodlePath}/lib/accesslib.php
```

**Para arquivos de plugin** (`getPluginSourceFiles`):
```
version.php
lib.php
locallib.php
db/install.xml
db/access.php
db/events.php
db/tasks.php
db/services.php
db/upgrade.php
db/hooks.php
```

Se um arquivo-fonte não existir, ele é simplesmente ignorado na comparação — não causa erro.

---

## Cache in-memory: sessão vs. reinício

O cache é **exclusivamente in-memory** — não há arquivo de cache persistido em disco. Isso tem consequências importantes:

| Situação | Comportamento |
|----------|--------------|
| Primeira execução após iniciar o servidor | Cache frio — todos os arquivos são verificados via mtime |
| Segunda chamada na mesma sessão para o mesmo plugin | Cache quente — arquivos marcados como frescos são pulados imediatamente |
| Reinício do servidor (MCP restartado) | Cache frio novamente — nenhum estado persiste entre sessões |

**Por que não persistir o cache?**
Cache in-memory é o padrão mais seguro: elimina o risco de cache desatualizado após upgrades do Moodle, alterações manuais de arquivo ou mudanças de instalação. O custo de verificar mtime no disco na primeira execução é baixo comparado ao risco de servir contexto desatualizado.

---

## Invalidação de cache

### Por `force=true`

Quando o usuário solicita regeneração forçada, a tool `update_indexes` chama `globalCache.invalidateAll()` antes de iniciar os generators:

```typescript
if (force) globalCache.invalidateAll();
```

Isso limpa o mapa `marked` — todos os arquivos são tratados como se nunca tivessem sido gerados nesta sessão, forçando a comparação mtime para cada um.

### Por arquivo individual

A tool `update_indexes` também invalida arquivos específicos de plugin quando necessário:

```typescript
if (force) {
  globalCache.invalidate(`${pluginDir}/PLUGIN_AI_CONTEXT.md`);
  // ...
}
```

Isso permite forçar a regeneração de um plugin específico sem invalidar o cache de toda a instalação.

---

## Estatísticas de cache

O `globalCache` acumula estatísticas durante toda a sessão. A tool `doctor` expõe essas estatísticas no relatório de saúde:

```
Cache stats:
  hits:   42   ← arquivos pulados por estarem marcados frescos
  skips:  18   ← arquivos pulados por mtime (fontes mais antigos)
  misses:  7   ← arquivos regenerados (fontes mais recentes ou .md inexistente)
```

**Como interpretar:**
- **Muitos hits:** o watch mode está ativo ou `update_indexes` foi chamado várias vezes na mesma sessão
- **Muitos skips:** a instalação está estável — poucos arquivos PHP foram modificados
- **Muitos misses:** primeira execução, ou muitos arquivos foram alterados (ex: upgrade do Moodle)

---

## Interação com o watch mode

O `watcher.ts` usa `watch_plugins` para monitorar alterações de arquivo em tempo real. Quando um arquivo PHP é salvo dentro de um plugin dev, o watcher:

1. Detecta o evento `change` via `fs.watch()`
2. Chama `globalCache.invalidate()` para o arquivo `.md` correspondente
3. Dispara `generateAllForPlugin()` para o plugin modificado

Isso garante que o contexto reflete sempre o estado mais recente do código sem precisar de intervenção manual.

---

## Veja também

- [Extractors](./extractors.md) — os módulos cujos resultados o cache evita recalcular
- [Generators](./generators.md) — onde `isStale()` e `mark()` são chamados
- [Referência de Tools](../reference/tools.md) — `update_indexes` (`force`) e `doctor` (stats)

---

[🏠 Voltar ao Índice](../index.md)
