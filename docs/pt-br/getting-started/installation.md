🌐 [English](../../en/getting-started/installation.md) | **Português (BR)** | 🏠 [Índice](../index.md)

---

# Guia de Instalação

O **moodle-dev-mcp** pode ser instalado globalmente via NPM ou clonado localmente para desenvolvimento e contribuição.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:

| Componente          | Versão mínima | Observação                              |
| :------------------ | :------------ | :-------------------------------------- |
| Node.js             | 18.x          | Versão LTS recomendada                  |
| npm                 | —             | Instalado automaticamente com o Node.js |
| Moodle              | 4.1           | Hook API requer Moodle 4.3+             |
| Sistema operacional | Qualquer      | Linux, macOS e Windows são suportados   |

Você também precisará de um **cliente MCP compatível** para interagir com o servidor. Veja os clientes suportados oficialmente:

- [Claude Code](../guides/clients/claude-code.md)
- [Gemini Code Assist](../guides/clients/gemini-code-assist.md)
- [OpenAI Codex](../guides/clients/codex.md)

---

## 🚀 Opção 1: Instalação via NPM (Recomendado)

A forma mais rápida para usar o servidor em qualquer projeto.

```bash
npm install -g moodle-dev-mcp
```

Após a instalação, o servidor estará disponível via `npx moodle-dev-mcp` ou como executável global.

---

## 🛠️ Opção 2: Instalação via Git (Desenvolvimento)

Use este método se você pretende contribuir com o projeto ou testar funcionalidades em primeira mão.

**1. Clone o repositório:**

```bash
git clone https://github.com/kaduvelasco/moodle-dev-mcp.git
cd moodle-dev-mcp
```

**2. Execute o script de setup:**

```bash
chmod +x setup.sh
./setup.sh
```

O script executa automaticamente as seguintes etapas:

| Etapa                     | O que faz                                        |
| :------------------------ | :----------------------------------------------- |
| **Verificar Node.js**     | Confirma que a versão >= 18 está instalada       |
| **Verificar npm**         | Confirma que o npm está disponível no PATH       |
| **Instalar dependências** | Executa `npm install`                            |
| **Type check**            | Executa `tsc --noEmit` para validar o TypeScript |
| **Build**                 | Compila `src/` → `dist/` via `tsc`               |
| **Resumo**                | Exibe exemplos de configuração prontos para uso  |

**3. Verifique o build:**

O código compilado estará na pasta `dist/`. O ponto de entrada principal é `dist/index.js`.

> O diretório `dist/` é gerado localmente e não é versionado no git. Execute `npm run build` sempre que modificar o código-fonte.

---

## ⚙️ Variáveis de Ambiente

O servidor é configurado exclusivamente via variáveis de ambiente. Você pode defini-las diretamente na configuração do seu cliente MCP ou criar um arquivo `.env` na raiz do projeto com base no `.env.example` incluído no repositório.

| Variável         | Obrigatória | Descrição                                                                     |
| :--------------- | :---------: | :---------------------------------------------------------------------------- |
| `MOODLE_PATH`    |   ✅ Sim    | Caminho absoluto para a raiz da instalação Moodle. Ex: `/var/www/html/moodle` |
| `MOODLE_VERSION` |   ❌ Não    | Força uma versão específica do Moodle. Ex: `4.5`. Ver observação abaixo.      |

### Sobre o `MOODLE_VERSION`

Na maioria dos casos, **você não precisa definir esta variável**. Ao executar `init_moodle_context` ou `update_indexes`, o servidor detecta a versão automaticamente a partir do arquivo `version.php` da sua instalação e ignora o valor do ENV.

O `MOODLE_VERSION` só é efetivamente utilizado em dois cenários:

- **Sem executar `init_moodle_context`:** quando você passa apenas `MOODLE_PATH` e pula a inicialização, a versão virá desta variável.
- **Quando a detecção automática falha:** se `version.php` estiver malformado ou inacessível, o servidor usa o valor desta variável como fallback.

---

## 🔍 Verificando a Instalação

Após a instalação e configuração do cliente MCP, você pode verificar se o servidor está funcionando corretamente pedindo ao seu assistente de IA:

```
Run the moodle-dev-mcp doctor
```

A IA chamará a tool `doctor` via protocolo MCP e retornará um relatório com o status do servidor: versão detectada do Moodle, caminho configurado, atualidade dos índices e ferramentas opcionais disponíveis.

> **Nota:** o `doctor` é uma tool MCP, não um comando CLI. Ele só pode ser executado dentro de uma sessão ativa com um cliente compatível (Claude Code ou Gemini Code Assist).

---

## ➡️ Próximos passos

Com o servidor instalado, configure seu cliente MCP:

- [Configurar Claude Code](../guides/clients/claude-code.md)
- [Configurar Gemini Code Assist](../guides/clients/gemini-code-assist.md)
- [Configurar OpenAI Codex](../guides/clients/codex.md)

Ou pule direto para o uso:

- [Quickstart](./quickstart.md)
- [Voltar ao Índice](../index.md)
