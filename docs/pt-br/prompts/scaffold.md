🌐 [English](../../en/prompts/plugin-scaffold.md) | **Português**
🏠 [Início](../index.md)

# Prompts de Scaffold (Criação de Plugins)

Estes prompts ajudam a gerar a estrutura completa de um plugin Moodle do zero, garantindo que nenhum arquivo essencial (como `version.php` ou `db/install.xml`) seja esquecido.

---

## 🏗️ Criando um Plugin Local

Use este prompt para plugins de lógica geral ou integrações.

**Exemplo de Prompt:**

> "Crie o scaffold completo de um plugin Moodle 4.5 local chamado `local_relatorios`.
> Objetivo: gerar relatórios customizados de presença.
> Necessário: Tabela `local_relatorios_config`, uma Task agendada diária e uma Capability para professores."

---

## 🧩 Criando um Módulo de Atividade (mod)

Ideal para atividades que aparecem na linha do tempo do curso.

**Exemplo de Prompt:**

> "Crie o scaffold de um módulo de atividade chamado `mod_checklist`.
> Inclua as funções padrão no `lib.php` (add/update/delete_instance) e uma tabela `checklist_item` no banco."

---

## ⚡ Usando a Tool `scaffold_plugin`

Se você estiver usando um cliente compatível com MCP (como Gemini Agent ou Claude Code), você pode usar a ferramenta diretamente de forma simplificada:

scaffold_plugin
type="local"
name="mytools"
description="Ferramentas de relatório para coordenadores"
features="database, tasks, capabilities"

---

[← Voltar ao Índice](../index.md)
