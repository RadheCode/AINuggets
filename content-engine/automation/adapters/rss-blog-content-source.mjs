const POSTS_PER_SOURCE = 3;
import { normalizeCanonicalUrl } from "../pipeline/candidate-selection.mjs";

function text(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

function tagValue(entry, tag) {
  return text(entry.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"))?.[1] || "");
}

function linkValue(entry) {
  return entry.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || tagValue(entry, "link");
}

function dateValue(entry) {
  const value = tagValue(entry, "published") || tagValue(entry, "updated") || tagValue(entry, "pubDate") || tagValue(entry, "date");
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function parseBlogFeed(feedText, source) {
  const entries = feedText.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) || [];
  return entries.map((entry) => {
    const url = normalizeCanonicalUrl(linkValue(entry));
    const title = tagValue(entry, "title");
    if (!url || !title) return null;
    const publishedTimestamp = dateValue(entry);
    return { url, canonicalUrl: url, title, excerpt: tagValue(entry, "description") || tagValue(entry, "summary") || tagValue(entry, "content"), sourceName: source.name, sourceUrl: url, sourcePublishedAt: publishedTimestamp ? new Date(publishedTimestamp).toISOString() : null, category: source.category, priority: source.priority || 0, publishedTimestamp };
  }).filter(Boolean);
}

export function createRssBlogContentSource({ sources, fetchImpl = fetch }) {
  if (!Array.isArray(sources) || !sources.length) throw new Error("At least one blog source is required.");
  return {
    async fetchCandidates({ eventLogger } = {}) {
      const results = await Promise.allSettled(sources.map(async (source, sourceIndex) => {
        const startedAt = Date.now();
        await eventLogger?.record("source-processing", "feed-request-started", {
          sourceIndex: sourceIndex + 1,
          sourceName: source.name,
          category: source.category
        });
        const response = await fetchImpl(source.feedUrl, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error(`Blog feed request failed for ${source.name} (${response.status}).`);
        const parsed = parseBlogFeed(await response.text(), source);
        const selected = parsed.sort((left, right) => right.publishedTimestamp - left.publishedTimestamp).slice(0, POSTS_PER_SOURCE);
        await eventLogger?.record("source-processing", "feed-processed", {
          sourceIndex: sourceIndex + 1,
          sourceName: source.name,
          parsedCandidateCount: parsed.length,
          retainedCandidateCount: selected.length,
          discardedCandidateCount: parsed.length - selected.length,
          retainedCandidates: selected.map((candidate) => ({
            url: candidate.url,
            canonicalUrl: candidate.canonicalUrl,
            category: candidate.category,
            sourcePublishedAt: candidate.sourcePublishedAt
          }))
        }, { outcome: "succeeded", durationMs: Date.now() - startedAt });
        return selected;
      }));
      for (const [sourceIndex, result] of results.entries()) {
        if (result.status === "rejected") {
          await eventLogger?.failure("source-processing", "feed-request-failed", result.reason, {
            sourceIndex: sourceIndex + 1,
            sourceName: sources[sourceIndex].name
          });
        }
      }
      const batches = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
      if (!batches.length) throw new Error("All configured blog feeds failed to respond.");
      return batches.flat();
    }
  };
}
