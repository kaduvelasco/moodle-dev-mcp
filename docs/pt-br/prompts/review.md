🌐 [English](../../en/prompts/reviews.md) | **Português**
🏠 [Início](../index.md)

# Prompts de Revisão (Code Review)

Estes prompts são projetados para realizar auditorias técnicas, análises de qualidade e auxiliar em processos de upgrade de plugins existentes.

---

## 🔒 Revisão de Segurança

Use este prompt para encontrar vulnerabilidades comuns no Moodle.

**Exemplo de Prompt:**

> "Faça um code review completo do plugin `local_meuplugin` com foco em segurança: verifique se faltam verificações de capability (`has_capability`), se há output não escapado (`s()` ou `format_text`), parâmetros de formulário não validados e queries SQL diretas."

---

## 📏 Padrões de Código e Qualidade

Garanta que seu plugin passaria em um check do Moodle Plugins Directory.

**Exemplo de Prompt:**

> "Revise o `local_meuplugin` quanto à conformidade com o padrão de código Moodle. Foco em: namespaces, visibilidade de métodos, completude do PHPDoc e padrões de nomenclatura (Frankenstyle)."

---

## 🗄️ Otimização de Banco de Dados

Evite gargalos de performance no banco de dados.

**Exemplo de Prompt:**

> "Revise as interações com o banco no `local_meuplugin`. Verifique índices faltando, queries ineficientes e locais onde `get_records_sql` é usado desnecessariamente em vez de `get_records`."

---

## ⚡ Upgrade de Versão (Ex: Banco de Dados)

Automatize a criação de scripts de upgrade.

**Exemplo de Prompt:**

> "O plugin `local_meuplugin` precisa de um upgrade:
>
> 1. Adicionar coluna 'status' (tinyint, default 0) em `local_meuplugin_data`.
> 2. Adicionar índice em (userid, status).
>    Gere o step de upgrade em `db/upgrade.php`, o `db/install.xml` atualizado e o novo `$plugin->version`."

---

## 🧪 Geração de Testes PHPUnit

Ideal para garantir a estabilidade do código.

**Exemplo de Prompt:**

> "Gere uma classe de teste PHPUnit para `\local_meuplugin\util\data_processor`. Use a classe base `advanced_testcase` do Moodle e inclua pelo menos 2 casos de teste por método."

---

## 🛠️ Usando a Tool `review_plugin`

No modo Agent do Gemini ou Claude, você pode ser direto:

```bash
review_plugin
  plugin="local/meuplugin"
  focus="security"
```

Opções de foco: all, security, performance, standards, database, apis.

[← Voltar ao Índice](../index.md)
