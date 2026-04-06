# Documentação — moodle-dev-mcp 🎓

🌐 [English](../../en/index.md) | **Português (BR)** | 🏠 [Voltar para o README](../../README.pt-BR.md)

---

O **moodle-dev-mcp** é um servidor MCP (Model Context Protocol) projetado para expor a estrutura interna do Moodle a assistentes de IA, permitindo um desenvolvimento de plugins mais rápido, seguro e padronizado.

Use este índice para navegar por toda a documentação.

---

## 🚀 Primeiros Passos

Configure seu ambiente e faça o servidor funcionar em minutos.

- [Instalação](./getting-started/installation.md) — Requisitos de sistema e métodos de instalação (NPM e Git).
- [Quickstart](./getting-started/quickstart.md) — Seu primeiro comando e como sincronizar a IA com seu Moodle.
- [Criando seu Primeiro Plugin](./getting-started/first-plugin.md) — Usando o scaffold para iniciar um projeto do zero.

---

## 🧠 Conceitos

Entenda o que é o MCP, por que este servidor existe e como ele funciona internamente.

- [O que é MCP?](./concepts/what-is-mcp.md) — Introdução ao Model Context Protocol.
- [Por que moodle-dev-mcp?](./concepts/why-moodle-dev-mcp.md) — O problema que o servidor resolve e quando usá-lo.
- [Como o servidor funciona](./concepts/how-moodle-dev-mcp-works.md) — O fluxo entre Extractors, Generators e sua IA.
- [Arquitetura](./concepts/architecture.md) — Visão geral dos componentes e do fluxo de dados.
- [Glossário](./concepts/glossary.md) — Termos e conceitos usados nesta documentação.

---

## 📖 Guias

### Clientes MCP

Configure o servidor no seu assistente de IA preferido.

- [Claude Code](./guides/clients/claude-code.md)
- [Gemini Code Assist](./guides/clients/gemini-code-assist.md)
- [OpenAI Codex](./guides/clients/codex.md)
- [OpenCode](./guides/clients/opencode.md)

### Ambientes

- [Uso com Docker](./guides/environments/docker.md) — Integração com ambientes containerizados.

### Workflows

- [Exemplos de uso](./guides/workflows/examples.md) — Casos de uso reais e fluxos de desenvolvimento.

---

## 🛠️ Referência Técnica

Consulte os recursos e comandos disponíveis no servidor.

- [Tools](./reference/tools.md) — Ações que a IA pode executar (ex: `get_plugin_info`, `search_api`, `explain_plugin`).
- [Resources](./reference/resources.md) — Contexto que a IA lê passivamente (ex: índices de API, plugins, banco de dados e eventos).
- [Prompts](./reference/prompts.md) — Templates de prompt pré-configurados para tarefas comuns.
- [Arquivos Gerados](./reference/generated-files.md) — Os arquivos `.md` criados na sua instalação Moodle.

---

## 🔬 Arquitetura Interna

Para quem quer entender ou contribuir com o código do servidor.

- [Extractors](./architecture/extractors.md) — Como o servidor lê e analisa a instalação Moodle.
- [Generators](./architecture/generators.md) — Como o conteúdo de contexto é gerado para a IA.
- [Sistema de Cache](./architecture/cache-system.md) — Estratégia de cache e invalidação.

---

## 🆘 Solução de Problemas

- [Problemas Comuns](./troubleshooting/common-issues.md) — Erros de permissão, configuração de PATH e cache desatualizado.

---

> 💡 **Dica:** Se você estiver usando o Claude Code ou Gemini Code Assist, experimente perguntar diretamente: _"Quais ferramentas o moodle-dev-mcp oferece?"_ — a IA consultará o servidor em tempo real e te responderá com a lista atualizada.
