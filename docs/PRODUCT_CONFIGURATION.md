# Product configuration

`product/` is the single root-level ownership boundary for browser-visible product identity and topic-specific configuration. To rebrand the site for another concept, update this folder rather than changing the shared shell, rendering behavior, or themes.

See [Product Externalization Architecture](PRODUCT_EXTERNALIZATION_ARCHITECTURE.md) for the complete intent, ownership model, provider handoff, rebranding process, and human-owned follow-up actions. Use the repository-local [Product Rebranding skill](../.github/skills/product-rebranding/SKILL.md) for a one-prompt conversion.

## Files

| File | Responsibility |
|---|---|
| `product/config.js` | Product identity, user-facing framing, authentication-menu, and About-page copy, browser storage namespace, public beta/production content API endpoints, public OAuth client ID, and summary feature capabilities. |
| `product/apply-copy.js` | Applies configured product copy and document metadata to the stable semantic shell. |
| `product/company-images.js` | Product-specific source and entity artwork matching used by the shared story renderer. Every configured feed must have a source mapping and a matching asset under `product/company-images/`; title-based entity matching is the fallback for stories without a configured source. |
| `product/editorial-config.mjs` | Product-specific approved sources, candidate-selection mode, and generation instruction used by the portable daily-edition workflow. |

## Rebranding workflow

1. Update identity and copy values in `product/config.js`, including the Login menu and provider labels when appropriate.
2. Change `storageNamespace` if the rebranded site must not reuse existing reader color preferences or opaque session tokens.
3. Update `runtime.sites` and `runtime.contentApiUrls` for the new public frontend and content API hosts.
4. Replace `product/company-images.js` and its artwork only when the new editorial domain needs different source or entity matching.
5. Update approved sources, candidate-selection mode, and the generation instruction in `product/editorial-config.mjs`. Add, rename, or remove the matching source artwork entry and asset in the same change; the automation configuration test rejects incomplete coverage.
6. Update `summaryFeatures` in `product/config.js` when the product offers a different set of summary views or generated detail levels.
7. Publish new topic-appropriate editions through the content engine; editions and stories deliberately remain D1-backed editorial data.

## Summary feature capabilities

## About-page copy

`ProductConfig.copy.about.title` stores its emphasized phrase separately from the remaining headline so the shared product-copy renderer can preserve the active theme's two-tone heading treatment without embedding product wording in `about.html`.

`ProductConfig.summaryFeatures` is the common product-level feature switch for story summary variants. It intentionally belongs in `product/config.js`, rather than editorial configuration, because it controls product behavior rather than the content of an individual edition.

| Setting | Purpose |
|---|---|
| `ui` | Ordered summary context keys that the browser may offer in the story dialog. The renderer creates controls from this array; it does not require static controls in `index.html`. |
| `generation` | Summary context keys generated, validated, and persisted for each new story. A generated context is stored only in its matching D1 column. |
| `defaultContext` | Initial dialog view. It must occur in `ui`; if a story does not include it, the first available UI context is used. |
| `contexts` | Labels, length limits, and the structured format expected for each supported key. |

The default enables `compact` (Quick take), `standard` (Overview), and `detailed` (Deep dive) for both UI and generation. To offer two views, remove one key from `ui`; the dialog immediately renders two controls on the next browser deployment. To store only Deep dive for future editions, set `generation` to `['detailed']`. Existing editions are preserved, while future editions generate and persist only that context. If a UI-enabled context is absent from an edition, the browser omits it instead of showing an empty control.

Both browser code and the portable generation runtime consume the same feature vocabulary. `product/summary-features.mjs` exposes and validates the browser configuration for the runtime without introducing provider dependencies into the product contract.

## Editorial candidate selection

`PRODUCT_EDITORIAL_CONFIG.candidateSelection.mode` controls how the built-in RSS/Atom collector orders eligible candidates before it selects up to five category-diverse stories. The setting is product-owned because it defines editorial policy, while the collector implementation remains portable.

| Mode | Behavior |
|---|---|
| `priority` | Sorts candidates by their retained feed `priority` and recency score, then selects one candidate per category before filling remaining places by score. |
| `random` | Current setting. Ignores feed priority and recency for selection order, shuffles eligible candidates, then still selects one candidate per category before filling remaining places from that shuffled order. |

Retain a numeric `priority` on every feed even when `random` is active so switching back to `priority` needs no feed migration. The mode applies only to the built-in RSS/Atom collector; a custom `CONTENT_SOURCE_URL` controls its own candidate ordering.

## Feed artwork coverage

`product/company-images.js` maps every `PRODUCT_EDITORIAL_CONFIG.feeds[].name` to a local source-artwork asset. The renderer resolves this source mapping before inspecting story text, so selected stories from every approved feed consistently receive their publisher or editorial-category artwork. It uses title and summary entity matching only when no configured source is available.

Treat a feed-list change as an artwork change: add, rename, or remove the corresponding `sourceArtwork` entry and local `.jpg` or `.svg` asset in the same pull request. `generation-provider-configuration.test.mjs` checks that the mapping names exactly equal the configured feed names and that every referenced asset exists.

The public OAuth client ID is intentionally browser-visible. Do not add a client secret to this repository. The Cloudflare Worker deployment reads this value from `product/config.js` when it renders its provider-specific manifest, so do not duplicate it in an infrastructure file.

## Ownership boundaries

- `product/` owns product/topic identity and browser-visible public settings.
- `content-engine/` owns portable loading, rendering, and daily-edition automation behavior.
- `themes/` owns presentation and theme selection. Its neutral `window.ThemeConfig` global is intentionally separate from product content.
- `infra/config.json` selects the active provider; `infra/<provider>/` owns provider account, project, Worker, database, and deployment details. Do not move provider-specific identifiers into `product/`. For Cloudflare, `infra/cloudflare/config.json` is authoritative for Worker and D1 identities; deployment and secret synchronization render a temporary Wrangler manifest from it, derive CORS origins from it, and take the public OAuth client ID from `product/config.js`.

## Intentional exceptions

`product/` is the complete source for rebrandable runtime identity, browser copy, editorial sources, and public OAuth configuration. The following values intentionally stay outside it:

- Provider resource names, account identifiers, database IDs, and deployment URLs in `infra/<provider>/`, because providers require provider-specific manifests. Cloudflare's checked-in manifests are templates, not second copies of those identifiers.
- Applied SQL migrations under `infra/<provider>/.../migrations/`, because migration history is immutable. Publish a new edition or add a new ordered migration for a new topic; never rewrite history.
- Generic provider-protocol adapters, fixtures, and operational documentation, which are not product-facing runtime copy. Concrete resource names in operational documents describe the currently deployed environment.
- The CLI's `CONTENT_AUTOMATION_URL`, which is intentionally an explicit environment variable so a local trigger cannot silently target a stale beta or production endpoint.
