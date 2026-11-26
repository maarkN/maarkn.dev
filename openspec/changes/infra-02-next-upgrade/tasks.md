## 1. Pré-condições

- [ ] 1.1 Reproduzir na 16.2.4, nos dois idiomas, com o caso de ponta a ponta novo; ele falha
- [ ] 1.2 Rodar o mesmo caso nas versões 16 estáveis mais novas, em uma cópia; registrar no PR a primeira que passa. Se nenhuma passar, parar aqui e levar a decisão a Marco
- [ ] 1.3 Ler o guia de atualização em `node_modules/next/dist/docs/` da versão escolhida; listar no PR o que afeta o projeto

## 2. Atualização

- [ ] 2.1 `next` e `eslint-config-next` na mesma versão exata, com o lockfile; `pnpm install --frozen-lockfile` passa
- [ ] 2.2 Ajustar o que o guia pedir, sem recurso novo; testes existentes passam sem serem afrouxados

## 3. Verificação

- [ ] 3.1 Ponta a ponta completo em 390 e 1440 px, com teclado e com movimento reduzido, e `?cmd=` depois de carga direta; 0 falhas
- [ ] 3.2 Comparar HTML público, JavaScript da home e tempo de build com a 16.2.4; registrar, dentro do orçamento
- [ ] 3.3 Backoffice: login, uma Server Action e o MCP por HTTP, contra o banco local; registrar

## 4. Fechamento

- [ ] 4.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
