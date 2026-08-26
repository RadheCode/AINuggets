# Product configuration

`product/` is the single root-level ownership boundary for browser-visible product identity and topic-specific configuration. To rebrand the site for another concept, update this folder rather than changing the shared shell, rendering behavior, or themes.

See [Product Externalization Architecture](PRODUCT_EXTERNALIZATION_ARCHITECTURE.md) for the complete intent, ownership model, provider handoff, rebranding process, and human-owned follow-up actions. Use the repository-local [Product Rebranding skill](../.github/skills/product-rebranding/SKILL.md) for a one-prompt conversion.

## Files

| File | Responsibility |
|---|---|
| `product/config.js` | Product identity, user-facing framing copy, browser storage namespace, public beta/production content API endpoints, and the public OAuth client ID. |
| `product/apply-copy.js` | Applies configured product copy and document metadata to the stable semantic shell. |
| `product/company-images.js` | Product-specific company/entity artwork matching used by the shared story renderer. Replace or remove this mapping when it no longer matches the new topic. |
| `product/editorial-config.mjs` | Product-specific approved sources and the generation instruction used by the portable daily-edition workflow. |

## Rebranding workflow

1. Update identity and copy values in `product/config.js`.
2. Change `storageNamespace` if the rebranded site must not reuse existing reader color preferences or opaque session tokens.
3. Update `runtime.sites` and `runtime.contentApiUrls` for the new public frontend and content API hosts.
4. Replace `product/company-images.js` and its artwork only when the new editorial domain needs different entity matching.
5. Update approved sources and the generation instruction in `product/editorial-config.mjs`.
6. Publish new topic-appropriate editions through the content engine; editions and stories deliberately remain D1-backed editorial data.

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
