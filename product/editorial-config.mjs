export const PRODUCT_EDITORIAL_CONFIG = Object.freeze({
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
});
