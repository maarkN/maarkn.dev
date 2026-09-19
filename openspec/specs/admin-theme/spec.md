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
Campos, rótulos, botões, mensagens de erro e todos os primitives de `src/components/ui/**` MUST ter contraste mínimo de 4.5:1, borda visível em repouso e foco destacado por borda e anel. Os primitives MUST renderizar com cantos retos (`--radius: 0`) e em fonte monoespaçada, sem nenhuma variante `dark:`.

#### Scenario: Formulário de projeto
- **WHEN** o administrador abre `/admin/projects/new`
- **THEN** todos os campos têm borda visível e o foco é destacado

#### Scenario: Diálogo de confirmação
- **WHEN** um `AlertDialog` destrutivo é aberto
- **THEN** título, corpo e ambos os botões são legíveis sobre `--popover`, com o botão destrutivo em `--destructive` e texto `--bg`

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

### Requirement: Tokens do admin derivados da paleta
As rotas `/admin/**` SHALL obter toda cor, borda e raio de tokens declarados sob `.admin-root` que referenciam diretamente os nomes da paleta (`--bg`, `--fg`, `--purple`, `--line`, `--sel`, `--comment`, `--red`). O admin MUST NOT declarar aliases intermediários (`--surface`, `--text`, `--accent`, `--bg-low`, `--border-2`, `--accent-glow`) nem cores literais fora das exceções de contraste documentadas no CSS.

#### Scenario: Alias legado removido
- **WHEN** `grep -rn "var(--surface\|var(--text-\|var(--bg-low" src/app/admin src/components/admin` é executado
- **THEN** não há nenhuma ocorrência

#### Scenario: Troca de paleta no site não vaza
- **WHEN** um visitante com `classic` salvo abre `/admin`
- **THEN** o painel continua em `soft`, e nenhum chunk carregado em `/admin/**` contém código de tema

### Requirement: Contraste dos pares de token
Todo par texto/fundo do admin MUST atingir 4.5:1, e toda borda de controle (input, select, textarea) MUST atingir 3:1 em repouso. Onde a paleta não alcança, o admin SHALL elevar o valor localmente e registrar no CSS o número medido e o motivo.

#### Scenario: Botão primário
- **WHEN** um botão `bg-primary` é medido sobre a paleta `soft`
- **THEN** o texto usa `--primary-foreground` = `var(--bg)` e atinge ao menos 6:1 — nunca branco, que ficaria em 2.25:1

#### Scenario: Borda de campo em repouso
- **WHEN** um input do admin não está em foco
- **THEN** sua borda atinge ao menos 3:1 contra a superfície em que está
