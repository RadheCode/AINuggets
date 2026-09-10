# Daily Streak

The Daily Streak feature rewards a signed-in reader for returning within the configured UTC calendar-day gap. It is entirely server-authoritative: the browser never sends a date, activity record, or streak value. The browser uses the public configured gap only to render supportive guidance.

## Qualifying activity

The content Worker records a qualifying activity when a user:

- completes verified Google sign-in; or
- requests a published edition with a valid session token.

The Worker calculates the date from its UTC clock and records at most one activity per user for that date. Multiple page refreshes, browser tabs, or retried requests on the same date do not increase the streak.

## Streak rules

| Previous qualifying date | New `current_streak` |
|---|---:|
| No previous activity | 1 |
| Previous qualifying date is within the configured gap | Previous streak + 1 |
| Today in UTC | Unchanged |
| Earlier than the configured gap | 1 |

`ProductConfig.readerEngagement.streak.maximumDaysBetweenQualifyingActivities` controls the inclusive gap. Its configured value of `4` permits up to three missed UTC days: activity on August 30 continues a streak last qualified on August 26. `longest_streak` is increased only when the active streak exceeds the reader's previous best. Sign-in and authenticated published-edition responses return `currentStreak` and `longestStreak`; the signed-in header Flame control displays the active value.

## Reader interface

The header always renders a Flame control beside the account control. It keeps its visible streak count and label, while matching the color-mode control's height at every breakpoint. Signed-out readers activate it to open the existing sign-in popover, and Escape returns focus to the button that opened it. Hovering the control or focusing the interactive guest button shows a separate floating, product-configured guidance bubble explaining the permitted gap without framing it as a countdown. The bubble has no layout footprint and is associated with the button through `aria-describedby`. Its flame is deliberately prominent and continuously flickers with subtle movement; reduced-motion preferences stop that animation. Signed-in readers see their server-managed active value as a non-interactive status. If sign-in is unavailable, the guest prompt remains visible but disabled with a clear accessible label. It follows the active theme's glass and neumorphic elevation language, gives only the interactive guest prompt a hover response, and preserves the same geometry in light and dark modes.

## Streak celebration

When a signed-in reader's streak increases to a milestone value, the browser fires a self-contained celebration through `CelebrationEngine.celebrateStreak()` in `content-engine/celebration.js`. The celebration tier is determined by the streak count:

| Streak | Tier | Effect |
|---|---|---|
| 1 | `start` | Light confetti burst, sparkle stars, single expanding ring, warm toast |
| 3, 6, 9… | `milestone` | Medium confetti, sparkle stars, two rings, milestone toast |
| 5, 10, 15… | `mega` | Multi-burst confetti from screen edges, sparkle stars, three rings, mega toast |
| 20, 25, 30… | `legendary` | Full confetti volume, sparkle stars, four rings, legendary toast |

The engine emits physics-based confetti particles (gravity, rotation, friction decay), four-point sparkle stars, and expanding stroke rings from the streak pill's center. A glassmorphic toast banner with emoji bounce, title, subtitle, and streak badge appears at the viewport center for 3.2 seconds. The streak pill receives a temporary `.streak-pill--celebrating` class that pulses a warm glow aura. A full-screen shimmer overlay adds a subtle top-edge radial flash.

All celebration copy (emoji, title, subtitle) is product-owned through `product/config.js` under `copy.celebration`. The engine respects `prefers-reduced-motion: reduce` by skipping all canvas and CSS animations and showing only the toast. The celebration canvas is created on demand and removed when its particle queue empties; it uses `pointer-events: none` so it never blocks interaction.

The celebration triggers in `renderAuthWidget` when the new streak count exceeds the previously tracked value. The last-seen streak is persisted per user in `localStorage` (keyed by email under the product storage namespace) and is never reset on sign-out. This allows celebration on the very first sign-in (streak 1 from a zero baseline) and again whenever the streak increases beyond its last recorded value. A streak restart (e.g. after a gap) is also detected when the new streak is 1 but the last-seen value was higher.

## Persistence

Migration `infra/cloudflare/content-worker/migrations/0008_add_user_daily_streaks.sql` adds:

| Storage | Purpose |
|---|---|
| `user_profiles.current_streak` | Current streak under the configured UTC-day gap policy. |
| `user_profiles.longest_streak` | Highest streak achieved by the user. |
| `user_profiles.streak_last_active_date` | Most recent qualifying UTC date (`YYYY-MM-DD`). |
| `user_daily_activity` | One durable row per `(user_id, activity_date)` for idempotency and history. |

The Worker inserts the activity row and conditionally updates the profile in one D1 batch. The unique primary key prevents duplicate same-day requests from being counted more than once. The product-owned grace-window setting is evaluated by the Worker; no schema or browser contract changes are required to adjust it.

## Querying streak information

Run these read-only queries in the Cloudflare D1 dashboard or through Wrangler. Replace `reader@example.com` with the user's email. D1 stores date-times in UTC; each displayed date-time below is converted to explicitly labeled IST. `activity_date` and `streak_last_active_date` remain UTC calendar-date values, not timestamps.

### Current streak for one user

```sql
SELECT
  email,
  display_name,
  current_streak,
  longest_streak,
  streak_last_active_date,
  datetime(last_logged_in_at, '+5 hours', '+30 minutes') || ' IST' AS last_logged_in_at_ist,
  datetime(last_refreshed_at, '+5 hours', '+30 minutes') || ' IST' AS last_refreshed_at_ist
FROM user_profiles
WHERE email = 'reader@example.com';
```

### Daily activity history for one user

```sql
SELECT
  profile.email,
  activity.activity_date,
  datetime(activity.recorded_at, '+5 hours', '+30 minutes') || ' IST' AS recorded_at_ist
FROM user_daily_activity AS activity
JOIN user_profiles AS profile ON profile.id = activity.user_id
WHERE profile.email = 'reader@example.com'
ORDER BY activity.activity_date DESC;
```

### Readers with the longest active streaks

```sql
SELECT
  email,
  display_name,
  current_streak,
  longest_streak,
  streak_last_active_date
FROM user_profiles
WHERE current_streak > 0
ORDER BY current_streak DESC, streak_last_active_date DESC
LIMIT 25;
```

### Remote Wrangler command

From the repository root, query production D1 with:

```powershell
$workerConfig = Join-Path (Resolve-Path ".\infra\cloudflare\content-worker") "wrangler.streak-inspect.generated.jsonc"
.\infra\cloudflare\content-worker\render-worker-config.ps1 -Environment Production -OutputPath $workerConfig

npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config $workerConfig `
  --command "SELECT email, display_name, current_streak, longest_streak, streak_last_active_date, datetime(last_logged_in_at, '+5 hours', '+30 minutes') || ' IST' AS last_logged_in_at_ist, datetime(last_refreshed_at, '+5 hours', '+30 minutes') || ' IST' AS last_refreshed_at_ist FROM user_profiles WHERE email = 'reader@example.com';"
```

Omit `--remote` only when intentionally querying the local Wrangler D1 database. The streak schema must be deployed with the Worker migration before production queries can use these columns. Remove the generated file when finished with `Remove-Item $workerConfig`.
