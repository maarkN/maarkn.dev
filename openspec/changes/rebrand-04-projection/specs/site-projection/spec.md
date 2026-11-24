# Spec Delta

## Purpose

Define o objeto de partículas que acompanha a leitura da home e a passagem de cada tag para o trilho, sem prejudicar leitura, acessibilidade ou desempenho.

## ADDED Requirements

### Requirement: Uma forma por seção
A projeção SHALL assumir a forma de cada seção e transformar-se conforme a rolagem, nos dois sentidos.

#### Scenario: Passar de seção
- **WHEN** o visitante rola de sobre mim para experiências
- **THEN** o globo se transforma em hélice e muda de lado

#### Scenario: O que resolvo
- **WHEN** o visitante rola dentro da seção
- **THEN** a nuvem desordenada se organiza em grade

### Requirement: Leitura preservada
A projeção MUST NOT reduzir o contraste do texto, capturar toques ou cliques, nem ser lida por tecnologia assistiva.

#### Scenario: Texto sobre a projeção
- **WHEN** a projeção passa por trás de um texto
- **THEN** o texto mantém o contraste mínimo

#### Scenario: Toque
- **WHEN** o visitante rola tocando sobre a projeção
- **THEN** a página rola normalmente

### Requirement: Tag e linha-guia
Ao entrar em uma seção ainda não descoberta, a linha-guia SHALL ligar a projeção à tag; ao sair, a tag SHALL ir até o trilho.

#### Scenario: Próxima seção
- **WHEN** o visitante passa à seção seguinte
- **THEN** a tag anterior voa até o seu lugar no trilho e a nova se monta do outro lado

#### Scenario: Seção já descoberta
- **WHEN** o visitante volta a uma seção já descoberta
- **THEN** a tag permanece no trilho, marcada como atual

#### Scenario: Última seção
- **WHEN** o visitante chega ao fim da página
- **THEN** a última tag vai para o trilho, que fica completo

### Requirement: Alternativa estática
Com movimento reduzido, economia de dados ou sem suporte gráfico, o site SHALL mostrar uma imagem fixa por seção e manter todas as funções.

#### Scenario: Movimento reduzido
- **WHEN** o visitante usa movimento reduzido
- **THEN** as tags entram no trilho sem voo e nada se move

#### Scenario: Suporte gráfico perdido
- **WHEN** o suporte gráfico falha durante a visita
- **THEN** a projeção some sem erro e a página continua funcionando

### Requirement: Carregamento tardio
A projeção MUST NOT atrasar a exibição do texto da abertura, nem trabalhar com a aba oculta.

#### Scenario: Rede lenta
- **WHEN** a home é aberta em rede lenta
- **THEN** o texto e os botões aparecem antes de a projeção começar a carregar

#### Scenario: Aba oculta
- **WHEN** o visitante troca de aba
- **THEN** a projeção para de desenhar
