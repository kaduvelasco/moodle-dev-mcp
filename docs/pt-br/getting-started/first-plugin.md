🌐 [English](../../en/getting-started/first-plugin.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Criando seu Primeiro Plugin

Neste guia, utilizaremos o assistente de IA para criar um plugin Moodle do zero, garantindo que a estrutura de pastas e arquivos esteja 100% correta e alinhada com os padrões do Moodle.

---

## 1. O Desafio

Vamos criar um plugin do tipo **Local** chamado `my_tools` que terá:

- Uma tabela no banco de dados para salvar logs simples.
- Uma tarefa agendada (Scheduled Task) que roda diariamente.
- Uma permissão (Capability) específica para gerentes.

---

## 2. Gerando a Estrutura (Scaffold)

O `moodle-dev-mcp` expõe um **prompt MCP** chamado `scaffold_plugin` que injeta automaticamente o contexto completo do Moodle — versão, padrões de código e convenções de nomenclatura — na geração do scaffold. Invoque-o no chat da IA:

```
scaffold_plugin
  type="local"
  name="my_tools"
  description="Ferramentas utilitárias com logs, task agendada e capability para gerentes"
  features="database tables, scheduled tasks, capabilities"
```

> No Gemini Code Assist (modo Agent), o prompt também está disponível como slash command: `/scaffold_plugin`.

A IA gerará a estrutura de arquivos completa seguindo os padrões do Moodle:

```
local/my_tools/
├── version.php
├── lang/
│   └── en/
│       └── local_my_tools.php
└── db/
    ├── install.xml
    ├── tasks.php
    └── access.php
```

---

## 3. Definindo o Banco de Dados

Com a estrutura criada, peça para a IA detalhar a tabela de logs:

```
No arquivo db/install.xml do plugin local_my_tools, crie uma tabela
chamada local_my_tools_logs com os campos: id, userid, action (string)
e timecreated.
```

> **Dica:** A IA formatará o XML seguindo o padrão exato do Moodle, incluindo os atributos `NOTNULL`, `SEQUENCE` e `NEXT` conforme exigido pelo XMLDB.

---

## 4. Gerando Contexto de Desenvolvimento

Agora que os arquivos iniciais foram criados no disco, você precisa que a IA "aprenda" sobre esse novo plugin para te ajudar na lógica de programação.

**Execute no chat:**

```
Gere o contexto de IA para o plugin local_my_tools.
```

Isso chamará a tool `generate_plugin_context`, criando os arquivos `PLUGIN_*.md` dentro da pasta do plugin. A partir de agora, a IA terá consciência total de que a tabela `local_my_tools_logs` existe e como ela está estruturada.

Em seguida, ative o modo watch para que o contexto se atualize automaticamente conforme você desenvolve:

```
Inicie o monitoramento do plugin local_my_tools para alterações de arquivo.
```

A IA chamará `watch_plugins action="start"`. Qualquer arquivo PHP salvo dentro do plugin dispara uma atualização automática de contexto em background.

---

## 5. Implementando a Lógica

Agora peça para a IA escrever o código PHP real:

```
Crie a classe da Task agendada em classes/task/log_cleanup_task.php.
Ela deve deletar registros com mais de 30 dias da tabela local_my_tools_logs.
```

Como a IA leu o `PLUGIN_DB_TABLES.md` gerado no passo anterior, ela saberá exatamente o nome da tabela e dos campos para escrever a query `$DB->delete_records_select()` corretamente.

---

## ✅ Checklist de Conclusão

- [ ] Verifique se o `version.php` possui o `component` correto: `local_my_tools`.
- [ ] Instale o plugin via interface do Moodle ou via CLI: `php admin/cli/upgrade.php`.
- [ ] Peça ao seu assistente: _"Execute o doctor do moodle-dev-mcp"_ — a IA chamará a tool `doctor` e confirmará se o novo plugin foi indexado corretamente.
- [ ] Se estiver ativamente desenvolvendo, confirme que o watch mode está ativo: _"Qual o status do monitoramento de plugins?"_

---

> **Próximo Passo:** Se você trabalha com Docker ou LuminaStack, veja como otimizar esse fluxo no guia de **[Docker & LuminaStack](../guides/environments/docker.md)**.
