import { PRODUCT_EDITORIAL_CONFIG } from "../product/editorial-config.mjs";

// Central content-engine controls. Edit this file to change the daily schedule,
// publication mode, or approved RSS/Atom feeds.
export const CONTENT_ENGINE_CONFIG = Object.freeze({
  schedule: Object.freeze({
    // Cloudflare Cron and editorial dates use UTC. 12:00 UTC serves all regions consistently.
    cron: "0 12 * * *"
  }),
  publication: Object.freeze({
    // Validated editions publish immediately; set false to require editorial review.
    automaticallyPublish: true
  }),
  summaries: Object.freeze({
    // Each generated story includes all three layers. The popup opens on the default layer.
    defaultContext: "standard",
    contexts: Object.freeze({
      compact: Object.freeze({ label: "Quick take", minCharacters: 100, maxCharacters: 180 }),
      standard: Object.freeze({ label: "Full context", minCharacters: 240, maxCharacters: 420 }),
      detailed: Object.freeze({ label: "Deep dive", minCharacters: 500, maxCharacters: 900 })
    })
  }),
  feeds: PRODUCT_EDITORIAL_CONFIG.feeds
});
