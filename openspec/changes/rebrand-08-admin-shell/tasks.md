## 1. Pré-condições

- [x] 1.1 Rodar `scripts/a11y-admin-axe.mjs` e `scripts/smoke-admin-write.mjs` na estrutura atual e guardar o resultado como base

## 2. Tema

- [x] 2.1 Ligar o vocabulário de tokens do backoffice aos tokens dos três temas, sem cor literal; teste de contraste dos pares
- [x] 2.2 Aplicar antes da primeira pintura e trocar no menu da conta; testes com preferência do site já salva

## 3. Idioma

- [x] 3.1 Resolver o idioma no servidor (preferência do backoffice, senão a do site, senão o navegador) e o `lang` do documento; testes de cada origem
- [x] 3.2 Chave `admin` nos dois dicionários com a estrutura e o login; `pnpm lint` cobra a paridade
- [x] 3.3 Formatação por idioma com fuso configurável, sem divergência entre servidor e navegador; testes dos dois idiomas e de data de calendário contra instante
- [x] 3.4 Reescrever as regras A4 e A5 do `AGENTS.md` do backoffice; verificar pela leitura

## 4. Estrutura

- [x] 4.1 Menu em grupos, recolhível, com dica e item atual; barra inferior no celular; verificar nos três temas, 390, 1024 e 1440 px e com teclado (o leitor de tela foi adiado em 2026-11-26 para a 3.6 de `rebrand-12-cutover`)
- [x] 4.2 Busca com páginas, candidaturas e ações, sem expor dado no HTML inicial; testes de permissão e de teclado
- [x] 4.3 "Criar" e menu da conta; teste de teclado
- [x] 4.4 Login novo, com erro genérico e limite por IP intactos; testes existentes passam

## 5. Aposentar

- [x] 5.1 Remover barra de status, árvore e `cd ..` do backoffice, e as regras do `AGENTS.md` que os descrevem; `pnpm exec knip` sem novos órfãos
- [x] 5.2 Rodar de novo os scripts de 1.1, adaptados; nenhuma regressão

## 6. Fechamento

- [x] 6.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
