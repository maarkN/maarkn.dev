# admin-theme Specification

## Purpose

Garante que o painel administrativo permaneça funcional e legível na nova paleta, isolado da experiência de terminal do site público.

## Requirements

### Requirement: Admin na paleta soft, sem seletor de tema
Todas as rotas `/admin/**` SHALL usar a paleta `soft` independentemente da preferência do visitante e MUST NOT exibir controles de troca de paleta ou fonte.

#### Scenario: Preferência classic no site
- **WHEN** um administrador com `classic` salvo abre `/admin`
- **THEN** o painel é exibido na paleta `soft`

### Requirement: Legibilidade dos formulários
Campos, rótulos, botões e mensagens de erro do admin MUST ter contraste mínimo de 4.5:1 e borda visível em repouso e em foco.

#### Scenario: Formulário de projeto
- **WHEN** o administrador abre `/admin/projects/new`
- **THEN** todos os campos têm borda visível e o foco é destacado

### Requirement: Funcionalidade preservada
Login, listagem/criação/edição/exclusão de projetos, aplicações, gerador de CV, log de chat e upload de imagem MUST continuar funcionando sem regressão visual que impeça o uso.

#### Scenario: Smoke do admin
- **WHEN** o administrador percorre login → projetos → aplicações → gerador → chat
- **THEN** todas as telas são legíveis e as ações concluem com sucesso

### Requirement: Campos legados de cover
Os campos de gradiente de capa dos projetos SHALL permanecer editáveis e rotulados como legado, sem alteração de esquema de dados.

#### Scenario: Editar projeto antigo
- **WHEN** o administrador edita um projeto com gradiente definido
- **THEN** os valores são exibidos e salvos normalmente
