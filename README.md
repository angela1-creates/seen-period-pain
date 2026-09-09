# Seen

**Seen — A Period-Pain Conversation Companion** is a responsive educational prototype that helps adolescents organize what they have experienced, describe effects on daily life, and prepare questions for a healthcare appointment.

Seen supports communication. It does not diagnose endometriosis or any other condition, calculate medical risk, recommend treatment or medication, provide personalized triage, or replace a healthcare professional.

## Audience

The primary audience is teen girls and other adolescents who menstruate and find period-related pain difficult to explain. Secondary audiences include a trusted adult supporting the adolescent, a healthcare professional reading a user-created brief, and a portfolio visitor reviewing the design process.

## Seven-State Journey

1. **Introduction** explains the product, privacy model, limits, design rationale, and sources before any sensitive questions appear.
2. **Experience** records the user’s own description and timing without interpreting it.
3. **Impact** records effects on school, sleep, physical activity, social plans, concentration, and everyday tasks.
4. **Previous Actions** records what the user already tried and what they noticed. Seen does not supply recommendations.
5. **Questions** groups a fixed nine-question library under Understanding, Next steps, and Support; shows a five-question selection limit; accepts one custom question; and offers an optional “Anything else worth mentioning?” note. Clinical-review status is kept outside the active form in a prototype-status notice.
6. **Review** shows exactly what was entered and preserves missing, skipped, and prefer-not-to-answer states.
7. **Appointment Brief** formats the user’s answers for local browser printing or the browser’s Save as PDF option. Users are warned to print or save before refreshing or closing the tab.

One native confirmation dialog is reused for exit-with-data and Clear All. Individual answers support inline Clear and Undo.

## Medical And AI Boundaries

Seen does not interpret answers or connect them to a disease. It does not provide treatment, medication, urgency, or risk guidance. V1 does not use generative AI: questions and health statements are fixed so they can be traced, reviewed, and tested. User text is never rewritten or expanded.

The current health copy is source-grounded but **has not been clinically reviewed**. It must not be described as clinically reviewed until Angela records the reviewer’s name or professional role, the review scope, and the review date.

## Privacy Model

Answers exist only in the in-memory `SeenState` object for the active page. Refreshing, closing, or navigating away clears them. Seen uses no browser storage, cookies, answer-bearing URLs, analytics, authentication, backend, database, external API, service worker, or answer logging. Printing uses the browser’s print dialog and does not automatically download or share a file.

## Source Review

`src/sources.ts` is the structured registry. Each record contains a source ID, organization, title, direct URL, publication or review date, access date, supported statement, and clinical-review status. Health statements in the interface use `data-source-id` and visible links.

Allowed source organizations are WHO, NICE, ACOG, RCOG, and NHS. Before a release:

1. Confirm that each link and supported statement is still current.
2. Review all user-facing health statements against the registry.
3. Obtain licensed adolescent-health or gynecology review of health copy, timing and impact choices, the fixed question library, safety wording, inclusive language, and the appointment brief.
4. Record the reviewer and date before changing any registry item to `reviewed`.

## Local Development

Requires Node.js 22 or later.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite.

## Testing

```powershell
npm run format:check
npm run typecheck
npm test
npm run build
npm run preview
```

The production preview uses the GitHub Pages project path:

```text
http://127.0.0.1:4173/seen-period-pain/
```

The tests verify state semantics, individual clearing, Undo snapshots, prohibited privacy APIs, source-registry fields, and exclusion of the outdated diagnostic-delay placeholder. Browser QA should cover the full journey, partial and skipped answers, editing, Clear and Undo, Exit and Clear All, refresh, printing, keyboard focus, 200% text scaling, reduced motion, and responsive layouts.

## Deployment

GitHub Pages deployment is defined in `.github/workflows/deploy-pages.yml`. It installs the locked dependencies, builds the Vite application with the `/seen-period-pain/` base path, and deploys only `dist/`.

Before the first workflow deployment, open the GitHub repository’s **Settings → Pages** and change **Build and deployment → Source** from **Deploy from a branch** to **GitHub Actions**. Pushes to `main` then build and publish the site automatically.

Before release, run formatting, type checking, tests, and a production build. Review the built files for prohibited network or persistence behavior and repeat the source review.

The production URL is `https://angela1-creates.github.io/seen-period-pain/`.

## Prototype Limitations

- Health copy and the appointment-question library still require licensed clinical review.
- The prototype does not provide region-specific care or urgent-care directions.
- It does not verify whether the user understands a question or brief.
- Browser memory and print behavior vary, including back-forward cache and operating-system print dialogs.
- A one-page brief is supported through input limits, but printer settings can still change pagination.
- Real adolescents, trusted adults, clinicians, assistive-technology users, and real appointment contexts have not yet been studied.
