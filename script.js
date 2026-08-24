const subscribeButton = document.querySelector("#subscribeButton");
const subscribeDialog = document.querySelector("#subscribeDialog");
const dialogClose = document.querySelector("#dialogClose");
const subscribeForm = document.querySelector("#subscribeForm");
const formMessage = document.querySelector("#formMessage");
const colorModeToggle = document.querySelector("#colorModeToggle");
const googleSignInButton = document.querySelector("#googleSignInButton");
const signOutButton = document.querySelector("#signOutButton");
const signInStatus = document.querySelector("#signInStatus");
const authConfig = window.AINuggetsAuthConfig;
const contentConfig = window.AINuggetsContentConfig;
const sessionTokenKey = "ai-nuggets-session-token";
let googleIdentityInitialized = false;

function authApiUrl(path) {
  if (!contentConfig?.apiBaseUrl) throw new Error("Authentication is currently unavailable.");
  return `${contentConfig.apiBaseUrl.replace(/\/$/, "")}${path}`;
}

function setSignedInUser(user) {
  googleSignInButton.hidden = Boolean(user);
  signOutButton.hidden = !user;
  signInStatus.textContent = user ? `Signed in as ${user.name || user.email}.` : "";
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
    signInStatus.textContent = "Google sign-in could not be completed. Please try again.";
    return;
  }

  googleSignInButton.disabled = true;
  signInStatus.textContent = "Signing you in...";
  try {
    const data = await responseData(await authRequest("/auth/google", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ credential: response.credential })
    }));
    localStorage.setItem(sessionTokenKey, data.sessionToken);
    setSignedInUser(data.user);
  } catch (error) {
    signInStatus.textContent = error.message;
    googleSignInButton.disabled = false;
  }
}

function promptGoogleSignIn() {
  if (!googleIdentityInitialized) return;
  signInStatus.textContent = "Choose a Google account to continue.";
  window.google.accounts.id.prompt();
}

function initializeGoogleSignIn() {
  if (!authConfig || typeof authConfig.googleClientId !== "string" || !authConfig.googleClientId.trim()) {
    googleSignInButton.title = "Google sign-in requires a configured Google client ID.";
    signInStatus.textContent = "Google sign-in requires configuration.";
    return;
  }

  if (window.google?.accounts?.id) {
    if (!googleIdentityInitialized) {
      window.google.accounts.id.initialize({
        client_id: authConfig.googleClientId,
        callback: handleGoogleCredential
      });
      googleIdentityInitialized = true;
    }
    googleSignInButton.disabled = false;
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
    googleIdentityInitialized = true;
    googleSignInButton.disabled = false;
  };
  googleScript.onerror = () => {
    googleSignInButton.title = "Google sign-in is currently unavailable.";
    signInStatus.textContent = "Google sign-in is currently unavailable.";
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

signOutButton.addEventListener("click", async () => {
  signOutButton.disabled = true;
  try {
    await authRequest("/auth/sign-out", { method: "POST" });
  } catch {
    // A locally removed bearer token must remain unusable even if its revocation request fails.
  }
  localStorage.removeItem(sessionTokenKey);
  window.google?.accounts.id.disableAutoSelect();
  setSignedInUser(null);
  signOutButton.disabled = false;
  googleSignInButton.disabled = !googleIdentityInitialized;
});

async function restoreSession() {
  if (!localStorage.getItem(sessionTokenKey)) return;
  try {
    const data = await responseData(await authRequest("/auth/session"));
    setSignedInUser(data.user);
  } catch {
    localStorage.removeItem(sessionTokenKey);
  }
}

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
