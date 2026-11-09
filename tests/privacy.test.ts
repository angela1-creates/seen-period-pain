import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  feedbackBody,
  feedbackEmail,
  feedbackMailto,
  feedbackSubject,
} from "../src/feedback.ts";

const applicationFiles = [
  "index.html",
  "src/main.ts",
  "src/feedback.ts",
  "src/share.ts",
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

test("feedback is guided without including SEEN answers", async () => {
  const source = await readFile("src/feedback.ts", "utf8");
  const html = await readFile("index.html", "utf8");
  assert.match(source, /angelacreates\.projects@gmail\.com/);
  assert.match(source, /What felt helpful/);
  assert.match(source, /What felt unclear or missing/);
  assert.match(source, /What would make SEEN more useful/);
  assert.match(
    source,
    /don’t include personal health or identifying information/,
  );
  assert.doesNotMatch(source, /SeenState|state\.|experience\.value/);
  assert.match(html, /Prefer another email app/);
  assert.match(html, /angelacreates\.projects@gmail\.com/);

  const link = new URL(feedbackMailto);
  assert.equal(link.protocol, "mailto:");
  assert.equal(link.pathname, feedbackEmail);
  assert.equal(link.searchParams.get("subject"), feedbackSubject);
  assert.equal(link.searchParams.get("body"), feedbackBody);
});

test("sharing never includes reflection answers", async () => {
  const source = await readFile("src/share.ts", "utf8");
  assert.doesNotMatch(source, /SeenState|state\.|answer|experience\.value/);
  assert.match(source, /healthcare conversation/);
});

test("the initial shell stays hidden until the complete introduction renders", async () => {
  const html = await readFile("index.html", "utf8");
  const application = await readFile("src/main.ts", "utf8");
  assert.match(html, /class="skip-link pre-render-hidden"/);
  assert.match(html, /site-header screen-only pre-render-hidden/);
  assert.match(html, /html\[data-ready="true"\] \.pre-render-hidden/);
  assert.match(
    application,
    /render\(\);\s*document\.documentElement\.dataset\.ready/,
  );
});

test("privacy reassurance is concise before the journey and details stay near sources", async () => {
  const source = await readFile("src/main.ts", "utf8");
  assert.match(source, /class="answer-privacy"/);
  assert.match(source, /does not send your answers to a server/);
  assert.match(source, /class="privacy-details"/);
  assert.doesNotMatch(source, /class="privacy-section"/);
  assert.ok(
    source.indexOf('class="answer-privacy"') <
      source.indexOf('id="how-seen-works"'),
  );
  assert.ok(
    source.indexOf('class="privacy-details"') > source.indexOf('id="sources"'),
  );
});

test("the blank worksheet uses the same prompt libraries without collecting input", async () => {
  const source = await readFile("src/main.ts", "utf8");
  assert.match(source, /data-action="worksheet"/);
  assert.match(source, /const renderWorksheet/);
  assert.match(source, /timingOptions\.map/);
  assert.match(source, /impactAreas/);
  assert.match(source, /questionGroups\.map/);
  const worksheet = source.slice(
    source.indexOf("const renderWorksheet"),
    source.indexOf("const renderExperience"),
  );
  assert.doesNotMatch(worksheet, /<input|<textarea|<select/);
});

test("the live experience does not link back to the portfolio case study", async () => {
  const source = await readFile("src/main.ts", "utf8");
  assert.doesNotMatch(source, /View the design case study/);
  assert.doesNotMatch(source, /angela1-creates\.github\.io\/projects\/seen/);
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
