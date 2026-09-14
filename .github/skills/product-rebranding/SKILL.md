---
name: product-rebranding
description: Retarget this repository from its current AI-news product to a new editorial product while preserving shared behavior and cloud-provider boundaries.
---

# Product Rebranding

Use this skill when the user asks to rebrand, retarget, convert, or transform the current product into another editorial product. The user may provide a single prompt such as: "Turn this into a daily science-news briefing for researchers."

## Goal

Make the repository-side product conversion complete in one pass while preserving the stable semantic shell, shared rendering, interaction behavior, daily-edition workflow, themes, provider boundaries, and beta-first deployment safety.

The current product is an AI-news briefing, but do not treat that as a generic template string replacement. Infer the new product's reader promise and make a coherent editorial configuration.

## Required inputs

Accept one prompt containing at least the target concept. Infer reasonable defaults for missing details. Ask only when an omitted choice would materially change the product's behavior or safety, such as whether existing reader sessions must remain valid or whether the user wants new cloud resources provisioned.

Derive or choose:

- product name and concise reader promise;
- headline, eyebrow, title, metadata, and accessible labels;
- browser storage namespace;
- editorial categories, trustworthy primary sources, and factual generation instruction;
- whether entity artwork should be replaced, removed, or retained;
- whether existing public hosts and OAuth client identity can remain temporarily.

## Repository ownership model

Read `docs/PRODUCT_EXTERNALIZATION_ARCHITECTURE.md` and `docs/PRODUCT_CONFIGURATION.md` before editing.

| Ownership | Paths | Rebranding action |
|---|---|---|
| Product identity and public runtime settings | `product/config.js` | Update all product copy, reader-engagement policies, newsletter feature toggle and copy, summary-feature contracts, summary-provider behavior (`ProductConfig.summaryProviders`: provider kinds and `fallbackOrder`, timeout, retryable-model fallback criteria, default OpenRouter.ai base URL), and summary-context minimums/advisory concision targets, including authentication-menu labels, guest-streak CTA and guidance copy, story-share panel copy (button label, dialog copy, copy-link labels, and the platform set with icons and share-URL builders), metadata, namespace, public hosts if supplied, and public OAuth ID only if supplied. |
| Product editorial domain | `product/config.js` — `editorial` and `companyImages` sections | Replace sources, categories, candidate-selection mode, the generation instruction, and the matching source-artwork mappings. Keep local trigger endpoints in explicit environment variables, never as product fallback configuration. |
| Product feed and entity artwork | `product/company-images.js`, `product/company-images/` | Replace with relevant source and entity assets/matching, or remove mappings cleanly when artwork is not wanted. Every configured feed requires one valid local source-artwork mapping. |
| Shared shell and behavior | `index.html`, `script.js`, `content-engine/`, `themes/` | Do not add product-specific copy, data, or conditions. Change only to support a genuinely new, reusable product contract. |
| Provider deployment details | `infra/<provider>/` | Do not relocate into `product/`. Update only if the user requests resource/domain changes or the product config requires a provider handoff. For Cloudflare, change Worker and D1 identities in `infra/cloudflare/config.json`; the provider renderer keeps temporary Wrangler manifests synchronized. |
| Historical editorial data | applied migrations and D1 data | Never rewrite migrations. Publish new content or add an ordered migration only when explicitly needed. |

## Execution procedure

1. Inspect `product/`, the architecture document, the product configuration document, `index.html`, shared loaders/renderers, `infra/config.json`, and the active provider's deployment path.
2. Write a short internal inventory of the current product-owned settings and every required target setting.
3. Update `product/config.js` coherently, including reader-engagement policies where the target product needs different streak rules, the newsletter feature toggle and copy when the target product changes the newsletter offering, and the `summaryProviders` block when generation provider kinds, their `fallbackOrder`, fallback behavior, or timeout differ. Keep public values public; never add secrets.
4. Update the `editorial` section in `product/config.js` with credible, topic-appropriate primary sources, the intended `priority` or `random` candidate-selection mode, and a concise instruction that requires factual, source-grounded stories. Preserve the requirement for exactly four or five stories.
5. Update artwork mapping/assets if the new product needs them. Do not leave AI-company matching active for an unrelated topic. Keep `sourceArtwork` exactly synchronized with the configured feed names and provide an asset for each mapping.
6. Keep `index.html`, `script.js`, `content-engine/`, and themes generic. If their contract must change, externalize the new product values and document the contract change.
7. If hosts or OAuth settings changed, follow the existing deployment handoff: `product/config.js` owns the public OAuth ID, while the provider renderer combines it with the selected provider environment's Worker/D1 names, IDs, and CORS origins in a temporary Worker manifest. Do not duplicate any of those values in a checked-in provider manifest.
8. Update `docs/AI_NUGGETS_FEATURE_SUMMARY.md`, `docs/PRODUCT_CONFIGURATION.md`, and `docs/PRODUCT_EXTERNALIZATION_ARCHITECTURE.md` when user-facing product behavior or the ownership contract changed. Rename a documentation filename only when the user explicitly requests it; preserve existing links otherwise.
9. Update this skill in the same change whenever a new product-owned file, handoff, validation, required user action, or boundary exception is introduced.
10. Run the narrow relevant checks: JavaScript syntax for touched files, automation tests for editorial/configuration changes, `git diff --check`, and a product-term scan. For UI changes, validate the local page in both color modes and supported no-scroll viewports.

## Required validation scan

After changing the product, scan tracked text files for the old product's name, topic wording, old entity names, storage namespace, and old public hosts. Classify every remaining match as one of:

1. product configuration that must move or change;
2. provider resource identifier or deployment documentation that intentionally remains in `infra/<provider>/`;
3. immutable migration history that cannot be edited;
4. generic test fixture, adapter, or documentation that should be made neutral.

Do not claim a seamless conversion if an unclassified product-specific runtime value remains outside `product/`.

## Final response contract

State what was converted, where the new product configuration lives, and the validation performed. Then include a clearly labeled **User actions required** section containing only actions that cannot be completed safely from the repository:

- Cloudflare resource/domain creation or renaming, if hosts changed;
- Google OAuth authorized-origin and public-client configuration, if hosts or client ID changed;
- beta deployment and verification before any explicitly approved production deployment;
- publishing new topic-appropriate editorial editions or approving a separately designed data migration.

Omit any item that does not apply. Do not deploy, alter production, create cloud resources, or manipulate external OAuth settings unless the user explicitly requests it.

## Skill maintenance

This skill is part of the product externalization contract. Whenever repository work changes product ownership, configuration shape, product-to-provider handoff, validation, or the user-owned rebranding checklist, update this file and `docs/PRODUCT_EXTERNALIZATION_ARCHITECTURE.md` in the same change.
