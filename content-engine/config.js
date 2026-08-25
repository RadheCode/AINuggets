const contentApiUrls = Object.freeze({
  production: "https://ai-nuggets-content.ainuggets123.workers.dev",
  beta: "https://beta-ai-nuggets-content.ainuggets123.workers.dev"
});

const isProductionSite = window.location.hostname === "ai-nuggets.pages.dev";

window.AINuggetsContentConfig = Object.freeze({
  apiBaseUrl: isProductionSite ? contentApiUrls.production : contentApiUrls.beta
});
