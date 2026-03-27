# Contributing to moodle-dev-mcp

🇧🇷 [Leia em Português](./CONTRIBUTING.pt-BR.md) | [← Back to README](./README.pt-BR.md)

---

Thank you for your interest in contributing to **moodle-dev-mcp**! This project is maintained by a Moodle developer for the Moodle developer community — every contribution, no matter how small, is very welcome.

## Ways to contribute

- **Bug reports** — open an issue describing what happened and how to reproduce it
- **Feature suggestions** — open an issue describing the use case and expected behavior
- **Pull requests** — fork, create a branch, implement and open a PR
- **Documentation** — fixes, translations and improvements to files in `docs/`
- **Examples** — new prompts or useful workflows for the community

## Environment setup

```bash
git clone https://github.com/kaduvelasco/moodle-dev-mcp.git
cd moodle-dev-mcp
chmod +x setup.sh
./setup.sh
```

The `setup.sh` checks dependencies, installs packages and compiles TypeScript automatically. To install AI clients (Claude Code, Gemini CLI, OpenAI Codex) or generate context files for your Moodle installation, use the helper utility:

```bash
chmod +x support.sh
./support.sh
```

## Understanding the architecture

Before contributing code, it is recommended to read the internal architecture documents:

- [Extractors](./docs/en/architecture/extractors.md) — how Moodle PHP files are read and interpreted
- [Generators](./docs/en/architecture/generators.md) — how context `.md` files are generated
- [Cache System](./docs/en/architecture/cache-system.md) — cache strategy by mtime and invalidation

## Guidelines

- Follow the existing TypeScript style — ESLint configuration is included in the repository
- Add or update tests in `src/tests/` for any changes to extractors or generators
- Run `npm run build && npm test` before submitting — PRs with failing builds will not be accepted
- Keep commits focused — one logical change per commit
- Write commit messages in English in imperative format (`feat:`, `fix:`, `docs:`)

## Running tests

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run typecheck     # type checking only (without generating files)
npm run build         # compile TypeScript → dist/
```

## Submitting a PR

1. Fork the repository
2. Create a descriptive branch: `git checkout -b feat/minha-feature`
3. Implement your changes and add tests when applicable
4. Run `npm run build && npm test` and confirm everything passes
5. Push and open a Pull Request against the `main` branch
6. Clearly describe what was changed and why

---

[← Back to README](./README.md)
