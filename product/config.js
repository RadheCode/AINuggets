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
    loginLabel: "Login",
    loginMenuTitle: "Welcome back",
    loginMenuDescription: "Sign in to save your reading streak.",
    guestStreakLabel: "Start streak",
    streakGuidanceTemplate: "Your streak has room for life: you can take up to {days} between visits and <strong>yet</strong> keep it going.",
    continueWithGoogleLabel: "Continue with Google",
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
  readerEngagement: Object.freeze({
    streak: Object.freeze({
      // The maximum UTC calendar-day gap that continues an existing streak.
      maximumDaysBetweenQualifyingActivities: 4
    })
  }),
  summaryFeatures: Object.freeze({
    // UI and generated variants are independently configurable product capabilities.
    ui: Object.freeze(["standard", "detailed"]),
    generation: Object.freeze(["compact", "standard", "detailed"]),
    defaultContext: "standard",
    contexts: Object.freeze({
      // Minimums are enforced; maximums guide the model without truncating complete thoughts.
      compact: Object.freeze({ label: "Quick take", minCharacters: 100, maxCharacters: 180, format: "paragraph" }),
      standard: Object.freeze({ label: "Overview", minCharacters: 240, maxCharacters: 420, format: "bullets" }),
      detailed: Object.freeze({ label: "Deep dive", minCharacters: 500, maxCharacters: 900, format: "paragraphs" })
    })
  }),
  monetization: Object.freeze({
    // Sponsorship configuration
    sponsorships: Object.freeze({
      // Maximum sponsored stories per edition (0 = disabled, 1 = enabled with limit)
      maxStoriesPerEdition: 0,
      // Whether to show sponsor recognition in newsletter/email
      newsletterRecognitionEnabled: false,
      // Whether to show sponsor recognition on website
      websiteRecognitionEnabled: false
    }),
    // Affiliate program configuration
    affiliate: Object.freeze({
      // Whether affiliate links are enabled
      enabled: false,
      // Disclosure text for affiliate links
      disclosureText: "We may earn a commission if you purchase through this link, at no extra cost to you. We only recommend products we've tested and believe genuinely benefit our audience."
    }),
    // Premium features configuration
    premium: Object.freeze({
      // Whether premium tier is enabled
      enabled: false,
      // Monthly price in USD
      priceMonthly: 5,
      // Annual price in USD
      priceAnnual: 50
    })
    }),
    support: Object.freeze({
            // Hosted donation providers — rendered as a picker (left rail) + detail
                                    // pane. Works with any provider that offers a hosted URL: Ko-fi,
                                    // Razorpay Payment Links, PayPal.me, Cashfree/PayU links, etc.
                                    providers: Object.freeze([
                                      // Example entries (uncomment and fill your real URLs):
                                      Object.freeze({
                                        id: "kofi",
                                        name: "Ko-fi",
                                                                              iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.6 9.4h10v5a3.2 3.2 0 0 1-3.2 3.2H7.8A3.2 3.2 0 0 1 4.6 14.4z"/><path d="M14.6 10.2h1a2.3 2.3 0 0 1 0 4.6h-1"/><path d="M8 14.5c.4-.85 1.2-1.2 1.2-2.05 0-.65-.55-1-1.2-.7-.65-.3-1.2.05-1.2.7 0 .85.8 1.2 1.2 2.05z"/><path d="M6.9 5.5c-.35.7-.35 1.35 0 1.85M10.4 5.5c-.35.7-.35 1.35 0 1.85"/></svg>',
                                        tagline: "Simple, secure support",
                                        href: "https://ko-fi.com/simplelife",
                                        cta: "Continue on Ko-fi",
                                        detail: "A quick, secure contribution that helps cover the costs of researching, writing, and serving this briefing. The Ko-fi checkout opens in a new tab — no account needed."
                                      }),
                                      Object.freeze({
                                        id: "razorpay",
                                        name: "Razorpay",
                                                                              iconSvg: '<svg viewBox="0 0 24 24" aria-hidden="true"><text x="5.5" y="17" font-size="14.5" font-weight="700" font-family="sans-serif" fill="currentColor">₹</text></svg>',
                                        tagline: "Pay your way, securely",
                                        href: "https://razorpay.me/@ainuggets",
                                        cta: "Pay with Razorpay",
                                        detail: "A secure contribution that helps cover the costs of researching, writing, and serving this briefing. Pay via UPI, cards, or netbanking — the Razorpay checkout opens in a new tab."
                                      })
                                    ]),
                                    // Provider pre-selected when the dialog opens.
                                    defaultProvider: "kofi",
            copy: Object.freeze({
              label: "Support",
              title: "Support AI Nuggets",
              description: "Every day, AI Nuggets is your quick, quiet read on what's changing in AI. Reader contributions support the maintenance behind each edition — the research, tools, and care that keep it dependable.",
                                          providerPrompt: "Choose a payment method",
                                                        opensInNewTab: "Opens in a new tab",
                                                        comingSoon: "Contribution and subscription support is coming soon. Thank you for being here."
            })
        })
  });
