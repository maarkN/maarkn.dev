## 1. Pré-condições

- [x] 1.1 Confirmar que os 19 slugs de `lib/projects.ts` têm texto nos dois dicionários (`pnpm lint` e um teste que compara os conjuntos)

## 2. Esquema

- [ ] 2.1 Acrescentar ao `Project` os textos em PT e EN, o texto de caso em PT e EN e a posição do caso; criar a galeria com ordem, legendas e caminho; migração aditiva aplicada em banco vazio e em cópia de produção
- [x] 2.2 Garantir no banco no máximo três casos, sem posição repetida; verificar com teste que tenta o quarto

## 3. Leitura

- [x] 3.1 `projects-repo` devolve o projeto no idioma pedido, com a ordem banco, outro idioma do banco, semente; teste unitário para cada queda
- [x] 3.2 Páginas, metadata, sitemap, OG e comandos da Versão CLI leem do repositório; verificar que o HTML de `/en/projects/<slug>` é textualmente igual ao de antes (comparação automatizada dos 19)
- [x] 3.3 Sem `DATABASE_URL`, build e páginas continuam com o texto da semente; verificar com `pnpm build && pnpm start` sem a variável

## 4. Migração de conteúdo

- [x] 4.1 Script idempotente que copia os textos dos dicionários para linhas sem texto; rodar duas vezes e conferir que a segunda não altera nada
- [x] 4.2 `db:sync-projects` cria o que falta e atualiza só campos não textuais; teste que edita um texto no banco e roda o script
- [x] 4.3 Semear o texto dos casos Dermagenix, DoctorX (dizendo "beta fechado") e SenseVox; verificar no banco de desenvolvimento
- [x] 4.4 Descrever a ordem de deploy em `DEPLOY.md` e a nova regra nos READMEs e no `AGENTS.md`

## 5. Fechamento

- [x] 5.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
