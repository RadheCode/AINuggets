import { isValidEditorialDate } from "../../../../content-engine/automation/domain/editorial-date.mjs";

const EDITION_NUMBER_MAX = 50;

export function isValidEditionNumber(value) {
  return Number.isInteger(value) && value >= 1 && value <= EDITION_NUMBER_MAX;
}

export function normalizeEditionPath(pathname) {
  return String(pathname || "").replace(/\/+$/, "") || "/";
}

export function parseEditionPath(urlOrString) {
  const input = urlOrString instanceof URL ? urlOrString : new URL(String(urlOrString), "http://local");
  const pathname = normalizeEditionPath(input.pathname);
  const match = pathname.match(/^\/api\/editions\/(latest|\d{4}-\d{2}-\d{2})$/);
  if (!match) return { error: "Not found." };

  const editionNumberRaw = input.searchParams.get("edition");
  let editionNumber;
  if (editionNumberRaw !== null && editionNumberRaw.trim() !== "") {
    const num = Number(editionNumberRaw);
    if (!Number.isInteger(num) || num < 1) {
      return { error: "Invalid edition number. Use a positive integer." };
    }
    if (!isValidEditionNumber(num)) {
      return { error: `The requested edition is out of range (max ${EDITION_NUMBER_MAX}).` };
    }
    editionNumber = num;
  }

  const segment = match[1];
  if (segment === "latest") {
    if (editionNumber !== undefined) {
      return { error: "The latest edition does not take an edition number." };
    }
    return { isLatest: true, editionNumber: undefined, date: undefined };
  }

  if (!isValidEditorialDate(segment)) {
    return { error: "Invalid edition date. Use YYYY-MM-DD." };
  }
  return { isLatest: false, date: segment, editionNumber };
}