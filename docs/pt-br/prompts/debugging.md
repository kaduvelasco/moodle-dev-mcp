🌐 [English](../../en/prompts/debugging.md) | **Português**
🏠 [Início](../index.md)

# Prompts de Depuração (Debugging)

Prompts especializados para diagnosticar erros, analisar fluxos de execução e migrar código legado no Moodle.

---

## 🔍 Diagnóstico de Erros Ativos

Ajuda a identificar a causa raiz de um erro específico.

**Exemplo de Prompt:**

> "O plugin `local_meuplugin` está gerando este erro: 'Table mdl_local_meuplugin_data doesn't exist'. Acontece quando um professor abre a página de configurações. Qual é a causa raiz e como corrijo?"

---

## 🔄 Análise de Fluxo de Execução

Útil para entender plugins complexos ou legados.

**Exemplo de Prompt:**

> "Analise o fluxo de execução do `local_meuplugin`. Começando pelos principais pontos de entrada (entry points), trace o que acontece quando um professor acessa a página principal do plugin."

---

## 🎣 Migração para Hook API (Moodle 4.3+)

Mantenha seu plugin modernizado.

**Exemplo de Prompt:**

> "Verifique o `local_meuplugin` em busca de callbacks legados no `lib.php` que foram substituídos pela Hook API no Moodle 4.3+. Para cada um encontrado, mostre os passos de migração."

---

## ⚙️ Erros de Task e Permissões

Resolva problemas que só acontecem no Cron.

**Exemplo de Prompt:**

> "A task agendada `\local_meuplugin\task\cleanup_task` está falhando com 'Permission denied' quando o cron executa. Quais permissões de arquivo ou capabilities podem estar causando isso?"

---

## 🛠️ Usando a Tool `debug_plugin`

Com o MCP ativo, você pode fornecer o log de erro diretamente:

```bash
debug_plugin
  plugin="local_meuplugin"
  error="Error: Table 'mdl_local_meuplugin_data' doesn't exist"
  context="Ocorre ao salvar o formulário de configuração."
```

[← Voltar ao Índice](../index.md)
