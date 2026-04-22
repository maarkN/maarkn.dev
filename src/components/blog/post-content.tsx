/**
 * Renders Ghost-generated HTML inside an editorial-typography wrapper.
 * Ghost is treated as a trusted source — it is the author's own CMS — so
 * dangerouslySetInnerHTML is acceptable here. If we ever accept untrusted
 * HTML, run it through a sanitizer first.
 */
export function PostContent({ html }: { html: string }) {
  return (
    <div
      className="post-prose"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
