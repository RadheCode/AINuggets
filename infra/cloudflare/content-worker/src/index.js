const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function isValidDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

function dateInTimezone(timezone, instant = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim());
  return origin && allowed.includes(origin)
    ? { "access-control-allow-origin": origin, vary: "Origin" }
    : {};
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
    ? dateInTimezone(env.EDITORIAL_TIMEZONE || "UTC")
    : match[1];
  if (!isValidDate(targetDate)) return json({ error: "Invalid edition date." }, 400, cors);

  const edition = await getEdition(env.CONTENT_DB, targetDate);
  if (!edition) return json({ error: `No published edition is available on or before ${targetDate}.` }, 404, cors);

  return json(edition, 200, {
    ...cors,
    "cache-control": "public, max-age=300, s-maxage=900"
  });
}

async function handleScheduled(controller, env) {
  const targetDate = dateInTimezone(env.EDITORIAL_TIMEZONE || "UTC", new Date(controller.scheduledTime));
  const existing = await env.CONTENT_DB.prepare(
    "SELECT id FROM editions WHERE edition_date = ? LIMIT 1"
  ).bind(targetDate).first();

  if (existing) {
    await env.CONTENT_DB.prepare(`
      INSERT INTO generation_runs (target_date, status, details, finished_at)
      VALUES (?, 'skipped', 'Edition already exists.', CURRENT_TIMESTAMP)
    `).bind(targetDate).run();
    return;
  }

  await env.CONTENT_DB.prepare(`
    INSERT INTO generation_runs (target_date, status, details, finished_at)
    VALUES (?, 'skipped', 'No content provider is configured; no edition was generated.', CURRENT_TIMESTAMP)
  `).bind(targetDate).run();
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
  scheduled(controller, env, ctx) {
    ctx.waitUntil(handleScheduled(controller, env));
  }
};
