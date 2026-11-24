## Why

A projeção, a linha-guia e o voo da tag são a assinatura do site novo. São também o maior risco de desempenho, por isso vêm isolados, com medição e um ponto de decisão (ADR 0001).

## What Changes

- Motor de partículas em WebGL puro, carregado depois do texto, que viaja com a rolagem e muda de forma a cada seção.
- Linha-guia, montagem da tag e voo até o trilho; globo com rotas; caos que vira grade.
- Alternativa estática com movimento reduzido, economia de dados ou sem WebGL.
- Estilhaços em parallax e moldura HUD da janela.
- Orçamento de JavaScript da home reafirmado, com o motor incluído.

**Fora do escopo:** projeção no backoffice e formas novas.

## Capabilities

### New Capabilities
- `site-projection`: projeção, linha-guia e voo da tag.

### Modified Capabilities
- `site-seo-performance`: orçamento de JavaScript com o motor.

## Impact

- `src/lib/projection/**`, `src/components/site/stage/**`, dados de continente, `scripts/e2e-site.mjs`.
- **Branch:** feat/rebranding
- **Depende de:** rebrand-03-home
