import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryEditionRepository } from "../adapters/memory-edition-repository.mjs";
import { editorialDate } from "../domain/editorial-date.mjs";
import { generateDailyEdition } from "../jobs/generate-daily-edition.mjs";
import { runScheduledEdition } from "../jobs/run-scheduled-edition.mjs";
import { SUMMARY_FEATURE_CONFIG } from "../../../product/summary-features.mjs";

const targetDate = "2026-08-24";

test("derives editorial dates at UTC calendar boundaries", () => {
  assert.equal(editorialDate(new Date("2026-08-23T23:59:59Z")), "2026-08-23");
  assert.equal(editorialDate(new Date("2026-08-24T00:00:00Z")), "2026-08-24");
});

function edition() {
  const summaries = (text) => {
    const compact = `${text} quick take. `.repeat(10);
    const standard = [
      `- ${text} provides the key news update and identifies the specific development readers need to understand today.`,
      `- The change matters because it affects how teams evaluate products, research, or practical deployment choices.`,
      `- Readers should watch the next release, adoption signal, or evidence that shows whether the impact will persist.`
    ].join("\n");
    const detailedParagraph = `${text} deep dive explains the development with useful context for readers who need more than the headline. It connects the announcement to practical decisions, likely effects on teams, and the evidence worth checking before drawing a conclusion. `;
    return { compact, standard, detailed: `${detailedParagraph}\n\n${detailedParagraph.repeat(2)}` };
  };
  return {
    date: targetDate,
    briefing: {
      eyebrow: "Fresh briefing",
      title: "Daily briefing.",
      emphasis: "Less noise.",
      summary: "Today's useful updates.",
      meta: ["4 stories"]
    },
    stories: [
      { id: "one", type: "lead", category: "Models", title: "One", summaries: summaries("One"), href: "https://example.com/1", art: "models" },
      { id: "two", category: "Agents", title: "Two", summaries: summaries("Two"), href: "https://example.com/2", art: "agents" },
      { id: "three", category: "Research", title: "Three", summaries: summaries("Three"), href: "https://example.com/3", art: "research" },
      { id: "four", type: "wide", category: "Business", title: "Four", summaries: summaries("Four"), href: "https://example.com/4", art: "business" }
    ]
  };
}

test("skips an existing edition", async () => {
  const repository = createMemoryEditionRepository([edition()]);
  const result = await generateDailyEdition({ targetDate, editionRepository: repository });
  assert.equal(result.status, "skipped");
  assert.match(result.reason, /already exists/i);
  assert.equal(repository.runs[0].status, "skipped");
});

test("skips safely when providers are absent", async () => {
  const repository = createMemoryEditionRepository();
  const result = await generateDailyEdition({ targetDate, editionRepository: repository });
  assert.equal(result.status, "skipped");
  assert.match(result.reason, /no content source is configured/i);
  assert.equal(repository.editions.size, 0);
});

test("reports a missing summary provider when sources are configured", async () => {
  const repository = createMemoryEditionRepository();
  const result = await generateDailyEdition({
    targetDate,
    editionRepository: repository,
    contentSources: [{ async fetchCandidates() { return []; } }]
  });

  assert.match(result.reason, /no summary provider is configured/i);
  assert.equal(repository.editions.size, 0);
});

test("deduplicates candidates and saves a validated edition", async () => {
  const repository = createMemoryEditionRepository();
  let receivedCandidates;
  const source = {
    async fetchCandidates() {
      return [
        { url: "https://example.com/a" },
        { url: "https://example.com/a" },
        { url: "https://example.com/b" }
      ];
    }
  };
  const summaryProvider = {
    async generateEdition({ candidates }) {
      receivedCandidates = candidates;
      return edition();
    }
  };

  const result = await generateDailyEdition({
    targetDate,
    editionRepository: repository,
    contentSources: [source],
    summaryProvider,
    logger: {}
  });
  assert.equal(receivedCandidates.length, 2);
  assert.equal(result.status, "succeeded");
  assert.equal(repository.editions.size, 1);
  assert.equal(repository.editions.get(targetDate).status, "draft");
  assert.deepEqual(repository.runs.map((run) => run.status), ["succeeded"]);
  assert.match(result.runId, /^[0-9a-f-]{36}$/);
  assert.ok(repository.events.every((event) => event.runId === result.runId));
  assert.deepEqual(repository.events.map((event) => event.sequence), Array.from({ length: repository.events.length }, (_, index) => index + 1));
  assert.ok(repository.events.some((event) => event.event === "candidate-deduplication-complete"));
  assert.ok(repository.events.some((event) => event.event === "story-summary-validated"));
});

test("publishes a validated edition when automatic publication is enabled", async () => {
  const repository = createMemoryEditionRepository();
  const result = await generateDailyEdition({
    targetDate,
    editionRepository: repository,
    contentSources: [{ async fetchCandidates() { return [{ url: "https://example.com/a" }]; } }],
    summaryProvider: { async generateEdition() { return edition(); } },
    automaticallyPublish: true,
    logger: {}
  });

  test("stores only configured generated summary contexts", async () => {
    const repository = createMemoryEditionRepository();
    await generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [{ async fetchCandidates() { return [{ url: "https://example.com/a" }]; } }],
      summaryProvider: { async generateEdition() { return edition(); } },
      summaryContexts: { detailed: SUMMARY_FEATURE_CONFIG.contexts.detailed },
      logger: {}
    });

    assert.deepEqual(Object.keys(repository.editions.get(targetDate).stories[0].summaries), ["detailed"]);
  });

  assert.equal(result.publicationStatus, "published");
  assert.equal(repository.editions.get(targetDate).status, "published");
  assert.match(repository.runs.at(-1).details, /published edition/i);
});

test("records a failed run when validation rejects an edition", async () => {
  const repository = createMemoryEditionRepository();
  const source = { async fetchCandidates() { return [{ url: "https://example.com/a" }]; } };
  const summaryProvider = {
    async generateEdition() {
      const invalid = edition();
      invalid.stories = invalid.stories.slice(0, 3);
      return invalid;
    }
  };

  await assert.rejects(
    generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [source],
      summaryProvider,
      logger: {}
    }),
    /four or five stories/
  );
  assert.deepEqual(repository.runs.map((run) => run.status), ["failed"]);
  assert.equal(repository.editions.size, 0);
  assert.ok(repository.events.some((event) => event.event === "edition-validation-failed" && event.outcome === "failed"));
});

test("rejects editions with unsupported artwork or multiple wide stories", async () => {
  const repository = createMemoryEditionRepository();
  const summaryProvider = {
    async generateEdition() {
      const invalid = edition();
      invalid.stories[1].art = "infrastructure";
      invalid.stories[2].type = "wide";
      invalid.stories[3].type = "wide";
      return invalid;
    }
  };

  await assert.rejects(
    generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [{ async fetchCandidates() { return [{ url: "https://example.com/a" }]; } }],
      summaryProvider,
      logger: {}
    }),
    /unsupported story artwork/i
  );
});

test("rejects editions missing a configured summary layer", async () => {
  const repository = createMemoryEditionRepository();
  const summaryProvider = {
    async generateEdition() {
      const invalid = edition();
      delete invalid.stories[0].summaries.detailed;
      return invalid;
    }
  };

  await assert.rejects(
    generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [{ async fetchCandidates() { return [{ url: "https://example.com/a" }]; } }],
      summaryProvider,
      logger: {}
    }),
    /summaries\.detailed/
  );
});

test("rejects editions with duplicated summary layers", async () => {
  const repository = createMemoryEditionRepository();
  const summaryProvider = {
    async generateEdition() {
      const invalid = edition();
      invalid.stories[0].summaries.detailed = invalid.stories[0].summaries.standard;
      return invalid;
    }
  };

  await assert.rejects(
    generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [{ async fetchCandidates() { return [{ url: "https://example.com/a" }]; } }],
      summaryProvider,
      logger: {}
    }),
    /distinct summary contexts/
  );
});

test("rejects summaries outside their configured character bounds", async () => {
  const repository = createMemoryEditionRepository();
  const summaryProvider = {
    async generateEdition() {
      const invalid = edition();
      invalid.stories[0].summaries.compact = "Too short.";
      return invalid;
    }
  };

  await assert.rejects(
    generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [{ async fetchCandidates() { return [{ url: "https://example.com/a" }]; } }],
      summaryProvider,
      logger: {}
    }),
    /summaries\.compact.*between 100 and 180 characters/i
  );
});

test("rejects summaries that exceed their configured character bounds", async () => {
  const repository = createMemoryEditionRepository();
  const summaryProvider = {
    async generateEdition() {
      const invalid = edition();
      invalid.stories[0].summaries.detailed = `${invalid.stories[0].summaries.detailed}\n\n${"Additional detail. ".repeat(30)}`;
      return invalid;
    }
  };

  await assert.rejects(
    generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [{ async fetchCandidates() { return [{ url: "https://example.com/a" }]; } }],
      summaryProvider,
      logger: {}
    }),
    /summaries\.detailed.*between 500 and 900 characters/i
  );
});

test("rejects Overview summaries that are not bullet points", async () => {
  const repository = createMemoryEditionRepository();
  const summaryProvider = {
    async generateEdition() {
      const invalid = edition();
      invalid.stories[0].summaries.standard = "This Overview summary has sufficient length but is intentionally written as a paragraph instead of the required bullet list. It describes why the development matters and what readers should monitor next so that it remains inside the configured character range.";
      return invalid;
    }
  };

  await assert.rejects(
    generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [{ async fetchCandidates() { return [{ url: "https://example.com/a" }]; } }],
      summaryProvider,
      logger: {}
    }),
    /summaries\.standard.*three or four bullet points/i
  );
});

test("rejects Deep dive summaries that are not broken into paragraphs", async () => {
  const repository = createMemoryEditionRepository();
  const summaryProvider = {
    async generateEdition() {
      const invalid = edition();
      invalid.stories[0].summaries.detailed = "One uninterrupted Deep dive sentence is repeated to satisfy the configured length while deliberately omitting the required blank-line paragraph breaks. ".repeat(5);
      return invalid;
    }
  };

  await assert.rejects(
    generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [{ async fetchCandidates() { return [{ url: "https://example.com/a" }]; } }],
      summaryProvider,
      logger: {}
    }),
    /summaries\.detailed.*two to four paragraphs/i
  );
});

test("rejects briefing copy that cannot fit the bento layout", async () => {
  const repository = createMemoryEditionRepository();
  const summaryProvider = {
    async generateEdition() {
      const invalid = edition();
      invalid.briefing.emphasis = "This generated briefing emphasis is intentionally far too long for the compact bento layout.";
      return invalid;
    }
  };

  await assert.rejects(
    generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [{ async fetchCandidates() { return [{ url: "https://example.com/a" }]; } }],
      summaryProvider,
      logger: {}
    }),
    /briefing\.emphasis.*50 characters/i
  );
});

test("runs through a scheduler-neutral dependency factory", async () => {
  const repository = createMemoryEditionRepository();
  let receivedTargetDate;
  const result = await runScheduledEdition({
    scheduledAt: new Date("2026-08-23T19:00:00Z"),
    async createDependencies({ targetDate, scheduledAt }) {
      receivedTargetDate = targetDate;
      assert.equal(scheduledAt.toISOString(), "2026-08-23T19:00:00.000Z");
      return { editionRepository: repository, logger: {} };
    }
  });

  assert.equal(receivedTargetDate, "2026-08-23");
  assert.equal(result.status, "skipped");
  assert.equal(repository.runs[0].targetDate, "2026-08-23");
});
