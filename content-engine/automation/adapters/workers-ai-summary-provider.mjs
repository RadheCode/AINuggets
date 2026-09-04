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
        response_format: { type: "json_object" },
        // The default max_tokens for this model is only 256, which truncates
        // a full edition (5 stories x 3 summary layers) mid-JSON. Raise it so
        // the entire structured edition is generated before parsing.
        max_tokens: 6000,
        temperature: 0.2
      });

      // Workers AI returns a vLLM/OpenAI-compatible envelope: when structured
      // json_object mode is used the generated text lands in
      // choices[0].message.content, while the top-level `response` key can be
      // empty. Accept a plain string, a non-empty top-level `response`, or the
      // choices content so all shapes resolve to the edition text.
      const content = typeof result === "string"
        ? result
        : (typeof result?.response === "string" && result.response.trim() ? result.response : undefined)
          ?? result?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Workers AI returned no structured edition.");
      }
      await eventLogger?.record("generation", "summary-provider-response-received", {
        candidateCount: candidates.length,
        responseCharacterCount: content.length,
        model
      }, { outcome: "succeeded" });
      try {
        return JSON.parse(extractJson(content));
      } catch {
        throw new Error("Workers AI returned invalid JSON.");
      }
    }
  };
}

/**
 * Recovers a JSON value from a model response. Llama-family models sometimes
 * wrap JSON in ```json fences or prefix it with prose even when
 * response_format asks for json_object, so strip fences and surface the first
 * balanced JSON object/array before relying on strict JSON.parse.
 */
function extractJson(content) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const trimmed = candidate.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  const objectStart = candidate.indexOf("{");
  const arrayStart = candidate.indexOf("[");
  const start = objectStart === -1 ? arrayStart : arrayStart === -1 ? objectStart : Math.min(objectStart, arrayStart);
  if (start === -1) return trimmed;
  return candidate.slice(start).trim();
}
