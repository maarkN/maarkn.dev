---
status: accepted
---

# Documento enviado fica no Postgres, não em volume

O PDF que o recrutador recebeu precisa ser guardado com a candidatura. O site já tem um volume de uploads, mas ele é servido em `/uploads` sem login e com cache imutável, e nenhum volume entra no backup automático: antes de cada deploy só roda `pg_dump`. Decidimos gravar o arquivo no banco, servido por uma rota que exige sessão, imutável depois do envio.

## Considered Options

- **Volume privado novo.** É o desenho usual para arquivos, mas exigiria backup próprio e manteria o arquivo separado da transação que o registra.
- **Reusar `/uploads`.** Descartado: expõe dado pessoal em URL pública.

## Consequences

- Há teto de tamanho por arquivo; o banco não é lugar para anexos grandes.
- Se o volume de arquivos crescer muito, a migração para armazenamento externo é uma change própria.
