import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  GENERATION_PROVIDER_CONFIGURATION,
  OPENROUTER_DEFAULT_BASE_URL,
  SUMMARY_PROVIDER_FALLBACK_ORDER,
  createGenerationProviderDependencies
} from "../config/create-generation-provider-dependencies.mjs";
import "../../../product/config.js";
import { CONTENT_ENGINE_CONFIG } from "../../content-engine.config.mjs";
import { validateContentEngineConfig } from "../../validate-content-engine-config.mjs";

const PRODUCT_EDITORIAL_CONFIG = globalThis.ProductConfig.editorial;
const SUMMARY_FEATURE_CONFIG = globalThis.ProductConfig.summaryFeatures;
const validateSummaryFeatureConfig = globalThis.ProductConfig.validateSummaryFeatureConfig;
const STREAK_FEATURE_CONFIG = globalThis.ProductConfig.readerEngagement?.streak;
const validateStreakFeatureConfig = globalThis.ProductConfig.validateStreakFeatureConfig;
const SUMMARY_PROVIDERS_CONFIG = globalThis.ProductConfig.summaryProviders;
const validateSummaryProvidersConfig = globalThis.ProductConfig.validateSummaryProvidersConfig;

function sampleEdition() {
  return {
    date: "2026-08-24",
    briefing: { eyebrow: "Daily briefing", title: "A title", emphasis: "An emphasis", summary: "A summary", meta: ["m"] },
    stories: [...Array(4)].map((_, index) => ({
      id: `story-${index}`,
      type: index === 0 ? "lead" : null,
      category: "models",
      title: `Story ${index}`,
      summaries: {
        compact: "x".repeat(100),
        standard: "y".repeat(240),
        detailed: "z".repeat(500)
      },
      href: "https://example.com/story",
      art: "models",
      sourceUrl: "https://example.com/source",
      sourceName: "Source",
      sourcePublishedAt: "2026-08-24T00:00:00.000Z"
    }))
  };
}

test("uses the built-in blog collector when no source URL is supplied", () => {
  const dependencies = createGenerationProviderDependencies({});

  assert.equal(dependencies.contentSources.length, 1);
  assert.equal(dependencies.summaryProvider, null);
});

test("creates generic providers from complete runtime configuration", () => {
  const dependencies = createGenerationProviderDependencies({
    [GENERATION_PROVIDER_CONFIGURATION.contentSourceUrl]: "https://source.example/candidates",
    [GENERATION_PROVIDER_CONFIGURATION.contentSourceApiKey]: "source-secret",
    [GENERATION_PROVIDER_CONFIGURATION.openaiBaseUrl]: "https://model.example/v1",
    [GENERATION_PROVIDER_CONFIGURATION.openaiApiKey]: "model-secret",
    [GENERATION_PROVIDER_CONFIGURATION.openaiModel]: "editorial-model"
  });

  assert.equal(dependencies.contentSources.length, 1);
  assert.ok(dependencies.summaryProvider);
});

test("rejects partial summary provider configuration", () => {
  assert.throws(
    () => createGenerationProviderDependencies({
      [GENERATION_PROVIDER_CONFIGURATION.openaiBaseUrl]: "https://model.example/v1"
    }),
    /has a partial configuration/i
  );
});

test("creates a workers-ai summary provider from a binding and model", () => {
  const dependencies = createGenerationProviderDependencies({
    [GENERATION_PROVIDER_CONFIGURATION.workersAiModel]: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    AI: { run: async () => ({ response: "{}" }) }
  });

  assert.ok(dependencies.summaryProvider, "expected a workers-ai summary provider");
  assert.equal(typeof dependencies.summaryProvider.generateEdition, "function");
});

test("workers-ai binding without a model leaves workers-ai unconfigured", () => {
  const dependencies = createGenerationProviderDependencies({
    AI: { run: async () => ({ response: "{}" }) }
  });
  assert.equal(dependencies.summaryProvider, null);
});

test("creates an openrouter summary provider using the default OpenRouter base URL", async () => {
  let requestedUrl;
  let requestedBody;
  const fetchImpl = async (url, options) => {
    requestedUrl = url;
    requestedBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({}), text: async () => "" };
  };

  const dependencies = createGenerationProviderDependencies({
    [GENERATION_PROVIDER_CONFIGURATION.openrouterApiKey]: "openrouter-secret",
    [GENERATION_PROVIDER_CONFIGURATION.openrouterModel]: "openai/gpt-4o-mini"
  }, { fetchImpl });

  assert.ok(dependencies.summaryProvider, "expected an openrouter summary provider");
  assert.equal(typeof dependencies.summaryProvider.generateEdition, "function");

  await assert.rejects(
    dependencies.summaryProvider.generateEdition({ targetDate: "2026-08-24", candidates: [] }),
    /no structured edition/i
  );
  assert.equal(requestedUrl, `${OPENROUTER_DEFAULT_BASE_URL}/chat/completions`);
  assert.equal(requestedBody.model, "openai/gpt-4o-mini");
});

test("openrouter summary provider extracts JSON from a markdown-fenced response", async () => {
  const edition = sampleEdition();
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: "```json\n" + JSON.stringify(edition) + "\n```" } }]
    }),
    text: async () => ""
  });

  const dependencies = createGenerationProviderDependencies({
    [GENERATION_PROVIDER_CONFIGURATION.openrouterApiKey]: "openrouter-secret",
    [GENERATION_PROVIDER_CONFIGURATION.openrouterModel]: "openai/gpt-4o-mini"
  }, { fetchImpl });

  const result = await dependencies.summaryProvider.generateEdition({ targetDate: "2026-08-24", candidates: [] });
  assert.deepEqual(result, edition);
});

test("openrouter summary provider extracts JSON from prose-wrapped response", async () => {
  const edition = sampleEdition();
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: `Here is the edition:\n${JSON.stringify(edition)}\nHope that helps!` } }]
    }),
    text: async () => ""
  });

  const dependencies = createGenerationProviderDependencies({
    [GENERATION_PROVIDER_CONFIGURATION.openrouterApiKey]: "openrouter-secret",
    [GENERATION_PROVIDER_CONFIGURATION.openrouterModel]: "openai/gpt-4o-mini"
  }, { fetchImpl });

  const result = await dependencies.summaryProvider.generateEdition({ targetDate: "2026-08-24", candidates: [] });
  assert.deepEqual(result, edition);
});

test("openai summary provider is configured with a custom OPENAI_BASE_URL", async () => {
  const attemptedUrls = [];
  const fetchImpl = async (url) => {
    attemptedUrls.push(url);
    return { ok: true, json: async () => ({}), text: async () => "" };
  };

  // Supplying openai keys configures openai; openrouter is also configured
  // via its own keys and is first in fallbackOrder.
  const dependencies = createGenerationProviderDependencies({
    [GENERATION_PROVIDER_CONFIGURATION.openaiBaseUrl]: "https://custom-endpoint.example/v1",
    [GENERATION_PROVIDER_CONFIGURATION.openaiApiKey]: "test-key",
    [GENERATION_PROVIDER_CONFIGURATION.openaiModel]: "test-model"
  }, { fetchImpl });

  assert.ok(dependencies.summaryProvider, "expected a summary provider");
  await assert.rejects(
    dependencies.summaryProvider.generateEdition({ targetDate: "2026-08-24", candidates: [] }),
    /no structured edition/i
  );
  // The openai provider is in the chain, so the custom URL (openai's) must be
  // attempted at some point after openrouter's default URL.
  assert.ok(
    attemptedUrls.includes("https://custom-endpoint.example/v1/chat/completions"),
    `expected the custom OpenAI-compatible URL to be attempted, got ${attemptedUrls.join(", ")}`
  );
});

test("incomplete openai configuration (URL and key, missing model) is rejected as partial", () => {
  assert.throws(
    () => createGenerationProviderDependencies({
      [GENERATION_PROVIDER_CONFIGURATION.openaiBaseUrl]: "https://model.example/v1",
      [GENERATION_PROVIDER_CONFIGURATION.openaiApiKey]: "test-key"
    }),
    /has a partial configuration/i
  );
});

test("openrouter key without a model is rejected as partial", () => {
  assert.throws(
    () => createGenerationProviderDependencies({
      [GENERATION_PROVIDER_CONFIGURATION.openrouterApiKey]: "test-key"
    }),
    /has a partial configuration/i
  );
});

test("creates a gemini summary provider using the default Gemini base URL", async () => {
  let requestedUrl;
  let requestedBody;
  const fetchImpl = async (url, options) => {
    requestedUrl = url;
    requestedBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({}), text: async () => "" };
  };

  const dependencies = createGenerationProviderDependencies({
    [GENERATION_PROVIDER_CONFIGURATION.geminiApiKey]: "gemini-secret",
    [GENERATION_PROVIDER_CONFIGURATION.geminiModel]: "gemini-2.0-flash"
  }, { fetchImpl });

  assert.ok(dependencies.summaryProvider, "expected a gemini summary provider");
  assert.equal(typeof dependencies.summaryProvider.generateEdition, "function");

  await assert.rejects(
    dependencies.summaryProvider.generateEdition({ targetDate: "2026-08-24", candidates: [] }),
    /no structured edition/i
  );
  assert.equal(requestedUrl, `${SUMMARY_PROVIDERS_CONFIG.gemini.defaultBaseUrl}/chat/completions`);
  assert.equal(requestedBody.model, "gemini-2.0-flash");
});

test("gemini key without a model is rejected as partial", () => {
  assert.throws(
    () => createGenerationProviderDependencies({
      [GENERATION_PROVIDER_CONFIGURATION.geminiApiKey]: "test-key"
    }),
    /has a partial configuration/i
  );
});

test("gemini model without a key is rejected as partial", () => {
  assert.throws(
    () => createGenerationProviderDependencies({
      [GENERATION_PROVIDER_CONFIGURATION.geminiModel]: "gemini-2.0-flash"
    }),
    /has a partial configuration/i
  );
});

test("workers-ai summary provider parses the JSON edition from the binding response", async () => {
  const edition = sampleEdition();
  let receivedMessages;
  const ai = {
    run: async (model, options) => {
      assert.equal(model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
      receivedMessages = options.messages;
      return { response: JSON.stringify(edition) };
    }
  };
  const provider = (await import("../adapters/workers-ai-summary-provider.mjs")).createWorkersAiSummaryProvider({
    ai,
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    summaryContexts: {
      compact: { label: "Quick take", minCharacters: 100, maxCharacters: 180 },
      standard: { label: "Standard", minCharacters: 240, maxCharacters: 420 },
      detailed: { label: "Deep dive", minCharacters: 500, maxCharacters: 900 }
    },
    generationInstruction: "Produce a daily AI briefing."
  });

  const result = await provider.generateEdition({
    targetDate: "2026-08-24",
    candidates: [{ title: "Candidate", url: "https://example.com/candidate" }]
  });

  assert.deepEqual(result, edition);
  assert.ok(Array.isArray(receivedMessages));
  assert.equal(receivedMessages.length, 2);
});

test("workers-ai summary provider strips markdown fences and prose around JSON", async () => {
  const edition = sampleEdition();
  const ai = {
    run: async () => ({ response: `Here is your edition:\n\`\`\`json\n${JSON.stringify(edition)}\n\`\`\`` })
  };
  const provider = (await import("../adapters/workers-ai-summary-provider.mjs")).createWorkersAiSummaryProvider({
    ai,
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    summaryContexts: { compact: { label: "Quick take", minCharacters: 100, maxCharacters: 180 } },
    generationInstruction: "Produce a daily AI briefing."
  });

  const result = await provider.generateEdition({ targetDate: "2026-08-24", candidates: [] });
  assert.deepEqual(result, edition);
});

test("workers-ai summary provider reads the edition from choices content (vLLM envelope)", async () => {
  const edition = sampleEdition();
  const ai = {
    run: async () => ({ response: "", choices: [{ message: { content: JSON.stringify(edition) } }] })
  };
  const provider = (await import("../adapters/workers-ai-summary-provider.mjs")).createWorkersAiSummaryProvider({
    ai,
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    summaryContexts: { compact: { label: "Quick take", minCharacters: 100, maxCharacters: 180 } },
    generationInstruction: "Produce a daily AI briefing."
  });

  const result = await provider.generateEdition({ targetDate: "2026-08-24", candidates: [] });
  assert.deepEqual(result, edition);
});

test("workers-ai summary provider rejects invalid JSON from the binding", async () => {
  const ai = { run: async () => ({ response: "not json" }) };
  const provider = (await import("../adapters/workers-ai-summary-provider.mjs")).createWorkersAiSummaryProvider({
    ai,
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    summaryContexts: { compact: { label: "Quick take", minCharacters: 100, maxCharacters: 180 } },
    generationInstruction: "Produce a daily AI briefing."
  });

  await assert.rejects(
    provider.generateEdition({ targetDate: "2026-08-24", candidates: [] }),
    /Workers AI returned invalid JSON/i
  );
});

test("builds a workers-ai summary provider through the factory end-to-end", async () => {
  const dependencies = createGenerationProviderDependencies({
    [GENERATION_PROVIDER_CONFIGURATION.workersAiModel]: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    AI: { run: async () => ({ response: "not json" }) }
  });

  await assert.rejects(
    dependencies.summaryProvider.generateEdition({ targetDate: "2026-08-24", candidates: [] }),
    /invalid JSON/i
  );
});

test("workers-ai model without a binding is a partial configuration", () => {
  assert.throws(
    () => createGenerationProviderDependencies({
      [GENERATION_PROVIDER_CONFIGURATION.workersAiModel]: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    }),
    /partial configuration/i
  );
});

test("uses the centralized product editorial configuration", () => {
  assert.equal(PRODUCT_EDITORIAL_CONFIG.feeds.length, 35);
  assert.equal(PRODUCT_EDITORIAL_CONFIG.candidateSelection.mode, "random");
  assert.equal(CONTENT_ENGINE_CONFIG.schedule.cron, "0 1,13 * * *");
  assert.equal("timezone" in CONTENT_ENGINE_CONFIG.schedule, false);
    assert.equal(CONTENT_ENGINE_CONFIG.schedule.refreshExistingEdition, true);
  assert.ok(SUMMARY_FEATURE_CONFIG.ui.length > 0);
  assert.ok(SUMMARY_FEATURE_CONFIG.generation.length > 0);
  assert.deepEqual(SUMMARY_FEATURE_CONFIG.contexts.compact, { label: "Quick take", minCharacters: 100, maxCharacters: 180, format: "paragraph" });
  assert.doesNotThrow(() => validateSummaryFeatureConfig(SUMMARY_FEATURE_CONFIG));
  assert.equal(STREAK_FEATURE_CONFIG.maximumDaysBetweenQualifyingActivities, 4);
  assert.doesNotThrow(() => validateStreakFeatureConfig(STREAK_FEATURE_CONFIG));
  assert.doesNotThrow(() => validateContentEngineConfig(CONTENT_ENGINE_CONFIG));
  assert.doesNotThrow(() => validateSummaryProvidersConfig(SUMMARY_PROVIDERS_CONFIG));
  assert.deepEqual(SUMMARY_PROVIDERS_CONFIG.fallbackOrder, ["openai", "gemini", "openrouter", "workers-ai"]);
    assert.deepEqual(SUMMARY_PROVIDER_FALLBACK_ORDER, ["openai", "gemini", "openrouter", "workers-ai"]);
  assert.equal(SUMMARY_PROVIDERS_CONFIG.requestTimeoutMs, 300000);
  assert.deepEqual(SUMMARY_PROVIDERS_CONFIG.openaiCompatible.retryableStatuses, [404, 500, 502, 503, 504]);
  assert.deepEqual(SUMMARY_PROVIDERS_CONFIG.workersAi.retryableStatuses, [429]);
  assert.equal(SUMMARY_PROVIDERS_CONFIG.openrouter.defaultBaseUrl, "https://openrouter.ai/api/v1");
    assert.equal(SUMMARY_PROVIDERS_CONFIG.gemini.defaultBaseUrl, "https://generativelanguage.googleapis.com/v1beta/openai");
});

test("composite provider falls through to the next provider on first-provider failure", async () => {
  const edition = sampleEdition();
  let openaiAttempted = false;
  const fetchImpl = async (url) => {
    // First provider (openai) hits the custom URL → fail with 500
    if (url.includes("custom-endpoint.example")) {
      openaiAttempted = true;
      return { ok: false, status: 500, text: async () => "internal error" };
    }
    // Second provider (openrouter) hits openrouter.ai → succeed
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(edition) } }] }),
      text: async () => ""
    };
  };

  // Provide both openai and openrouter keys. openai is first in fallbackOrder
  // and fails with 500; openrouter succeeds via its default URL.
  const dependencies = createGenerationProviderDependencies({
    [GENERATION_PROVIDER_CONFIGURATION.openaiBaseUrl]: "https://custom-endpoint.example/v1",
    [GENERATION_PROVIDER_CONFIGURATION.openaiApiKey]: "test-key",
    [GENERATION_PROVIDER_CONFIGURATION.openaiModel]: "test-model",
    [GENERATION_PROVIDER_CONFIGURATION.openrouterApiKey]: "test-key",
    [GENERATION_PROVIDER_CONFIGURATION.openrouterModel]: "test-model"
  }, { fetchImpl });

  assert.ok(dependencies.summaryProvider, "expected a composite summary provider");
  const result = await dependencies.summaryProvider.generateEdition({ targetDate: "2026-08-24", candidates: [] });
  assert.deepEqual(result, edition);
  assert.ok(openaiAttempted, "expected the first provider (openai) to be attempted");
});

test("factory returns null summary provider when no providers are configured", () => {
  const dependencies = createGenerationProviderDependencies({});
  assert.equal(dependencies.summaryProvider, null);
});

test("rejects an invalid streak grace-window configuration", () => {
  assert.throws(
    () => validateStreakFeatureConfig({ maximumDaysBetweenQualifyingActivities: 0 }),
    /must be an integer from 1 through 365/i
  );
});

test("requires every configured feed to have a valid product artwork mapping", () => {
  const productDirectory = new URL("../../../product/", import.meta.url);
  const artworkDirectory = fileURLToPath(new URL("company-images/", productDirectory));
  const script = fs.readFileSync(new URL("company-images.js", productDirectory), "utf8");
  const context = { window: { ProductConfig: globalThis.ProductConfig } };
  vm.runInNewContext(script, context, { filename: "product/company-images.js" });
    const sourceArtwork = globalThis.ProductConfig.companyImages.sourceArtwork;

  assert.deepEqual(
    Object.keys(sourceArtwork).sort(),
    PRODUCT_EDITORIAL_CONFIG.feeds.map((feed) => feed.name).sort(),
    "Feed names and artwork mappings must change together."
  );

  for (const [sourceName, artworkId] of Object.entries(sourceArtwork)) {
    const imagePath = path.join(artworkDirectory, `${artworkId}.jpg`);
    const vectorPath = path.join(artworkDirectory, `${artworkId}.svg`);
    assert.ok(fs.existsSync(imagePath) || fs.existsSync(vectorPath), `${sourceName} maps to a missing artwork asset: ${artworkId}`);
  }
});
test("externalizes summary provider fallback order, retry statuses, and default base URL from product/config.js", () => {
  assert.deepEqual(SUMMARY_PROVIDER_FALLBACK_ORDER, ["openai", "gemini", "openrouter", "workers-ai"]);
  assert.equal(SUMMARY_PROVIDER_FALLBACK_ORDER[0], "openai");
  assert.equal(OPENROUTER_DEFAULT_BASE_URL, SUMMARY_PROVIDERS_CONFIG.openrouter.defaultBaseUrl);
  assert.equal(OPENROUTER_DEFAULT_BASE_URL, "https://openrouter.ai/api/v1");
});

test("openai-compatible summary provider honors injected retryable statuses", async () => {
  let requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);
    if (requestedUrls.length === 1) {
      return { ok: false, status: 503, text: async () => "overloaded" };
    }
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(sampleEdition()) } }] }), text: async () => "" };
  };

  const provider = (await import("../adapters/openai-compatible-summary-provider.mjs")).createOpenAiCompatibleSummaryProvider({
    baseUrl: "https://model.example/v1",
    apiKey: "model-secret",
    model: ["model-a", "model-b"],
    summaryContexts: { compact: { label: "Quick take", minCharacters: 100, maxCharacters: 180 } },
    generationInstruction: "Produce a daily AI briefing.",
    fetchImpl,
    retryableStatuses: [503]
  });

  const result = await provider.generateEdition({ targetDate: "2026-08-24", candidates: [] });
  assert.deepEqual(result, sampleEdition());
  assert.equal(requestedUrls.length, 2, "expected fallback to the second model on a 503");
});

test("openai-compatible summary provider does not fall back on non-retryable statuses", async () => {
  let requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);
    return { ok: false, status: 400, text: async () => "bad request" };
  };

  const provider = (await import("../adapters/openai-compatible-summary-provider.mjs")).createOpenAiCompatibleSummaryProvider({
    baseUrl: "https://model.example/v1",
    apiKey: "model-secret",
    model: ["model-a", "model-b"],
    summaryContexts: { compact: { label: "Quick take", minCharacters: 100, maxCharacters: 180 } },
    generationInstruction: "Produce a daily AI briefing.",
    fetchImpl,
    retryableStatuses: [503]
  });

  await assert.rejects(
    provider.generateEdition({ targetDate: "2026-08-24", candidates: [] }),
    /bad request/i
  );
  assert.equal(requestedUrls.length, 1, "expected a single attempt for a non-retryable 400");
});

test("rejects an invalid summary providers configuration", () => {
  assert.throws(
    () => validateSummaryProvidersConfig({ fallbackOrder: [], requestTimeoutMs: 120000, openaiCompatible: { retryableStatuses: [503] }, workersAi: { retryableStatuses: [429], retryableStatusRange: [500, 599], retryableMessageTerms: ["rate limit"] }, openrouter: { defaultBaseUrl: "https://openrouter.ai/api/v1" }, gemini: { defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" } }),
    /fallbackOrder must be a non-empty array/i
  );
  assert.throws(
    () => validateSummaryProvidersConfig({ fallbackOrder: ["openai"], requestTimeoutMs: 120000, openaiCompatible: {}, workersAi: { retryableStatuses: [429], retryableStatusRange: [500, 599], retryableMessageTerms: ["rate limit"] }, openrouter: { defaultBaseUrl: "https://openrouter.ai/api/v1" }, gemini: { defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" } }),
    /openaiCompatible.retryableStatuses must be an array/i
  );
  assert.throws(
    () => validateSummaryProvidersConfig({ fallbackOrder: ["openai"], requestTimeoutMs: 120000, openaiCompatible: { retryableStatuses: [503] }, workersAi: { retryableStatuses: [429], retryableStatusRange: [500, 599], retryableMessageTerms: ["rate limit"] }, openrouter: { defaultBaseUrl: "https://openrouter.ai/api/v1" }, gemini: {} }),
    /gemini.defaultBaseUrl must be a non-empty URL string/i
  );
});
