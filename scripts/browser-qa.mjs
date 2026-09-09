import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const debugPort = process.env.CHROME_DEBUG_PORT ?? "9338";
const baseUrl =
  process.env.SEEN_URL ?? "http://127.0.0.1:4188/seen-period-pain/";
const outputDirectory = new URL("../.qa/", import.meta.url);

await mkdir(outputDirectory, { recursive: true });
const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(
  (response) => response.json(),
);
const page = targets.find((target) => target.type === "page");
assert(page, "Chrome did not expose a page target");

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const events = [];
let requestId = 0;

socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
    return;
  }
  events.push(message);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

await Promise.all([
  send("Page.enable"),
  send("Runtime.enable"),
  send("Log.enable"),
  send("Network.enable"),
]);

const delay = (milliseconds = 80) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ?? expression,
    );
  return result.result.value;
};

const waitFor = async (selector) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (
      await evaluate(
        `Boolean(document.querySelector(${JSON.stringify(selector)}))`,
      )
    )
      return;
    await delay(50);
  }
  throw new Error(`Timed out waiting for ${selector}`);
};

const navigate = async (url = baseUrl) => {
  await send("Page.navigate", { url });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if ((await evaluate("document.readyState")) === "complete") break;
    await delay(50);
  }
  await waitFor("#app");
  await delay(100);
};

const click = async (selector) => {
  const clicked = await evaluate(
    `(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; element.click(); return true; })()`,
  );
  assert(clicked, `Could not click ${selector}`);
  await delay();
};

const fill = async (selector, value) => {
  const filled = await evaluate(
    `(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; element.value = ${JSON.stringify(value)}; element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: ${JSON.stringify(value)} })); element.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`,
  );
  assert(filled, `Could not fill ${selector}`);
};

const submit = async (selector) => {
  const submitted = await evaluate(
    `(() => { const form = document.querySelector(${JSON.stringify(selector)}); if (!form) return false; form.requestSubmit(); return true; })()`,
  );
  assert(submitted, `Could not submit ${selector}`);
  await delay();
};

const textIncludes = (text) =>
  evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`);
const focused = () =>
  evaluate(
    "document.activeElement?.getAttribute('data-view-heading') !== null || document.activeElement?.matches('[data-action=\"exit\"]')",
  );
const setViewport = (width, height) =>
  send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
    screenWidth: width,
    screenHeight: height,
  });

const screenshot = async (name) => {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(
    new URL(name, outputDirectory),
    Buffer.from(result.data, "base64"),
  );
};

const assertNoHorizontalOverflow = async (label) => {
  const dimensions = await evaluate(
    "({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })",
  );
  assert(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${label} has horizontal overflow: ${dimensions.scrollWidth}/${dimensions.clientWidth}`,
  );
};

await setViewport(1440, 900);
await navigate();
assert(await textIncludes("Put your experience into words."));
assert.equal(
  await evaluate("Boolean(document.querySelector('#experience-form'))"),
  false,
);
assert.equal(
  await evaluate(
    "document.querySelector('.hero-visual img')?.complete && document.querySelector('.hero-visual img')?.naturalWidth > 0",
  ),
  true,
  "The supporting image did not load",
);
await click('[data-action="show-how"]');
assert.equal(await evaluate("document.activeElement?.id"), "help-title");
await click('[data-action="go-intro"]');

await click('[data-action="begin"]');
assert(await focused(), "Experience heading did not receive focus");
await fill(
  "#experience-text",
  "Synthetic example: cramping that comes and goes.",
);
await click('input[name="timing"]');
await fill(
  "#timing-detail",
  "Synthetic example: often near the start of a period.",
);
await submit("#experience-form");
assert(await focused(), "Impact heading did not receive focus");
assert.equal(
  await evaluate("document.querySelector('#impact-level-school').hidden"),
  true,
);
await click('input[name="impact-area"][value="School"]');
assert.equal(
  await evaluate("document.querySelector('#impact-level-school').hidden"),
  false,
);
await fill("#impact-school", "much-harder");
await screenshot("impact-revealed-desktop.png");
await submit("#impact-form");
await fill(
  'input[name="action-description-0"]',
  "Synthetic example: used a warm pack.",
);
await submit("#actions-form");
assert(await textIncludes("0 of 5 selected"));
await click('input[name="question"][value="0"]');
await click('input[name="question"][value="1"]');
assert(await textIncludes("2 of 5 selected"));
await screenshot("questions-grouped-desktop.png");
await fill("#custom-question", "Could we talk about what I should track next?");
await fill(
  "#personal-notes",
  "Synthetic example only. I want help explaining the pattern.",
);
await submit("#questions-form");

assert(await textIncludes("Your words, exactly as entered."));
assert(await textIncludes("Outcome not answered"));
assert(await textIncludes("Synthetic example: cramping that comes and goes."));
await click('[data-action="clear-answer"][data-key="experience"]');
assert(await textIncludes("Not answered"));
await click('[data-action="undo"]');
assert(await textIncludes("Synthetic example: cramping that comes and goes."));

await click('[data-action="edit"][data-view="impact"]');
assert(await focused(), "Edited Impact heading did not receive focus");
await fill("#impact-school", "varies");
await submit("#impact-form");
assert(await textIncludes("It varies"));
await click('[data-action="prepare"]');
assert(await textIncludes("My appointment notes"));

const pdf = await send("Page.printToPDF", {
  printBackground: true,
  preferCSSPageSize: true,
});
await writeFile(
  new URL("appointment-brief.pdf", outputDirectory),
  Buffer.from(pdf.data, "base64"),
);
await click('[data-action="print"]');
assert(await textIncludes("My appointment notes"));

await click('[data-action="go-intro"]');
await click('[data-action="resume"]');
await click('[data-action="exit"]');
assert.equal(
  await evaluate("document.querySelector('#confirm-dialog').open"),
  true,
);
await click('#confirm-dialog button[value="cancel"]');
assert.equal(
  await evaluate("document.querySelector('#confirm-dialog').open"),
  false,
);
assert(await focused(), "Exit focus was not restored after cancellation");
await click('[data-action="exit"]');
await click('#confirm-dialog button[value="confirm"]');
assert(await textIncludes("Put your experience into words."));
assert.equal(await textIncludes("Continue my reflection"), false);

await click('[data-action="begin"]');
await click('[data-action="prefer"][data-key="experience"]');
assert(
  await evaluate(
    'document.activeElement?.matches(\'[data-action="prefer"][data-key="experience"]\')',
  ),
  "Prefer-not control did not retain focus",
);
await click('[data-action="skip-current"]');
await click('[data-action="skip-current"]');
await click('[data-action="skip-current"]');
await click('[data-action="skip-current"]');
assert(await textIncludes("Prefer not to answer"));
assert(await textIncludes("Skipped"));

await click('[data-action="reset"]');
await click('#confirm-dialog button[value="confirm"]');
assert.equal(await textIncludes("Continue my reflection"), false);
await click('[data-action="begin"]');
await fill("#experience-text", "Synthetic refresh check");
await submit("#experience-form");
await navigate();
assert.equal(await textIncludes("Continue my reflection"), false);
assert.equal(await textIncludes("Synthetic refresh check"), false);

await send("Emulation.setEmulatedMedia", {
  media: "screen",
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
assert.equal(
  await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"),
  true,
);
await evaluate("document.documentElement.style.fontSize = '200%'");
await setViewport(390, 844);
await assertNoHorizontalOverflow("200% text at phone width");
await screenshot("phone-portrait-200-percent.png");
await evaluate("document.documentElement.style.fontSize = ''");

const layouts = [
  [390, 844, "phone-portrait.png"],
  [844, 390, "phone-landscape.png"],
  [768, 1024, "tablet.png"],
  [1440, 900, "desktop.png"],
];
for (const [width, height, name] of layouts) {
  await setViewport(width, height);
  await navigate();
  await assertNoHorizontalOverflow(name);
  await screenshot(name);
  if (name === "phone-portrait.png") {
    assert.notEqual(
      await evaluate(
        "getComputedStyle(document.querySelector('.wordmark strong')).display",
      ),
      "none",
    );
    await click('[data-action="begin"]');
    await click('[data-action="skip-current"]');
    await click('[data-action="skip-current"]');
    await click('[data-action="skip-current"]');
    await screenshot("questions-grouped-phone.png");
  }
}

await setViewport(844, 390);
await navigate();
await click('[data-action="begin"]');
await assertNoHorizontalOverflow("phone landscape journey");
await screenshot("phone-landscape-experience.png");
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Tab",
  code: "Tab",
});
await send("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "Tab",
  code: "Tab",
});
assert.notEqual(await evaluate("document.activeElement?.tagName"), "BODY");

const failures = events.filter(
  (event) =>
    event.method === "Runtime.exceptionThrown" ||
    (event.method === "Log.entryAdded" &&
      ["error", "warning"].includes(event.params.entry.level)) ||
    (event.method === "Network.loadingFailed" && !event.params.canceled),
);
assert.deepEqual(failures, [], `Browser errors: ${JSON.stringify(failures)}`);

socket.close();
process.stdout.write(
  "Browser QA passed: full journey, partial journey, edit, clear/undo, exit/reset, refresh, print PDF, focus, keyboard, reduced motion, 200% text, and four responsive layouts.\n",
);
