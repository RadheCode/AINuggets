export function createD1EditionRepository(db) {
  return {
    async hasEdition(date) {
      return Boolean(await db.prepare(
        "SELECT id FROM editions WHERE edition_date = ? LIMIT 1"
      ).bind(date).first());
    },

    async listPublishedStoryUrls({ startDate, endDate }) {
      const { results } = await db.prepare(`
        SELECT stories.destination_url
        FROM stories
        JOIN editions ON editions.id = stories.edition_id
        WHERE editions.status = 'published'
          AND editions.edition_date >= ?
          AND editions.edition_date < ?
      `).bind(startDate, endDate).all();
      return results.map((story) => story.destination_url);
    },

    async createGenerationRun({ runId, targetDate }) {
      await db.prepare(`
        INSERT INTO generation_runs (run_id, target_date, status)
        VALUES (?, ?, 'started')
      `).bind(runId, targetDate).run();
    },

    async finishGenerationRun({ runId, status, details = null }) {
      await db.prepare(`
        UPDATE generation_runs
        SET status = ?, details = ?, finished_at = CURRENT_TIMESTAMP
        WHERE run_id = ?
      `).bind(status, details, runId).run();
    },

    async recordRunEvent({ runId, stage, event, outcome, durationMs, metadata }) {
      await db.prepare(`
        INSERT INTO generation_run_events (
          run_id, sequence, stage, event_name, outcome, duration_ms, metadata_json
        ) VALUES (?, (
          SELECT COALESCE(MAX(sequence), 0) + 1
          FROM generation_run_events
          WHERE run_id = ?
        ), ?, ?, ?, ?, ?)
      `).bind(
        runId,
        runId,
        stage,
        event,
        outcome,
        durationMs ?? null,
        JSON.stringify(metadata)
      ).run();
    },

    async purgeGenerationRuns({ retainedDays = 3 } = {}) {
      if (!Number.isInteger(retainedDays) || retainedDays < 1) {
        throw new Error("Generation run retention must be a positive whole number of days.");
      }
      const threshold = `-${retainedDays} days`;
      await db.batch([
        db.prepare(`
          DELETE FROM generation_run_events
          WHERE run_id IN (
            SELECT run_id FROM generation_runs
            WHERE finished_at IS NOT NULL
              AND finished_at < datetime('now', ?)
          )
        `).bind(threshold),
        db.prepare(`
          DELETE FROM generation_runs
          WHERE finished_at IS NOT NULL
            AND finished_at < datetime('now', ?)
        `).bind(threshold)
      ]);
    },

    async saveEdition(edition, { status = "draft", replaceExisting = false } = {}) {
      if (!["draft", "published"].includes(status)) throw new Error(`Unsupported edition status: ${status}.`);
      const statements = [
        ...(replaceExisting ? [db.prepare("DELETE FROM editions WHERE edition_date = ?").bind(edition.date)] : []),
        db.prepare(`
          INSERT INTO editions (
            edition_date, status, eyebrow, title, emphasis, summary, meta_json, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)
        `).bind(
          edition.date,
          status,
          edition.briefing.eyebrow,
          edition.briefing.title,
          edition.briefing.emphasis,
          edition.briefing.summary,
          JSON.stringify(edition.briefing.meta),
          status
        ),
        ...edition.stories.map((story, index) => db.prepare(`
          INSERT INTO stories (
            edition_id, story_key, position, layout, category, title, summary_compact, summary, summary_detailed,
            destination_url, artwork_key, source_url, source_name, source_published_at
          ) VALUES (
            (SELECT id FROM editions WHERE edition_date = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `).bind(
          edition.date,
          story.id,
          index + 1,
          story.type || null,
          story.category,
          story.title,
          story.summaries.compact || null,
          story.summaries.standard || null,
          story.summaries.detailed || null,
          story.href,
          story.art,
          story.sourceUrl || null,
          story.sourceName || null,
          story.sourcePublishedAt || null
        ))
      ];

      await db.batch(statements);
    }
  };
}
