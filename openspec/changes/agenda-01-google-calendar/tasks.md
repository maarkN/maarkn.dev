## 1. Pré-condições

- [ ] 1.1 Escrever em `DEPLOY.md` o passo a passo do Google Cloud (projeto, tela de consentimento em produção, escopos, URL de retorno); verificar com Marco conectando a própria conta
- [ ] 1.2 Documentar em `.env.example` o id e o segredo do cliente e a chave de cifra; o app sobe sem eles, com a integração desligada

## 2. Conexão

- [ ] 2.1 Fluxo OAuth com `state` e PKCE, sob sessão do backoffice; testes de `state` inválido, retorno sem sessão e recusa de consentimento
- [ ] 2.2 Guardar o token de atualização cifrado (AES-256-GCM, chave do ambiente); teste de que o valor em claro não aparece no banco, em log nem na auditoria
- [ ] 2.3 Desconectar revoga no Google e apaga o token; acesso revogado por fora leva a "reconectar"; testes

## 3. Leitura e escrita

- [ ] 3.1 Cliente mínimo da API (sem SDK) com tempo limite, repetição com recuo e tipos validados; testes com respostas gravadas, incluindo 401, 403, 429 e 5xx
- [ ] 3.2 Criar e reencontrar o calendário "Entrevistas"; recusar escrita em qualquer outro; teste
- [ ] 3.3 Ler a semana dos calendários escolhidos, com fuso, dia inteiro e recorrência expandida; testes

## 4. Entrevistas

- [ ] 4.1 Marcar cria o compromisso com empresa, vaga, etapa e link do dossiê, sem participantes e sem notificar; teste que inspeciona a requisição
- [ ] 4.2 Conciliar na leitura (horário mudou, compromisso apagado, compromisso restaurado); testes de cada caso
- [ ] 4.3 Falha do Google não impede marcar: a entrevista fica marcada e a pendência é visível e repetível; teste

## 5. MCP

- [ ] 5.1 Escopos `calendar:read` e `calendar:write`, fora de todas as chaves existentes; teste
- [ ] 5.2 `list_calendar`, `schedule_interview` e `unschedule_interview`, com compromisso pessoal reduzido a "ocupado"; testes de redação e de escopo
- [ ] 5.3 Texto de compromisso devolvido como não confiável; teste

## 6. Fechamento

- [ ] 6.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
