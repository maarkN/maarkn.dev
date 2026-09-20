import sanitizeHtml from "sanitize-html";

/**
 * Sanitizacao do HTML que o Ghost devolve, antes do `dangerouslySetInnerHTML`
 * de `/[lang]/blog/[slug]`.
 *
 * POR QUE ISTO NAO E "BAIXA". O Ghost e uma origem EXTERNA (CMS hospedado,
 * com sua propria superficie de login e sua propria lista de CVEs), e o post
 * entrava cru no MESMO documento e na MESMA origem onde vive `/admin`,
 * cujo cookie de sessao do next-auth acompanha qualquer `fetch` same-origin
 * disparado por script injetado. Um unico post com `<script>` transforma
 * "comprometeram o blog" em "comprometeram o backoffice": o payload navega
 * para `/admin/...`, le a resposta e exfiltra — sem nunca ver o cookie, que
 * pode ser `httpOnly` a vontade. Por isso a sanitizacao acontece aqui, no
 * servidor: ela e a defesa PRIMARIA. Um `Content-Security-Policy` (mesmo o
 * `script-src 'self'`) e camada de contencao em cima disto, nunca no lugar
 * disto — um payload `<script src="/…">` ou um `<a href="javascript:">` nao
 * dependem de inline script para doer.
 *
 * POR QUE `sanitize-html` E NAO `DOMPurify`. O conteudo e renderizado num
 * Server Component (Node runtime): o DOMPurify precisa de um DOM, ou seja de
 * `jsdom` (ou `isomorphic-dompurify`, que o embute) em DEPENDENCIA DE
 * PRODUCAO — ~6 MB para parsear HTML no servidor, num projeto que so tem
 * `jsdom` em `devDependencies`. O `sanitize-html` e allowlist-first, parseia
 * com `htmlparser2` puro em Node, trata `srcset` e esquemas por atributo, e
 * nao arrasta DOM nenhum. O preco: nao roda no runtime edge — esta pagina roda
 * em Node (`revalidate = 300`, sem `runtime = "edge"`).
 *
 * A allowlist e conservadora e deliberada: passa o que um post de blog precisa
 * (titulos, paragrafos, enfase, codigo, citacao, lista, tabela, imagem, link,
 * figura/legenda) e descarta o resto — inclusive `<iframe>`, `<video>` e
 * `<style>`, que o `.prose-term` estiliza mas que nenhum post usa hoje.
 * Reabrir `<iframe>` para embeds (YouTube etc.) e decisao do dono e exige
 * allowlist de host no `src`, nao so de esquema.
 *
 * ---------------------------------------------------------------------------
 * `id`: nota de rodape sem reabrir DOM clobbering
 * ---------------------------------------------------------------------------
 * Nota de rodape e um par de ANCORAS: sem `id` o link `[1]` nao vai a lugar
 * nenhum e o `↩︎` nao volta. Cortar `id` de tudo menos `<h1>`–`<h6>` quebrou
 * post legitimo. Mas `id` livre tambem nao serve: DOM clobbering e isto — um
 * `<a id="config">` num post cria `window.config`, e qualquer codigo da pagina
 * que leia um global (ou `document.<nome>`) passa a ler um NO que o autor do
 * post escolheu. O post vem de fora; o `id` e o nome de uma variavel global.
 *
 * A saida aqui e a lista fechada: `id` volta em `a`/`li`/`section`/`sup`, mas
 * so com o valor que o Ghost REALMENTE gera para nota de rodape. O card de
 * markdown do Ghost renderiza com `markdown-it` + `markdown-it-footnote` v4
 * (`@tryghost/kg-markdown-html-renderer`), e chama `render(markdown)` sem
 * `env`, entao o plugin nunca aplica o prefixo `docId`. O que sai e sempre:
 *
 *     <sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>
 *     <hr class="footnotes-sep">
 *     <section class="footnotes"><ol class="footnotes-list">
 *       <li id="fn1" class="footnote-item"><p>nota
 *         <a href="#fnref1" class="footnote-backref">↩︎</a></p></li>
 *     </ol></section>
 *
 * com `:<n>` acrescentado quando a MESMA nota e citada outra vez (`fnref1:1`).
 * O numero e o indice da nota, nunca texto do autor: por isso da para exigir o
 * formato inteiro em vez de adivinhar um prefixo. Qualquer outro `id` nesses
 * quatro elementos e descartado — `<li id="__proto__">` e `<a id="length">`
 * nao sobrevivem, e o `href="#..."` que ficar orfao e so um link morto.
 *
 * `<h1>`–`<h6>` seguem com `id` livre, e isso e DELIBERADO: o slug do titulo e
 * o alvo de toda URL `…/post#secao` ja compartilhada, entao filtrar ou
 * prefixar ali quebraria deep link publico. Continua sendo a superficie de
 * clobbering que resta neste arquivo; fecha-la exige decidir o que fazer com
 * os links existentes, o que e mudanca de produto e nao de sanitizacao.
 */

/** Esquemas aceitos em `href`/`src`/`cite`/`srcset`. Nada de `data:` (SVG executa script) nem `javascript:`. */
const ALLOWED_SCHEMES = ["http", "https", "mailto"];

/**
 * O UNICO formato de `id` que o `markdown-it-footnote` emite: `fn<n>` na nota,
 * `fnref<n>` na referencia, com `:<n>` opcional quando a nota e citada de novo.
 * Sem `i` de proposito — o Ghost gera minusculo, e aceitar `FN1` so aumentaria
 * o alfabeto de nomes que um post consegue registrar como global.
 */
const GHOST_FOOTNOTE_ID = /^fn(?:ref)?\d{1,4}(?::\d{1,4})?$/;

/** Tags onde `id` volta apenas para nota de rodape (titulo nao entra: ver cabecalho). */
const FOOTNOTE_ID_TAGS = new Set(["a", "li", "section", "sup"]);

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    // estrutura
    "p", "br", "hr", "div", "span", "section",
    "h1", "h2", "h3", "h4", "h5", "h6",
    // enfase
    "strong", "b", "em", "i", "u", "s", "del", "ins", "mark", "small", "sub", "sup",
    // listas
    "ul", "ol", "li", "dl", "dt", "dd",
    // citacao e codigo
    "blockquote", "q", "cite", "pre", "code", "kbd", "samp", "var",
    // links, midia e tabelas
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    "time", "abbr",
  ],
  // Sem estes, o TEXTO de um `<script>`/`<style>` descartado vazaria como
  // texto visivel no post.
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "template", "title"],
  allowedAttributes: {
    a: ["href", "title", "target", "rel", "id"],
    img: ["src", "alt", "title", "width", "height", "loading", "srcset", "sizes"],
    blockquote: ["cite"],
    q: ["cite"],
    time: ["datetime"],
    abbr: ["title"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    col: ["span"],
    colgroup: ["span"],
    ol: ["start", "reversed", "type"],
    // Ancoras de titulo que o Ghost gera (slug do titulo, alvo de deep link).
    h1: ["id"], h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
    // Ancoras de nota de rodape. O VALOR ainda passa pelo transform `*`
    // abaixo, que so deixa passar o `id` do markdown-it-footnote.
    li: ["id"], section: ["id"], sup: ["id"],
  },
  // `class` so no que o tema/realce de sintaxe precisa; nada de `style`,
  // `on*` ou atributo arbitrario.
  allowedClasses: {
    "*": ["kg-*", "language-*", "hljs", "hljs-*", "footnote*", "table*"],
  },
  allowedSchemes: ALLOWED_SCHEMES,
  allowedSchemesByTag: { img: ["http", "https"] },
  allowedSchemesAppliedToAttributes: ["href", "src", "cite", "srcset"],
  // `//evil.example/x` herda o esquema da pagina e escapa da allowlist acima.
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    // Roda DEPOIS do transform especifico da tag (ver `transformTagsAll` no
    // sanitize-html), entao vale tambem para o `<a>` transformado acima.
    "*": (tagName, attribs) => {
      if (
        typeof attribs.id === "string" &&
        FOOTNOTE_ID_TAGS.has(tagName) &&
        !GHOST_FOOTNOTE_ID.test(attribs.id)
      ) {
        const kept = { ...attribs };
        delete kept.id;
        return { tagName, attribs: kept };
      }
      return { tagName, attribs };
    },
    a: (tagName, attribs) => {
      const href = typeof attribs.href === "string" ? attribs.href.trim() : "";
      const external = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: {
          ...attribs,
          ...(external
            ? { target: "_blank", rel: "noopener noreferrer nofollow" }
            : {}),
        },
      };
    },
  },
};

/** HTML de post pronto para `dangerouslySetInnerHTML`. */
export function sanitizePostHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}
