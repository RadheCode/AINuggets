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
    // Editorial configuration
    editorial: Object.freeze({
    generationInstruction: "Create a factual daily AI-news edition only from the supplied candidate metadata.",
    candidateSelection: Object.freeze({
        // "priority" ranks by feed priority and freshness; "random" shuffles candidates before preserving category diversity.
        mode: "random"
    }),
    // Keep each feed's name aligned with product/company-images.js sourceArtwork. The coverage test requires a valid artwork asset for every feed.
    feeds: Object.freeze([
        { name: "OpenAI", feedUrl: "https://openai.com/news/rss.xml", category: "Models", priority: 100 },
        { name: "VentureBeat AI", feedUrl: "https://venturebeat.com/category/ai/feed/", category: "Business", priority: 85 },
        { name: "Google AI", feedUrl: "https://blog.google/technology/ai/rss/", category: "Research", priority: 95 },
        { name: "TechCrunch AI", feedUrl: "https://techcrunch.com/category/artificial-intelligence/feed/", category: "Business", priority: 80 },
        { name: "MIT Technology Review AI", feedUrl: "https://www.technologyreview.com/topic/artificial-intelligence/feed/", category: "Research", priority: 85 },
        { name: "Hugging Face", feedUrl: "https://huggingface.co/blog/feed.xml", category: "Open source", priority: 90 },
        { name: "The Verge AI", feedUrl: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", category: "Business", priority: 75 },
        { name: "IEEE Spectrum AI", feedUrl: "https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss", category: "Research", priority: 75 },
        { name: "NVIDIA AI", feedUrl: "https://blogs.nvidia.com/blog/category/deep-learning/feed/", category: "Infrastructure", priority: 85 },
        { name: "AWS Machine Learning", feedUrl: "https://aws.amazon.com/blogs/machine-learning/feed/", category: "Infrastructure", priority: 80 },
        { name: "The Gradient", feedUrl: "https://thegradient.pub/rss/", category: "Research", priority: 70 },
        { name: "GitHub", feedUrl: "https://github.blog/ai-and-ml/feed/", category: "Developer tools", priority: 75 },
        { name: "MarkTechPost", feedUrl: "https://www.marktechpost.com/feed/", category: "Models", priority: 70 },
        { name: "Towards Data Science", feedUrl: "https://towardsdatascience.com/feed", category: "Developer tools", priority: 70 },
        { name: "HackerNoon AI", feedUrl: "https://hackernoon.com/tagged/artificial-intelligence/feed", category: "Creative AI", priority: 65 },
        { name: "Google DeepMind", feedUrl: "https://deepmind.google/blog/rss.xml", category: "Research", priority: 95 },
        { name: "PyTorch", feedUrl: "https://pytorch.org/feed/", category: "Open source", priority: 85 },
        { name: "Weights & Biases", feedUrl: "https://wandb.ai/fully-connected/rss.xml", category: "Developer tools", priority: 80 },
        { name: "MLCommons", feedUrl: "https://mlcommons.org/feed/", category: "Infrastructure", priority: 75 },
        { name: "Apple Machine Learning Research", feedUrl: "https://machinelearning.apple.com/rss.xml", category: "Research", priority: 85 },
        { name: "Microsoft Semantic Kernel", feedUrl: "https://devblogs.microsoft.com/semantic-kernel/feed/", category: "Developer tools", priority: 75 },
        { name: "Microsoft Research", feedUrl: "https://www.microsoft.com/en-us/research/feed/", category: "Research", priority: 85 },
        { name: "Google Research", feedUrl: "https://research.google/blog/rss/", category: "Research", priority: 85 },
        { name: "MIT News AI", feedUrl: "https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml", category: "Research", priority: 85 },
        { name: "AI Business", feedUrl: "https://aibusiness.com/rss.xml", category: "Business", priority: 65 },
        { name: "NVIDIA Technical Blog", feedUrl: "https://developer.nvidia.com/blog/feed/", category: "Infrastructure", priority: 80 },
        { name: "TensorFlow", feedUrl: "https://blog.tensorflow.org/feeds/posts/default", category: "Developer tools", priority: 80 },
        { name: "fast.ai", feedUrl: "https://www.fast.ai/index.xml", category: "Developer tools", priority: 75 },
        { name: "Oracle AI and Data Science", feedUrl: "https://blogs.oracle.com/ai-and-datascience/rss", category: "Infrastructure", priority: 70 },
        { name: "MIT CSAIL", feedUrl: "https://www.csail.mit.edu/rss.xml", category: "Research", priority: 80 },
        { name: "Mozilla AI", feedUrl: "https://blog.mozilla.org/en/tag/ai/feed/", category: "Research", priority: 70 },
        { name: "ScienceDaily AI", feedUrl: "https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml", category: "Research", priority: 65 },
        { name: "KDnuggets", feedUrl: "https://www.kdnuggets.com/feed", category: "Developer tools", priority: 65 },
        { name: "Berkeley Engineering", feedUrl: "https://engineering.berkeley.edu/feed/", category: "Research", priority: 70 },
        { name: "Machine Learning Mastery", feedUrl: "https://machinelearningmastery.com/feed/", category: "Developer tools", priority: 65 }
    ])
    }),
    // Company images configuration
    companyImages: Object.freeze({
    sourceArtwork: Object.freeze({
        "OpenAI": "openai",
        "VentureBeat AI": "business",
        "Google AI": "google",
        "TechCrunch AI": "business",
        "MIT Technology Review AI": "research",
        "Hugging Face": "hugging-face",
        "The Verge AI": "business",
        "IEEE Spectrum AI": "research",
        "NVIDIA AI": "nvidia",
        "AWS Machine Learning": "amazon",
        "The Gradient": "research",
        "GitHub": "github",
        "MarkTechPost": "models",
        "Towards Data Science": "developer-tools",
        "HackerNoon AI": "creative-ai",
        "Google DeepMind": "google",
        "PyTorch": "open-source",
        "Weights & Biases": "developer-tools",
        "MLCommons": "infrastructure",
        "Apple Machine Learning Research": "apple",
        "Microsoft Semantic Kernel": "microsoft",
        "Microsoft Research": "microsoft",
        "Google Research": "google",
        "MIT News AI": "research",
        "AI Business": "business",
        "NVIDIA Technical Blog": "nvidia",
        "TensorFlow": "google",
        "fast.ai": "developer-tools",
        "Oracle AI and Data Science": "oracle",
        "MIT CSAIL": "research",
        "Mozilla AI": "research",
        "ScienceDaily AI": "research",
        "KDnuggets": "developer-tools",
        "Berkeley Engineering": "research",
        "Machine Learning Mastery": "developer-tools"
    }),
    companies: Object.freeze([
        { id: "openai", terms: ["openai", "chatgpt", "gpt-4", "gpt-5", "sora"] },
        { id: "microsoft", terms: ["microsoft", "azure", "copilot", "github copilot"] },
        { id: "google", terms: ["google", "alphabet", "gemini", "deepmind", "google cloud"] },
        { id: "anthropic", terms: ["anthropic", "claude"] },
        { id: "meta", terms: ["meta", "llama", "facebook ai"] },
        { id: "amazon", terms: ["amazon", "aws", "bedrock", "amazon web services"] },
        { id: "nvidia", terms: ["nvidia", "cuda", "geforce", "dgx"] },
        { id: "apple", terms: ["apple", "apple intelligence", "siri"] },
        { id: "ibm", terms: ["ibm", "watsonx", "watson"] },
        { id: "oracle", terms: ["oracle", "oci"] },
        { id: "salesforce", terms: ["salesforce", "agentforce", "einstein"] },
        { id: "adobe", terms: ["adobe", "firefly"] },
        { id: "xai", terms: ["xai", "grok"] },
        { id: "mistral", terms: ["mistral", "le chat"] },
        { id: "hugging-face", terms: ["hugging face", "huggingface", "transformers"] },
        { id: "perplexity", terms: ["perplexity"] },
        { id: "databricks", terms: ["databricks"] },
        { id: "snowflake", terms: ["snowflake"] },
        { id: "palantir", terms: ["palantir", "aip platform"] },
        { id: "github", terms: ["github"] },
        { id: "intel", terms: ["intel", "gaudi"] },
        { id: "amd", terms: ["amd", "advanced micro devices", "instinct"] },
        { id: "samsung", terms: ["samsung"] },
        { id: "qualcomm", terms: ["qualcomm", "snapdragon"] },
        { id: "baidu", terms: ["baidu", "ernie"] },
        { id: "alibaba", terms: ["alibaba", "qwen"] }
    ])
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
    // Externalized summarization prompts for AI Nuggets content generation.
    // Keep these in sync with the documentation in docs/DAILY_CONTENT_AUTOMATION.md.
    summaryPrompts: Object.freeze({
    // Overview (summaries.standard): EXACTLY 3 or 4 bullet points.
        overview: `Act as an expert content summarizer. Analyze the provided text and create a brief, high-level "Overview" summary.
    Follow these strict constraints:
    1. FORMAT: Output MUST be a bulleted list only. Do not write introductory or concluding sentences.
    2. LENGTH: The total character count MUST be strictly between 240 and 420 characters (including spaces).
    3. CONTENT:
    - State the core subject and main purpose.
    - MANDATORY: Explicitly name key entities, tools, platforms, or items listed in the text (e.g., specific brand or product names).
    - Mention primary capabilities and key operational limits/constraints.
    4. TONE: Concise, neutral, and direct.`,

    // Deep dive (summaries.detailed): 2 to 4 short paragraphs separated by BLANK LINES.
        detailed: `Act as a senior domain analyst and communicator. Read the provided text thoroughly and produce a comprehensive "Deep Dive" summary.

    Follow these strict constraints:
    1. FORMAT: Output MUST be written in 3 cohesive paragraphs only. Do NOT use bullet points, tables, numbered lists, or section headers (e.g., "Paragraph 1", "Summary", "Conclusion").
    2. LENGTH: The total character count MUST be strictly between 500 and 900 characters (including spaces).
    3. CONTENT STRUCTURE:
     - Paragraph 1 (Problem & Scope): State the core topic, primary purpose, and contextual background of the text. Explicitly name the core brands, tools, methods, or entities discussed.
     - Paragraph 2 (Technical Details & Features): Detail specific mechanics, key capabilities, features, evidence, or methodologies highlighted in the text.
     - Paragraph 3 (Trade-offs & Implications): Explain practical applications, operational constraints (e.g., costs, limits, edge cases), and broader takeaways or future outlook.
    4. TONE & STYLE: Direct, analytical, and informative. Avoid fluff, promotional filler, and vague generalities. Every sentence must deliver concrete factual value.`,

    // Quick take (summaries.compact): ONE paragraph.
    compact: `Quick take (summaries.compact): ONE paragraph, minimum 100 chars, target 180.`,
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

  // Exported configurations for use in other modules
  export const STREAK_FEATURE_CONFIG = globalThis.ProductConfig.readerEngagement?.streak;
  export function validateStreakFeatureConfig(config = STREAK_FEATURE_CONFIG) {
    if (!config || typeof config !== "object") throw new Error("Streak feature configuration must be an object.");
    const { maximumDaysBetweenQualifyingActivities } = config;
    if (!Number.isInteger(maximumDaysBetweenQualifyingActivities)
      || maximumDaysBetweenQualifyingActivities < 1
      || maximumDaysBetweenQualifyingActivities > 365) {
      throw new Error("Streak maximumDaysBetweenQualifyingActivities must be an integer from 1 through 365.");
    }
    return config;
  }
