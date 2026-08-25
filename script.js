const subscribeButton = document.querySelector("#subscribeButton");
const subscribeDialog = document.querySelector("#subscribeDialog");
const dialogClose = document.querySelector("#dialogClose");
const subscribeForm = document.querySelector("#subscribeForm");
const formMessage = document.querySelector("#formMessage");
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
const authConfig = window.AINuggetsAuthConfig;
const contentConfig = window.AINuggetsContentConfig;
const sessionTokenKey = "ai-nuggets-session-token";
let googleIdentityInitialized = false;
let authState = "initializing";

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
  if (!contentConfig?.apiBaseUrl) throw new Error("Authentication is currently unavailable.");
  return `${contentConfig.apiBaseUrl.replace(/\/$/, "")}${path}`;
}

async function authRequest(path, options = {}) {
  const token = localStorage.getItem(sessionTokenKey);
  const headers = new Headers(options.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(authApiUrl(path), { ...options, headers });
}

async function responseData(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Authentication request failed.");
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
  localStorage.setItem("ai-nuggets-color-mode", nextMode);
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
    await window.AINuggetsContentReady.catch(() => undefined);
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

subscribeButton.addEventListener("click", () => {
  subscribeDialog.showModal();
});

dialogClose.addEventListener("click", () => {
  subscribeDialog.close();
});

subscribeDialog.addEventListener("click", (event) => {
  if (event.target === subscribeDialog) {
    subscribeDialog.close();
  }
});

subscribeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(subscribeForm);
  const email = data.get("email");
  formMessage.textContent = `Thanks - ${email} is on the early-access list.`;
  subscribeForm.reset();
});
