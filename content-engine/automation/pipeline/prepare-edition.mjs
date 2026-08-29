import { validateEdition } from "../domain/validate-edition.mjs";
import { REQUIRED_CANDIDATE_COUNT } from "./candidate-selection.mjs";

export async function prepareEdition({ targetDate, candidates, summaryProvider, summaryContexts, eventLogger }) {
  if (candidates.length !== REQUIRED_CANDIDATE_COUNT) {
    throw new Error(`Exactly ${REQUIRED_CANDIDATE_COUNT} candidates are required before requesting a summary.`);
  }
  const startedAt = Date.now();
  await eventLogger.record("generation", "summary-provider-requested", {
    candidateCount: candidates.length,
    summaryContexts: Object.keys(summaryContexts)
  });
  let generatedEdition;
  try {
    generatedEdition = await summaryProvider.generateEdition({ targetDate, candidates, eventLogger });
  } catch (error) {
    await eventLogger.failure("generation", "summary-provider-failed", error, { candidateCount: candidates.length });
    throw error;
  }
  await eventLogger.record("generation", "summary-provider-succeeded", {
    generatedStoryCount: Array.isArray(generatedEdition?.stories) ? generatedEdition.stories.length : null
  }, { outcome: "succeeded", durationMs: Date.now() - startedAt });

  const validationStartedAt = Date.now();
  let edition;
  try {
    edition = validateEdition(generatedEdition, targetDate, summaryContexts);
  } catch (error) {
    await eventLogger.failure("validation", "edition-validation-failed", error, {
      generatedStoryCount: Array.isArray(generatedEdition?.stories) ? generatedEdition.stories.length : null
    });
    throw error;
  }
  await eventLogger.record("validation", "edition-validation-succeeded", {
    storyCount: edition.stories.length,
    leadCount: edition.stories.filter((story) => story.type === "lead").length,
    wideCount: edition.stories.filter((story) => story.type === "wide").length
  }, { outcome: "succeeded", durationMs: Date.now() - validationStartedAt });
  const generatedContexts = Object.keys(summaryContexts);
  for (const story of edition.stories) {
    await eventLogger.record("validation", "story-summary-validated", {
      storyId: story.id,
      category: story.category,
      layout: story.type || null,
      summaryCharacterCounts: Object.fromEntries(generatedContexts.map((key) => [key, story.summaries[key].length]))
    }, { outcome: "succeeded" });
    story.summaries = Object.fromEntries(generatedContexts.map((key) => [key, story.summaries[key]]));
  }
  return edition;
}
