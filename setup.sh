#!/usr/bin/env bash

# =============================================================================
# setup.sh
# Setup script for moodle-mcp development environment.
#
# What this script does:
#   1. Verifies system dependencies (Node.js >= 18, npm)
#   2. Installs npm dependencies (including express for HTTP mode)
#   3. Runs the TypeScript compiler to validate the setup
#   4. Reports the result
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

echo ""
echo "moodle-mcp — Setup"
echo "=================="
echo ""

step "Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
    fail "Node.js not found. Install Node.js >= 18 from https://nodejs.org"
fi
NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    fail "Node.js $NODE_VERSION found, but >= 18 is required."
fi
ok "Node.js v$NODE_VERSION"

step "Checking npm..."
if ! command -v npm >/dev/null 2>&1; then
    fail "npm not found."
fi
ok "npm v$(npm --version)"

step "Installing dependencies..."
echo ""
npm install
echo ""
ok "Dependencies installed (includes express for HTTP mode)"

step "Running TypeScript type check..."
echo ""
if npm run typecheck; then
    echo ""
    ok "TypeScript OK"
else
    echo ""
    warn "TypeScript reported errors. Fix them before building."
fi

step "Building project..."
echo ""
if npm run build; then
    echo ""
    ok "Build successful — output in dist/"
else
    echo ""
    fail "Build failed. Check the errors above."
fi

echo ""
echo "========================================"
echo -e "${GREEN}Setup complete!${NC}"
echo "========================================"
echo ""
echo "Usage:"
echo ""
echo "  stdio mode (Claude Desktop, Cursor, VS Code):"
echo "    npm start"
echo ""
echo "  HTTP mode (remote Moodle installations):"
echo "    npm run start:http"
echo "    npm run start:http -- --port 8080 --token mysecret"
echo ""
echo "  Development:"
echo "    npm run dev          # stdio"
echo "    npm run dev:http     # HTTP on port 3000"
echo ""
echo "  MCP Inspector:"
echo "    npm run inspector"
echo ""
echo "  Claude Desktop (stdio) — add to claude_desktop_config.json:"
echo '    {'
echo '      "mcpServers": {'
echo '        "moodle-mcp": {'
echo '          "command": "node",'
echo '          "args": ["'$(pwd)'/dist/index.js"]'
echo '        }'
echo '      }'
echo '    }'
echo ""
echo "  Claude Desktop (HTTP — remote):"
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
