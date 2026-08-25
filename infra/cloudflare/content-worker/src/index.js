import { editorialDate, isValidEditorialDate } from "../../../../content-engine/automation/domain/editorial-date.mjs";
import { generateDailyEdition } from "../../../../content-engine/automation/jobs/generate-daily-edition.mjs";
import { runScheduledEdition } from "../../../../content-engine/automation/jobs/run-scheduled-edition.mjs";
import { createGenerationProviderDependencies } from "../../../../content-engine/automation/config/create-generation-provider-dependencies.mjs";
import { CONTENT_ENGINE_CONFIG } from "../../../../content-engine/content-engine.config.mjs";
import { createD1EditionRepository } from "./d1-edition-repository.js";
import { createSessionToken, hashToken, verifyGoogleCredential } from "./google-auth.js";

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim());
  return origin && allowed.includes(origin)
    ? { "access-control-allow-origin": origin, vary: "Origin" }
    : {};
}

function userResponse(user) {
  return {
    user: {
      email: user.email,
      name: user.display_name,
      pictureUrl: user.picture_url,
      lastLoggedInAt: user.last_logged_in_at,
      lastRefreshedAt: user.last_refreshed_at,
      currentStreak: user.current_streak,
      longestStreak: user.longest_streak
    }
  };
}

function utcActivityDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function previousUtcDate(date = new Date()) {
  const previousDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1));
  return utcActivityDate(previousDay);
}

async function recordDailyActivity(db, userId, date = new Date()) {
  const today = utcActivityDate(date);
  const yesterday = previousUtcDate(date);
  await db.batch([
    db.prepare(`
      INSERT INTO user_daily_activity (user_id, activity_date)
      VALUES (?, ?)
      ON CONFLICT(user_id, activity_date) DO NOTHING
    `).bind(userId, today),
    db.prepare(`
      UPDATE user_profiles
      SET current_streak = CASE
            WHEN streak_last_active_date = ? THEN current_streak + 1
            ELSE 1
          END,
          longest_streak = MAX(
            longest_streak,
            CASE WHEN streak_last_active_date = ? THEN current_streak + 1 ELSE 1 END
          ),
          streak_last_active_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND (streak_last_active_date IS NULL OR streak_last_active_date <> ?)
    `).bind(yesterday, yesterday, today, userId, today)
  ]);

  return db.prepare(`
    SELECT id, email, display_name, picture_url, last_logged_in_at, last_refreshed_at,
           current_streak, longest_streak
    FROM user_profiles
    WHERE id = ?
  `).bind(userId).first();
}

function bearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
}

async function sessionUser(request, env) {
  const token = bearerToken(request);
  if (!token || token.length > 512) return null;
  const tokenHash = await hashToken(token);
  const now = Math.floor(Date.now() / 1000);
  return env.CONTENT_DB.prepare(`
    SELECT user_profiles.id, user_profiles.email, user_profiles.display_name, user_profiles.picture_url,
           user_profiles.last_logged_in_at, user_profiles.last_refreshed_at,
           user_profiles.current_streak, user_profiles.longest_streak
    FROM user_sessions
    JOIN user_profiles ON user_profiles.id = user_sessions.user_id
    WHERE user_sessions.token_hash = ? AND user_sessions.expires_at > ?
    LIMIT 1
  `).bind(tokenHash, now).first();
}

async function createSession(request, env, cors) {
  if (!env.GOOGLE_CLIENT_ID) return json({ error: "Google authentication is not configured." }, 503, cors);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400, cors);
  }

  let profile;
  try {
    profile = await verifyGoogleCredential(body.credential, env.GOOGLE_CLIENT_ID);
  } catch (error) {
    return json({ error: error.message }, 401, cors);
  }

  await env.CONTENT_DB.prepare(`
    INSERT INTO user_profiles (google_subject, email, display_name, picture_url)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(google_subject) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      picture_url = excluded.picture_url,
      last_logged_in_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).bind(profile.subject, profile.email, profile.displayName, profile.pictureUrl).run();
  await env.CONTENT_DB.prepare(`
    UPDATE user_profiles
    SET last_logged_in_at = CURRENT_TIMESTAMP,
        last_refreshed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE google_subject = ?
  `).bind(profile.subject).run();
  let user = await env.CONTENT_DB.prepare(`
    SELECT id, email, display_name, picture_url, last_logged_in_at, last_refreshed_at,
           current_streak, longest_streak
    FROM user_profiles
    WHERE google_subject = ?
  `).bind(profile.subject).first();
  if (!user) return json({ error: "Google profile could not be saved." }, 500, cors);
  user = await recordDailyActivity(env.CONTENT_DB, user.id);
  const token = createSessionToken();
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  await env.CONTENT_DB.prepare("INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)").bind(user.id, await hashToken(token), expiresAt).run();

  return json({ ...userResponse(user), sessionToken: token, expiresAt }, 201, cors);
}

async function signOut(request, env, cors) {
  const token = bearerToken(request);
  if (token && token.length <= 512) {
    await env.CONTENT_DB.prepare("DELETE FROM user_sessions WHERE token_hash = ?").bind(await hashToken(token)).run();
  }
  return new Response(null, { status: 204, headers: cors });
}

function createAutomationDependencies(env) {
  return {
    editionRepository: createD1EditionRepository(env.CONTENT_DB),
    ...createGenerationProviderDependencies(env),
    automaticallyPublish: CONTENT_ENGINE_CONFIG.publication.automaticallyPublish,
    logger: console
  };
}

async function handleAutomationRequest(request, env) {
  if (!env.AUTOMATION_TRIGGER_TOKEN) {
    return json({ error: "Automation trigger is not configured." }, 503);
  }

  if (request.headers.get("authorization") !== `Bearer ${env.AUTOMATION_TRIGGER_TOKEN}`) {
    return json({ error: "Unauthorized." }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const targetDate = body.targetDate || editorialDate();
  if (!isValidEditorialDate(targetDate)) return json({ error: "Invalid target date." }, 400);

  const result = await generateDailyEdition({
    targetDate,
    ...createAutomationDependencies(env)
  });
  return json(result, 200);
}

async function getEdition(db, requestedDate) {
  const edition = await db.prepare(`
    SELECT id, edition_date, status, eyebrow, title, emphasis, summary, meta_json, published_at
    FROM editions
    WHERE status = 'published' AND edition_date <= ?
    ORDER BY edition_date DESC
    LIMIT 1
  `).bind(requestedDate).first();

  if (!edition) return null;

  const { results: stories } = await db.prepare(`
    SELECT story_key, position, layout, category, title, summary_compact, summary, summary_detailed,
           destination_url, artwork_key, source_url, source_name, source_published_at
    FROM stories
    WHERE edition_id = ?
    ORDER BY position ASC
  `).bind(edition.id).all();

  return {
    date: edition.edition_date,
    status: edition.status,
    publishedAt: edition.published_at,
    briefing: {
      eyebrow: edition.eyebrow,
      title: edition.title,
      emphasis: edition.emphasis,
      summary: edition.summary,
      meta: JSON.parse(edition.meta_json)
    },
    stories: stories.map((story) => ({
      id: story.story_key,
      ...(story.layout ? { type: story.layout } : {}),
      category: story.category,
      title: story.title,
      summaries: {
        compact: story.summary_compact || story.summary,
        standard: story.summary,
        detailed: story.summary_detailed || story.summary
      },
      href: story.destination_url,
      art: story.artwork_key,
      sourceUrl: story.source_url,
      sourceName: story.source_name,
      sourcePublishedAt: story.source_published_at
    }))
  };
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const cors = corsHeaders(request, env);

  if (request.method === "POST" && url.pathname === "/internal/generate") {
    return handleAutomationRequest(request, env);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...cors, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "authorization, content-type" }
    });
  }

  if (request.method === "POST" && url.pathname === "/auth/google") return createSession(request, env, cors);
  if (request.method === "POST" && url.pathname === "/auth/sign-out") return signOut(request, env, cors);
  if (request.method === "GET" && url.pathname === "/auth/session") {
    const user = await sessionUser(request, env);
    return user ? json(userResponse(user), 200, cors) : json({ error: "Unauthenticated." }, 401, cors);
  }

  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, cors);
  if (url.pathname === "/health") return json({ status: "ok" }, 200, cors);

  const match = url.pathname.match(/^\/api\/editions\/(latest|\d{4}-\d{2}-\d{2})$/);
  if (!match) return json({ error: "Not found." }, 404, cors);

  const targetDate = match[1] === "latest"
    ? editorialDate()
    : match[1];
  if (!isValidEditorialDate(targetDate)) return json({ error: "Invalid edition date." }, 400, cors);

  const edition = await getEdition(env.CONTENT_DB, targetDate);
  if (!edition) return json({ error: `No published edition is available on or before ${targetDate}.` }, 404, cors);

  let user = await sessionUser(request, env);
  if (user) {
    await env.CONTENT_DB.prepare(`
      UPDATE user_profiles
      SET last_refreshed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(user.id).run();
    user = await recordDailyActivity(env.CONTENT_DB, user.id);
  }

  return json(edition, 200, {
    ...cors,
    "cache-control": user ? "private, no-store" : "public, max-age=300, s-maxage=900"
  });
}

async function handleScheduled(controller, env) {
  return runScheduledEdition({
    scheduledAt: new Date(controller.scheduledTime),
    createDependencies: () => createAutomationDependencies(env)
  });
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
  scheduled(controller, env, ctx) {
    ctx.waitUntil(handleScheduled(controller, env));
  }
};
