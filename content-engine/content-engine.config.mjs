// Central content-engine controls. Edit this file to change the daily schedule,
// editorial timezone, publication mode, or approved RSS/Atom feeds.
export const CONTENT_ENGINE_CONFIG = Object.freeze({
  schedule: Object.freeze({
    // Cloudflare Cron uses UTC. 01:00 UTC is 06:30 in Asia/Kolkata.
    cron: "0 1 * * *",
    timezone: "Asia/Kolkata"
  }),
  publication: Object.freeze({
    // Set to true to publish a validated edition immediately and bypass editorial review.
    automaticallyPublish: false
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
