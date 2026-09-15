## Why

Um terminal que esquece tudo ao navegar para um projeto e voltar, ou que não pode ser linkado em um estado específico, frustra. Links antigos (`/#contact`, `/#projects`) espalhados em LinkedIn e e-mails também precisam continuar funcionando.

## What Changes

- Deep-link `/{lang}?cmd=<comando>[;<comando>]` executando comandos ao carregar, com sanitização.
- Estado da sessão (histórico e últimos comandos) restaurado ao voltar de páginas internas.
- Comando `lang [pt|en]` e botão de idioma na barra, integrados ao cookie de locale existente.
- Comandos `cd <dir>` / `cd ~` / `pwd` para navegar entre rotas.
- Conversão de âncoras antigas (`/#contact`, `/#projects`, `/#about`) em comandos.
- Item ativo do menu (`aria-current`) para o último comando de conteúdo.

## Capabilities

### New Capabilities
- `terminal-navigation`: deep-links, persistência de estado entre páginas, troca de idioma e comandos de navegação.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/components/terminal/use-terminal.ts` (restauração), `src/lib/terminal/nav-commands.tsx`, `status-bar.tsx` (botão lang), `page-chrome.tsx` (`cd ..` com `?cmd=`), leitura de `searchParams` na page do terminal.
- Depende de 06 e 08. `lang-switcher.tsx` antigo é removido na change 12.
