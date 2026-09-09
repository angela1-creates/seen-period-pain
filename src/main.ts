import "./styles.css";
import reflectionImage from "../assets/seen-reflection.jpg";
import { sourceLink, sources } from "./sources.ts";
import {
  cloneState,
  createInitialState,
  hasAnswerData,
  resetAnswer,
  statusLabel,
  type ActionOutcome,
  type AnswerKey,
  type ImpactLevel,
  type JourneyView,
  type SeenState,
} from "./state.ts";

const app = document.querySelector<HTMLDivElement>("#app");
const announcer = document.querySelector<HTMLDivElement>("#announcer");
const undoRegion = document.querySelector<HTMLDivElement>("#undo-region");
const dialog = document.querySelector<HTMLDialogElement>("#confirm-dialog");
const dialogTitle = document.querySelector<HTMLElement>("#dialog-title");
const dialogCopy = document.querySelector<HTMLElement>("#dialog-copy");
const dialogConfirm = dialog?.querySelector<HTMLButtonElement>(
  'button[value="confirm"]',
);

if (
  !app ||
  !announcer ||
  !undoRegion ||
  !dialog ||
  !dialogTitle ||
  !dialogCopy ||
  !dialogConfirm
) {
  throw new Error("Seen could not initialize its interface.");
}

let state: SeenState = createInitialState();
let undoSnapshot: { key: AnswerKey; state: SeenState } | null = null;
let dialogMode: "exit" | "reset" = "reset";
let dialogReturnFocus: HTMLElement | null = null;
let actionRowCount = 1;

const questionGroups = [
  {
    title: "Understanding",
    questions: [
      "Could we talk about what might be causing what I’m experiencing?",
      "What information would be helpful for me to keep track of?",
    ],
  },
  {
    title: "Next steps",
    questions: [
      "Are there tests or next steps we should discuss?",
      "What changes should lead me to contact you again?",
      "What are my options?",
      "What are the possible benefits and downsides of each option for me?",
    ],
  },
  {
    title: "Support",
    questions: [
      "How can we make a plan that works with school and daily life?",
      "How can I get support while we work out what to do next?",
      "Can a parent, guardian, or another person I trust be part of this conversation?",
    ],
  },
] as const;

const questionLibrary = questionGroups.flatMap((group) => group.questions);

const timingOptions = [
  "Before my period",
  "During my period",
  "After my period",
  "Between periods",
  "It varies",
  "Not connected to my period",
  "I’m not sure",
];
const impactAreas = [
  "School",
  "Sleep",
  "Sports or physical activity",
  "Social plans",
  "Concentration",
  "Everyday tasks",
];
const impactLabels: Record<ImpactLevel, string> = {
  "a-little": "A little harder",
  "much-harder": "Much harder",
  varies: "It varies",
  "not-sure": "I’m not sure",
};
const outcomeLabels: Record<ActionOutcome, string> = {
  helped: "Helped",
  "not-helped": "Did not help",
  sometimes: "Helped sometimes",
  "not-sure": "I’m not sure",
};

const viewNames: Record<JourneyView, string> = {
  introduction: "Introduction",
  experience: "Experience",
  impact: "Impact",
  actions: "Previous actions",
  questions: "Questions",
  review: "Review",
  brief: "Appointment brief",
};

const reflectionProgress: Partial<Record<JourneyView, number>> = {
  experience: 1,
  impact: 2,
  actions: 3,
  questions: 4,
};

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character,
  );

const checked = (condition: boolean): string => (condition ? " checked" : "");
const selected = (condition: boolean): string => (condition ? " selected" : "");

const announce = (message: string): void => {
  announcer.textContent = "";
  window.setTimeout(() => (announcer.textContent = message), 20);
};

const hasJourneyData = (): boolean => hasAnswerData(state);

const focusView = (): void => {
  window.requestAnimationFrame(() => {
    const heading = app.querySelector<HTMLElement>("[data-view-heading]");
    heading?.focus();
  });
};

const setView = (view: JourneyView, message?: string): void => {
  state.view = view;
  render();
  focusView();
  announce(message ?? `${viewNames[view]} view`);
};

const renderStatusControl = (key: AnswerKey): string => {
  const status = state[key].status;
  return `<div class="answer-tools">
    <span class="answer-status">${statusLabel(status)}</span>
    <button class="text-button" type="button" data-action="prefer" data-key="${key}">Prefer not to answer</button>
    <button class="text-button text-danger" type="button" data-action="clear-answer" data-key="${key}"${status === "unanswered" ? " disabled" : ""}>Clear this answer</button>
  </div>`;
};

const renderProgress = (): string => {
  const current = reflectionProgress[state.view];
  if (!current) return "";
  return `<div class="progress-wrap" aria-label="Appointment notes, step ${current} of 4">
    <p><strong>Appointment notes</strong> <span>Step ${current} of 4</span></p>
    <ol class="progress-dots" aria-hidden="true">
      ${[1, 2, 3, 4].map((step) => `<li class="${step === current ? "current" : step < current ? "complete" : ""}"></li>`).join("")}
    </ol>
  </div>`;
};

const renderJourneyShell = (
  content: string,
): string => `<section class="journey-shell">
  <div class="journey-top screen-only">
    ${renderProgress()}
    <button class="text-button exit-button" type="button" data-action="exit">Exit reflection</button>
  </div>
  <p class="tab-warning screen-only">Answers are temporary. Print or save your brief before refreshing or closing this tab.</p>
  ${content}
</section>`;

const renderIntroduction = (): string => {
  const paused = hasJourneyData();
  return `<div class="intro-view">
    ${paused ? `<aside class="paused-bar" aria-label="Paused reflection"><p><strong>Your reflection is paused.</strong> Answers remain only in this tab.</p><div><button class="button button-small" data-action="resume">Resume</button><button class="text-button text-danger" data-action="reset">Clear all</button></div></aside>` : ""}
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">Period-pain conversation companion</p>
        <h1 id="hero-title" data-view-heading tabindex="-1">Put your experience into words.</h1>
        <p class="hero-lede">Seen helps you describe what has been happening, how it affects everyday life, and what you want to ask at an appointment.</p>
        <div class="hero-actions">
          <button class="button button-primary" type="button" data-action="begin">Prepare my appointment notes</button>
          <button class="button button-secondary" type="button" data-action="show-how">How Seen works</button>
        </div>
        <ul class="hero-reassurance" aria-label="About this reflection"><li>About 5 minutes</li><li>No account</li><li>Answers stay in this tab</li></ul>
        <p class="boundary-note">Seen organizes what you enter. It does not diagnose, interpret your answers, or recommend treatment.</p>
      </div>
      <figure class="hero-visual">
        <img src="${reflectionImage}" alt="A notebook, question cards, and a pen arranged for a calm moment of reflection" />
        <figcaption>A quiet place to gather what matters and bring it into the conversation.</figcaption>
      </figure>
    </section>

    <section class="intro-band conversation-section" aria-labelledby="conversation-title">
      <div class="section-heading">
        <p class="eyebrow">Why Seen exists</p>
        <h2 id="conversation-title">A hard experience can be hard to explain.</h2>
      </div>
      <div class="editorial-copy">
        <p>Remembering what happened, when it happened, and what changed in daily life can feel like a lot. Seen gives you a quiet structure for organizing those details without interpreting them.</p>
        <p data-source-id="NICE-NG73-2024">Everyone experiences and describes pain differently. ${sourceLink("NICE-NG73-2024", "Source")}</p>
      </div>
    </section>

    <section id="how-seen-works" class="help-section" aria-labelledby="help-title">
      <div class="section-heading">
        <p class="eyebrow">How Seen works</p>
        <h2 id="help-title">From your experience to a clearer conversation.</h2>
      </div>
      <div class="feature-grid">
        <article><span>01</span><h3>Describe</h3><p>Record what you noticed in language that feels right to you.</p></article>
        <article><span>02</span><h3>Show the impact</h3><p>Note timing, what has been harder, and things you have already tried.</p></article>
        <article><span>03</span><h3>Prepare for the conversation</h3><p>Choose questions and print a brief in your own words.</p></article>
      </div>
      <p class="source-statement" data-source-id="NICE-NG73-2024">Keeping notes about pain and other experiences can help you discuss them with a healthcare professional. ${sourceLink("NICE-NG73-2024", "Source")}</p>
    </section>

    <section class="privacy-section" aria-labelledby="privacy-title">
      <div><p class="eyebrow">Privacy by design</p><h2 id="privacy-title">Nothing you enter leaves this page.</h2></div>
      <div class="privacy-grid">
        <article><h3>Only this tab</h3><p>Answers stay in temporary application memory. Print or save your brief before refreshing or closing this tab.</p></article>
        <article><h3>No account or upload</h3><p>There is no sign-in, database, analytics, external API, or automatic download.</p></article>
        <article><h3>You stay in control</h3><p>Skip, edit, clear, or choose “Prefer not to answer” at every sensitive step.</p></article>
      </div>
      <div class="boundary-panel"><h3>Product boundaries</h3><p>Seen cannot determine the cause of pain, calculate risk, recommend treatment or medication, or tell you whether something needs urgent care. If you feel worried or unsafe, contact a healthcare professional or a trusted adult.</p><span>Safety wording requires licensed clinical review.</span></div>
    </section>

    <aside class="prototype-status" aria-labelledby="prototype-status-title">
      <p class="eyebrow">Prototype status</p>
      <h2 id="prototype-status-title">Health copy is sourced, but not clinically reviewed.</h2>
      <p>The wording and appointment-question library still require review by a licensed adolescent-health or gynecology professional before release.</p>
    </aside>

    <section id="about-design" class="case-study" aria-labelledby="about-title">
      <div class="section-heading"><p class="eyebrow">About the design</p><h2 id="about-title">Support the conversation, not a conclusion.</h2></div>
      <div class="case-grid">
        <article><h3>The communication problem</h3><p>Adolescents may arrive at an appointment with experiences that are real but difficult to summarize. Seen organizes their account without assigning meaning to it.</p></article>
        <article><h3>Why no diagnosis</h3><p>A self-guided prototype cannot establish why pain is happening. Keeping description separate from clinical interpretation protects the user’s uncertainty.</p></article>
        <article><h3>Why no generative AI</h3><p>V1 uses fixed copy and questions so every health statement can be traced and reviewed. It never rewrites or expands a user’s answer.</p></article>
        <article><h3>What comes next</h3><p>Testing should include adolescents, trusted adults, clinicians, keyboard and screen-reader users, and real appointment and print workflows.</p></article>
      </div>
      <div class="future-design">
        <div><p class="eyebrow">After V1</p><h3>Ideas to test, not current features.</h3></div>
        <div class="future-design-copy">
          <section><h4>Things you may choose to track</h4><p data-source-id="ACOG-PAINFUL-2026 NHS-PERIOD-PROBLEMS-2023">ACOG and NHS guidance supports documenting symptoms, menstrual timing, and effects on daily life for healthcare conversations. ${sourceLink("ACOG-PAINFUL-2026", "ACOG")} ${sourceLink("NHS-PERIOD-PROBLEMS-2023", "NHS")}</p></section>
          <section><h4>Help me put this into words</h4><p>A later, optional AI concept could ask one gentle, clinician-reviewed follow-up at a time and explain why it suggests a question. It must never diagnose, score risk, recommend treatment, or reassure. The user would approve every sentence before it entered the brief, with clear disclosure if any data left the device.</p></section>
        </div>
      </div>
    </section>

    <section id="sources" class="sources-section" aria-labelledby="sources-title">
      <div class="section-heading"><p class="eyebrow">Sources and review status</p><h2 id="sources-title">Traceable, not yet clinically reviewed.</h2><p>Health copy is grounded in the sources below. A licensed adolescent-health or gynecology professional has not yet reviewed Seen.</p></div>
      <div class="source-list">${sources.map((source) => `<article><div><span>${source.organization}</span><strong>${escapeHtml(source.title)}</strong></div><p>${escapeHtml(source.supportedStatement)}</p><p class="source-meta">${source.publicationDate} · Accessed ${source.accessed} · Clinical review required</p><a href="${source.url}" target="_blank" rel="noopener noreferrer">Open source <span aria-hidden="true">↗</span></a></article>`).join("")}</div>
    </section>

    <footer class="site-footer"><p>Seen is an educational communication-support prototype.</p><a href="https://angela1-creates.github.io/" target="_blank" rel="noopener noreferrer">Angela Wan’s portfolio <span aria-hidden="true">↗</span></a></footer>
  </div>`;
};

const renderExperience = (): string =>
  renderJourneyShell(`<div class="journey-card">
  <div class="step-heading"><p class="eyebrow">Experience</p><h1 data-view-heading tabindex="-1">What have you been experiencing?</h1><p>Use your own words. Seen will not interpret or label what you write.</p></div>
  <form id="experience-form">
    <fieldset class="question-block"><legend>Describe what you noticed</legend><p class="field-help">You could write about how it feels, where you notice it, or anything else that matters to you.</p>
      <textarea id="experience-text" name="experience" maxlength="280" rows="5" placeholder="In my own words…">${escapeHtml(state.experience.value)}</textarea>
      <p class="character-count"><span data-count-for="experience-text">${state.experience.value.length}</span>/280</p>${renderStatusControl("experience")}
    </fieldset>
    <fieldset class="question-block"><legend>When do you notice it?</legend><p class="field-help">Choose any that fit. “I’m not sure” is a complete answer.</p>
      <div class="choice-grid">${timingOptions.map((option) => `<label class="choice"><input type="checkbox" name="timing" value="${option}"${checked(state.timing.values.includes(option))}><span>${option}</span></label>`).join("")}</div>
      <label class="stacked-label" for="timing-detail">Anything else about the timing? <span>Optional</span></label><textarea id="timing-detail" name="timing-detail" maxlength="160" rows="3">${escapeHtml(state.timing.detail)}</textarea>
      <p class="character-count"><span data-count-for="timing-detail">${state.timing.detail.length}</span>/160</p>${renderStatusControl("timing")}
    </fieldset>
    ${renderStepActions("introduction")}
  </form>
</div>`);

const renderImpact = (): string =>
  renderJourneyShell(`<div class="journey-card">
  <div class="step-heading"><p class="eyebrow">Impact</p><h1 data-view-heading tabindex="-1">What has been harder?</h1><p>Choose only what fits. Leaving an area blank will be shown as “Not answered,” not “No impact.”</p></div>
  <form id="impact-form"><fieldset class="question-block"><legend>Daily life</legend>
    <div class="impact-list">${impactAreas
      .map((area) => {
        const entry = state.impact.entries.find((item) => item.area === area);
        const key = area.toLowerCase().replace(/[^a-z]+/g, "-");
        return `<div class="impact-row"><label class="impact-check"><input type="checkbox" name="impact-area" value="${area}" aria-controls="impact-level-${key}" aria-expanded="${Boolean(entry)}"${checked(Boolean(entry))}><span>${area}</span></label><div class="impact-level" id="impact-level-${key}"${entry ? "" : " hidden"}><label for="impact-${key}">How was ${area.toLowerCase()} affected?</label><select id="impact-${key}" name="impact-level-${key}"><option value="">Choose one</option>${Object.entries(
          impactLabels,
        )
          .map(
            ([value, label]) =>
              `<option value="${value}"${selected(entry?.level === value)}>${label}</option>`,
          )
          .join("")}</select></div></div>`;
      })
      .join("")}</div>
    <div class="custom-impact"><label class="stacked-label" for="custom-impact">Another area <span>Optional</span></label><div><input id="custom-impact" name="custom-impact" maxlength="60" value="${escapeHtml(state.impact.customArea)}"><select name="custom-impact-level" aria-label="How the custom area was affected"><option value="">Choose impact</option>${Object.entries(
      impactLabels,
    )
      .map(
        ([value, label]) =>
          `<option value="${value}"${selected(state.impact.customLevel === value)}>${label}</option>`,
      )
      .join("")}</select></div></div>
    ${renderStatusControl("impact")}
  </fieldset>${renderStepActions("experience")}</form>
</div>`);

const renderActions = (): string => {
  const rows = Array.from(
    { length: Math.max(actionRowCount, state.actions.items.length, 1) },
    (_, index) => state.actions.items[index],
  );
  return renderJourneyShell(`<div class="journey-card">
    <div class="step-heading"><p class="eyebrow">Previous actions</p><h1 data-view-heading tabindex="-1">What have you already tried?</h1><p>Record only what you remember. Seen does not recommend or evaluate any action.</p></div>
    <form id="actions-form"><fieldset class="question-block"><legend>Things I tried</legend><div id="action-rows" class="action-rows">${rows
      .map(
        (item, index) =>
          `<div class="action-row"><label>What I tried <input name="action-description-${index}" maxlength="80" value="${escapeHtml(item?.description ?? "")}"></label><label>What I noticed <select name="action-outcome-${index}"><option value="">Choose one</option>${Object.entries(
            outcomeLabels,
          )
            .map(
              ([value, label]) =>
                `<option value="${value}"${selected(item?.outcome === value)}>${label}</option>`,
            )
            .join("")}</select></label></div>`,
      )
      .join("")}</div>
      <button class="button button-secondary button-small" type="button" data-action="add-action"${rows.length >= 4 ? " disabled" : ""}>Add another</button>${renderStatusControl("actions")}
    </fieldset>
    ${renderStepActions("impact")}</form>
  </div>`);
};

const renderQuestions = (): string =>
  renderJourneyShell(`<div class="journey-card">
  <div class="step-heading"><p class="eyebrow">Questions</p><h1 data-view-heading tabindex="-1">What do you want answered?</h1><p>Choose up to five questions that would help you feel prepared.</p></div>
  <form id="questions-form"><fieldset class="question-block"><legend>Questions for my appointment</legend><div class="question-selection"><strong><span data-question-count>${state.questions.selected.length}</span> of 5 selected</strong><span>Choose any that feel useful.</span></div><div class="question-groups">${questionGroups
    .map(
      (group) =>
        `<section class="question-group" aria-labelledby="question-group-${group.title.toLowerCase().replace(/\s+/g, "-")}"><h2 id="question-group-${group.title.toLowerCase().replace(/\s+/g, "-")}">${group.title}</h2><div class="question-list">${group.questions
          .map((question) => {
            const index = questionLibrary.indexOf(question);
            return `<label class="question-choice"><input type="checkbox" name="question" value="${index}"${checked(state.questions.selected.includes(question))}><span>${question}</span></label>`;
          })
          .join("")}</div></section>`,
    )
    .join("")}</div>
    <label class="stacked-label" for="custom-question">My own question <span>Optional</span></label><textarea id="custom-question" name="custom-question" maxlength="160" rows="3">${escapeHtml(state.questions.custom)}</textarea><p class="character-count"><span data-count-for="custom-question">${state.questions.custom.length}</span>/160</p>${renderStatusControl("questions")}
  </fieldset><fieldset class="question-block additional-notes"><legend>Anything else worth mentioning? <span>Optional</span></legend><p class="field-help" data-source-id="ACOG-PAINFUL-2026 NHS-PERIOD-PROBLEMS-2023">You’ve covered timing and daily-life impact. People sometimes forget to mention changes over time, sleep, bleeding, digestion or urination, and what they have already tried. Add only what you have actually noticed. ${sourceLink("ACOG-PAINFUL-2026", "ACOG")} ${sourceLink("NHS-PERIOD-PROBLEMS-2023", "NHS")}</p><textarea id="personal-notes" name="notes" maxlength="400" rows="5">${escapeHtml(state.notes.value)}</textarea><p class="character-count"><span data-count-for="personal-notes">${state.notes.value.length}</span>/400</p>${renderStatusControl("notes")}</fieldset>${renderStepActions("actions")}</form>
</div>`);

const renderStepActions = (back: JourneyView): string =>
  `<div class="step-actions screen-only"><button class="button button-secondary" type="button" data-action="back" data-view="${back}">Back</button><button class="text-button" type="button" data-action="skip-current">Skip for now</button><button class="button button-primary" type="submit">${state.returnToReview ? "Save and return to review" : "Continue"}</button></div>`;

const answerText = (
  status: SeenState[AnswerKey]["status"],
  content: string,
): string => (status === "answered" && content ? content : statusLabel(status));

const renderReviewSection = (
  title: string,
  key: AnswerKey,
  content: string,
  editView: JourneyView,
): string =>
  `<article class="review-section"><div><h2>${title}</h2><button class="text-button" type="button" data-action="edit" data-view="${editView}">Edit</button></div><div class="review-value ${state[key].status !== "answered" ? "empty-value" : ""}">${answerText(state[key].status, content)}</div><button class="text-button text-danger" type="button" data-action="clear-answer" data-key="${key}"${state[key].status === "unanswered" ? " disabled" : ""}>Clear this answer</button></article>`;

const experienceSummary = (): string =>
  escapeHtml(state.experience.value).replace(/\n/g, "<br>");
const timingSummary = (): string =>
  escapeHtml(
    [...state.timing.values, state.timing.detail].filter(Boolean).join(" · "),
  );
const impactSummary = (): string =>
  [
    ...state.impact.entries.map(
      (entry) =>
        `${escapeHtml(entry.area)}: ${entry.level ? impactLabels[entry.level] : "Not answered"}`,
    ),
    ...(state.impact.customArea || state.impact.customLevel
      ? [
          `${escapeHtml(state.impact.customArea || "Area not answered")}: ${state.impact.customLevel ? impactLabels[state.impact.customLevel] : "Not answered"}`,
        ]
      : []),
  ].join("<br>");
const actionsSummary = (): string =>
  state.actions.items
    .map(
      (item) =>
        `${escapeHtml(item.description || "Action not answered")} — ${item.outcome ? outcomeLabels[item.outcome] : "Outcome not answered"}`,
    )
    .join("<br>");
const notesSummary = (): string =>
  escapeHtml(state.notes.value).replace(/\n/g, "<br>");
const questionsSummary = (): string =>
  [...state.questions.selected, state.questions.custom]
    .filter(Boolean)
    .map((question) => `• ${escapeHtml(question)}`)
    .join("<br>");

const renderReview = (): string =>
  renderJourneyShell(`<div class="review-page">
  <div class="step-heading"><p class="eyebrow">Review</p><h1 data-view-heading tabindex="-1">Your words, exactly as entered.</h1><p>Check each section before preparing your appointment brief. Blank answers stay blank.</p></div>
  <div class="review-grid">
    ${renderReviewSection("What I experienced", "experience", experienceSummary(), "experience")}
    ${renderReviewSection("When I noticed it", "timing", timingSummary(), "experience")}
    ${renderReviewSection("What was harder", "impact", impactSummary(), "impact")}
    ${renderReviewSection("What I tried", "actions", actionsSummary(), "actions")}
    ${renderReviewSection("Anything else worth mentioning", "notes", notesSummary(), "questions")}
    ${renderReviewSection("Questions", "questions", questionsSummary(), "questions")}
  </div>
  <div class="review-actions screen-only"><button class="button button-secondary" type="button" data-action="back" data-view="questions">Back</button><button class="text-button text-danger" type="button" data-action="reset">Clear all</button><button class="button button-primary" type="button" data-action="prepare">Prepare appointment brief</button></div>
</div>`);

const renderBriefRow = (
  title: string,
  key: AnswerKey,
  content: string,
): string =>
  `<section><h2>${title}</h2><div class="brief-value ${state[key].status !== "answered" ? "empty-value" : ""}">${answerText(state[key].status, content)}</div></section>`;

const renderBrief = (): string =>
  renderJourneyShell(`<div class="brief-page">
  <div class="brief-intro screen-only"><p class="eyebrow">Appointment brief</p><h1 data-view-heading tabindex="-1">Ready when you are.</h1><p><strong>User-controlled output:</strong> print or save the final brief as a PDF. <strong>Print or save your brief before refreshing or closing this tab.</strong> Seen does not upload or automatically save the brief.</p><div><button class="button button-secondary" type="button" data-action="back" data-view="review">Back to review</button><button class="button button-primary" type="button" data-action="print">Print or save as PDF</button></div></div>
  <article class="print-brief" aria-label="My appointment notes">
    <header><div><span class="brief-mark">Seen</span><h1>My appointment notes</h1></div><p>Prepared from my own answers</p></header>
    <div class="brief-grid">
      ${renderBriefRow("What I experienced", "experience", experienceSummary())}
      ${renderBriefRow("When I noticed it", "timing", timingSummary())}
      ${renderBriefRow("What was harder", "impact", impactSummary())}
      ${renderBriefRow("What I tried", "actions", actionsSummary())}
      ${renderBriefRow("Personal notes", "notes", notesSummary())}
      ${renderBriefRow("Questions I want to ask", "questions", questionsSummary())}
    </div>
    <footer><p>Seen did not analyze, diagnose, or recommend anything from these notes.</p><p>This brief was generated locally in the browser.</p></footer>
  </article>
  <div class="post-brief screen-only"><button class="text-button" data-action="go-intro">Return to introduction</button><button class="text-button" data-action="show-sources">Read sources and limitations</button><button class="text-button text-danger" data-action="reset">Clear all answers</button></div>
</div>`);

const render = (): void => {
  const views: Record<JourneyView, () => string> = {
    introduction: renderIntroduction,
    experience: renderExperience,
    impact: renderImpact,
    actions: renderActions,
    questions: renderQuestions,
    review: renderReview,
    brief: renderBrief,
  };
  app.innerHTML = views[state.view]();
};

const syncActionInputs = (): void => {
  const form = app.querySelector<HTMLFormElement>("#actions-form");
  if (!form) return;
  const data = new FormData(form);
  const items = Array.from(
    form.querySelectorAll<HTMLElement>(".action-row"),
  ).flatMap((_, index) => {
    const description = String(
      data.get(`action-description-${index}`) ?? "",
    ).trim();
    const outcome = String(data.get(`action-outcome-${index}`) ?? "") as
      ActionOutcome | "";
    return description || outcome ? [{ description, outcome }] : [];
  });
  state.actions.items = items;
  state.actions.status = items.length
    ? "answered"
    : state.actions.status === "answered"
      ? "unanswered"
      : state.actions.status;
};

type ReflectiveView = "experience" | "impact" | "actions" | "questions";

const nextFrom = (view: ReflectiveView): JourneyView =>
  ({
    experience: "impact",
    impact: "actions",
    actions: "questions",
    questions: "review",
  })[view] as JourneyView;

const finishStep = (view: ReflectiveView): void => {
  const destination = state.returnToReview ? "review" : nextFrom(view);
  state.returnToReview = false;
  setView(destination);
};

const handleSubmit = (event: SubmitEvent): void => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const data = new FormData(form);
  if (form.id === "experience-form") {
    const experience = String(data.get("experience") ?? "").trim();
    state.experience.value = experience;
    state.experience.status = experience
      ? "answered"
      : state.experience.status === "answered"
        ? "unanswered"
        : state.experience.status;
    const timing = data.getAll("timing").map(String);
    const detail = String(data.get("timing-detail") ?? "").trim();
    state.timing.values = timing;
    state.timing.detail = detail;
    state.timing.status =
      timing.length || detail
        ? "answered"
        : state.timing.status === "answered"
          ? "unanswered"
          : state.timing.status;
    finishStep("experience");
  } else if (form.id === "impact-form") {
    const areas = data.getAll("impact-area").map(String);
    state.impact.entries = areas.flatMap((area) => {
      const key = area.toLowerCase().replace(/[^a-z]+/g, "-");
      const level = String(data.get(`impact-level-${key}`) ?? "") as
        ImpactLevel | "";
      return [{ area, level }];
    });
    state.impact.customArea = String(data.get("custom-impact") ?? "").trim();
    state.impact.customLevel = String(data.get("custom-impact-level") ?? "") as
      ImpactLevel | "";
    const hasImpact = Boolean(
      state.impact.entries.length ||
      state.impact.customArea ||
      state.impact.customLevel,
    );
    state.impact.status = hasImpact
      ? "answered"
      : state.impact.status === "answered"
        ? "unanswered"
        : state.impact.status;
    finishStep("impact");
  } else if (form.id === "actions-form") {
    syncActionInputs();
    finishStep("actions");
  } else if (form.id === "questions-form") {
    state.questions.selected = data
      .getAll("question")
      .slice(0, 5)
      .flatMap((index) => {
        const question = questionLibrary[Number(index)];
        return question ? [question] : [];
      });
    state.questions.custom = String(data.get("custom-question") ?? "").trim();
    state.questions.status =
      state.questions.selected.length || state.questions.custom
        ? "answered"
        : state.questions.status === "answered"
          ? "unanswered"
          : state.questions.status;
    const notes = String(data.get("notes") ?? "").trim();
    state.notes.value = notes;
    state.notes.status = notes
      ? "answered"
      : state.notes.status === "answered"
        ? "unanswered"
        : state.notes.status;
    finishStep("questions");
  }
};

const stepKeys: Partial<Record<JourneyView, AnswerKey[]>> = {
  experience: ["experience", "timing"],
  impact: ["impact"],
  actions: ["actions"],
  questions: ["questions", "notes"],
};

const clearAnswerWithUndo = (key: AnswerKey): void => {
  undoSnapshot = { key, state: cloneState(state) };
  resetAnswer(state, key);
  render();
  undoRegion.innerHTML = `<div class="undo-bar"><span>${viewNames[key === "notes" ? "actions" : (key as JourneyView)]} cleared.</span><button class="button button-small" type="button" data-action="undo">Undo</button></div>`;
  undoRegion.querySelector<HTMLButtonElement>("button")?.focus();
  announce("Answer cleared. Undo is available.");
};

const openConfirmation = (
  mode: "exit" | "reset",
  trigger: HTMLElement,
): void => {
  dialogMode = mode;
  dialogReturnFocus = trigger;
  dialogTitle.textContent =
    mode === "exit" ? "Clear answers and exit?" : "Clear all answers?";
  dialogCopy.textContent =
    mode === "exit"
      ? "Returning to the introduction can keep your answers in this tab. Clearing removes every answer immediately."
      : "This removes every answer from this tab. This action can’t be undone.";
  dialogConfirm.textContent = mode === "exit" ? "Clear and exit" : "Clear all";
  dialog.showModal();
};

const handleClick = (event: MouseEvent): void => {
  const target = (event.target as HTMLElement).closest<HTMLElement>(
    "[data-action]",
  );
  if (!target) return;
  if (target instanceof HTMLAnchorElement) event.preventDefault();
  const action = target.dataset.action;
  if (action === "begin") setView("experience");
  if (action === "resume") setView("experience");
  if (action === "go-intro") setView("introduction");
  if (
    action === "show-how" ||
    action === "show-about" ||
    action === "show-sources"
  ) {
    state.view = "introduction";
    render();
    const sectionId =
      action === "show-how"
        ? "#how-seen-works"
        : action === "show-about"
          ? "#about-design"
          : "#sources";
    const section = document.querySelector<HTMLElement>(sectionId);
    section?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    section?.querySelector<HTMLElement>("h2")?.setAttribute("tabindex", "-1");
    section?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  }
  if (action === "back") {
    state.returnToReview = false;
    setView(target.dataset.view as JourneyView);
  }
  if (action === "edit") {
    state.returnToReview = true;
    setView(
      target.dataset.view as JourneyView,
      `Editing ${viewNames[target.dataset.view as JourneyView]}`,
    );
  }
  if (action === "skip-current") {
    for (const key of stepKeys[state.view] ?? [])
      if (state[key].status === "unanswered") state[key].status = "skipped";
    finishStep(state.view as ReflectiveView);
  }
  if (action === "prefer") {
    const key = target.dataset.key as AnswerKey;
    resetAnswer(state, key);
    state[key].status = "prefer-not";
    render();
    app
      .querySelector<HTMLElement>(`[data-action="prefer"][data-key="${key}"]`)
      ?.focus();
    announce(
      `${viewNames[key === "notes" ? "actions" : (key as JourneyView)]} marked prefer not to answer.`,
    );
  }
  if (action === "clear-answer")
    clearAnswerWithUndo(target.dataset.key as AnswerKey);
  if (action === "undo" && undoSnapshot) {
    state = undoSnapshot.state;
    undoSnapshot = null;
    undoRegion.innerHTML = "";
    render();
    focusView();
    announce("Answer restored.");
  }
  if (action === "add-action") {
    syncActionInputs();
    actionRowCount = Math.min(4, actionRowCount + 1);
    render();
    app
      .querySelectorAll<HTMLInputElement>(".action-row input")
      [actionRowCount - 1]?.focus();
  }
  if (action === "exit")
    hasJourneyData()
      ? openConfirmation("exit", target)
      : setView("introduction");
  if (action === "reset")
    hasJourneyData()
      ? openConfirmation("reset", target)
      : setView("introduction");
  if (action === "prepare") setView("brief");
  if (action === "print") {
    announce("Opening browser print preview.");
    window.print();
  }
};

app.addEventListener("submit", handleSubmit);
document.addEventListener("click", handleClick);
document.addEventListener("input", (event) => {
  const element = event.target as HTMLInputElement | HTMLTextAreaElement;
  if (element.id) {
    const counter = document.querySelector<HTMLElement>(
      `[data-count-for="${element.id}"]`,
    );
    if (counter) counter.textContent = String(element.value.length);
  }
  if (element instanceof HTMLInputElement && element.name === "question") {
    const selectedQuestions = app.querySelectorAll<HTMLInputElement>(
      'input[name="question"]:checked',
    );
    if (selectedQuestions.length > 5) {
      element.checked = false;
      announce("Choose up to five questions.");
    }
    const count = app.querySelector<HTMLElement>("[data-question-count]");
    if (count)
      count.textContent = String(
        app.querySelectorAll('input[name="question"]:checked').length,
      );
  }
});

document.addEventListener("change", (event) => {
  const targetCheckbox = event.target as HTMLInputElement;
  if (
    targetCheckbox instanceof HTMLInputElement &&
    targetCheckbox.name === "impact-area"
  ) {
    const level = targetCheckbox
      .closest<HTMLElement>(".impact-row")
      ?.querySelector<HTMLElement>(".impact-level");
    if (level) level.hidden = !targetCheckbox.checked;
    targetCheckbox.setAttribute(
      "aria-expanded",
      String(targetCheckbox.checked),
    );
    if (!targetCheckbox.checked) {
      const select = level?.querySelector<HTMLSelectElement>("select");
      if (select) select.value = "";
    }
    return;
  }
  const select = event.target as HTMLSelectElement;
  if (!(select instanceof HTMLSelectElement)) return;
  if (!select.name.startsWith("impact-level-") || !select.value) return;
  const areaCheckbox = select
    .closest<HTMLElement>(".impact-row")
    ?.querySelector<HTMLInputElement>('input[name="impact-area"]');
  if (areaCheckbox) areaCheckbox.checked = true;
});

dialog.addEventListener("close", () => {
  if (dialog.returnValue === "confirm") {
    state = createInitialState();
    actionRowCount = 1;
    undoSnapshot = null;
    undoRegion.innerHTML = "";
    setView(
      "introduction",
      dialogMode === "exit"
        ? "Answers cleared. Returned to introduction."
        : "All answers cleared.",
    );
  } else {
    dialogReturnFocus?.focus();
    announce("Answers kept.");
  }
});

window.addEventListener("beforeprint", () =>
  announce("Print preview started."),
);
window.addEventListener("afterprint", () =>
  announce("Print preview closed. Your answers remain in this tab."),
);
window.addEventListener("pagehide", () => {
  state = createInitialState();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    state = createInitialState();
    render();
  }
});

render();
