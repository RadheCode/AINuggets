const colorModeToggle = document.querySelector("#colorModeToggle");
const googleSignInButton = document.querySelector("#googleSignInButton");
const googleSignInTarget = document.querySelector("#googleSignInTarget");
const loginMenuToggle = document.querySelector("#loginMenuToggle");
const loginMenu = document.querySelector("#loginMenu");
const accountMenuToggle = document.querySelector("#accountMenuToggle");
const accountMenu = document.querySelector("#accountMenu");
const accountAvatar = document.querySelector("#accountAvatar");
const accountMenuAvatar = document.querySelector("#accountMenuAvatar");
const accountName = document.querySelector("#accountName");
const accountMenuName = document.querySelector("#accountMenuName");
const accountEmail = document.querySelector("#accountEmail");
const streakPill = document.querySelector("#streakPill");
const streakPillCount = document.querySelector("#streakPillCount");
const streakPillLabel = document.querySelector("#streakPillLabel");
const streakGuidance = document.querySelector("[data-product-streak-guidance]");
const signOutButton = document.querySelector("#signOutButton");
const signInStatus = document.querySelector("#signInStatus");
const feedbackTab = document.querySelector("#feedbackTab");
const feedbackDialog = document.querySelector("#feedbackDialog");
const feedbackDialogClose = document.querySelector("#feedbackDialogClose");
const feedbackForm = document.querySelector("#feedbackForm");
const feedbackEmail = document.querySelector("#feedbackEmail");
const feedbackEmailLock = document.querySelector("#feedbackEmailLock");
const feedbackRating = document.querySelector("#feedbackRating");
const feedbackRatingDisplay = document.querySelector("#feedbackRatingDisplay");
const feedbackSubmit = document.querySelector("#feedbackSubmit");
const feedbackMessageStatus = document.querySelector("#feedbackMessageStatus");
const productConfig = window.ProductConfig;
const authConfig = productConfig?.authentication;
const contentRuntime = productConfig?.runtime;
const maximumDaysBetweenQualifyingActivities = productConfig?.readerEngagement?.streak?.maximumDaysBetweenQualifyingActivities;
const storageNamespace = productConfig?.identity?.storageNamespace;
if (typeof storageNamespace !== "string" || !storageNamespace.trim()) {
  throw new Error("Product storage namespace is missing or invalid.");
}
if (!Number.isInteger(maximumDaysBetweenQualifyingActivities) || maximumDaysBetweenQualifyingActivities < 1 || maximumDaysBetweenQualifyingActivities > 365) {
  throw new Error("Product streak configuration is missing or invalid.");
}
const sessionTokenKey = `${storageNamespace}-session-token`;
let googleIdentityInitialized = false;
let authState = "initializing";
let currentUser = null;
let loginMenuTrigger = null;

function createOpaqueId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function visitorId() {
  const key = `${storageNamespace}-visitor-id`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const value = createOpaqueId();
  localStorage.setItem(key, value);
  return value;
}

function displayName(user) {
  return user.name || user.email;
}

function avatarInitial(user) {
  return displayName(user).trim().charAt(0).toUpperCase();
}

function streakGuidanceText() {
  const lenienceDays = maximumDaysBetweenQualifyingActivities - 1;
  const dayLabel = lenienceDays === 1 ? "day" : "days";
  const template = productConfig.copy.streakGuidanceTemplate;
  if (typeof template !== "string" || !template.includes("{days}")) {
    throw new Error("Product streak guidance copy is missing or invalid.");
  }
  return template.replace("{days}", `${lenienceDays} ${dayLabel}`);
}

function closeAccountMenu() {
  accountMenu.hidden = true;
  accountMenuToggle.setAttribute("aria-expanded", "false");
}

function closeLoginMenu() {
  loginMenu.hidden = true;
  loginMenuToggle.setAttribute("aria-expanded", "false");
  loginMenuToggle.classList.remove("is-open");
  streakPill.setAttribute("aria-expanded", "false");
}

function toggleLoginMenu(trigger = loginMenuToggle) {
  if (authState === "unavailable") return;
  const opening = loginMenu.hidden;
  loginMenu.hidden = !opening;
  loginMenuToggle.setAttribute("aria-expanded", String(opening));
  loginMenuToggle.classList.toggle("is-open", opening);
  streakPill.setAttribute("aria-expanded", String(opening && trigger === streakPill));
  if (opening) {
    loginMenuTrigger = trigger;
    googleSignInTarget.querySelector('[role="button"]')?.focus();
  }
}

function updateFeedbackEmail() {
  if (!feedbackEmail) return;
  const signedIn = Boolean(currentUser?.email);
  feedbackEmail.value = signedIn ? currentUser.email : "";
  feedbackEmail.readOnly = signedIn;
  feedbackEmail.classList.toggle("is-locked", signedIn);
  feedbackEmailLock.hidden = !signedIn;
}

function ratingLabel(ratingHalves) {
  const rating = ratingHalves / 2;
  return `${rating % 1 === 0 ? rating.toFixed(0) : rating.toFixed(1)} out of 5 stars`;
}

function updateFeedbackRating() {
  const selected = feedbackRating.querySelector("input:checked");
  const ratingHalves = selected ? Number(selected.value) : 0;
  const ratingChoices = feedbackRating.querySelector(".feedback-rating__choices");

  feedbackRating.querySelectorAll(".feedback-rating__star").forEach((star, index) => {
    const fill = Math.max(0, Math.min(2, ratingHalves - index * 2));
    ratingChoices.style.setProperty(`--star-${index + 1}-fill`, `${fill * 50}%`);
  });

  feedbackRatingDisplay.textContent = selected ? ratingLabel(ratingHalves) : "Choose a rating";
}

function renderAuthWidget(state, user = null, message = "") {
  authState = state;
  const signedIn = state === "signed-in" || state === "signing-out";
  const signingIn = state === "signing-in";
  const signingOut = state === "signing-out";

  const signInAvailable = !signedIn && state !== "unavailable";
  loginMenuToggle.hidden = !signInAvailable;
  googleSignInButton.hidden = !signInAvailable;
  googleSignInTarget.hidden = !signInAvailable;
  googleSignInButton.classList.toggle("is-unavailable", state === "unavailable");
  accountMenuToggle.hidden = !signedIn;
  accountMenuToggle.disabled = signingOut;
  signOutButton.disabled = signingOut;
  streakPill.disabled = signedIn || state === "unavailable";
  streakPill.classList.toggle("streak-pill--guest", !signedIn);
  closeAccountMenu();
  closeLoginMenu();
  currentUser = signedIn && user ? user : null;
  updateFeedbackEmail();
  streakGuidance.textContent = streakGuidanceText();

  if (signedIn && user) {
    const name = displayName(user);
    const initial = avatarInitial(user);
    accountName.textContent = name;
    accountMenuName.textContent = name;
    accountEmail.textContent = user.email;
    const streak = Number.isInteger(user.currentStreak) && user.currentStreak > 0 ? user.currentStreak : 0;
    const streakLabel = "-day streak";
    streakPillCount.textContent = String(streak);
    streakPillLabel.textContent = streakLabel;
    streakPill.setAttribute("aria-label", `${streak}-day streak`);
    accountAvatar.textContent = initial;
    accountMenuAvatar.textContent = initial;
  } else {
    streakPillCount.textContent = "0";
    streakPillLabel.textContent = productConfig.copy.guestStreakLabel;
    streakPill.setAttribute("aria-label", state === "unavailable"
      ? "Streak sign-in is currently unavailable."
      : "Start your streak. Sign in to save it.");
  }

  signInStatus.textContent = message;
}

function authApiUrl(path) {
  if (!contentRuntime?.contentApiUrls || !contentRuntime?.sites?.production) throw new Error("Authentication is currently unavailable.");
  const apiBaseUrl = window.location.hostname === contentRuntime.sites.production
    ? contentRuntime.contentApiUrls.production
    : contentRuntime.contentApiUrls.beta;
  return `${apiBaseUrl.replace(/\/$/, "")}${path}`;
}

function recordVisit() {
  fetch(authApiUrl("/api/analytics/visits"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventId: createOpaqueId(), visitorId: visitorId() }),
    keepalive: true
  }).catch(() => undefined);
}

async function authRequest(path, options = {}) {
  const token = localStorage.getItem(sessionTokenKey);
  const headers = new Headers(options.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(authApiUrl(path), { ...options, headers });
}

async function responseData(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function handleGoogleCredential(response) {
  if (!response.credential) {
    renderAuthWidget("signed-out", null, "Google sign-in could not be completed. Please try again.");
    return;
  }

  renderAuthWidget("signing-in", null, "Signing you in...");
  try {
    const data = await responseData(await authRequest("/auth/google", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ credential: response.credential })
    }));
    localStorage.setItem(sessionTokenKey, data.sessionToken);
    renderAuthWidget("signed-in", data.user, `Signed in as ${displayName(data.user)}.`);
  } catch (error) {
    renderAuthWidget("signed-out", null, error.message);
  }
}

function finishGoogleInitialization() {
  googleIdentityInitialized = true;
  window.google.accounts.id.renderButton(googleSignInTarget, {
    theme: "outline",
    size: "medium",
    shape: "pill",
    text: "continue_with",
    width: Math.max(200, Math.round(googleSignInButton.getBoundingClientRect().width))
  });
  if (authState === "initializing") renderAuthWidget("signed-out");
}

function initializeGoogleSignIn() {
  if (!authConfig || typeof authConfig.googleClientId !== "string" || !authConfig.googleClientId.trim()) {
    renderAuthWidget("unavailable", null, "Google sign-in requires configuration.");
    return;
  }

  if (window.google?.accounts?.id) {
    if (!googleIdentityInitialized) {
      window.google.accounts.id.initialize({
        client_id: authConfig.googleClientId,
        callback: handleGoogleCredential
      });
      finishGoogleInitialization();
    }
    if (authState === "initializing") renderAuthWidget("signed-out");
    return;
  }

  const googleScript = document.createElement("script");
  googleScript.src = "https://accounts.google.com/gsi/client";
  googleScript.async = true;
  googleScript.onload = () => {
    google.accounts.id.initialize({
      client_id: authConfig.googleClientId,
      callback: handleGoogleCredential
    });
    finishGoogleInitialization();
  };
  googleScript.onerror = () => {
    renderAuthWidget("unavailable", null, "Google sign-in is currently unavailable.");
  };
  document.head.appendChild(googleScript);
}

function updateColorModeToggle() {
  const isDark = document.documentElement.dataset.colorMode === "dark";
  colorModeToggle.setAttribute("aria-pressed", String(isDark));
  colorModeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
}

colorModeToggle.addEventListener("click", () => {
  const nextMode = document.documentElement.dataset.colorMode === "dark" ? "light" : "dark";
  document.documentElement.dataset.colorMode = nextMode;
  localStorage.setItem(`${storageNamespace}-color-mode`, nextMode);
  updateColorModeToggle();
});

updateColorModeToggle();

accountMenuToggle.addEventListener("click", () => {
  if (authState !== "signed-in") return;
  const opening = accountMenu.hidden;
  accountMenu.hidden = !opening;
  accountMenuToggle.setAttribute("aria-expanded", String(opening));
  if (opening) signOutButton.focus();
});

loginMenuToggle.addEventListener("click", () => {
  toggleLoginMenu(loginMenuToggle);
});

streakPill.addEventListener("click", () => {
  if (authState === "signed-in" || authState === "signing-out") return;
  toggleLoginMenu(streakPill);
});

document.addEventListener("click", (event) => {
  if (!accountMenu.hidden && !event.target.closest(".sign-in-control")) closeAccountMenu();
  if (!loginMenu.hidden && !event.target.closest(".sign-in-control, #streakPill")) closeLoginMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !accountMenu.hidden) {
    closeAccountMenu();
    accountMenuToggle.focus();
  }
  if (event.key === "Escape" && !loginMenu.hidden) {
    closeLoginMenu();
    loginMenuTrigger?.focus();
    loginMenuTrigger = null;
  }
});

signOutButton.addEventListener("click", async () => {
  const user = {
    name: accountMenuName.textContent,
    email: accountEmail.textContent
  };
  renderAuthWidget("signing-out", user, "Signing you out...");
  try {
    await authRequest("/auth/sign-out", { method: "POST" });
  } catch {
    // A locally removed bearer token must remain unusable even if its revocation request fails.
  }
  localStorage.removeItem(sessionTokenKey);
  window.google?.accounts.id.disableAutoSelect();
  renderAuthWidget("signed-out");
});

async function restoreSession() {
  if (!localStorage.getItem(sessionTokenKey)) {
    if (googleIdentityInitialized) renderAuthWidget("signed-out");
    return;
  }
  try {
    if (window.ProductContentReady) await window.ProductContentReady.catch(() => undefined);
    const data = await responseData(await authRequest("/auth/session"));
    renderAuthWidget("signed-in", data.user, `Signed in as ${displayName(data.user)}.`);
  } catch {
    localStorage.removeItem(sessionTokenKey);
    if (googleIdentityInitialized) renderAuthWidget("signed-out");
  }
}

renderAuthWidget("initializing");
initializeGoogleSignIn();
restoreSession();
recordVisit();

feedbackTab.addEventListener("click", () => {
  feedbackMessageStatus.textContent = "";
  feedbackForm.reset();
  updateFeedbackEmail();
  updateFeedbackRating();
  feedbackDialog.showModal();
  feedbackEmail.focus();
});

feedbackDialogClose.addEventListener("click", () => {
  feedbackDialog.close();
});

feedbackDialog.addEventListener("click", (event) => {
  if (event.target === feedbackDialog) feedbackDialog.close();
});

feedbackDialog.addEventListener("close", () => {
  feedbackTab.focus();
});

feedbackRating.addEventListener("change", updateFeedbackRating);

feedbackForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  feedbackMessageStatus.textContent = "";
  if (!feedbackForm.reportValidity()) return;

  feedbackSubmit.disabled = true;
  feedbackSubmit.textContent = "Sending...";
  try {
    const data = new FormData(feedbackForm);
    const response = await authRequest("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: data.get("email"),
        ratingHalves: Number(data.get("ratingHalves")),
        message: data.get("message")
      })
    });
    const result = await responseData(response);
    feedbackMessageStatus.textContent = result.message;
    feedbackForm.reset();
    updateFeedbackEmail();
    updateFeedbackRating();
    feedbackDialog.close();
  } catch (error) {
    feedbackMessageStatus.textContent = error.message;
  } finally {
    feedbackSubmit.disabled = false;
    feedbackSubmit.textContent = "Send feedback";
  }
});
