# admin-theme Specification

## Purpose

Garante que o backoffice use os três temas do site, com cores vindas só dos tokens e contraste verificado, permaneça operável por teclado e leitor de tela, que suas utilities não vazem para o site público e que sua documentação descreva o que existe.

## Requirements

### Requirement: Legibilidade dos formulários
Campos, rótulos, botões, mensagens de erro e todos os primitives de `src/components/ui/**` MUST ter contraste mínimo de 4.5:1, borda visível em repouso e foco destacado por borda e anel. Os primitives MUST renderizar com cantos retos (`--radius: 0`) e em fonte monoespaçada, sem nenhuma variante `dark:`.

#### Scenario: Formulário de projeto
- **WHEN** o administrador abre `/admin/projects/new`
- **THEN** todos os campos têm borda visível e o foco é destacado

#### Scenario: Diálogo de confirmação
- **WHEN** um `AlertDialog` destrutivo é aberto
- **THEN** título, corpo e ambos os botões são legíveis sobre `--popover`, com o botão destrutivo em `--destructive` e texto `--bg`

### Requirement: Funcionalidade preservada
As 18 rotas do backoffice — login, dashboard, candidaturas (lista, board, detalhe, criação, edição), vagas, contatos, projetos, gerador, chaves de API, auditoria, chat e configurações — MUST continuar funcionando sem regressão que impeça o uso, e MUST permanecer operáveis apenas com teclado.

#### Scenario: Smoke do admin
- **WHEN** o administrador percorre login → dashboard → candidaturas → board → detalhe → gerador → auditoria
- **THEN** todas as telas são legíveis e as ações concluem com sucesso

#### Scenario: Somente teclado
- **WHEN** o administrador executa o mesmo percurso sem apontador
- **THEN** alcança todos os controles, o foco é sempre visível e nenhum diálogo aprisiona o foco

### Requirement: Campos legados de cover
Os campos de gradiente de capa dos projetos SHALL permanecer editáveis e rotulados como legado, sem alteração de esquema de dados.

#### Scenario: Editar projeto antigo
- **WHEN** o administrador edita um projeto com gradiente definido
- **THEN** os valores são exibidos e salvos normalmente

### Requirement: Contraste dos pares de token
Todo par texto/fundo do admin MUST atingir 4.5:1, e toda borda de controle (input, select, textarea) MUST atingir 3:1 em repouso. Vale nos três temas. Onde um tema não alcança, o admin SHALL elevar o valor localmente e registrar no CSS o número medido e o motivo.

#### Scenario: Botão primário
- **WHEN** o botão principal é medido em cada tema
- **THEN** o texto atinge ao menos 4.5:1 sobre o preenchimento

#### Scenario: Borda de campo em repouso
- **WHEN** um input do admin não está em foco
- **THEN** sua borda atinge ao menos 3:1 contra a superfície em que está

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

### Requirement: Backoffice nos três temas
Todas as rotas `/admin/**` SHALL usar o tema escolhido pela pessoa, entre os três do site, com a mesma preferência, e oferecer a troca no menu da conta.

#### Scenario: Preferência do site
- **WHEN** Marco usa claro suave no site e abre o backoffice
- **THEN** o backoffice está em claro suave

#### Scenario: Preferência da Versão CLI
- **WHEN** a Versão CLI está em `classic`
- **THEN** o backoffice não muda

### Requirement: Tokens do backoffice derivados do tema
As rotas `/admin/**` SHALL obter toda cor e borda dos tokens do tema ativo, e MUST NOT usar cor literal fora das exceções documentadas.

#### Scenario: Troca de tema
- **WHEN** Marco troca o tema
- **THEN** todas as telas mudam por completo, sem elemento com a cor anterior

#### Scenario: Cor literal introduzida
- **WHEN** uma cor literal é introduzida numa tela do backoffice
- **THEN** a verificação do projeto falha apontando o arquivo
