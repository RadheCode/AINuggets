import "./config.js";

export const STREAK_FEATURE_CONFIG = globalThis.ProductConfig.readerEngagement?.streak;

export function validateStreakFeatureConfig(config = STREAK_FEATURE_CONFIG) {
  if (!config || typeof config !== "object") throw new Error("Streak feature configuration must be an object.");
  const { maximumDaysBetweenQualifyingActivities } = config;
  if (!Number.isInteger(maximumDaysBetweenQualifyingActivities)
    || maximumDaysBetweenQualifyingActivities < 1
    || maximumDaysBetweenQualifyingActivities > 365) {
    throw new Error("Streak maximumDaysBetweenQualifyingActivities must be an integer from 1 through 365.");
  }
  return config;
}
