## Context

Ver proposal.md e `docs/design/site.md`. As páginas internas mantêm a aparência de terminal até as changes delas, e a home fica só com a abertura até `rebrand-03-home`.

## Goals / Non-Goals

**Goals:** estrutura comum do site; Versão CLI em endereço próprio, com os links antigos funcionando.

**Non-Goals:** redesenhar páginas internas, seções da home, painel da assistente.

## Decisions

Aprovadas em 2026-11-25.

- **A troca de idioma no topo e na busca recarrega o documento.** Pelo router, o `<html>` é recriado e a paleta e a fonte da Versão CLI voltam ao padrão, inclusive no armazenamento.
- **As duas estruturas convivem nas páginas internas** até `rebrand-06-career-and-pages`: duas barras, dois controles de idioma e dois rodapés.
- **"Resumo em 1 min" fica fora do topo** até a página existir (tarefa 3.3 de `rebrand-06-career-and-pages`). Páginas e seções do topo, do menu e da busca vêm de `src/lib/site/pages.ts`.
- **A volta ao site na Versão CLI fica logo depois do título da barra** (delta de `terminal-shell`).
- **Os redirecionamentos de `?cmd=` são 307**, para que voltar à versão anterior não deixe endereço em cache.
- **Perguntar à assistente pela busca leva à Versão CLI**, com a frase em `sessionStorage`: `?cmd=` não aceita `ask` com argumento. `rebrand-03-home` troca o destino pelo painel.
- **O leitor de tela foi adiado** para `rebrand-12-cutover` (3.6). O resto da passagem entre páginas foi conferido por teste e na árvore de acessibilidade.

## Risks / Trade-offs

- [Âncoras antigas na home até `rebrand-03-home`: `#projects` e `#about` não fazem nada, só `#contact` funciona] → Aceito. As três seguem valendo em `/[lang]/terminal`.
- [`terminal-navigation` (retorno das páginas internas, comando de contexto) e `terminal-home` (rotas antigas de chat) ainda citam `?cmd=` na home] → Aceito. Os links vão direto ao endereço novo, e o antigo redireciona.
- [Nas páginas internas, quem escolheu DaddyTimeMono a baixa junto com as fontes do site] → Aceito até `rebrand-05-projects` e `rebrand-06-career-and-pages`.
- [O comando `lang` e a barra das páginas internas ainda voltam a paleta e a fonte ao padrão] → Defeito anterior, presente na `main`. Vai para uma change própria.
- [O Next 16.2.4 guarda a âncora com que o documento foi carregado e a devolve em links para a mesma página] → Defeito anterior, da dependência. Vai para uma change própria.
