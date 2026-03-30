# Prompts de Revisão

[🇺🇸 Read in English](../../en/prompts/reviews.md)  |  [← Voltar ao Índice](../index.md)

---

Prompts para code review, análise de qualidade e upgrades.

## Revisão de segurança

```
Faça um code review completo do local_meuplugin com foco em segurança:
verifique capability checks faltando, output não escapado,
parâmetros de formulário não validados e queries SQL diretas.
```

## Padrões de código

```
Revise local_meuplugin quanto à conformidade com o padrão de código Moodle.
Foco em: convenções de namespace, visibilidade de métodos, completude
do PHPDoc e padrões de nomenclatura.
```

## Revisão do banco

```
Revise as interações com o banco no local_meuplugin.
Verifique índices faltando, queries ineficientes e lugares onde
get_records_sql é usado desnecessariamente em vez de get_records.
```

## Análise de performance

```
Analise local_meuplugin em busca de problemas de performance:
- Padrão N+1 (loops com get_record dentro)
- Falta de $DB->get_in_or_equal() para queries IN
- Colunas sem índice usadas em cláusulas WHERE
- Falta de camada de cache para queries custosas
```

## Geração de PHPDoc

```
Carregue local_meuplugin e gere um bloco PHPDoc para cada
função e método público que esteja sem documentação.
Use as assinaturas de função e contexto para escrever
tags @param, @return e @throws precisas.
```

## Upgrade do banco

```
O plugin local_meuplugin precisa de uma atualização do banco:
1. Adicionar coluna "status" (tinyint, default 0) em local_meuplugin_data
2. Adicionar índice em (userid, status) em local_meuplugin_data
3. Renomear coluna "old_value" para "previous_value" em local_meuplugin_logs

Carregue o schema atual e gere:
1. O step de upgrade em db/upgrade.php (detectar versão atual)
2. O db/install.xml atualizado
3. O $plugin->version atualizado em version.php
```

## Testes PHPUnit

```
Gere uma classe de teste PHPUnit para \local_meuplugin\util\data_processor.
Carregue o contexto do plugin, depois gere testes para cada método público
usando a classe base advanced_testcase do Moodle.
Inclua setUp/tearDown, fixtures e pelo menos 2 casos de teste por método.
```

## Usando o prompt review_plugin

```
review_plugin
  plugin="local/meuplugin"
  focus="security"
```

Opções de foco: `all` · `security` · `performance` · `standards` · `database` · `apis`

Disponível como slash command `/review_plugin` no modo Agent do Gemini Code Assist.

## Mantendo contexto entre sessões de revisão

Revisões completas podem tomar várias sessões. Para retomar uma revisão no ponto em que parou:

```
Carregue o contexto do plugin local_meuplugin.
Estou continuando a revisão de segurança iniciada ontem.
Já revisei: lib.php, db/install.xml e index.php.
Próximo: revisar classes/external/ e classes/task/.
```

Ou peça ao assistente para salvar o progresso:

```
Atualize o CLAUDE.md registrando o progresso da revisão do local_meuplugin:
arquivos já revisados e pendências encontradas.
```

**Gemini CLI** — para retomar a sessão exata:

```bash
/chat save revisao-local-meuplugin
# Na próxima sessão:
/chat resume revisao-local-meuplugin
```


---

[← Voltar ao Índice](../index.md)
