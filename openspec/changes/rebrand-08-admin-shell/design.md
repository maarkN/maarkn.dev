## Context

Ver proposal.md e `docs/design/backoffice.md`. São cerca de 430 textos fixos em 82 arquivos; `/admin` não tem prefixo de idioma nem middleware; `format.ts` fixa `pt-BR` e São Paulo para evitar divergência de hidratação.

## Goals / Non-Goals

**Goals:** estrutura, tema e idioma prontos para `rebrand-09`, `rebrand-10` e `rebrand-11` traduzirem e redesenharem cada tela uma única vez.

**Non-Goals:** traduzir telas que serão reescritas em seguida.

## Decisions

- **Idioma por cookie, sem prefixo.** Mudar endereços do backoffice quebraria atalhos e não traz benefício para uma área não indexada. Cookie próprio, com queda para o `locale` do site.
- **Dicionário do backoffice carregado só em `/admin`**, para não pesar no site.
- **Idioma e fuso vão do servidor para o navegador como dado**, e os formatadores os recebem. Mantém a garantia atual de não divergir.
- **Tela ainda não traduzida aparece em português**, com o idioma marcado no trecho, até a change dela.
- **As primitivas shadcn ficam**, revestidas pelos tokens e pela moldura; trocá-las seria refazer acessibilidade pronta.

Aprovadas em 2026-11-26:

- **Primeiro idioma:** a preferência guardada pelo backoffice, senão a escolhida no site, senão a do navegador. Quem só abriu `/en`, sem escolher, não deixou preferência.
- **A troca de idioma recarrega o documento.** No Next 16.2.4, um refresh do router às vezes se perde em telas com lista em streaming, e isso já acontecia antes desta change.
- **Fuso num cartão de Configurações**, com cookie próprio do backoffice. Nenhum artefato dizia onde configurar.
- **`--on-plate` é a cor do texto da dica**, nos três temas. `fundamentos.md` deixava a escolha para a primeira dica.
- **O que ainda não existe aparece como "em breve"**, sem link nem foco: Agenda, Experiências, Notas e criar Compromisso, até as changes deles.
- **Sem JavaScript, sair continua possível**, por um formulário que só aparece nesse caso.
- **O leitor de tela foi adiado** para `rebrand-12-cutover` (3.6). Teclado, temas e larguras foram verificados por teste.

## Risks / Trade-offs

- [Mistura de idiomas na branch] → Só na branch de integração; `rebrand-12-cutover` verifica que não sobrou texto fixo.
- [`pnpm exec knip` não roda: knip não é dependência] → Verificado com `pnpm dlx knip@5`, comparado à base.
- [Defeitos anteriores, não corrigidos aqui: a coluna de ações de `/admin/api-keys` corta o primeiro botão, e as primitivas shadcn usam variantes `data-*` que o Radix não emite, então a aba ativa do dossiê não é marcada] → Tarefas 4.3 de `rebrand-09-admin-lists-and-forms` e 2.5 de `rebrand-11-admin-screens`.
