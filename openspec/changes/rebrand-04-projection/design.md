## Context

Ver proposal.md, ADR 0001 e `docs/design/projecao.md`. Na referência visual, Three.js serve só para pontos, um grupo e uma câmera: cerca de 141 kB para um programa de sombreamento.

## Goals / Non-Goals

**Goals:** igualar a referência visual dentro do orçamento; degradar sem perder função.

**Non-Goals:** motor 3D genérico; sombras, luzes ou modelos.

## Decisions

- **WebGL puro com um programa**, atributos de origem e destino por ponto e mistura no sombreador. As formas são calculadas sob demanda e guardadas.
- **Um laço de quadros** para projeção, linha-guia, tags e parallax, lendo os marcadores só da seção atual e das vizinhas.
- **Movimento da tag por `transform`, parada em pixel inteiro** (`docs/design/moldura.md`).
- **Alternativa estática gerada do mesmo código**, em tempo de construção, para não divergir.
- **Sem dependência de movimento:** curvas próprias, poucas linhas.

## Risks / Trade-offs

- [Não igualar a referência visual] → Ponto de decisão 4.2; volta a Three.js prevista no ADR.
- [Celular fraco] → Menos pontos e queda para a imagem estática quando os primeiros quadros forem lentos.
- [Perda de contexto gráfico] → Recuperar uma vez; na segunda, alternativa estática.

## Open Questions

- Qual aparelho intermediário será a referência da medição; não muda a abordagem.
