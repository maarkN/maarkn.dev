## Why

O site novo precisa de uma base antes de qualquer tela: três temas, tipografia, e a moldura que distingue o que é interativo. Sem ela, cada tela reinventaria cor, botão e foco.

## What Changes

- Três temas (`dusk`, `light`, `dracula`) para o site, seguindo o sistema na primeira visita, aplicados antes da primeira pintura.
- Preferência do site separada da preferência da Versão CLI, que continua com `soft`, `classic` e as duas fontes.
- Fontes do site (Hubot Sans, Mona Sans, Cascadia Code) hospedadas aqui, só subconjunto latino, sem deslocar o texto quando chegam tarde.
- Moldura calculada a partir de um polígono e os primitivos: botão, link, card, tag, tela projetada, janela, campo, chave, abas e aviso. A janela tem a moldura; o aviso é sólido, com a silhueta dela, e só o botão dele é holograma.
- Página de referência interna com os primitivos nos três temas, fora de produção.

**Fora do escopo:** qualquer tela pública ou do backoffice.

## Capabilities

### New Capabilities
- `site-theme`: temas, preferência e tipografia do site.
- `hologram-ui`: aparência e comportamento dos elementos interativos.

### Modified Capabilities
- `theme-palette`: passa a valer só para a Versão CLI.
- `site-seo-performance`: regra de fontes por experiência.

## Impact

- `src/app/globals.css`, `src/app/fonts.ts`, provedor de tema, `src/components/holo/**`, `src/lib/frame/**`.
- **Branch:** feat/rebranding
- **Depende de:** infra-01-pr-checks
