export function utcActivityDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function earliestContinuationDate(date, maximumDaysBetweenQualifyingActivities) {
  const earliestDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - maximumDaysBetweenQualifyingActivities
  ));
  return utcActivityDate(earliestDate);
}
