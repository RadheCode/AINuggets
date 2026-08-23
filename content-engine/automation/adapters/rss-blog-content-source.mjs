const POSTS_PER_SOURCE = 3;
const SELECTED_POST_COUNT = 5;

function text(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

function tagValue(entry, tag) {
  return text(entry.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"))?.[1] || "");
}

function linkValue(entry) {
  return entry.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || tagValue(entry, "link");
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => url.searchParams.delete(key));
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function dateValue(entry) {
  const value = tagValue(entry, "published") || tagValue(entry, "updated") || tagValue(entry, "pubDate") || tagValue(entry, "date");
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function parseBlogFeed(feedText, source) {
  const entries = feedText.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) || [];
  return entries.map((entry) => {
    const url = normalizeUrl(linkValue(entry));
    const title = tagValue(entry, "title");
    if (!url || !title) return null;
    const publishedTimestamp = dateValue(entry);
    return { url, canonicalUrl: url, title, excerpt: tagValue(entry, "description") || tagValue(entry, "summary") || tagValue(entry, "content"), sourceName: source.name, sourceUrl: url, sourcePublishedAt: publishedTimestamp ? new Date(publishedTimestamp).toISOString() : null, category: source.category, priority: source.priority || 0, publishedTimestamp };
  }).filter(Boolean);
}

function deduplicate(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = candidate.canonicalUrl.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function score(candidate, now) {
  const ageInDays = candidate.publishedTimestamp ? Math.max(0, (now - candidate.publishedTimestamp) / 86_400_000) : 365;
  return candidate.priority * 1_000 - Math.min(ageInDays, 365);
}

export function selectDiversifiedCandidates(candidates, { now = Date.now(), count = SELECTED_POST_COUNT } = {}) {
  const ranked = deduplicate(candidates).map((candidate) => ({ ...candidate, rankingScore: score(candidate, now) })).sort((left, right) => right.rankingScore - left.rankingScore);
  const selected = [];
  const categories = new Set();
  for (const candidate of ranked) {
    if (selected.length === count) break;
    if (!categories.has(candidate.category)) {
      selected.push(candidate);
      categories.add(candidate.category);
    }
  }
  for (const candidate of ranked) {
    if (selected.length === count) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  return selected;
}

export function createRssBlogContentSource({ sources, fetchImpl = fetch, now = () => Date.now() }) {
  if (!Array.isArray(sources) || !sources.length) throw new Error("At least one blog source is required.");
  return {
    async fetchCandidates() {
      const results = await Promise.allSettled(sources.map(async (source) => {
        const response = await fetchImpl(source.feedUrl, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error(`Blog feed request failed for ${source.name} (${response.status}).`);
        return parseBlogFeed(await response.text(), source).sort((left, right) => right.publishedTimestamp - left.publishedTimestamp).slice(0, POSTS_PER_SOURCE);
      }));
      const batches = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
      if (!batches.length) throw new Error("All configured blog feeds failed to respond.");
      return selectDiversifiedCandidates(batches.flat(), { now: now() });
    }
  };
}
