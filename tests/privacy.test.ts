import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const applicationFiles = [
  "index.html",
  "src/main.ts",
  "src/state.ts",
  "src/sources.ts",
];
const prohibitedPatterns = [
  /localStorage/,
  /sessionStorage/,
  /indexedDB/,
  /document\.cookie/,
  /fetch\(/,
  /XMLHttpRequest/,
  /navigator\.serviceWorker/,
  /console\.(?:log|info|debug)\(/,
  /gtag\(/,
  /mixpanel/i,
  /analytics\.track/,
];

test("application source contains no prohibited persistence, API, analytics, or answer logging", async () => {
  const source = (
    await Promise.all(applicationFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");
  for (const pattern of prohibitedPatterns)
    assert.doesNotMatch(source, pattern);
});

test("health source registry includes required traceability fields", async () => {
  const source = await readFile("src/sources.ts", "utf8");
  for (const field of [
    "organization",
    "title",
    "url",
    "publicationDate",
    "accessed",
    "supportedStatement",
    "clinicalReview",
  ]) {
    assert.match(source, new RegExp(`${field}:`));
  }
  assert.match(source, /clinicalReview: "required"/);
  assert.doesNotMatch(source, /clinicalReview: "reviewed"/);
});

test("the interface does not include the outdated diagnostic-delay placeholder", async () => {
  const source = await readFile("src/main.ts", "utf8");
  assert.doesNotMatch(source, /7\s*[–-]\s*10 years/i);
});
