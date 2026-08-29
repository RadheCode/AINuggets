function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

export function createGenerationEventLogger({ runId, editionRepository, logger = console }) {
  if (!runId) throw new Error("A generation run ID is required.");
  if (!editionRepository?.recordRunEvent) throw new Error("The edition repository must support generation run events.");

  let pending = Promise.resolve();
  const enqueue = (operation) => {
    pending = pending.then(operation, operation);
    return pending;
  };

  return {
    async record(stage, event, metadata = {}, { outcome = "info", durationMs } = {}) {
      const entry = {
        runId,
        stage,
        event,
        outcome,
        metadata,
        ...(Number.isFinite(durationMs) ? { durationMs: Math.round(durationMs) } : {})
      };
      return enqueue(async () => {
        await editionRepository.recordRunEvent(entry);
        logger.info?.({ type: "generation-run-event", ...entry });
      });
    },
    async failure(stage, event, error, metadata = {}) {
      return this.record(stage, event, { ...metadata, error: safeError(error) }, { outcome: "failed" });
    }
  };
}

export function newGenerationRunId() {
  return crypto.randomUUID();
}
