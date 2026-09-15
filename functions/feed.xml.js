// Cloudflare Pages Function: serves /feed.xml on the main Pages domain
// by proxying the dynamic Atom feed from the content Worker.
// This keeps internal Worker URLs out of readers' and feed readers' sight.

export async function onRequest(context) {
  const { request } = context;
  const host = request.headers.get("host") || "";
  const isBeta = host.startsWith("beta-");

  const workerFeedUrl = isBeta
    ? "https://beta-ai-nuggets-content.ainuggets123.workers.dev/feed.xml"
    : "https://ai-nuggets-content.ainuggets123.workers.dev/feed.xml";

  const response = await fetch(workerFeedUrl);

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=1800"
    }
  });
}