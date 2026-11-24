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

**Referência do holograma** (`--holo`, com `HOLO_REFERENCE=1 pnpm build`)

37. Cada estado responde em até 100 ms e se distingue dos outros sem a cor do traço.
38. Com movimento reduzido nada anima, e os estados continuam distinguíveis.
39. Card parado não tem transform; a tela projetada só se move com o ponteiro ou o foco.
40. Janela, abas e chave por teclado; todo foco é visível.
41. Trocar o tema muda tudo sem recarregar e não altera a Versão CLI; trocar de idioma mantém o tema.
42. Sem JavaScript, o tema segue o sistema e os controles têm contorno.
43. Fontes atrasadas: texto legível e CLS 0 na troca.
44. Cem molduras sem tarefa longa, e nada recalculado em repouso.
45. As retas são nítidas em 1x e 2x.
46. Sem rolagem horizontal em 390 e 1.440 px, alvos de 44 px no toque e axe sem violação, nos três temas.
