import { editorialDate, isValidEditorialDate } from "../../../../content-engine/automation/domain/editorial-date.mjs";
import { generateDailyEdition } from "../../../../content-engine/automation/jobs/generate-daily-edition.mjs";
import { runScheduledEdition } from "../../../../content-engine/automation/jobs/run-scheduled-edition.mjs";
import { createGenerationProviderDependencies } from "../../../../content-engine/automation/config/create-generation-provider-dependencies.mjs";
import { CONTENT_ENGINE_CONFIG } from "../../../../content-engine/content-engine.config.mjs";
import { createD1EditionRepository } from "./d1-edition-repository.js";

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
    SELECT story_key, position, layout, category, title, summary,
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
      summary: story.summary,
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
      headers: { ...cors, "access-control-allow-methods": "GET, OPTIONS" }
    });
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

  return json(edition, 200, {
    ...cors,
    "cache-control": "public, max-age=300, s-maxage=900"
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
