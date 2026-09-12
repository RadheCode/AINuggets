import { isValidEditorialDate } from "../domain/editorial-date.mjs";
import "../../../product/config.js";
import { collectCandidates } from "../pipeline/collect-candidates.mjs";
import { completeDryRun, persistEdition, recordFailedRun } from "../pipeline/persist-edition.mjs";
import { prepareEdition } from "../pipeline/prepare-edition.mjs";
import { evaluateRunEligibility, recordSkippedRun } from "../pipeline/run-eligibility.mjs";
import { createGenerationEventLogger, newGenerationRunId } from "../pipeline/generation-event-logger.mjs";

const SUMMARY_FEATURE_CONFIG = globalThis.ProductConfig.summaryFeatures;

export async function generateDailyEdition({
  targetDate,
  editionRepository,
  contentSources = [],
  summaryProvider,
  summaryContexts = Object.fromEntries(SUMMARY_FEATURE_CONFIG.generation.map((key) => [key, SUMMARY_FEATURE_CONFIG.contexts[key]])),
  candidateSelection = { mode: "priority" },
  automaticallyPublish = false,
    logger = console,
    dryRun = false,
    generationAttempts
  }) {
    if (!isValidEditorialDate(targetDate)) throw new Error(`Invalid target date: ${targetDate}.`);
    if (!editionRepository) throw new Error("An edition repository is required.");

    if (editionRepository.purgeGenerationRuns) await editionRepository.purgeGenerationRuns({ retainedDays: 3 });
    const runId = newGenerationRunId();
    await editionRepository.createGenerationRun({ runId, targetDate });
    const eventLogger = createGenerationEventLogger({ runId, editionRepository, logger });
    await eventLogger.record("run", "generation-run-started", { targetDate, sourceCount: contentSources.length, dryRun });

    const eligibility = await evaluateRunEligibility({ targetDate, editionRepository, contentSources, summaryProvider });
    if (eligibility.status === "skipped") {
      return recordSkippedRun({ editionRepository, targetDate, runId, reason: eligibility.reason, eventLogger });
    }
    await eventLogger.record("eligibility", "run-eligible", { targetDate, dryRun }, { outcome: "succeeded" });

    try {
      const candidates = await collectCandidates(contentSources, targetDate, editionRepository, candidateSelection, eventLogger);
      const edition = await prepareEdition({ targetDate, candidates, summaryProvider, summaryContexts, eventLogger, generationAttempts });
      if (dryRun) return completeDryRun({ editionRepository, edition, targetDate, runId, logger, eventLogger });
      return persistEdition({ editionRepository, edition, targetDate, runId, automaticallyPublish, logger, eventLogger });
    } catch (error) {
      await recordFailedRun({ editionRepository, targetDate, runId, error, logger, eventLogger });
      throw error;
    }
  }
