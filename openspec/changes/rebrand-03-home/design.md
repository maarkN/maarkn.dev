## Context

Ver proposal.md, `docs/design/site.md` e `docs/design/projecao.md`. As fontes de dados já existem no servidor; o texto novo vai para os dicionários.

## Goals / Non-Goals

**Goals:** página completa sem JavaScript; interação progressiva; trilho acessível.

**Non-Goals:** partículas e voo (`rebrand-04-projection`), edição de textos pelo backoffice.

## Decisions

- **Servidor renderiza as seções; ilhas pequenas no cliente** para o trilho, as dores, o processo, as tecnologias e o contato. Uma ilha única levaria o texto inteiro para o JavaScript.
- **O trilho é uma lista de âncoras reais**, com a aparência de "não descoberta" só em CSS. A alternativa, esconder do teclado até a descoberta, contraria a spec de acessibilidade.
- **Cada seção declara dois marcadores de posição**, para a projeção e para a tag. A `rebrand-04-projection` só os lê; assim a home fica pronta e testável antes.
- **A assistente reusa o cliente de chat existente**, carregado ao abrir.

## Risks / Trade-offs

- [Layout muda quando a projeção chegar] → Os marcadores já reservam o espaço, então não há salto.
