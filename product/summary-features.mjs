import "./config.js";

export const SUMMARY_FEATURE_CONFIG = globalThis.ProductConfig.summaryFeatures;

export function validateSummaryFeatureConfig(config = SUMMARY_FEATURE_CONFIG) {
  if (!config || typeof config !== "object") throw new Error("Summary feature configuration must be an object.");
  const { ui, generation, defaultContext, contexts } = config;
  for (const [name, keys] of [["ui", ui], ["generation", generation]]) {
    if (!Array.isArray(keys) || !keys.length || new Set(keys).size !== keys.length) {
      throw new Error(`Summary feature configuration ${name} must contain unique context keys.`);
    }
    for (const key of keys) {
      if (typeof key !== "string" || !contexts?.[key]) throw new Error(`Summary feature configuration ${name} contains an unsupported context: ${key}.`);
    }
  }
  if (typeof defaultContext !== "string" || !ui.includes(defaultContext)) {
    throw new Error("Summary feature configuration defaultContext must be enabled for the UI.");
  }
  for (const [key, context] of Object.entries(contexts || {})) {
    if (!context || typeof context.label !== "string" || !context.label.trim()) throw new Error(`Summary context ${key} must define a label.`);
    if (!Number.isInteger(context.minCharacters) || context.minCharacters < 1) throw new Error(`Summary context ${key} must define a positive minCharacters value.`);
    if (!Number.isInteger(context.maxCharacters) || context.maxCharacters < context.minCharacters) throw new Error(`Summary context ${key} must define a valid maxCharacters value.`);
    if (!["paragraph", "bullets", "paragraphs"].includes(context.format)) throw new Error(`Summary context ${key} must define a supported format.`);
  }
  return config;
}
