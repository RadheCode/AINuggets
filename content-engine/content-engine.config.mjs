import "../product/config.js";

// Central content-engine controls. Edit this file to change the daily schedule,
// publication mode, or approved RSS/Atom feeds.
// Cron schedules are environment-specific: production runs first, beta runs 10 minutes later
// to give production priority on shared token quotas.
export const CONTENT_ENGINE_CONFIG = Object.freeze({
  schedule: Object.freeze({
    // Production: 06:30 and 18:30 IST (0 1,13 * * * UTC)
    // Beta: 06:40 and 18:40 IST (10 1,13 * * * UTC) — delayed 10 minutes
    cron: Object.freeze({
      production: "0 1,13 * * *",
      beta: "10 1,13 * * *"
    })
  }),
  publication: Object.freeze({
    // Validated editions publish immediately; set false to require editorial review.
    automaticallyPublish: true
  }),
  feeds: globalThis.ProductConfig.editorial.feeds
});
