import { isValidEditorialDate } from "../domain/editorial-date.mjs";
import { PRODUCT_EDITORIAL_CONFIG } from "../../../product/editorial-config.mjs";

function readArgument(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const endpoint = process.env.CONTENT_AUTOMATION_URL
  || PRODUCT_EDITORIAL_CONFIG.automation.betaTriggerUrl;
const token = process.env.CONTENT_AUTOMATION_TOKEN;
const targetDate = readArgument("date");

if (!token) {
  throw new Error("Set CONTENT_AUTOMATION_TOKEN before triggering content generation.");
}
if (targetDate && !isValidEditorialDate(targetDate)) {
  throw new Error(`Invalid --date value: ${targetDate}. Use YYYY-MM-DD.`);
}

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json"
  },
  body: JSON.stringify(targetDate ? { targetDate } : {})
});
const body = await response.json();

if (!response.ok) {
  throw new Error(`Automation trigger failed (${response.status}): ${body.error || response.statusText}`);
}

console.log(JSON.stringify(body, null, 2));
