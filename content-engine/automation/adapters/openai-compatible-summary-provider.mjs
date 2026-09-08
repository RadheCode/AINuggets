import { createEditionSchema, systemPrompt } from "./edition-prompt.mjs";

function requireUrl(value, name) {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }
}

/**
 * Attempts to extract a JSON object from a model response that may include
 * markdown code fences, prose, or reasoning text around the JSON payload.
 * Returns the extracted JSON string, or null when no object can be found.
 */
function extractJsonObject(content) {
  if (typeof content !== "string" || !content.trim()) return null;

  // Strip markdown code fences (```json ... ``` or ``` ... ```).
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const candidate = fenced[1].trim();
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // fall through to brace matching
    }
  }

  // Find the first balanced {...} block.
  const start = content.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = content.slice(start, i + 1);
        try {
          JSON.parse(candidate);
          return candidate;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
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
            // Some providers wrap JSON in markdown code fences or add prose.
            // Try to extract the first JSON object from the response.
            const extracted = extractJsonObject(content);
            if (extracted !== null) {
              try {
                return JSON.parse(extracted);
              } catch {
                // fall through to error
              }
            }
            const preview = content.length > 300 ? content.slice(0, 300) + "…" : content;
            await eventLogger?.record("generation", "summary-provider-invalid-json", {
              candidateCount: candidates.length,
              responseCharacterCount: content.length,
              model: currentModel,
              contentPreview: preview
            }, { outcome: "failed" });
            throw new Error(`Summary provider returned invalid JSON. Model ${currentModel} responded with ${content.length} characters that could not be parsed.`);
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
