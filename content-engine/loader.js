(function initializeContentLoader() {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  function isValidDate(value) {
    if (!datePattern.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toISOString().slice(0, 10) === value;
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

    const requestedDate = new URLSearchParams(window.location.search).get("date");
    if (requestedDate && !isValidDate(requestedDate)) {
      throw new Error("The edition date must use the YYYY-MM-DD format.");
    }

    const editionKey = requestedDate || "latest";
    const apiBaseUrl = (window.location.hostname === runtime.sites.production
      ? runtime.contentApiUrls.production
      : runtime.contentApiUrls.beta).replace(/\/$/, "");
    const content = await fetchJson(`${apiBaseUrl}/api/editions/${editionKey}`);
    if (!content.briefing || !Array.isArray(content.stories) || content.stories.length < 4 || content.stories.length > 5) {
      throw new Error("The content API returned an invalid edition.");
    }

    for (const story of content.stories) {
      const summaries = story?.summaries;
      if (!summaries || !Object.values(summaries).some((value) => typeof value === "string" && value.trim())) {
        throw new Error("The content API returned a story without a summary.");
      }
    }

    return Object.freeze(content);
  }

  window.ProductContentReady = loadEdition();
}());
