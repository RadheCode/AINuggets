const colorModeToggle = document.querySelector("#colorModeToggle");
const googleSignInButton = document.querySelector("#googleSignInButton");
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
const storageNamespace = productConfig?.identity?.storageNamespace;
if (typeof storageNamespace !== "string" || !storageNamespace.trim()) {
  throw new Error("Product storage namespace is missing or invalid.");
}
const sessionTokenKey = `${storageNamespace}-session-token`;
let googleIdentityInitialized = false;
let authState = "initializing";
let currentUser = null;

function displayName(user) {
  return user.name || user.email;
}

function avatarInitial(user) {
  return displayName(user).trim().charAt(0).toUpperCase();
}

function closeAccountMenu() {
  accountMenu.hidden = true;
  accountMenuToggle.setAttribute("aria-expanded", "false");
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

  googleSignInButton.hidden = Boolean(signedIn);
  googleSignInButton.disabled = state === "initializing" || signingIn || state === "unavailable";
  googleSignInButton.classList.toggle("is-loading", signingIn);
  googleSignInButton.querySelector("span:last-child").textContent = signingIn ? "Signing you in..." : "Continue with Google";
  accountMenuToggle.hidden = !signedIn;
  accountMenuToggle.disabled = signingOut;
  signOutButton.disabled = signingOut;
  streakPill.hidden = !signedIn;
  closeAccountMenu();
  currentUser = signedIn && user ? user : null;
  updateFeedbackEmail();

  if (signedIn && user) {
    const name = displayName(user);
    const initial = avatarInitial(user);
    accountName.textContent = name;
    accountMenuName.textContent = name;
    accountEmail.textContent = user.email;
    const streak = Number.isInteger(user.currentStreak) && user.currentStreak > 0 ? user.currentStreak : 0;
    const streakLabel = `day streak${streak === 1 ? "" : "s"}`;
    streakPillCount.textContent = String(streak);
    streakPillLabel.textContent = streakLabel;
    streakPill.setAttribute("aria-label", `${streak} ${streakLabel}`);
    accountAvatar.textContent = initial;
    accountMenuAvatar.textContent = initial;
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

function promptGoogleSignIn() {
  if (!googleIdentityInitialized || authState !== "signed-out") return;
  signInStatus.textContent = "Choose a Google account to continue.";
  window.google.accounts.id.prompt();
}

function finishGoogleInitialization() {
  googleIdentityInitialized = true;
  if (authState === "initializing") renderAuthWidget("signed-out");
}

function initializeGoogleSignIn() {
  if (!authConfig || typeof authConfig.googleClientId !== "string" || !authConfig.googleClientId.trim()) {
    googleSignInButton.title = "Google sign-in requires a configured Google client ID.";
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
    googleSignInButton.title = "Google sign-in is currently unavailable.";
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

googleSignInButton.addEventListener("click", promptGoogleSignIn);

accountMenuToggle.addEventListener("click", () => {
  if (authState !== "signed-in") return;
  const opening = accountMenu.hidden;
  accountMenu.hidden = !opening;
  accountMenuToggle.setAttribute("aria-expanded", String(opening));
  if (opening) signOutButton.focus();
});

document.addEventListener("click", (event) => {
  if (!accountMenu.hidden && !event.target.closest(".sign-in-control")) closeAccountMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !accountMenu.hidden) {
    closeAccountMenu();
    accountMenuToggle.focus();
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
    await window.ProductContentReady.catch(() => undefined);
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
  } catch (error) {
    feedbackMessageStatus.textContent = error.message;
  } finally {
    feedbackSubmit.disabled = false;
    feedbackSubmit.textContent = "Send feedback";
  }
});
