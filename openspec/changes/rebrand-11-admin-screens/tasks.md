## 1. Pré-condições

- [ ] 1.1 Trazer a `main` com as dependências e aplicar as migrações no banco de desenvolvimento; `pnpm db:seed:demo` sem erro

## 2. Dossiê

- [ ] 2.1 Página e painel a partir da mesma leitura, com as abas de `docs/design/backoffice.md`; 404 real para id inexistente; testes
- [ ] 2.2 Editar empresa, contexto e motivo, com aviso de que o texto da empresa vale para outras candidaturas; testes
- [ ] 2.3 Entrevistas previstas e marcadas, reordenar, marcar, remarcar e pendência do Google; testes
- [ ] 2.4 Anexar, ver e consultar o histórico do documento enviado; testes de arquivo inválido e acima do limite
- [ ] 2.5 Aba ativa do dossiê marcada, também para leitor de tela; corrigir as variantes `data-*` das primitivas que o Radix não emite; teste

## 3. Agenda

- [ ] 3.1 Semana com calendários escolhidos, dia inteiro, sobreposição, hora atual e fuso; testes de layout com fixtures
- [ ] 3.2 Marcar, mover e remover só em "Entrevistas"; demais calendários só leitura; testes
- [ ] 3.3 Desconectado, acesso revogado e Google fora do ar; testes

## 4. Projetos

- [ ] 4.1 Editor em PT e EN com prévia ao vivo pelos mesmos componentes do site; teste de que prévia e site têm o mesmo texto
- [ ] 4.2 Galeria com envio, ordem, legendas e remoção; testes
- [ ] 4.3 Texto do caso e escolha dos três, com recusa do quarto e do caso sem texto; testes
- [ ] 4.4 Revisão do rascunho com comparação por idioma, publicar, descartar e desfazer, e os dois conflitos; testes

## 5. Fechamento

- [ ] 5.1 Percorrer todas as telas nos três temas, 390 e 1440 px, teclado, PT e EN; `scripts/a11y-admin-axe.mjs` e `scripts/smoke-admin-write.mjs` ampliados passam
- [ ] 5.2 Atualizar o inventário do `AGENTS.md` do backoffice; verificar pela leitura
- [ ] 5.3 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
