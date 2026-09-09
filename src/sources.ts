export interface SourceRecord {
  id: string;
  organization: "WHO" | "NICE" | "ACOG" | "RCOG" | "NHS";
  title: string;
  url: string;
  publicationDate: string;
  accessed: string;
  supportedStatement: string;
  clinicalReview: "required" | "reviewed";
}

export const sources: SourceRecord[] = [
  {
    id: "ACOG-PAINFUL-2026",
    organization: "ACOG",
    title: "Painful Periods",
    url: "https://www.acog.org/womens-health/faqs/painful-periods",
    publicationDate: "Published October 2020; reviewed May 2026",
    accessed: "9 September 2026",
    supportedStatement:
      "Healthcare conversations about period pain can include symptoms, menstrual-cycle history, sleep, and effects on everyday activities.",
    clinicalReview: "required",
  },
  {
    id: "NHS-PERIOD-PROBLEMS-2023",
    organization: "NHS",
    title: "Period problems",
    url: "https://www.nhs.uk/conditions/periods/period-problems/",
    publicationDate: "Reviewed 5 January 2023",
    accessed: "9 September 2026",
    supportedStatement:
      "A diary of symptoms throughout the menstrual cycle can help provide detail about what happens and when for a healthcare conversation.",
    clinicalReview: "required",
  },
  {
    id: "NHS-PP-2026",
    organization: "NHS",
    title: "Period pain",
    url: "https://www.nhs.uk/symptoms/period-pain/",
    publicationDate: "Reviewed 18 March 2026",
    accessed: "8 September 2026",
    supportedStatement:
      "Period pain can affect everyday activities and can have different causes.",
    clinicalReview: "required",
  },
  {
    id: "NICE-NG73-2024",
    organization: "NICE",
    title:
      "Endometriosis: diagnosis and management, recommendations 1.3.1-1.3.4",
    url: "https://www.nice.org.uk/guidance/ng73/chapter/Recommendations",
    publicationDate: "Updated 11 November 2024",
    accessed: "8 September 2026",
    supportedStatement:
      "Pain experiences are individual, daily-life impact matters, and a pain and symptom diary can aid discussions.",
    clinicalReview: "required",
  },
  {
    id: "RCOG-ENDO-2023",
    organization: "RCOG",
    title: "Endometriosis: patient information",
    url: "https://www.rcog.org.uk/for-the-public/browse-our-patient-information/endometriosis/",
    publicationDate: "Published December 2023",
    accessed: "8 September 2026",
    supportedStatement:
      "Healthcare professionals ask about symptoms, and preparing questions can support an appointment conversation.",
    clinicalReview: "required",
  },
  {
    id: "WHO-ENDO-2025",
    organization: "WHO",
    title: "Endometriosis",
    url: "https://www.who.int/news-room/fact-sheets/detail/endometriosis",
    publicationDate: "15 October 2025",
    accessed: "8 September 2026",
    supportedStatement:
      "Endometriosis experiences vary and can affect daily life, but Seen does not use this information diagnostically.",
    clinicalReview: "required",
  },
  {
    id: "ACOG-DIAGNOSIS-2026",
    organization: "ACOG",
    title: "Diagnosis of Endometriosis",
    url: "https://www.acog.org/clinical/clinical-guidance/clinical-practice-guideline/articles/2026/03/diagnosis-of-endometriosis",
    publicationDate: "March 2026",
    accessed: "8 September 2026",
    supportedStatement:
      "Current clinical guidance addresses adolescents with symptoms suggestive of endometriosis; Seen does not apply diagnostic criteria.",
    clinicalReview: "required",
  },
];

export const sourceLink = (id: string, label = id): string => {
  const source = sources.find((item) => item.id === id);
  if (!source) return "";
  return `<a class="source-link" href="${source.url}" target="_blank" rel="noopener noreferrer" aria-label="Source: ${source.organization}, ${source.title}">${label}<span aria-hidden="true"> ↗</span></a>`;
};
