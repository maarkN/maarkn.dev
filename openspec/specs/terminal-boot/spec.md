# terminal-boot Specification

## Purpose

Define quando e como a sequência de boot do terminal é exibida, como pode ser interrompida e como se comporta em visitas repetidas e com preferências de acessibilidade.

## Requirements

### Requirement: Sequência de boot na primeira visita da sessão
Na primeira carga da home em uma sessão de navegador, o terminal SHALL exibir um overlay com as linhas de boot digitadas caractere a caractere (marcadores `[ok]` destacados), seguido de transição suave para o terminal. A duração total sem interrupção MUST ficar entre 3 e 5 segundos.

#### Scenario: Primeira visita
- **WHEN** o visitante abre a home pela primeira vez na sessão
- **THEN** as seis linhas de boot são digitadas e o terminal aparece ao final com o prompt pronto

### Requirement: Skip imediato
Qualquer tecla ou toque durante o boot MUST interromper a animação, exibir todas as linhas imediatamente e mostrar o terminal.

#### Scenario: Toque durante o boot
- **WHEN** o visitante toca na tela durante a segunda linha
- **THEN** as seis linhas aparecem de uma vez e o terminal é exibido em menos de 500ms

### Requirement: Não repetir na mesma sessão
Após um boot concluído ou pulado, navegações subsequentes para a home na mesma sessão MUST exibir o terminal diretamente. O comando `reboot` SHALL limpar a saída e reexecutar o boot.

#### Scenario: Voltar de uma página interna
- **WHEN** o visitante abre um projeto e volta para a home
- **THEN** o terminal aparece sem boot

#### Scenario: reboot
- **WHEN** o visitante executa `reboot`
- **THEN** a saída é limpa e a sequência de boot é exibida novamente

### Requirement: Redução de movimento
Com `prefers-reduced-motion: reduce`, o boot MUST ser omitido e o terminal exibido imediatamente.

#### Scenario: Preferência ativa
- **WHEN** o sistema sinaliza redução de movimento
- **THEN** nenhuma animação de digitação ocorre

### Requirement: Foco ao terminar
Ao fim do boot, o campo de comando MUST receber foco em dispositivos com ponteiro fino; em dispositivos de toque o foco MUST NOT ser forçado (para não abrir o teclado virtual).

#### Scenario: Desktop
- **WHEN** o boot termina em um desktop
- **THEN** o visitante pode digitar imediatamente sem clicar

#### Scenario: Celular
- **WHEN** o boot termina em um celular
- **THEN** o teclado virtual não é aberto automaticamente

### Requirement: Conteúdo presente durante o boot
Enquanto o overlay está visível, o HTML do terminal (MOTD e saída inicial) MUST já existir no documento entregue pelo servidor.

#### Scenario: Resposta do servidor
- **WHEN** a home é requisitada sem JavaScript executar
- **THEN** a resposta contém o MOTD e os links do terminal por baixo do overlay
