# AI Nuggets Theme Rulebook

This document defines the contract for every visual theme in AI Nuggets. Themes may change presentation, but they must not change content structure, behavior, accessibility, or the single-screen product promise.

## Directory contract

Each theme lives in its own kebab-case directory:

```text
themes/
  theme-name/
    theme.css
    theme.json
```

`theme.css` is the theme entry point. `theme.json` documents the theme with these required fields:

- `id`: unique kebab-case identifier matching the directory name
- `name`: human-readable name
- `description`: one-sentence visual summary
- `version`: semantic version
- `stylesheet`: stylesheet filename relative to the theme directory

Do not place theme-specific CSS, images, fonts, or animations at the repository root.

## Registering and selecting themes

Register every theme in the `themes` map inside `theme.config.js`. Select exactly one theme with `activeTheme`:

```js
window.AINuggetsThemeConfig = Object.freeze({
  activeTheme: "glass-bento",
  themes: Object.freeze({
    "glass-bento": Object.freeze({
      name: "Glass Bento",
      stylesheet: "themes/glass-bento/theme.css"
    })
  })
});
```

Switch themes only through `activeTheme`. Do not edit `index.html` to activate a theme.

## Stable page contract

Themes must style the existing semantic classes and must not require theme-specific HTML. The stable surfaces are:

- `.site-frame`, `.site-header`, `.site-footer`
- `.brand`, `.brand-mark`, `.brand-copy`
- `.nav-tabs`, `.header-actions`, `.current-date`, `.color-mode-toggle`, `.mode-icon`
- `.briefing-intro`, `.briefing-copy`, `.briefing-meta`, `.eyebrow`
- `.story-grid`, `.story-card`, `.story-card--lead`, `.story-card--wide`
- `.story-art`, `.story-shade`, `.story-content`, `.story-tag`, `.story-number`, `.story-link`
- `.subscribe-button`, `.subscribe-dialog`

Theme styles must scope reusable variables under `:root` and may use the `data-theme` attribute on `<html>` for explicit scoping. Themes must not rename IDs used by `script.js` or introduce behavior into CSS.

## Color mode contract

- Every theme must support both `data-color-mode="light"` and `data-color-mode="dark"` on the root `<html>` element.
- `theme.config.js` controls the initial behavior with `defaultColorMode`: `"system"`, `"light"`, or `"dark"`.
- The shared switcher persists an explicit choice under the `ai-nuggets-color-mode` local-storage key.
- Define mode colors through CSS custom properties where practical so component states remain consistent.
- Both modes must meet the same accessibility, responsive, and no-scroll requirements.
- Switching modes must preserve the exact geometry and alignment of every page element. Color modes may change styling only; they must not move, resize, or reflow tiles or other content.
- Do not implement a separate dark-theme directory when the layout and visual identity are otherwise the same theme.

## Layout rules

1. Keep the homepage within one viewport without document scrolling at supported sizes.
2. Show all five daily stories at once.
3. Preserve a clear lead-story hierarchy while keeping every card readable and actionable.
4. Support large desktop, laptop, tablet, mobile portrait, and mobile landscape layouts.
5. Use fluid sizing and `minmax(0, 1fr)` so grid content cannot force overflow.
6. Prefer `100dvh` for viewport layouts and account for browser chrome on mobile.
7. Test narrow mobile widths down to 320px and short laptop heights down to 600px.

## Accessibility rules

1. Maintain visible `:focus-visible` states for all links, buttons, and inputs.
2. Meet WCAG AA contrast for essential text and controls.
3. Keep text legible over artwork with overlays, shadows, or solid surfaces.
4. Honor `prefers-reduced-motion: reduce` by disabling or minimizing animation and transitions.
5. Do not convey category, status, or interaction through color alone.
6. Preserve semantic HTML and accessible names from `index.html`.

## Motion and effects

- Motion should clarify hierarchy or interaction, not distract from reading.
- Entrance animations should finish quickly and never block interaction.
- Hover effects must have equivalent focus behavior where relevant.
- Glass effects need an opaque-enough fallback background for browsers without backdrop blur.
- Avoid continuous animation on text or cards; ambient background motion may be subtle.

## Content and behavior boundaries

- `index.html` owns content and semantic structure.
- `script.js` owns shared product behavior.
- `theme.config.js` owns theme registration and selection.
- `theme-loader.js` owns loading the selected stylesheet.
- A theme owns presentation only. It must not fetch data, register application events, or alter story content.

## Validation checklist

Before accepting a theme:

1. Select it through `theme.config.js` and confirm its stylesheet loads without console errors.
2. Confirm all five cards, header, intro, and footer fit without page scrolling.
3. Check desktop, laptop, tablet, mobile portrait, and mobile landscape widths and heights.
4. Verify the light/dark switcher, persistence, keyboard focus, newsletter dialog behavior, readable contrast in both modes, reduced motion, and identical element geometry before and after a mode change.
5. Confirm missing or invalid theme configuration fails visibly instead of silently loading a fallback.
