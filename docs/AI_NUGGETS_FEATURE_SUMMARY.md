# Website Feature Summary

## Overview

The website is a responsive daily briefing experience. Its current identity and topic are configured in `product/`; it presents four or five curated stories in a single-screen, bento-style experience backed by an automated content-generation and publication platform.

## Reader-facing website features

| Feature | What it provides |
|---|---|
| Daily briefing | Presents a focused daily briefing of four or five selected stories, designed to reduce the need to follow an endless news feed. |
| About page | The header's About link opens a dedicated, responsive page that explains the product's focused five-story, under-two-minute daily briefing for busy readers. It retains the shared navigation, feedback, sign-in, color-mode controls, and visual language. |
| Responsive story grid | Displays stories as fixed, visually distinct tiles with lead and wide layouts. The layout adapts across desktop and mobile breakpoints. |
| Story detail dialog | Selecting a story opens an accessible modal with its category, title, summary, source link, and previous/next story navigation. |
| Configurable summary levels | The common product configuration enables Quick take, Overview, and Deep dive by default. Its UI and generation switches are independently configurable: the dialog dynamically renders only available enabled views, while future editions generate and persist only configured summary variants. |
| Source attribution | Each story detail view provides a safe external link to the original source, opening in a new tab with appropriate security attributes. |
| Edition preview by date | Supports a `?date=YYYY-MM-DD` URL parameter so a reader or editor can load the appropriate published edition for a specified date, or the latest available edition. |
| Feed and entity artwork matching | Resolves each configured feed to local publisher or editorial-category artwork before falling back to configured entity references in story text. The feed configuration test requires every approved feed to have a valid local artwork mapping. |
| Light and dark modes | Provides a color-mode toggle, respects the operating-system preference when no choice has been saved, and remembers the reader's choice in browser storage. |
| Theme system | Loads the active visual theme from centralized configuration, allowing the site presentation to change without changing content retrieval or behavior. |
| Product configuration boundary | Keeps product identity, editorial framing copy, public API endpoints, browser storage namespace, public OAuth settings, and product-specific artwork matching together in the root `product/` folder so the site can be retargeted without changing shared behavior or themes. |
| One-prompt product rebranding | Provides a repository-local skill that converts the configured product to a new editorial domain, validates remaining references, and clearly identifies the external provider, OAuth, deployment, and editorial-data actions that still require user approval. |
| Google sign-in | Supports Google-only OAuth/OpenID Connect sign-in through Google Identity Services. The header retains its branded application control, which directly activates Google's explicit account chooser rather than relying on a silently suppressible One Tap prompt. The Worker verifies each credential, creates or updates a D1 user profile, and issues an opaque 30-day session token so the signed-in state survives refresh. The signed-in header shows the account menu and application sign-out control; the sign-in control is hidden when Google configuration is unavailable. |
| Daily reading streak | Shows a signed-in reader's current consecutive UTC-day streak in the header. A verified sign-in or an authenticated published-edition request qualifies once per UTC day; the Worker calculates and persists current and longest streaks, so the browser cannot alter them. |
| Reader feedback | Provides an attached Edge tab that opens an accessible soft-rounded feedback dialog with a required email address, a whole-star rating from 1 through 5, feedback message, acknowledgement, and D1-backed submission. Signed-in readers see their verified email prefilled and locked; anonymous readers can enter their own email. |
| Reader feedback table | Provides a repository-local, read-only operator skill that exports every selected beta or production reader-feedback record as a private Markdown table with email, rating, message, and explicitly labeled IST submission time. |
| Accessible interactions | Uses semantic navigation and controls, descriptive labels, feedback status updates, modal dialogs, keyboard summary switching and scrolling, and keyboard story navigation. |

## Content and publishing platform

| Feature | What it provides |
|---|---|
| Cloudflare D1 content store | Stores dated editions, ordered stories, publication status, source metadata, and generation-run audit records in a dedicated database. |
| Public content API | Serves only published editions through latest-edition and date-specific endpoints, with health reporting, edge-cacheable responses, and configured browser-origin restrictions. |
| Twice-daily scheduled generation | Runs a scheduler-neutral job at 5:00 AM and 5:00 PM IST (11:30 and 23:30 UTC). It can be invoked by Cloudflare Cron, GitHub Actions, container schedulers, or operating-system cron. |
| RSS/Atom source collection | Collects recent articles from an editable approved feed list, with a custom HTTPS JSON candidate source available as an optional replacement. |
| Candidate selection | Normalizes URLs, removes duplicates, excludes canonical URLs used by published editions in the prior ten editorial days, and prefers category diversity when selecting exactly five candidates. Product editorial configuration switches the built-in collector between priority-and-freshness ranking and randomized candidate ordering without removing per-feed priority values; fewer than five eligible candidates fails before model generation. |
| Provider-powered summarization | Uses an OpenAI-compatible Chat Completions provider to produce structured original summaries for the product-configured generated detail levels. |
| Content validation | Rejects invalid editions before storage by enforcing date, story count, unique IDs and positions, required fields, supported layouts and artwork, summary lengths, and HTTPS URLs. |
| Publishing workflow | Publishes valid editions automatically by default, with a configuration option to save future editions as drafts for editorial review before publication. |
| Detailed generation-run investigations | Gives each attempt a correlated UUID and records ordered, safe source, selection, generation, validation, persistence, and terminal decision events. A protected internal endpoint and unified D1 query show the complete timeline for one run with explicitly labeled IST timestamps; beta supports a non-persisting dry run for safely investigating an existing edition. Completed run data is retained for three days. |
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
| Isolated beta deployment | Uses an independent beta Pages project, Worker, D1 database, Cron trigger, and Worker secrets at `https://beta-ai-nuggets.pages.dev`, preserving production data and traffic. |
| Protected production deployment | Defaults all deployment and secret-sync scripts to beta. Production at `https://ai-nuggets.pages.dev` requires an explicit environment and confirmation switch, preventing accidental production releases. |
| Beta parity gate | Requires beta to receive and validate every application and infrastructure change before a production release. A guarded editorial sync copies only published editions and stories into beta, preserving the isolation of reader data and operational history. |
| Cloudflare deployment support | Includes deployment scripts and infrastructure configuration for Cloudflare Pages, the content Worker, D1 migrations, Worker secrets, and Cron registration. |

Google sign-in creates or updates a D1 profile containing the verified Google subject, email, display name, optional picture URL, and server-managed activity data. Browser storage contains only an opaque bearer session token; D1 stores only its SHA-256 hash. Authenticated published-edition requests refresh the profile activity and can record one qualifying daily streak activity; the browser never sends a date or streak value. Sessions expire after 30 days.
