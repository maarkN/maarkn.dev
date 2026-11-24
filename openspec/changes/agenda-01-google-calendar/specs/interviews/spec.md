# Spec Delta

## ADDED Requirements

### Requirement: Compromisso da entrevista
Marcar uma entrevista com o Google conectado SHALL criar um compromisso ligado a ela, com empresa, vaga, etapa e o endereço do dossiê.

#### Scenario: Entrevista marcada
- **WHEN** uma etapa recebe data e hora
- **THEN** existe um compromisso em "Entrevistas" no mesmo horário

#### Scenario: Google fora do ar
- **WHEN** o compromisso não pode ser criado
- **THEN** a entrevista fica marcada, com a pendência visível e a opção de tentar de novo

### Requirement: Mudança feita no Google
Uma entrevista ligada a um compromisso SHALL acompanhar, na próxima leitura, o horário dele. Se o compromisso foi apagado, a entrevista MUST voltar a prevista e MUST NOT ser excluída.

#### Scenario: Remarcada no celular
- **WHEN** o compromisso muda para outro dia e o dossiê é aberto
- **THEN** a entrevista mostra o novo dia, e o histórico registra a remarcação

#### Scenario: Apagada no Google
- **WHEN** o compromisso é apagado e o dossiê é aberto
- **THEN** a entrevista aparece como prevista, com as anotações preservadas

#### Scenario: Entrevista já realizada
- **WHEN** o compromisso de uma entrevista realizada é apagado
- **THEN** a entrevista não muda
