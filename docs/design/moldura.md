# Moldura do holograma

Um retângulo com três cantos cortados "a tesoura, sem medir muito": o canto inferior esquerdo fica inteiro e os outros três têm cortes diferentes entre si. O lado direito nunca é simétrico.

## Geometria

Existe **um** polígono. As linhas externas são trechos dele; as internas são os mesmos trechos do polígono recuado, portanto paralelas por construção. Linha interna desenhada à parte foi a causa do desalinhamento da primeira versão.

| Canto | Corte (largura × altura), em unidades de `c` |
|---|---|
| Superior esquerdo | 1,00 × 1,28 |
| Superior direito | 1,42 × 0,86 |
| Inferior direito | 0,70 × 1,08 |
| Inferior esquerdo | sem corte |

- **Botões, links, tags:** `c` = 19% da altura, entre 6 e 15 px. Recuo da linha interna: 9% da altura, entre 3,5 e 7 px.
- **Cards, janelas, telas:** `c` = 20 px por padrão; recuo de 6 px.
- **Variação:** cada peça recebe ±16% nos cortes (±10% nos cards), derivada do próprio texto. O mesmo botão sai sempre igual.
- **Altura dos botões:** 34, 44 e 50 px.

## Traços

Três pares de linhas quebradas: topo com o corte direito; corte esquerdo com lado e base; lado direito com o corte de baixo. Entre eles há respiros. **Pontes** preenchem os respiros no hover e no foco, fechando o contorno.

- Espessura de 1,5 px, com o contorno recuado em meia espessura, para a linha cair dentro do pixel.
- Cada traço tem um halo por baixo (3,6 px, opacidade de 16%; 10% no claro), que suaviza a diagonal em tela 1x.
- Elemento parado não tem `transform` 3D: em repouso, a perspectiva vira textura e borra as linhas. A inclinação só existe durante o hover.
- Posição de tag parada é arredondada para pixel inteiro.

## Estados

| Estado | Botão e link | Card |
|---|---|---|
| Repouso | Moldura quebrada, preenchimento com linhas de varredura | Idem |
| Hover | Pontes fecham, luz segue o ponteiro, feixe desce uma vez, texto abre em duas frequências | Inclina até 5°, camadas internas se separam, cone de luz embaixo |
| Pressionado | Traço em `--beam-3`, recua 2,5% | Recua 1% |
| Foco por teclado | Traço em `--beam-3` | Idem |
| Desligado | 45% de opacidade, sem resposta | não se aplica |
| Selecionado | Pontes fechadas e preenchimento mais denso | não se aplica |

**Tela projetada** (card com imagem): a imagem não dá zoom e é recortada em paralelo à moldura. A luz que desce e a borda interna em movimento só existem enquanto o ponteiro está em cima.
