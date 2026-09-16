# site-seo-performance Specification

## Purpose

Estabelece os limites de desempenho e os requisitos de indexação e compartilhamento social que o site deve cumprir com o design terminal.

## Requirements

### Requirement: Core Web Vitals da home
Em auditoria Lighthouse mobile com o perfil de throttling padrão (Moto G Power, CPU 4×, 1.6 Mbps / 150 ms RTT) contra a URL de produção, a home MUST atingir LCP ≤ 2.0s, CLS ≤ 0.02, INP ≤ 200ms e pontuação de desempenho ≥ 95. O elemento LCP MUST ser texto renderizado pelo servidor. Em auditoria contra `localhost`, onde o modelo simulado (Lantern) trata os scripts como pré-requisito do paint e infla o LCP por construção, o LCP MUST ser lido com o mesmo throttling aplicado às requisições (`--throttling-method=devtools`); os demais limites valem nos dois modos.

#### Scenario: Auditoria pós-migração
- **WHEN** a home é auditada em produção após o deploy
- **THEN** todos os limites acima são atendidos e o resultado é registrado

#### Scenario: Auditoria local antes do merge
- **WHEN** a home é auditada contra `localhost` a partir de `pnpm build && next start`
- **THEN** desempenho ≥ 95, CLS ≤ 0.02 e o elemento LCP é texto do HTML em ambos os modos, e o LCP com throttling aplicado é ≤ 2.0s

### Requirement: Orçamento de JavaScript
O JavaScript específico da home (excluindo o runtime do framework) MUST ser inferior a 60 kB comprimido. O renderizador de markdown do assistente MUST ser carregado apenas quando o primeiro `ask` for executado.

#### Scenario: Primeira carga
- **WHEN** a home é carregada sem executar `ask`
- **THEN** nenhum chunk do renderizador de markdown é baixado

### Requirement: Fontes
Apenas a fonte padrão MUST ser pré-carregada; a fonte alternativa MUST ser baixada somente quando selecionada. As fontes MUST incluir os glifos necessários para pt-BR.

#### Scenario: Acentos
- **WHEN** um texto com `ã`, `ç`, `é` é exibido
- **THEN** os glifos vêm da fonte ativa, sem fallback visível

### Requirement: Indexação
O sitemap SHALL listar home, projetos, carreira, blog e links nos dois idiomas e MUST NOT listar `/chat`. Toda rota pública MUST declarar `hreflang` para os dois idiomas e um único `h1`. O JSON-LD de pessoa e site MUST validar sem erros.

#### Scenario: Sitemap
- **WHEN** `/sitemap.xml` é requisitado
- **THEN** contém `/en/projects` e `/pt-BR/projects` e não contém `/chat`

### Requirement: Imagem de compartilhamento
A imagem OG/Twitter da home e das páginas internas SHALL usar a identidade terminal (fundo `#282A36`, barra `maarkn@dev`, prompt e linhas de saída em fonte monoespaçada) e refletir o idioma da rota.

#### Scenario: Prévia no compartilhamento
- **WHEN** `/pt-BR` é compartilhado em uma rede social
- **THEN** a prévia mostra a imagem no estilo terminal com texto em português
