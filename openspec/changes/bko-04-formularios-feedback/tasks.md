## 1. Entrada

- [ ] 1.1 Ajuda como `# comentário` e obrigatoriedade escrita nos três formulários grandes; verificar que o nome acessível de cada campo continua igual ao rótulo visível (axe, `/admin/applications/new`)
- [ ] 1.2 Erro como `stderr:` com prefixo `aria-hidden`, mantendo `role="alert"` e `aria-describedby`; verificar com leitor de tela que só a mensagem é anunciada
- [ ] 1.3 `attach:` no upload de imagem do formulário de projeto, mostrando o arquivo escolhido; verificar upload real ponta a ponta

## 2. Ações

- [ ] 2.1 Rótulos em colchetes nos botões de `ui/button.tsx` e nas telas; verificar que nenhum botão ficou com colchete duplicado ou sem
- [ ] 2.2 Tema do `Toaster` como linha de saída; verificar sucesso e erro numa ação real (criar candidatura, depois forçar falha) e confirmar anúncio por região viva
- [ ] 2.3 Régua de título e `[esc]` em `Dialog`, `AlertDialog` e `Sheet`; verificar que `Esc` fecha e que o foco volta ao gatilho

## 3. Destrutivo

- [ ] 3.1 Eco `rm -rf …` + `[y/N]` nos diálogos de exclusão, preservando a confirmação por digitação; verificar que o botão só habilita com o nome correto e que o padrão do diálogo é cancelar
- [ ] 3.2 Confirmar que nenhuma Server Action foi tocada: `git diff --stat src/app/_actions src/app/admin/**/actions.ts` vazio nesta change

## 4. Verificação

- [ ] 4.1 Smoke de escrita: criar/editar/excluir candidatura, projeto e contato; mover estágio no board; gerar CV — cada um com toast correto
- [ ] 4.2 `pnpm lint && env -u DATABASE_URL pnpm build && pnpm test` verdes
