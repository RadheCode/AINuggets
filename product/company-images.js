// Product company-image matching. Configuration (sourceArtwork + companies)
// lives in product/config.js under ProductConfig.companyImages; this file only
// owns the matching logic used by the shared story renderer.
(function initializeCompanyImages() {
  function hasTerm(text, term) {
    return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i").test(text);
  }

  function findCompanyImage(story) {
    const { sourceArtwork, companies } = window.ProductConfig?.companyImages || {};
    if (!sourceArtwork || !Array.isArray(companies)) return null;

    const sourceArtworkId = sourceArtwork[story.sourceName];
    if (sourceArtworkId) {
      const extension = ["business", "creative-ai", "developer-tools", "infrastructure", "models", "open-source", "research"].includes(sourceArtworkId) ? "svg" : "jpg";
      return { id: sourceArtworkId, image: `product/company-images/${sourceArtworkId}.${extension}` };
    }
    const text = [story.title, ...Object.values(story.summaries || {})]
      .filter((value) => typeof value === "string")
      .join(" ");
    const company = companies.find((candidate) => candidate.terms.some((term) => hasTerm(text, term)));
    return company ? { ...company, image: `product/company-images/${company.id}.jpg` } : null;
  }

  window.ProductCompanyImages = Object.freeze({ findCompanyImage });
}());