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

### No roadmap

- **Chat com IA** — widget flutuante com a [API da Claude](https://www.anthropic.com/api), respostas em streaming e rate limiting por IP.
- **Blog** — integração headless com [Ghost CMS](https://ghost.org).
- **CMS administrativo** — NextAuth + Prisma + Postgres pra gerenciar projetos e conteúdo.
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
| `RESEND_API_KEY` | Opcional. Quando setada, o formulário de contato envia emails reais via API do [Resend](https://resend.com). Sem ela, o submit é logado no servidor e o estado de sucesso continua aparecendo — útil em dev e preview. |

---

## Estrutura do projeto

```
src/
├── app/
│   ├── globals.css              # design tokens (Claro/Escuro/Dev) e estilos base
│   ├── _actions/contact.ts      # server action do formulário de contato
│   └── [lang]/
│       ├── layout.tsx           # html, fontes, ThemeProvider, metadata
│       ├── page.tsx             # compõe as seções da home
│       ├── links/page.tsx       # hub estilo Linktree
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
│   └── projects.ts              # catálogo de projetos (estático, pré-CMS)
└── proxy.ts                     # roteamento de idioma (renomeado de middleware no Next 16)
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
