import { createEditionSchema, systemPrompt } from "./edition-prompt.mjs";

function requireUrl(value, name) {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }
}

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

export function createOpenAiCompatibleSummaryProvider({ baseUrl, apiKey, model, summaryContexts, generationInstruction, fetchImpl = fetch, retryableStatuses = [404, 500, 502, 503, 504], requestTimeoutMs = 120000 }) {
  if (!apiKey) throw new Error("A summary provider API key is required.");
  if (!model) throw new Error("A summary provider model is required.");
  validateSummaryContexts(summaryContexts);
  if (typeof generationInstruction !== "string" || !generationInstruction.trim()) {
    throw new Error("A product generation instruction is required.");
  }
  const endpoint = `${requireUrl(baseUrl, "Summary provider URL")}/chat/completions`;

  // Normalize model to array for fallback support
  const models = Array.isArray(model) ? model : [model];
  if (models.length === 0) throw new Error("At least one model is required.");

  return {
    async generateEdition({ targetDate, candidates, eventLogger } = {}) {
      let lastError;
      
      for (let i = 0; i < models.length; i++) {
        const currentModel = models[i];
        const isLastModel = i === models.length - 1;
        
        try {
          await eventLogger?.record("generation", "summary-provider-attempt", {
            candidateCount: candidates.length,
            model: currentModel,
            attempt: i + 1,
            totalModels: models.length
          });
          
          const response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              authorization: `Bearer ${apiKey}`,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              model: currentModel,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemPrompt(summaryContexts, generationInstruction) },
                { role: "user", content: JSON.stringify({ targetDate, candidates }) }
              ]
            }),
            signal: AbortSignal.timeout(requestTimeoutMs)
          });
          
          if (!response.ok) {
            const errText = await response.text();
            const error = new Error(`Summary provider request failed (${response.status}): ${errText}`);
            error.status = response.status;
            error.model = currentModel;
            throw error;
          }

          const body = await response.json();
          const content = body.choices?.[0]?.message?.content;
          if (typeof content !== "string") throw new Error("Summary provider returned no structured edition.");
          
          await eventLogger?.record("generation", "summary-provider-response-received", {
            candidateCount: candidates.length,
            responseCharacterCount: content.length,
            model: currentModel
          }, { outcome: "succeeded" });
          
          try {
            return JSON.parse(content);
          } catch {
            throw new Error("Summary provider returned invalid JSON.");
          }
        } catch (error) {
          lastError = error;
          
          await eventLogger?.record("generation", "summary-provider-attempt-failed", {
            candidateCount: candidates.length,
            model: currentModel,
            attempt: i + 1,
            totalModels: models.length,
            error: error.message,
            status: error.status
          }, { outcome: "failed" });
          
          // If this is the last model, throw the error
          if (isLastModel) {
            throw lastError;
          }
          
          // For non-final models, continue to next model on the configured retryable statuses.
          if (error.status && retryableStatuses.includes(error.status)) {
            continue; // Try next model
          }
          
          // For other errors (401, 400, etc.), don't retry with other models
          throw error;
        }
      }
      
      throw lastError;
    }
  };
}
