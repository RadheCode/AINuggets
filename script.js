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
const sessionCacheKey = `${storageNamespace}-session-cache`;
const sessionCacheTtlMs = 5 * 60 * 1000;
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

// Referral Tracking Functions
function getReferralSource() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref') || urlParams.get('source') || urlParams.get('utm_source');
  } catch {
    return null;
  }
}

function storeReferralSource(source) {
  if (!source) return;
  try {
    localStorage.setItem(`${storageNamespace}-referral-source`, source);
  } catch {
    // Storage failure is non-critical
  }
}

function getStoredReferralSource() {
  try {
    return localStorage.getItem(`${storageNamespace}-referral-source`);
  } catch {
    return null;
  }
}

function trackReferralVisit() {
  const referralSource = getReferralSource();
  if (referralSource) {
    storeReferralSource(referralSource);
    // Track referral visit to analytics
    fetch(authApiUrl("/api/analytics/referral-visit"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventId: createOpaqueId(),
        visitorId: visitorId(),
        referralSource: referralSource
      }),
      keepalive: true
    }).catch(() => undefined);
  }
}

// Affiliate Tracking Functions
function trackAffiliateClick(destinationUrl, affiliateId) {
  if (!ProductConfig.monetization?.affiliate?.enabled) return;
   
  try {
    // Track affiliate click to analytics
    fetch(authApiUrl("/api/analytics/affiliate-click"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventId: createOpaqueId(),
        visitorId: visitorId(),
        destinationUrl: destinationUrl,
        affiliateId: affiliateId || "unknown"
      }),
      keepalive: true
    }).catch(() => undefined);
  } catch {
    // Tracking failure is non-critical
  }
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
  streakGuidance.innerHTML = streakGuidanceText();

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

const visitCacheKey = `${storageNamespace}-last-visit-at`;
const visitDedupeTtlMs = 30 * 1000;

function recordVisit() {
  // Skip duplicate visit events when the reader toggles between pages (Today/About)
  // within the dedupe window; one visit per session window is enough for analytics.
  try {
    const lastVisitAt = Number(sessionStorage.getItem(visitCacheKey));
    if (Number.isFinite(lastVisitAt) && Date.now() - lastVisitAt < visitDedupeTtlMs) return;
    sessionStorage.setItem(visitCacheKey, String(Date.now()));
  } catch {
    // Deduping is best-effort; a storage failure must not block the visit event.
  }
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
  sessionStorage.removeItem(sessionCacheKey);
  window.google?.accounts.id.disableAutoSelect();
  renderAuthWidget("signed-out");
});

function readCachedSession() {
  try {
    const raw = sessionStorage.getItem(sessionCacheKey);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || !cached.user || !Number.isFinite(cached.at)) return null;
    if (Date.now() - cached.at > sessionCacheTtlMs) return null;
    if (cached.token !== localStorage.getItem(sessionTokenKey)) return null;
    return cached.user;
  } catch {
    return null;
  }
}

function writeCachedSession(user) {
  try {
    sessionStorage.setItem(sessionCacheKey, JSON.stringify({
      token: localStorage.getItem(sessionTokenKey),
      user,
      at: Date.now()
    }));
  } catch {
    // Caching is best-effort; a full storage failure must not block sign-in.
  }
}

async function restoreSession() {
  if (!localStorage.getItem(sessionTokenKey)) {
    if (googleIdentityInitialized) renderAuthWidget("signed-out");
    return;
  }
  const cachedUser = readCachedSession();
  if (cachedUser) {
    renderAuthWidget("signed-in", cachedUser, `Signed in as ${displayName(cachedUser)}.`);
    return;
  }
  try {
    if (window.ProductContentReady) await window.ProductContentReady.catch(() => undefined);
    const data = await responseData(await authRequest("/auth/session"));
    writeCachedSession(data.user);
    renderAuthWidget("signed-in", data.user, `Signed in as ${displayName(data.user)}.`);
  } catch {
    localStorage.removeItem(sessionTokenKey);
    sessionStorage.removeItem(sessionCacheKey);
    if (googleIdentityInitialized) renderAuthWidget("signed-out");
  }
}

renderAuthWidget("initializing");
initializeGoogleSignIn();
restoreSession();
recordVisit();
trackReferralVisit();
trackReferralVisit();

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

  // --- Support (donation) dialog ---
  const supportTab = document.querySelector("#supportTab");
  const supportDialog = document.querySelector("#supportDialog");
  const supportDialogClose = document.querySelector("#supportDialogClose");
  const supportBody = document.querySelector("#supportBody");
  const supportCopy = productConfig?.support?.copy ?? {};

  function supportActionButton({ className, href, label, emoji, svg }) {
    const button = document.createElement("a");
    button.className = className;
    button.href = href;
    button.target = "_blank";
    button.rel = "noopener noreferrer";
    const icon = document.createElement("span");
    icon.className = "support-action-icon";
    icon.setAttribute("aria-hidden", "true");
      if (svg) {
        icon.innerHTML = svg;
      } else {
        icon.textContent = emoji;
      }
      const text = document.createElement("span");
      text.textContent = label;
      button.append(icon, text);
      return button;
    }

  function renderSupportComingSoon() {
      if (!supportBody) return;
      supportBody.replaceChildren();
      const message = document.createElement("p");
      message.className = "support-coming-soon";
      message.textContent = supportCopy.comingSoon ?? "Support coming soon.";
      supportBody.append(message);
    }

      function renderSupportBody() {
      if (!supportBody) return;
          const config = productConfig?.support;
          const providers = (config?.providers ?? []).filter((p) => typeof p?.href === "string" && p.href);

          if (!providers.length) {
            renderSupportComingSoon();
            return;
          }

          supportBody.replaceChildren();

          const layout = document.createElement("div");
          layout.className = "support-layout";

          const picker = document.createElement("div");
          picker.className = "support-picker";
          picker.setAttribute("role", "tablist");
          picker.setAttribute("aria-label", supportCopy.providerPrompt ?? "Choose a payment method");

          const detail = document.createElement("div");
          detail.className = "support-detail";
          detail.id = "supportDetailPane";
          detail.setAttribute("role", "tabpanel");
          detail.setAttribute("aria-live", "polite");

          let activeId = config?.defaultProvider;
          if (!providers.some((p) => p.id === activeId)) activeId = providers[0].id;

          function renderDetail(provider) {
            detail.replaceChildren();

            const head = document.createElement("div");
            head.className = "support-detail-head";
            const name = document.createElement("p");
            name.className = "support-detail-name";
            name.textContent = provider.name;
            head.append(name);
            const tagline = document.createElement("p");
            tagline.className = "support-detail-tagline";
            tagline.textContent = provider.tagline ?? "";
            head.append(tagline);
            detail.append(head);

            const text = document.createElement("p");
            text.className = "support-detail-text";
            text.textContent = provider.detail ?? "";
            detail.append(text);

            detail.append(supportActionButton({
              className: `support-cta support-cta--${provider.id}`,
              href: provider.href,
              label: provider.cta || `Donate via ${provider.name}`,
              emoji: (provider.icon || "\uD83D\uDCB3"),
              svg: provider.iconSvg
            }));

            const openHint = document.createElement("p");
            openHint.className = "support-open-hint";
            openHint.textContent = supportCopy.opensInNewTab ?? "Opens in a new tab";
            detail.append(openHint);
          }

          for (const provider of providers) {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "support-provider";
            option.setAttribute("role", "tab");
            option.setAttribute("aria-controls", "supportDetailPane");

            const icon = document.createElement("span");
            icon.className = "support-provider-icon";
            icon.setAttribute("aria-hidden", "true");
            if (provider.iconSvg) {
              icon.innerHTML = provider.iconSvg;
            } else {
              icon.textContent = provider.icon || provider.name.slice(0, 1);
            }
            const label = document.createElement("span");
            label.className = "support-provider-name";
            label.textContent = provider.name;
            option.append(icon, label);

            const setActive = (isActive) => {
              option.classList.toggle("is-selected", isActive);
              option.setAttribute("aria-selected", String(isActive));
              option.tabIndex = isActive ? 0 : -1;
            };

            setActive(provider.id === activeId);
            option.addEventListener("click", () => {
              activeId = provider.id;
              for (const other of picker.querySelectorAll(".support-provider")) {
                other.classList.remove("is-selected");
                other.setAttribute("aria-selected", "false");
                other.tabIndex = -1;
              }
              option.classList.add("is-selected");
              option.setAttribute("aria-selected", "true");
              option.tabIndex = 0;
              renderDetail(provider);
            });

            picker.append(option);
          }

          layout.append(picker, detail);
          supportBody.append(layout);
          renderDetail(providers.find((p) => p.id === activeId) ?? providers[0]);
        }

  function openSupportDialog() {
    if (!supportDialog) return;
    renderSupportBody();
    supportTab?.setAttribute("aria-expanded", "true");
    supportDialog.showModal();
  }

  function closeSupportDialog() {
    if (!supportDialog) return;
    supportDialog.close();
  }

  if (supportTab && supportDialog) {
    supportTab.addEventListener("click", openSupportDialog);
    supportDialogClose?.addEventListener("click", closeSupportDialog);
    supportDialog.addEventListener("click", (event) => {
      if (event.target === supportDialog) closeSupportDialog();
    });
    supportDialog.addEventListener("close", () => {
      supportTab.setAttribute("aria-expanded", "false");
      supportTab.focus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && supportDialog.open) closeSupportDialog();
    });
  }
