import { editorialDate, isValidEditorialDate } from "../../../../content-engine/automation/domain/editorial-date.mjs";
import { generateDailyEdition } from "../../../../content-engine/automation/jobs/generate-daily-edition.mjs";
import { runScheduledEdition } from "../../../../content-engine/automation/jobs/run-scheduled-edition.mjs";
import { createGenerationProviderDependencies } from "../../../../content-engine/automation/config/create-generation-provider-dependencies.mjs";
import { CONTENT_ENGINE_CONFIG } from "../../../../content-engine/content-engine.config.mjs";
import "../../../../product/config.js";
import { createD1EditionRepository } from "./d1-edition-repository.js";
import { createSessionToken, hashToken, verifyGoogleCredential } from "./google-auth.js";
import { earliestContinuationDate, utcActivityDate } from "./streak-policy.js";

const SUMMARY_FEATURE_CONFIG = globalThis.ProductConfig.summaryFeatures;
const STREAK_FEATURE_CONFIG = globalThis.ProductConfig.readerEngagement?.streak;
const validateSummaryFeatureConfig = globalThis.ProductConfig.validateSummaryFeatureConfig;
const validateStreakFeatureConfig = globalThis.ProductConfig.validateStreakFeatureConfig;

validateStreakFeatureConfig();

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

async function recordDailyActivity(db, userId, date = new Date()) {
  const today = utcActivityDate(date);
  const continuationStartDate = earliestContinuationDate(
    date,
    STREAK_FEATURE_CONFIG.maximumDaysBetweenQualifyingActivities
  );
  await db.batch([
    db.prepare(`
      INSERT INTO user_daily_activity (user_id, activity_date)
      VALUES (?, ?)
      ON CONFLICT(user_id, activity_date) DO NOTHING
    `).bind(userId, today),
    db.prepare(`
      UPDATE user_profiles
      SET current_streak = CASE
            WHEN streak_last_active_date >= ? THEN current_streak + 1
            ELSE 1
          END,
          longest_streak = MAX(
            longest_streak,
            CASE WHEN streak_last_active_date >= ? THEN current_streak + 1 ELSE 1 END
          ),
          streak_last_active_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND (streak_last_active_date IS NULL OR streak_last_active_date <> ?)
    `).bind(continuationStartDate, continuationStartDate, today, userId, today)
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

function isAutomationRequestAuthorized(request, env) {
  return Boolean(env.AUTOMATION_TRIGGER_TOKEN)
    && request.headers.get("authorization") === `Bearer ${env.AUTOMATION_TRIGGER_TOKEN}`;
}

async function getGenerationRun(db, runId) {
  const run = await db.prepare(`
    SELECT
      run_id,
      target_date,
      status,
      details,
      datetime(started_at, '+5 hours', '+30 minutes') || ' IST' AS started_at_ist,
      datetime(finished_at, '+5 hours', '+30 minutes') || ' IST' AS finished_at_ist
    FROM generation_runs
    WHERE run_id = ?
    LIMIT 1
  `).bind(runId).first();
  if (!run) return null;

  const { results: events } = await db.prepare(`
    SELECT
      sequence,
      stage,
      event_name,
      metadata_json,
      outcome,
      duration_ms,
      datetime(created_at, '+5 hours', '+30 minutes') || ' IST' AS created_at_ist
    FROM generation_run_events
    WHERE run_id = ?
    ORDER BY sequence ASC
  `).bind(runId).all();

  return {
    run: {
      id: run.run_id,
      targetDate: run.target_date,
      status: run.status,
      details: run.details,
      startedAtIst: run.started_at_ist,
      finishedAtIst: run.finished_at_ist
    },
    events: events.map((event) => ({
      sequence: event.sequence,
      step: event.stage,
      event: event.event_name,
      outcome: event.outcome,
      durationMs: event.duration_ms,
      occurredAtIst: event.created_at_ist,
      details: JSON.parse(event.metadata_json)
    }))
  };
}

async function handleGenerationRunRequest(request, env, runId) {
  if (!isAutomationRequestAuthorized(request, env)) return json({ error: "Unauthorized." }, 401);
  const result = await getGenerationRun(env.CONTENT_DB, runId);
  return result ? json(result) : json({ error: "Generation run not found." }, 404);
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

function validFeedbackEmail(email) {
  return typeof email === "string"
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isOpaqueId(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function analyticsCountry(request) {
  const country = request.cf?.country;
  if (typeof country !== "string" || !/^[A-Z]{2}$/.test(country)) {
    return { code: "unknown", name: "Unknown" };
  }
  return {
    code: country,
    name: new Intl.DisplayNames(["en"], { type: "region" }).of(country) || country
  };
}

async function recordVisit(request, env, cors) {
  if (!cors["access-control-allow-origin"]) return json({ error: "Origin is not allowed." }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400, cors);
  }

  if (!isOpaqueId(body.eventId) || !isOpaqueId(body.visitorId)) {
    return json({ error: "Visitor event is invalid." }, 400, cors);
  }

  const visitorHash = await hashToken(body.visitorId);
  const country = analyticsCountry(request);
  await env.CONTENT_DB.prepare(`
    DELETE FROM visitor_visits
    WHERE occurred_at < datetime('now', '-90 days')
  `).run();
  await env.CONTENT_DB.prepare(`
    INSERT INTO visitor_visits (event_id, visitor_hash, country_code, country_name)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(event_id) DO NOTHING
  `).bind(body.eventId, visitorHash, country.code, country.name).run();
  return new Response(null, { status: 204, headers: cors });
}

async function submitFeedback(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400, cors);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const ratingHalves = Number(body.ratingHalves);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!validFeedbackEmail(email)) return json({ error: "Enter a valid email address." }, 400, cors);
  if (!Number.isInteger(ratingHalves) || ratingHalves < 2 || ratingHalves > 10 || ratingHalves % 2 !== 0) {
    return json({ error: "Choose a whole-star rating from one to five." }, 400, cors);
  }
  if (message.length < 20 || message.length > 4000) {
    return json({ error: "Feedback must be between 20 and 4,000 characters." }, 400, cors);
  }

  const user = await sessionUser(request, env);
  const storedEmail = user ? user.email.toLowerCase() : email;
  await env.CONTENT_DB.prepare(`
    INSERT INTO reader_feedback (user_id, email, rating_halves, message)
    VALUES (?, ?, ?, ?)
  `).bind(user?.id ?? null, storedEmail, ratingHalves, message).run();
  return json({ message: "Thank you for sharing your feedback." }, 201, cors);
}

function createAutomationDependencies(env) {
  validateSummaryFeatureConfig();
  validateStreakFeatureConfig();
  const values = {
    CONTENT_SOURCE_URL: env.CONTENT_SOURCE_URL,
    CONTENT_SOURCE_API_KEY: env.CONTENT_SOURCE_API_KEY,
    SUMMARY_PROVIDER_URL: env.SUMMARY_PROVIDER_URL,
    SUMMARY_PROVIDER_API_KEY: env.SUMMARY_PROVIDER_API_KEY,
    SUMMARY_PROVIDER_MODEL: env.SUMMARY_PROVIDER_MODEL,
    AI: env.AI
  };
  return {
    editionRepository: createD1EditionRepository(env.CONTENT_DB),
    ...createGenerationProviderDependencies(values),
    automaticallyPublish: CONTENT_ENGINE_CONFIG.publication.automaticallyPublish,
    logger: console
  };
}

async function handleAutomationRequest(request, env) {
  if (!env.AUTOMATION_TRIGGER_TOKEN) {
    return json({ error: "Automation trigger is not configured." }, 503);
  }
  if (!isAutomationRequestAuthorized(request, env)) {
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
  if (body.dryRun !== undefined && typeof body.dryRun !== "boolean") {
    return json({ error: "dryRun must be a boolean when provided." }, 400);
  }
  if (body.forceReplace !== undefined && typeof body.forceReplace !== "boolean") {
    return json({ error: "forceReplace must be a boolean when provided." }, 400);
  }
  if ((body.dryRun || body.forceReplace) && env.DEPLOYMENT_ENVIRONMENT !== "beta") {
    return json({ error: "Dry runs and forced replacement are available only in beta." }, 403);
  }
  if (body.dryRun && body.forceReplace) {
    return json({ error: "dryRun and forceReplace cannot both be true." }, 400);
  }

  const result = await generateDailyEdition({
    targetDate,
    dryRun: body.dryRun === true,
    forceReplace: body.forceReplace === true,
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
      summaries: Object.fromEntries(Object.keys(SUMMARY_FEATURE_CONFIG.contexts).flatMap((key) => {
        const columns = { compact: story.summary_compact, standard: story.summary, detailed: story.summary_detailed };
        return typeof columns[key] === "string" && columns[key].trim() ? [[key, columns[key]]] : [];
      })),
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

  const generationRunMatch = url.pathname.match(/^\/internal\/generation-runs\/([0-9a-f-]{36})$/i);
  if (request.method === "GET" && generationRunMatch) {
    return handleGenerationRunRequest(request, env, generationRunMatch[1]);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...cors, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "authorization, content-type" }
    });
  }

  if (request.method === "POST" && url.pathname === "/auth/google") return createSession(request, env, cors);
  if (request.method === "POST" && url.pathname === "/auth/sign-out") return signOut(request, env, cors);
  if (request.method === "POST" && url.pathname === "/api/feedback") return submitFeedback(request, env, cors);
  if (request.method === "POST" && url.pathname === "/api/analytics/visits") return recordVisit(request, env, cors);
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
      refreshExisting: CONTENT_ENGINE_CONFIG.schedule.refreshExistingEdition === true,
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
