## 1. Pré-condições

- [ ] 1.1 Confirmar que as tools usadas por cada skill existem e respondem (chamada real com chave de teste)
- [ ] 1.2 Ler o padrão de nomes das pastas do Obsidian em `folderName` existentes (só o formato) e escrever a regra; validar com Marco no PR

## 2. Tools

- [ ] 2.1 Traduzir para o inglês título e descrição de todas as tools, sem mudar nome, entrada ou saída; teste que compara os contratos antes e depois
- [ ] 2.2 Modelos de chave na criação: leitura, dia a dia e publicação; teste de que só o último inclui `portfolio:publish`

## 3. Plugin

- [ ] 3.1 Estrutura do plugin e do marketplace, com a chave vinda do ambiente; verificar instalando em um diretório limpo
- [ ] 3.2 Escrever cada skill com gatilho, passos, confirmação e o que responder quando falta dado; verificar cada uma com uma conversa real contra o banco de desenvolvimento
- [ ] 3.3 `register-application`: deduplica antes de criar, monta o `folderName` e mostra o que vai gravar; verificar com empresa nova, empresa existente e vaga via intermediária
- [ ] 3.4 `review-and-publish`: só por chamada explícita, mostra a comparação completa e publica a revisão mostrada; verificar com rascunho alterado no meio
- [ ] 3.5 Teste automatizado: todo nome de tool citado nas skills existe no registro, e nenhuma skill cita `revert_sync_run`

## 4. Fechamento

- [ ] 4.1 Documentar instalação e as duas chaves nos READMEs e no `AGENTS.md`; verificar seguindo o texto do zero
- [ ] 4.2 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
