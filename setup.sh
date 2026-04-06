#!/usr/bin/env bash

# =============================================================================
# setup.sh
# Setup script for moodle-mcp development environment.
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✔ $1${NC}"; }
fail() { echo -e "${RED}✖ $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
step() { echo -e "${BLUE}→ $1${NC}"; }

# =============================================================================
# Funções de cada etapa
# =============================================================================

check_deps() {
    step "Verificando Node.js..."
    if ! command -v node >/dev/null 2>&1; then
        fail "Node.js não encontrado. Instale Node.js >= 18 em https://nodejs.org"
    fi
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        fail "Node.js $NODE_VERSION encontrado, mas >= 18 é necessário."
    fi
    ok "Node.js v$NODE_VERSION"

    step "Verificando npm..."
    if ! command -v npm >/dev/null 2>&1; then
        fail "npm não encontrado."
    fi
    ok "npm v$(npm --version)"
}

install_deps() {
    step "Instalando dependências..."
    echo ""
    npm install
    echo ""
    ok "Dependências instaladas (inclui express para modo HTTP)"
}

build_project() {
    step "Executando verificação de tipos TypeScript..."
    echo ""
    if npm run typecheck; then
        echo ""
        ok "TypeScript OK"
    else
        echo ""
        warn "TypeScript reportou erros. Corrija-os antes de fazer o build."
    fi

    step "Fazendo build do projeto..."
    echo ""
    if npm run build; then
        echo ""
        ok "Build concluído — saída em dist/"
    else
        echo ""
        fail "Build falhou. Verifique os erros acima."
    fi
}

show_usage() {
    echo ""
    echo "========================================"
    echo -e "${GREEN}Concluído!${NC}"
    echo "========================================"
    echo ""
    echo "Uso:"
    echo ""
    echo "  Modo stdio (Claude Desktop, Cursor, VS Code):"
    echo "    npm start"
    echo ""
    echo "  Modo HTTP (instalações Moodle remotas):"
    echo "    npm run start:http"
    echo "    npm run start:http -- --port 8080 --token mysecret"
    echo ""
    echo "  Desenvolvimento:"
    echo "    npm run dev          # stdio"
    echo "    npm run dev:http     # HTTP na porta 3000"
    echo ""
    echo "  MCP Inspector:"
    echo "    npm run inspector"
    echo ""
    echo "  Claude Desktop (stdio) — adicione ao claude_desktop_config.json:"
    echo '    {'
    echo '      "mcpServers": {'
    echo '        "moodle-mcp": {'
    echo '          "command": "node",'
    echo '          "args": ["'$(pwd)'/dist/index.js"]'
    echo '        }'
    echo '      }'
    echo '    }'
    echo ""
    echo "  Claude Desktop (HTTP — remoto):"
    echo '    {'
    echo '      "mcpServers": {'
    echo '        "moodle-mcp-remote": {'
    echo '          "url": "http://your-server:3000/mcp",'
    echo '          "headers": {'
    echo '            "Authorization": "Bearer your-secret-token"'
    echo '          }'
    echo '        }'
    echo '      }'
    echo '    }'
    echo ""
}

# =============================================================================
# Menu interativo
# =============================================================================

echo ""
echo "moodle-mcp — Setup"
echo "=================="
echo ""
echo "  1. Setup completo (dependências + typecheck + build)"
echo "  2. Instalar dependências npm"
echo "  3. Build do projeto"
echo "  0. Sair"
echo ""
read -rp "Escolha uma opção: " OPCAO

case "$OPCAO" in
    1)
        echo ""
        check_deps
        echo ""
        install_deps
        echo ""
        build_project
        show_usage
        ;;
    2)
        echo ""
        check_deps
        echo ""
        install_deps
        echo ""
        echo "========================================"
        echo -e "${GREEN}Concluído!${NC}"
        echo "========================================"
        echo ""
        ;;
    3)
        echo ""
        check_deps
        echo ""
        build_project
        show_usage
        ;;
    0)
        echo ""
        echo "Saindo."
        echo ""
        exit 0
        ;;
    *)
        echo ""
        warn "Opção inválida: '$OPCAO'"
        echo ""
        exit 1
        ;;
esac
