## Why

A home é onde o recrutador decide se continua. Ela precisa contar quem é Marco, provar com casos e explicar como ele trabalha, legível sem JavaScript e navegável por quem não conhece terminal.

## What Changes

- Home com abertura e oito seções, renderizada no servidor, em PT e EN.
- Trilho com as oito seções sempre acessíveis; descobrir é só visual. No celular, menu na base.
- Formulário de contato e canais, pela action que já existe.
- Assistente em painel lateral, pela rota e pelos limites que já existem.
- **BREAKING** (URL): `/[lang]/chat` abre a home com a assistente; âncoras antigas levam às seções.

**Fora do escopo:** projeção, linha-guia e voo da tag (`rebrand-04-projection`): aqui a forma é uma imagem estática e a tag entra direto no trilho.

## Capabilities

### New Capabilities
- `site-home`: conteúdo e interação das seções.
- `site-rail`: descoberta e navegação por seções.
- `site-assistant`: painel da assistente.

### Modified Capabilities
- `terminal-home`: sai o redirecionamento antigo do chat.
- `terminal-navigation`: saem as âncoras antigas da Versão CLI.

## Impact

- `src/app/[lang]` (grupo do site), `src/components/site/**`, dicionários, `src/app/_actions/contact.ts` (reuso), `src/app/[lang]/chat`.
- **Branch:** feat/rebranding
- **Depende de:** rebrand-02-site-chrome, portfolio-01-content-in-db
