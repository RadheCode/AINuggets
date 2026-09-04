import test from "node:test";
import assert from "node:assert/strict";
import { prepareEdition } from "../pipeline/prepare-edition.mjs";

const targetDate = "2026-08-24";
const DEFAULT_EYEBROW = "AI Daily";

const SUMMARY_CONTEXTS = {
  compact: { label: "Overview", format: "bullets", minCharacters: 10, maxCharacters: 300 },
  detailed: { label: "Deep dive", format: "paragraphs", minCharacters: 10, maxCharacters: 600 }
};

const summarise = (label) => ({
  compact: [
    `- ${label} provides the key news update and the specific development readers need to understand today.`,
    `- The change matters because it affects how teams evaluate products and deployment choices.`,
    `- Readers should watch the next release and the evidence that shows whether impact will persist.`
  ].join("\n"),
  detailed: `${label} deep dive explains the development with useful context for readers who need more than the headline. ` +
    `It connects the announcement to practical decisions and effects on teams.\n\n` +
    `${label} deep dive explains the development with useful context for readers who need more than the headline.`
});

function edition(date = targetDate) {
  return {
    date,
    briefing: {
      eyebrow: "Fresh briefing",
      title: "Daily briefing.",
      emphasis: "Less noise.",
      summary: "Today's useful updates.",
      meta: ["4 stories"]
    },
    stories: [
      { id: "one", type: "lead", category: "Models", title: "One", summaries: summarise("One"), href: "https://example.com/1", art: "models" },
      { id: "two", category: "Agents", title: "Two", summaries: summarise("Two"), href: "https://example.com/2", art: "agents" },
      { id: "three", category: "Research", title: "Three", summaries: summarise("Three"), href: "https://example.com/3", art: "research" },
      { id: "four", type: "wide", category: "Business", title: "Four", summaries: summarise("Four"), href: "https://example.com/4", art: "business" }
    ]
  };
}

const candidates = Array.from({ length: 5 }, (_, index) => ({
  url: `https://example.com/candidate-${index + 1}`,
  category: `Category ${index + 1}`
}));

const noopLogger = { record: async () => {}, failure: async () => {} };

test("pins the generated edition date to the target date when the model returns a different date", async () => {
  const summaryProvider = {
    async generateEdition() {
      // Model wrongly echoes the previous edition date / its own guess.
      return edition("2026-08-17");
    }
  };
  const result = await prepareEdition({
    targetDate,
    candidates,
    summaryProvider,
    summaryContexts: SUMMARY_CONTEXTS,
    eventLogger: noopLogger
  });
  assert.equal(result.date, targetDate);
});

test("preserves the date when the model already returns the target date", async () => {
  const summaryProvider = {
    async generateEdition() {
      return edition(targetDate);
    }
  };
  const result = await prepareEdition({
    targetDate,
    candidates,
    summaryProvider,
    summaryContexts: SUMMARY_CONTEXTS,
    eventLogger: noopLogger
  });
  assert.equal(result.date, targetDate);
});

test("repairs empty eyebrow and empty story ids so validation passes on first attempt", async () => {
  const summaryProvider = {
    async generateEdition() {
      const bad = edition(targetDate);
      bad.briefing.eyebrow = "";
      bad.stories = bad.stories.map((s, i) => ({ ...s, id: "" }));
      return bad;
    }
  };
  const result = await prepareEdition({
    targetDate,
    candidates,
    summaryProvider,
    summaryContexts: SUMMARY_CONTEXTS,
    eventLogger: noopLogger
  });
  assert.equal(result.briefing.eyebrow, DEFAULT_EYEBROW);
  assert.equal(result.stories.length, 4);
  for (const story of result.stories) {
    assert.ok(story.id && story.id.length > 0);
  }
});

test("retries generation when the first attempt fails validation on a non-repairable field and succeeds on a later attempt", async () => {
  let calls = 0;
  const summaryProvider = {
    async generateEdition() {
      calls += 1;
      if (calls === 1) {
        // Missing summaries object - not repaired by repairEdition
        const bad = edition(targetDate);
        bad.stories[0].summaries = null;
        return bad;
      }
      return edition(targetDate);
    }
  };
  const result = await prepareEdition({
    targetDate,
    candidates,
    summaryProvider,
    summaryContexts: SUMMARY_CONTEXTS,
    eventLogger: noopLogger
  });
  assert.equal(calls, 2);
  assert.equal(result.date, targetDate);
  assert.equal(result.stories.length, 4);
});

test("fails after exhausting all generation attempts on non-repairable errors", async () => {
  let calls = 0;
  const summaryProvider = {
    async generateEdition() {
      calls += 1;
      // Missing summaries object - not repaired
      const bad = edition(targetDate);
      bad.stories[0].summaries = null;
      return bad;
    }
  };
  await assert.rejects(
    prepareEdition({
      targetDate,
      candidates,
      summaryProvider,
      summaryContexts: SUMMARY_CONTEXTS,
      eventLogger: noopLogger,
      generationAttempts: 2
    }),
    /summaries/
  );
  assert.equal(calls, 2);
});

test("still rejects a malformed edition after date normalization and repair", async () => {
  const summaryProvider = {
    async generateEdition() {
      // Missing summaries object entirely - not repairable
      const wrong = edition("2026-08-17");
      wrong.stories[0].summaries = null;
      return wrong;
    }
  };
  await assert.rejects(
    prepareEdition({
      targetDate,
      candidates,
      summaryProvider,
      summaryContexts: SUMMARY_CONTEXTS,
      eventLogger: noopLogger
    }),
    /summaries/i
  );
});

