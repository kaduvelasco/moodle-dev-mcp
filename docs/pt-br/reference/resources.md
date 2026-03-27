🌐 [English](../../en/reference/resources.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Referência de Resources (MCP)

Os **Resources** funcionam como uma biblioteca de leitura para o seu assistente de IA. Eles fornecem dados estruturados sobre a instalação Moodle e seus plugins através de URIs customizadas — sem necessidade de chamada explícita pelo usuário.

## Como a IA usa os Resources

A IA decide automaticamente quando ler um resource com base na sua pergunta. Mas você pode ser explícito para guiar a consulta:

- _"Dê uma olhada no resource `moodle://api-index` e veja se existe uma função para deletar usuários em massa."_
- _"Analise o esquema em `moodle://plugin/local_myplugin/database` e sugira índices faltando."_
- _"Antes de sugerir correções, verifique os padrões em `moodle://dev-rules`."_

Os resources são gerados pelos Generators do servidor e ficam disponíveis enquanto os arquivos `.md` de contexto existirem na instalação. Use `init_moodle_context` ou `generate_plugin_context` para gerar ou atualizar o conteúdo.

---

## 🌍 Resources Globais

Estes resources fornecem uma visão panorâmica de toda a instalação Moodle.

| URI | Descrição |
| :-- | :-------- |
| `moodle://context` | Visão geral da instalação, versão detectada e diretrizes de codificação |
| `moodle://index` | Índice mestre de todos os arquivos de contexto gerados |
| `moodle://workspace` | Guia para a IA sobre como navegar e trabalhar no workspace atual |
| `moodle://api-index` | Catálogo de todas as funções públicas e depreciadas da `lib/` do core |
| `moodle://classes-index` | Todas as classes, interfaces e traits PHP da instalação |
| `moodle://db-tables` | Estrutura completa de todas as tabelas do banco de dados |
| `moodle://plugin-index` | Mapa de todos os plugins instalados com versões e caminhos |
| `moodle://capabilities-index` | Todas as capabilities (permissões) disponíveis no sistema |
| `moodle://events-index` | Observers de eventos registrados em todos os plugins |
| `moodle://tasks-index` | Todas as tasks agendadas da instalação |
| `moodle://services-index` | Todas as funções de web service registradas |
| `moodle://dev-rules` | Padrões de código Moodle (Moodle Coding Style) |
| `moodle://plugin-guide` | Referência rápida de estrutura por tipo de plugin |
| `moodle://plugins/with-context` | Lista dos plugins que já têm contexto de IA gerado |

---

## 🧩 Resources de Plugin

Resources específicos para cada plugin. Substitua `{component}` pelo frankenstyle do plugin — por exemplo: `local_myplugin`, `mod_assign`, `block_html`.

### Ponto de entrada

| URI | Descrição |
| :-- | :-------- |
| `moodle://plugin/{component}` | Contexto completo do plugin — ponto de entrada recomendado para iniciar qualquer sessão |
| `moodle://plugin/{component}/context` | Metadados do plugin: component, tipo, versão e caminho |

### Estrutura e código

| URI | Descrição |
| :-- | :-------- |
| `moodle://plugin/{component}/structure` | Árvore de diretórios do plugin (arquivos gerados excluídos) |
| `moodle://plugin/{component}/architecture` | Visão geral da arquitetura e notas de design |
| `moodle://plugin/{component}/functions` | Todas as funções PHP com referências de arquivo e linha |

### Banco de dados

| URI | Descrição |
| :-- | :-------- |
| `moodle://plugin/{component}/database` | Schema completo das tabelas (`db/install.xml`): campos, tipos e índices |

### Integrações e extensibilidade

| URI | Descrição |
| :-- | :-------- |
| `moodle://plugin/{component}/events` | Observers de eventos registrados em `db/events.php` |
| `moodle://plugin/{component}/callbacks` | Callbacks legados do `lib.php` e registros da Hook API (4.3+) |
| `moodle://plugin/{component}/endpoints` | Web services e endpoints AJAX definidos pelo plugin |
| `moodle://plugin/{component}/dependencies` | Tasks, serviços, capabilities e histórico de upgrades |

### Fluxo de execução

| URI | Descrição |
| :-- | :-------- |
| `moodle://plugin/{component}/flow` | Entry points e fluxo de execução do plugin |

---

## Veja também

- [Referência de Tools](./tools.md) — ações que a IA pode executar ativamente
- [Referência de Prompts](./prompts.md) — templates para scaffold, revisão e debugging
- [Arquivos Gerados](./generated-files.md) — os arquivos `.md` que alimentam estes resources

---

[🏠 Voltar ao Índice](../index.md)
