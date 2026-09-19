## Why

Sobra a camada com que se trabalha de verdade: os formulários do backoffice, os diálogos de confirmação e o retorno das Server Actions. A decisão de escopo foi manter formulário como formulário — um prompt interativo seria mais fiel e muito pior de usar para editar um dossiê de 7 abas.

Mas "formulário convencional" não quer dizer formulário de painel. Rótulo, ajuda, erro, botão e toast ainda podem ser escritos como um programa de linha de comando escreve.

## What Changes

- Rótulos em texto simples; ajuda como comentário (`# …`); obrigatoriedade escrita, não asterisco.
- Erro de validação e falha de ação como linha de `stderr:`, na cor destrutiva.
- Botões com rótulo em colchetes (`[ salvar ]`, `[ cancelar ]`), consistentes com `[n]ext`/`[p]rev` da change 03.
- Toasts do sonner como linhas de saída (`✓ …` / `✗ …`), quadrados, monoespaçados, sem ícone.
- Diálogos com barra de título em régua (`── editar candidatura ─────`) e `esc` anunciado como forma de fechar.
- Confirmação destrutiva ecoando o comando equivalente (`rm -rf applications/<pasta>`) com `[y/N]`, preservando a confirmação forte por digitação que já existe.

## Capabilities

### New Capabilities
- `admin-forms-feedback`: como entrada, validação, confirmação e retorno de ação se apresentam no backoffice.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/components/ui/{button,input,select,textarea,label,dialog,alert-dialog,sheet,sonner}.tsx`.
- `src/components/admin/{application-form,project-form,generator-form}.tsx`, `src/components/admin/application-detail/*` (diálogos de estágio, evento, campos-chave), `delete-*-button.tsx`.
- Depende das changes 01 e 02; independente da 03.
