## Why

Marco quer editar os projetos da vitrine conversando com um agente. Hoje o MCP só escreve no projeto de carreira, que é privado, e a regra é que agente não publica. O rascunho resolve os dois lados: o agente propõe, e publicar exige a revisão de Marco (ADR 0005).

## What Changes

- Rascunho do projeto: proposta de mudança, ou de projeto novo, que não aparece no site. Um aberto por projeto.
- Comparação entre o rascunho e o que está no ar, campo a campo, nos dois idiomas.
- Publicar a revisão exata que foi vista, com auditoria, e desfazer a última publicação.
- MCP: `list_projects`, `get_project`, `upsert_project_draft` (escopo `portfolio:write`) e `publish_project_draft` (escopo `portfolio:publish`, fora das chaves existentes).
- **BREAKING** (regra): passa a existir uma tool que publica, nos termos do ADR 0005.

**Fora do escopo:** tela de revisão (`rebrand-11-admin-screens`), envio de imagem por agente e mudança na partição pública do RAG.

## Capabilities

### New Capabilities
- `portfolio-drafts`: propor, comparar, publicar e desfazer mudanças em projetos.

### Modified Capabilities

## Impact

- `prisma/schema.prisma` e migração, tools e escopos MCP, auditoria, revalidação das páginas de projeto, comentários de regra em `src/lib/mcp`.
- **Branch:** main
- **Depende de:** portfolio-01-content-in-db
