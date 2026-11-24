## Context

Ver proposal.md e o ADR 0005. O servidor MCP já tem escopo por tool, limite, auditoria e recusa de chave `visibility`. A regra "não existe `create_*`" continua: a chave natural é o `slug`.

## Goals / Non-Goals

**Goals:** nenhum caminho em que um agente publique algo que Marco não viu; publicação reversível.

**Non-Goals:** fluxo de aprovação com várias pessoas, rascunho de carreira ou de notas, agendamento.

## Decisions

- **Revisão = hash do conteúdo proposto mais o hash do projeto publicado.** Um número de versão não detectaria edição feita no backoffice entre a revisão e a publicação.
- **O rascunho guarda o conteúdo completo proposto**, e a comparação é calculada na leitura, para nunca mostrar diferença contra um estado antigo.
- **Escopo separado, sem herança**, em vez de confirmação por texto. Confirmação digitada o próprio agente consegue escrever; posse da chave, não.
- **Estado anterior guardado na publicação**, o bastante para desfazer uma vez. Histórico completo fica para quando houver necessidade.

## Risks / Trade-offs

- [Marco usa a chave de publicar no dia a dia] → A tela de chaves avisa, e a documentação do plugin separa as duas.
- [Injeção em texto de vaga] → O agente que lê vaga usa a chave sem `portfolio:publish`; a skill de publicar não é iniciada pelo modelo.
