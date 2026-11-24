# Spec Delta

## MODIFIED Requirements

### Requirement: Funcionalidade preservada
As rotas do backoffice — login, visão geral, agenda, candidaturas (lista, quadro, dossiê, criação, edição), vagas, contatos, projetos (lista, edição, revisão de rascunho), gerador, notas, assistente, MCP e chaves, auditoria e configurações — MUST continuar funcionando sem regressão que impeça o uso, e MUST permanecer operáveis apenas com teclado.

#### Scenario: Smoke do admin
- **WHEN** o administrador percorre login → dashboard → candidaturas → board → detalhe → gerador → auditoria
- **THEN** todas as telas são legíveis e as ações concluem com sucesso

#### Scenario: Somente teclado
- **WHEN** o administrador executa o mesmo percurso sem apontador
- **THEN** alcança todos os controles, o foco é sempre visível e nenhum diálogo aprisiona o foco

### Requirement: Campos legados de cover
Os campos de gradiente de capa dos projetos SHALL permanecer editáveis, agora como as cores do ícone do projeto, sem alteração de esquema de dados.

#### Scenario: Editar projeto antigo
- **WHEN** o administrador edita um projeto com gradiente definido
- **THEN** os valores são exibidos e salvos normalmente
