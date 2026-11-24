## Why

Marco precisa ter o PDF exato que o recrutador recebeu: é o que será comentado na entrevista. Hoje o banco guarda o texto do currículo e da carta, mas o arquivo fica na máquina dele, e o único lugar de upload do site é público.

## What Changes

- Documento enviado: currículo ou carta em PDF, ligado à candidatura, guardado no banco (ADR 0002).
- Leitura só com sessão do backoffice, sem cache compartilhado.
- Imutável depois do envio: substituir cria outro documento e o anterior continua no histórico.
- MCP: `attach_sent_document`, com PDF de até 2 MB. Agentes leem os metadados, nunca o arquivo.

**Fora do escopo:** tela (`rebrand-11-admin-screens`), outros tipos de arquivo e geração de PDF.

## Capabilities

### New Capabilities
- `sent-documents`: guarda, leitura e imutabilidade do PDF enviado ao recrutador.

### Modified Capabilities

## Impact

- `prisma/schema.prisma` e migração, rota autenticada de leitura, tool MCP, glossário.
- O `pg_dump` de antes do deploy passa a incluir os arquivos.
- **Branch:** main
- **Depende de:** dossier-01-fields
