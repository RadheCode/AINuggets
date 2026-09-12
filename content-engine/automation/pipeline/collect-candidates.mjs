import {
  canonicalCandidateUrl,
  planDiversifiedCandidateSelection,
  REQUIRED_CANDIDATE_COUNT,
  validateCandidateSelectionMode
} from "./candidate-selection.mjs";

const RECENT_PUBLISHED_LOOKBACK_DAYS = 10;

function safeUrlForLog(value) {
  try {
    const url = new URL(value);
    for (const [key] of url.searchParams) {
      if (/(authorization|key|password|secret|signature|sig|token)/i.test(key)) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}

function candidateLogDetails(candidate, { url, canonicalUrl, ...additionalDetails } = {}) {
  return {
    url: safeUrlForLog(url || candidate.url),
    canonicalUrl: safeUrlForLog(canonicalUrl || candidate.canonicalUrl || canonicalCandidateUrl(candidate)),
    sourceName: candidate.sourceName || null,
    category: candidate.category || null,
    sourcePublishedAt: candidate.sourcePublishedAt || null,
    priority: Number.isFinite(candidate.priority) ? candidate.priority : null,
    ...additionalDetails
  };
}

function lookbackStartDate(targetDate) {
  const date = new Date(`${targetDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - RECENT_PUBLISHED_LOOKBACK_DAYS);
  return date.toISOString().slice(0, 10);
}

export async function collectCandidates(contentSources, targetDate, editionRepository, candidateSelection, eventLogger) {
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
  const flattened = batches.flatMap((batch, sourceIndex) => batch.map((candidate, sourceCandidateIndex) => ({
    candidate,
    sourceIndex: sourceIndex + 1,
    sourceCandidateIndex: sourceCandidateIndex + 1
  })));
  await eventLogger.record("candidate-selection", "candidate-batches-flattened", {
    sourceBatches: batches.map((batch, sourceIndex) => ({
      sourceIndex: sourceIndex + 1,
      candidateCount: batch.length,
      candidates: batch.map((candidate, sourceCandidateIndex) => candidateLogDetails(candidate, {
        sourceCandidateIndex: sourceCandidateIndex + 1
      }))
    })),
    flattenedCandidateCount: flattened.length
  }, { outcome: "succeeded" });

  const canonicalized = flattened.map(({ candidate, sourceIndex, sourceCandidateIndex }, collectionIndex) => {
    const canonicalUrl = canonicalCandidateUrl(candidate);
    return {
      candidate,
      sourceIndex,
      sourceCandidateIndex,
      collectionIndex: collectionIndex + 1,
      canonicalUrl,
      canonicalKey: canonicalUrl?.toLowerCase() || null
    };
  });
  await eventLogger.record("candidate-selection", "candidate-urls-canonicalized", {
    candidates: canonicalized.map(({ candidate, sourceIndex, sourceCandidateIndex, collectionIndex, canonicalUrl, canonicalKey }) => (
      candidateLogDetails(candidate, { sourceIndex, sourceCandidateIndex, collectionIndex, canonicalUrl, canonicalKey })
    ))
  }, { outcome: "succeeded" });

  const seenCanonicalUrls = new Map();
  const retained = [];
  const removedDuringDeduplication = [];
  for (const entry of canonicalized) {
    if (!entry.canonicalKey) {
      removedDuringDeduplication.push({
        ...candidateLogDetails(entry.candidate, { collectionIndex: entry.collectionIndex, canonicalUrl: null, reason: "invalid-canonical-url" })
      });
      continue;
    }
    const firstCollectionIndex = seenCanonicalUrls.get(entry.canonicalKey);
    if (firstCollectionIndex) {
      removedDuringDeduplication.push({
        ...candidateLogDetails(entry.candidate, {
          collectionIndex: entry.collectionIndex,
          canonicalUrl: entry.canonicalUrl,
          reason: "duplicate-canonical-url",
          retainedCollectionIndex: firstCollectionIndex
        })
      });
      continue;
    }
    seenCanonicalUrls.set(entry.canonicalKey, entry.collectionIndex);
    entry.candidate.canonicalUrl = entry.canonicalUrl;
    retained.push(entry.candidate);
  }
  await eventLogger.record("collection", "candidate-deduplication-complete", {
    collectedCount: canonicalized.length,
    uniqueCount: retained.length,
    discardedDuplicateCount: removedDuringDeduplication.length,
    removedCandidates: removedDuringDeduplication,
    retainedCandidates: retained.map((candidate) => candidateLogDetails(candidate))
  }, { outcome: "succeeded" });
  const startDate = lookbackStartDate(targetDate);
    const endDate = targetDate;
    const recentUrls = await editionRepository.listPublishedStoryUrls({
      startDate,
      endDate
    });
  const historicalUrlRecords = recentUrls.map((url) => ({
    url,
    canonicalUrl: normalizeUrl(url)
  }));
  const historicalUrls = historicalUrlRecords.map(({ url, canonicalUrl }) => ({
    url: safeUrlForLog(url),
    canonicalUrl: safeUrlForLog(canonicalUrl)
  }));
  const recentCanonicalUrls = new Set(historicalUrlRecords.map(({ canonicalUrl }) => canonicalUrl).filter(Boolean));
  const excludedRecentCandidates = [];
  const eligibleCandidates = retained.filter((candidate) => {
    const canonicalUrl = canonicalCandidateUrl(candidate)?.toLowerCase();
    if (!recentCanonicalUrls.has(canonicalUrl)) return true;
    excludedRecentCandidates.push(candidateLogDetails(candidate, { canonicalUrl: safeUrlForLog(canonicalUrl), reason: "published-within-lookback-window" }));
    return false;
  });
  await eventLogger.record("collection", "recent-published-candidates-excluded", {
    lookbackDays: RECENT_PUBLISHED_LOOKBACK_DAYS,
    startDate,
    endDate,
    historicalUrls,
    historicalUrlCount: recentCanonicalUrls.size,
    excludedCandidateCount: excludedRecentCandidates.length,
    excludedCandidates: excludedRecentCandidates,
    eligibleCandidateCount: eligibleCandidates.length,
    eligibleCandidates: eligibleCandidates.map((candidate) => candidateLogDetails(candidate))
  }, { outcome: "succeeded" });
  const selectionMode = validateCandidateSelectionMode(candidateSelection?.mode);
  const selection = planDiversifiedCandidateSelection(eligibleCandidates, { selectionMode });
  await eventLogger.record("candidate-selection", "eligible-candidates-ordered", {
    selectionMode,
    orderedCandidates: selection.ranked.map((candidate, order) => candidateLogDetails(candidate, {
      order: order + 1,
      rankingScore: candidate.rankingScore
    }))
  }, { outcome: "succeeded" });
  await eventLogger.record("candidate-selection", "category-diversity-selection-complete", {
    selectionMode,
    categorySelections: selection.categorySelections.map((candidate) => candidateLogDetails(candidate, { rankingScore: candidate.rankingScore })),
    deferredForFallback: selection.deferredForFallback.map((candidate) => candidateLogDetails(candidate, { rankingScore: candidate.rankingScore, reason: "category-already-selected" })),
    deferredAfterCapacity: selection.deferredAfterCapacity.map((candidate) => candidateLogDetails(candidate, { rankingScore: candidate.rankingScore, reason: "five-candidate-capacity-reached" })),
    fallbackSelections: selection.fallbackSelections.map((candidate) => candidateLogDetails(candidate, { rankingScore: candidate.rankingScore }))
  }, { outcome: "succeeded" });
  await eventLogger.record("candidate-selection", "ranked-candidates-selected", {
    eligibleCandidateCount: eligibleCandidates.length,
    selectedCandidateCount: selection.selected.length,
    selectionMode,
    selected: selection.selected.map((candidate, selectionOrder) => candidateLogDetails(candidate, {
      selectionOrder: selectionOrder + 1,
      rankingScore: candidate.rankingScore
    }))
  }, { outcome: "succeeded" });
  if (selection.selected.length !== REQUIRED_CANDIDATE_COUNT) {
    throw new Error(`Exactly ${REQUIRED_CANDIDATE_COUNT} eligible candidates are required after duplicate and recent-publication filtering; found ${selection.selected.length}.`);
  }
  return selection.selected;
}

function normalizeUrl(value) {
  return canonicalCandidateUrl({ url: value })?.toLowerCase();
}
