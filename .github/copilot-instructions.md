# AI Nuggets Repository Instructions

These instructions are mandatory for AI-assisted changes in this repository.

## Product contract

- AI Nuggets is a concise daily AI-news briefing website showing exactly four or five high-value updates.
- Keep the homepage as a single-screen experience. The document must not scroll at supported viewport sizes.
- Preserve the calm, premium editorial experience. Avoid dense dashboards, infinite feeds, intrusive prompts, autoplay media, and distracting motion.
- Treat `index.html` as the shared semantic shell, `content-engine/` as the content layer, and `script.js` as shared interaction behavior.

## Content architecture

- Keep all briefing data and shared content-rendering implementations under `content-engine/`.
- Store editions, stories, source attribution, and generation runs in the Cloudflare D1 database defined under `infra/cloudflare/content-worker/`.
- Keep daily-edition orchestration runtime-neutral under `content-engine/automation/`. Cloud provider triggers and persistence implementations must be adapters that inject dependencies into the portable job.
- Access public content only through the content Worker API configured in `product/config.js`; do not hard-code stories in `index.html` or theme files.
- Change the D1 schema only through ordered SQL migrations. Never edit an already-applied migration.
- Whenever a D1 table, column, constraint, index, relationship, retention policy, or table access behavior changes, update `docs/D1_SCHEMA_REFERENCE.md` in the same change. Keep its table inventory, what/why/where/how explanations, privacy boundaries, and relationship diagram aligned with the schema and Worker behavior.
- Keep draft editions out of public API responses; only `published` editions may be rendered publicly.
- Keep `content-engine/render.js` theme-agnostic and preserve the stable shared selectors it emits.
- Publish exactly four or five stories. Each story must have a unique ID, category, concise title, summary, destination, and supported artwork key.
- Keep content trustworthy and concise. Verify news against primary sources before publishing and avoid unsupported hype.
- Whenever content-generation logic changes--including scheduling, source collection, candidate selection, prompting, summary formats, validation, persistence, publication, public delivery, or browser rendering--update `docs/DAILY_CONTENT_AUTOMATION.md` in the same change. Keep its written workflow, code-ownership map, and twelve-stage implementation diagram aligned with the implementation.

## Product externalization

- Treat `product/` as the sole ownership boundary for rebrandable product identity, reader-facing copy, public browser settings, editorial sources and instructions, entity-artwork mappings, and product artwork. Do not hard-code product-specific values in the shared shell, themes, shared behavior, or portable content engine.
- Before adding or changing copy, configuration, integration settings, assets, or a user-facing feature, classify it as product-owned (`product/`), shared behavior, current editorial data, or provider infrastructure. Externalize every new product-owned value under `product/` and make shared code consume it through the established product contracts.
- Keep provider resource names, account/database identifiers, deployment manifests, and provider-specific secrets/contracts in `infra/<provider>/`. Do not move them into `product/`; provider deployment adapters may read public product settings only through an explicit rendered handoff. Never duplicate a product-owned public setting in a checked-in provider manifest.
- Never modify applied migrations to remove old product references. Treat them as immutable history; publish new editorial data or add a new ordered migration when required.
- When product ownership, configuration shape, product-to-provider handoff, or rebranding follow-up work changes, update `docs/PRODUCT_CONFIGURATION.md`, `docs/PRODUCT_EXTERNALIZATION_ARCHITECTURE.md`, and `.github/skills/product-rebranding/SKILL.md` in the same change. Keep the skill's inventory, validation steps, and user-actions checklist synchronized with the implementation.
- Before completing product-related work, scan for stale product-specific runtime values outside `product/`; classify allowed provider identifiers, migration history, and operational documentation explicitly. Run the narrow relevant validation and do not claim externalization is complete while unclassified runtime product values remain.

## Theme architecture

- All visual themes must live under `themes/<theme-id>/`.
- Theme IDs and directory names must use kebab-case.
- Every theme must contain `theme.css` and `theme.json`.
- Register themes in the root `theme.config.js` file.
- Change themes only through `activeTheme` in `theme.config.js`; do not hard-code a theme stylesheet in `index.html`.
- Keep `theme-loader.js` generic. It must load any registered theme without theme-specific conditions.
- Themes own presentation only. Do not put data fetching, event handling, story content, or application state in theme files.
- Do not add theme-specific HTML unless the shared page contract is intentionally revised for every theme.
- Reuse the established shared component shell for every new dialog, panel, or overlay. A new dialog may add feature-specific content and controls, but it must inherit the canonical dialog's surface, elevation, backdrop, animation, spacing, responsive sizing, and scrolling behavior; do not create a visually independent modal unless the shared dialog contract is intentionally revised and documented.
- Follow the complete contract in `docs/THEME_RULEBOOK.md` whenever creating or editing a theme.

## Stable shared selectors

Preserve these selectors across themes unless a deliberate shared-shell migration updates every theme:

- `.site-frame`, `.site-header`, `.site-footer`
- `.brand`, `.brand-mark`, `.brand-copy`
- `.nav-tabs`, `.header-actions`, `.current-date`, `.color-mode-toggle`, `.mode-icon`
- `.briefing-intro`, `.briefing-copy`, `.briefing-meta`, `.eyebrow`
- `.story-grid`, `.story-card`, `.story-card--lead`, `.story-card--wide`
- `.story-art`, `.story-shade`, `.story-content`, `.story-tag`, `.story-number`

Do not rename IDs referenced by `script.js` without updating and validating the corresponding behavior.

## Responsive requirements

- Support large desktop, laptop, tablet, mobile portrait, and mobile landscape layouts.
- Keep the header, introduction, all story cards, and footer inside the viewport without document scrolling.
- Test down to 320px viewport width and 600px viewport height.
- Use fluid dimensions, CSS Grid or Flexbox, `minmax(0, 1fr)`, and `100dvh` where appropriate.
- Never solve overflow by clipping essential text or controls. Condense secondary copy at constrained breakpoints while retaining every story title and action.
- Treat responsive placement as a strict requirement: every visible element must remain deliberately anchored and fluid across resizing. Keep related controls in an explicit Grid or Flex group with a defined anchor; never position them from viewport-relative, absolute, or incidental free space in a way that lets them detach, drift, or float. Never permit implicit grid tracks, overlap, overflow, clipped essential controls, or detached/floating controls; resize through and validate representative desktop, laptop, tablet, mobile portrait, and mobile landscape resolutions.
- This is a strict, non-negotiable UI rule: every visible UI element and interaction target must remain present, anchored, fluid, and visually consistent across supported desktop, laptop, tablet, mobile portrait, mobile landscape, window-resize, zoom, and input-device environments. Do not hide an essential control to resolve a responsive defect; use a deliberate responsive layout that preserves it. Validate each affected state, including changes in authenticated, loading, error, and expanded-control content.

## Color modes

- Every theme must support light and dark modes through `data-color-mode` on `<html>`.
- Keep the shared mode switcher functional, keyboard accessible, and visible at every supported viewport.
- Respect `defaultColorMode` from `theme.config.js`, use system preference when configured, and persist explicit user choice.
- Validate contrast, glass fallbacks, controls, dialogs, artwork overlays, and no-scroll fit in both modes.
- Any visible motion or emphasis effect in one color mode must remain perceptible and equally purposeful in the other mode. Validate its contrast, animation state, and interaction states in both modes; do not rely on near-identical colors that make an effect disappear.
- Keep the page geometry identical when switching color modes. The mode switch may change styling only; it must not move, resize, add spacing around, or realign tiles or other page elements.
- Keep elevation semantics identical between color modes: raised, inset, selected, and disabled surfaces must mean the same thing in light and dark mode. Retain the established accent color for selected controls and use a raised treatment unless representing an explicitly pressed state.
- Do not create separate theme folders solely for light and dark variants of one visual design.

## Accessibility and interaction

- Preserve semantic landmarks, heading hierarchy, labels, accessible names, and keyboard operation.
- Provide visible `:focus-visible` styles for every interactive control.
- Maintain WCAG AA contrast for essential text and controls.
- Honor `prefers-reduced-motion: reduce` for all animation and transitions.
- Hover-only behavior must have an equivalent keyboard focus state.
- Keep animations subtle, brief, and non-blocking. Never continuously animate text or story cards.
- Glass surfaces must retain an opaque-enough background when backdrop filtering is unavailable.

## Engineering rules

- Treat beta as the required pre-production replica. Deploy every Pages, Worker, schema, secret-contract, and application change to beta first; verify beta parity before an explicitly approved production deployment. A plain "deploy" always means beta. Production is sacred: never deploy, configure auto-deployment, or mutate production unless the user explicitly requests production.
- Keep beta's public published editorial content aligned with production through `infra/cloudflare/content-worker/sync-beta-editorial-content.ps1`. That sync may copy only `editions` and `stories`; never copy production profiles, sessions, activity, feedback, secrets, or generation-run history without explicit user approval.
- Write and maintain all repository documentation as Markdown (`.md`) files. Store every documentation file in the root `docs/` directory; do not add documentation files elsewhere in the repository.
- Prefer dependency-free HTML, CSS, and JavaScript unless a new dependency has a clear product need.
- Keep content and rendering in `content-engine/`, shared interactions in `script.js`, configuration in root config files, and presentation in `themes/`.
- Keep every feature and implementation infrastructure-agnostic by default. Domain logic, UI behavior, application contracts, and workflows must not import, name, or depend on a cloud provider, database, scheduler, deployment platform, or provider SDK.
- Isolate infrastructure-specific code under `infra/<provider>/` behind explicit adapters. Providers may supply configuration and implementations of application contracts, but provider details must not leak into portable code or public interfaces.
- Keep deployment implementations under `infra/<provider>/` and select the active provider through `infra/config.json`.
- Never commit infrastructure credentials, API tokens, account secrets, or local environment files.
- Do not create commits or push changes unless the user explicitly asks to commit or push.
- Make a change only when it is necessary to satisfy the product need or prevent a concrete defect. Challenge requests that would add needless complexity, duplicate an existing responsibility, or weaken maintainability; explain the concern and preserve the simpler working design when the requested change is not justified.
- Do not silently fall back when theme configuration is invalid; surface a clear error.
- Make focused changes and avoid unrelated formatting or restructuring.
- Update the corresponding documentation whenever a feature, behavior, workflow, data contract, configuration option, or operational procedure changes. Every new or materially changed user-facing feature must also update `docs/AI_NUGGETS_FEATURE_SUMMARY.md`. Create the relevant documentation when none exists, and keep root documentation links current.
- Update `docs/THEME_RULEBOOK.md` and this instruction file when the theme contract changes.
- Before completing changes, verify JavaScript syntax, theme asset paths, keyboard interactions, reduced-motion behavior, and no-scroll viewport fit at representative breakpoints. For UI changes, also verify that every affected visible element remains anchored, present, and usable during window resizing and every state that changes its surrounding content.
