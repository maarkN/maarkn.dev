## Context

Os formulários do backoffice usam `useActionState`/`useTransition` com `sonner` para sucesso e erro, e `AlertDialog` com confirmação por digitação para exclusões. O padrão está documentado em `src/app/admin/AGENTS.md` e foi seguido por todas as telas da F1–F2. Ver proposal.md.

## Goals / Non-Goals

**Goals:** entrada e retorno com a voz de um programa de terminal, sem perder acessibilidade nem o padrão de ação já estabelecido.
**Non-Goals:** trocar o mecanismo de Server Actions; transformar edição em comando digitado.

## Decisions

- **Rótulo é texto simples, e isso é deliberado.** A tentação era escrever os campos como flags (`--company-name`). Em formulário denso isso rouba a varredura do olho e, pior, descola o nome acessível do texto visível quando o prefixo é `aria-hidden`. O sotaque de terminal fica onde não custa nada: ajuda em `# comentário`, obrigatoriedade escrita por extenso, erro em `stderr:`.

- **`stderr:` é decorativo; a mensagem é que é anunciada.** O prefixo entra `aria-hidden`; o container de erro mantém `role="alert"` e a associação `aria-describedby` com o campo. Um leitor de tela ouve "e-mail inválido", não "stderr dois pontos e-mail inválido".

- **Botões em colchetes.** `[ salvar ]`, `[ cancelar ]`, `[ excluir ]`. Os colchetes fazem parte do texto do `<button>` — não são pseudo-elemento — porque é assim que ficam selecionáveis e legíveis em alto contraste. Isso os alinha com `[n]ext`/`[p]rev` da change 03 e com `[stage]`: colchete no admin significa "coisa acionável ou estado", consistentemente.

- **Toast é linha de saída.** O `Toaster` do sonner recebe tema quadrado, mono, sem ícone: `✓` em `--green` para sucesso, `✗` em `--destructive` para erro, texto em `--fg`, borda `--line`, canto inferior direito. Sem barra de progresso. O `✓`/`✗` é `aria-hidden`; o sonner já anuncia por região viva.

- **Diálogo com régua de título.** `DialogTitle` vira `── título ──────────` com a régua preenchendo a largura por `::after`, e o botão de fechar vira `[esc]` — que também é literalmente o atalho, já entregue pelo Radix. O `Sheet` do detalhe rápido segue o mesmo tratamento.

- **Confirmação destrutiva ecoa o comando.** O `AlertDialog` de exclusão passa a mostrar a linha `rm -rf applications/<pasta>` seguida de `[y/N]`, mantendo intacta a confirmação forte por digitação do nome que a F1 estabeleceu. O eco é ilustrativo: **não** existe comando de verdade por trás, e o design registra isso para que nenhuma change futura tente "fazer funcionar".
  - `[y/N]` com o `N` maiúsculo é a convenção de shell para padrão negativo, e o padrão do diálogo é de fato cancelar.

- **Upload de imagem** ganha rótulo `attach:` e mostra o nome do arquivo escolhido como saída, em vez do texto nativo do navegador.

## Risks / Trade-offs

- [Colchetes nos botões atrapalharem tradução ou leitura em voz] → fazem parte do texto, então são lidos; medido como aceitável por serem dois caracteres, e o `aria-label` fica disponível se algum botão soar mal.
- [`stderr:` soar hostil para erro de validação comum] → é o sotaque pedido; se incomodar no uso, o prefixo sai sem tocar em estrutura, porque é decorativo.
- [Toast sem ícone perder a distinção sucesso/erro para quem não distingue cor] → o `✓`/`✗` é textual e permanece; cor não é o único canal.
- [O eco `rm -rf` assustar em tela compartilhada] → intencional: a ação é destrutiva mesmo, e a confirmação por digitação continua sendo o freio real.
