export function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = candidate.canonicalUrl || candidate.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function collectCandidates(contentSources, targetDate, eventLogger) {
  await eventLogger.record("collection", "candidate-collection-started", { sourceCount: contentSources.length });
  const batches = await Promise.all(contentSources.map(async (source, index) => {
    const startedAt = Date.now();
    await eventLogger.record("collection", "source-fetch-started", { sourceIndex: index + 1 });
    try {
      const candidates = await source.fetchCandidates({ targetDate, eventLogger });
      await eventLogger.record("collection", "source-fetch-succeeded", {
        sourceIndex: index + 1,
        candidateCount: candidates.length
      }, { outcome: "succeeded", durationMs: Date.now() - startedAt });
      return candidates;
    } catch (error) {
      await eventLogger.failure("collection", "source-fetch-failed", error, { sourceIndex: index + 1 });
      throw error;
    }
  }));
  const collectedCount = batches.flat().length;
  const candidates = uniqueCandidates(batches.flat());
  await eventLogger.record("collection", "candidate-deduplication-complete", {
    collectedCount,
    uniqueCount: candidates.length,
    discardedDuplicateCount: collectedCount - candidates.length
  }, { outcome: "succeeded" });
  return candidates;
}
