# maarkn.dev

Site público de portfólio de Marco Filho e o backoffice privado que acompanha a busca de vagas. Este arquivo fixa o significado das palavras; o nome entre crases é o identificador usado no código.

## Candidaturas

**Candidatura** (`Application`):
O acompanhamento de uma tentativa de entrar em uma empresa, do radar ao desfecho.
_Avoid_: Aplicação, app, inscrição

**Vaga** (`Job`):
O anúncio publicado por uma empresa. Existe mesmo que ninguém se candidate a ela.
_Avoid_: Oportunidade, posição

**Empresa** (`Company`):
Quem anuncia a vaga. O que se sabe sobre ela vale para todas as candidaturas feitas lá.

**Contexto do projeto** (`project_info`):
O produto ou o time em que se trabalharia se a candidatura desse certo.
_Avoid_: Projeto (sozinho)

**Entrevista** (`Interview`):
Uma etapa do processo seletivo, prevista ou marcada, com ou sem data.
_Avoid_: Etapa, meeting, call

**Evento da candidatura** (`ApplicationEvent`):
Algo que aconteceu com a candidatura, registrado na linha do tempo. Não tem futuro.
_Avoid_: Evento (sozinho), compromisso

**Documento enviado**:
O PDF exato que o recrutador recebeu. Não muda depois do envio.
_Avoid_: Currículo (sozinho), anexo

**Motivo de encerramento**:
A categoria que explica por que uma candidatura recusada ou retirada acabou. Silêncio do recrutador não é motivo, é estágio.
_Avoid_: Rejection cause, causa de rejeição

**Dossiê**:
Tudo o que se sabe sobre uma candidatura, reunido em um lugar.

**Estágio** (`FunnelStage`):
O ponto exato em que a candidatura está no funil, como "Triagem" ou "Entrevista final".
_Avoid_: Status, etapa

**Fase**:
Um grupo de estágios vizinhos (antes do envio, enviada, em avaliação, desfecho), mostrado pela marca ao lado do nome do estágio.
_Avoid_: Categoria, estágio (sozinho)

**Quadro**:
A vista das candidaturas abertas em seis colunas, onde se muda o estágio arrastando ou pelas setas.
_Avoid_: Kanban, board

## Agenda

**Compromisso**:
Um item do Google Calendar, ligado ou não a uma entrevista.
_Avoid_: Evento, reunião

## Portfólio

**Projeto** (`Project`):
Um item da vitrine pública do site.
_Avoid_: App, trabalho

**Projeto de carreira** (`CareerProject`):
O dossiê privado de um trabalho feito, do qual um projeto público pode derivar.
_Avoid_: Projeto (sozinho)

**Caso de sucesso**:
Um dos três projetos escolhidos para abrir a home, contado como problema, trabalho e resultado.
_Avoid_: Destaque, featured

**Rascunho do projeto**:
Uma proposta de mudança em um projeto que ainda não aparece no site.
_Avoid_: Draft, versão

**Publicar**:
Levar um rascunho revisado por Marco para o site público.

**Competência** (`Skill`):
Uma tecnologia ou prática que Marco domina.
_Avoid_: Skill (sozinho)

## Site

**Seção**:
Um dos oito blocos da home.
_Avoid_: Sessão

**Tag**:
O rótulo holográfico que apresenta uma seção e, depois de descoberto, vira item do trilho.
_Avoid_: Bullet, bullet point

**Trilho**:
O menu lateral que se monta à medida que as seções são descobertas.
_Avoid_: Menu, sidebar

**Projeção**:
O objeto de partículas que acompanha a rolagem e muda de forma a cada seção.
_Avoid_: Orb, partículas

**Linha-guia**:
O traço que liga a projeção à tag da seção atual.
_Avoid_: Leader, linha

**Holograma**:
O tratamento visual de tudo o que é interativo. O que não é interativo nunca é holograma.

**Moldura**:
O contorno quebrado, com três cantos cortados, que todo holograma tem. A janela também tem, sem ser clicável.
_Avoid_: Borda, contorno (sozinho)

**Feixe**:
A cor de tudo o que é clicável e, em um link dentro de texto corrido, o sublinhado que o marca no lugar da moldura.
_Avoid_: Destaque, accent

**Tela projetada**:
Um card cujo corpo é uma imagem, recortada em paralelo à moldura.
_Avoid_: Thumbnail, preview

**Tema** (`dusk`, `light`, `dracula`):
A combinação de cores do site e do backoffice escolhida por quem visita.
_Avoid_: Paleta, modo

**Paleta** (`soft`, `classic`):
A combinação de cores da Versão CLI, independente do tema.
_Avoid_: Tema

**Versão CLI**:
A experiência de terminal do site, alternativa à home, com paletas e fontes próprias.
_Avoid_: Modo terminal, home antiga

## Operação

**Backoffice**:
A área privada do site, em `/admin`.
_Avoid_: Admin, painel, dashboard

**Estrutura** (`AdminShell`):
O que cerca toda tela do backoffice: menu, topo, caminho e a barra do celular.
_Avoid_: Chrome, moldura, layout

**Aviso**:
O resultado de uma ação, mostrado no canto da tela, que some sozinho e pode ser dispensado.
_Avoid_: Toast, notificação

**Caminho** (`trail`):
De onde se chega a uma tela que está dentro de outra, até ela.
_Avoid_: Breadcrumb, migalhas

**Skill de agente** (`maarkn-dev:*`):
Um comando que um agente de IA executa para operar o backoffice em nome de Marco.
_Avoid_: Skill (sozinho)
