## Why

As telas que dependem dos dados novos ainda não existem no desenho novo: o dossiê completo, a semana do Google, o editor de projeto com prévia e a revisão de rascunho.

## What Changes

- Dossiê em painel e em página: vaga, empresa, contexto do projeto, entrevistas, documento enviado, motivo de encerramento, e o que já existia.
- Agenda da semana, com marcar, mover e remover em "Entrevistas".
- Editor de projeto em PT e EN com prévia, galeria, texto do caso e escolha dos casos da home.
- Revisão de rascunho com comparação, publicar, descartar e desfazer.
- Telas traduzidas.

**Fora do escopo:** edição de carreira (continua "em breve") e envio de imagem por agente.

## Capabilities

### New Capabilities
- `admin-agenda`: a semana no backoffice.
- `admin-portfolio-editor`: edição, prévia e revisão de projetos.

### Modified Capabilities
- `application-dossier`: a tela do dossiê (requisitos acrescentados).
- `admin-theme`: lista de telas preservadas e campos de cor do projeto.

## Impact

- `src/app/admin/applications/**`, `src/app/admin/agenda`, `src/app/admin/projects/**`, `src/components/admin/**`, dicionários, `AGENTS.md` do backoffice.
- **Branch:** feat/rebranding
- **Depende de:** rebrand-09-admin-lists-and-forms, portfolio-01-content-in-db, dossier-01-fields, dossier-02-sent-documents, agenda-01-google-calendar, agent-01-portfolio-drafts
