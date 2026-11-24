---
status: accepted
---

# Um agente só publica a revisão exata que Marco viu

A regra do servidor MCP era que agente nenhum publica: promover conteúdo é ação humana no backoffice. Queremos editar projetos conversando com o agente, então ele passa a criar rascunhos, e uma skill chamada pelo nome mostra o rascunho e o publica. O risco é que o mesmo agente lê texto não confiável, como descrições de vaga, que podem tentar induzi-lo a publicar.

A publicação exige três coisas ao mesmo tempo: um escopo próprio (`portfolio:publish`), em uma chave separada da usada no dia a dia; o identificador da revisão que foi mostrada, recusado se o rascunho mudou depois; e uma skill que o agente não pode iniciar sozinho. Tudo fica na auditoria e pode ser desfeito no backoffice.

## Considered Options

- **Publicar só no backoffice.** Mais simples e mais seguro, mas perde o fluxo pedido, de revisar e publicar na conversa.
- **Um escopo de escrita único.** Descartado: a chave do dia a dia passaria a poder publicar.
