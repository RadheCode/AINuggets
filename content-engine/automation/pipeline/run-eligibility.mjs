export const SKIP_EXISTING = "Edition already exists.";
export const SKIP_NO_CONTENT_SOURCE = "No content source is configured; no edition was generated.";
export const SKIP_NO_SUMMARY_PROVIDER = "No summary provider is configured; no edition was generated.";

export async function evaluateRunEligibility({ targetDate, editionRepository, contentSources, summaryProvider }) {
  if (await editionRepository.hasEdition(targetDate)) {
    return { status: "skipped", reason: SKIP_EXISTING };
  }
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
