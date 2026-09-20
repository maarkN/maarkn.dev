## Purpose

Garante que o admin em linguagem de terminal permaneça operável por teclado e leitor de tela, e que sua documentação descreva o que existe.

## ADDED Requirements

### Requirement: Atalhos anunciados
Todo atalho de teclado ativo numa rota do admin SHALL estar visível na interface daquela rota, junto da ação que executa.

#### Scenario: Paginação
- **WHEN** o administrador vê uma listagem paginada
- **THEN** as teclas de avançar e voltar aparecem na própria linha de paginação

### Requirement: Movimento reduzido no admin
Toda animação do admin MUST respeitar `prefers-reduced-motion: reduce`, permanecendo estática sem perda de informação.

#### Scenario: Carregamento com movimento reduzido
- **WHEN** a preferência está ativa e uma listagem carrega
- **THEN** a linha de progresso é exibida sem animação e o estado continua compreensível

### Requirement: Utilities do admin não vazam
As utilities de token do vocabulário shadcn MUST NOT ser usadas fora do admin e dos seus componentes, e a verificação SHALL falhar o lint.

#### Scenario: Uso indevido no site
- **WHEN** uma classe `bg-background` é introduzida numa página pública
- **THEN** `pnpm lint` falha apontando o arquivo

## MODIFIED Requirements

### Requirement: Funcionalidade preservada
As 18 rotas do backoffice — login, dashboard, candidaturas (lista, board, detalhe, criação, edição), vagas, contatos, projetos, gerador, chaves de API, auditoria, chat e configurações — MUST continuar funcionando sem regressão que impeça o uso, e MUST permanecer operáveis apenas com teclado.

#### Scenario: Smoke do admin
- **WHEN** o administrador percorre login → dashboard → candidaturas → board → detalhe → gerador → auditoria
- **THEN** todas as telas são legíveis e as ações concluem com sucesso

#### Scenario: Somente teclado
- **WHEN** o administrador executa o mesmo percurso sem apontador
- **THEN** alcança todos os controles, o foco é sempre visível e nenhum diálogo aprisiona o foco
