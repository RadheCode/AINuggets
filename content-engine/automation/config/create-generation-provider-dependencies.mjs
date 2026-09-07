import { createHttpJsonContentSource } from "../adapters/http-json-content-source.mjs";
import { createOpenAiCompatibleSummaryProvider } from "../adapters/openai-compatible-summary-provider.mjs";
import { createRssBlogContentSource } from "../adapters/rss-blog-content-source.mjs";
import { createWorkersAiSummaryProvider } from "../adapters/workers-ai-summary-provider.mjs";
import { validateCandidateSelectionMode } from "../pipeline/candidate-selection.mjs";
import "../../../product/config.js";

const PRODUCT_EDITORIAL_CONFIG = globalThis.ProductConfig.editorial;
const SUMMARY_FEATURE_CONFIG = globalThis.ProductConfig.summaryFeatures;
const validateSummaryFeatureConfig = globalThis.ProductConfig.validateSummaryFeatureConfig;
const SUMMARY_PROVIDERS_CONFIG = globalThis.ProductConfig.summaryProviders;

export const GENERATION_PROVIDER_CONFIGURATION = Object.freeze({
  contentSourceUrl: "CONTENT_SOURCE_URL",
  contentSourceApiKey: "CONTENT_SOURCE_API_KEY",
  summaryProviderUrl: "SUMMARY_PROVIDER_URL",
  summaryProviderApiKey: "SUMMARY_PROVIDER_API_KEY",
  summaryProviderModel: "SUMMARY_PROVIDER_MODEL"
});

const PROVIDER_KIND = Object.freeze({ openai: "openai", workersAi: "workers-ai", openrouter: "openrouter" });
export const SUMMARY_PROVIDER_FALLBACK_ORDER = Object.freeze(SUMMARY_PROVIDERS_CONFIG.fallbackOrder);
export const OPENROUTER_DEFAULT_BASE_URL = SUMMARY_PROVIDERS_CONFIG.openrouter.defaultBaseUrl;

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

/**
 * Returns true when the runtime values include the minimum credentials for the given provider kind.
 */
function isProviderConfigured(kind, values) {
  if (kind === PROVIDER_KIND.workersAi) {
    return !!(values?.["AI"] && configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel));
  }
  if (kind === PROVIDER_KIND.openrouter) {
    return !!(configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderApiKey) &&
              configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel));
  }
  if (kind === PROVIDER_KIND.openai) {
    return !!(configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderUrl) &&
              configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderApiKey) &&
              configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel));
  }
  return false;
}

/**
 * Returns true when a provider kind has a partial configuration that cannot be
 * satisfied by any other provider. Used during fallback-order iteration to catch
 * misconfiguration instead of silently skipping it. Because the openai and
 * openrouter kinds share the SUMMARY_PROVIDER_API_KEY/MODEL variables, a missing
 * URL with key+model present is a valid openrouter config (not a broken openai
 * one), so openai is only flagged when a URL configures it but key or model is
 * missing.
 */
function hasPartialProviderConfig(kind, values) {
  if (kind === PROVIDER_KIND.openai) {
    const hasUrl = !!configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderUrl);
    const hasKey = !!configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderApiKey);
    const hasModel = !!configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel);
    // A configured URL but missing key/model means openai is half-set-up and no
    // other provider can use that URL, so it is genuinely broken.
    return hasUrl && (!hasKey || !hasModel);
  }
  if (kind === PROVIDER_KIND.openrouter) {
    // Without its own URL, a key+model-only setup belongs to openai in the chain
    // precedence, so openrouter is never "partial" on its own.
    return false;
  }
  if (kind === PROVIDER_KIND.workersAi) {
    const hasBinding = !!(values?.["AI"]);
    const hasModel = !!configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel);
    // Flag a present AI binding with a missing model as broken.
    return hasBinding && !hasModel;
  }
  return false;
}

/**
 * Wraps multiple summary providers with automatic fallback. When generateEdition
 * fails on the first provider, the next provider in the array is tried.
 */
function createCompositeSummaryProvider(providers) {
  if (providers.length === 1) return providers[0];
  return {
    async generateEdition({ targetDate, candidates, eventLogger }) {
      let lastError;
      for (const provider of providers) {
        try {
          return await provider.generateEdition({ targetDate, candidates, eventLogger });
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    }
  };
}

/**
 * Builds portable content and summary dependencies from plain runtime values.
 * Runtimes choose how values are stored and injected; this module owns their meaning.
 *
 * Summary provider selection is entirely driven by the product-owned fallbackOrder
 * from product/config.js: the factory walks it, instantiates every kind that has
 * complete runtime credentials, and wraps them in a composite that falls through
 * on failure. There is no separate kind override.
 */
export function createGenerationProviderDependencies(values, { fetchImpl } = {}) {
  validateSummaryFeatureConfig();
  validateCandidateSelectionMode(PRODUCT_EDITORIAL_CONFIG.candidateSelection?.mode);

  const sourceUrl = configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.contentSourceUrl);
  const options = fetchImpl ? { fetchImpl } : {};
  const contextConfiguration = Object.fromEntries(SUMMARY_FEATURE_CONFIG.generation.map((key) => [key, SUMMARY_FEATURE_CONFIG.contexts[key]]));
  const generationInstruction = PRODUCT_EDITORIAL_CONFIG.generationInstruction;

  // Walk the configured fallbackOrder, instantiate providers that have complete
  // credentials, and wrap them in a composite that falls through on failure.
  const providers = [];
  for (const kind of SUMMARY_PROVIDER_FALLBACK_ORDER) {
      if (isProviderConfigured(kind, values)) {
        const provider = createSummaryProvider(kind, values, contextConfiguration, generationInstruction, options);
        if (provider) providers.push(provider);
      } else if (hasPartialProviderConfig(kind, values)) {
        throw new Error(`Summary provider "${kind}" has a partial configuration. Provide all required fields or remove them entirely.`);
      }
  }
  const summaryProvider = providers.length > 0 ? createCompositeSummaryProvider(providers) : null;

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
      summaryProvider
  };
}

function createSummaryProvider(kind, values, summaryContexts, generationInstruction, options) {
  const openaiCompatibleConfig = SUMMARY_PROVIDERS_CONFIG.openaiCompatible;
  const workersAiConfig = SUMMARY_PROVIDERS_CONFIG.workersAi;
  const requestTimeoutMs = SUMMARY_PROVIDERS_CONFIG.requestTimeoutMs;

  if (kind === PROVIDER_KIND.workersAi) {
      return createWorkersAiSummaryProvider({
        ai: values?.["AI"],
        model: configuredValueAsArray(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel),
        summaryContexts,
        generationInstruction,
        retryableStatuses: workersAiConfig.retryableStatuses,
        retryableStatusRange: workersAiConfig.retryableStatusRange,
        retryableMessageTerms: workersAiConfig.retryableMessageTerms
      });
  }
  if (kind === PROVIDER_KIND.openrouter &&
        (configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderApiKey) ||
         configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel))) {
      // OpenRouter is OpenAI-compatible, so it reuses the shared adapter pointed at
      // the product-owned default OpenRouter.ai base URL.
      return createOpenAiCompatibleSummaryProvider({
        baseUrl: SUMMARY_PROVIDERS_CONFIG.openrouter.defaultBaseUrl,
        apiKey: configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderApiKey),
        model: configuredValueAsArray(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel),
        summaryContexts,
        generationInstruction,
        retryableStatuses: openaiCompatibleConfig.retryableStatuses,
        requestTimeoutMs,
        ...options
      });
  }
  if (kind === PROVIDER_KIND.openai && configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderUrl)) {
      return createOpenAiCompatibleSummaryProvider({
        baseUrl: configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderUrl),
        apiKey: configuredValue(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderApiKey),
        model: configuredValueAsArray(values, GENERATION_PROVIDER_CONFIGURATION.summaryProviderModel),
        summaryContexts,
        generationInstruction,
        retryableStatuses: openaiCompatibleConfig.retryableStatuses,
        requestTimeoutMs,
        ...options
      });
  }
  return null;
}
