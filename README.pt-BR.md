# maarkn.dev

> Portfólio pessoal do **Marco Filho** — engenheiro fullstack sênior trabalhando remotamente do Brasil.

`maarkn.dev` é o cartão de visita digital do [@maarkn](https://github.com/maarkn): um lugar onde recrutadores, hiring managers e clientes potenciais conseguem entender rápido quem eu sou, o que eu construí e como me chamar. O site também é um pequeno laboratório onde eu testo ideias — transições animadas, temas, chat com IA, design tokens — em vez de só ler sobre elas.

[Read this in English →](./README.md)

---

## O que tem aqui

O projeto é uma aplicação [Next.js 16](https://nextjs.org) escrita em TypeScript, estilizada com [Tailwind CSS v4](https://tailwindcss.com) e animada com [Framer Motion](https://www.framer.com/motion/). É um site totalmente estático, internacionalizado, com três temas (Claro, Escuro e um modo Dev neon) e foi pensado pra crescer e virar um pequeno CMS ao longo do tempo.

### Já entregue

- **Internacionalização** — inglês (padrão) e português brasileiro, servidos a partir de rotas com segmento `[lang]` e detecção de idioma por `Accept-Language`.
- **Design system com 3 temas** — Claro, Escuro e Dev (verde neon com scanlines sutis), persistido no `localStorage` com script de inicialização pré-hidratação que evita o flash do escuro pro claro.
- **Hero** — selo de disponibilidade, headline em três linhas com linguagem acessível, CTAs primário e secundário, e um cartão de identidade lateral que faz crossfade entre três retratos dependendo do tema ativo.
- **Big Numbers** — quatro contadores que animam a primeira vez que a seção entra na viewport.
- **Sobre** — bio em linguagem não-técnica, quatro valores de trabalho e linha do tempo de carreira animada.
- **Toolkit** — seis cards agrupados cobrindo Frontend, Backend, Mobile, Dados, Infra e Práticas, com selo de anos de experiência por tag.
- **Footer + sociais** — LinkedIn, GitHub, email e WhatsApp, com SVGs inline para os ícones de marca que o lucide v1 removeu.
- **Trabalhos selecionados** — oito projetos curados com capas CSS estilizadas na home, mais a rota dedicada `/projects` com filtro por categoria e páginas individuais em `/projects/[slug]` (descrição, papel desempenhado, funcionalidades-chave, stack e links).
- **Contato** — seção `#contact` na home com formulário ligado a uma server action (nome, email, empresa, tipo de projeto, mensagem), validação inline, estado de sucesso, anti-spam por honeypot, exibição do timezone em tempo real e três canais alternativos. Conecta automaticamente ao [Resend](https://resend.com) quando `RESEND_API_KEY` está definida; senão, faz log da requisição no servidor.
- **Página de links** — hub estilo Linktree em `/links` com layout próprio: foto theme-aware, badge de disponibilidade, pilha vertical de botões (LinkedIn, GitHub, Email, WhatsApp, CV) e glow do accent sobre o grid.
- **Assistente de IA** — botão flutuante (visível no site inteiro) e rota dedicada `/chat`, ambos servidos por `/api/chat` com streaming token-a-token via Server-Sent Events. Usa a Chat Completions API da OpenAI (`gpt-4o-mini` por padrão), com system prompt curado a partir do resume e projetos do Marco, rate limit in-memory por IP (10 mensagens / hora), prompts sugeridos, controles de stop / nova conversa, e modo offline que produz respostas em streaming mockadas quando não há API key configurada.
- **Blog** — integração headless com [Ghost CMS](https://ghost.org) via Content API. `/blog` lista todos os posts com capa estilizada, tempo de leitura, data e tags; `/blog/[slug]` renderiza o post com tipografia editorial (h2/h3, code blocks, blockquotes, listas). Páginas usam ISR com janela de revalidação de cinco minutos, então post novo aparece sem redeploy. Sem `GHOST_URL` e `GHOST_CONTENT_API_KEY`, o app serve uma seleção de posts mockados pra UI continuar funcionando em dev e preview.
- **Painel admin (fase 7.A)** — `/admin` autenticado com [NextAuth](https://authjs.dev) + [Prisma](https://www.prisma.io) + Postgres. Login em `/admin/login`, gestão do catálogo de projetos (criar / editar / deletar) com formulário tipado (validação Zod, slug único, tags, picker de gradiente), e `npm run db:seed` importa os oito projetos iniciais e cria o usuário admin a partir do `.env.local`. A read-path pública continua lendo de `lib/projects.ts` — migrar é a fase 7.B.

### No roadmap

- **Painel admin fase 7.B** — Migra a read-path pública pro Postgres, adiciona upload de imagens via S3 e amarra configurações de conteúdo (Big Numbers, system prompt da IA, arquivo do CV).
- **SEO + Analytics** — OpenGraph dinâmico, sitemap, JSON-LD e Vercel Analytics.

Este README será atualizado conforme cada item for entregue.

---

## Stack técnica

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) com React 19 |
| Linguagem | TypeScript 5 |
| Estilos | Tailwind CSS v4 + tokens CSS próprios |
| Animação | Framer Motion |
| Ícones | lucide-react v1 + SVG inline para brand icons |
| Tipografia | Inter, Space Grotesk e JetBrains Mono via `next/font` |
| i18n | Padrão nativo de dicionários do Next.js (`getDictionary`) |

O status completo da implementação (incluindo o restante da stack planejada: PostgreSQL, Prisma, Ghost CMS, NextAuth, S3, Traefik, EC2) vive no PRD do projeto, fora deste repositório.

---

## Rodando localmente

```bash
# instalar dependências
npm install

# iniciar o dev server (http://localhost:5050)
npm run dev

# build de produção
npm run build

# servir o build de produção
npm start
```

> A porta `5050` é usada porque a `5000` é ocupada pelo AirPlay Receiver do macOS e a `3000` ficou instável no ambiente local do autor. Use `next dev -p <porta>` pra trocar.

### Variáveis de ambiente

| Variável | Pra que serve |
|---|---|
| `OPENAI_API_KEY` | Opcional. Quando setada, o assistente chama a Chat Completions API da OpenAI. Sem ela, o endpoint de chat devolve um conjunto pequeno de respostas mockadas em streaming pra UI continuar funcionando em dev e preview. |
| `OPENAI_MODEL` | Opcional. Modelo usado pelo assistente. Padrão `gpt-4o-mini`. |
| `RESEND_API_KEY` | Opcional. Quando setada, o formulário de contato envia emails reais via API do [Resend](https://resend.com). Sem ela, o submit é logado no servidor e o estado de sucesso continua aparecendo — útil em dev e preview. |
| `GHOST_URL` | Opcional. URL base da instância do Ghost CMS de onde o blog lê (exemplo: `https://cms.maarkn.dev`). |
| `GHOST_CONTENT_API_KEY` | Opcional. Content API key gerada por uma integração no Ghost. Sem ela, `/blog` cai num pequeno conjunto de posts mockados. |
| `DATABASE_URL` | Obrigatório pro painel admin em `/admin`. Padrão `file:./dev.db` (SQLite, resolve em `prisma/dev.db`). Troque por uma connection string de Postgres e atualize o `provider` em `prisma/schema.prisma` pra migrar. |
| `AUTH_SECRET` | Obrigatório pro painel admin. Gere com `openssl rand -base64 32`. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Lidos pelo `prisma/seed.ts` em `npm run db:seed` pra criar o usuário admin inicial. |

Copie `.env.example` pra `.env.local` e preencha só as variáveis que precisar. `.env.local` é gitignored; `.env.example` é a fonte da verdade do que o app lê em runtime.

### Subindo o painel admin localmente

O setup padrão usa **SQLite** pra você rodar o admin sem Docker e fazer deploy direto na Vercel. Postgres-via-Docker fica documentado mais abaixo como caminho de upgrade.

```bash
# 1. copie o template de env e preencha AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
cp .env.example .env.local
# gere o AUTH_SECRET com: openssl rand -base64 32

# 2. cria o banco SQLite e aplica as migrations
npm run db:migrate

# 3. semeia os oito projetos iniciais + o usuário admin
npm run db:seed

# 4. inicia o dev server e logue em /admin
npm run dev
```

`npm run db:studio` abre o Prisma Studio pra inspecionar o banco visualmente.

### Deploy na Vercel

O banco SQLite padrão vive dentro do artefato de deploy, então **leituras funcionam na Vercel, mas writes do admin não persistem entre requests** (o filesystem das functions é read-only). Pra um portfolio que é mostrado mais do que editado, esse é o caminho mais simples e barato. Pra habilitar writes em produção:

- **Turso / libSQL** (recomendado) — mantém o schema SQLite, troca o driver do Prisma pelo libSQL adapter e aponta `DATABASE_URL` pro seu banco Turso.
- **Postgres** — use o `docker-compose.yml` local, e em prod aponte `DATABASE_URL` pra um Postgres hospedado (Neon, Supabase, Railway). Troque `provider = "sqlite"` por `"postgresql"` no `prisma/schema.prisma`, remova os helpers de TEXT-com-JSON em `lib/json-list.ts`, e migra de novo.

### Alternativa Postgres (Docker)

```bash
npm run db:up         # sobe o Postgres 17 do docker-compose.yml
# no prisma/schema.prisma troque provider pra "postgresql"
# no .env.local, set DATABASE_URL=postgresql://maarkn:maarkn@localhost:5432/maarkn_dev
npm run db:migrate
npm run db:seed
```

`npm run db:down` para o container sem apagar os dados.

---

## Estrutura do projeto

```
src/
├── app/
│   ├── globals.css              # design tokens (Claro/Escuro/Dev) e estilos base
│   ├── _actions/contact.ts      # server action do formulário de contato
│   ├── _actions/admin-projects.ts # server actions de CRUD do admin
│   ├── _actions/auth.ts         # server actions signIn / signOut
│   ├── api/auth/[...nextauth]/route.ts # handler do Auth.js
│   ├── api/chat/route.ts        # endpoint de chat com streaming (OpenAI + fallback mock)
│   ├── admin/                   # tooling /admin protegido (sem [lang])
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── page.tsx             # dashboard / lista de projetos
│   │   └── projects/
│   │       ├── new/page.tsx
│   │       └── [id]/edit/page.tsx
│   └── [lang]/
│       ├── layout.tsx           # html, fontes, ThemeProvider, ChatLauncher, metadata
│       ├── page.tsx             # compõe as seções da home
│       ├── chat/page.tsx        # página dedicada do assistente
│       ├── links/page.tsx       # hub estilo Linktree
│       ├── blog/
│       │   ├── page.tsx         # listagem do blog (via Ghost)
│       │   └── [slug]/page.tsx  # detalhe de cada post
│       └── projects/
│           ├── page.tsx         # listagem completa com filtro por categoria
│           └── [slug]/page.tsx  # página individual de cada projeto
├── components/
│   ├── nav.tsx
│   ├── theme-{provider,switcher,photo}.tsx
│   ├── lang-switcher.tsx
│   ├── hero.tsx
│   ├── identity-card.tsx
│   ├── big-numbers.tsx
│   ├── about.tsx
│   ├── toolkit.tsx
│   ├── projects.tsx
│   ├── project-card.tsx
│   ├── projects-filter.tsx
│   ├── project-detail.tsx
│   ├── contact.tsx
│   ├── links-hub.tsx
│   ├── chat/
│   │   ├── chat-launcher.tsx    # botão flutuante + painel animado
│   │   ├── chat-panel.tsx       # lista de mensagens, sugestões, composer
│   │   └── use-chat-stream.ts   # hook que consome SSE
│   ├── blog/
│   │   ├── post-card.tsx        # card da listagem
│   │   ├── post-cover.tsx       # feature image ou gradiente estilizado
│   │   └── post-content.tsx     # wrapper de tipografia editorial pro HTML do Ghost
│   ├── admin/
│   │   ├── admin-shell.tsx      # header + nav do /admin
│   │   ├── login-form.tsx
│   │   ├── project-form.tsx     # form de criar + editar
│   │   ├── delete-project-button.tsx
│   │   └── logout-button.tsx
│   ├── socials.tsx
│   └── footer.tsx
├── dictionaries/
│   ├── en.json
│   └── pt-BR.json
├── i18n/
│   └── config.ts                # helpers getDictionary + hasLocale
├── lib/
│   ├── utils.ts                 # helper cn()
│   ├── site.ts                  # constantes globais do site
│   ├── timeline.ts              # dados da linha do tempo de carreira
│   ├── toolkit.ts               # stack agrupada
│   ├── projects.ts              # catálogo de projetos (estático, pré-CMS)
│   ├── chat-system-prompt.ts    # persona + contexto do assistente
│   ├── rate-limit.ts            # rate limiter in-memory por IP
│   ├── ghost.ts                 # cliente da Ghost Content API + posts mockados offline
│   ├── db.ts                    # singleton do Prisma + flag db-configured
│   ├── auth.ts                  # configuração do NextAuth (Auth.js v5)
│   └── auth/handlers.ts         # re-export dos handlers GET / POST do Auth.js
└── proxy.ts                     # roteamento de idioma (renomeado de middleware no Next 16)
prisma/
├── schema.prisma                # models User + Project
└── seed.ts                      # semeia o usuário admin + projetos iniciais
docker-compose.yml               # Postgres local pro painel admin
```

---

## Convenções

- Commits seguem a especificação [Conventional Commits](https://www.conventionalcommits.org), validados pelo commitlint.
- Os textos voltados a recrutadores e clientes são escritos em linguagem acessível; jargão de dev fica em código, tags e títulos de seção.
- As animações respeitam `prefers-reduced-motion`.

---

## Licença

O código-fonte é distribuído sob a [Licença MIT](./LICENSE). As fotos e os textos pessoais são © Marco Filho — por favor, não reutilize sem permissão.

---

Feito com cuidado por [Marco Filho · @maarkn](https://linkedin.com/in/maarkn).
