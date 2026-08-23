function requireUrl(value, name) {
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }
}

export function createHttpJsonContentSource({ url, apiKey, fetchImpl = fetch }) {
  const endpoint = requireUrl(url, "Content source URL");

  return {
    async fetchCandidates({ targetDate }) {
      const requestUrl = new URL(endpoint);
      requestUrl.searchParams.set("date", targetDate);
      const response = await fetchImpl(requestUrl, {
        headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
        signal: AbortSignal.timeout(15_000)
      });
      if (!response.ok) throw new Error(`Content source request failed (${response.status}).`);

      const body = await response.json();
      const candidates = Array.isArray(body) ? body : body.candidates;
      if (!Array.isArray(candidates)) throw new Error("Content source response must be an array or an object with a candidates array.");
      return candidates.filter((candidate) => candidate && typeof candidate === "object");
    }
  };
}
