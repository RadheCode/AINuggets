const GOOGLE_CERTIFICATES_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function decodeJson(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

function encodedDigest(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashToken(token) {
  return encodedDigest(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
}

export function createSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function verifyGoogleCredential(credential, clientId) {
  if (typeof credential !== "string" || credential.length > 8192 || !clientId) {
    throw new Error("Invalid Google credential.");
  }

  const parts = credential.split(".");
  if (parts.length !== 3) throw new Error("Invalid Google credential.");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  let header;
  let payload;
  try {
    header = decodeJson(encodedHeader);
    payload = decodeJson(encodedPayload);
  } catch {
    throw new Error("Invalid Google credential.");
  }

  if (!header || typeof header !== "object" || !payload || typeof payload !== "object") {
    throw new Error("Invalid Google credential.");
  }
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Google credential.");

  const certificatesResponse = await fetch(GOOGLE_CERTIFICATES_URL);
  if (!certificatesResponse.ok) throw new Error("Google credential verification is unavailable.");
  const keys = await certificatesResponse.json();
  const keyData = keys.keys?.find((key) => key.kid === header.kid);
  if (!keyData) throw new Error("Google credential signing key is unavailable.");

  const key = await crypto.subtle.importKey(
    "jwk",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  let signature;
  try {
    signature = decodeBase64Url(encodedSignature);
  } catch {
    throw new Error("Invalid Google credential.");
  }
  const signingInput = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const validSignature = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signingInput);
  const now = Math.floor(Date.now() / 1000);

  if (!validSignature || !GOOGLE_ISSUERS.has(payload.iss) || payload.aud !== clientId || typeof payload.sub !== "string" || typeof payload.email !== "string" || payload.email_verified !== true || !Number.isFinite(payload.exp) || payload.exp <= now) {
    throw new Error("Google credential could not be verified.");
  }

  return {
    subject: payload.sub,
    email: payload.email,
    displayName: payload.name || payload.email,
    pictureUrl: typeof payload.picture === "string" ? payload.picture : null
  };
}
