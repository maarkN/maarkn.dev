## Why

Após as changes 06–10, dezenas de componentes, o `framer-motion`, 600+ linhas de CSS e várias chaves de dicionário ficam órfãos. Mantê-los aumenta bundle, tempo de build e confusão para quem (ou o agente que) mexer no código depois.

## What Changes

- Remoção de componentes não referenciados: `hero`, `identity-card`, `theme-photo`, `big-numbers`, `about`, `toolkit`, `projects`, `project-card`, `projects-filter`, `career-stream`, `parallax-cover`, `contact`, `links-hub`, `nav`, `footer`, `socials`, `lang-switcher`, `theme-switcher`, `blog/latest-logs`, `blog/post-card`, `blog/post-cover`, `dev/marquee-strip`, `dev/konami-egg`, `chat/chat-launcher`, `chat/chat-panel`, `chat/use-chat-stream` (e `project-detail`/`career-detail`/`post-content` se reescritos na 08).
- Remoção de assets órfãos (`public/photos/*`, SVGs de boilerplate).
- Remoção de dependências: `framer-motion`, `lucide-react`, `class-variance-authority` (conforme uso real).
- `globals.css` reduzido a < 300 linhas; tokens legados só sobrevivem em `admin.css` (change 14).
- Poda de chaves de dicionário órfãs e script de paridade de chaves en/pt-BR no `pnpm lint`.

## Capabilities

### New Capabilities
<!-- nenhuma: remoção de código já sem comportamento público -->

### Modified Capabilities
<!-- nenhuma -->

`skip_specs: true` — os comportamentos removidos (temas light/dev, chat flutuante, easter eggs, seções da home) já deixaram de existir nas changes 01 e 06; aqui só sai código morto.

## Impact

- `src/components/**`, `src/app/globals.css`, `src/dictionaries/*.json`, `package.json`, `pnpm-lock.yaml`, `public/`.
- Depende de 06, 07, 08, 09, 10 e 14 (para os tokens legados).
