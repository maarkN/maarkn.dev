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
Quem anuncia a vaga. O que se sabe sobre ela (`aboutMd`) vale para todas as candidaturas feitas lá.

**Contexto do projeto** (`projectInfoMd`):
O produto ou o time em que se trabalharia se a candidatura desse certo.
_Avoid_: Projeto (sozinho)

**Entrevista** (`Interview`):
Uma etapa do processo seletivo, prevista ou marcada, com ou sem data.
_Avoid_: Etapa, meeting, call

**Situação da entrevista** (`InterviewStatus`):
Prevista (sem data), marcada (com data), realizada (com data) ou cancelada. O resultado de uma entrevista realizada é outra coisa.
_Avoid_: Status, estado

**Evento da candidatura** (`ApplicationEvent`):
Algo que aconteceu com a candidatura, registrado na linha do tempo. Não tem futuro.
_Avoid_: Evento (sozinho), compromisso

**Documento enviado**:
O PDF exato que o recrutador recebeu. Não muda depois do envio.
_Avoid_: Currículo (sozinho), anexo

**Motivo de encerramento** (`ClosureReason`):
A categoria que explica por que uma candidatura recusada ou retirada acabou. Silêncio do recrutador não é motivo, é estágio.
_Avoid_: Rejection cause, causa de rejeição

**Dossiê**:
Tudo o que se sabe sobre uma candidatura, reunido em um lugar.

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

**Versão CLI**:
A experiência de terminal do site, alternativa à home, com paletas e fontes próprias.
_Avoid_: Modo terminal, home antiga

## Operação

**Backoffice**:
A área privada do site, em `/admin`.
_Avoid_: Admin, painel, dashboard

**Skill de agente** (`maarkn-dev:*`):
Um comando que um agente de IA executa para operar o backoffice em nome de Marco.
_Avoid_: Skill (sozinho)
