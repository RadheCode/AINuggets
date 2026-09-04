import { systemPrompt } from "./edition-prompt.mjs";

function validateSummaryContexts(summaryContexts) {
  if (!summaryContexts || typeof summaryContexts !== "object") {
    throw new Error("Summary contexts are required.");
  }
  for (const key of Object.keys(summaryContexts)) {
    const context = summaryContexts[key];
    if (!context || !Number.isInteger(context.minCharacters) || context.minCharacters < 1) {
      throw new Error(`Summary context "${key}" must define a positive minCharacters value.`);
    }
    if (!Number.isInteger(context.maxCharacters) || context.maxCharacters < context.minCharacters) {
      throw new Error(`Summary context "${key}" must define a maxCharacters value at least as large as minCharacters.`);
    }
    if (typeof context.label !== "string" || !context.label.trim()) {
      throw new Error(`Summary context "${key}" must define a label.`);
    }
  }
}

/**
 * Builds a summary provider backed by the Cloudflare Workers AI binding.
 * The `ai` binding (env.AI) is injected by the runtime; passing an `ai` object
 * allows the provider to be driven directly in tests without a live binding.
 */
export function createWorkersAiSummaryProvider({ ai, model, summaryContexts, generationInstruction }) {
  if (!ai || typeof ai.run !== "function") {
    throw new Error("A Workers AI binding (env.AI) is required for the workers-ai summary provider.");
  }
  if (!model) throw new Error("A Workers AI model is required.");
  validateSummaryContexts(summaryContexts);
  if (typeof generationInstruction !== "string" || !generationInstruction.trim()) {
    throw new Error("A product generation instruction is required.");
  }

  return {
    async generateEdition({ targetDate, candidates, eventLogger } = {}) {
      const result = await ai.run(model, {
        messages: [
          { role: "system", content: systemPrompt(summaryContexts, generationInstruction) },
          { role: "user", content: JSON.stringify({ targetDate, candidates }) }
        ],
        response_format: { type: "json_object" }
      });

      const content = typeof result === "string" ? result : result?.response;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Workers AI returned no structured edition.");
      }
      await eventLogger?.record("generation", "summary-provider-response-received", {
        candidateCount: candidates.length,
        responseCharacterCount: content.length,
        model
      }, { outcome: "succeeded" });
      try {
        return JSON.parse(content);
      } catch {
        throw new Error("Workers AI returned invalid JSON.");
      }
    }
  };
}
