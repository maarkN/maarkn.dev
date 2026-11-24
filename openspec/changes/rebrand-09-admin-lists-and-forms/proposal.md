## Why

Listas com cara de `ls`, botões entre colchetes e erros com `stderr:` fazem sentido para quem vive no terminal, e atrapalham no uso diário. Esta change troca listas, quadro, formulários e avisos, e traduz essas telas.

## What Changes

- Tabela, filtros, paginação, estados vazio e de carregamento no desenho novo.
- Quadro em seis colunas, com arrastar e teclado.
- Campos, erros, janelas, confirmações e avisos no desenho novo.
- Telas traduzidas: candidaturas (lista, quadro, criar, editar), vagas, contatos, projetos (lista), gerador, notas, assistente, MCP e chaves, auditoria, configurações.
- Aposenta `admin-terminal-listing` e `admin-forms-feedback`.

**Fora do escopo:** visão geral, dossiê, agenda e editor de projeto.

## Capabilities

### New Capabilities
- `admin-listing`: listas e quadro.
- `admin-forms`: formulários, confirmações e avisos.

### Modified Capabilities
- `admin-terminal-listing`: aposentada.
- `admin-forms-feedback`: aposentada.
- `admin-theme`: legibilidade dos formulários no desenho novo.

## Impact

- `src/app/admin/**`, `src/components/admin/**`, `src/components/ui/**`, dicionários, `src/app/admin/AGENTS.md` (regras A9 a A13).
- **Branch:** feat/rebranding
- **Depende de:** rebrand-08-admin-shell
