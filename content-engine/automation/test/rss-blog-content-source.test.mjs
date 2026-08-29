import test from "node:test";
import assert from "node:assert/strict";
import {
  createRssBlogContentSource,
  parseBlogFeed
} from "../adapters/rss-blog-content-source.mjs";
import { selectDiversifiedCandidates } from "../pipeline/candidate-selection.mjs";

const source = {
  name: "Example",
  feedUrl: "https://example.test/feed",
  category: "Models",
  priority: 100
};

function feed(posts) {
  return `<rss><channel>${posts.map(({ title, url, date }) => `<item><title>${title}</title><link>${url}</link><pubDate>${date}</pubDate><description>Summary</description></item>`).join("")}</channel></rss>`;
}

test("parses RSS posts and removes tracking parameters", () => {
  const candidates = parseBlogFeed(feed([{
    title: "New model",
    url: "https://example.test/post?utm_source=feed",
    date: "2026-08-23T00:00:00Z"
  }]), source);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].url, "https://example.test/post");
  assert.equal(candidates[0].category, "Models");
});

test("parses Atom entries with tag attributes", () => {
  const candidates = parseBlogFeed(`<feed><entry><title type="text">Atom post</title><link href="https://example.test/atom"/><updated>2026-08-23T00:00:00Z</updated><summary type="html">Summary</summary></entry></feed>`, source);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].title, "Atom post");
  assert.equal(candidates[0].url, "https://example.test/atom");
});

test("keeps only three latest posts from a successful feed when another fails", async () => {
  const unavailable = { ...source, name: "Unavailable", feedUrl: "https://example.test/unavailable" };
  const collector = createRssBlogContentSource({
    sources: [source, unavailable],
    now: () => Date.parse("2026-08-24T00:00:00Z"),
    async fetchImpl(url) {
      if (url === unavailable.feedUrl) return { ok: false, status: 503 };
      return {
        ok: true,
        async text() {
          return feed([1, 2, 3, 4].map((number) => ({
            title: `Post ${number}`,
            url: `https://example.test/${number}`,
            date: `2026-08-${number.toString().padStart(2, "0")}T00:00:00Z`
          })));
        }
      };
    }
  });

  const candidates = await collector.fetchCandidates();
  assert.deepEqual(candidates.map((candidate) => candidate.title), ["Post 4", "Post 3", "Post 2"]);
});

test("deduplicates before selecting diverse categories and ranked fallbacks", () => {
  const timestamp = Date.parse("2026-08-23T00:00:00Z");
  const selected = selectDiversifiedCandidates([
    { canonicalUrl: "https://example.test/a", category: "Models", priority: 100, publishedTimestamp: timestamp },
    { canonicalUrl: "https://example.test/a", category: "Models", priority: 90, publishedTimestamp: timestamp },
    { canonicalUrl: "https://example.test/b", category: "Agents", priority: 80, publishedTimestamp: timestamp },
    { canonicalUrl: "https://example.test/c", category: "Research", priority: 70, publishedTimestamp: timestamp },
    { canonicalUrl: "https://example.test/d", category: "Models", priority: 60, publishedTimestamp: timestamp },
    { canonicalUrl: "https://example.test/e", category: "Agents", priority: 50, publishedTimestamp: timestamp }
  ], { now: Date.parse("2026-08-24T00:00:00Z") });

  assert.deepEqual(selected.map((candidate) => candidate.canonicalUrl), [
    "https://example.test/a",
    "https://example.test/b",
    "https://example.test/c",
    "https://example.test/d",
    "https://example.test/e"
  ]);
});

test("random selection mode preserves category diversity without using feed priorities", () => {
  const selected = selectDiversifiedCandidates([
    { canonicalUrl: "https://example.test/a", category: "Models", priority: 100, publishedTimestamp: 0 },
    { canonicalUrl: "https://example.test/b", category: "Models", priority: 1, publishedTimestamp: 0 },
    { canonicalUrl: "https://example.test/c", category: "Research", priority: 90, publishedTimestamp: 0 },
    { canonicalUrl: "https://example.test/d", category: "Business", priority: 80, publishedTimestamp: 0 }
  ], {
    count: 3,
    selectionMode: "random",
    random: () => 0
  });

  assert.deepEqual(selected.map((candidate) => candidate.canonicalUrl), [
    "https://example.test/b",
    "https://example.test/c",
    "https://example.test/d"
  ]);
  assert.ok(selected.every((candidate) => candidate.rankingScore === null));
});

test("rejects an unsupported candidate selection mode", () => {
  assert.throws(
    () => selectDiversifiedCandidates([], { selectionMode: "unsupported" }),
    /unsupported candidate selection mode/i
  );
});
