# Verificações de ponta a ponta

O que `scripts/e2e-site.mjs` precisa cobrir ao fim do rebranding. Cada change `rebrand-*` acrescenta as suas.

**Trilho e tags**
1. No início nenhuma tag está descoberta.
2. Ao entrar em "Sobre mim", a tag aparece na seção.
3. Na seção seguinte, a tag anterior foi para o trilho.
4. O lado da tag alterna.
5. Rolar para cima não desfaz.
6. No fim da página, as oito estão no trilho.
7. Depois do fim, voltar a uma seção mantém as oito.
8. Um item do trilho leva à sua seção.
9. O trilho persiste nas páginas internas.
10. "Mostrar todas" revela o trilho.
11. Com movimento reduzido, o trilho funciona sem voo.
12. Sem WebGL, a página e o trilho funcionam.

**Páginas**

13. A experiência abre em janela.
14. As setas trocam de experiência na janela.
15. `Esc` fecha a janela.
16. A busca por tecnologia filtra os projetos.
17. O detalhe do projeto abre.
18. A galeria abre ampliada.
19. Voltar à home restaura a rolagem.
20. `⌘K` abre a busca.
21. O tema troca pela busca.
22. O idioma troca.
23. A home em inglês não tem sobra de português.
24. O formulário valida.
25. O formulário confirma o envio.
26. A assistente responde.

**Backoffice**

27. Mudar o estágio no dossiê.
28. Arrastar no quadro.
29. Criar compromisso.
30. Limite de três casos na home.
31. Vaga promovida vira candidatura.

**Gerais**

32. Nenhum erro no console.
33. Rolagem contínua da home acima de 45 quadros por segundo.

**Temas**

34. O tema entra antes da primeira pintura: primeira visita, preferência salva, valor inválido e armazenamento bloqueado.
35. Trocar a paleta ou a fonte da Versão CLI não altera o tema do site.
36. A Versão CLI não baixa as fontes do site.

**Estrutura do site**

49. Marca, páginas, busca, idioma, tema, Versão CLI e contato no topo (páginas no menu da base abaixo de 1.180 px, entalhe a partir de 1.280 px), sem rolagem horizontal, nos três temas.
50. A página atual aparece como atual, também na árvore de acessibilidade.
51. Tab percorre o topo na ordem em que se vê, com o foco à vista e sem rolar a página; o skip link leva ao conteúdo; o menu da base abre, fecha com `Esc` e devolve o foco.
52. Com movimento reduzido nada anima no topo, na busca nem na troca de página.
53. Sem JavaScript, as páginas, o idioma e a Versão CLI são links que funcionam, e o que não responderia não aparece.
54. No toque, todo alvo do topo, do menu e do rodapé tem 44 px, e nenhum invade outro.
55. Todo texto do topo, do menu, da busca, do rodapé e da abertura atinge 4.5:1 contra os pixels atrás dele, e o axe não acha violação, nos três temas.
56. A busca só é baixada ao abrir; acha por tecnologia, sem acento e em maiúsculas; funciona só com o teclado; sem resultado, leva a frase à assistente fora do endereço; escolher onde já se está leva ao topo da página, ou à seção.
57. O idioma leva à página equivalente, com o filtro, vale na próxima visita e não altera a paleta nem a fonte da Versão CLI.
58. Ao trocar de página o foco vai ao título, ou à seção pedida, com uma transição por troca; uma carga não anima; sem suporte a transições tudo funciona. Um link abre a página no topo, com o título à vista, por pouco que a anterior estivesse rolada; voltar e avançar pelo navegador trazem cada uma onde estava; um link para onde já se está leva ao topo dela, ou à seção, outra vez.
59. Voltar à home restaura a rolagem pelo navegador, pela marca, pelo menu da base e pela Versão CLI.
66. `/career#<slug>` para com a experiência à vista, abaixo do topo e da barra da página, na carga e ao trocar de âncora.

**Versão CLI**

60. Em `/[lang]/terminal`, com endereço canônico e hreflang próprios, indexável e fora do sitemap; a home não exibe o terminal; idioma desconhecido responde 404.
61. `/[lang]?cmd=…` leva à Versão CLI com o mesmo comando; entrada inválida não executa nada.
62. Executar, navegar e voltar reconstrói a tela e o histórico.
63. Sem JavaScript, os links estão visíveis e nada os cobre.
64. axe sem violação nas paletas `soft` e `classic`.
65. Ida e volta pelo topo, pela busca e pelo rodapé chega à página em que o visitante estava; trocar de idioma lá muda o idioma da volta.

**Referência do holograma** (`--holo`, com `HOLO_REFERENCE=1 pnpm build`)

37. Cada estado responde em até 100 ms e se distingue dos outros sem a cor do traço.
38. Com movimento reduzido nada anima, e os estados continuam distinguíveis.
39. Card parado não tem transform; a tela projetada só se move com o ponteiro ou o foco.
40. Janela, abas e chave por teclado; uma janela mais alta que a tela rola pelo teclado; todo foco é visível.
41. Trocar o tema muda tudo sem recarregar e não altera a Versão CLI; duas trocas seguidas não deixam erro; trocar de idioma mantém o tema.
42. Sem JavaScript, o tema segue o sistema e os controles têm contorno.
43. Fontes atrasadas: texto legível e CLS 0 na troca.
44. Cem molduras sem tarefa longa, e nada recalculado em repouso.
45. As retas são nítidas em 1x e 2x.
46. Sem rolagem horizontal em 390 e 1.440 px, alvos de 44 px no toque e axe sem violação, nos três temas.
47. Todo holograma responde ao ponteiro, inclusive o campo com erro, e o primário selecionado se distingue do repouso.
48. Todo texto atinge 4.5:1 e todo ícone 3:1 contra os pixels que estão atrás, na página, no card com a luz e na janela, nos três temas.
