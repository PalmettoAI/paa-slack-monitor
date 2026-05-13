import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

let _anthropic: Anthropic | null = null;
function client(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: env.anthropic.apiKey() });
  return _anthropic;
}

export type RelevanceResult = {
  score: number; // 0-10
  reasoning: string;
};

const SYSTEM = `You are screening Slack messages from SC entrepreneur communities for Deniz Turk, founder of Palmetto AI Automation (PAA).

PAA helps SC small businesses with:
- Website design and rebuilds
- Local SEO (gets clients to page 1 of Google within 3 months)
- AI automation: receptionists, lead capture bots, booking workflows, follow-up automations

Score the message 0-10 on whether it's a question or pain point Deniz could genuinely help with by replying. Higher score = more likely to be useful, on-topic, and welcome a reply.

- 9-10: Direct ask for a service PAA offers ("anyone know a good SC web dev?", "we keep missing calls, looking for a solution")
- 6-8: Adjacent ask or pain signal where PAA could chime in helpfully ("our Google rankings tanked, what should we do?")
- 3-5: Tangentially related, probably not worth a reply
- 0-2: Off-topic, hiring posts, sales pitches FROM others, jokes, off-hand mentions

Penalize: hiring posts, vendor pitches, off-topic chat, sarcasm, messages where PAA's reply would be self-promotional rather than helpful.

Reply with EXACTLY this JSON shape and nothing else:
{"score": <number 0-10>, "reasoning": "<one short sentence>"}`;

export async function scoreRelevance(
  messageText: string,
  context: Array<{ user: string; text: string }>,
): Promise<RelevanceResult> {
  const ctxBlock = context
    .slice(-3)
    .map((c) => `${c.user}: ${c.text}`)
    .join("\n");

  const userPrompt = `Channel context (last 3 messages, oldest first):
${ctxBlock || "(none)"}

Message to score:
${messageText}`;

  const resp = await client().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Tolerant JSON extraction: find first { ... }
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { score: 0, reasoning: `parse_failed: ${text.slice(0, 100)}` };
  try {
    const obj = JSON.parse(m[0]) as { score?: number; reasoning?: string };
    const score = typeof obj.score === "number" ? Math.max(0, Math.min(10, obj.score)) : 0;
    const reasoning = obj.reasoning ?? "";
    return { score, reasoning };
  } catch {
    return { score: 0, reasoning: `json_failed: ${text.slice(0, 100)}` };
  }
}

export const RELEVANCE_THRESHOLD = 6;
