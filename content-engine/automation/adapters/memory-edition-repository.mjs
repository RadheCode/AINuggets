export function createMemoryEditionRepository(initialEditions = []) {
  const editions = new Map(initialEditions.map((edition) => [edition.date, edition]));
  const runs = [];
  const events = [];

  return {
    editions,
    runs,
    events,
    async hasEdition(date) {
      return editions.has(date);
    },
    async saveEdition(edition, { status = "draft" } = {}) {
      if (editions.has(edition.date)) throw new Error(`Edition ${edition.date} already exists.`);
      editions.set(edition.date, { ...structuredClone(edition), status });
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
