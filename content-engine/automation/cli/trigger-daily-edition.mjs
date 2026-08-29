import { isValidEditorialDate } from "../domain/editorial-date.mjs";

function readArgument(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

const endpoint = process.env.CONTENT_AUTOMATION_URL;
const token = process.env.CONTENT_AUTOMATION_TOKEN;
const targetDate = readArgument("date");
const forceReplace = hasFlag("force-replace");

if (!token) {
  throw new Error("Set CONTENT_AUTOMATION_TOKEN before triggering content generation.");
}
if (!endpoint) {
  throw new Error("Set CONTENT_AUTOMATION_URL to the beta or production internal generation endpoint.");
}
if (targetDate && !isValidEditorialDate(targetDate)) {
  throw new Error(`Invalid --date value: ${targetDate}. Use YYYY-MM-DD.`);
}
if (forceReplace && !targetDate) {
  throw new Error("--force-replace requires --date=YYYY-MM-DD.");
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    ...(targetDate ? { targetDate } : {}),
    ...(forceReplace ? { forceReplace: true } : {})
  })
});
const body = await response.json();

if (!response.ok) {
  throw new Error(`Automation trigger failed (${response.status}): ${body.error || response.statusText}`);
}

console.log(JSON.stringify(body, null, 2));
