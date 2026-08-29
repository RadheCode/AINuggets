import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  GENERATION_PROVIDER_CONFIGURATION,
  createGenerationProviderDependencies
} from "../config/create-generation-provider-dependencies.mjs";
import { PRODUCT_EDITORIAL_CONFIG } from "../../../product/editorial-config.mjs";
import { CONTENT_ENGINE_CONFIG } from "../../content-engine.config.mjs";
import { validateContentEngineConfig } from "../../validate-content-engine-config.mjs";
import { SUMMARY_FEATURE_CONFIG, validateSummaryFeatureConfig } from "../../../product/summary-features.mjs";

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

test("uses the centralized product editorial configuration", () => {
  assert.equal(PRODUCT_EDITORIAL_CONFIG.feeds.length, 35);
  assert.equal(PRODUCT_EDITORIAL_CONFIG.candidateSelection.mode, "random");
  assert.equal(CONTENT_ENGINE_CONFIG.schedule.cron, "30 11,23 * * *");
  assert.equal("timezone" in CONTENT_ENGINE_CONFIG.schedule, false);
  assert.ok(SUMMARY_FEATURE_CONFIG.ui.length > 0);
  assert.ok(SUMMARY_FEATURE_CONFIG.generation.length > 0);
  assert.deepEqual(SUMMARY_FEATURE_CONFIG.contexts.compact, { label: "Quick take", minCharacters: 100, maxCharacters: 180, format: "paragraph" });
  assert.doesNotThrow(() => validateSummaryFeatureConfig(SUMMARY_FEATURE_CONFIG));
  assert.doesNotThrow(() => validateContentEngineConfig(CONTENT_ENGINE_CONFIG));
});

test("requires every configured feed to have a valid product artwork mapping", () => {
  const productDirectory = new URL("../../../product/", import.meta.url);
  const artworkDirectory = fileURLToPath(new URL("company-images/", productDirectory));
  const script = fs.readFileSync(new URL("company-images.js", productDirectory), "utf8");
  const context = { window: {} };
  vm.runInNewContext(script, context, { filename: "product/company-images.js" });
  const sourceArtwork = context.window.ProductCompanyImages.sourceArtwork;

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
