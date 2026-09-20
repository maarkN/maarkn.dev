# maarkn.dev

> Portfólio pessoal do **Marco Filho** — engenheiro sênior de IA/LLM & backend trabalhando do Brasil com times na Europa, nos EUA e na América Latina.

`maarkn.dev` é o cartão de visita digital do [@maarkn](https://github.com/maarkn). A home é um terminal interativo: ele dá boot, imprime um `whoami` e entrega um prompt em que cada comando mostra algo sobre mim — carreira, stack, projetos, posts, contato — ou conversa com uma assistente de IA treinada no meu CV. Recrutadores e clientes pegam a história inteira em dois ou três comandos; todo mundo ganha um brinquedo divertido de cutucar.

[Read this in English →](./README.md)

![Home em terminal: boot, help, projects, open 1](./docs/media/terminal-home.gif)

---

## O que tem aqui

Uma aplicação [Next.js 16](https://nextjs.org) em TypeScript, estilizada com tokens CSS + [Tailwind CSS v4](https://tailwindcss.com), totalmente internacionalizada (inglês e português do Brasil), hospedada por conta própria atrás de Traefik com Postgres.

### O terminal (home)

- **Sequência de boot** — seis linhas digitadas caractere a caractere na primeira visita da sessão do navegador (3–5 s), puláveis com qualquer tecla ou toque e omitidas por completo com `prefers-reduced-motion`. `reboot` roda de novo.
- **Shell** — barra de status estilo tmux (`maarkn@dev · título · theme · font · lang · relógio`), menu de comandos com atalhos numéricos (`1`–`6`, `?`, `⌫`), tela rolável e prompt `maarkn@dev:~$` com cursor sintético. No celular o menu vira uma faixa horizontal no rodapé.
- **Engine de comandos** — resolução sem distinção de maiúsculas com aliases (`about` → `whoami`, `work` → `projects`, `resume` → `cv`…), histórico com `↑`/`↓`, autocomplete com `Tab` (comandos, `cat <arquivo>`, `cd <dir>`), `Ctrl+C` / `Ctrl+L`, comandos assíncronos que anexam ou repintam linhas enquanto rodam e um prompt interativo que os comandos podem assumir para fazer perguntas.
- **Comandos de conteúdo** — `whoami`, `experience`, `skills`, `projects` + `open <n>`, `writing` + `read <n>`, `contact`, `cv`, `ls` / `cat <arquivo>`, `neofetch`. Eles só *formatam* o que o resto do site já sabe: projetos do repositório (Postgres com fallback estático), timeline e toolkit de `lib/`, posts do Ghost (mockados quando o CMS não está configurado). Nada é duplicado dentro do terminal.
- **`ask <pergunta>`** — a assistente RAG do site dentro do terminal: streaming token a token, markdown renderizado na tipografia do terminal, contexto da conversa mantido na sessão (`ask --new` esquece), `Ctrl+C` aborta. Por trás está o `/api/chat`, com limite por IP e por dia, log no admin e respostas de demonstração quando não há chave de API. Uma flag opcional encaminha para a assistente qualquer entrada desconhecida com três ou mais palavras.
- **`mail`** — o formulário de contato como conversa: nome → email → empresa → mensagem → `send? [Y/n]`, validado em linha com o mesmo schema Zod da server action, `Esc` / `Ctrl+C` cancelam, respostas nunca entram no histórico, uma mensagem por minuto por aba.
- **Navegação** — `cd projects|career|blog|links`, `cd ~` para voltar, `pwd`, `lang en|pt` e deep-links como `/en?cmd=projects` ou `/pt-BR?cmd=whoami;skills`. A tela é reconstruída quando você volta de uma página interna; âncoras antigas (`/#contact`, `/#projects`, `/#about`) continuam caindo no comando certo.
- **Paletas e fontes** — duas paletas Dracula, `soft` (padrão) e `classic`, e duas fontes monoespaçadas, Cascadia Code (padrão) e DaddyTimeMono, trocáveis pela barra ou com `theme` / `font`. Aplicadas antes da primeira pintura, persistidas no `localStorage`.
- **Funciona sem JavaScript** — o servidor renderiza o MOTD, a saída do `whoami` e uma linha de sitemap, então crawlers e visitantes sem JS ainda recebem a bio e todos os links. O shell adota essas linhas ao hidratar.
- **Acessível** — WCAG 2.1 AA: landmarks semânticos, skip link para o prompt, um único anúncio de boot para leitores de tela, a saída de cada comando agrupada como `output of <comando>`, `Esc` para sair do prompt, contraste 4.5:1 nas duas paletas, tamanhos em `rem`, alvos de toque de 44 px.

### Páginas internas

Toda rota interna sobreviveu ao redesign com as mesmas URLs, metadata e conteúdo; elas só vestem o chrome do terminal agora (barra de status com o caminho, breadcrumb `maarkn@dev:~$ cat projects/<slug>.md`, coluna de 82ch, link `cd ..` de volta).

| Rota | O que é |
|---|---|
| `/[lang]/projects` | Todos os projetos públicos no formato do comando `projects`, filtrados por `?cat=` |
| `/[lang]/projects/[slug]` | Detalhe do projeto: tabela de metadados, descrição, papel, funcionalidades, galeria |
| `/[lang]/career` · `/career/[slug]` | A saída de `experience` com âncoras, e o caso completo de cada posição |
| `/[lang]/blog` · `/blog/[slug]` | Posts do Ghost CMS (ISR, 5 min) em prosa monoespaçada |
| `/[lang]/links` | `cat links.sh`: email, LinkedIn, GitHub, WhatsApp, CV, Instagram, disponibilidade |
| `/[lang]/chat` | Redirect permanente para `/[lang]?cmd=ask` |

### Admin

`/admin` (sem prefixo de idioma) é um backoffice de 18 rotas protegido por NextAuth, fixado na paleta `soft` e sempre escuro: painel do funil, o rastreador de candidaturas em lista e em board, o dossiê completo de uma candidatura, vagas, contatos, CRUD de projetos com upload de capa, gerador de CV / carta de apresentação que usa a base de conhecimento, chaves de API do MCP e a auditoria delas, o log de chat da assistente e as configurações. Login em `/admin/login`, desenhado como um tty.

Ele fala a mesma língua visual do terminal público, e isso é decisão, não enfeite: barra de status em estilo tmux, árvore de diretórios, breadcrumb escrito como o comando que abriu a tela, `cd ..` no rodapé, listagens pintadas como saída de `ls` (etiquetas em colchete como `[applied]`, uma coluna decorativa de índice `001`, colunas monoespaçadas medidas em `ch`), erro de campo impresso como `stderr:` e toast como uma linha de saída. Ele **não** é um terminal: não há prompt para digitar nem motor de comandos — as telas continuam formulários e tabelas. Toda cor sai da paleta Dracula em `src/app/admin/admin.css`, onde cada desvio carrega o contraste medido.

A acessibilidade é mantida em AA também na superfície privada, e medida em vez de suposta. O `scripts/a11y-admin-axe.mjs` dirige o Chrome headless pelas 18 rotas mais os cinco overlays que só existem depois de um clique (o `Sheet` fica de fora enquanto não estiver montado em rota nenhuma; `A11Y_SHEET_PATH=` o traz de volta): axe-core por padrão, `--keyboard` para o percurso de foco (foco sempre visível, sem fuga do diálogo, Escape devolvendo o foco ao gatilho), `--motion` para `prefers-reduced-motion: reduce` (com `--motion no-preference` como controle negativo) e `--width 390` para a varredura estreita. O Lighthouse de acessibilidade dá 100 em `/admin/login` e `/admin/applications`. Como o vocabulário de token do shadcn só resolve dentro de `.admin-root`, o `scripts/check-admin-utilities.ts` roda dentro do `pnpm lint` e reprova o build se uma dessas utilities vazar para o site público.

### SEO e performance

Imagens OpenGraph em estilo terminal por rota e por idioma, sitemap (sem `/chat`), `hreflang` em toda rota pública, JSON-LD de pessoa e site, um único `h1` por página. A home entrega cerca de 24 kB de JavaScript específico (gzip, orçamento de 60 kB), o renderizador de markdown carrega no primeiro `ask`, o `zod` no primeiro `mail`, e a fonte alternativa só é baixada quando selecionada. Lighthouse mobile na home depois da migração (local, mediana de 3 runs): performance 96–97, acessibilidade 100, SEO 100, LCP 1,5 s com throttling devtools, CLS 0.

---

## Comandos

O que o `help` imprime, mais os que ele só menciona em *also try* e os easter eggs que ele não menciona.

| Comando | Aliases | O que faz |
|---|---|---|
| `whoami` | `1`, `about` | Nome, cargo, bio e os quatro números de destaque |
| `experience` | `2`, `career` | Linha do tempo da carreira, mais recente primeiro, com link para cada caso |
| `skills` | `3`, `stack` | Grupos do toolkit e barras de capacidade |
| `projects` | `4`, `work` | Projetos em destaque, numerados; `open <n>` abre um |
| `writing` | `5`, `blog`, `posts` | Posts mais recentes; `read <n>` abre um |
| `contact` | `6` | Email, LinkedIn, GitHub, WhatsApp, CV, disponibilidade, fuso |
| `cv` | `resume` | Abre o PDF em nova aba |
| `mail` | | Envia uma mensagem pelo prompt (interativo) |
| `ask <pergunta>` | | Conversa com a assistente de IA; `ask --new` recomeça |
| `open <n>` · `read <n>` | | Abre o n-ésimo projeto / post da última lista |
| `ls` · `cat <arquivo>` | | O sistema de arquivos fictício: `whoami.txt`, `skills.sys`, `cv.pdf`… |
| `neofetch` | | Info do sistema com o monograma e as amostras da paleta |
| `help` | `?`, `h` | A lista |
| `clear` | `cls`, `Ctrl+L` | Limpa a tela (e esquece a conversa do `ask`) |
| `theme [soft\|classic]` | | Alterna ou define a paleta |
| `font [caskaydia\|daddytime]` | | Alterna ou define a fonte |
| `lang [en\|pt]` | | Troca o idioma (persistido no cookie de locale) |
| `cd <dir>` · `pwd` | | Navega para `projects`, `career`, `blog`, `links`; `cd` ou `cd ~` volta para a home |
| `history` · `uptime` · `date` · `echo` · `whereami` | | Os de sempre |
| `ping` · `git` · `reboot` | | Teste de latência, remotes, roda o boot de novo |
| `sudo` · `rm` · `exit` · `logout` · `hack` | | Experimenta |

A spec completa de cada comando (argumentos, saída, erros) fica em `.docs/design/commands.md` (notas locais de design, não versionadas).

![neofetch](./docs/media/neofetch.png)

---

## Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, `output: standalone`) com React 19 |
| Linguagem | TypeScript 5 |
| Estilo | CSS custom properties (Dracula `soft` / `classic`) + CSS Modules + Tailwind CSS v4 (admin) |
| Fontes | Cascadia Code via `next/font/google` · DaddyTimeMono via `next/font/local` (self-hosted, OFL) |
| Animação | Só CSS (`@keyframes` para boot, entrada de linhas e cursor) |
| i18n | Padrão de dicionários do Next.js (`getDictionary`), roteamento de locale em `src/proxy.ts` |
| Dados | Postgres + pgvector via Prisma 6 (projetos, candidaturas, chunks de conhecimento, log de chat) |
| Auth | NextAuth (Auth.js v5) com Credentials |
| IA | OpenAI Chat Completions + embeddings (RAG sobre `knowledge/`), streaming SSE |
| Blog | Ghost CMS Content API (headless, ISR) |
| Email | Resend (opcional) |
| Testes | Vitest (módulos puros + alguns testes de componente em jsdom) |
| Infra | Imagem Docker multi-stage, Traefik v3 (TLS), deploy via GitHub Actions em EC2 |

---

## Rodando localmente

```bash
# instalar dependências (Node 22, pnpm via corepack)
pnpm install

# subir o servidor de desenvolvimento (http://localhost:5050)
pnpm dev

# lint (eslint + paridade dos dicionários), testes, build de produção
pnpm lint
pnpm test
pnpm build && pnpm start
```

> A porta `5050` é usada porque a `5000` é ocupada pelo AirPlay Receiver do macOS e a `3000` estava instável localmente. Sobrescreva com `next dev -p <porta>`.

### Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `OPENAI_API_KEY` | Opcional. Liga a assistente de verdade por trás do `ask` (e o gerador do admin). Sem ela, `ask` transmite algumas respostas de demonstração. |
| `OPENAI_MODEL` | Opcional. Modelo de chat, padrão `gpt-4o-mini`. |
| `OPENAI_EMBEDDING_MODEL` | Opcional. Modelo de embedding da base de conhecimento, padrão `text-embedding-3-small`. |
| `OPENAI_GENERATOR_MODEL` | Opcional. Modelo do gerador de CV / carta no admin; cai para `OPENAI_MODEL`. |
| `NEXT_PUBLIC_TERMINAL_ASK_FALLBACK` | Opcional, padrão `false`. Com `true`, entrada desconhecida com três ou mais palavras (que não começa com `/`) é encaminhada ao `ask` depois de um aviso. Pública: inlinada no build, então rebuild depois de mudar. |
| `CHAT_RATE_MAX` / `CHAT_RATE_WINDOW_MS` / `CHAT_DAILY_MAX` | Opcional. Limites da assistente: mensagens por visitante por janela (10 / 1 h) e por dia no site inteiro (300). |
| `CHAT_IP_SALT` | **Recomendada em produção**, mín. 16 chars (`openssl rand -base64 32`). Sal secreto do HMAC que pseudonimiza o IP do visitante do chat — o IP cru nunca é gravado. **Ausente: o app sobe assim mesmo**, registra um aviso e usa um sal aleatório por processo; os hashes deixam de ser estáveis entre reinícios e workers, então o limite por visitante zera a cada deploy e o painel para de agrupar as sessões de um mesmo visitante. `CHAT_DAILY_MAX` (teto do site) continua segurando o gasto. |
| `TRUSTED_PROXY_HOPS` | Opcional, padrão `1`, mínimo `1`. Quantos proxies confiáveis existem na frente do app. O IP que serve de chave para todo limite por IP (throttle do login, `/api/mcp`) sai do **último** salto confiável do `X-Forwarded-For`, nunca do primeiro elemento, que é o que o cliente escreve. Ausente: `1`, o valor certo para a stack atual (só o Traefik). Com um CDN/WAF na frente isto tem que virar `2` no mesmo commit, senão esses limites voltam a ser contornáveis. |
| `LOGIN_TRUSTED_PROXY_HOPS` | Opcional. Sobrescreve `TRUSTED_PROXY_HOPS` só para o throttle do login. Ausente (ou inválida): cai em `TRUSTED_PROXY_HOPS` e, sem ele, em `1`. |
| `RESEND_API_KEY` | Opcional. Com ela, `mail` envia emails de verdade. Sem ela, o payload é logado no servidor e a linha de sucesso ainda aparece. |
| `GHOST_URL` / `GHOST_CONTENT_API_KEY` | Opcional. Instância Ghost para `writing` e `/blog`. Sem elas, posts mock são servidos. |
| `DATABASE_URL` | String de conexão Postgres (com pgvector). Obrigatória para o admin, a base de conhecimento e o rate limit em banco; todo caminho de leitura público cai para conteúdo estático quando ela falta. |
| `AUTH_SECRET` | Obrigatória para o admin. Gere com `openssl rand -base64 32`. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Lidas por `prisma/seed.ts` (`pnpm db:seed`) para criar o usuário admin. |
| `UPLOAD_DIR` | Opcional. Onde os uploads do admin são gravados; a imagem Docker define `/data/uploads`. |

Copie `.env.example` para `.env.local` e preencha só o que precisar. `.env.local` é ignorado pelo git; `.env.example` documenta tudo o que o app lê em runtime.

### Banco, seed e base de conhecimento

```bash
pnpm db:up        # container pgvector local na porta 5433 (ou aponte DATABASE_URL para o seu Postgres)
pnpm db:migrate   # prisma migrate dev
pnpm db:seed      # usuário admin + projetos iniciais
pnpm db:ingest    # embeda knowledge/**/*.md no pgvector (precisa de OPENAI_API_KEY)
pnpm db:studio    # Prisma Studio
```

`knowledge/` guarda o CV e os dossiês de projeto de onde a assistente responde; só o README dela é versionado (veja [`knowledge/README.md`](./knowledge/README.md)).

### Deploy

A stack de produção (imagem Docker, Traefik, Postgres, GitHub Actions → EC2) está documentada em [`DEPLOY.md`](./DEPLOY.md).

---

## Estrutura do projeto

```
src/
├── app/
│   ├── globals.css                 # tokens Dracula (soft/classic), fontes, estilos base
│   ├── fonts.ts · fonts/           # Cascadia Code (Google) + DaddyTimeMono (self-hosted, OFL)
│   ├── manifest.ts · robots.ts · sitemap.ts
│   ├── _actions/                   # server actions: contato, auth, CRUD do admin, gerador
│   ├── api/chat/route.ts           # assistente em streaming (RAG + rate limit + fallback mock)
│   ├── api/admin/upload/route.ts   # upload de capas
│   ├── admin/                      # o backoffice (sem [lang]): 18 rotas + admin.css, os valores de token do shadcn
│   └── [lang]/
│       ├── layout.tsx              # html, fontes, ThemeProvider, metadata, JSON-LD
│       ├── (terminal)/page.tsx     # a home: carrega TerminalData, renderiza MOTD + whoami no servidor
│       ├── (pages)/                # rotas internas com o chrome do terminal
│       │   ├── projects/ · career/ · blog/ · links/
│       │   └── */opengraph-image.tsx
│       └── chat/route.ts           # 308 → /[lang]?cmd=ask
├── components/
│   ├── terminal/
│   │   ├── terminal-app.tsx        # registra comandos de conteúdo + mail + ask + nav, monta o shell
│   │   ├── terminal-shell.tsx      # barra + menu + tela + prompt + overlay de boot
│   │   ├── use-terminal.ts         # adaptador React: linhas, histórico, autocomplete, atalhos, sessão
│   │   ├── boot-overlay.tsx · status-bar.tsx · command-menu.tsx · screen.tsx · prompt.tsx
│   │   ├── output.tsx · line.tsx · primitives.tsx · markdown.tsx · motd.tsx · initial-output.tsx
│   │   ├── page-chrome.tsx · page-footer.tsx · route-chrome.ts · route-focus.ts
│   │   └── terminal.module.css · page.module.css · prose.css
│   ├── theme-provider.tsx          # estado de paleta + fonte, script de boot pré-hidratação
│   ├── admin/                      # o backoffice: moldura de terminal, listagens, formulários, diálogos, kanban
│   └── ui/                         # primitives shadcn — importados só pelo /admin (ver check-admin-utilities)
├── lib/
│   ├── terminal/
│   │   ├── types.ts · registry.ts · parse.ts · complete.ts · history.ts · run.ts
│   │   ├── content-commands.tsx    # whoami … neofetch
│   │   ├── system-commands.tsx     # help, clear, theme, font, history, piadas
│   │   ├── nav-commands.tsx        # cd, pwd, lang
│   │   ├── ask-command.tsx · mail-command.tsx
│   │   ├── data.ts                 # monta TerminalData no servidor
│   │   ├── deeplink.ts · session.ts · anchors.ts · locale.ts · files.ts · listings.tsx · rich.tsx
│   ├── projects-repo.ts · projects.ts · timeline.ts · toolkit.ts · site.ts · ghost.ts
│   ├── chat-client.ts · chat-system-prompt.ts · chat-log.ts · rag.ts · embeddings.ts · rate-limit.ts
│   ├── contact-schema.ts · seo.ts · og.tsx · db.ts · auth.ts · uploads.ts
├── dictionaries/en.json · pt-BR.json
├── i18n/config.ts
└── proxy.ts                        # roteamento de locale (o middleware do Next 16)
prisma/                             # schema, migrations, seed
scripts/                            # check-dictionaries, check-admin-utilities (lint), ingest-knowledge,
                                    # check-commands-doc, a11y-admin-axe, a11y-dialog-accname
knowledge/                          # CV + dossiês de projeto para a assistente (ignorado pelo git)
```

---

## Convenções

- Commits seguem o [Conventional Commits](https://www.conventionalcommits.org).
- Nomes de comandos e arquivos do terminal ficam em inglês nos dois idiomas; só descrições e mensagens são traduzidas, e `pnpm lint` falha quando os dois dicionários divergem.
- Sem `innerHTML`: toda linha de saída é um nó React, e tudo o que o visitante digita é exibido literalmente.
- Conteúdo mora em `lib/` e nos dicionários; `lib/terminal` só formata.
- Animações respeitam `prefers-reduced-motion` nas duas superfícies, e as do admin são conferidas contra um controle negativo (`node scripts/a11y-admin-axe.mjs --motion` / `--motion no-preference`).
- O vocabulário de token do shadcn é exclusivo do admin; o `pnpm lint` reprova quando ele vaza para o site público.

---

## Licença

O código-fonte é distribuído sob a licença MIT. O texto pessoal, o CV e a base de conhecimento são © Marco Filho — por favor, não reutilize sem permissão. Fontes: Cascadia Code (OFL 1.1) e DaddyTimeMono (OFL 1.1), licenças ao lado dos arquivos em `src/app/fonts/`.

---

Feito com carinho por [Marco Filho · @maarkn](https://linkedin.com/in/maarkn).
