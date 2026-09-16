## 1. Repositório

- [x] 1.1 Reescrever `README.md` e `README.pt-BR.md` (o que há dentro, stack, tabela de comandos, envs, screenshots/GIF em `.docs/design/`); verificar ausência de menções a Hero/Big Numbers/light-dev/chat flutuante
- [x] 1.2 Atualizar `AGENTS.md`/`CLAUDE.md` com onde vivem comandos e regras do terminal; `DEPLOY.md` (env nova, `public/fonts` no Dockerfile); `.env.example`; criar `CHANGELOG.md` com `2.0.0 — terminal`
- [x] 1.3 Gravar `terminal-home.gif` (boot → help → projects → open 1) e print do `neofetch`; verificar referências no README

## 2. Referências locais e PRD

- [x] 2.1 Escrever `.docs/design/commands.md` (nome, aliases, args, saída, erros de cada comando) e `.docs/design/tokens.md`; verificar por script que todo comando do registry tem seção
- [x] 2.2 Atualizar o PRD para v2.0 (§1.4 stack, §2.1/2.7/2.8, §6.1 easter eggs, §7.1 Fase 8 com as 15 changes, estrutura de projeto); verificar leitura final
- [x] 2.3 Fechar `.docs/tasks/terminal-migration/00-README.md` com status concluído, data e links dos merges

## Notas de implementação

- 1.2: `CLAUDE.md` contém só `@AGENTS.md`, então as regras do terminal foram escritas em `AGENTS.md` (sem tocar em `CLAUDE.md`). Não existe `public/fonts`: DaddyTimeMono vive em `src/app/fonts/` e sai por `.next/static` (já copiado pelo Dockerfile) — `DEPLOY.md` registra isso. Como `NEXT_PUBLIC_TERMINAL_ASK_FALLBACK` é inlinado no build e `.env` não entra no contexto Docker, o `Dockerfile` ganhou `ARG`/`ENV` e o `docker-compose.prod.yml` um `build.args` para a flag valer em produção. `.env.example` também ganhou `OPENAI_GENERATOR_MODEL`, `CHAT_RATE_*`, `CHAT_DAILY_MAX` e `UPLOAD_DIR`, que o código lê e não estavam documentados.
- 1.3: os arquivos foram gravados em `.docs/design/` como pedido, mas `.docs` é gitignored e o README não os renderizaria no GitHub; cópias versionadas ficam em `docs/media/` (referenciadas pelos dois READMEs; `docs` adicionado ao `.dockerignore`).
- 2.1: verificação por `pnpm docs:commands` (`scripts/check-commands-doc.ts`), manual e não no `pnpm lint`, porque `.docs` não existe no CI.
