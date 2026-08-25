# AI Nuggets Website Feature Summary

## Overview

AI Nuggets is a responsive daily AI-news briefing website. It presents a curated set of four or five AI stories in a single-screen, bento-style experience, backed by an automated content-generation and publication platform.

## Reader-facing website features

| Feature | What it provides |
|---|---|
| Daily AI briefing | Presents a focused daily briefing of four or five selected AI-news stories, designed to reduce the need to follow an endless news feed. |
| Responsive story grid | Displays stories as fixed, visually distinct tiles with lead and wide layouts. The layout adapts across desktop and mobile breakpoints. |
| Story detail dialog | Selecting a story opens an accessible modal with its category, title, summary, source link, and previous/next story navigation. |
| Three summary levels | Each story offers Quick take, Full context, and Deep dive summaries. Full context is the default view, and readers can switch detail levels without another API request. |
| Source attribution | Each story detail view provides a safe external link to the original source, opening in a new tab with appropriate security attributes. |
| Edition preview by date | Supports a `?date=YYYY-MM-DD` URL parameter so a reader or editor can load the appropriate published edition for a specified date, or the latest available edition. |
| Company artwork matching | Recognizes selected AI-company references in story text and associates them with local company artwork; unmatched stories remain image-free. |
| Light and dark modes | Provides a color-mode toggle, respects the operating-system preference when no choice has been saved, and remembers the reader's choice in browser storage. |
| Theme system | Loads the active visual theme from centralized configuration, allowing the site presentation to change without changing content retrieval or behavior. |
| Google sign-in | Supports Google-only OAuth/OpenID Connect sign-in through Google Identity Services. The Worker verifies each credential, creates or updates a D1 user profile, and issues an opaque 30-day session token so the signed-in state survives refresh. The signed-in header shows the account menu and application sign-out control. Until a Google client ID is configured, the visible disabled action explains the unavailable state. |
| Daily reading streak | Shows a signed-in reader's current consecutive UTC-day streak in the header. A verified sign-in or an authenticated published-edition request qualifies once per UTC day; the Worker calculates and persists current and longest streaks, so the browser cannot alter them. |
| Reader feedback | Provides an attached Edge tab that opens an accessible soft-rounded feedback dialog with a required email address, a whole-star rating from 1 through 5, feedback message, acknowledgement, and D1-backed submission. Signed-in readers see their verified email prefilled and locked; anonymous readers can enter their own email. |
| Accessible interactions | Uses semantic navigation and controls, descriptive labels, feedback status updates, modal dialogs, keyboard summary switching and scrolling, and keyboard story navigation. |

## Content and publishing platform

| Feature | What it provides |
|---|---|
| Cloudflare D1 content store | Stores dated editions, ordered stories, publication status, source metadata, and generation-run audit records in a dedicated database. |
| Public content API | Serves only published editions through latest-edition and date-specific endpoints, with health reporting, edge-cacheable responses, and configured browser-origin restrictions. |
| Daily scheduled generation | Runs a scheduler-neutral job on a UTC schedule. It can be invoked by Cloudflare Cron, GitHub Actions, container schedulers, or operating-system cron. |
| RSS/Atom source collection | Collects recent articles from an editable approved feed list, with a custom HTTPS JSON candidate source available as an optional replacement. |
| Candidate selection | Normalizes URLs, removes duplicates, ranks candidates by configured source priority and freshness, and prefers category diversity when selecting stories. |
| AI-powered summarization | Uses an OpenAI-compatible Chat Completions provider to produce structured original summaries for the three available detail levels. |
| Content validation | Rejects invalid editions before storage by enforcing date, story count, unique IDs and positions, required fields, supported layouts and artwork, summary lengths, and HTTPS URLs. |
| Publishing workflow | Publishes valid editions automatically by default, with a configuration option to save future editions as drafts for editorial review before publication. |
| Idempotency and audits | Prevents duplicate editions for a date and records each generation attempt as started, skipped, succeeded, or failed. |
| Failure protection | Keeps the most recent valid published edition available if content collection, generation, validation, or persistence fails; incomplete or fabricated editions are not published. |
| Portable architecture | Separates the generation core from Cloudflare-specific code so source, model, scheduler, and infrastructure adapters can be replaced without rewriting the core workflow. |

## Operational and safety capabilities

| Feature | What it provides |
|---|---|
| Secret-safe configuration | Keeps model API keys and operational tokens out of browser assets, logs, and source control; runtime adapters receive them from secret stores. |
| Provider configuration checks | Detects missing or incomplete model settings explicitly and records a safe skipped run rather than attempting to generate content with partial configuration. |
| Bounded external requests | Uses request timeouts for feeds, custom sources, and the summary provider to limit stalled integrations. |
| Untrusted-source handling | Treats article and feed content as untrusted input and does not execute instructions contained in source material. |
| Copyright-aware storage | Stores original summaries and source attribution rather than raw copyrighted article text. |
| Cloudflare deployment support | Includes deployment scripts and infrastructure configuration for Cloudflare Pages, the content Worker, D1 migrations, Worker secrets, and Cron registration. |

Google sign-in creates or updates a D1 profile containing the verified Google subject, email, display name, optional picture URL, and server-managed activity data. Browser storage contains only an opaque bearer session token; D1 stores only its SHA-256 hash. Authenticated published-edition requests refresh the profile activity and can record one qualifying daily streak activity; the browser never sends a date or streak value. Sessions expire after 30 days.
