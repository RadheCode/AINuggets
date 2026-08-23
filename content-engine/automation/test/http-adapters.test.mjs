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

test("requests a structured edition from an OpenAI-compatible endpoint", async () => {
  let request;
  const provider = createOpenAiCompatibleSummaryProvider({
    baseUrl: "https://model.example/v1",
    apiKey: "model-secret",
    model: "editorial-model",
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
  assert.deepEqual(edition, { date: "2026-08-24" });
});
