const X_AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_POST_URL = "https://api.twitter.com/2/tweets";

function base64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}

function required(env, name) {
  if (!env[name]) throw new Error(`${name} is not configured.`);
  return env[name];
}

async function encryptionKey(env) {
  const bytes = decodeBase64(required(env, "X_OAUTH_ENCRYPTION_KEY"));
  if (bytes.length !== 32) throw new Error("X_OAUTH_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(value, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(env), new TextEncoder().encode(value));
  return `${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

async function decrypt(value, env) {
  const [iv, payload] = value.split(".");
  if (!iv || !payload) throw new Error("Stored X credential is invalid.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64(iv) }, await encryptionKey(env), decodeBase64(payload));
  return new TextDecoder().decode(plain);
}

function randomValue(length = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(length)));
}

async function challenge(verifier) {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

function redirectUri(env) {
  return required(env, "X_OAUTH_REDIRECT_URI");
}

async function requestToken(env, params) {
  const credentials = btoa(`${required(env, "X_CLIENT_ID")}:${required(env, "X_CLIENT_SECRET")}`);
  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params)
  });
  if (!response.ok) throw new Error(`X token request failed (${response.status}).`);
  const token = await response.json();
  if (!token.access_token || !token.refresh_token) throw new Error("X token response did not include renewable user credentials.");
  return token;
}

async function saveRefreshToken(db, env, refreshToken) {
  await db.prepare(`
    INSERT INTO social_oauth_credentials (platform, refresh_token_ciphertext, updated_at)
    VALUES ('x', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(platform) DO UPDATE SET refresh_token_ciphertext = excluded.refresh_token_ciphertext, updated_at = CURRENT_TIMESTAMP
  `).bind(await encrypt(refreshToken, env)).run();
}

async function refreshedAccessToken(env) {
  const stored = await env.CONTENT_DB.prepare("SELECT refresh_token_ciphertext FROM social_oauth_credentials WHERE platform = 'x'").first();
  if (!stored) throw new Error("X authorization has not been completed.");
  const token = await requestToken(env, {
    grant_type: "refresh_token",
    refresh_token: await decrypt(stored.refresh_token_ciphertext, env),
    client_id: required(env, "X_CLIENT_ID")
  });
  await saveRefreshToken(env.CONTENT_DB, env, token.refresh_token);
  return token.access_token;
}

export async function beginXAuthorization(env) {
  const state = randomValue();
  const verifier = randomValue(48);
  await env.CONTENT_DB.prepare("DELETE FROM social_oauth_states WHERE expires_at <= CURRENT_TIMESTAMP").run();
  await env.CONTENT_DB.prepare(`
    INSERT INTO social_oauth_states (state, code_verifier_ciphertext, expires_at)
    VALUES (?, ?, datetime('now', '+10 minutes'))
  `).bind(state, await encrypt(verifier, env)).run();
  const parameters = new URLSearchParams({
    response_type: "code", client_id: required(env, "X_CLIENT_ID"), redirect_uri: redirectUri(env),
    scope: "tweet.read tweet.write users.read offline.access", state,
    code_challenge: await challenge(verifier), code_challenge_method: "S256"
  });
  return `${X_AUTHORIZE_URL}?${parameters}`;
}

export async function completeXAuthorization(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) throw new Error("X did not return an authorization code and state.");
  const pending = await env.CONTENT_DB.prepare(`
    SELECT code_verifier_ciphertext FROM social_oauth_states
    WHERE state = ? AND expires_at > CURRENT_TIMESTAMP
  `).bind(state).first();
  await env.CONTENT_DB.prepare("DELETE FROM social_oauth_states WHERE state = ?").bind(state).run();
  if (!pending) throw new Error("The X authorization state is invalid or expired. Start again.");
  const token = await requestToken(env, {
    grant_type: "authorization_code", code, redirect_uri: redirectUri(env), client_id: required(env, "X_CLIENT_ID"),
    code_verifier: await decrypt(pending.code_verifier_ciphertext, env)
  });
  await saveRefreshToken(env.CONTENT_DB, env, token.refresh_token);
}

export function createXSocialPublisher({ env, socialPostConfig, siteUrl }) {
  return async ({ edition, eventLogger }) => {
    if (env.DEPLOYMENT_ENVIRONMENT !== "production" || !socialPostConfig?.enabled) return { outcome: "skipped" };
    try {
      const { createSocialPost } = await import("../../../../content-engine/automation/pipeline/social-post.mjs");
      const editionUrl = `${siteUrl}/?date=${encodeURIComponent(edition.date)}`;
      const text = createSocialPost({ edition, config: socialPostConfig, editionUrl, maximumLength: 280, shortenedUrlLength: 23 });
      const response = await fetch(X_POST_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${await refreshedAccessToken(env)}`, "content-type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error(`X post request failed (${response.status}).`);
      const result = await response.json();
      const postId = result.data?.id ?? null;
      await eventLogger.record("social-publication", "x-post-succeeded", { platform: "x", postId }, { outcome: "succeeded" });
      return { outcome: "succeeded", postId };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown X publishing error.";
      await eventLogger.record("social-publication", "x-post-failed", { platform: "x", reason }, { outcome: "failed" });
      console.error("X social publication failed.", error);
      return { outcome: "failed", reason };
    }
  };
}