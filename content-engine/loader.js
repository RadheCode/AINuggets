(function initializeContentLoader() {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isValidDate(value) {
    if (!datePattern.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toISOString().slice(0, 10) === value;
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
    return response.json();
  }

  async function loadEdition() {
    const requestedDate = new URLSearchParams(window.location.search).get("date") || getLocalDate();
    if (!isValidDate(requestedDate)) {
      throw new Error("The edition date must use the YYYY-MM-DD format.");
    }

    const manifest = await fetchJson("content-engine/content/index.json");
    if (!Array.isArray(manifest.editions)) throw new Error("The content manifest is invalid.");

    const edition = manifest.editions
      .filter((item) => item.status === "published" && isValidDate(item.date) && item.date <= requestedDate)
      .sort((left, right) => right.date.localeCompare(left.date))[0];

    if (!edition) throw new Error(`No published edition is available on or before ${requestedDate}.`);

    const content = await fetchJson(edition.path);
    if (content.date !== edition.date || content.status !== "published") {
      throw new Error(`Edition ${edition.date} does not match its manifest entry.`);
    }
    if (!content.briefing || !Array.isArray(content.stories) || content.stories.length < 4 || content.stories.length > 5) {
      throw new Error(`Edition ${edition.date} must contain a briefing and four or five stories.`);
    }

    return Object.freeze(content);
  }

  window.AINuggetsContentReady = loadEdition();
}());
