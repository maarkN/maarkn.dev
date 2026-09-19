## Context

O site resolve isso com `PageChrome` + `describeRoute` + `StatusBar`, aplicados uma vez no layout do grupo `(pages)`. O admin tem 18 rotas, um menu de 14 entradas (3 ainda não construídas) e nenhum equivalente. Ver proposal.md.

## Goals / Non-Goals

**Goals:** paridade visual com as páginas internas do site; uma fonte única de verdade para caminho, comando e destino do `cd ..`.
**Non-Goals:** prompt interativo ou motor de comandos no admin (decisão do usuário: chrome e saída tabular, não um terminal operável); tocar no conteúdo das telas (change 03).

## Decisions

- **`AdminStatusBar` é componente novo, mas reusa `terminal.module.css`.** A `StatusBar` do site não serve: depende de `useTheme` e renderiza os três toggles, que o admin não pode exibir (o provider gravaria a preferência no `localStorage` compartilhado com o site). Reusar a folha de estilo garante que as duas barras não divirjam em altura, espaçamento e cor.
  - **Acoplamento aceito:** mexer nas classes `bar*` do site passa a afetar o admin. Um teste de snapshot em cada lado torna a quebra visível em vez de silenciosa.
  - A barra do admin troca os três botões por um só: `exit`, que é o logout.

- **`admin-route-chrome.ts` é pura e dirigida por tabela**, espelhando `route-chrome.ts`:

  | rota | caminho | comando |
  |---|---|---|
  | `/admin` | `~/admin` | `ls` |
  | `/admin/applications` | `~/admin/applications` | `ls applications/` |
  | `/admin/applications/board` | `~/admin/applications` | `ls applications/ --group-by=stage` |
  | `/admin/applications/new` | `~/admin/applications/new` | `touch applications/new.md` |
  | `/admin/applications/[id]` | `~/admin/applications/<pasta>` | `cat applications/<pasta>.md` |
  | `/admin/applications/[id]/edit` | `~/admin/applications/<pasta>` | `vim applications/<pasta>.md` |
  | `/admin/jobs` | `~/admin/jobs` | `ls jobs/` |
  | `/admin/contacts` | `~/admin/contacts` | `ls contacts/` |
  | `/admin/projects` | `~/admin/projects` | `ls projects/` |
  | `/admin/generator` | `~/admin/generator` | `ls generations/` |
  | `/admin/generator/[id]` | `~/admin/generator/<id>` | `less generations/<id>.md` |
  | `/admin/api-keys` | `~/admin/api-keys` | `cat authorized_keys` |
  | `/admin/audit` | `~/admin/audit` | `tail -f audit.log` |
  | `/admin/chat` | `~/admin/chat` | `tail chat.log` |
  | `/admin/settings` | `~/admin/settings` | `vim ~/.config/admin.conf` |

  - **O segmento dinâmico é o nome natural, não o id.** `cat applications/<pasta>.md` usa o `folderName` da candidatura (`shopify-senior-backend-ca`), que é a chave natural que já existe no banco e no vault — não o cuid. Como o chrome é client-side e só tem a URL, o `folderName` chega por prop do server component; sem ele, a função cai para o id.
  - Rota desconhecida cai para `~/admin/<resto>` + `ls`, como o site faz.

- **A sidebar vira `tree`, e os ícones ficam.** O `board` passa a aparecer indentado sob `applications/` por conectores `├──`/`└──` — a relação real, que a lista plana de hoje esconde. Os ícones lucide permanecem: o site dispensa ícone porque tem cinco comandos na tela, e o menu do admin tem catorze entradas, onde eles pagam a varredura que custam.
  - **O alinhamento é o que faz ou quebra a ideia:** o ícone ocupa uma caixa de largura fixa entre o conector e o rótulo, para que os catorze rótulos comecem na mesma coluna. Ícone fora da grade monoespaçada destrói a árvore inteira.
  - `size-4` com `stroke-width` 1.5, para aproximar o peso de traço do da fonte, e `currentColor`, para que a cor venha do estado do item em vez de uma classe própria.
  - Conectores são `aria-hidden`; os ícones também, sem `title` — o rótulo é o nome acessível, e um ícone anunciado seria ruído duplicado.
  - Entradas `ready: false` viram `replies/  # em breve` em `--comment`, com o ícone herdando a mesma cor — sem foco, sem tooltip, um componente a menos.

- **`/admin/login` não recebe chrome nenhum** — nem barra, nem árvore, nem `cd ..`: não há sessão, e um menu de navegação numa tela de login é ruído. Em vez disso, uma tela de tty com `maarkn.dev tty1` e os campos rotulados `login:` e `password:`. O `bg-grid` legado da change 14 é removido junto.

- **Idioma:** o admin é só pt-BR e continua assim. O `TerminalLabels` do site vem dos dicionários por causa do `[lang]`; as strings do chrome do admin ficam literais no componente. Os comandos são em inglês, como no site.

## Risks / Trade-offs

- [A árvore com 14 entradas fica alta demais em telas curtas] → agrupar sob `applications/` o que já é subordinado e deixar as três entradas `# em breve` no fim; se ainda passar da dobra, a change 05 avalia colapsar grupos.
- [Ícone e conector juntos carregarem o menu] → o ícone vive só na coluna fixa, sem cor própria e sem fundo; se ainda pesar, o ajuste é baixar o contraste dos conectores, não remover os ícones.
- [Um ícone fora da grade desalinhar a árvore] → caixa de largura fixa e o mesmo `size-4` para todos, verificado com os rótulos medidos contra uma régua vertical.
- [O `folderName` não chega em alguma rota e o breadcrumb mostra um cuid] → a função cai para o id e a tela continua funcionando; o teste cobre os dois caminhos.
