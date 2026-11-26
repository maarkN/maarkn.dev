## Context

Ver proposal.md. O idioma é parâmetro do layout raiz, então navegar entre idiomas recria o `<html>` com `data-theme="soft"` e `data-font="caskaydia"`. O script de inicialização não roda de novo. O provedor remonta, adota os atributos recém-criados e grava o padrão por cima da escolha.

Na home há uma segunda causa, achada ao reproduzir (tarefa 1.1). A Versão CLI reconstrói a tela ao remontar reexecutando os últimos comandos, e `theme` e `font` reexecutados mudam a aparência. Na `main` isso esconde o defeito no caminho do comando: `theme classic` reexecutado devolve a paleta, depois de um quadro em `soft` e de gravar `soft`. Sem argumento, `theme` alterna de novo; com argumento, desfaz uma troca feita depois pela barra. Por isso a volta de uma página interna no mesmo idioma já perde a paleta depois de um `theme` sem argumento. Corrigido só o provedor, o mesmo `theme` passaria a alternar a paleta restaurada.

## Goals / Non-Goals

**Goals:** corrigir na causa, para todo caminho que troca de idioma, sem recarregar o documento.

**Non-Goals:** mudar o layout raiz ou o script de inicialização.

## Decisions

- **Quem manda é a escolha em memória, depois o armazenamento, depois o atributo.** Ao remontar, o provedor reaplica a escolha antes da pintura. A memória cobre o armazenamento bloqueado.
- **Gravar só na troca feita pelo visitante**, não ao montar. É o efeito de montagem que hoje apaga a escolha.
- **A reconstrução da tela não mexe na aparência.** Ao reexecutar, `theme` e `font` recebem a aparência só para leitura: imprimem a linha e não trocam nada. Quem restaura a aparência é o provedor.
- **Alternativa descartada: trocar de idioma recarregando o documento.** É o que o topo novo faz, mas a Versão CLI perderia a continuidade da sessão, e o botão voltar continuaria quebrado.

## Risks / Trade-offs

- [O script de inicialização migra valores antigos e continua gravando] → Fica como está; a migração acontece na carga do documento.
- [`feat/rebranding` moveu o script de inicialização para outro arquivo] → Trazer a `main` para a branch logo depois do merge e rodar lá o e2e.
