import test from "node:test";
import assert from "node:assert/strict";
import { createSocialPost, socialPostWeightedLength } from "../pipeline/social-post.mjs";

const config = {
  enabled: true,
  messageTemplate: "AI Nuggets — {date}\n\nToday’s AI briefing:\n{stories}\n\nRead: {url}"
};

const edition = {
  date: "2026-09-20",
  stories: [
    { title: "OpenAI proposes youth-safety blueprint" },
    { title: "Report details alleged Gemini incident" },
    { title: "NVIDIA applies agents to 3D simulation setup" },
    { title: "Prompt caching targets small-model efficiency" },
    { title: "GANPaint exposes structure in image generation" }
  ]
};

const url = "https://ai-nuggets.pages.dev/?date=2026-09-20";

test("formats five concise X story lines within the weighted limit", () => {
  const post = createSocialPost({ edition, config, editionUrl: url, maximumLength: 280, shortenedUrlLength: 23 });
  assert.match(post, /• OpenAI proposes youth-safety/);
  assert.equal(post.split("\n").filter((line) => line.startsWith("• ")).length, 5);
  assert.ok(socialPostWeightedLength(post, url, 23) <= 280);
});

test("truncates non-ASCII titles using a conservative weighted length", () => {
  const post = createSocialPost({
    edition: { ...edition, stories: edition.stories.map(() => ({ title: "模型发布带来新的推理能力和更高效的开发工作流" })) },
    config,
    editionUrl: url,
    maximumLength: 280,
    shortenedUrlLength: 23
  });
  assert.equal(post.split("\n").filter((line) => line.startsWith("• ")).length, 5);
  assert.ok(socialPostWeightedLength(post, url, 23) <= 280);
});

test("does not format a disabled social destination", () => {
  assert.equal(createSocialPost({ edition, config: { ...config, enabled: false }, editionUrl: url, maximumLength: 280, shortenedUrlLength: 23 }), null);
});
