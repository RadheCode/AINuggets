export const REQUIRED_CANDIDATE_COUNT = 5;
const SUPPORTED_SELECTION_MODES = new Set(["priority", "random"]);

export function normalizeCanonicalUrl(value) {
  try {
    const url = new URL(value);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => url.searchParams.delete(key));
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function canonicalCandidateUrl(candidate) {
  return normalizeCanonicalUrl(candidate?.canonicalUrl || candidate?.url);
}

export function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const canonicalUrl = canonicalCandidateUrl(candidate);
    const key = canonicalUrl?.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    candidate.canonicalUrl = canonicalUrl;
    return true;
  });
}

export function validateCandidateSelectionMode(mode) {
  if (!SUPPORTED_SELECTION_MODES.has(mode)) {
    throw new Error(`Unsupported candidate selection mode: ${mode}.`);
  }
  return mode;
}

function score(candidate, now) {
  const publishedTimestamp = candidate.publishedTimestamp || Date.parse(candidate.sourcePublishedAt || "");
  const ageInDays = publishedTimestamp ? Math.max(0, (now - publishedTimestamp) / 86_400_000) : 365;
  return (candidate.priority || 0) * 1_000 - Math.min(ageInDays, 365);
}

function shuffle(candidates, random) {
  const shuffled = [...candidates];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function planDiversifiedCandidateSelection(candidates, {
  now = Date.now(),
  count = REQUIRED_CANDIDATE_COUNT,
  selectionMode = "priority",
  random = Math.random
} = {}) {
  validateCandidateSelectionMode(selectionMode);
  if (typeof random !== "function") throw new Error("A candidate selection randomizer must be a function.");
  const ranked = selectionMode === "priority"
    ? uniqueCandidates(candidates).map((candidate) => ({ ...candidate, rankingScore: score(candidate, now) })).sort((left, right) => right.rankingScore - left.rankingScore)
    : shuffle(uniqueCandidates(candidates), random).map((candidate) => ({ ...candidate, rankingScore: null }));
  const selected = [];
  const categories = new Set();
  const categorySelections = [];
  const deferredForFallback = [];
  const deferredAfterCapacity = [];
  for (const candidate of ranked) {
    if (selected.length === count) {
      deferredAfterCapacity.push(candidate);
      continue;
    }
    if (!categories.has(candidate.category)) {
      selected.push(candidate);
      categories.add(candidate.category);
      categorySelections.push(candidate);
    } else {
      deferredForFallback.push(candidate);
    }
  }
  const fallbackSelections = [];
  for (const candidate of ranked) {
    if (selected.length === count) continue;
    if (!selected.includes(candidate)) {
      selected.push(candidate);
      fallbackSelections.push(candidate);
    }
  }
  return { ranked, selected, categorySelections, deferredForFallback, deferredAfterCapacity, fallbackSelections };
}

export function selectDiversifiedCandidates(candidates, options) {
  return planDiversifiedCandidateSelection(candidates, options).selected;
}
