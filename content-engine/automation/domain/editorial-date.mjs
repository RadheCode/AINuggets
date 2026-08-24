const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidEditorialDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

export function editorialDate(instant = new Date()) {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new Error("A valid instant is required.");
  }
  return instant.toISOString().slice(0, 10);
}
