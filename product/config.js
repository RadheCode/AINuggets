globalThis.ProductConfig = Object.freeze({
  identity: Object.freeze({
    name: "AI Nuggets",
    mark: "AI",
    storageNamespace: "ai-nuggets"
  }),
  copy: Object.freeze({
    documentTitle: "AI Nuggets - AI news, less noise",
    metaDescription: "AI Nuggets distills the five AI updates worth knowing into a quick daily briefing.",
    homeLabel: "AI Nuggets home",
    brandTagline: "Five things worth knowing",
    eyebrow: "AI news daily briefing",
    headline: Object.freeze({ lead: "AI news. ", emphasis: "Less noise." }),
    briefingDescription: "Five useful updates, selected to help you keep up without the endless feed.",
    storyCountLabel: "Five stories",
    updateCadenceLabel: "Updated daily",
    storyGridLabel: "Today's AI stories",
    footer: "One useful briefing, every day",
    about: Object.freeze({
      label: "About",
      eyebrow: "The daily AI briefing",
      title: Object.freeze({ emphasis: "Stay current.", lead: " Without the catch-up." }),
      description: "AI Nuggets is for busy professionals, students, and curious minds who want to keep up with AI without spending hours in an endless feed.",
      promise: "Each daily edition has just five essential updates: clear, concise summaries of what matters and why it matters. No crowded feed. No extra pages. Just enough to read in under two minutes and move forward informed."
    })
  }),
  runtime: Object.freeze({
    sites: Object.freeze({
      production: "ai-nuggets.pages.dev"
    }),
    contentApiUrls: Object.freeze({
      production: "https://ai-nuggets-content.ainuggets123.workers.dev",
      beta: "https://beta-ai-nuggets-content.ainuggets123.workers.dev"
    })
  }),
  authentication: Object.freeze({
    googleClientId: "119476209987-a7plo7e675cl200cjnk78msq7ol06umr.apps.googleusercontent.com"
  }),
  summaryFeatures: Object.freeze({
    // UI and generated variants are independently configurable product capabilities.
    ui: Object.freeze(["standard", "detailed"]),
    generation: Object.freeze(["compact", "standard", "detailed"]),
    defaultContext: "standard",
    contexts: Object.freeze({
      compact: Object.freeze({ label: "Quick take", minCharacters: 100, maxCharacters: 180, format: "paragraph" }),
      standard: Object.freeze({ label: "Overview", minCharacters: 240, maxCharacters: 420, format: "bullets" }),
      detailed: Object.freeze({ label: "Deep dive", minCharacters: 500, maxCharacters: 900, format: "paragraphs" })
    })
  })
});
