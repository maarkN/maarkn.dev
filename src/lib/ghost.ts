import "server-only";

export type Tag = { name: string; slug: string };

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  html: string;
  publishedAt: string;
  readingTime: number;
  tags: Tag[];
  /** Pair of accent colors for the stylized cover when no feature image exists. */
  cover: { from: string; to: string; monogram: string };
  /** Optional Ghost feature image url. */
  featureImage?: string;
};

const GHOST_URL = process.env.GHOST_URL?.replace(/\/$/, "");
const GHOST_KEY = process.env.GHOST_CONTENT_API_KEY;

const isLive = (): boolean => Boolean(GHOST_URL && GHOST_KEY);

const FETCH_INIT: RequestInit = {
  next: { revalidate: 300, tags: ["ghost-posts"] },
};

const FIELDS =
  "id,uuid,title,slug,html,feature_image,featured,excerpt,custom_excerpt,reading_time,published_at,tags";

type GhostTag = { name?: string; slug?: string };

type GhostPost = {
  slug: string;
  title: string;
  html?: string | null;
  feature_image?: string | null;
  excerpt?: string | null;
  custom_excerpt?: string | null;
  reading_time?: number | null;
  published_at?: string | null;
  tags?: GhostTag[] | null;
};

function gradientFor(slug: string): { from: string; to: string; monogram: string } {
  const palettes = [
    { from: "#4f6ef7", to: "#22d3ee" },
    { from: "#22c55e", to: "#84cc16" },
    { from: "#f97316", to: "#fb7185" },
    { from: "#a855f7", to: "#ec4899" },
    { from: "#facc15", to: "#22d3ee" },
    { from: "#7b93ff", to: "#a78bfa" },
  ];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const palette = palettes[h % palettes.length]!;
  const monogram = slug
    .replace(/[^a-z]/gi, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "MK";
  return { ...palette, monogram };
}

function adapt(p: GhostPost): Post {
  return {
    slug: p.slug,
    title: p.title,
    html: p.html ?? "",
    excerpt: (p.custom_excerpt ?? p.excerpt ?? "").trim(),
    readingTime: typeof p.reading_time === "number" ? p.reading_time : 0,
    publishedAt: p.published_at ?? new Date().toISOString(),
    tags:
      p.tags
        ?.filter((t): t is { name: string; slug: string } =>
          Boolean(t?.name && t?.slug)
        )
        .map((t) => ({ name: t.name, slug: t.slug })) ?? [],
    cover: gradientFor(p.slug),
    featureImage: p.feature_image ?? undefined,
  };
}

export async function getPosts(limit = 12): Promise<Post[]> {
  if (!isLive()) return MOCK_POSTS.slice(0, limit);

  try {
    const url = new URL(`${GHOST_URL}/ghost/api/content/posts/`);
    url.searchParams.set("key", GHOST_KEY!);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("include", "tags");
    url.searchParams.set("fields", FIELDS);
    const res = await fetch(url, FETCH_INIT);
    if (!res.ok) {
      console.error("[ghost] list failed", res.status);
      return MOCK_POSTS.slice(0, limit);
    }
    const data = (await res.json()) as { posts?: GhostPost[] };
    return (data.posts ?? []).map(adapt);
  } catch (err) {
    console.error("[ghost] list threw", err);
    return MOCK_POSTS.slice(0, limit);
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (!isLive()) return MOCK_POSTS.find((p) => p.slug === slug) ?? null;

  try {
    const url = new URL(`${GHOST_URL}/ghost/api/content/posts/slug/${slug}/`);
    url.searchParams.set("key", GHOST_KEY!);
    url.searchParams.set("include", "tags");
    url.searchParams.set("fields", FIELDS);
    const res = await fetch(url, FETCH_INIT);
    if (!res.ok) return MOCK_POSTS.find((p) => p.slug === slug) ?? null;
    const data = (await res.json()) as { posts?: GhostPost[] };
    const post = data.posts?.[0];
    return post ? adapt(post) : null;
  } catch (err) {
    console.error("[ghost] slug threw", err);
    return MOCK_POSTS.find((p) => p.slug === slug) ?? null;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  const posts = await getPosts(100);
  return posts.map((p) => p.slug);
}

/* ────────────────────────────────────────────────────────────
   MOCK CONTENT — used until a real Ghost instance is wired up.
   ──────────────────────────────────────────────────────────── */

const MOCK_POSTS: Post[] = [
  {
    slug: "from-faq-trees-to-rag",
    title: "From FAQ trees to RAG: what changed in my chatbots",
    excerpt:
      "I used to build chatbots as decision trees. Then a vector store and a few well-named files made everything I'd written feel like 1998. A field note on what works.",
    publishedAt: "2026-04-12T14:00:00.000Z",
    readingTime: 5,
    tags: [
      { name: "AI", slug: "ai" },
      { name: "RAG", slug: "rag" },
    ],
    cover: gradientFor("from-faq-trees-to-rag"),
    html: `
<p>For a long time, every chatbot I built was a decision tree wearing different costumes. The user typed something, a router matched a regex, a function fired. It worked — and it broke at every edge case the customer hadn't predicted in our weekly meeting.</p>
<p>Then I rebuilt one of those bots around a vector store. The customer's content went in as embeddings. The bot answered from retrieval, not from a tree. Suddenly, "what time does the cultural museum open on Sundays" worked. So did "minha conta foi bloqueada, e agora?". And so did the question I never thought to anticipate.</p>
<h2>The pattern that worked for me</h2>
<p>Three pieces, all boring on purpose:</p>
<ol>
  <li>Crawl or import the customer's content into a structured store.</li>
  <li>Embed it. Keep the chunks small but the metadata rich.</li>
  <li>Retrieve top-K, prompt with strict instructions about not inventing.</li>
</ol>
<p>What unlocked quality wasn't a fancy model. It was content. The richer the source, the more the bot felt like a junior employee who actually read the manual.</p>
<h2>Where I'd still use a tree</h2>
<p>Anywhere money or identity is on the line. RAG is great for explaining; it's bad for transferring funds. The boring router still has its place — it just doesn't have to be the whole product anymore.</p>
`,
  },
  {
    slug: "shipping-with-three-themes",
    title: "Shipping a portfolio with three themes and zero design system library",
    excerpt:
      "Tailwind v4, CSS variables, and three carefully picked palettes. Why I skipped shadcn for this one and built primitives by hand.",
    publishedAt: "2026-04-19T09:00:00.000Z",
    readingTime: 4,
    tags: [
      { name: "Frontend", slug: "frontend" },
      { name: "Design", slug: "design" },
    ],
    cover: gradientFor("shipping-with-three-themes"),
    html: `
<p>This site has a Light theme, a Dark theme, and a Dev theme — neon green, soft scanlines, an easter egg I'd want to find. All three swap by setting one attribute on <code>&lt;html&gt;</code>. No theming library. No styled-components. No prop-drilling.</p>
<p>Tailwind v4's <code>@theme inline</code> meets a tidy <code>data-theme</code> selector and you get a system that's small enough to read in one sitting.</p>
<pre><code>:root,
[data-theme="dark"] {
  --bg:        #0a0a0b;
  --accent:    #4f6ef7;
}

[data-theme="light"] {
  --bg:        #f0f4ff;
  --accent:    #2547d8;
}</code></pre>
<p>Skipping shadcn was a deliberate choice. The components I needed were small (badge, button, field, modal) and writing them gave me total control over the visual language. shadcn/Radix will earn its keep when the admin CMS lands and I need real comboboxes and dialogs.</p>
`,
  },
  {
    slug: "voip-from-scratch",
    title: "What I learned building a VoIP product from scratch",
    excerpt:
      "Real-time provisioning, transcription, multitenancy and the audio knob nobody told me about. Eleven months of lessons from leading the architecture of Nectar's VoIP.",
    publishedAt: "2026-03-28T16:00:00.000Z",
    readingTime: 7,
    tags: [
      { name: "Backend", slug: "backend" },
      { name: "Architecture", slug: "architecture" },
    ],
    cover: gradientFor("voip-from-scratch"),
    html: `
<p>VoIP looks deceptively simple from the outside. People talk, computers route, money is charged. From the inside it's a minefield of provisioning races, codec choices, and the kind of bugs that only happen at 11:47 PM in Belém.</p>
<h2>Three lessons I keep coming back to</h2>
<p><strong>Provisioning is harder than the product.</strong> Onboarding a new customer means picking DIDs, configuring extensions, setting billing rules — all in real time. We learned to make every state transition idempotent. If the operator hits "save" twice, the system shrugs.</p>
<p><strong>Audio is a knob, not a switch.</strong> We optimized bandwidth without losing quality, and the negotiation between codecs gave us back 30% of audio costs. The knob was hiding behind a four-line config in Asterisk.</p>
<p><strong>Multitenancy is a discipline, not a feature.</strong> Every query had to be scoped, every cache key namespaced, every webhook signed. We didn't get this right on day one. We rewrote the cache layer twice.</p>
<p>If you're building real-time products: respect the protocol, distrust the network, and budget for one rewrite of the part you were most confident about.</p>
`,
  },
  {
    slug: "pragmatic-over-perfect",
    title: "Pragmatic over perfect",
    excerpt:
      "A short essay on why I ship the simplest thing that solves the problem, then iterate when reality pushes back — and why this is harder than it sounds.",
    publishedAt: "2026-03-05T10:00:00.000Z",
    readingTime: 3,
    tags: [{ name: "Practice", slug: "practice" }],
    cover: gradientFor("pragmatic-over-perfect"),
    html: `
<p>The default answer for most engineering problems is "it depends". The pragmatic answer is "what's the smallest thing we can ship that we'll regret the least?".</p>
<p>I came up through teams where shipping fast and shipping correctly were treated as opposites. They aren't. Pragmatic isn't sloppy. It's choosing the right level of commitment for what you actually know.</p>
<p>If we don't know whether anyone wants the feature, write the boring version. If we know they do but the load is unproven, scaffold the right shape now and tune later. If the regulator is looking, lean perfect.</p>
<p>The mistake isn't aiming low. It's aiming uniformly. Calibrate.</p>
`,
  },
  {
    slug: "when-to-leave-the-monolith",
    title: "When to actually leave the monolith",
    excerpt:
      "I've migrated a few services to microservices. Most of those migrations didn't have to happen. Here's the litmus test I now use before recommending the split.",
    publishedAt: "2026-02-14T11:00:00.000Z",
    readingTime: 6,
    tags: [
      { name: "Architecture", slug: "architecture" },
      { name: "Scaling", slug: "scaling" },
    ],
    cover: gradientFor("when-to-leave-the-monolith"),
    html: `
<p>Microservices are the spinach of our industry. Everyone says they're good for you, nobody asks if you'd rather have a salad.</p>
<p>I've worked on three migrations from monolith to microservices. Two of them were premature. The teams were small, the deploys were fine, the bottleneck wasn't architectural. We split anyway, and inherited a network where there used to be a function call.</p>
<h2>The litmus test</h2>
<p>I now ask three questions before recommending a split:</p>
<ul>
  <li>Are different parts of the system on different release cadences? Not "could be" — actually are.</li>
  <li>Do different teams own different domains, and are they blocking each other?</li>
  <li>Is there a part of the system whose scaling shape is genuinely different from the rest?</li>
</ul>
<p>If two of three answers are yes, split. Otherwise: the monolith you have is the easier one to evolve. A clean module is worth more than a clever service mesh.</p>
`,
  },
];
