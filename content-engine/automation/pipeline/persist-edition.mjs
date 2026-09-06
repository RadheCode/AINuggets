export async function persistEdition({ editionRepository, edition, targetDate, runId, automaticallyPublish, forceReplace = false, refreshExisting = false, logger, eventLogger }) {
  const publicationStatus = automaticallyPublish ? "published" : "draft";
  const startedAt = Date.now();
  const statement = refreshExisting ? "Refreshed" : forceReplace ? "Replaced" : "Created";
  await eventLogger.record("persistence", "edition-save-started", { publicationStatus, storyCount: edition.stories.length, forceReplace, refreshExisting });
  await editionRepository.saveEdition(edition, { status: publicationStatus, replaceExisting: refreshExisting || forceReplace });
  await eventLogger.record("persistence", "edition-save-succeeded", { publicationStatus, storyCount: edition.stories.length, forceReplace, refreshExisting }, {
    outcome: "succeeded",
    durationMs: Date.now() - startedAt
  });
  await editionRepository.finishGenerationRun({
    runId,
    status: "succeeded",
    details: `${statement} ${publicationStatus} edition with ${edition.stories.length} stories.`
  });
  logger.info?.(`${statement} ${publicationStatus} edition for ${targetDate}.`);
  return { runId, targetDate, status: "succeeded", storyCount: edition.stories.length, publicationStatus, refreshExisting, forceReplace };
}

export async function completeDryRun({ editionRepository, edition, targetDate, runId, logger, eventLogger }) {
  await eventLogger.record("persistence", "edition-save-skipped", {
    reason: "dry-run",
    storyCount: edition.stories.length
  }, { outcome: "skipped" });
  await editionRepository.finishGenerationRun({
    runId,
    status: "succeeded",
    details: `Validated dry run with ${edition.stories.length} stories; no edition was saved.`
  });
  logger.info?.(`Validated dry run for ${targetDate}; no edition was saved.`);
  return { runId, targetDate, status: "succeeded", storyCount: edition.stories.length, dryRun: true };
}

export async function recordFailedRun({ editionRepository, targetDate, runId, error, logger, eventLogger }) {
  await eventLogger.failure("run", "generation-run-failed", error);
  await editionRepository.finishGenerationRun({
    runId,
    status: "failed",
    details: error instanceof Error ? error.message : String(error)
  });
  logger.error?.(`Daily edition generation failed for ${targetDate}.`, error);
}
