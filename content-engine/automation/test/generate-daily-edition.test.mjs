import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryEditionRepository } from "../adapters/memory-edition-repository.mjs";
import { editorialDate } from "../domain/editorial-date.mjs";
import { generateDailyEdition } from "../jobs/generate-daily-edition.mjs";
import { runScheduledEdition } from "../jobs/run-scheduled-edition.mjs";
import { SUMMARY_FEATURE_CONFIG } from "../../../product/summary-features.mjs";

const targetDate = "2026-08-24";

function candidateSource(candidates = Array.from({ length: 5 }, (_, index) => ({
  url: `https://example.com/candidate-${index + 1}`,
  category: `Category ${index + 1}`
}))) {
  return { async fetchCandidates() { return candidates; } };
}

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

test("runs a dry run for an existing edition without overwriting it", async () => {
  const original = edition();
  const repository = createMemoryEditionRepository([original]);
  const result = await generateDailyEdition({
    targetDate,
    editionRepository: repository,
    contentSources: [candidateSource()],
    summaryProvider: { async generateEdition() { return edition(); } },
    dryRun: true,
    logger: {}
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.dryRun, true);
  assert.equal(repository.editions.size, 1);
  assert.strictEqual(repository.editions.get(targetDate), original);
  assert.equal(repository.runs[0].status, "succeeded");
  assert.ok(repository.events.some((event) => event.event === "existing-edition-bypassed" && event.metadata.mode === "dry-run"));
  assert.ok(repository.events.some((event) => event.event === "edition-save-skipped" && event.outcome === "skipped"));
});

test("replaces an existing edition only when force replacement is enabled", async () => {
  const original = edition();
  const replacement = edition();
  replacement.briefing.title = "Replacement briefing.";
  const repository = createMemoryEditionRepository([original]);

  const result = await generateDailyEdition({
    targetDate,
    editionRepository: repository,
    contentSources: [candidateSource()],
    summaryProvider: { async generateEdition() { return replacement; } },
    forceReplace: true,
    logger: {}
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.forceReplace, true);
  assert.equal(repository.editions.size, 1);
  assert.equal(repository.editions.get(targetDate).briefing.title, "Replacement briefing.");
  assert.ok(repository.events.some((event) => event.event === "existing-edition-bypassed" && event.metadata.mode === "force-replace"));
  assert.ok(repository.events.some((event) => event.event === "edition-save-succeeded" && event.metadata.forceReplace === true));
});

test("rejects a run configured as both dry and force replacement", async () => {
  await assert.rejects(
    generateDailyEdition({
      targetDate,
      editionRepository: createMemoryEditionRepository(),
      dryRun: true,
      forceReplace: true
    }),
    /cannot be both dryRun and forceReplace/i
  );
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

test("deduplicates candidates, replenishes selection, and saves a validated edition", async () => {
  const repository = createMemoryEditionRepository();
  let receivedCandidates;
  const source = {
    async fetchCandidates() {
      return [
        { url: "https://example.com/a", category: "Models" },
        { url: "https://example.com/a?utm_source=feed", category: "Models" },
        ...Array.from({ length: 5 }, (_, index) => ({ url: `https://example.com/b${index + 1}`, category: `Category ${index + 1}` }))
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
  assert.equal(receivedCandidates.length, 5);
  assert.equal(result.status, "succeeded");
  assert.equal(repository.editions.size, 1);
  assert.equal(repository.editions.get(targetDate).status, "draft");
  assert.deepEqual(repository.runs.map((run) => run.status), ["succeeded"]);
  assert.match(result.runId, /^[0-9a-f-]{36}$/);
  assert.ok(repository.events.every((event) => event.runId === result.runId));
  assert.deepEqual(repository.events.map((event) => event.sequence), Array.from({ length: repository.events.length }, (_, index) => index + 1));
  const flattened = repository.events.find((event) => event.event === "candidate-batches-flattened");
  const canonicalized = repository.events.find((event) => event.event === "candidate-urls-canonicalized");
  const deduplicated = repository.events.find((event) => event.event === "candidate-deduplication-complete");
  const ordered = repository.events.find((event) => event.event === "eligible-candidates-ordered");
  const diversified = repository.events.find((event) => event.event === "category-diversity-selection-complete");
  const selected = repository.events.find((event) => event.event === "ranked-candidates-selected");
  assert.equal(flattened.metadata.sourceBatches[0].candidates.length, 7);
  assert.equal(canonicalized.metadata.candidates[1].canonicalUrl, "https://example.com/a");
  assert.deepEqual(deduplicated.metadata.removedCandidates, [{
    url: "https://example.com/a?utm_source=feed",
    canonicalUrl: "https://example.com/a",
    sourceName: null,
    category: "Models",
    sourcePublishedAt: null,
    priority: null,
    collectionIndex: 2,
    reason: "duplicate-canonical-url",
    retainedCollectionIndex: 1
  }]);
  assert.equal(deduplicated.metadata.retainedCandidates.length, 6);
  assert.equal(ordered.metadata.orderedCandidates.length, 6);
  assert.equal(diversified.metadata.categorySelections.length, 5);
  assert.equal(selected.metadata.selected.length, 5);
  assert.ok(repository.events.some((event) => event.event === "story-summary-validated"));
});

test("excludes canonical URLs published during the prior ten editorial days and selects replacements", async () => {
  const previouslyPublished = edition();
  previouslyPublished.date = "2026-08-14";
  previouslyPublished.status = "published";
  previouslyPublished.stories[0].href = "https://example.com/repeated?token=previous-secret";
  const repository = createMemoryEditionRepository([previouslyPublished]);
  let receivedCandidates;

  await generateDailyEdition({
    targetDate,
    editionRepository: repository,
    contentSources: [candidateSource([
      { url: "https://example.com/repeated?token=previous-secret#today", category: "Models" },
      ...Array.from({ length: 5 }, (_, index) => ({ url: `https://example.com/new-${index + 1}`, category: `Category ${index + 1}` }))
    ])],
    summaryProvider: {
      async generateEdition({ candidates }) {
        receivedCandidates = candidates;
        return edition();
      }
    },
    logger: {}
  });

  assert.equal(receivedCandidates.length, 5);
  assert.ok(receivedCandidates.every((candidate) => candidate.canonicalUrl !== "https://example.com/repeated?token=previous-secret"));
  const history = repository.events.find((event) => event.event === "recent-published-candidates-excluded").metadata;
  assert.equal(history.startDate, "2026-08-14");
  assert.equal(history.endDate, targetDate);
  assert.ok(history.historicalUrls.some((url) => (
    url.url === "https://example.com/repeated?token=%5Bredacted%5D"
    && url.canonicalUrl === "https://example.com/repeated?token=%5Bredacted%5D"
  )));
  assert.equal(history.excludedCandidateCount, 1);
  assert.deepEqual(history.excludedCandidates.map((candidate) => candidate.canonicalUrl), ["https://example.com/repeated?token=%5Bredacted%5D"]);
  assert.equal(history.eligibleCandidates.length, 5);
});

test("does not exclude draft or older published stories", async () => {
  const draft = edition();
  draft.date = "2026-08-23";
  draft.status = "draft";
  draft.stories[0].href = "https://example.com/draft";
  const oldPublished = edition();
  oldPublished.date = "2026-08-13";
  oldPublished.status = "published";
  oldPublished.stories[0].href = "https://example.com/old";
  const repository = createMemoryEditionRepository([draft, oldPublished]);
  let receivedCandidates;

  await generateDailyEdition({
    targetDate,
    editionRepository: repository,
    contentSources: [candidateSource([
      { url: "https://example.com/draft", category: "Models" },
      { url: "https://example.com/old", category: "Research" },
      ...Array.from({ length: 3 }, (_, index) => ({ url: `https://example.com/new-${index + 1}`, category: `Category ${index + 1}` }))
    ])],
    summaryProvider: {
      async generateEdition({ candidates }) {
        receivedCandidates = candidates;
        return edition();
      }
    },
    logger: {}
  });

  assert.deepEqual(receivedCandidates.map((candidate) => candidate.canonicalUrl).sort(), [
    "https://example.com/draft",
    "https://example.com/new-1",
    "https://example.com/new-2",
    "https://example.com/new-3",
    "https://example.com/old"
  ]);
});

test("fails before requesting a summary when fewer than five eligible candidates remain", async () => {
  const repository = createMemoryEditionRepository();
  let requested = false;

  await assert.rejects(
    generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [candidateSource(Array.from({ length: 4 }, (_, index) => ({ url: `https://example.com/${index + 1}` })))],
      summaryProvider: {
        async generateEdition() {
          requested = true;
          return edition();
        }
      },
      logger: {}
    }),
    /exactly 5 eligible candidates/i
  );

  assert.equal(requested, false);
  assert.equal(repository.runs[0].status, "failed");
});

test("publishes a validated edition when automatic publication is enabled", async () => {
  const repository = createMemoryEditionRepository();
  const result = await generateDailyEdition({
    targetDate,
    editionRepository: repository,
    contentSources: [candidateSource()],
    summaryProvider: { async generateEdition() { return edition(); } },
    automaticallyPublish: true,
    logger: {}
  });

  test("stores only configured generated summary contexts", async () => {
    const repository = createMemoryEditionRepository();
    await generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [candidateSource()],
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
  const source = candidateSource();
  const summaryProvider = {
    async generateEdition() {
      // Missing summaries entirely - not repairable
      const invalid = edition();
      invalid.stories[0].summaries = null;
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
    /summaries/
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
      contentSources: [candidateSource()],
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
      contentSources: [candidateSource()],
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
      contentSources: [candidateSource()],
      summaryProvider,
      logger: {}
    }),
    /distinct summary contexts/
  );
});

test("rejects summaries below their configured minimum character count", async () => {
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
      contentSources: [candidateSource()],
      summaryProvider,
      logger: {}
    }),
    /summaries\.compact.*at least 100 characters/i
  );
});

test("accepts summaries that exceed their configured character target", async () => {
  const repository = createMemoryEditionRepository();
  const summaryProvider = {
    async generateEdition() {
      const invalid = edition();
      invalid.stories[0].summaries.detailed = `${invalid.stories[0].summaries.detailed}\n\n${"Additional detail. ".repeat(30)}`;
      return invalid;
    }
  };

  const result = await generateDailyEdition({
    targetDate,
    editionRepository: repository,
    contentSources: [candidateSource()],
    summaryProvider,
    logger: {}
  });

  assert.equal(result.status, "succeeded");
  assert.ok(repository.editions.get(targetDate).stories[0].summaries.detailed.length > 900);
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
      contentSources: [candidateSource()],
      summaryProvider,
      logger: {}
    }),
    /must contain three or four bullet points/i
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
      contentSources: [candidateSource()],
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
      contentSources: [candidateSource()],
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

  test("replaces an existing published edition when the scheduled same-day refresh is enabled", async () => {
    const original = edition();
    original.status = "published";
    const replacement = edition();
    replacement.briefing.title = "Same-day refresh briefing.";
    const repository = createMemoryEditionRepository([original]);

    const result = await generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [candidateSource()],
      summaryProvider: { async generateEdition() { return replacement; } },
      automaticallyPublish: true,
      refreshExisting: true,
      logger: {}
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.refreshExisting, true);
    assert.equal(result.publicationStatus, "published");
    assert.equal(repository.editions.size, 1);
    assert.equal(repository.editions.get(targetDate).briefing.title, "Same-day refresh briefing.");
    assert.equal(repository.editions.get(targetDate).status, "published");
    assert.ok(repository.events.some((event) => event.event === "existing-edition-bypassed" && event.metadata.mode === "scheduled-refresh"));
    assert.ok(repository.events.some((event) => event.event === "edition-save-succeeded" && event.metadata.refreshExisting === true));
    assert.match(repository.runs.at(-1).details, /Refreshed published edition/i);
  });

  test("excludes same-day published story URLs from candidates during a scheduled refresh", async () => {
    const morningEdition = edition();
    morningEdition.status = "published";
    const repository = createMemoryEditionRepository([morningEdition]);
    let receivedCandidates;

    await generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [candidateSource([
        { url: "https://example.com/1", category: "Models" },
        { url: "https://example.com/2", category: "Agents" },
        { url: "https://example.com/3", category: "Research" },
        { url: "https://example.com/4", category: "Business" },
        ...Array.from({ length: 5 }, (_, index) => ({ url: `https://example.com/fresh-${index + 1}`, category: `Category ${index + 1}` }))
      ])],
      summaryProvider: {
        async generateEdition({ candidates }) {
          receivedCandidates = candidates;
          return edition();
        }
      },
      refreshExisting: true,
      logger: {}
    });

    assert.equal(receivedCandidates.length, 5);
    assert.ok(receivedCandidates.every((candidate) => candidate.canonicalUrl.startsWith("https://example.com/fresh-")));
    const history = repository.events.find((event) => event.event === "recent-published-candidates-excluded").metadata;
    assert.equal(history.refreshExisting, true);
    assert.equal(history.startDate, "2026-08-14");
    assert.equal(history.endDate, "2026-08-25");
    assert.deepEqual(history.excludedCandidates.map((candidate) => candidate.canonicalUrl), [
      "https://example.com/1",
      "https://example.com/2",
      "https://example.com/3",
      "https://example.com/4"
    ]);
  });

  test("creates a normal edition when a scheduled refresh runs with no existing edition", async () => {
    const repository = createMemoryEditionRepository();

    const result = await generateDailyEdition({
      targetDate,
      editionRepository: repository,
      contentSources: [candidateSource()],
      summaryProvider: { async generateEdition() { return edition(); } },
      refreshExisting: true,
      logger: {}
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.refreshExisting, true);
    assert.equal(repository.editions.size, 1);
    assert.equal(repository.editions.get(targetDate).status, "draft");
    assert.equal(repository.events.some((event) => event.event === "existing-edition-bypassed"), false);
    assert.ok(repository.events.some((event) => event.event === "edition-save-succeeded" && event.metadata.refreshExisting === true));
  });

  test("rejects a run configured as both scheduled refresh and force replacement", async () => {
    await assert.rejects(
      generateDailyEdition({
        targetDate,
        editionRepository: createMemoryEditionRepository(),
        refreshExisting: true,
        forceReplace: true
      }),
      /cannot be both a same-day refresh and a force replace/i
    );
  });

  test("forwards refreshExisting through the scheduler-neutral runner", async () => {
    const repository = createMemoryEditionRepository();

    const result = await runScheduledEdition({
      scheduledAt: new Date("2026-08-24T19:00:00Z"),
      refreshExisting: true,
      async createDependencies() {
        return {
          editionRepository: repository,
          contentSources: [candidateSource()],
          summaryProvider: { async generateEdition() { return edition(); } },
          automaticallyPublish: false,
          logger: {}
        };
      }
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.targetDate, "2026-08-24");
    assert.equal(result.refreshExisting, true);
    assert.ok(repository.events.some((event) => event.event === "edition-save-succeeded" && event.metadata.refreshExisting === true));
  });
