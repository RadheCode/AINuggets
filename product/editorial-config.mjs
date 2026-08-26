export const PRODUCT_EDITORIAL_CONFIG = Object.freeze({
  generationInstruction: "Create a factual daily AI-news edition only from the supplied candidate metadata.",
  automation: Object.freeze({
    betaTriggerUrl: "https://beta-ai-nuggets-content.ainuggets123.workers.dev/internal/generate"
  }),
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
    { name: "HackerNoon AI", feedUrl: "https://hackernoon.com/tagged/artificial-intelligence/feed", category: "Creative AI", priority: 65 }
  ])
});
