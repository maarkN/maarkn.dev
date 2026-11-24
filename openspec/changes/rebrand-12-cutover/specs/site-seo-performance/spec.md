# Spec Delta

## ADDED Requirements

### Requirement: Identidade do site
O título da home SHALL trazer o nome e o cargo de Marco no idioma da rota; o ícone, o manifest e a cor do navegador SHALL seguir a identidade nova e o tema. Os dados estruturados de pessoa e site MUST continuar presentes.

#### Scenario: Aba do navegador
- **WHEN** a home é aberta
- **THEN** a aba exibe o ícone novo e o título no idioma da rota

#### Scenario: Cor do navegador
- **WHEN** o visitante usa claro suave no celular
- **THEN** a barra do navegador acompanha o tema

## MODIFIED Requirements

### Requirement: Indexação
O sitemap SHALL listar home, projetos, carreira, resumo, blog e links nos dois idiomas e MUST NOT listar `/chat` nem a Versão CLI. Toda rota pública MUST declarar `hreflang` para os dois idiomas e um único `h1`. O JSON-LD de pessoa e site MUST validar sem erros.

#### Scenario: Sitemap
- **WHEN** `/sitemap.xml` é requisitado
- **THEN** contém `/en/projects` e `/pt-BR/projects` e não contém `/chat`

#### Scenario: Versão CLI
- **WHEN** a Versão CLI é aberta por um buscador
- **THEN** é indexável, com endereço canônico próprio, e não aparece no sitemap

### Requirement: Imagem de compartilhamento
A imagem OG/Twitter da home e das páginas internas SHALL usar a identidade nova (marca, moldura e tema escuro suave) e refletir o idioma e o conteúdo da rota.

#### Scenario: Prévia no compartilhamento
- **WHEN** `/pt-BR` é compartilhado em uma rede social
- **THEN** a prévia mostra a imagem da identidade nova com texto em português
