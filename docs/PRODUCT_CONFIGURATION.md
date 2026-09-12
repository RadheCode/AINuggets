# Product configuration

`product/` is the single root-level ownership boundary for browser-visible product identity and topic-specific configuration. To rebrand the site for another concept, update this folder rather than changing the shared shell, rendering behavior, or themes.

See [Product Externalization Architecture](PRODUCT_EXTERNALIZATION_ARCHITECTURE.md) for the complete intent, ownership model, provider handoff, rebranding process, and human-owned follow-up actions. Use the repository-local [Product Rebranding skill](../.github/skills/product-rebranding/SKILL.md) for a one-prompt conversion.

## Files

| File | Responsibility |
|---|---|
| `product/config.js` | The single product configuration file. Product identity, user-facing framing, authentication-menu, guest-streak CTA, and streak-guidance copy, About-page copy, browser storage namespace, public beta/production content API endpoints, public OAuth client ID, reader-engagement policies, summary feature capabilities, summarization prompts, summary provider selection and fallback behavior, editorial sources and candidate-selection policy, and company-image (feed-source and entity) artwork mappings. Also attaches the product feature-contract validators (`ProductConfig.validateSummaryFeatureConfig`, `ProductConfig.validateStreakFeatureConfig`, `ProductConfig.validateSummaryProvidersConfig`). |
| `product/apply-copy.js` | Applies configured product copy and document metadata to the stable semantic shell. |
| `product/company-images.js` | Product-specific source and entity artwork **matching logic** used by the shared story renderer. It reads `ProductConfig.companyImages` (`sourceArtwork` and `companies`) from `product/config.js`; it owns no configuration data itself. Every configured feed must have a source mapping and a matching asset under `product/company-images/`; title-based entity matching is the fallback for stories without a configured source. |

`product/config.js` is a browser classic script (loaded via `<script src>`), so it must never contain top-level ESM `export` statements — a SyntaxError there blanks the whole page. Node/Worker ESM consumers import the file for its side effect (it assigns `globalThis.ProductConfig`) and read every value from that single object, e.g. `const { summaryFeatures } = globalThis.ProductConfig;`.

## Rebranding workflow

1. Update identity and copy values in `product/config.js`, including the Login menu, guest-streak call to action and guidance, and provider labels when appropriate.
2. Change `storageNamespace` if the rebranded site must not reuse existing reader color preferences or opaque session tokens.
3. Update `runtime.sites` and `runtime.contentApiUrls` for the new public frontend and content API hosts.
4. Replace the `companyImages` mappings in `product/config.js` and its artwork only when the new editorial domain needs different source or entity matching.
5. Update approved sources, candidate-selection mode, and the generation instruction in `product/config.js` (`ProductConfig.editorial`). Add, rename, or remove the matching `companyImages.sourceArtwork` entry and asset in the same change; the automation configuration test rejects incomplete coverage.
6. Update `readerEngagement.streak.maximumDaysBetweenQualifyingActivities` in `product/config.js` when the product permits a gap between qualifying streak days. The current value, `4`, permits up to three missed UTC days.
7. Update `readerEngagement.streakGuidanceTemplate` in `product/config.js` when changing reader-facing gap guidance. It supports `{days}`, which renders the configured allowance as a singular or plural day count.
8. Update `summaryFeatures` in `product/config.js` when the product offers a different set of summary views or generated detail levels.
9. Publish new topic-appropriate editions through the content engine; editions and stories deliberately remain D1-backed editorial data.

## Summary feature capabilities

## Reader engagement policies

`ProductConfig.readerEngagement.streak.maximumDaysBetweenQualifyingActivities` is the maximum inclusive UTC calendar-day gap that continues a signed-in reader's streak. It must be an integer from `1` through `365`. The current value is `4`, allowing up to three missed UTC dates; in general, a value of `N` permits up to `N - 1` missed UTC dates. Set it to `1` to require consecutive UTC dates. The Worker validates and applies the value; the browser reads the public setting only to render guidance and cannot alter the server-authoritative streak.

## About-page copy

`ProductConfig.copy.about.title` stores its emphasized phrase separately from the remaining headline so the shared product-copy renderer can preserve the active theme's two-tone heading treatment without embedding product wording in `about.html`.

`ProductConfig.summaryFeatures` is the common product-level feature switch for story summary variants. It intentionally belongs in `product/config.js`, rather than editorial configuration, because it controls product behavior rather than the content of an individual edition.

| Setting | Purpose |
|---|---|
| `ui` | Ordered summary context keys that the browser may offer in the story dialog. The renderer creates controls from this array; it does not require static controls in `index.html`. |
| `generation` | Summary context keys generated, validated, and persisted for each new story. A generated context is stored only in its matching D1 column. |
| `defaultContext` | Initial dialog view. It must occur in `ui`; if a story does not include it, the first available UI context is used. |
| `contexts` | Labels, mandatory minimum character counts, advisory maximum targets, and the structured format expected for each supported key. |

The default enables `compact` (Quick take), `standard` (Overview), and `detailed` (Deep dive) for both UI and generation. To offer two views, remove one key from `ui`; the dialog immediately renders two controls on the next browser deployment. To store only Deep dive for future editions, set `generation` to `['detailed']`. Existing editions are preserved, while future editions generate and persist only that context. If a UI-enabled context is absent from an edition, the browser omits it instead of showing an empty control.

Both browser code and the portable generation runtime consume the same feature vocabulary. The validation helper `ProductConfig.validateSummaryFeatureConfig` enforces the browser configuration contract for the runtime without introducing provider dependencies into the product contract.

Each context's `minCharacters` is enforced during both provider generation and domain validation. Its `maxCharacters` is an advisory target for concise summaries, not a rejection limit: the provider must complete meaningful sentences and thoughts instead of truncating text to fit it.

`ProductConfig.summaryPrompts` owns the product's summarization prompts for the generated summary layers (`overview`, `detailed`, `compact`). The prompt block lives in `product/config.js` as data and is read directly from `globalThis.ProductConfig.summaryPrompts` by Node/Worker consumers; no ESM bridge file is needed. Keep each prompt aligned with its matching `summaryFeatures.contexts` entry and with `docs/DAILY_CONTENT_AUTOMATION.md`.

## Summary provider configuration

`ProductConfig.summaryProviders` owns the generation provider selection and model fallback behavior used by the daily-edition automation. It deliberately lives in `product/config.js`: the provider fallback order, the per-request timeout, and the retryable-model fallback criteria are editorial behavior that is tuned in one product-owned place without editing shared adapters.

| Setting | Purpose |
|---|---|
| `fallbackOrder` | Provider kinds to try in precedence order for summary generation (`openai`, then `gemini`, then `openrouter`, then `workers-ai`). Every kind in the order that has complete runtime credentials is instantiated and tried in this order; the first provider that produces a valid edition wins. |
| `requestTimeoutMs` | Per-request timeout applied to summary provider model calls (`300000`). |
| `openaiCompatible.retryableStatuses` | HTTP statuses that make an OpenAI-compatible provider attempt the next configured model (`404, 500, 502, 503, 504`). |
| `workersAi.retryableStatuses` | Exact HTTP statuses that make the Workers AI provider fail over to the next model (`429`). |
| `workersAi.retryableStatusRange` | Inclusive `[min, max]` server-error range that also triggers failover (`500, 599`). |
| `workersAi.retryableMessageTerms` | Error-message substrings (`rate limit`, `capacity`, `overloaded`) that also trigger failover. |
| `openrouter.defaultBaseUrl` | Fixed OpenRouter.ai base URL used by the `openrouter` kind (`https://openrouter.ai/api/v1`). The openrouter kind always uses this default base URL; custom OpenAI-compatible endpoints belong to the `openai` kind. |
| `gemini.defaultBaseUrl` | Fixed Google Gemini base URL used by the `gemini` kind (`https://generativelanguage.googleapis.com/v1beta/openai`). The gemini kind always uses this default base URL; custom OpenAI-compatible endpoints belong to the `openai` kind. |

The provider factory (`create-generation-provider-dependencies.mjs`) reads `ProductConfig.summaryProviders` and injects the configured retry criteria and timeout into the shared adapters. The factory walks `fallbackOrder`, instantiates every kind that has complete runtime credentials, and wraps them in a composite provider that falls through to the next kind on failure; a partially configured kind is rejected with the missing fields instead of being silently skipped. `fallbackOrder` is the single source of truth for provider selection — there is no separate provider-kind override. Each provider owns its own secret keys (`OPENROUTER_API_KEY`/`OPENROUTER_MODEL`, `OPENAI_API_KEY`/`OPENAI_MODEL`/`OPENAI_BASE_URL`, `GEMINI_API_KEY`/`GEMINI_MODEL`, `WORKERS_AI_MODEL`), so providers are fully independent and can be configured in any combination without key conflicts. The adapters keep portable defaults so they remain usable standalone; the product-configured values are applied whenever the factory wires them. `ProductConfig.validateSummaryProvidersConfig` enforces this contract so a malformed provider block fails fast in tests and at startup.

## Editorial candidate selection

`ProductConfig.editorial.candidateSelection.mode` controls how the built-in RSS/Atom collector orders eligible candidates before it selects up to five category-diverse stories. The setting is product-owned because it defines editorial policy, while the collector implementation remains portable.

| Mode | Behavior |
|---|---|
| `priority` | Sorts candidates by their retained feed `priority` and recency score, then selects one candidate per category before filling remaining places by score. |
| `random` | Current setting. Ignores feed priority and recency for selection order, shuffles eligible candidates, then still selects one candidate per category before filling remaining places from that shuffled order. |

Retain a numeric `priority` on every feed even when `random` is active so switching back to `priority` needs no feed migration. The mode applies only to the built-in RSS/Atom collector; a custom `CONTENT_SOURCE_URL` controls its own candidate ordering.

## Feed artwork coverage

`product/company-images.js` maps every `ProductConfig.editorial.feeds[].name` to a local source-artwork asset (`ProductConfig.companyImages.sourceArtwork`). The renderer resolves this source mapping before inspecting story text, so selected stories from every approved feed consistently receive their publisher or editorial-category artwork. It uses title and summary entity matching only when no configured source is available.

Treat a feed-list change as an artwork change: add, rename, or remove the corresponding `sourceArtwork` entry and local `.jpg` or `.svg` asset in the same pull request. `generation-provider-configuration.test.mjs` checks that the mapping names exactly equal the configured feed names and that every referenced asset exists.

The public OAuth client ID is intentionally browser-visible. Do not add a client secret to this repository. The Cloudflare Worker deployment reads this value from `product/config.js` when it renders its provider-specific manifest, so do not duplicate it in an infrastructure file.

## Ownership boundaries

- `product/` owns product/topic identity and browser-visible public settings.
- `content-engine/` owns portable loading, rendering, and daily-edition automation behavior, including the generic provider-protocol adapters. The product-owned `ProductConfig.summaryProviders` block supplies the behavior knobs those adapters consume through the factory.
- `themes/` owns presentation and theme selection. Its neutral `window.ThemeConfig` global is intentionally separate from product content.
- `infra/config.json` selects the active provider; `infra/<provider>/` owns provider account, project, Worker, database, and deployment details. Do not move provider-specific identifiers into `product/`. For Cloudflare, `infra/cloudflare/config.json` is authoritative for Worker and D1 identities; deployment and secret synchronization render a temporary Wrangler manifest from it, derive CORS origins from it, and take the public OAuth client ID from `product/config.js`.

## Intentional exceptions

`product/` is the complete source for rebrandable runtime identity, browser copy, editorial sources, and public OAuth configuration. The following values intentionally stay outside it:

- Provider resource names, account identifiers, database IDs, and deployment URLs in `infra/<provider>/`, because providers require provider-specific manifests. Cloudflare's checked-in manifests are templates, not second copies of those identifiers.
- Applied SQL migrations under `infra/<provider>/.../migrations/`, because migration history is immutable. Publish a new edition or add a new ordered migration for a new topic; never rewrite history.
- Generic provider-protocol adapters, fixtures, and operational documentation, which are not product-facing runtime copy. Provider *behavior* values deliberately stay in `ProductConfig.summaryProviders` (fallback order, retry criteria, timeout, default base URL); the portable adapters implement the protocol and are wired to those values by the factory. Concrete resource names in operational documents describe the currently deployed environment.
- The CLI's `CONTENT_AUTOMATION_URL`, which is intentionally an explicit environment variable so a local trigger cannot silently target a stale beta or production endpoint.
