# Daily Streak

The Daily Streak feature rewards a signed-in reader for returning on consecutive UTC calendar days. It is entirely server-authoritative: the browser never sends a date, activity record, or streak value.

## Qualifying activity

The content Worker records a qualifying activity when a user:

- completes verified Google sign-in; or
- requests a published edition with a valid session token.

The Worker calculates the date from its UTC clock and records at most one activity per user for that date. Multiple page refreshes, browser tabs, or retried requests on the same date do not increase the streak.

## Streak rules

| Previous qualifying date | New `current_streak` |
|---|---:|
| No previous activity | 1 |
| Yesterday in UTC | Previous streak + 1 |
| Today in UTC | Unchanged |
| Earlier than yesterday | 1 |

`longest_streak` is increased only when the active streak exceeds the reader's previous best. Sign-in and authenticated published-edition responses return `currentStreak` and `longestStreak`; the signed-in header Flame Pill displays the active value.

## Reader interface

The signed-in header renders the active streak in a Flame Pill beside the account control. It follows the active theme's glass and neumorphic elevation language, includes an ambient fire aura and hover response, and preserves the same geometry in light and dark modes. The pill is hidden when signed out and respects reduced-motion preferences.

## Persistence

Migration `infra/cloudflare/content-worker/migrations/0008_add_user_daily_streaks.sql` adds:

| Storage | Purpose |
|---|---|
| `user_profiles.current_streak` | Current consecutive UTC-day streak. |
| `user_profiles.longest_streak` | Highest streak achieved by the user. |
| `user_profiles.streak_last_active_date` | Most recent qualifying UTC date (`YYYY-MM-DD`). |
| `user_daily_activity` | One durable row per `(user_id, activity_date)` for idempotency and history. |

The Worker inserts the activity row and conditionally updates the profile in one D1 batch. The unique primary key prevents duplicate same-day requests from being counted more than once.

## Querying streak information

Run these read-only queries in the Cloudflare D1 dashboard or through Wrangler. Replace `reader@example.com` with the user's email.

### Current streak for one user

```sql
SELECT
  email,
  display_name,
  current_streak,
  longest_streak,
  streak_last_active_date,
  last_logged_in_at,
  last_refreshed_at
FROM user_profiles
WHERE email = 'reader@example.com';
```

### Daily activity history for one user

```sql
SELECT
  profile.email,
  activity.activity_date,
  activity.recorded_at
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
  --command "SELECT email, display_name, current_streak, longest_streak, streak_last_active_date, last_logged_in_at, last_refreshed_at FROM user_profiles WHERE email = 'reader@example.com';"
```

Omit `--remote` only when intentionally querying the local Wrangler D1 database. The streak schema must be deployed with the Worker migration before production queries can use these columns. Remove the generated file when finished with `Remove-Item $workerConfig`.
