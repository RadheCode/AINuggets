export const SKIP_NO_CONTENT_SOURCE = "No content source is configured; no edition was generated.";
export const SKIP_NO_SUMMARY_PROVIDER = "No summary provider is configured; no edition was generated.";

export async function evaluateRunEligibility({ targetDate, editionRepository, contentSources, summaryProvider }) {
  // A new edition is created for every eligible run; an existing edition for the
  // day is never a reason to skip, because each run adds a new numbered edition.
  if (!contentSources.length) {
    return { status: "skipped", reason: SKIP_NO_CONTENT_SOURCE };
  }
  if (!summaryProvider) {
    return { status: "skipped", reason: SKIP_NO_SUMMARY_PROVIDER };
  }
  return { status: "ready" };
}

export async function recordSkippedRun({ editionRepository, targetDate, runId, reason, eventLogger }) {
  await eventLogger.record("eligibility", "run-skipped", { reason }, { outcome: "skipped" });
  await editionRepository.finishGenerationRun({ runId, status: "skipped", details: reason });
  return { runId, targetDate, status: "skipped", reason };
}
