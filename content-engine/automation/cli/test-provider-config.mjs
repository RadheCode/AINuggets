import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createGenerationProviderDependencies } from "../config/create-generation-provider-dependencies.mjs";
import { prepareEdition } from "../pipeline/prepare-edition.mjs";

const DEFAULT_CONFIG_PATH = "content-engine/automation/config/providers.local.env";
const TEST_DATE = "2026-08-24";

function readArgument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

export function parseEnvFile(contents) {
  return Object.fromEntries(contents.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return [];
    const separator = trimmed.indexOf("=");
    if (separator === -1) throw new Error(`Invalid configuration line: ${line}`);
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    return [[name, value]];
  }));
}

function testCandidates() {
  return [
    ["models", "Models"],
    ["agents", "Agents"],
    ["research", "Research"],
    ["business", "Business"],
    ["product", "Product"]
  ].map(([id, category]) => ({
    url: `https://example.com/${id}`,
    canonicalUrl: `https://example.com/${id}`,
    title: `Test ${category} candidate`,
    excerpt: "This is test metadata used only to verify the configured summary provider.",
    sourceName: "Product provider check",
    sourceUrl: `https://example.com/${id}`,
    sourcePublishedAt: "2026-08-24T00:00:00.000Z",
    category
  }));
}

export async function testProviderConfig(configPath = resolve(readArgument("config") || DEFAULT_CONFIG_PATH)) {
  let values;
  try {
    values = parseEnvFile(await readFile(configPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Provider configuration was not found at '${configPath}'. Copy providers.example.env to providers.local.env first.`);
    }
    throw error;
  }

  const { summaryProvider, summaryContexts } = createGenerationProviderDependencies(values);
  if (!summaryProvider) throw new Error("No summary provider was configured. Provide the provider-specific variables (OPENROUTER_*, OPENAI_*, or WORKERS_AI_*) required by a fallbackOrder provider.");

  // Run the same pipeline production uses so date pinning, structural repair,
  // and validation retries match the real generation path.
  const noopEventLogger = { record: async () => {}, failure: async () => {} };
  return prepareEdition({
    targetDate: TEST_DATE,
    candidates: testCandidates(),
    summaryProvider,
    summaryContexts,
    eventLogger: noopEventLogger
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log("Testing summary provider with a small structured request...");
  testProviderConfig().then((edition) => {
    console.log(`Provider check passed: received a valid ${edition.stories.length}-story edition for ${edition.date}.`);
  }).catch((error) => {
    console.error(`Provider check failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
