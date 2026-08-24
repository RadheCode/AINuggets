import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { runScheduledEdition } from "../jobs/run-scheduled-edition.mjs";

function readArgument(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const adapterPath = readArgument("adapter");
const scheduledAtValue = readArgument("scheduled-at");

if (!adapterPath) {
  throw new Error("Pass --adapter=path/to/automation-adapter.mjs.");
}

const scheduledAt = scheduledAtValue ? new Date(scheduledAtValue) : new Date();
const adapter = await import(pathToFileURL(resolve(adapterPath)).href);
const createDependencies = adapter.createAutomationDependencies || adapter.default;

const result = await runScheduledEdition({
  scheduledAt,
  createDependencies
});

console.log(JSON.stringify(result, null, 2));
