## Context

Ver proposal.md e o ADR 0004. O site é self-hosted, com uma única pessoa usuária, sem SDK do Google, CSP com `form-action 'self'` e regra de não ter middleware em `/admin`.

## Goals / Non-Goals

**Goals:** ver e marcar com segurança; degradar bem quando o Google falha; não guardar agenda alheia.

**Non-Goals:** webhooks, várias contas, edição de compromissos pessoais, sincronização em segundo plano.

## Decisions

- **Cliente HTTP próprio, sem SDK.** São cinco chamadas; o SDK traria dependência grande ao servidor. Alternativa descartada: `googleapis`.
- **OAuth com PKCE e `state` ligado à sessão**, iniciado por Server Action e concluído em rota que exige sessão. O redirecionamento é navegação, então não esbarra em `form-action`.
- **Escopos mínimos:** leitura de calendários e eventos, e escrita de eventos. A restrição a "Entrevistas" é do servidor, porque o Google não oferece escopo por calendário.
- **Token cifrado com chave do ambiente**, separada do `AUTH_SECRET`, para poder ser trocada sozinha. Trocar a chave exige reconectar.
- **Conciliação na leitura**, com a marca de versão do compromisso para não reescrever à toa.
- **Pendência em vez de transação:** marcar grava primeiro e tenta o Google depois; a falha vira pendência visível. Uma transação distribuída com o Google não existe.

## Risks / Trade-offs

- [App sem verificação mostra aviso] → Só Marco vê, uma vez. Documentado.
- [Cota ou lentidão do Google] → Tempo limite curto, leitura só da semana pedida, mensagem com "tentar de novo".
- [Token roubado do banco] → Cifrado; revogação pelo próprio Google.

## Migration Plan

Migração aditiva. Sem as variáveis de ambiente, a integração fica desligada e nada muda. Volta: remover as variáveis.
