# AI Nuggets Design System

This document is the authoritative design system for AI Nuggets. Refer to it before making **any visual, layout, interaction, component, theme, responsive, or accessibility design change**. It translates the product's calm, premium editorial direction into reusable rules so new work belongs to one coherent interface rather than introducing a parallel visual language.

The active implementation is the `glass-bento` theme in `themes/glass-bento/`. This system defines the shared intent and contracts; the theme implements the visual tokens and presentation. For theme packaging and selection rules, see [Theme Rulebook](THEME_RULEBOOK.md).

## 1. Design principles

| Principle | Requirement |
| --- | --- |
| Editorial calm | Prioritize reading, hierarchy, and deliberate whitespace. Do not introduce dashboard density, noisy decoration, autoplay media, or attention-seeking motion. |
| One-screen briefing | The homepage is a complete daily briefing, not a feed. Header, introduction, four or five stories, and footer must fit within the supported viewport without document scrolling. |
| Purposeful hierarchy | Make the lead story prominent while keeping every story equally discoverable, readable, and actionable. |
| Soft precision | Use restrained glass, soft gradients, rounded surfaces, and subtle elevation to create depth without reducing legibility or control clarity. |
| Consistent semantics | A color, icon, surface, shape, or motion treatment has one meaning everywhere it is used. Reuse it instead of creating page- or feature-specific near-matches. |
| Accessible by default | Visual polish must preserve semantic HTML, keyboard operation, visible focus, WCAG AA contrast, readable artwork overlays, and reduced-motion behavior. |

## 2. Ownership and implementation boundaries

| Concern | Owner | Rules |
| --- | --- | --- |
| Semantic page structure | `index.html`, `about.html` | Keep landmarks, headings, labels, dialog semantics, and stable selectors intact. Do not add theme-specific markup. |
| Content and shared rendering | `content-engine/` | Keep content rendering theme-agnostic. New visual decisions must be expressed by stable classes and theme styling, not content-specific inline presentation. |
| Shared interaction | `script.js` | Own keyboard handling, dialog behavior, state transitions, and color-mode behavior. CSS must not create application state or behavior. |
| Product identity and reader-facing copy | `product/` | Store rebrandable labels, copy, artwork mappings, and public browser configuration here; do not encode product-specific text in shared CSS or shell markup. |
| Presentation | `themes/<theme-id>/theme.css` | Define tokens, layout, surfaces, type treatment, responsive rules, and presentation-only animation. |
| Theme configuration | `theme.config.js`, `theme-loader.js` | Register and select themes through configuration only. The loader remains generic. |

## 3. Foundations

### 3.1 Color and semantic tokens

The active theme defines its tokens on `:root` and overrides them under `:root[data-color-mode="dark"]`. New CSS must consume semantic tokens whenever an existing token represents the required meaning. Do not hard-code a competing color for an established semantic role.

| Semantic role | Active token or treatment | Use for | Do not use for |
| --- | --- | --- | --- |
| Primary ink | `--ink` | Headings, primary body text, essential foregrounds | Muted metadata or disabled controls |
| Secondary ink | `--muted` | Supporting copy, dates, metadata, secondary labels | Essential text where contrast would fall below AA |
| Primary accent | `--blue` / `--blue-deep` | Active navigation, primary emphasis, interactive foregrounds, focused visual language | Unrelated status meanings |
| Success/live indicator | Green eyebrow indicator | A current, live briefing state | General decoration or selectable controls |
| Streak accent | Warm orange streak-pill treatment | Reading-streak status only | Briefing category, primary actions, or arbitrary highlights |
| Base surface | `--surface` | Page background | Elevated card or dialog surfaces |
| Glass surface | `--glass` with `--glass-border` | Compact controls and translucent elevated UI | Essential text backdrop without a readable fallback |
| Tile surface | `--tile-surface`, `--tile-highlight`, `--tile-shadow` | Story-card depth and surface hierarchy | General page backgrounds |
| Separator | `--line` | Subtle boundaries and grouping | Primary focus indication |
| Focus ring | Current high-contrast blue outline | Every keyboard-focusable control | Hover-only affordance or selected state |

Rules:

1. Keep semantic color roles stable between light and dark modes; only their values may change.
2. Preserve the active accent for selected controls. A selected control is raised, while a deliberately pressed control may look inset.
3. Do not use color as the only carrier of category, state, validation, or interactivity. Pair it with text, an icon, shape, position, or accessible state.
4. Use opaque-enough backgrounds behind important text. When `backdrop-filter` is unavailable, the fallback must retain contrast and surface separation.
5. Check all new or altered foreground/background combinations at WCAG AA contrast or higher for essential text and controls in both color modes.

### 3.2 Typography

The current type stack is `Figtree`, followed by `Segoe UI Variable`, `Segoe UI`, and a generic sans-serif fallback. Maintain this stack through `--font`; do not introduce a new font or a one-off typeface without an intentional design-system revision.

| Level | Existing treatment | Purpose |
| --- | --- | --- |
| Product identity | Compact, strong `brand-copy strong`; uppercase supporting `brand-copy small` | Identifies the product without competing with the briefing |
| Page title | `h1`, fluid `clamp()` sizing, tight negative tracking, balanced wrapping | Primary editorial statement |
| Section and dialog heading | Semantic `h2` | Clear dialog and secondary-page hierarchy |
| Story title | Theme-defined story-card title treatment | Scannable, readable story entry point |
| Body copy | Comfortable line-height and muted supporting tone | Briefing description, summaries, supporting content |
| Metadata and tags | Small, bold, uppercase, letter-spaced | Dates, category, count, cadence, compact controls |

Use semantic heading levels in order. Do not imitate headings with arbitrary font sizes where a heading is required. Keep titles concise enough to remain readable in their allocated card space at the smallest supported viewport.

### 3.3 Spacing, sizing, and shape

The system uses a compact, fluid spacing rhythm rather than fixed page-specific offsets.

- Use `clamp()` for type, spacing, and dimensions that must adapt across supported viewports.
- Use Grid or Flexbox with explicit tracks and `minmax(0, 1fr)` for responsive groupings; do not rely on incidental whitespace or viewport-relative positioning to place visible controls.
- Reuse the established rounded language: compact controls use small rounded corners or pills; cards, panels, and dialogs use larger rounded corners; the site frame uses the largest radius.
- Keep dimensions geometry-stable across light and dark modes. A mode switch changes color and surface styling, not spacing, alignment, dimensions, or grid placement.
- Keep touch and pointer targets comfortably reachable. Do not shrink an essential action to solve a constrained layout; reduce secondary copy or reflow the group deliberately instead.

### 3.4 Elevation and glass

Elevation communicates hierarchy, not decoration:

| Layer | Examples | Treatment |
| --- | --- | --- |
| Canvas | Body background and ambient gradients | Quiet base; no interactive affordance |
| Frame | `.site-frame` | Largest glass container, subtle border, ambient depth |
| Structural chrome | Header and footer | Light translucent grouping that remains distinct from content |
| Raised interactive surface | Tabs, toggles, account controls, cards | Border, restrained shadow, and visible interactive affordance |
| Selected surface | Active tab and selected controls | Accent-filled, clearly raised treatment |
| Overlay | Dialogs and menus | Stronger opaque surface, backdrop separation, clear close path |

Maintain equivalent elevation semantics in both color modes. Do not use a glass effect solely for decoration: it must retain a non-blurred background, a border or shadow that establishes its edge, and enough opacity to preserve text and control contrast.

## 4. Layout system

### 4.1 Page frame

`.site-frame` is the shared single-screen container. It uses a three-row grid for header, main content, and footer. Preserve this architecture unless every theme and affected page is intentionally migrated together.

- Use `100dvh`-aware sizing so browser chrome is handled correctly on mobile.
- Keep document scrolling disabled only when all essential page content remains present and usable. Dialog interiors may scroll where needed; the page itself must not hide essential content.
- Retain the frame's fluid maximum width and external breathing room. Do not allow wide screens to turn the briefing into an edge-to-edge dashboard.

### 4.2 Header

The header is a three-part grid: product identity on the left, navigation in the center, and `.header-actions` on the right. Its groups must remain anchored as a unit during resize.

- `.brand` is the canonical product identity treatment. Reuse `.brand-mark` and `.brand-copy`; do not recreate a second logo system per page.
- `.nav-tabs` is the canonical primary navigation control. Active state uses the shared primary accent.
- `.header-actions` contains date, optional streak status, authentication control, and color-mode toggle. Preserve the group, order, keyboard access, and visible mode switcher at every supported size.
- Menus are anchored to their invoking control. Do not position menus relative to the viewport or free space.

### 4.3 Briefing introduction

`.briefing-intro` pairs the editorial title with supporting briefing copy and metadata. It may reflow at constrained widths but must preserve the semantic order and the relationship between title and context.

- `.eyebrow` is the canonical compact briefing label. Reuse it across pages rather than introducing a near-identical badge.
- Keep `h1` as the page's only primary heading.
- `.briefing-meta` remains supplementary; prioritize the title and required story actions when height is constrained.

### 4.4 Story grid

`.story-grid` is a deliberate editorial composition, not a generic card collection.

- Publish and render exactly four or five stories; the visual grid must accommodate both valid counts without leaving broken hierarchy.
- `.story-card--lead` establishes the leading story. `.story-card--wide` supports secondary hierarchy. Do not repurpose these modifiers for unrelated visual variation.
- Every story must retain its title and action at every supported viewport. Summary copy may condense before essential information is hidden.
- Artwork is decorative support for content, never the only source of information. `.story-shade` must keep foreground content readable over every supported artwork key.

### 4.5 Footer and edge tabs

`.site-footer` is quiet, structural product context. Feedback is an edge tab in `.edge-tabs`, vertically centered and fixed to the shared frame's right border so it stays anchored to the frame during resize. `.edge-tabs` lives outside the frame shell (which clips overflow) and is pinned with `position: fixed` so the tab may protrude beyond the frame border; Feedback slides inside the frame (`translateX(-100%)`), its right edge touching the frame's right border. Support is a compact horizontal pill hosted in the footer's right side.

- Keep the footer free of competing calls to action; the Feedback edge tab is the discoverable reader-engagement action, and Support sits quietly at the footer's right edge.
- Feedback uses the docked edge-tab treatment (vertical label, rounded left corners, distinctive elevation and hover/focus behavior) so it reads as the attached reader-engagement control.
- The Feedback edge tab must remain visible and usable at every supported breakpoint; do not hide it to resolve responsive constraints. Its fixed-left anchor follows the frame's right-border geometry (`calc(50% + min(590px, calc(50% - 20px)))` base, `calc(100% - 12px)` at ≤1050px, `calc(100% - 6px)` at ≤760px).

## 5. Components and interaction states

### 5.1 Component rules

| Component | Stable selector(s) | Design contract |
| --- | --- | --- |
| Site frame | `.site-frame` | Single calm canvas containing the complete briefing; do not bypass it with floating page-level UI. |
| Brand | `.brand`, `.brand-mark`, `.brand-copy` | Reusable product identity; subtle hover may be mirrored by focus where interactive. |
| Navigation | `.nav-tabs` | Compact grouped control; active item has accent-filled selected state. |
| Header controls | `.header-actions`, `.color-mode-toggle`, auth controls | Explicit flex group, consistent glass elevation, visible focus, no detached placement. |
| Status pill | `.streak-pill` | Dedicated warm status language; hidden state uses `hidden`, not visual opacity alone. |
| Briefing label | `.eyebrow` | Shared compact label treatment; live indicator is purposeful and not general animation. |
| Story card | `.story-card`, `.story-art`, `.story-shade`, `.story-content`, `.story-tag`, `.story-number`, `.story-link` | Readable layered editorial tile; artwork and shade protect content hierarchy. |
| Dialog | `.story-dialog`, `.feedback-dialog`, `.dialog-close`, `.dialog-mark` | Canonical overlay shell; all new dialogs, panels, and overlays must inherit its surface, elevation, backdrop, close treatment, responsive size, spacing, motion, and internal scroll behavior. |
| Menu | `.account-menu` | Anchored to its trigger, visually related to account control, with a clear boundary and keyboard-safe open/close behavior. |
| Feedback controls | `.feedback-*` | Use normal labels, grouped rating semantics, clear validation and submit states. |
| Edge tab | `.edge-tabs`, `.feedback-tab` | Feedback tab vertically centered at the frame's right border; `.edge-tabs` is `position: fixed` outside the clipping frame so Feedback reads inside the border. Vertical-label treatment, rounded left corners, distinctive elevation and hover/focus behavior. Must stay anchored and visible at every breakpoint. |
| Support pill | `.support-tab` | Compact horizontal pill hosted in the site footer's right side; opens the support dialog. Reuses the warm accent treatment while staying visually lighter than the Feedback edge tab. |

### 5.2 Required states

Every interactive component must define and visually distinguish these applicable states in both color modes:

| State | Requirement |
| --- | --- |
| Default | Clear purpose and sufficient contrast without requiring hover. |
| Hover | Subtle, brief affordance only; never the sole way to reveal a control or meaning. |
| Focus-visible | High-contrast focus indicator, usually the established blue outline with offset. |
| Active/pressed | Immediate response that is distinct from persistent selection. |
| Selected/current | Shared primary accent and raised treatment; communicate programmatic state with relevant ARIA attributes. |
| Disabled/loading | Non-interactive appearance and correct semantic state; preserve readable labels and avoid a success-like appearance. |
| Error | Clear message and non-color cue; retain input label and recovery path. |
| Empty/hidden | Use semantic `hidden` or an explicit empty state; do not leave unexplained visual gaps. |

## 6. Responsive behavior

Support large desktop, laptop, tablet, mobile portrait, and mobile landscape, down to 320px width and 600px height.

1. Every visible element and target must remain present, anchored, fluid, and usable while resizing, zooming, or changing input method.
2. Use explicit responsive Grid or Flex layouts. Do not use absolute or viewport-relative positioning to make a control appear incidentally placed.
3. Do not create implicit grid tracks that can cause overlap or overflow.
4. Condense secondary copy before changing hierarchy. Never clip a story title, hide an essential action, or remove the color-mode control as an overflow workaround.
5. Reflow related elements as a deliberate group. Header actions, dialog actions, navigation, and account controls must remain associated with their trigger or container.
6. Preserve reader access in loading, error, authenticated, menu-expanded, and dialog-open states, not only in the default layout.
7. Mobile landscape and short-height viewports are first-class supported cases. Check that the full briefing still fits without document scroll and that dialog internals can scroll independently where needed.

## 7. Accessibility and motion

### Accessibility

- Preserve semantic landmarks, heading hierarchy, form labels, accessible names, and native control behavior.
- Keep keyboard operation complete: all actions are reachable, dialogs have a clear close control, menus report expanded state, and focus remains perceptible.
- Ensure artwork overlays, glass, gradients, selected states, and dark-mode surfaces meet contrast requirements.
- Do not make functionality hover-only. Keyboard focus must receive an equivalent affordance.
- Use `aria-live` only for meaningful status changes and retain visible feedback when a change requires user action.

### Motion

- Motion may explain entry, focus, hierarchy, or a direct interaction. It must never be continuous on text or story cards.
- Keep motion brief, subtle, and non-blocking. Avoid dramatic parallax, bouncing, or decorative movement that competes with reading.
- Mirror relevant hover movement for keyboard focus where it communicates interactivity.
- Honor `prefers-reduced-motion: reduce` by removing or minimizing transitions and animation.
- Any motion or emphasis that is visible in one color mode must remain purposeful and perceptible in the other.

## 8. Change workflow

Before implementing a design change:

1. Classify the work: product copy or asset (`product/`), shared structure (`index.html` or `about.html`), shared behavior (`script.js`), content rendering (`content-engine/`), presentation (`themes/`), or infrastructure (`infra/`).
2. Reuse an existing token, selector, component, icon, dialog shell, and responsive pattern whenever the meaning already exists.
3. If a new primitive is necessary, define its semantic role, states, color-mode behavior, responsive placement, and accessibility contract here before or alongside its implementation.
4. Keep theme files presentation-only. Do not encode data fetching, application state, product copy, or event handling in a theme.
5. Update this document and [Theme Rulebook](THEME_RULEBOOK.md) whenever the shared visual contract, component inventory, token semantics, or theme workflow changes. Update the feature summary for materially changed reader-facing behavior.

## 9. Design-review checklist

Complete this checklist for every design change:

- [ ] The change follows this design system and reuses existing semantic tokens, selectors, icons, and component shells where applicable.
- [ ] New product-specific copy, assets, and public settings are externalized under `product/`.
- [ ] Light and dark modes retain the same geometry, hierarchy, elevation meaning, and usable contrast.
- [ ] Default, hover, focus-visible, active, selected, disabled/loading, and error states are defined where applicable.
- [ ] Keyboard operation, labels, semantic structure, focus visibility, and reduced-motion behavior remain correct.
- [ ] Glass surfaces have a readable non-blur fallback and artwork overlays keep text readable.
- [ ] The header, introduction, all four or five story cards, footer, and essential actions fit without document scrolling.
- [ ] Desktop, laptop, tablet, mobile portrait, mobile landscape, 320px width, and 600px height have been checked, including authenticated, loading, error, and expanded-control states affected by the work.
- [ ] No essential element overlaps, drifts, detaches, clips, becomes unreachable, or relies on hover alone.
- [ ] Theme asset paths and JavaScript syntax remain valid when the change affects them.

## 10. Related documentation

- [Theme Rulebook](THEME_RULEBOOK.md): Theme registration, structural constraints, and theme-validation rules.
- [Product Configuration](PRODUCT_CONFIGURATION.md): Rebrandable product data and browser-visible configuration.
- [AI Nuggets Feature Summary](AI_NUGGETS_FEATURE_SUMMARY.md): Reader-facing feature inventory.
- [Website Documentation](README.md): Repository documentation entry point.
