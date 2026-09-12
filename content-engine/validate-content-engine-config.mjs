const CRON_FIELD_COUNT = 5;

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
  const { schedule, publication, feeds } = config;
  if (!schedule || typeof schedule !== "object") throw new Error("schedule must be an object.");
  requireString(schedule.cron, "schedule.cron");
  if (schedule.cron.trim().split(/\s+/).length !== CRON_FIELD_COUNT) {
    throw new Error("schedule.cron must use Cloudflare's five-field Cron syntax.");
  }
    if (!publication || typeof publication !== "object" || typeof publication.automaticallyPublish !== "boolean") {
    throw new Error("publication.automaticallyPublish must be a boolean.");
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
