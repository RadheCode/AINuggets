(function initializeCompanyImages() {
  const sourceArtwork = Object.freeze({
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
  });

  const companies = Object.freeze([
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
  ]);

  function hasTerm(text, term) {
    return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i").test(text);
  }

  function findCompanyImage(story) {
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

  window.ProductCompanyImages = Object.freeze({ findCompanyImage, sourceArtwork });
}());
