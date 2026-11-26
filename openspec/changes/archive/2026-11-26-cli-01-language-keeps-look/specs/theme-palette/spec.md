# Spec Delta

## ADDED Requirements

### Requirement: Preferência sobrevive à troca de idioma
Trocar de idioma MUST manter a paleta e a fonte ativas, na tela e no armazenamento, por qualquer caminho e nos dois sentidos. Trocar de idioma MUST NOT gravar a paleta nem a fonte; o valor guardado muda quando o visitante as troca e na carga do documento, pela migração de valores antigos e pelo padrão da primeira visita.

#### Scenario: Comando lang
- **WHEN** o visitante usa `classic` e `daddytime` em `/en` e executa `lang pt`
- **THEN** a tela em português continua em `classic` e `daddytime`, e recarregar mantém os dois

#### Scenario: Controle da barra
- **WHEN** o visitante usa `classic` em uma página interna e troca o idioma pela barra, em 390 px ou 1440 px
- **THEN** a página continua em `classic`

#### Scenario: Voltar do navegador
- **WHEN** o visitante troca de idioma e usa o botão voltar
- **THEN** a paleta e a fonte continuam as escolhidas

#### Scenario: Armazenamento bloqueado
- **WHEN** o navegador bloqueia o armazenamento e o visitante troca a paleta e depois o idioma
- **THEN** nenhum erro aparece no console e a paleta escolhida continua ativa até o documento ser recarregado
