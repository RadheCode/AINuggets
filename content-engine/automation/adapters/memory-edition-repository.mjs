export function createMemoryEditionRepository(initialEditions = []) {
  const editions = new Map(initialEditions.map((edition) => [edition.date, edition]));
  const runs = [];

  return {
    editions,
    runs,
    async hasEdition(date) {
      return editions.has(date);
    },
    async saveEdition(edition) {
      if (editions.has(edition.date)) throw new Error(`Edition ${edition.date} already exists.`);
      editions.set(edition.date, structuredClone(edition));
    },
    async recordRun(run) {
      runs.push({ ...run });
    }
  };
}
