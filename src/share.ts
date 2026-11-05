export const seenShareTitle = "Seen — Period-Pain Conversation Companion";

export const seenShareMessage =
  "Seen helps you put period-pain experiences into words and prepare for a healthcare conversation.";

export const buildSeenShareText = (url: string): string =>
  `${seenShareMessage}\n${url}`;
