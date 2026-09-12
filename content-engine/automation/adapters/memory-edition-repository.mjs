function compositeKey(date, editionNumber) {
  return `${date}#${editionNumber}`;
}

export function createMemoryEditionRepository(initialEditions = []) {
  // Stored editions are keyed by `${date}#${editionNumber}` so a single day can
  // hold multiple numbered editions without overwrites, mirroring the D1 schema.
  const editions = new Map();
  const runs = [];
  const events = [];

  for (const edition of initialEditions) {
    const editionNumber = edition.editionNumber || 1;
    editions.set(compositeKey(edition.date, editionNumber), {
      ...structuredClone(edition),
      editionNumber,
      isLatest: edition.isLatest ?? true
    });
  }

  function editionsForDate(date) {
    return [...editions.values()]
      .filter((edition) => edition.date === date)
      .sort((a, b) => a.editionNumber - b.editionNumber);
  }

  function latestForDate(date) {
    return editionsForDate(date).findLast((edition) => edition.isLatest) || null;
  }

  return {
    editions,
    runs,
    events,
    listForDate(date) {
      return editionsForDate(date);
    },
    latestForDate,
    async hasEdition(date) {
      return Boolean(latestForDate(date));
    },
    async listPublishedStoryUrls({ startDate, endDate }) {
      return [...editions.values()]
        .filter((edition) => edition.status === "published" && edition.date >= startDate && edition.date < endDate)
        .flatMap((edition) => edition.stories || [])
        .map((story) => story.href)
        .filter(Boolean);
    },
    async saveEdition(edition, { status = "draft" } = {}) {
      const siblings = editionsForDate(edition.date);
      const editionNumber = siblings.length
        ? Math.max(...siblings.map((editionOnDate) => editionOnDate.editionNumber)) + 1
        : 1;
      for (const editionOnDate of siblings) editionOnDate.isLatest = false;
      const saved = { ...structuredClone(edition), status, editionNumber, isLatest: true };
      editions.set(compositeKey(edition.date, editionNumber), saved);
    },
    async createGenerationRun(run) {
      runs.push({ ...run, status: "started" });
    },
    async finishGenerationRun({ runId, status, details }) {
      const run = runs.find((candidate) => candidate.runId === runId);
      if (!run) throw new Error(`Generation run ${runId} does not exist.`);
      Object.assign(run, { status, details });
    },
    async recordRunEvent(event) {
      events.push({ sequence: events.length + 1, ...structuredClone(event) });
    },
    async purgeGenerationRuns() {
      // The in-memory test double has no timestamps to retain or purge.
    }
  };
}
