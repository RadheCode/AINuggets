# AI Nuggets Repository Instructions

These instructions are mandatory for AI-assisted changes in this repository.

## Product contract

- AI Nuggets is a concise daily AI-news and newsletter website showing exactly four or five high-value updates.
- Keep the homepage as a single-screen experience. The document must not scroll at supported viewport sizes.
- Preserve the calm, premium editorial experience. Avoid dense dashboards, infinite feeds, intrusive prompts, autoplay media, and distracting motion.
- Treat `index.html` as the shared semantic shell, `content-engine/` as the content layer, and `script.js` as shared interaction behavior.

## Content architecture

- Keep all briefing data and shared content-rendering implementations under `content-engine/`.
- Store editions, stories, source attribution, and generation runs in the Cloudflare D1 database defined under `infra/cloudflare/content-worker/`.
- Keep daily-edition orchestration runtime-neutral under `content-engine/automation/`. Cloud provider triggers and persistence implementations must be adapters that inject dependencies into the portable job.
- Access public content only through the content Worker API configured in `content-engine/config.js`; do not hard-code stories in `index.html` or theme files.
- Change the D1 schema only through ordered SQL migrations. Never edit an already-applied migration.
- Keep draft editions out of public API responses; only `published` editions may be rendered publicly.
- Keep `content-engine/render.js` theme-agnostic and preserve the stable shared selectors it emits.
- Publish exactly four or five stories. Each story must have a unique ID, category, concise title, summary, destination, and supported artwork key.
- Keep content trustworthy and concise. Verify news against primary sources before publishing and avoid unsupported hype.

## Theme architecture

- All visual themes must live under `themes/<theme-id>/`.
- Theme IDs and directory names must use kebab-case.
- Every theme must contain `theme.css` and `theme.json`.
- Register themes in the root `theme.config.js` file.
- Change themes only through `activeTheme` in `theme.config.js`; do not hard-code a theme stylesheet in `index.html`.
- Keep `theme-loader.js` generic. It must load any registered theme without theme-specific conditions.
- Themes own presentation only. Do not put data fetching, event handling, story content, or application state in theme files.
- Do not add theme-specific HTML unless the shared page contract is intentionally revised for every theme.
- Follow the complete contract in `docs/THEME_RULEBOOK.md` whenever creating or editing a theme.

## Stable shared selectors

Preserve these selectors across themes unless a deliberate shared-shell migration updates every theme:

- `.site-frame`, `.site-header`, `.site-footer`
- `.brand`, `.brand-mark`, `.brand-copy`
- `.nav-tabs`, `.header-actions`, `.current-date`, `.color-mode-toggle`, `.mode-icon`
- `.briefing-intro`, `.briefing-copy`, `.briefing-meta`, `.eyebrow`
- `.story-grid`, `.story-card`, `.story-card--lead`, `.story-card--wide`
- `.story-art`, `.story-shade`, `.story-content`, `.story-tag`, `.story-number`, `.story-link`
- `.subscribe-button`, `.subscribe-dialog`

Do not rename IDs referenced by `script.js` without updating and validating the corresponding behavior.

## Responsive requirements

- Support large desktop, laptop, tablet, mobile portrait, and mobile landscape layouts.
- Keep the header, introduction, all story cards, and footer inside the viewport without document scrolling.
- Test down to 320px viewport width and 600px viewport height.
- Use fluid dimensions, CSS Grid or Flexbox, `minmax(0, 1fr)`, and `100dvh` where appropriate.
- Never solve overflow by clipping essential text or controls. Condense secondary copy at constrained breakpoints while retaining every story title and action.

## Color modes

- Every theme must support light and dark modes through `data-color-mode` on `<html>`.
- Keep the shared mode switcher functional, keyboard accessible, and visible at every supported viewport.
- Respect `defaultColorMode` from `theme.config.js`, use system preference when configured, and persist explicit user choice.
- Validate contrast, glass fallbacks, controls, dialogs, artwork overlays, and no-scroll fit in both modes.
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

- Prefer dependency-free HTML, CSS, and JavaScript unless a new dependency has a clear product need.
- Keep content and rendering in `content-engine/`, shared interactions in `script.js`, configuration in root config files, and presentation in `themes/`.
- Keep every feature and implementation infrastructure-agnostic by default. Domain logic, UI behavior, application contracts, and workflows must not import, name, or depend on a cloud provider, database, scheduler, deployment platform, or provider SDK.
- Isolate infrastructure-specific code under `infra/<provider>/` behind explicit adapters. Providers may supply configuration and implementations of application contracts, but provider details must not leak into portable code or public interfaces.
- Keep deployment implementations under `infra/<provider>/` and select the active provider through `infra/config.json`.
- Never commit infrastructure credentials, API tokens, account secrets, or local environment files.
- Do not silently fall back when theme configuration is invalid; surface a clear error.
- Make focused changes and avoid unrelated formatting or restructuring.
- Update `docs/THEME_RULEBOOK.md` and this instruction file when the theme contract changes.
- Before completing changes, verify JavaScript syntax, theme asset paths, keyboard interactions, reduced-motion behavior, and no-scroll viewport fit at representative breakpoints.
