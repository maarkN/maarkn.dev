# Spec Delta

## Purpose

Define como o backoffice pede dados, valida, confirma ações destrutivas e devolve o resultado.

## ADDED Requirements

### Requirement: Campos claros
Todo campo SHALL ter rótulo visível igual ao nome acessível, ajuda quando necessária e obrigatoriedade escrita por extenso.

#### Scenario: Campo obrigatório
- **WHEN** Marco abre um formulário
- **THEN** os campos obrigatórios dizem isso em texto

### Requirement: Erro que orienta
O erro SHALL aparecer junto ao campo, dizer o que houve e como corrigir, ser anunciado, e o que foi digitado MUST ser preservado.

#### Scenario: Validação falha
- **WHEN** um campo inválido é enviado
- **THEN** o erro aparece no campo, o foco vai para ele e os demais campos mantêm o conteúdo

#### Scenario: Falha do servidor
- **WHEN** a gravação falha
- **THEN** a mensagem não traz detalhe interno e há opção de tentar de novo

### Requirement: Botões dizem o que fazem
O botão SHALL nomear a ação, e a confirmação MUST usar o mesmo verbo.

#### Scenario: Salvar contato
- **WHEN** Marco usa "Salvar contato"
- **THEN** o aviso diz "Contato salvo"

### Requirement: Confirmação destrutiva
Excluir SHALL pedir a digitação do nome do registro, dizer o que se perde e ter cancelar como padrão.

#### Scenario: Nome incompleto
- **WHEN** o nome digitado não confere
- **THEN** o botão de excluir continua desligado

#### Scenario: Cancelar
- **WHEN** Marco pressiona `Esc`
- **THEN** nada é excluído e o foco volta a quem abriu a janela

### Requirement: Avisos
O resultado de uma ação SHALL ser mostrado em um aviso anunciado, que some sozinho e pode ser dispensado.

#### Scenario: Sucesso
- **WHEN** uma ação conclui
- **THEN** o aviso aparece e é anunciado uma vez
