import { PRODUCT_EDITORIAL_CONFIG } from "../product/editorial-config.mjs";

// Central content-engine controls. Edit this file to change the daily schedule,
// publication mode, or approved RSS/Atom feeds.
export const CONTENT_ENGINE_CONFIG = Object.freeze({
  schedule: Object.freeze({
    // 05:00 and 17:00 IST, expressed in UTC for Cloudflare Cron.
    cron: "30 11,23 * * *"
  }),
  publication: Object.freeze({
    // Validated editions publish immediately; set false to require editorial review.
    automaticallyPublish: true
  }),
  feeds: PRODUCT_EDITORIAL_CONFIG.feeds
});
