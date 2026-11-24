---
status: accepted
---

# O Google Calendar é a fonte dos compromissos; o backoffice só escreve em um calendário

Marco já organiza o dia no Google Calendar, inclusive pelo celular, então uma cópia no banco nasceria desatualizada. Os compromissos são lidos ao vivo, e o backoffice só grava em um calendário dedicado, "Entrevistas". A Entrevista guarda a ligação com o compromisso e se ajusta na próxima leitura: se o horário mudou no Google, ela acompanha; se o compromisso foi apagado lá, ela volta a ficar sem data, e nunca é excluída.

## Considered Options

- **Sincronizar tudo para o banco, com webhook.** Traria o dia inteiro, com dados de terceiros, para um banco que não precisa deles, e um endpoint público a mais.
- **Só mostrar a agenda embutida do Google.** Não liga a entrevista à candidatura nem serve às skills.

## Consequences

- Nenhum participante é adicionado e nenhum convite sai do sistema, para que marcar uma entrevista jamais avise o recrutador sem querer.
- Agentes veem compromissos pessoais apenas como "ocupado".
- O app OAuth fica em produção sem verificação do Google: no modo de teste o acesso expiraria a cada sete dias.
- Uma entrevista só percebe a mudança quando alguém abre a agenda, o dossiê ou consulta pelo MCP.
