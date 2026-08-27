export function createD1EditionRepository(db) {
  return {
    async hasEdition(date) {
      return Boolean(await db.prepare(
        "SELECT id FROM editions WHERE edition_date = ? LIMIT 1"
      ).bind(date).first());
    },

    async recordRun({ targetDate, status, details = null }) {
      await db.prepare(`
        INSERT INTO generation_runs (target_date, status, details, finished_at)
        VALUES (?, ?, ?, CASE WHEN ? = 'started' THEN NULL ELSE CURRENT_TIMESTAMP END)
      `).bind(targetDate, status, details, status).run();
    },

    async saveEdition(edition, { status = "draft" } = {}) {
      if (!["draft", "published"].includes(status)) throw new Error(`Unsupported edition status: ${status}.`);
      const statements = [
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
