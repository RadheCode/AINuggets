import test from "node:test";
import assert from "node:assert/strict";
import { createHttpJsonContentSource } from "../adapters/http-json-content-source.mjs";
import { createOpenAiCompatibleSummaryProvider } from "../adapters/openai-compatible-summary-provider.mjs";

test("fetches candidates from a generic JSON endpoint", async () => {
  let request;
  const source = createHttpJsonContentSource({
    url: "https://source.example/api/candidates",
    apiKey: "source-secret",
    async fetchImpl(url, options) {
      request = { url: url.toString(), options };
      return { ok: true, async json() { return { candidates: [{ url: "https://example.com/story" }, null] }; } };
    }
  });

  const candidates = await source.fetchCandidates({ targetDate: "2026-08-24" });
  assert.equal(request.url, "https://source.example/api/candidates?date=2026-08-24");
  assert.equal(request.options.headers.authorization, "Bearer source-secret");
  assert.deepEqual(candidates, [{ url: "https://example.com/story" }]);
});

test("requests a structured edition from a compatible endpoint", async () => {
  let request;
  const provider = createOpenAiCompatibleSummaryProvider({
    baseUrl: "https://model.example/v1",
    apiKey: "model-secret",
    model: "editorial-model",
    generationInstruction: "Create a factual daily science-news edition only from the supplied candidate metadata.",
    summaryContexts: {
      compact: { label: "Quick take", minCharacters: 100, maxCharacters: 180 },
      standard: { label: "Full context", minCharacters: 240, maxCharacters: 420 },
      detailed: { label: "Deep dive", minCharacters: 500, maxCharacters: 900 }
    },
    async fetchImpl(url, options) {
      request = { url, options };
      return { ok: true, async json() { return { choices: [{ message: { content: '{"date":"2026-08-24"}' } }] }; } };
    }
  });

  const edition = await provider.generateEdition({ targetDate: "2026-08-24", candidates: [] });
  const payload = JSON.parse(request.options.body);
  assert.equal(request.url, "https://model.example/v1/chat/completions");
  assert.equal(request.options.headers.authorization, "Bearer model-secret");
  assert.equal(payload.model, "editorial-model");
  assert.equal(payload.response_format.type, "json_schema");
  const summaries = payload.response_format.json_schema.schema.properties.stories.items.properties.summaries;
  assert.deepEqual(summaries.required, ["compact", "standard", "detailed"]);
  assert.equal(summaries.properties.compact.minLength, 100);
  assert.equal(summaries.properties.compact.maxLength, 180);
  assert.equal(summaries.properties.standard.minLength, 240);
  assert.equal(summaries.properties.standard.maxLength, 420);
  assert.equal(summaries.properties.detailed.minLength, 500);
  assert.equal(summaries.properties.detailed.maxLength, 900);
  const systemPrompt = payload.messages.find((message) => message.role === "system").content;
  assert.match(systemPrompt, /Count every character/i);
  assert.match(systemPrompt, /three or four Markdown-style bullet points/i);
  assert.match(systemPrompt, /two to four short paragraphs/i);
  assert.deepEqual(edition, { date: "2026-08-24" });
});
