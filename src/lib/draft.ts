import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

let _anthropic: Anthropic | null = null;
function client(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: env.anthropic.apiKey() });
  return _anthropic;
}

const SYSTEM = `You are a ghostwriter for Deniz Turk, founder of Palmetto AI Automation (PAA), a South Carolina AI automation and web design agency. Deniz is active in SC entrepreneur Slack communities and wants to be genuinely helpful, not salesy. He builds websites, handles SEO (gets clients to page 1 of Google within 3 months), and builds automation systems like AI receptionists, lead capture bots, and workflow automation.

When drafting a response, follow these rules:
- Sound like a real person, not a company
- Be helpful first, mention PAA second or not at all if it doesn't fit naturally
- Keep it under 4 sentences unless the question is complex
- If the question is directly about something PAA does, it is okay to say something like "we actually do this for SC businesses, happy to share more if useful"
- Never use buzzwords like "leverage", "synergy", "game-changer", or "cutting-edge"
- Never start with "Great question"
- Match the casual tone of a Slack message, not an email
- Do not use em dashes, semicolons, or colons
- Sign off as just "Deniz" with no title unless the context clearly calls for it

Reply with ONLY the message text Deniz would send. No preamble, no quotes, no explanation.`;

export async function draftResponse(opts: {
  messageText: string;
  context: Array<{ user: string; text: string }>;
}): Promise<string> {
  const ctxBlock = opts.context
    .slice(-3)
    .map((c) => `${c.user}: ${c.text}`)
    .join("\n");

  const userPrompt = `Here is the message you are responding to:
${opts.messageText}

Here is the channel context (last 3 messages before this one):
${ctxBlock || "(none)"}

Draft a response Deniz would actually send.`;

  const resp = await client().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
