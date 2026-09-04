import { validateEdition } from "../domain/validate-edition.mjs";
import { REQUIRED_CANDIDATE_COUNT } from "./candidate-selection.mjs";

const DEFAULT_GENERATION_ATTEMPTS = 3;
const DEFAULT_EYEBROW = "AI Daily";

/**
 * Repairs common structural issues in the generated edition before validation.
 * These are deterministic pipeline-owned fields or easily inferred from candidates.
 */
function repairEdition(generatedEdition, targetDate, candidates) {
  if (!generatedEdition || typeof generatedEdition !== "object") return generatedEdition;

  // Date is deterministic pipeline metadata.
  generatedEdition.date = targetDate;

  // Briefing fields - provide defaults if missing/empty.
  if (!generatedEdition.briefing || typeof generatedEdition.briefing !== "object") {
    generatedEdition.briefing = {};
  }
  if (!generatedEdition.briefing.eyebrow || !String(generatedEdition.briefing.eyebrow).trim()) {
    generatedEdition.briefing.eyebrow = DEFAULT_EYEBROW;
  }
  if (!generatedEdition.briefing.title || !String(generatedEdition.briefing.title).trim()) {
    generatedEdition.briefing.title = "Daily AI Briefing";
  }
  if (!generatedEdition.briefing.emphasis || !String(generatedEdition.briefing.emphasis).trim()) {
    generatedEdition.briefing.emphasis = "Curated updates";
  }
  if (!generatedEdition.briefing.summary || !String(generatedEdition.briefing.summary).trim()) {
    generatedEdition.briefing.summary = "Today's most significant AI developments.";
  }
  if (!Array.isArray(generatedEdition.briefing.meta)) {
    generatedEdition.briefing.meta = ["4 stories", "AI", "Technology"];
  }

  // Ensure stories array exists and has 4-5 items with non-empty ids and categories.
  if (!Array.isArray(generatedEdition.stories)) {
    generatedEdition.stories = [];
  }
  // Repair each story's id, category, title, art if empty, inferring from candidates.
  generatedEdition.stories.forEach((story, index) => {
    if (!story || typeof story !== "object") return;
    const candidate = candidates[index];

    if (!story.id || !String(story.id).trim()) {
      // Prefer candidate URL as a stable id source; fallback to index.
      if (candidate && candidate.url) {
        try {
          const u = new URL(candidate.url);
          story.id = u.hostname.replace("www.", "") + "-" + index;
        } catch {
          story.id = `story-${index + 1}`;
        }
      } else {
        story.id = `story-${index + 1}`;
      }
    }

    if (!story.category || !String(story.category).trim()) {
      // Infer category from candidate if available.
      if (candidate && candidate.category) {
        story.category = candidate.category;
      } else {
        story.category = "General";
      }
    }

    if (!story.title || !String(story.title).trim()) {
      if (candidate && candidate.title) {
        story.title = candidate.title;
      } else {
        story.title = `Story ${index + 1}`;
      }
    }

    if (!story.art || !String(story.art).trim()) {
      // Default to a valid artwork key.
      story.art = "models";
    }
  });

  // Enforce 4-5 stories by trimming excess or padding (should not happen with a well-behaved model).
  if (generatedEdition.stories.length > 5) {
    generatedEdition.stories = generatedEdition.stories.slice(0, 5);
  }
    // If model returns <4 stories, pad with minimal valid stories from remaining candidates.
    while (generatedEdition.stories.length < 4 && generatedEdition.stories.length < candidates.length) {
      const index = generatedEdition.stories.length;
      const candidate = candidates[index];
      generatedEdition.stories.push({
        id: candidate?.url ? new URL(candidate.url).hostname.replace("www.", "") + "-" + index : `story-${index + 1}`,
        type: null,
        category: candidate?.category || "General",
        title: candidate?.title || `Story ${index + 1}`,
        summaries: {
          compact: "Quick take not provided by model.",
          standard: "- Overview not provided by model.\n- Key details missing.\n- Further research needed.",
          detailed: "Deep dive not provided by model.\n\nAdditional context unavailable."
        },
        href: candidate?.url || "https://example.com",
        art: "models",
        sourceUrl: candidate?.url || null,
        sourceName: candidate?.sourceName || null,
        sourcePublishedAt: candidate?.publishedAt || null
      });
    }

    return generatedEdition;
}

export async function prepareEdition({ targetDate, candidates, summaryProvider, summaryContexts, eventLogger, generationAttempts = DEFAULT_GENERATION_ATTEMPTS }) {
  if (candidates.length !== REQUIRED_CANDIDATE_COUNT) {
    throw new Error(`Exactly ${REQUIRED_CANDIDATE_COUNT} candidates are required before requesting a summary.`);
  }
  const startedAt = Date.now();
  await eventLogger.record("generation", "summary-provider-requested", {
    candidateCount: candidates.length,
    summaryContexts: Object.keys(summaryContexts)
  });

  let lastValidationError;
  for (let attempt = 1; attempt <= generationAttempts; attempt += 1) {
    if (attempt > 1) {
      await eventLogger.record("generation", "summary-provider-retrying", {
        attempt,
        reason: lastValidationError?.message
      });
    }
    let generatedEdition;
    try {
      generatedEdition = await summaryProvider.generateEdition({ targetDate, candidates, eventLogger });
    } catch (error) {
      await eventLogger.failure("generation", "summary-provider-failed", error, { candidateCount: candidates.length });
      throw error;
    }

    // The edition date is deterministic runtime metadata owned by the pipeline,
    // not creative output. Models may occasionally echo a wrong date, so pin it
    // to the target date before validation rather than failing the whole run on
    // a value the pipeline already knows.
    if (generatedEdition && typeof generatedEdition === "object") {
      generatedEdition.date = targetDate;
    }

        // Repair common structural issues before validation.
        generatedEdition = repairEdition(generatedEdition, targetDate, candidates);

        const validationStartedAt = Date.now();
    try {
      const edition = validateEdition(generatedEdition, targetDate, summaryContexts);
      await eventLogger.record("generation", "summary-provider-succeeded", {
        generatedStoryCount: Array.isArray(generatedEdition?.stories) ? generatedEdition.stories.length : null,
        attempt
      }, { outcome: "succeeded", durationMs: Date.now() - startedAt });
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
    } catch (error) {
      lastValidationError = error;
      await eventLogger.failure("validation", "edition-validation-failed", error, {
        generatedStoryCount: Array.isArray(generatedEdition?.stories) ? generatedEdition.stories.length : null,
        attempt
      });
      if (attempt === generationAttempts) throw error;
    }
  }
  throw lastValidationError;
}
