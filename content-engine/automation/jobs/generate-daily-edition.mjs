import { isValidEditorialDate } from "../domain/editorial-date.mjs";
import { validateEdition } from "../domain/validate-edition.mjs";

const SKIP_EXISTING = "Edition already exists.";
const SKIP_NO_CONTENT_SOURCE = "No content source is configured; no edition was generated.";
const SKIP_NO_SUMMARY_PROVIDER = "No summary provider is configured; no edition was generated.";

function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = candidate.canonicalUrl || candidate.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function generateDailyEdition({
  targetDate,
  editionRepository,
  contentSources = [],
  summaryProvider,
  automaticallyPublish = false,
  logger = console
}) {
  if (!isValidEditorialDate(targetDate)) throw new Error(`Invalid target date: ${targetDate}.`);
  if (!editionRepository) throw new Error("An edition repository is required.");

  if (await editionRepository.hasEdition(targetDate)) {
    await editionRepository.recordRun({ targetDate, status: "skipped", details: SKIP_EXISTING });
    return { targetDate, status: "skipped", reason: SKIP_EXISTING };
  }

  if (!contentSources.length) {
    await editionRepository.recordRun({ targetDate, status: "skipped", details: SKIP_NO_CONTENT_SOURCE });
    return { targetDate, status: "skipped", reason: SKIP_NO_CONTENT_SOURCE };
  }

  if (!summaryProvider) {
    await editionRepository.recordRun({ targetDate, status: "skipped", details: SKIP_NO_SUMMARY_PROVIDER });
    return { targetDate, status: "skipped", reason: SKIP_NO_SUMMARY_PROVIDER };
  }

  await editionRepository.recordRun({ targetDate, status: "started" });

  try {
    const batches = await Promise.all(
      contentSources.map((source) => source.fetchCandidates({ targetDate }))
    );
    const candidates = uniqueCandidates(batches.flat());
    const edition = validateEdition(
      await summaryProvider.generateEdition({ targetDate, candidates }),
      targetDate
    );

    await editionRepository.saveEdition(edition, { status: automaticallyPublish ? "published" : "draft" });
    await editionRepository.recordRun({
      targetDate,
      status: "succeeded",
      details: `Created ${automaticallyPublish ? "published" : "draft"} edition with ${edition.stories.length} stories.`
    });
    logger.info?.(`Created ${automaticallyPublish ? "published" : "draft"} edition for ${targetDate}.`);
    return { targetDate, status: "succeeded", storyCount: edition.stories.length, publicationStatus: automaticallyPublish ? "published" : "draft" };
  } catch (error) {
    await editionRepository.recordRun({
      targetDate,
      status: "failed",
      details: error instanceof Error ? error.message : String(error)
    });
    logger.error?.(`Daily edition generation failed for ${targetDate}.`, error);
    throw error;
  }
}
