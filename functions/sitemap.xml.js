// Cloudflare Pages Function: serves /sitemap.xml on the main Pages domain
// by proxying the dynamic sitemap from the content Worker.
// This keeps internal Worker URLs out of crawlers' sight.

export async function onRequest(context) {
  const { request } = context;
  const host = request.headers.get("host") || "";
  const isBeta = host.startsWith("beta-");

  const workerSitemapUrl = isBeta
    ? "https://beta-ai-nuggets-content.ainuggets123.workers.dev/sitemap.xml"
    : "https://ai-nuggets-content.ainuggets123.workers.dev/sitemap.xml";

  const response = await fetch(workerSitemapUrl);

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=1800"
    }
  });
}
