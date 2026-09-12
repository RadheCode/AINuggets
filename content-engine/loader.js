(function initializeContentLoader() {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const editionCacheTtlMs = 5 * 60 * 1000;

  function isValidDate(value) {
    if (!datePattern.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toISOString().slice(0, 10) === value;
  }

  function editionCacheKey(editionKey) {
    return `${window.ProductConfig?.identity?.storageNamespace}-edition:${editionKey}`;
  }

  function readCachedEdition(editionKey) {
    try {
      const raw = sessionStorage.getItem(editionCacheKey(editionKey));
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || !cached.data || !Number.isFinite(cached.at)) return null;
      if (Date.now() - cached.at > editionCacheTtlMs) return null;
      return cached.data;
    } catch {
      return null;
    }
  }

  function writeCachedEdition(editionKey, data) {
    try {
      sessionStorage.setItem(editionCacheKey(editionKey), JSON.stringify({ at: Date.now(), data }));
    } catch {
      // Caching is best-effort; a full storage failure must not block rendering.
    }
  }

  async function fetchJson(url) {
    const headers = new Headers({ accept: "application/json" });
    const sessionToken = localStorage.getItem(window.ProductConfig.identity.storageNamespace + "-session-token");
    if (sessionToken) headers.set("authorization", `Bearer ${sessionToken}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Could not load the requested edition (${response.status}).`);
    return response.json();
  }

  async function loadEdition() {
    const runtime = window.ProductConfig?.runtime;
    const summaryFeatures = window.ProductConfig?.summaryFeatures;
    if (!runtime?.contentApiUrls || !runtime?.sites?.production) throw new Error("The content API is not configured.");
    if (!summaryFeatures?.ui?.length || !summaryFeatures.contexts) throw new Error("Summary features are not configured.");

      const searchParams = new URLSearchParams(window.location.search);
      const requestedDate = searchParams.get("date");
      if (requestedDate && !isValidDate(requestedDate)) {
        throw new Error("The edition date must use the YYYY-MM-DD format.");
      }
      const requestedEdition = searchParams.get("edition");
      if (requestedEdition !== null && !/^[1-9]\d*$/.test(requestedEdition)) {
        throw new Error("The edition number must be a positive integer.");
      }

      // The browser API path mirrors the loader: "latest", or "date" optionally
      // followed by "?edition=N" to address a specific edition of a day.
      const editionKey = requestedDate || "latest";
      const apiEditionPath = requestedEdition && requestedEdition.trim() !== ""
        ? `${editionKey}?edition=${requestedEdition}`
        : editionKey;
      const cached = readCachedEdition(apiEditionPath);
      if (cached) return Object.freeze(cached);

      const apiBaseUrl = (window.location.hostname === runtime.sites.production
        ? runtime.contentApiUrls.production
        : runtime.contentApiUrls.beta).replace(/\/$/, "");
      const content = await fetchJson(`${apiBaseUrl}/api/editions/${apiEditionPath}`);
    if (!content.briefing || !Array.isArray(content.stories) || content.stories.length < 4 || content.stories.length > 5) {
      throw new Error("The content API returned an invalid edition.");
    }

    for (const story of content.stories) {
      const summaries = story?.summaries;
      if (!summaries || !Object.values(summaries).some((value) => typeof value === "string" && value.trim())) {
        throw new Error("The content API returned a story without a summary.");
      }
    }

    writeCachedEdition(apiEditionPath, content);
    return Object.freeze(content);
  }

  window.ProductContentReady = loadEdition();
}());
