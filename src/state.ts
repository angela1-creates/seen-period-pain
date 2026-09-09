export type AnswerStatus = "unanswered" | "answered" | "skipped" | "prefer-not";
export type JourneyView =
  | "introduction"
  | "experience"
  | "impact"
  | "actions"
  | "questions"
  | "review"
  | "brief";

export interface TextAnswer {
  status: AnswerStatus;
  value: string;
}

export interface TimingAnswer {
  status: AnswerStatus;
  values: string[];
  detail: string;
}

export type ImpactLevel = "a-little" | "much-harder" | "varies" | "not-sure";

export interface ImpactEntry {
  area: string;
  level: ImpactLevel | "";
}

export interface ImpactAnswer {
  status: AnswerStatus;
  entries: ImpactEntry[];
  customArea: string;
  customLevel: ImpactLevel | "";
}

export type ActionOutcome = "helped" | "not-helped" | "sometimes" | "not-sure";

export interface PreviousAction {
  description: string;
  outcome: ActionOutcome | "";
}

export interface ActionsAnswer {
  status: AnswerStatus;
  items: PreviousAction[];
}

export interface QuestionsAnswer {
  status: AnswerStatus;
  selected: string[];
  custom: string;
}

export interface SeenState {
  view: JourneyView;
  returnToReview: boolean;
  experience: TextAnswer;
  timing: TimingAnswer;
  impact: ImpactAnswer;
  actions: ActionsAnswer;
  notes: TextAnswer;
  questions: QuestionsAnswer;
}

export type AnswerKey =
  "experience" | "timing" | "impact" | "actions" | "notes" | "questions";

export const createInitialState = (): SeenState => ({
  view: "introduction",
  returnToReview: false,
  experience: { status: "unanswered", value: "" },
  timing: { status: "unanswered", values: [], detail: "" },
  impact: {
    status: "unanswered",
    entries: [],
    customArea: "",
    customLevel: "",
  },
  actions: { status: "unanswered", items: [] },
  notes: { status: "unanswered", value: "" },
  questions: { status: "unanswered", selected: [], custom: "" },
});

export const cloneState = (state: SeenState): SeenState =>
  structuredClone(state);

export const hasAnswerData = (state: SeenState): boolean =>
  (
    [
      "experience",
      "timing",
      "impact",
      "actions",
      "notes",
      "questions",
    ] as AnswerKey[]
  ).some((key) => state[key].status !== "unanswered");

export const resetAnswer = (state: SeenState, key: AnswerKey): void => {
  const defaults = createInitialState();
  Object.assign(state[key], defaults[key]);
};

export const statusLabel = (status: AnswerStatus): string => {
  if (status === "skipped") return "Skipped";
  if (status === "prefer-not") return "Prefer not to answer";
  if (status === "unanswered") return "Not answered";
  return "Answered";
};
