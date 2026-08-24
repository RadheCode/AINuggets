import { CONTENT_ENGINE_CONFIG } from "../../content-engine.config.mjs";

const SUPPORTED_LAYOUTS = new Set([undefined, null, "lead", "wide"]);
const SUPPORTED_ARTWORK = new Set(["models", "agents", "research", "product", "business"]);
const MAX_BRIEFING_TITLE_LENGTH = 44;
const MAX_BRIEFING_EMPHASIS_LENGTH = 50;
const SUMMARY_CONTEXT_KEYS = ["compact", "standard", "detailed"];

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Edition field "${field}" must be a non-empty string.`);
  }
}

function requireMaximumLength(value, maximum, field) {
  if (value.length > maximum) {
    throw new Error(`Edition field "${field}" must be ${maximum} characters or fewer.`);
  }
}

function requireLength(value, minimum, maximum, field) {
  if (value.length < minimum || value.length > maximum) {
    throw new Error(`Edition field "${field}" must be between ${minimum} and ${maximum} characters.`);
  }
}

function requireHttpsUrl(value, field) {
  requireText(value, field);
  try {
    if (new URL(value).protocol !== "https:") throw new Error();
  } catch {
    throw new Error(`Edition field "${field}" must be an HTTPS URL.`);
  }
}

export function validateEdition(edition, targetDate) {
  if (!edition || typeof edition !== "object") throw new Error("The summary provider returned no edition.");
  if (edition.date !== targetDate) throw new Error(`Edition date must be ${targetDate}.`);

  requireText(edition.briefing?.eyebrow, "briefing.eyebrow");
  requireText(edition.briefing?.title, "briefing.title");
  requireText(edition.briefing?.emphasis, "briefing.emphasis");
  requireText(edition.briefing?.summary, "briefing.summary");
  requireMaximumLength(edition.briefing.title, MAX_BRIEFING_TITLE_LENGTH, "briefing.title");
  requireMaximumLength(edition.briefing.emphasis, MAX_BRIEFING_EMPHASIS_LENGTH, "briefing.emphasis");

  if (!Array.isArray(edition.briefing.meta)) throw new Error("Edition briefing.meta must be an array.");
  if (!Array.isArray(edition.stories) || ![4, 5].includes(edition.stories.length)) {
    throw new Error("An edition must contain exactly four or five stories.");
  }

  const ids = new Set();
  let leadCount = 0;
  let wideCount = 0;
  edition.stories.forEach((story, index) => {
    requireText(story.id, `stories[${index}].id`);
    requireText(story.category, `stories[${index}].category`);
    requireText(story.title, `stories[${index}].title`);
    if (!story.summaries || typeof story.summaries !== "object") {
      throw new Error(`Edition field "stories[${index}].summaries" must be an object.`);
    }
    for (const key of SUMMARY_CONTEXT_KEYS) {
      requireText(story.summaries[key], `stories[${index}].summaries.${key}`);
    }
    if (new Set(SUMMARY_CONTEXT_KEYS.map((key) => story.summaries[key].trim())).size !== SUMMARY_CONTEXT_KEYS.length) {
      throw new Error(`Edition field "stories[${index}].summaries" must contain distinct summary contexts.`);
    }
    for (const key of SUMMARY_CONTEXT_KEYS) {
      const context = CONTENT_ENGINE_CONFIG.summaries.contexts[key];
      requireLength(
        story.summaries[key],
        context.minCharacters,
        context.maxCharacters,
        `stories[${index}].summaries.${key}`
      );
    }
    requireHttpsUrl(story.href, `stories[${index}].href`);
    requireText(story.art, `stories[${index}].art`);
    if (!SUPPORTED_ARTWORK.has(story.art)) {
      throw new Error(`Unsupported story artwork: ${story.art}.`);
    }
    if (story.sourceUrl !== undefined && story.sourceUrl !== null) {
      requireHttpsUrl(story.sourceUrl, `stories[${index}].sourceUrl`);
    }
    if (ids.has(story.id)) throw new Error(`Duplicate story ID: ${story.id}.`);
    if (!SUPPORTED_LAYOUTS.has(story.type)) throw new Error(`Unsupported story layout: ${story.type}.`);
    if (story.type === "lead") leadCount += 1;
    if (story.type === "wide") wideCount += 1;
    ids.add(story.id);
  });

  if (leadCount !== 1) throw new Error("An edition must contain exactly one lead story.");
  if (wideCount > 1) throw new Error("An edition may contain at most one wide story.");
  return edition;
}
