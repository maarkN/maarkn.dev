# Fundamentos

## Princípio

**Só o que é interativo é holograma; conteúdo é sólido.** Moldura, feixe e varredura aparecem em botão, link, card clicável e tag. Texto, número e rótulo nunca ganham moldura. É assim que uma pessoa leiga aprende onde clicar.

Consequência prática: um elemento com moldura que não responde ao clique é defeito, e um elemento clicável sem tratamento de holograma também. Link dentro de texto corrido usa o **feixe** (sublinhado que engrossa no hover), não a moldura.

## Temas

Três temas valem para site e backoffice. A Versão CLI mantém as paletas `soft` e `classic` e as duas fontes dela; as preferências são guardadas em separado e uma não altera a outra.

Primeira visita: segue a preferência do sistema (claro ou escuro). O tema é aplicado antes da primeira pintura, sem piscar.

| Token | `dusk` (escuro suave) | `light` (claro suave) | `dracula` | Uso |
|---|---|---|---|---|
| `--bg` | `#27303b` | `#dfe4ee` | `#282a36` | Fundo |
| `--bg-2` | `#2e3946` | `#e8ecf4` | `#303341` | Superfície |
| `--bg-3` | `#384554` | `#f3f5fa` | `#44475a` | Superfície em foco |
| `--sunk` | `#222a34` | `#d5dbe8` | `#21222c` | Rebaixado |
| `--ink` | `#e8eef4` | `#282e45` | `#f8f8f2` | Texto |
| `--ink-2` | `#b3c0ce` | `#4c5573` | `#c6c9dd` | Texto de apoio |
| `--ink-3` | `#a0afc0` | `#535c7b` | `#a8b1d4` | Rótulo |
| `--beam` | `#8ed6f0` | `#6238d6` | `#bd93f9` | Feixe: tudo que é clicável |
| `--beam-2` | `#bab6ff` | `#08688a` | `#ff79c6` | Segunda frequência |
| `--beam-3` | `#ffcfa8` | `#a8306a` | `#8be9fd` | Especular: pulso, foco, destaque raro |
| `--on-beam` | `#17222c` | `#ffffff` | `#21222c` | Texto sobre o feixe |
| `--ok` | `#93dcae` | `#186b42` | `#50fa7b` | Estado bom |
| `--warn` | `#f2d08d` | `#7f5200` | `#f1fa8c` | Atenção |
| `--bad` | `#f5a3a0` | `#a92b37` | `#ff7b7b` | Erro |
| `--plate` | `#1f2731` | `#2d3350` | `#1e1f29` | Placa do ícone e dica |
| `--c1` / `--c2` | `#3f9fc8` / `#c97a3f` | `#6238d6` / `#b83a72` | `#9d6ff0` / `#e0589f` | Séries de gráfico |

`--c1` e `--c2` são validadas para daltonismo, luminosidade e contraste contra `--bg-2`. Trocar uma exige validar o par de novo.

Contraste mínimo: 4.5:1 para texto sobre a superfície em que ele aparece, 3:1 para borda de controle e para texto a partir de 18 px em negrito. Sobre `--bg-3`, `--ink-3`, `--beam`, `--beam-2` e `--bad` ficam abaixo de 4.5:1 em ao menos um tema: ali servem só para texto a partir de 18 px em negrito, ícone e borda. `scripts/check-contrast.ts` mede os pares.

## Tipografia

| Papel | Família | Onde |
|---|---|---|
| Títulos | Hubot Sans, largura 104 a 112%, peso 560 | `h1` a `h3` |
| Texto | Mona Sans | Corpo, botões, formulários |
| Números grandes | Mona Sans, peso 640 | Métricas: o zero da Hubot Sans é cortado |
| Rótulos | Cascadia Code | Tags, trilho, datas, dados tabulares |

Só o subconjunto latino (cobre pt-BR). Rótulo em caixa-alta espaçada não é usado.

## Movimento

- Curvas: entrada `cubic-bezier(.2,.8,.2,1)`, ida e volta `cubic-bezier(.65,0,.35,1)`.
- Entrada por rolagem acontece uma vez por elemento.
- Troca de rota e de tema usam View Transitions; sem suporte, a troca é seca.
- Todo retorno de interação é visível em até 100 ms: hover acende, clique pulsa a partir do ponto tocado, foco troca a cor do traço para `--beam-3`.
- Com movimento reduzido nada anima, e o último quadro precisa ser legível.

## Acessibilidade

WCAG 2.1 AA. Alvos de toque de 44 px no celular, foco sempre visível, um `h1` por página, ordem de tabulação igual à visual. Diálogo prende o foco, fecha com `Esc` e devolve o foco. Decoração (HUD, projeção, estilhaços, glifos) é `aria-hidden`.
