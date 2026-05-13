// Keyword groups for the Slack monitor's first-pass filter.
// A message must hit at least MIN_GROUP_HITS distinct groups OR have one strong-signal
// pain phrase to advance to the LLM relevance scoring step. This keeps "I love Google
// Maps" from triggering a draft, while letting "anyone know a web dev who can fix our
// Google rankings" through.

export type KeywordGroup = "seo_web" | "automation" | "pain_signal";

const GROUPS: Record<KeywordGroup, string[]> = {
  seo_web: [
    "website",
    "web design",
    "web developer",
    "web dev",
    "ranking",
    "rankings",
    "page one",
    "page 1",
    "seo",
    "search engine",
    "not showing up",
    "can't find us online",
    "online presence",
    "local search",
    "google business",
    "gmb",
    "google rankings",
    "show up on google",
    "show up in google",
    "rank on google",
    "google maps",
  ],
  automation: [
    "automate",
    "automation",
    "automated",
    "too many calls",
    "booking system",
    "appointment",
    "receptionist",
    "follow up",
    "follow-up",
    "lead capture",
    "crm",
    "workflow",
    "saves time",
    "manual process",
    "repetitive",
    "ai assistant",
    "ai bot",
    "chatbot",
    "missed calls",
  ],
  pain_signal: [
    "losing clients",
    "missing leads",
    "overwhelmed",
    "no time",
    "need help with",
    "recommendation",
    "anyone know",
    "looking for",
    "who can help",
    "vendor",
    "agency",
    "freelancer",
    "any recs",
    "any recommendations",
    "anyone use",
    "anyone using",
    "looking for a",
  ],
};

const STRONG_SIGNAL_PHRASES = [
  "looking for a web dev",
  "looking for a website",
  "need a website",
  "need help with seo",
  "need help with my website",
  "anyone do seo",
  "google ranking help",
  "not showing up on google",
  "rank on google",
  "automate my booking",
  "ai receptionist",
  "missed calls",
];

export type KeywordMatch = {
  matched: string[];
  groupsHit: KeywordGroup[];
  strongSignal: boolean;
};

export function matchKeywords(text: string): KeywordMatch {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  const groupsHit = new Set<KeywordGroup>();
  for (const [group, words] of Object.entries(GROUPS) as Array<[KeywordGroup, string[]]>) {
    for (const w of words) {
      if (lower.includes(w)) {
        matched.push(w);
        groupsHit.add(group);
      }
    }
  }
  const strongSignal = STRONG_SIGNAL_PHRASES.some((p) => lower.includes(p));
  return { matched, groupsHit: Array.from(groupsHit), strongSignal };
}

const MIN_GROUP_HITS = 2;

export function passesPreFilter(m: KeywordMatch): boolean {
  if (m.strongSignal) return true;
  return m.groupsHit.length >= MIN_GROUP_HITS;
}
