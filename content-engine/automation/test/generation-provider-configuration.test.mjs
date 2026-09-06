import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  GENERATION_PROVIDER_CONFIGURATION,
  SUMMARY_PROVIDER_KINDS,
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
    [GENERATION_PROVIDER_CONFIGURATION.summaryProviderUrl]: "https://model.example/v1",
    [GENERATION_PROVIDER_CONFIGURATION.summaryProviderApiKey]: "model-secret",
    [GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel]: "editorial-model"
  });

  assert.equal(dependencies.contentSources.length, 1);
  assert.ok(dependencies.summaryProvider);
});

test("rejects partial summary provider configuration", () => {
  assert.throws(
    () => createGenerationProviderDependencies({
      [GENERATION_PROVIDER_CONFIGURATION.summaryProviderUrl]: "https://model.example/v1"
    }),
    /configuration is incomplete.*SUMMARY_PROVIDER_API_KEY.*SUMMARY_PROVIDER_MODEL/i
  );
});

test("creates a workers-ai summary provider from a binding and model", () => {
  const dependencies = createGenerationProviderDependencies({
    [GENERATION_PROVIDER_CONFIGURATION.summaryProviderKind]: SUMMARY_PROVIDER_KINDS.workersAi,
    [GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel]: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    AI: { run: async () => ({ response: "{}" }) }
  });

  assert.ok(dependencies.summaryProvider, "expected a workers-ai summary provider");
  assert.equal(typeof dependencies.summaryProvider.generateEdition, "function");
});

test("rejects a workers-ai provider without a model", () => {
  assert.throws(
    () => createGenerationProviderDependencies({
      [GENERATION_PROVIDER_CONFIGURATION.summaryProviderKind]: SUMMARY_PROVIDER_KINDS.workersAi,
      AI: { run: async () => ({ response: "{}" }) }
    }),
    /workers-ai summary provider requires SUMMARY_PROVIDER_MODEL/i
  );
});

test("rejects an unknown summary provider kind", () => {
  assert.throws(
    () => createGenerationProviderDependencies({
      [GENERATION_PROVIDER_CONFIGURATION.summaryProviderKind]: "azure"
    }),
    /Unknown summary provider kind/i
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
    [GENERATION_PROVIDER_CONFIGURATION.summaryProviderKind]: SUMMARY_PROVIDER_KINDS.workersAi,
    [GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel]: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    AI: { run: async () => ({ response: "not json" }) }
  });

  await assert.rejects(
    dependencies.summaryProvider.generateEdition({ targetDate: "2026-08-24", candidates: [] }),
    /invalid JSON/i
  );
});

test("workers-ai requires an AI binding through the factory", () => {
  assert.throws(
    () => createGenerationProviderDependencies({
      [GENERATION_PROVIDER_CONFIGURATION.summaryProviderKind]: SUMMARY_PROVIDER_KINDS.workersAi,
      [GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel]: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    }),
    /Workers AI binding \(env.AI\) is required/i
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
