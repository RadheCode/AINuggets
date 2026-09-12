import "../product/config.js";

// Central content-engine controls. Edit this file to change the daily schedule,
// publication mode, or approved RSS/Atom feeds.
export const CONTENT_ENGINE_CONFIG = Object.freeze({
  schedule: Object.freeze({
    // 06:30 and 18:30 IST, expressed in UTC for Cloudflare Cron.
        cron: "0 1,13 * * *"
    }),
  publication: Object.freeze({
    // Validated editions publish immediately; set false to require editorial review.
    automaticallyPublish: true
  }),
  feeds: globalThis.ProductConfig.editorial.feeds
});
