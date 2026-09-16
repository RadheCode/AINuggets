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
    briefingDescription: "Up to five useful updates, selected to help you keep up without the endless feed.",
    storyCountLabel: "Max five stories",
    updateCadenceLabel: "Updated daily",
    storyGridLabel: "Today's AI stories",
        storyShare: Object.freeze({
            buttonLabel: "Share",
            dialogTitle: "Share this story",
            dialogDescription: "Send this story to a friend or your network.",
            copyLinkLabel: "Copy link",
            copyLinkCopiedLabel: "Link copied",
            urlInputLabel: "Story link",
            platforms: Object.freeze([
                Object.freeze({ id: "x", label: "Share on X", icon: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z", buildUrl: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` }),
                Object.freeze({ id: "facebook", label: "Share on Facebook", icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z", buildUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` }),
                Object.freeze({ id: "whatsapp", label: "Share on WhatsApp", icon: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z", buildUrl: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` }),
                Object.freeze({ id: "linkedin", label: "Share on LinkedIn", icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z", buildUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` }),
                Object.freeze({ id: "email", label: "Share by email", icon: "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4.236-8 4.882-8-4.882V6h16v2.236z", buildUrl: (url, title) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}` })
            ])
        }),
        footer: "One useful briefing, every day",
    loginLabel: "Login",
    loginMenuTitle: "Welcome back",
    loginMenuDescription: "Sign in to save your reading streak.",
    guestStreakLabel: "Start streak",
    streakGuidanceTemplate: "Your streak has room for life: you can take up to {days} between visits and <strong>yet</strong> keep it going.",
    celebration: Object.freeze({
        start: Object.freeze({ emoji: "🔥", title: "Your streak begins!", subtitle: "Every great journey starts with day one." }),
        milestone: Object.freeze({ emoji: "⚡", title: "{streak}-day streak!", subtitle: "You are building a habit." }),
        mega: Object.freeze({ emoji: "🎉", title: "{streak}-day streak!", subtitle: "Incredible consistency. Keep going!" }),
        legendary: Object.freeze({ emoji: "🏆", title: "Legendary streak!", subtitle: "You are absolutely on fire." })
    }),
    continueWithGoogleLabel: "Continue with Google",
    about: Object.freeze({
        label: "About",
        eyebrow: "The daily AI briefing",
        title: Object.freeze({ emphasis: "Stay current.", lead: " Without the catch-up." }),
        description: "AI Nuggets is for busy professionals, students, and curious minds who want to keep up with AI without spending hours in an endless feed.",
        promise: "Each daily edition has just five essential updates: clear, concise summaries of what matters and why it matters. No crowded feed. No extra pages. Just enough to read in under two minutes and move forward informed.",
        documentTitle: "About AI Nuggets - AI news, less noise",
        metaDescription: "AI Nuggets distills the five AI updates worth knowing into a quick daily briefing for busy professionals and curious minds."
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
        // Newsletter interest capture. When enabled, the edge-tab newsletter widget and the
        // POST /api/newsletter/subscribe endpoint are active. No emails are sent yet — this
        // captures reader interest until an email service is integrated.
        newsletter: Object.freeze({
            enabled: true,
            copy: Object.freeze({
                tabLabel: "Newsletter",
                title: "The daily briefing, in your inbox",
                description: "Get each day's five AI updates delivered to your email. No noise, no spam — just the briefing.",
                emailLabel: "Email address",
                emailLockedHint: "You're signed in — we'll use your account email.",
                subscribeLabel: "Subscribe to Newsletter",
                subscribingLabel: "Subscribing…",
                successMessage: "You're subscribed! Watch for the first edition in your inbox.",
                duplicateMessage: "You're already on the list.",
                errorGeneral: "Something went wrong. Please try again.",
                errorInvalidEmail: "Enter a valid email address.",
                previewNote: "This is a preview — we're measuring interest before email delivery goes live."
            })
        }),
        // Editorial configuration
    editorial: Object.freeze({
    generationInstruction: "Create a factual daily AI-news edition only from the supplied candidate metadata.",
    candidateSelection: Object.freeze({
        // "priority" ranks by feed priority and freshness; "random" shuffles candidates before preserving category diversity.
        mode: "random"
    }),
    // Keep each feed's name aligned with the companyImages.sourceArtwork mapping. The coverage test requires a valid artwork asset for every feed.
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
        { name: "MIT News AI", feedUrl: "https://news.mit.edu/topic/mitartificialintelligence2-rss.xml", category: "Research", priority: 85 },
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
    1. FORMAT: Output MUST be EXACTLY 3 or 4 bullet points. Each bullet MUST start with "- " (hyphen followed by a space). Do not write introductory or concluding sentences. Do not use numbered lists, tables, or paragraphs — ONLY hyphen-prefixed bullet lines.
    2. LENGTH: The total character count MUST be strictly between 240 and 420 characters (including spaces).
    3. CONTENT:
    - State the core subject and main purpose.
    - MANDATORY: Explicitly name key entities, tools, platforms, or items listed in the text (e.g., specific brand or product names).
    - Mention primary capabilities and key operational limits/constraints.
    4. TONE: Concise, neutral, and direct.
    5. EXAMPLE FORMAT (3 bullets):
    - AI model X launches with Y capability for Z use case
    - Platform A integrates B to improve C workflows
    - Key limitation: D requires E before F`,

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
    // Summary provider selection and fallback behavior. These values are product-owned so
    // editorial and provider fallback order can be tuned without touching shared adapters.
        // Fallback order is environment-specific: production uses openai first (priority on quality),
        // beta uses gemini first (to preserve production OpenAI quota and use free tier first).
        summaryProviders: Object.freeze({
            // Ordered list of summary provider kinds. The factory tries providers in this
            // order, skipping any that lack configured credentials, and stops at the first
            // success. This is the single source of truth for provider selection.
            fallbackOrder: Object.freeze({
                production: ["openai", "gemini", "openrouter", "workers-ai"],
                beta: ["gemini", "openai", "openrouter", "workers-ai"]
            }),
            // Per-request timeout applied to provider model calls. Generous because
                    // free-tier OpenRouter models can take several minutes to emit a full
                    // edition with 4-5 stories.
                    requestTimeoutMs: 300000,
            // OpenAI-compatible provider behavior (shared by the openai and openrouter kinds).
            openaiCompatible: Object.freeze({
                // HTTP statuses that trigger fallback to the next configured model.
                retryableStatuses: Object.freeze([404, 500, 502, 503, 504])
            }),
            // Cloudflare Workers AI provider fallback behavior.
            workersAi: Object.freeze({
                // Exact HTTP statuses that trigger fallback to the next model.
                retryableStatuses: Object.freeze([429]),
                // Inclusive [min, max] status range that also triggers fallback (5xx server errors).
                retryableStatusRange: Object.freeze([500, 599]),
                // Error-message substrings (rate/capacity limits) that also trigger fallback.
                retryableMessageTerms: Object.freeze(["rate limit", "capacity", "overloaded"])
            }),
            // OpenRouter.ai defaults (an OpenAI-compatible endpoint).
            openrouter: Object.freeze({
                defaultBaseUrl: "https://openrouter.ai/api/v1"
                    }),
                    // Google Gemini defaults (an OpenAI-compatible endpoint).
                    gemini: Object.freeze({
                        defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai"
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
                                    // Internal donation recording (telemetry only — no reader-facing UI).
                                    // The Worker accepts donation records through the internal API so
                                    // operator skills can report on completed contributions.
                                    donationRecording: Object.freeze({
                                      enabled: true
                                    }),
                                    copy: Object.freeze({
                                      label: "Support",
                                      title: "Support AI Nuggets",
                                      description: "Every day, AI Nuggets is your quick, quiet read on what's changing in AI. Reader contributions support the maintenance behind each edition — the research, tools, and care that keep it dependable.",
                                                                  providerPrompt: "Choose a payment method",
                                                                                opensInNewTab: "Opens in a new tab",
                                                                                comingSoon: "Contribution and subscription support is coming soon. Thank you for being here."
                                    })
                    }),
                // Feature-contract validation. These helpers enforce the product configuration
                // contract so the browser and every runtime fail fast on invalid values. They
                // live on ProductConfig so this one object remains the single source of
                // product configuration and contract validation.
                validateSummaryFeatureConfig(config = globalThis.ProductConfig.summaryFeatures) {
                    if (!config || typeof config !== "object") throw new Error("Summary feature configuration must be an object.");
                    const { ui, generation, defaultContext, contexts } = config;
                    for (const [name, keys] of [["ui", ui], ["generation", generation]]) {
                    if (!Array.isArray(keys) || !keys.length || new Set(keys).size !== keys.length) {
                        throw new Error(`Summary feature configuration ${name} must contain unique context keys.`);
                    }
                    for (const key of keys) {
                        if (typeof key !== "string" || !contexts?.[key]) throw new Error(`Summary feature configuration ${name} contains an unsupported context: ${key}.`);
                    }
                    }
                    if (typeof defaultContext !== "string" || !ui.includes(defaultContext)) {
                    throw new Error("Summary feature configuration defaultContext must be enabled for the UI.");
                    }
                    for (const [key, context] of Object.entries(contexts || {})) {
                    if (!context || typeof context.label !== "string" || !context.label.trim()) throw new Error(`Summary context ${key} must define a label.`);
                    if (!Number.isInteger(context.minCharacters) || context.minCharacters < 1) throw new Error(`Summary context ${key} must define a positive minCharacters value.`);
                    if (!Number.isInteger(context.maxCharacters) || context.maxCharacters < context.minCharacters) throw new Error(`Summary context ${key} must define a valid maxCharacters value.`);
                    if (!["paragraph", "bullets", "paragraphs"].includes(context.format)) throw new Error(`Summary context ${key} must define a supported format.`);
                    }
                    return config;
                },
                validateStreakFeatureConfig(config = globalThis.ProductConfig.readerEngagement?.streak) {
                    if (!config || typeof config !== "object") throw new Error("Streak feature configuration must be an object.");
                    const { maximumDaysBetweenQualifyingActivities } = config;
                    if (!Number.isInteger(maximumDaysBetweenQualifyingActivities)
                    || maximumDaysBetweenQualifyingActivities < 1
                    || maximumDaysBetweenQualifyingActivities > 365) {
                    throw new Error("Streak maximumDaysBetweenQualifyingActivities must be an integer from 1 through 365.");
                    }
                    return config;
                },
                                validateNewsletterFeatureConfig(config = globalThis.ProductConfig.newsletter) {
                                    if (!config || typeof config !== "object") throw new Error("Newsletter feature configuration must be an object.");
                                    if (typeof config.enabled !== "boolean") throw new Error("Newsletter feature configuration enabled must be a boolean.");
                                    const copy = config.copy;
                                    if (!copy || typeof copy !== "object") throw new Error("Newsletter feature configuration copy must be an object.");
                                    for (const key of ["tabLabel", "title", "description", "emailLabel", "subscribeLabel", "successMessage", "duplicateMessage", "errorGeneral", "errorInvalidEmail"]) {
                                        if (typeof copy[key] !== "string" || !copy[key].trim()) throw new Error(`Newsletter feature configuration copy.${key} must be a non-empty string.`);
                                    }
                                    return config;
                                },
                validateSummaryProvidersConfig(config = globalThis.ProductConfig.summaryProviders) {
                    if (!config || typeof config !== "object") throw new Error("Summary providers configuration must be an object.");
                    const { fallbackOrder, openaiCompatible, workersAi, openrouter, gemini, requestTimeoutMs } = config;
                                    // fallbackOrder can be an array (legacy) or an object with environment-specific arrays
                                    if (Array.isArray(fallbackOrder)) {
                                        if (fallbackOrder.length === 0) throw new Error("Summary providers fallbackOrder must be a non-empty array.");
                                        if (fallbackOrder.some((kind) => typeof kind !== "string" || !kind.trim())) throw new Error("Summary provider fallbackOrder entries must be non-empty strings.");
                                    } else if (fallbackOrder && typeof fallbackOrder === "object") {
                                        for (const [env, order] of Object.entries(fallbackOrder)) {
                                            if (!Array.isArray(order) || order.length === 0) throw new Error(`Summary providers fallbackOrder.${env} must be a non-empty array.`);
                                            if (order.some((kind) => typeof kind !== "string" || !kind.trim())) throw new Error(`Summary provider fallbackOrder.${env} entries must be non-empty strings.`);
                                        }
                                    } else {
                                        throw new Error("Summary providers fallbackOrder must be an array or an object with environment-specific arrays.");
                                    }
                                    if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1) throw new Error("Summary providers requestTimeoutMs must be a positive integer.");
                                    if (!openaiCompatible || !Array.isArray(openaiCompatible.retryableStatuses)) throw new Error("Summary providers openaiCompatible.retryableStatuses must be an array.");
                                    if (!workersAi || !Array.isArray(workersAi.retryableStatuses) || !Array.isArray(workersAi.retryableStatusRange) || !Array.isArray(workersAi.retryableMessageTerms)) throw new Error("Summary providers workersAi fallback criteria must be arrays.");
                                    if (!openrouter || typeof openrouter.defaultBaseUrl !== "string" || !openrouter.defaultBaseUrl.trim()) throw new Error("Summary providers openrouter.defaultBaseUrl must be a non-empty URL string.");
                                                        if (!gemini || typeof gemini.defaultBaseUrl !== "string" || !gemini.defaultBaseUrl.trim()) throw new Error("Summary providers gemini.defaultBaseUrl must be a non-empty URL string.");
                                                        return config;
                                }
              });

              // NOTE: product/config.js is the single product configuration file. It is also
                // a browser classic script (loaded via <script src>), so it must NOT contain
                // ES module export statements — browsers throw a SyntaxError on top-level
                // `export` in a non-module script, which blanks the whole page. Node/Worker
                // ESM consumers import it for its side effect (it assigns
                // globalThis.ProductConfig) and read all configuration from that one object.
