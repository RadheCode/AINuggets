import test from "node:test";
import assert from "node:assert/strict";
import { parseEnvFile } from "../cli/test-provider-config.mjs";

test("parses editable provider configuration without retaining comments", () => {
  assert.deepEqual(parseEnvFile(`
    # Provider configuration
    SUMMARY_PROVIDER_URL=https://model.example/v1
    SUMMARY_PROVIDER_API_KEY="secret value"
    CONTENT_SOURCE_URL=
  `), {
    SUMMARY_PROVIDER_URL: "https://model.example/v1",
    SUMMARY_PROVIDER_API_KEY: "secret value",
    CONTENT_SOURCE_URL: ""
  });
});

test("rejects provider configuration lines without an equals sign", () => {
  assert.throws(() => parseEnvFile("SUMMARY_PROVIDER_URL"), /Invalid configuration line/);
});
