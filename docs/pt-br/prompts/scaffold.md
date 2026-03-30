# Prompts de Scaffold de Plugin

[🇺🇸 Read in English](../../en/prompts/plugin-scaffold.md)  |  [← Voltar ao Índice](../index.md)

---

Prompts para criar o scaffold completo de plugins Moodle do zero.

## Plugin local

```
Crie o scaffold completo de um plugin Moodle 4.4 local chamado local_relatorios.
Objetivo: gera relatórios customizados de presença e participação.
Necessário:
- Tabelas no banco: local_relatorios_config (configurações por curso) e
  local_relatorios_cache (dados de relatório cacheados com expiração)
- Task agendada: reconstruir cache expirado a cada 6 horas
- Capability: local/relatorios:viewreports (para professores)
- Web service: local_relatorios_get_report (retorna dados JSON)
- Observer de evento: escuta core\event\course_viewed para rastrear acesso
Gere todos os arquivos necessários com os padrões corretos do Moodle.
```

## Módulo de atividade

```
Crie o scaffold de um módulo de atividade Moodle 4.4 chamado mod_checklist.
Objetivo: permite que professores criem checklists que alunos completam.
Necessário:
- Callbacks padrão do mod em lib.php (add/update/delete_instance,
  supports, get_coursemodule_info)
- Tabela no banco: checklist_item (id, checklistid, text, sortorder)
- Capability: mod/checklist:submit (alunos), mod/checklist:manage (professores)
- Página view.php com rastreamento de completion
Gere todos os arquivos necessários seguindo a estrutura padrão de mod.
```

## Plugin de bloco

```
Crie o scaffold de um plugin de bloco Moodle 4.4 chamado block_coursestats.
Objetivo: exibe estatísticas do curso em um bloco lateral.
Necessário:
- Extensão da classe block_base com applicable_formats() para cursos
- Cache usando o MUC do Moodle (Cache API)
- Capability: block/coursestats:view
Gere todos os arquivos necessários.
```

## Usando o prompt scaffold_plugin

O prompt MCP `scaffold_plugin` injeta contexto Moodle completo automaticamente:

```
scaffold_plugin
  type="local"
  name="mytools"
  description="Fornece ferramentas de relatório customizadas para coordenadores"
  features="database tables, scheduled tasks, web services, capabilities"
```

Disponível como slash command `/scaffold_plugin` no modo Agent do Gemini Code Assist.

## Marcando o plugin como em desenvolvimento

Após o scaffold, marque o plugin para que o servidor o reconheça como em desenvolvimento:

```bash
touch /seu/moodle/local/myplugin/.moodle-mcp-dev
```

Ou peça diretamente ao assistente:

```
Gere o contexto para o plugin local_mytools e marque-o como em desenvolvimento.
```

Com o marcador criado, `watch_plugins`, `plugin_batch mode="dev"` e `list_dev_plugins` passarão a incluir esse plugin automaticamente.

## Mantendo contexto entre sessões

Ao iniciar uma sessão de desenvolvimento do plugin, inclua o estado atual no prompt:

```
Carregue o contexto do plugin local_mytools.
Continuando de ontem: a estrutura foi criada com scaffold_plugin.
Próximo passo: implementar a task agendada em classes/task/sync_task.php.
```

Ou peça ao assistente para atualizar o arquivo de contexto do projeto:

```
Atualize o CLAUDE.md com o estado atual: plugin local_mytools criado com scaffold,
próximo passo é implementar a task agendada.
```


---

[← Voltar ao Índice](../index.md)
