## Why

Quem não é técnico reconhece um logo antes de um nome. Mostrar o ícone ao lado do texto facilita a leitura da stack.

## What Changes

- Logos das tecnologias copiados para o repositório, monocromáticos, na cor do texto.
- Um componente que mostra ícone e nome, e só o nome quando não há logo.
- Uso em todo lugar onde aparece uma tecnologia, no site e no backoffice.
- Registro da origem e da licença de cada arquivo.

**Fora do escopo:** logos coloridos, logos de empresas, ícones de práticas (DDD, TDD).

## Capabilities

### New Capabilities
- `tech-icons`: quais tecnologias têm ícone e como aparecem.

### Modified Capabilities

## Impact

- `src/components/tech/**`, mapa de nomes para logos, atribuição em `README` ou arquivo próprio, páginas e telas que listam tecnologia.
- Nenhuma dependência em tempo de execução.
- **Branch:** feat/rebranding
- **Depende de:** rebrand-05-projects, rebrand-06-career-and-pages
