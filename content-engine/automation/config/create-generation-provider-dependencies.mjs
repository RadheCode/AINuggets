import { createHttpJsonContentSource } from "../adapters/http-json-content-source.mjs";
import { createOpenAiCompatibleSummaryProvider } from "../adapters/openai-compatible-summary-provider.mjs";
import { createRssBlogContentSource } from "../adapters/rss-blog-content-source.mjs";
import { AI_BLOG_SOURCES } from "./ai-blog-sources.mjs";

export const GENERATION_PROVIDER_CONFIGURATION = Object.freeze({
  contentSourceUrl: "CONTENT_SOURCE_URL",
  contentSourceApiKey: "CONTENT_SOURCE_API_KEY",
  summaryProviderUrl: "SUMMARY_PROVIDER_URL",
  summaryProviderApiKey: "SUMMARY_PROVIDER_API_KEY",
  summaryProviderModel: "SUMMARY_PROVIDER_MODEL"
});

function configuredValue(values, name) {
  const value = values?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requireCompleteSummaryProvider(values) {
  const fields = [
    GENERATION_PROVIDER_CONFIGURATION.summaryProviderUrl,
    GENERATION_PROVIDER_CONFIGURATION.summaryProviderApiKey,
    GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel
  ];
  const configured = fields.filter((name) => configuredValue(values, name));
  if (configured.length && configured.length !== fields.length) {
    const missing = fields.filter((name) => !configuredValue(values, name));
    throw new Error(`Summary provider configuration is incomplete. Missing: ${missing.join(", ")}.`);
  }
}

/**
 * Builds portable content and summary dependencies from plain runtime values.
 * Runtimes choose how values are stored and injected; this module owns their meaning.
 */
export function createGenerationProviderDependencies(values, { fetchImpl } = {}) {
  requireCompleteSummaryProvider(values);

  const sourceUrl = configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.contentSourceUrl);
  const summaryProviderUrl = configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderUrl);
  const options = fetchImpl ? { fetchImpl } : {};

  return {
    contentSources: sourceUrl
      ? [createHttpJsonContentSource({
        url: sourceUrl,
        apiKey: configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.contentSourceApiKey),
        ...options
      })]
      : [createRssBlogContentSource({ sources: AI_BLOG_SOURCES, ...options })],
    summaryProvider: summaryProviderUrl
      ? createOpenAiCompatibleSummaryProvider({
        baseUrl: summaryProviderUrl,
        apiKey: configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderApiKey),
        model: configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel),
        ...options
      })
      : null
  };
}
