# Spec Delta

## Purpose

Define o que a home conta e como cada seção responde, para que um recrutador entenda quem é Marco sem conhecimento técnico.

## ADDED Requirements

### Requirement: Oito seções
A home SHALL apresentar, nesta ordem, abertura, sobre mim, experiências, casos de sucesso, o que resolvo, o processo, tecnologias, projetos pessoais e contato, em português e inglês.

#### Scenario: Sem JavaScript
- **WHEN** a home é aberta com JavaScript desligado
- **THEN** o texto de todas as seções e os links principais estão visíveis e funcionam

#### Scenario: Celular
- **WHEN** a home é aberta em 390 px
- **THEN** todas as seções são legíveis em uma coluna, sem rolagem horizontal

### Requirement: Abertura
A abertura SHALL mostrar nome, disponibilidade, o que Marco faz, três números e os caminhos para contato, resumo e CV.

#### Scenario: Indisponível
- **WHEN** Marco se marca como indisponível
- **THEN** a frase de disponibilidade não aparece

### Requirement: Destinos no globo
Em sobre mim, escolher um destino SHALL destacá-lo e traçar a rota a partir de Goiânia.

#### Scenario: Teclado
- **WHEN** o visitante foca um destino pelo teclado
- **THEN** a rota aparece como no ponteiro

#### Scenario: Sem projeção
- **WHEN** a projeção não está disponível
- **THEN** os destinos continuam legíveis como lista

### Requirement: Experiências recentes
A seção SHALL mostrar as três experiências mais recentes, e cada uma SHALL abrir o detalhe.

#### Scenario: Abrir detalhe
- **WHEN** o visitante escolhe uma experiência
- **THEN** vê contexto, o que liderou, destaques e resultado

### Requirement: Casos de sucesso
A seção SHALL mostrar os casos escolhidos, com problema, trabalho e resultado, dizendo a situação real do produto.

#### Scenario: Produto em beta
- **WHEN** um caso ainda não é público
- **THEN** o texto informa que está em beta fechado

#### Scenario: Menos de três casos
- **WHEN** só há dois casos escolhidos
- **THEN** a seção mostra dois, sem espaço vazio

### Requirement: O que resolvo
A seção SHALL listar dores de cliente; escolher uma SHALL mostrar a solução e o projeto que a comprova.

#### Scenario: Abrir outra
- **WHEN** o visitante abre uma segunda dor
- **THEN** a primeira se fecha

### Requirement: O processo
A seção SHALL mostrar as cinco etapas, as voltas do ciclo e, para a etapa escolhida, o que acontece, a parte do cliente e o que ele recebe.

#### Scenario: Avanço automático
- **WHEN** ninguém interage com a seção visível
- **THEN** as etapas avançam sozinhas, e param na primeira interação

#### Scenario: Movimento reduzido
- **WHEN** o visitante usa movimento reduzido
- **THEN** as etapas não avançam sozinhas

### Requirement: Tecnologias com prova
Escolher uma tecnologia SHALL mostrar em que projetos e empresas foi usada. Nenhuma nota de proficiência SHALL ser exibida.

#### Scenario: Tecnologia com projetos
- **WHEN** o visitante escolhe Go
- **THEN** vê os projetos e as empresas em que Go foi usado, com link

#### Scenario: Prática sem projeto
- **WHEN** o visitante escolhe uma prática sem projeto associado
- **THEN** vê que é uso do dia a dia, sem lista vazia

### Requirement: Contato
A seção SHALL ter formulário e canais diretos, com a mesma validação e o mesmo limite já existentes.

#### Scenario: Campo inválido
- **WHEN** o e-mail é inválido
- **THEN** o erro aparece no campo, diz como corrigir, e o foco vai para ele

#### Scenario: Falha no envio
- **WHEN** o envio falha
- **THEN** o texto digitado permanece e há opção de tentar de novo ou usar o e-mail
