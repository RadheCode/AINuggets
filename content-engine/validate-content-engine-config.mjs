const CRON_FIELD_COUNT = 5;
const SUMMARY_CONTEXT_KEYS = ["compact", "standard", "detailed"];

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
}

function requirePublicHttpsUrl(value, label) {
  requireString(value, label);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  if (url.protocol !== "https:" || !url.hostname || url.hostname === "localhost") {
    throw new Error(`${label} must use a public HTTPS URL.`);
  }
}

export function validateContentEngineConfig(config) {
  if (!config || typeof config !== "object") throw new Error("Content engine configuration must be an object.");
  const { schedule, publication, summaries, feeds } = config;
  if (!schedule || typeof schedule !== "object") throw new Error("schedule must be an object.");
  requireString(schedule.cron, "schedule.cron");
  if (schedule.cron.trim().split(/\s+/).length !== CRON_FIELD_COUNT) {
    throw new Error("schedule.cron must use Cloudflare's five-field Cron syntax.");
  }
  if (!publication || typeof publication !== "object" || typeof publication.automaticallyPublish !== "boolean") {
    throw new Error("publication.automaticallyPublish must be a boolean.");
  }
  if (!summaries || typeof summaries !== "object" || !SUMMARY_CONTEXT_KEYS.includes(summaries.defaultContext)) {
    throw new Error("summaries.defaultContext must name a supported summary context.");
  }
  if (!summaries.contexts || typeof summaries.contexts !== "object") {
    throw new Error("summaries.contexts must be an object.");
  }
  for (const key of SUMMARY_CONTEXT_KEYS) {
    const context = summaries.contexts[key];
    if (!context || typeof context !== "object") throw new Error(`summaries.contexts.${key} must be an object.`);
    requireString(context.label, `summaries.contexts.${key}.label`);
    if (!Number.isInteger(context.maxCharacters) || context.maxCharacters < 1) {
      throw new Error(`summaries.contexts.${key}.maxCharacters must be a positive integer.`);
    }
  }
  if (!Array.isArray(feeds) || !feeds.length) throw new Error("feeds must contain at least one source.");

  const names = new Set();
  const urls = new Set();
  for (const [index, feed] of feeds.entries()) {
    const label = `feeds[${index}]`;
    if (!feed || typeof feed !== "object") throw new Error(`${label} must be an object.`);
    requireString(feed.name, `${label}.name`);
    requireString(feed.category, `${label}.category`);
    requirePublicHttpsUrl(feed.feedUrl, `${label}.feedUrl`);
    if (!Number.isFinite(feed.priority)) throw new Error(`${label}.priority must be a number.`);

    const name = feed.name.trim().toLowerCase();
    const url = new URL(feed.feedUrl).href;
    if (names.has(name)) throw new Error(`Duplicate feed name: ${feed.name}.`);
    if (urls.has(url)) throw new Error(`Duplicate feed URL: ${feed.feedUrl}.`);
    names.add(name);
    urls.add(url);
  }

  return config;
}
