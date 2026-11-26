## Context

Ver proposal.md. O idioma é parâmetro do layout raiz, então navegar entre idiomas recria o `<html>` com `data-theme="soft"` e `data-font="caskaydia"`. O script de inicialização não roda de novo. O provedor remonta, adota os atributos recém-criados e grava o padrão por cima da escolha.

## Goals / Non-Goals

**Goals:** corrigir na causa, para todo caminho que troca de idioma, sem recarregar o documento.

**Non-Goals:** mudar o layout raiz ou o script de inicialização.

## Decisions

- **Quem manda é a escolha em memória, depois o armazenamento, depois o atributo.** Ao remontar, o provedor reaplica a escolha antes da pintura. A memória cobre o armazenamento bloqueado.
- **Gravar só na troca feita pelo visitante**, não ao montar. É o efeito de montagem que hoje apaga a escolha.
- **Alternativa descartada: trocar de idioma recarregando o documento.** É o que o topo novo faz, mas a Versão CLI perderia a continuidade da sessão, e o botão voltar continuaria quebrado.

## Risks / Trade-offs

- [O script de inicialização migra valores antigos e continua gravando] → Fica como está; a migração acontece na carga do documento.
- [`feat/rebranding` moveu o script de inicialização para outro arquivo] → Trazer a `main` para a branch logo depois do merge e rodar lá o e2e.
