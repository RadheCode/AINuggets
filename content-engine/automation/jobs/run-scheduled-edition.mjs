import { editorialDate } from "../domain/editorial-date.mjs";
import { generateDailyEdition } from "./generate-daily-edition.mjs";

export async function runScheduledEdition({
  scheduledAt = new Date(),
  timezone = "UTC",
  createDependencies
}) {
  if (!(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
    throw new Error("A valid scheduled time is required.");
  }
  if (typeof createDependencies !== "function") {
    throw new Error("A dependency factory is required.");
  }

  const targetDate = editorialDate(timezone, scheduledAt);
  const dependencies = await createDependencies({ targetDate, scheduledAt });

  return generateDailyEdition({ targetDate, ...dependencies });
}
