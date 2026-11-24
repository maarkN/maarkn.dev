# Spec Delta

## MODIFIED Requirements

### Requirement: Legibilidade dos formulários
Campos, rótulos, botões, mensagens de erro e todos os primitives de `src/components/ui/**` MUST ter contraste mínimo de 4.5:1, borda visível em repouso e foco destacado por borda e anel. Os primitives MUST usar a fonte de texto do site e a moldura dos elementos interativos, sem nenhuma variante `dark:`.

#### Scenario: Formulário de projeto
- **WHEN** o administrador abre `/admin/projects/new`
- **THEN** todos os campos têm borda visível e o foco é destacado

#### Scenario: Diálogo de confirmação
- **WHEN** um `AlertDialog` destrutivo é aberto
- **THEN** título, corpo e ambos os botões são legíveis nos três temas, com o botão destrutivo distinguível sem depender só da cor
