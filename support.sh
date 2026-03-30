#!/usr/bin/env bash
# =============================================================================
# tools.sh — Moodle Dev MCP · Developer Tools
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
ok()      { echo -e "${GREEN}  ✔ $1${NC}"; }
fail()    { echo -e "${RED}  ✖ $1${NC}"; }
warn()    { echo -e "${YELLOW}  ⚠ $1${NC}"; }
info()    { echo -e "${CYAN}  → $1${NC}"; }
heading() { echo -e "\n${BOLD}${BLUE}$1${NC}\n"; }

pause() {
    echo ""
    read -rp "  Pressione Enter para voltar ao menu..." _
}

has_cmd() { command -v "$1" >/dev/null 2>&1; }

require_node() {
    if ! has_cmd node; then
        fail "Node.js não encontrado."
        echo ""
        warn "Instale o Node.js >= 18 antes de continuar:"
        echo "    https://nodejs.org  ou  https://github.com/nvm-sh/nvm"
        return 1
    fi
    local ver
    ver=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$ver" -lt 18 ]; then
        fail "Node.js $(node --version) encontrado — versão mínima: 18."
        return 1
    fi
    ok "Node.js $(node --version)"
    return 0
}

require_npm() {
    if ! has_cmd npm; then
        fail "npm não encontrado."
        return 1
    fi
    ok "npm $(npm --version)"
    return 0
}

# ── Menu principal ─────────────────────────────────────────────────────────────
show_menu() {
    clear
    echo -e "${BOLD}${BLUE}"
    echo "  ╔══════════════════════════════════════════════╗"
    echo "  ║       moodle-dev-mcp · Developer Tools       ║"
    echo "  ╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "  Selecione uma opção:"
    echo ""
    echo -e "  ${CYAN}1.${NC} Instalar Claude Code (CLI)"
    echo -e "  ${CYAN}2.${NC} Instalar Gemini Code Assist (CLI)"
    echo -e "  ${CYAN}3.${NC} Instalar OpenAI Codex (CLI)"
    echo -e "  ${CYAN}4.${NC} Gerar arquivo de instruções (CLAUDE.md / GEMINI.md / AGENTS.md)"
    echo ""
    echo -e "  ${CYAN}0.${NC} Sair"
    echo ""
    read -rp "  Opção: " choice
    echo ""
}

# ── 1. Instalar Claude Code ────────────────────────────────────────────────────
install_claude_code() {
    heading "Instalando Claude Code (CLI)"

    # Verificar dependências
    info "Verificando dependências..."
    require_node || { pause; return; }
    require_npm  || { pause; return; }

    # Verificar se já está instalado
    if has_cmd claude; then
        local current
        current=$(claude --version 2>/dev/null | head -1 || echo "desconhecida")
        warn "Claude Code já está instalado (versão: ${current})."
        echo ""
        read -rp "  Deseja reinstalar/atualizar? [s/N]: " confirm
        [[ "$confirm" =~ ^[sS]$ ]] || { info "Instalação cancelada."; pause; return; }
    fi

    echo ""
    info "Instalando @anthropic-ai/claude-code globalmente..."
    echo ""

    if npm install -g @anthropic-ai/claude-code; then
        echo ""
        ok "Claude Code instalado com sucesso!"
        echo ""
        info "Versão instalada: $(claude --version 2>/dev/null | head -1 || echo 'verifique com: claude --version')"
    else
        echo ""
        fail "Falha na instalação. Tente:"
        echo "    sudo npm install -g @anthropic-ai/claude-code"
        pause
        return
    fi

    echo ""
    echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  Para usar o Claude Code com o moodle-dev-mcp,"
    echo "  adicione o servidor MCP após a instalação:"
    echo ""
    echo -e "  ${CYAN}claude mcp add moodle-dev-mcp \\"
    echo "    -e MOODLE_PATH=/seu/caminho/moodle \\"
    echo -e "    -- npx -y moodle-dev-mcp${NC}"
    echo ""
    echo "  O Claude Code é uma ferramenta de terminal — não requer"
    echo "  instalação de plugin em editor. Para usar em VS Code ou"
    echo "  outro editor, instale a extensão manualmente no marketplace"
    echo "  do seu editor de preferência."
    echo ""
    echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    pause
}

# ── 2. Instalar Gemini Code Assist ────────────────────────────────────────────
install_gemini() {
    heading "Instalando Gemini Code Assist (CLI)"

    info "Verificando dependências..."
    require_node || { pause; return; }
    require_npm  || { pause; return; }

    # Verificar se já está instalado
    if has_cmd gemini; then
        local current
        current=$(gemini --version 2>/dev/null | head -1 || echo "desconhecida")
        warn "Gemini CLI já está instalado (versão: ${current})."
        echo ""
        read -rp "  Deseja reinstalar/atualizar? [s/N]: " confirm
        [[ "$confirm" =~ ^[sS]$ ]] || { info "Instalação cancelada."; pause; return; }
    fi

    echo ""
    info "Instalando @google/gemini-cli globalmente..."
    echo ""

    if npm install -g @google/gemini-cli; then
        echo ""
        ok "Gemini CLI instalado com sucesso!"
        echo ""
        info "Versão instalada: $(gemini --version 2>/dev/null | head -1 || echo 'verifique com: gemini --version')"
    else
        echo ""
        fail "Falha na instalação. Tente:"
        echo "    sudo npm install -g @google/gemini-cli"
        pause
        return
    fi

    echo ""
    echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  Próximos passos para usar o moodle-dev-mcp com o Gemini:"
    echo ""
    echo "  1. Autentique-se com sua conta Google:"
    echo -e "     ${CYAN}gemini auth login${NC}"
    echo ""
    echo "  2. Configure o servidor MCP em ~/.gemini/settings.json:"
    echo ""
    echo -e "     ${CYAN}mkdir -p ~/.gemini"
    cat << 'JSON'
     cat >> ~/.gemini/settings.json << 'EOF'
{
  "mcpServers": {
    "moodle-dev-mcp": {
      "command": "npx",
      "args": ["-y", "moodle-dev-mcp"],
      "env": {
        "MOODLE_PATH": "/seu/caminho/moodle"
      }
    }
  }
}
EOF
JSON
    echo -e "${NC}"
    echo "  Para usar no VS Code, instale a extensão 'Gemini Code Assist'"
    echo "  manualmente no marketplace do VS Code e ative o Agent Mode"
    echo "  no painel do Gemini para habilitar os servidores MCP."
    echo ""
    echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    pause
}

# ── 3. Instalar OpenAI Codex ──────────────────────────────────────────────────
install_codex() {
    heading "Instalando OpenAI Codex (CLI)"

    info "Verificando dependências..."
    require_node || { pause; return; }
    require_npm  || { pause; return; }

    # Verificar se já está instalado
    if has_cmd codex; then
        local current
        current=$(codex --version 2>/dev/null | head -1 || echo "desconhecida")
        warn "OpenAI Codex já está instalado (versão: ${current})."
        echo ""
        read -rp "  Deseja reinstalar/atualizar? [s/N]: " confirm
        [[ "$confirm" =~ ^[sS]$ ]] || { info "Instalação cancelada."; pause; return; }
    fi

    echo ""
    info "Instalando @openai/codex globalmente..."
    echo ""

    if npm install -g @openai/codex; then
        echo ""
        ok "OpenAI Codex instalado com sucesso!"
        echo ""
        info "Versão instalada: $(codex --version 2>/dev/null | head -1 || echo 'verifique com: codex --version')"
    else
        echo ""
        fail "Falha na instalação. Tente:"
        echo "    sudo npm install -g @openai/codex"
        pause
        return
    fi

    echo ""
    echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  Próximos passos para usar o moodle-dev-mcp com o Codex:"
    echo ""
    echo "  1. Configure sua chave de API:"
    echo -e "     ${CYAN}export OPENAI_API_KEY=sk-...${NC}"
    echo "     (adicione ao ~/.bashrc ou ~/.zshrc para persistir)"
    echo ""
    echo "  2. Adicione o servidor MCP:"
    echo ""
    echo -e "     ${CYAN}codex mcp add moodle-dev-mcp \\"
    echo "       --env MOODLE_PATH=/seu/caminho/moodle \\"
    echo -e "       -- npx -y moodle-dev-mcp${NC}"
    echo ""
    echo "  Nota: o Codex usa ~/.codex/config.toml (formato TOML)."
    echo "  A CLI e a extensão VS Code compartilham o mesmo arquivo."
    echo "  Para instalar a extensão no VS Code, faça manualmente"
    echo "  no marketplace do editor."
    echo ""
    echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    pause
}

# ── 4. Gerar arquivo de instruções ────────────────────────────────────────────
generate_instructions() {
    heading "Gerar Arquivo de Instruções"

    # ── Escolher tipo de arquivo ──────────────────────────────────────────────
    echo "  Qual arquivo deseja criar?"
    echo ""
    echo -e "  ${CYAN}1.${NC} CLAUDE.md    — Claude Code"
    echo -e "  ${CYAN}2.${NC} GEMINI.md    — Gemini Code Assist"
    echo -e "  ${CYAN}3.${NC} AGENTS.md    — OpenAI Codex"
    echo ""
    read -rp "  Tipo: " file_type

    case "$file_type" in
        1) filename="CLAUDE.md";  client="Claude Code" ;;
        2) filename="GEMINI.md";  client="Gemini Code Assist" ;;
        3) filename="AGENTS.md";  client="OpenAI Codex" ;;
        *)
            warn "Opção inválida."
            pause
            return
            ;;
    esac

    echo ""

    # ── Versão do Moodle ──────────────────────────────────────────────────────
    echo "  Versão do Moodle:"
    echo -e "  ${CYAN}1.${NC} 4.1    ${CYAN}2.${NC} 4.2    ${CYAN}3.${NC} 4.3    ${CYAN}4.${NC} 4.4    ${CYAN}5.${NC} 4.5"
    echo -e "  ${CYAN}6.${NC} Outra (informar manualmente)"
    echo ""
    read -rp "  Versão: " ver_choice

    case "$ver_choice" in
        1) moodle_version="4.1"; moodle_requires="2022112800" ;;
        2) moodle_version="4.2"; moodle_requires="2023042400" ;;
        3) moodle_version="4.3"; moodle_requires="2023100900" ;;
        4) moodle_version="4.4"; moodle_requires="2024042200" ;;
        5) moodle_version="4.5"; moodle_requires="2024100700" ;;
        6)
            read -rp "  Informe a versão (ex: 4.6): " moodle_version
            read -rp "  Informe o requires (ex: 2025042200): " moodle_requires
            ;;
        *)
            warn "Opção inválida."
            pause
            return
            ;;
    esac

    echo ""

    # ── Modo: instalação específica ou modelo ─────────────────────────────────
    echo "  Modo de criação:"
    echo ""
    echo -e "  ${CYAN}1.${NC} Instalação específica — informe o caminho e o arquivo"
    echo "     será criado diretamente na raiz do Moodle"
    echo ""
    echo -e "  ${CYAN}2.${NC} Modelo — cria um arquivo modelo no diretório atual"
    echo "     para você ajustar e copiar para cada instalação"
    echo ""
    read -rp "  Modo: " mode_choice

    local dest_dir
    local dest_path

    case "$mode_choice" in
        1)
            echo ""
            read -rp "  Caminho da instalação Moodle (ex: /var/www/html/moodle): " moodle_path
            moodle_path="${moodle_path%/}"  # remove trailing slash

            if [ ! -d "$moodle_path" ]; then
                fail "Diretório não encontrado: $moodle_path"
                pause
                return
            fi
            if [ ! -f "$moodle_path/version.php" ]; then
                fail "version.php não encontrado em $moodle_path — verifique se é a raiz correta do Moodle."
                pause
                return
            fi

            dest_dir="$moodle_path"
            dest_path="$moodle_path/$filename"
            ;;
        2)
            moodle_path="/seu/caminho/moodle"
            dest_dir="$(pwd)"
            dest_path="$(pwd)/${filename%.md}.modelo.md"
            ;;
        *)
            warn "Opção inválida."
            pause
            return
            ;;
    esac

    # ── Confirmar sobrescrita se arquivo existir ──────────────────────────────
    if [ -f "$dest_path" ]; then
        warn "Arquivo já existe: $dest_path"
        read -rp "  Deseja sobrescrever? [s/N]: " overwrite
        [[ "$overwrite" =~ ^[sS]$ ]] || { info "Operação cancelada."; pause; return; }
    fi

    # ── Hook API note baseado na versão ───────────────────────────────────────
    if [[ "$moodle_version" == "4.3" ]] || [[ "$moodle_version" > "4.3" ]]; then
        hook_note="- Hook API disponível (Moodle 4.3+): use db/hooks.php em vez de callbacks legados do lib.php"
    else
        hook_note="- Hook API NÃO disponível nesta versão — use callbacks do lib.php"
    fi

    # ── Gerar conteúdo do arquivo ─────────────────────────────────────────────
    cat > "$dest_path" << MDEOF
# 🧩 Moodle Plugin Development Rules

> Arquivo de instruções para ${client} — gerado pelo moodle-dev-mcp tools.sh
> Moodle ${moodle_version} | Caminho: ${moodle_path}

---

## Ambiente de Desenvolvimento

- **Versão do Moodle:** ${moodle_version}
- **Caminho da instalação:** ${moodle_path}
- **Servidor MCP:** moodle-dev-mcp está configurado e os índices foram gerados

## moodle-dev-mcp — Como usar

Antes de trabalhar em qualquer plugin, carregue o contexto:

\`\`\`
Carregue o contexto do plugin local_myplugin.
\`\`\`

Use as tools disponíveis:
- \`get_plugin_info\` — carrega o contexto completo de um plugin na sessão
- \`search_api\` — pesquisa funções da API do core do Moodle
- \`generate_plugin_context\` — gera os arquivos PLUGIN_*.md para um plugin
- \`update_indexes\` — regenera os índices globais após instalar novos plugins
- \`doctor\` — verifica a saúde do ambiente moodle-dev-mcp

Fluxo recomendado:
1. Antes de trabalhar em um plugin: carregue o contexto com get_plugin_info
2. Antes de sugerir funções do core: use search_api
3. Após mudanças significativas em um plugin: execute generate_plugin_context
4. Após instalar novos plugins no Moodle: execute update_indexes

---

## Target Moodle Version

This project targets **Moodle ${moodle_version}+** (\`requires = ${moodle_requires}\`).

- Use only APIs available in Moodle ${moodle_version} or later.
- Do not use functions deprecated in previous versions.
${hook_note}

---

## Required Files

Every plugin must include these files at minimum:

\`\`\`
version.php
lang/en/[component].php
db/install.xml
db/access.php
\`\`\`

Optional but recommended:

\`\`\`
settings.php
lib.php
index.php
classes/
templates/
amd/src/
tests/
tests/behat/
\`\`\`

---

## version.php

\`\`\`php
defined('MOODLE_INTERNAL') || die();

\$plugin->component = 'local_example';
\$plugin->version   = 2025010100;
\$plugin->requires  = ${moodle_requires};
\$plugin->maturity  = MATURITY_STABLE;
\$plugin->release   = '1.0';
\`\`\`

---

## Language File

Path: \`lang/en/local_example.php\`

\`\`\`php
defined('MOODLE_INTERNAL') || die();

\$string['pluginname'] = 'Example Plugin';
\`\`\`

All user-facing strings must be defined here. Never hardcode strings in PHP or templates.

---

## db/install.xml

- All tables must use the Moodle table prefix (handled automatically by XMLDB).
- Every table must define a primary key.
- Define indexes for columns used in WHERE or JOIN clauses.
- Use correct XMLDB field types: \`INT\`, \`CHAR\`, \`TEXT\`, \`NUMBER\`, \`FLOAT\`.

---

## db/access.php

All capabilities must be declared in this file.

\`\`\`php
defined('MOODLE_INTERNAL') || die();

\$capabilities = [
    'local/example:view' => [
        'riskbitmask'  => RISK_PERSONAL,
        'captype'      => 'read',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes'   => [
            'user'    => CAP_ALLOW,
            'manager' => CAP_ALLOW,
        ],
    ],
];
\`\`\`

---

## PHP Namespaces

All classes must use the plugin namespace.

\`\`\`php
namespace local_example\service;
namespace local_example\repository;
namespace local_example\output;
namespace local_example\external;
namespace local_example\task;
namespace local_example\event;
\`\`\`

File paths must match namespaces under \`classes/\`.

---

## Recommended Plugin Architecture

\`\`\`
classes/
  service/        → Business logic
  repository/     → Database access
  output/         → Rendering logic (renderers and renderables)
  external/       → Web service endpoints
  task/           → Scheduled and ad-hoc tasks
  event/          → Event classes
db/
  events.php      → Event observers
templates/        → Mustache templates
amd/src/          → AMD JavaScript modules
tests/            → PHPUnit tests
tests/behat/      → Behat acceptance tests
\`\`\`

### Entry Point Pattern (index.php)

\`\`\`php
require_once(__DIR__ . '/../../config.php');

require_login();
require_capability('local/example:view', context_system::instance());

\$PAGE->set_url(new moodle_url('/local/example/index.php'));
\$PAGE->set_context(context_system::instance());
\$PAGE->set_title(get_string('pluginname', 'local_example'));

\$service  = new \local_example\service\example_service();
\$data     = \$service->get_data();

\$output   = \$PAGE->get_renderer('local_example');
echo \$output->header();
echo \$output->render_from_template('local_example/main', \$data);
echo \$output->footer();
\`\`\`

---

## ⚠️ Common Mistakes — Never Do These

### Do NOT use direct HTML in PHP

\`\`\`php
// Wrong
echo "<div>Hello</div>";

// Correct
echo \$output->render_from_template('local_example/component', \$data);
\`\`\`

### Do NOT access request variables directly

\`\`\`php
// Wrong
\$id = \$_POST['id'];

// Correct
\$id = required_param('id', PARAM_INT);
\$id = optional_param('id', 0, PARAM_INT);
\`\`\`

### Do NOT hardcode URLs

\`\`\`php
// Wrong
echo '/local/example/index.php';

// Correct
echo new moodle_url('/local/example/index.php', ['id' => \$id]);
\`\`\`

### Do NOT hardcode language strings

\`\`\`php
// Wrong
echo "Save";

// Correct
echo get_string('save', 'local_example');
\`\`\`

### Do NOT query the database directly

\`\`\`php
// Wrong
mysqli_query(...);

// Correct — always use the \$DB API
\$records = \$DB->get_records('example_table', ['userid' => \$userid]);
\$DB->insert_record('example_table', \$dataobject);
\$DB->update_record('example_table', \$dataobject);
\$DB->delete_records('example_table', ['id' => \$id]);
\`\`\`

### Do NOT bypass authentication and capability checks

\`\`\`php
// Always include at the top of every page script
require_login();
require_capability('local/example:view', \$context);
\`\`\`

### Do NOT use inline JavaScript

\`\`\`javascript
// Correct: use AMD modules
// amd/src/example.js
define(['jquery'], function(\$) {
    return {
        init: function() { /* ... */ }
    };
});
\`\`\`

\`\`\`mustache
{{! Correct: load AMD module from template }}
{{#js}}
require(['local_example/example'], function(mod) {
    mod.init();
});
{{/js}}
\`\`\`

---

## Testing

Unit tests must be placed in \`tests/\` and follow PHPUnit conventions.

\`\`\`php
// tests/example_test.php
namespace local_example\tests;

class example_test extends \advanced_testcase {
    public function test_something(): void {
        \$this->resetAfterTest();
        // ...
    }
}
\`\`\`

Behat acceptance tests must be placed in \`tests/behat/\`.
MDEOF

    echo ""
    ok "Arquivo criado: ${dest_path}"
    echo ""

    if [ "$mode_choice" = "2" ]; then
        info "Este é um arquivo modelo. Edite e copie para a raiz"
        info "de cada instalação Moodle antes de usar."
    else
        info "O arquivo foi criado na raiz do Moodle."
        info "O ${client} irá lê-lo automaticamente ao iniciar cada sessão."
    fi

    pause
}

# ── Loop principal ─────────────────────────────────────────────────────────────
main() {
    while true; do
        show_menu
        case "$choice" in
            1) install_claude_code ;;
            2) install_gemini ;;
            3) install_codex ;;
            4) generate_instructions ;;
            0|q|Q)
                echo -e "  ${GREEN}Até logo!${NC}\n"
                exit 0
                ;;
            *)
                warn "Opção inválida. Tente novamente."
                sleep 1
                ;;
        esac
    done
}

main
