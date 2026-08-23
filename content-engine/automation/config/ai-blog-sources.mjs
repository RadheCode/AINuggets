// Edit this list to add, remove, recategorize, or reprioritize source feeds.
// Each feed must be public HTTPS RSS or Atom and is limited to three posts per run.
export const AI_BLOG_SOURCES = Object.freeze([
  { name: "OpenAI", feedUrl: "https://openai.com/news/rss.xml", category: "Models", priority: 100 },
  { name: "Anthropic", feedUrl: "https://www.anthropic.com/rss.xml", category: "Models", priority: 100 },
  { name: "Google AI", feedUrl: "https://blog.google/technology/ai/rss/", category: "Research", priority: 95 },
  { name: "Microsoft AI", feedUrl: "https://blogs.microsoft.com/ai/feed/", category: "Business", priority: 90 },
  { name: "Meta AI", feedUrl: "https://ai.meta.com/blog/rss/", category: "Research", priority: 90 },
  { name: "Hugging Face", feedUrl: "https://huggingface.co/blog/feed.xml", category: "Open source", priority: 90 },
  { name: "Mistral AI", feedUrl: "https://mistral.ai/news/rss.xml", category: "Models", priority: 85 },
  { name: "Cohere", feedUrl: "https://cohere.com/blog/rss.xml", category: "Business", priority: 85 },
  { name: "NVIDIA AI", feedUrl: "https://blogs.nvidia.com/blog/category/deep-learning/feed/", category: "Infrastructure", priority: 85 },
  { name: "AWS Machine Learning", feedUrl: "https://aws.amazon.com/blogs/machine-learning/feed/", category: "Infrastructure", priority: 80 },
  { name: "Google DeepMind", feedUrl: "https://deepmind.google/discover/blog/rss.xml", category: "Research", priority: 80 },
  { name: "GitHub", feedUrl: "https://github.blog/ai-and-ml/feed/", category: "Developer tools", priority: 75 },
  { name: "LangChain", feedUrl: "https://blog.langchain.dev/rss/", category: "Agents", priority: 75 },
  { name: "Weights & Biases", feedUrl: "https://wandb.ai/fully-connected/feed", category: "Developer tools", priority: 70 },
  { name: "Stability AI", feedUrl: "https://stability.ai/news?format=rss", category: "Creative AI", priority: 70 }
]);
