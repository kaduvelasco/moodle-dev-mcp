# Prompts de Depuração

[🇺🇸 Read in English](../../en/prompts/debugging.md)  |  [← Voltar ao Índice](../index.md)

---

Prompts para depurar erros de plugins Moodle com contexto completo.

## Diagnóstico de erros

```
O plugin local_meuplugin está gerando este erro:
"Table 'mdl_local_meuplugin_data' doesn't exist"
Acontece quando um professor abre a página de configurações.
Qual é a causa raiz e como corrijo?
```

```
local_meuplugin está disparando:
"Call to undefined method local_meuplugin\output\renderer::render_summary()"
Baseado na estrutura do plugin, trace onde render_summary deveria estar definido.
```

```
A task agendada \local_meuplugin\task\cleanup_task está falhando
com "Permission denied" quando o cron executa. Quais permissões de
arquivo ou definições de capability podem estar causando isso?
```

## Análise de fluxo de execução

```
Analise o fluxo de execução do local_meuplugin. Começando pelos
principais entry points, trace o que acontece quando um professor
acessa a página principal do plugin.
```

## Avisos de migração para Hook API

```
Verifique o local_meuplugin em busca de callbacks legados do lib.php
que foram substituídos pela Hook API no Moodle 4.3+.
Para cada um encontrado, mostre os passos de migração.
```

## Usando o prompt debug_plugin

O prompt MCP `debug_plugin` detecta automaticamente o tipo de erro:

```
debug_plugin
  plugin="local_meuplugin"
  error="Error: Table 'mdl_local_meuplugin_data' doesn't exist"
  context="Acontece quando um professor abre a página de configurações"
```

Disponível como slash command `/debug_plugin` no modo Agent do Gemini Code Assist.

## Mantendo contexto em sessões longas de debug

Sessões de diagnóstico complexas podem exigir múltiplas iterações. Para manter a continuidade:

```
Carregue o contexto do plugin local_meuplugin.
Continuando o debug de ontem: o erro "Table doesn't exist" para mdl_local_meuplugin_data.
Já verificamos: db/install.xml está correto e o plugin foi reinstalado.
O erro persiste apenas em contexto de curso (CONTEXT_COURSE).
Continue a investigação a partir daqui.
```

Ao encontrar a causa raiz, registre para referência futura:

```
Atualize o CLAUDE.md registrando: o erro "Table doesn't exist" no local_meuplugin
foi causado por X. Solução aplicada: Y.
```

**Gemini CLI** — para retomar a sessão de debug exatamente de onde parou:

```bash
/chat save debug-local-meuplugin
# Na próxima sessão:
/chat resume debug-local-meuplugin
```

**OpenAI Codex** — para retomar a sessão mais recente:

```bash
codex resume --last
```


---

[← Voltar ao Índice](../index.md)
