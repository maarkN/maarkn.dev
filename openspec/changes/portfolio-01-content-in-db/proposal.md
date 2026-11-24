## Why

Editar um projeto no backoffice não muda o site: para os 19 projetos conhecidos o texto do dicionário vence o do banco, e as colunas do banco têm um idioma só. O editor com prévia, os casos de sucesso, a galeria e os rascunhos de agente dependem de o banco ser a fonte (ADR 0003).

## What Changes

- O projeto guarda no banco, em português e inglês: resumo, descrição, função e entregas.
- Nova galeria por projeto, ordenada, com legenda nos dois idiomas.
- Novo texto de caso (problema, trabalho, resultado) e a escolha e a ordem dos casos de sucesso, no máximo três.
- O site lê o banco primeiro; sem banco, ou sem texto no idioma, usa a semente do repositório.
- Migração única que leva o texto dos dicionários para o banco. `db:sync-projects` passa a criar o que falta e não sobrescreve texto.
- **BREAKING** (operação): corrigir texto no dicionário deixa de mudar o site publicado.

**Fora do escopo:** telas do backoffice (`rebrand-11-admin-screens`), rascunhos (`agent-01-portfolio-drafts`) e edição de carreira.

## Capabilities

### New Capabilities
- `portfolio-content`: de onde vem o conteúdo dos projetos, em que idiomas, e como se escolhem os casos de sucesso.

### Modified Capabilities
- `terminal-content-commands`: os comandos leem o texto do projeto da mesma fonte que as páginas.

## Impact

- `prisma/schema.prisma` e migração, `src/lib/projects-repo.ts`, páginas de projetos, sitemap, `scripts/sync-projects.ts`, `prisma/seed.ts`, formulário atual de projeto, READMEs e `DEPLOY.md`.
- **Branch:** main
- **Depende de:** infra-01-pr-checks
