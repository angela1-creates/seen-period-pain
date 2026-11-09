export const feedbackEmail = "angelacreates.projects@gmail.com";
export const feedbackSubject = "[SEEN] Feedback";

export const feedbackBody = `Hi Angela,

Please don’t include personal health or identifying information.

What felt helpful?


What felt unclear or missing?


What would make SEEN more useful?


Were you able to prepare appointment notes? Yes / No


Anything else you’d like to share?

`;

export const feedbackMailto = `mailto:${feedbackEmail}?subject=${encodeURIComponent(
  feedbackSubject,
)}&body=${encodeURIComponent(feedbackBody)}`;
