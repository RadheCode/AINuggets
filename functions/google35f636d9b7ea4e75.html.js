// Serves the Google Search Console verification file at its exact URL.
// Cloudflare Pages redirects static *.html files to clean URLs (foo.html -> foo),
// which would break Google's exact-URL verification check. A Pages Function
// takes precedence over both the static asset and that redirect.
export async function onRequest() {
  return new Response("google-site-verification: google35f636d9b7ea4e75.html", {
    headers: { "Content-Type": "text/plain" },
  });
}