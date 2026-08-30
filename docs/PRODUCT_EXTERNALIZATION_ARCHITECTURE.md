# Product Externalization Architecture

## Intent

This repository is designed so that its current AI-news product can be retargeted to another editorial product without rewriting the shared site, rendering engine, interaction behavior, themes, or automation workflow. Product-specific decisions have one root-level ownership boundary: `product/`.

For example, a future daily science, security, finance, or developer-tools briefing should change its product identity, reader-facing copy, editorial sources, artwork mapping, public runtime settings, and published editorial data. It should not need to rename stable page selectors, modify the shared content renderer, or duplicate scheduling and publication behavior.

## Why this boundary exists

Before externalization, product identity could be spread across HTML copy, client scripts, content configuration, artwork assets, authentication settings, and deployment manifests. A topic change could therefore accidentally alter layout or behavior, leave stale branding behind, or introduce duplicate configuration values.

The boundary provides these guarantees:

- **Safe retargeting:** product copy and editorial choices are changed in a known location.
- **Reusable application core:** shared loading, rendering, validation, scheduling, and interaction logic remain topic-neutral.
- **Clear provider separation:** cloud deployment details are kept inside their provider adapter instead of leaking into application code.
- **Single ownership:** a public OAuth client ID is owned by `product/config.js`; the Worker deployment renders that value rather than maintaining a second copy.
- **Auditable change scope:** a rebrand can be reviewed as product configuration plus a short, explicit infrastructure and data checklist.

## What is externalized

### Product-owned configuration: `product/`

| Path | Owns | Change when retargeting? |
|---|---|---|
| `product/config.js` | Product name, document metadata, visible framing, authentication-menu, guest-streak CTA, and streak-guidance copy, accessibility labels, browser storage namespace, public site/API hosts, public OAuth client ID, and reader-engagement policies | Yes |
| `product/apply-copy.js` | The generic bridge that applies configured copy to the shared semantic shell | Only when the shared copy contract changes |
| `product/editorial-config.mjs` | Approved feeds, categories, candidate-selection mode, and generation instruction | Yes |
| `product/company-images.js` | Feed-source and entity matching for story artwork | Yes, if sources or entity matching changes |
| `product/company-images/` | Product-owned artwork assets | Yes, if feed or entity artwork changes |

`product/config.js` is browser-delivered and therefore contains public values only. Never put OAuth client secrets, API keys, account tokens, or other credentials in `product/`.

### Shared application behavior: outside `product/`

| Area | Responsibility | Why it stays separate |
|---|---|---|
| `index.html` | Stable semantic shell and product-copy hooks | The shell must serve every product without product-specific markup forks. |
| `script.js` | Shared browser interaction, authentication flow, dialogs, and state | It consumes `ProductConfig` but must not know a specific editorial topic. |
| `content-engine/` | Content loading, rendering, validation, and portable daily-edition workflow | This is reusable application behavior, not editorial identity. |
| `themes/` and `theme.config.js` | Presentation, theme selection, and color-mode defaults | Themes are visual only; the neutral `window.ThemeConfig` must not contain product copy or data. |

### Provider-owned configuration: `infra/<provider>/`

Cloud providers need resource names, account identifiers, database identifiers, deployment URLs, Worker manifests, and deployment commands. Those values are externalized from the application, but they remain in provider adapters rather than moving to `product/`.

For the current provider, `infra/cloudflare/` owns:

- account and environment resource configuration in `infra/cloudflare/config.json`;
- Pages, Worker, and D1 resource names and IDs, with `infra/cloudflare/config.json` as the authoritative source;
- Wrangler manifest templates and deployment scripts, which render a temporary manifest from that authoritative configuration;
- provider-specific persistence, scheduled trigger, and authentication verification adapters.

This is deliberate: the portable product and application layers must not import Cloudflare configuration. The Cloudflare Worker renderer is the explicit handoff point: it reads the public OAuth client ID from `product/config.js`, derives allowed browser origins and Worker/D1 resource values from the selected Cloudflare environment, renders a temporary Wrangler manifest, and is used by deployment and secret synchronization. Generated manifests are removed after those operations.

## Where a change belongs

Use this decision order before adding or editing configuration or copy:

1. Is it visible to readers, defines the editorial topic, identifies a product entity, defines reader engagement, or is a public browser runtime setting? Put it in `product/`.
2. Does it define shared behavior usable by every topic? Put it in the existing shared module, and make it consume a product value only if necessary.
3. Does it create, identify, deploy, secure, or bind a cloud resource? Put it in `infra/<provider>/`.
4. Is it an already-applied database migration? Do not change it. Add a new ordered migration only when a schema or data migration is required.
5. Is it current editorial content? Publish a new D1 edition or story set; do not hard-code it into the site.

## When to use each path

### A normal product update

Use `product/` when changing the name, message, topic, feeds, candidate-selection policy, entity artwork, public OAuth client ID, local browser storage namespace, or the public hosts the browser calls. This is the common case.

### A product retargeting or rebrand

Use the repository-local [Product rebranding skill](../.github/skills/product-rebranding/SKILL.md). One prompt gives the skill the new product concept and lets it apply the complete repository-side configuration change, validate it, and present the remaining human-owned tasks.

### An infrastructure replacement or rename

Change `infra/<provider>/` only when a rebrand also needs newly provisioned domains, Pages projects, Workers, D1 databases, OAuth authorized origins, or provider accounts. This is not a browser-copy change and must follow the beta-first deployment rule.

## How a rebrand works

1. Define the new product's reader promise, name, concise framing copy, categories, trusted sources, entity-artwork needs, and desired hosts.
2. Update `product/config.js`, including a new `storageNamespace` when old preferences and session tokens must not carry over.
3. Update `product/editorial-config.mjs` with topic-appropriate primary sources and a factual generation instruction.
4. Update or remove `product/company-images.js` and `product/company-images/` to match the new domain. Every configured feed must retain exactly one source-artwork mapping backed by a local asset.
5. Publish new topic-appropriate editions; existing D1 content is editorial history and does not automatically become the new product.
6. If hosts or public OAuth identity change, make the corresponding Cloudflare and Google-console changes, deploy beta, and verify it before an explicitly approved production deployment.
7. Scan for stale topic-specific values outside `product/`. Only concrete provider resource identifiers, immutable migrations, and operational documentation should remain.

## Explicit limitations and human-owned work

Externalization does not make external cloud resources mutate automatically. After a rebrand, the user must decide and perform the following as applicable:

| Change | Required user action |
|---|---|
| New domain or Pages/Worker/D1 naming | Provision or rename the Cloudflare resources and update `infra/cloudflare/config.json`. |
| New public hosts | Add the hosts to Google OAuth authorized JavaScript origins and update the provider environment configuration. |
| New OAuth client | Create/configure it in Google Cloud, set the public client ID in `product/config.js`, then deploy the beta Worker so its rendered manifest matches. |
| Existing editorial data is unrelated | Publish new editions or perform an explicitly designed, ordered migration. Never rewrite applied migrations. |
| Production release | Deploy and verify beta first. Production requires explicit approval and the guarded production command. |

## Maintenance contract

Every feature, configuration, integration, or copy change must be classified using the ownership rules above. When a new product-owned surface is introduced:

1. Add its value or asset under `product/` rather than hard-coding it in shared code, a theme, or an infrastructure adapter.
2. Update `docs/PRODUCT_CONFIGURATION.md` and this document when the ownership contract or rebranding workflow changes.
3. Update `.github/skills/product-rebranding/SKILL.md` in the same change so its inventory, instructions, validations, and user-owned checklist remain accurate.
4. Verify a product-term scan and the narrowest relevant automated checks before completing the work.

Feed configuration and feed artwork are an atomic product update: adding, renaming, or removing a feed in `product/editorial-config.mjs` must update the source-artwork mapping and its asset in the same change. The configuration test enforces exact feed-name coverage and valid local artwork paths.

The repository instructions enforce this contract for AI-assisted changes. The skill is intentionally versioned with the source so a one-prompt rebrand remains safe as the product evolves.
