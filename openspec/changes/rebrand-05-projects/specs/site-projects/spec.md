# Spec Delta

## Purpose

Define como o visitante encontra um projeto e entende o que é, qual foi a função de Marco e o que foi entregue.

## ADDED Requirements

### Requirement: Encontrar um projeto
A lista SHALL mostrar todos os projetos públicos, com categorias e quantidades, busca por nome e tecnologia e a opção de ver só os próprios. Filtro e busca MUST ficar na URL.

#### Scenario: Filtro por URL
- **WHEN** o visitante abre `/en/projects?cat=ai`
- **THEN** vê só projetos de IA, com a categoria marcada

#### Scenario: Busca por tecnologia
- **WHEN** o visitante busca "kafka"
- **THEN** vê os projetos que usam Kafka

#### Scenario: Nada encontrado
- **WHEN** nenhum projeto corresponde
- **THEN** a lista diz isso e oferece limpar os filtros

### Requirement: Destaques
A lista SHALL abrir com destaques que passam sozinhos e podem ser pausados e escolhidos.

#### Scenario: Pausar
- **WHEN** o visitante pausa os destaques
- **THEN** eles param até ele retomar

#### Scenario: Movimento reduzido
- **WHEN** o visitante usa movimento reduzido
- **THEN** os destaques não passam sozinhos

### Requirement: Entender um projeto
O detalhe SHALL apresentar o que é, qual foi a função de Marco, o que foi entregue, tecnologias, ano, situação e categoria, no idioma da página.

#### Scenario: Projeto no ar
- **WHEN** o projeto está no ar
- **THEN** há um botão para abri-lo em nova aba

#### Scenario: Projeto privado
- **WHEN** o código é privado
- **THEN** a página diz que é privado e não mostra link de código

#### Scenario: Sem nenhum link
- **WHEN** o projeto não tem site nem código público
- **THEN** a ação principal é pedir uma demonstração

#### Scenario: Projeto inexistente
- **WHEN** o endereço não corresponde a um projeto
- **THEN** a página responde 404 e oferece a lista

### Requirement: Galeria
Quando houver imagens, o detalhe SHALL exibi-las com legenda e permitir ampliá-las e percorrê-las por teclado.

#### Scenario: Ampliar
- **WHEN** o visitante escolhe uma imagem
- **THEN** ela abre ampliada, sem corte, e as setas percorrem as demais

#### Scenario: Sem imagens
- **WHEN** o projeto não tem imagens
- **THEN** o detalhe mostra a projeção do ícone e não há seção de galeria

### Requirement: Perguntas rápidas
O detalhe SHALL responder se está no ar, qual foi a função, se o código é aberto e com o que foi feito, a partir dos dados do projeto.

#### Scenario: Projeto encerrado
- **WHEN** o projeto foi encerrado
- **THEN** a resposta diz isso, sem sugerir que está disponível

### Requirement: Continuar navegando
O detalhe SHALL oferecer projetos parecidos e o próximo, e copiar o endereço.

#### Scenario: Copiar
- **WHEN** o visitante copia o endereço
- **THEN** recebe a confirmação

#### Scenario: Cópia bloqueada
- **WHEN** o navegador impede a cópia
- **THEN** é avisado de como copiar manualmente

### Requirement: Conteúdo e indexação preservados
Endereços, textos, metadata e dados para buscadores MUST continuar equivalentes aos anteriores.

#### Scenario: Comparação de texto
- **WHEN** o texto de `/en/projects/<slug>` é comparado antes e depois
- **THEN** nenhuma informação se perde
