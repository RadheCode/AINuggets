const SUPPORTED_LAYOUTS = new Set([undefined, null, "lead", "wide"]);

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Edition field "${field}" must be a non-empty string.`);
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

  if (!Array.isArray(edition.briefing.meta)) throw new Error("Edition briefing.meta must be an array.");
  if (!Array.isArray(edition.stories) || ![4, 5].includes(edition.stories.length)) {
    throw new Error("An edition must contain exactly four or five stories.");
  }

  const ids = new Set();
  let leadCount = 0;
  edition.stories.forEach((story, index) => {
    requireText(story.id, `stories[${index}].id`);
    requireText(story.category, `stories[${index}].category`);
    requireText(story.title, `stories[${index}].title`);
    requireText(story.summary, `stories[${index}].summary`);
    requireHttpsUrl(story.href, `stories[${index}].href`);
    requireText(story.art, `stories[${index}].art`);
    if (story.sourceUrl !== undefined && story.sourceUrl !== null) {
      requireHttpsUrl(story.sourceUrl, `stories[${index}].sourceUrl`);
    }
    if (ids.has(story.id)) throw new Error(`Duplicate story ID: ${story.id}.`);
    if (!SUPPORTED_LAYOUTS.has(story.type)) throw new Error(`Unsupported story layout: ${story.type}.`);
    if (story.type === "lead") leadCount += 1;
    ids.add(story.id);
  });

  if (leadCount !== 1) throw new Error("An edition must contain exactly one lead story.");
  return edition;
}
