(function initializeCompanyImages() {
  const companies = Object.freeze([
    { id: "openai", terms: ["openai", "chatgpt", "gpt-4", "gpt-5", "sora"], image: "assets/companies/openai.jpg" },
    { id: "microsoft", terms: ["microsoft", "azure", "copilot", "github copilot"], image: "assets/companies/microsoft.jpg" },
    { id: "google", terms: ["google", "alphabet", "gemini", "deepmind", "google cloud"], image: "assets/companies/google.jpg" },
    { id: "anthropic", terms: ["anthropic", "claude"], image: "assets/companies/anthropic.jpg" },
    { id: "meta", terms: ["meta", "llama", "facebook ai"], image: "assets/companies/meta.jpg" },
    { id: "amazon", terms: ["amazon", "aws", "bedrock", "amazon web services"], image: "assets/companies/amazon.jpg" },
    { id: "nvidia", terms: ["nvidia", "cuda", "geforce", "dgx"], image: "assets/companies/nvidia.jpg" },
    { id: "apple", terms: ["apple", "apple intelligence", "siri"], image: "assets/companies/apple.jpg" },
    { id: "ibm", terms: ["ibm", "watsonx", "watson"], image: "assets/companies/ibm.jpg" },
    { id: "oracle", terms: ["oracle", "oci"], image: "assets/companies/oracle.jpg" },
    { id: "salesforce", terms: ["salesforce", "agentforce", "einstein"], image: "assets/companies/salesforce.jpg" },
    { id: "adobe", terms: ["adobe", "firefly"], image: "assets/companies/adobe.jpg" },
    { id: "xai", terms: ["xai", "grok"], image: "assets/companies/xai.jpg" },
    { id: "mistral", terms: ["mistral", "le chat"], image: "assets/companies/mistral.jpg" },
    { id: "hugging-face", terms: ["hugging face", "huggingface", "transformers"], image: "assets/companies/hugging-face.jpg" },
    { id: "perplexity", terms: ["perplexity"], image: "assets/companies/perplexity.jpg" },
    { id: "databricks", terms: ["databricks"], image: "assets/companies/databricks.jpg" },
    { id: "snowflake", terms: ["snowflake"], image: "assets/companies/snowflake.jpg" },
    { id: "palantir", terms: ["palantir", "aip platform"], image: "assets/companies/palantir.jpg" },
    { id: "github", terms: ["github"], image: "assets/companies/github.jpg" },
    { id: "intel", terms: ["intel", "gaudi"], image: "assets/companies/intel.jpg" },
    { id: "amd", terms: ["amd", "advanced micro devices", "instinct"], image: "assets/companies/amd.jpg" },
    { id: "samsung", terms: ["samsung"], image: "assets/companies/samsung.jpg" },
    { id: "qualcomm", terms: ["qualcomm", "snapdragon"], image: "assets/companies/qualcomm.jpg" },
    { id: "baidu", terms: ["baidu", "ernie"], image: "assets/companies/baidu.jpg" },
    { id: "alibaba", terms: ["alibaba", "qwen", "alicloud"], image: "assets/companies/alibaba.jpg" }
  ]);

  function hasTerm(text, term) {
    return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i").test(text);
  }

  function findCompanyImage(story) {
    const text = [story.title, ...Object.values(story.summaries || {})]
      .filter((value) => typeof value === "string")
      .join(" ");
    return companies.find((company) => company.terms.some((term) => hasTerm(text, term))) || null;
  }

  window.AINuggetsCompanyImages = Object.freeze({ findCompanyImage });
}());
