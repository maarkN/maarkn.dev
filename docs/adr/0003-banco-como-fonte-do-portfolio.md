---
status: accepted
---

# O banco é a fonte do texto dos projetos; o dicionário é semente

Hoje o texto dos 19 projetos vive nos dicionários e vence o do banco, que só tem um idioma; editar um projeto no backoffice não muda o site. Para ter editor com prévia, casos de sucesso, galeria e rascunhos feitos por agente, o banco passa a guardar o conteúdo em português e inglês e a vencer. O dicionário continua no repositório como semente e como conteúdo de quando não há banco, porque o build e o site público precisam funcionar sem `DATABASE_URL`.

## Consequences

- Corrigir um texto no dicionário não muda mais o site publicado. Quem procurar o texto no código vai achar uma versão que pode estar desatualizada, de propósito.
- `db:sync-projects`, que sobrescreve o banco a partir do código, deixa de sobrescrever texto.
