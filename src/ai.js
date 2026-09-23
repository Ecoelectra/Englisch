import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";
// Server-side fallback: if the model declines a request, Anthropic re-runs it on a fallback model.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

export const LEVELS = {
  A2: { label: "Einsteiger", hint: "A2 · einfache Sätze, langsam" },
  B1: { label: "Mittel", hint: "B1 · Alltagsgespräche" },
  B2: { label: "Fortgeschritten", hint: "B2 · natürliches Tempo" },
  C1: { label: "Profi", hint: "C1 · anspruchsvoll & idiomatisch" },
};

function client(apiKey) {
  // The key stays on this device and is sent only to the Anthropic API.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
}

function conversationSystem(topic, level, name) {
  return `You are Sunny, a warm, curious and encouraging English conversation partner in a speaking-practice app.
The learner is a German native speaker practising spoken English on an iPad${name ? `; their name is ${name}` : ""}.

Topic of today's conversation: "${topic}".
Learner's target level: ${level} (CEFR). Adapt vocabulary, sentence length and speed of ideas to this level.

How to talk:
- Your replies are read aloud by text-to-speech, so write plain spoken English: no markdown, no lists, no emojis, no stage directions.
- Keep each reply short (1–3 sentences, rarely more), then hand the turn back with one open question so the learner does most of the talking.
- React to what the learner actually said, share a small opinion or anecdote now and then, and gently steer back to the topic if the conversation drifts far away.
- If the topic is a role-play (e.g. café, hotel, job interview), play the other role convincingly and set the scene briefly in your first message.
- Do not correct mistakes during the conversation; a detailed evaluation happens afterwards. Only if you truly cannot understand, ask a friendly clarifying question.
- The learner's messages may come from speech recognition, so ignore missing punctuation and obvious transcription glitches.
- If the learner writes in German, answer in English and encourage them kindly to try it in English.`;
}

// Hidden first user turn (the API needs the conversation to start with a user message).
export const OPENING =
  "(The learner just opened the app and chose this topic. Greet them briefly and open the conversation with an easy first question.)";

const visible = (history) => history.filter((m) => !m.hidden);
const apiMessages = (history) => history.map(({ role, content }) => ({ role, content }));

/**
 * Streams the next assistant reply.
 * history: [{ role: "user" | "assistant", content: string, hidden?: true }] – kept only in memory.
 */
export async function streamReply({ apiKey, topic, level, name, history, onText, signal }) {
  const messages = apiMessages(history);
  const stream = client(apiKey).beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 2000,
      system: conversationSystem(topic, level, name),
      cache_control: { type: "ephemeral" },
      output_config: { effort: "low" },
      messages,
      ...FALLBACK,
    },
    { signal },
  );
  stream.on("text", (delta) => onText?.(delta));
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error("Die KI konnte darauf nicht antworten. Versuch es bitte anders zu formulieren.");
  }
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

export async function suggestIdeas({ apiKey, topic, level, history }) {
  const transcript = visible(history)
    .map((m) => `${m.role === "user" ? "Learner" : "Partner"}: ${m.content}`)
    .join("\n");
  const response = await client(apiKey).beta.messages.create({
    model: MODEL,
    max_tokens: 1000,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            ideas: { type: "array", items: { type: "string" } },
          },
          required: ["ideas"],
          additionalProperties: false,
        },
      },
    },
    system: `You help a German learner of English (level ${level}) who is stuck in a conversation about "${topic}". Suggest exactly 3 short, natural sentences the learner could say next, at their level. Vary them: one simple answer, one with an opinion, one question back.`,
    messages: [{ role: "user", content: `Conversation so far:\n${transcript || "(nothing yet)"}` }],
    ...FALLBACK,
  });
  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  return JSON.parse(text).ideas ?? [];
}

const EVAL_SCHEMA = {
  type: "object",
  properties: {
    overall: { type: "integer", description: "Overall speaking score 0-100" },
    cefr: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    grammar: { type: "integer", description: "0-100" },
    vocabulary: { type: "integer", description: "0-100" },
    fluency: { type: "integer", description: "0-100" },
    coherence: { type: "integer", description: "0-100" },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    improvements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          better: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["original", "better", "explanation"],
        additionalProperties: false,
      },
    },
    vocabulary_tips: {
      type: "array",
      items: {
        type: "object",
        properties: { phrase: { type: "string" }, meaning: { type: "string" } },
        required: ["phrase", "meaning"],
        additionalProperties: false,
      },
    },
    next_goal: { type: "string" },
  },
  required: [
    "overall",
    "cefr",
    "grammar",
    "vocabulary",
    "fluency",
    "coherence",
    "summary",
    "strengths",
    "improvements",
    "vocabulary_tips",
    "next_goal",
  ],
  additionalProperties: false,
};

export async function evaluate({ apiKey, topic, level, history, spokenTurns }) {
  const transcript = visible(history)
    .map((m) => `${m.role === "user" ? "LEARNER" : "PARTNER"}: ${m.content}`)
    .join("\n");
  const stream = client(apiKey).beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "high", format: { type: "json_schema", schema: EVAL_SCHEMA } },
    system: `You are an experienced, fair and encouraging English examiner (Cambridge/IELTS speaking style) giving feedback to a German native speaker.
Evaluate ONLY the LEARNER's turns of the conversation below. The PARTNER is an AI and is not assessed.

Context:
- Topic: "${topic}". The learner practised at target level ${level}.
- ${spokenTurns} of the learner's turns were spoken and transcribed by speech recognition: ignore punctuation, capitalisation and obvious transcription glitches; judge what was said.
- Judge fluency from the text: length and development of answers, natural connectors, self-corrections, how well the learner keeps the conversation going.

Scoring (integers 0-100, calibrated so scores stay comparable between sessions):
- 0-20 A1, 21-40 A2, 41-60 B1, 61-75 B2, 76-90 C1, 91-100 C2.
- grammar: accuracy and range of structures. vocabulary: range, precision, idioms. fluency: amount, flow and development. coherence: relevance, logic, interaction.
- overall: holistic score, roughly the weighted average (grammar 30%, vocabulary 25%, fluency 25%, coherence 20%).
- Very short conversations (only a few short answers) cannot show a high level; score what is demonstrated.

Feedback – write ALL feedback text in German (du-Form), warm and motivating, but honest:
- summary: 2-3 sentences.
- strengths: 2-4 concrete things done well.
- improvements: up to 5 of the most useful corrections, each quoting the learner's original wording (English), a better native-like version (English) and a short German explanation. Prioritise repeated or typical German-speaker errors. Empty list only if there is really nothing to improve.
- vocabulary_tips: 3-5 useful English words or phrases for this topic with German meaning.
- next_goal: one concrete, achievable focus for the next session.`,
    messages: [{ role: "user", content: `Conversation transcript:\n\n${transcript}` }],
    ...FALLBACK,
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("Die Auswertung wurde abgelehnt. Bitte versuch es erneut.");
  const text = message.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("Keine Auswertung erhalten.");
  const data = JSON.parse(text);
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  for (const k of ["overall", "grammar", "vocabulary", "fluency", "coherence"]) data[k] = clamp(data[k]);
  return data;
}

export function friendlyError(err) {
  if (err instanceof Anthropic.AuthenticationError) return "Der API-Schlüssel ist ungültig. Bitte prüfe ihn in den Einstellungen.";
  if (err instanceof Anthropic.PermissionDeniedError) return "Dein API-Schlüssel hat keinen Zugriff auf dieses Modell.";
  if (err instanceof Anthropic.RateLimitError) return "Kurz zu viele Anfragen – warte einen Moment und versuch es nochmal.";
  if (err instanceof Anthropic.BadRequestError && /credit|billing|balance/i.test(err.message))
    return "Dein Anthropic-Guthaben ist aufgebraucht. Lade es in der Anthropic Console auf.";
  if (err instanceof Anthropic.APIConnectionError) return "Keine Verbindung zur KI. Bist du online?";
  if (err instanceof Anthropic.APIUserAbortError) return "Abgebrochen.";
  if (err instanceof Anthropic.APIError) return `Die KI meldet einen Fehler (${err.status ?? "?"}). Bitte versuch es erneut.`;
  return err?.message || "Unbekannter Fehler.";
}
