## Why

Trocar de idioma sem recarregar (comando `lang` ou controle da barra) volta a paleta e a fonte da Versão CLI ao padrão e apaga a escolha guardada. Já acontece em produção.

## What Changes

- A paleta e a fonte escolhidas sobrevivem à troca de idioma, na tela e no armazenamento.
- O valor guardado só muda quando o visitante troca a paleta ou a fonte.

**Fora do escopo:** tema do site, que já resiste; troca de idioma do topo e da busca, que recarrega o documento; qualquer mudança de rota.

## Capabilities

### New Capabilities
- Nenhuma.

### Modified Capabilities
- `theme-palette`: a preferência sobrevive à troca de idioma.

## Impact

- `src/components/theme-provider.tsx` e seus testes; `scripts/e2e-site.mjs`.
- **Branch:** main
- **Depende de:** infra-01-pr-checks
