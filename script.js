const subscribeButton = document.querySelector("#subscribeButton");
const subscribeDialog = document.querySelector("#subscribeDialog");
const dialogClose = document.querySelector("#dialogClose");
const subscribeForm = document.querySelector("#subscribeForm");
const formMessage = document.querySelector("#formMessage");
const colorModeToggle = document.querySelector("#colorModeToggle");
const googleSignInButton = document.querySelector("#googleSignInButton");
const googleSignInFallback = document.querySelector("#googleSignInFallback");
const signOutButton = document.querySelector("#signOutButton");
const signInStatus = document.querySelector("#signInStatus");
const authConfig = window.AINuggetsAuthConfig;
let googleIdentityInitialized = false;

function decodeGoogleCredential(credential) {
  const payload = credential.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(base64).split("").map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
  } catch {
    return null;
  }
}

function setSignedInUser(user) {
  googleSignInButton.hidden = Boolean(user);
  googleSignInFallback.hidden = Boolean(user);
  signOutButton.hidden = !user;
  signInStatus.textContent = user ? `Signed in as ${user.name || user.email}.` : "";
}

function handleGoogleCredential(response) {
  const profile = decodeGoogleCredential(response.credential);
  if (!profile?.sub || !profile.email) {
    signInStatus.textContent = "Google sign-in could not be completed. Please try again.";
    return;
  }

  const user = { id: profile.sub, email: profile.email, name: profile.name || profile.email };
  sessionStorage.setItem("ai-nuggets-user", JSON.stringify(user));
  setSignedInUser(user);
}

function renderGoogleSignInButton() {
  googleSignInButton.replaceChildren();
  googleSignInButton.hidden = false;
  googleSignInFallback.hidden = true;
  google.accounts.id.renderButton(googleSignInButton, {
    theme: document.documentElement.dataset.colorMode === "dark" ? "filled_black" : "outline",
    size: "medium",
    text: "signin_with",
    shape: "rectangular"
  });
}

function initializeGoogleSignIn() {
  if (!authConfig || typeof authConfig.googleClientId !== "string" || !authConfig.googleClientId.trim()) {
    googleSignInButton.hidden = true;
    googleSignInFallback.hidden = false;
    googleSignInFallback.title = "Google sign-in requires a configured Google client ID.";
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
    renderGoogleSignInButton();
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
    renderGoogleSignInButton();
  };
  googleScript.onerror = () => {
    googleSignInButton.hidden = true;
    googleSignInFallback.hidden = false;
    googleSignInFallback.title = "Google sign-in is currently unavailable.";
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

signOutButton.addEventListener("click", () => {
  sessionStorage.removeItem("ai-nuggets-user");
  window.google?.accounts.id.disableAutoSelect();
  setSignedInUser(null);
  renderGoogleSignInButton();
});

try {
  setSignedInUser(JSON.parse(sessionStorage.getItem("ai-nuggets-user")));
} catch {
  sessionStorage.removeItem("ai-nuggets-user");
}

initializeGoogleSignIn();

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
