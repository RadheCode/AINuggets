import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryEditionRepository } from "../adapters/memory-edition-repository.mjs";
import { generateDailyEdition } from "../jobs/generate-daily-edition.mjs";
import { runScheduledEdition } from "../jobs/run-scheduled-edition.mjs";

const targetDate = "2026-08-24";

function edition() {
  return {
    date: targetDate,
    briefing: {
      eyebrow: "Fresh briefing",
      title: "AI news.",
      emphasis: "Less noise.",
      summary: "Today's useful updates.",
      meta: ["4 stories"]
    },
    stories: [
      { id: "one", type: "lead", category: "Models", title: "One", summary: "One summary", href: "https://example.com/1", art: "models" },
      { id: "two", category: "Agents", title: "Two", summary: "Two summary", href: "https://example.com/2", art: "agents" },
      { id: "three", category: "Research", title: "Three", summary: "Three summary", href: "https://example.com/3", art: "research" },
      { id: "four", type: "wide", category: "Business", title: "Four", summary: "Four summary", href: "https://example.com/4", art: "business" }
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
  assert.deepEqual(repository.runs.map((run) => run.status), ["started", "succeeded"]);
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
  assert.deepEqual(repository.runs.map((run) => run.status), ["started", "failed"]);
  assert.equal(repository.editions.size, 0);
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
    timezone: "Asia/Kolkata",
    async createDependencies({ targetDate, scheduledAt }) {
      receivedTargetDate = targetDate;
      assert.equal(scheduledAt.toISOString(), "2026-08-23T19:00:00.000Z");
      return { editionRepository: repository, logger: {} };
    }
  });

  assert.equal(receivedTargetDate, targetDate);
  assert.equal(result.status, "skipped");
  assert.equal(repository.runs[0].targetDate, targetDate);
});
