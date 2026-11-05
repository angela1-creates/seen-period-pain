export const seenShareTitle = "Seen — Period-Pain Conversation Companion";

export const seenShareMessage =
  "I thought this might be helpful if period pain is hard to put into words. Seen helps you gather what you’ve noticed and prepare for a healthcare conversation.";

export const buildSeenShareText = (url: string): string =>
  `${seenShareMessage}\n${url}`;
