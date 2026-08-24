import test from "node:test";
import assert from "node:assert/strict";
import {
  GENERATION_PROVIDER_CONFIGURATION,
  createGenerationProviderDependencies
} from "../config/create-generation-provider-dependencies.mjs";
import { AI_BLOG_SOURCES } from "../config/ai-blog-sources.mjs";
import { CONTENT_ENGINE_CONFIG } from "../../content-engine.config.mjs";
import { validateContentEngineConfig } from "../../validate-content-engine-config.mjs";

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

test("uses the centralized content-engine feed configuration", () => {
  assert.strictEqual(AI_BLOG_SOURCES, CONTENT_ENGINE_CONFIG.feeds);
  assert.equal(CONTENT_ENGINE_CONFIG.schedule.cron, "0 12 * * *");
  assert.equal("timezone" in CONTENT_ENGINE_CONFIG.schedule, false);
  assert.doesNotThrow(() => validateContentEngineConfig(CONTENT_ENGINE_CONFIG));
});
