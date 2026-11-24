---
status: accepted
---

# Projeção em WebGL puro, com volta para Three.js se não ficar bom

O protótipo desenha a Projeção com Three.js (141 kB gzip) e anima com Motion (47 kB), mas a home tem teto de 60 kB de JavaScript próprio e nota de desempenho mínima de 95, porque o público principal é o recrutador que abre o site uma vez, no celular. Decidimos reescrever o motor em WebGL puro, carregado depois do texto, e animar com CSS e View Transitions.

## Considered Options

- **Three.js carregado sob demanda.** Preserva o código do protótipo, mas não cabe no orçamento, mesmo adiado.
- **Vídeo ou sprites pré-renderizados.** Leves, mas perdem a troca de forma ligada à rolagem, a reação ao ponteiro e a troca de tema.

## Consequences

- O protótipo com Three.js é a referência visual: a comparação é lado a lado, nos três temas.
- Se a versão em WebGL puro não igualar o protótipo, voltamos para Three.js e o orçamento da spec `site-seo-performance` é revisto na mesma change, de forma explícita.
