# Spec Delta

## MODIFIED Requirements

### Requirement: Conteúdo vem das fontes canônicas do site
Os comandos de conteúdo MUST obter dados das mesmas fontes usadas pelas páginas internas: projetos e seus textos do repositório de projetos (com fallback estático), experiência da timeline e dicionários, skills do toolkit, posts do CMS (com mocks quando indisponível) e contatos da configuração do site. Nenhum dado de conteúdo SHALL ser duplicado dentro do código do terminal.

#### Scenario: Projeto criado no admin
- **WHEN** um projeto destacado é criado no painel administrativo e a revalidação ocorre
- **THEN** ele aparece na saída de `projects` sem alteração de código

#### Scenario: CMS indisponível
- **WHEN** o CMS de blog não está configurado ou falha
- **THEN** `writing` exibe os posts de fallback do site, sem mensagem de erro técnica

#### Scenario: Texto editado no admin
- **WHEN** o resumo de um projeto é alterado no painel administrativo
- **THEN** o comando `projects` mostra o novo resumo no idioma da rota

#### Scenario: Sem banco
- **WHEN** o banco está indisponível
- **THEN** o comando `projects` lista os projetos com o texto de semente
