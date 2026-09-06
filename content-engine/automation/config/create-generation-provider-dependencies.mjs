import { createHttpJsonContentSource } from "../adapters/http-json-content-source.mjs";
import { createOpenAiCompatibleSummaryProvider } from "../adapters/openai-compatible-summary-provider.mjs";
import { createRssBlogContentSource } from "../adapters/rss-blog-content-source.mjs";
import { createWorkersAiSummaryProvider } from "../adapters/workers-ai-summary-provider.mjs";
import { validateCandidateSelectionMode } from "../pipeline/candidate-selection.mjs";
import "../../../product/config.js";

const PRODUCT_EDITORIAL_CONFIG = globalThis.ProductConfig.editorial;
const SUMMARY_FEATURE_CONFIG = globalThis.ProductConfig.summaryFeatures;
const validateSummaryFeatureConfig = globalThis.ProductConfig.validateSummaryFeatureConfig;

export const GENERATION_PROVIDER_CONFIGURATION = Object.freeze({
  contentSourceUrl: "CONTENT_SOURCE_URL",
  contentSourceApiKey: "CONTENT_SOURCE_API_KEY",
  summaryProviderKind: "SUMMARY_PROVIDER_KIND",
  summaryProviderUrl: "SUMMARY_PROVIDER_URL",
  summaryProviderApiKey: "SUMMARY_PROVIDER_API_KEY",
  summaryProviderModel: "SUMMARY_PROVIDER_MODEL"
});

export const SUMMARY_PROVIDER_KINDS = Object.freeze({
  openai: "openai",
  workersAi: "workers-ai"
});

function configuredValue(values, name) {
  const value = values?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function configuredValueAsArray(values, name) {
  const value = values?.[name];
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    // Try to parse as JSON array first
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not valid JSON, treat as single value
    }
    // Fall back to single value as array
    return [trimmed];
  }
  return undefined;
}

function summaryProviderKind(values) {
  return configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderKind) || SUMMARY_PROVIDER_KINDS.openai;
}

function requireCompleteSummaryProvider(values) {
  const kind = summaryProviderKind(values);

  if (kind === SUMMARY_PROVIDER_KINDS.workersAi) {
    // Workers AI needs only the model name and the AI binding (env.AI);
    // URL and API key are not used on this path.
    if (!configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel)) {
      throw new Error(`The ${kind} summary provider requires ${GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel}.`);
    }
    return;
  }

  if (kind !== SUMMARY_PROVIDER_KINDS.openai) {
    throw new Error(`Unknown summary provider kind "${kind}". Use "openai" or "workers-ai".`);
  }

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
  validateSummaryFeatureConfig();
  validateCandidateSelectionMode(PRODUCT_EDITORIAL_CONFIG.candidateSelection?.mode);

  const sourceUrl = configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.contentSourceUrl);
  const summaryProviderUrl = configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderUrl);
  const options = fetchImpl ? { fetchImpl } : {};
  const contextConfiguration = Object.fromEntries(SUMMARY_FEATURE_CONFIG.generation.map((key) => [key, SUMMARY_FEATURE_CONFIG.contexts[key]]));
  const kind = summaryProviderKind(values);

  return {
    summaryContexts: contextConfiguration,
    candidateSelection: { mode: PRODUCT_EDITORIAL_CONFIG.candidateSelection.mode },
    contentSources: sourceUrl
      ? [createHttpJsonContentSource({
        url: sourceUrl,
        apiKey: configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.contentSourceApiKey),
        ...options
      })]
      : [createRssBlogContentSource({
        sources: PRODUCT_EDITORIAL_CONFIG.feeds,
        ...options
      })],
    summaryProvider: createSummaryProvider(kind, values, contextConfiguration, PRODUCT_EDITORIAL_CONFIG.generationInstruction, options)
  };
}

function createSummaryProvider(kind, values, summaryContexts, generationInstruction, options) {
  if (kind === SUMMARY_PROVIDER_KINDS.workersAi) {
    return createWorkersAiSummaryProvider({
      ai: values?.["AI"],
      model: configuredValueAsArray(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel),
      summaryContexts,
      generationInstruction
    });
  }
  if (kind === SUMMARY_PROVIDER_KINDS.openai && configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderUrl)) {
    return createOpenAiCompatibleSummaryProvider({
      baseUrl: configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderUrl),
      apiKey: configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderApiKey),
      model: configuredValueAsArray(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel),
      summaryContexts,
      generationInstruction,
      ...options
    });
  }
  return null;
}
