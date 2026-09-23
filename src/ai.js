import Groq from "groq-sdk";

// Groq's free tier limits each model separately, so every task has a list of models:
// if one is busy, over its limit or retired, the next one takes over.
// Fast models for the live conversation, stronger reasoning models for the evaluation.
const CHAT_MODELS = [
  { model: "llama-3.3-70b-versatile" },
  { model: "openai/gpt-oss-120b", reasoning_effort: "low", include_reasoning: false },
  { model: "llama-3.1-8b-instant" },
];
const EVAL_MODELS = [
  { model: "openai/gpt-oss-120b", reasoning_effort: "medium", include_reasoning: false, jsonSchema: true },
  { model: "llama-3.3-70b-versatile" },
  { model: "openai/gpt-oss-20b", reasoning_effort: "medium", include_reasoning: false, jsonSchema: true },
];

export const LEVELS = {
  A2: { label: "Einsteiger", hint: "A2 · einfache Sätze, langsam" },
  B1: { label: "Mittel", hint: "B1 · Alltagsgespräche" },
  B2: { label: "Fortgeschritten", hint: "B2 · natürliches Tempo" },
  C1: { label: "Profi", hint: "C1 · anspruchsvoll & idiomatisch" },
};

function client(apiKey) {
  // The key stays on this device and is sent only to the Groq API.
  // No automatic retries: on errors we switch to the next model right away instead of waiting.
  return new Groq({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 });
}

function canSwitchModel(err) {
  if (err instanceof Groq.RateLimitError || err instanceof Groq.NotFoundError || err instanceof Groq.InternalServerError)
    return true;
  // Retired models and JSON the model failed to produce also come back as 400.
  return err instanceof Groq.BadRequestError && /model|json/i.test(err.message);
}

// Models that just hit their limit are skipped for a while, so later turns don't wait on a failed request first.
const coolingUntil = new Map();

function coolDown(model, err) {
  const seconds = Number(err.headers?.get("retry-after"));
  const ms = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 600) * 1000 : 60_000;
  coolingUntil.set(model, Date.now() + ms);
}

async function withModels(models, run, canRetry = () => true) {
  const ready = models.filter(({ model }) => (coolingUntil.get(model) ?? 0) <= Date.now());
  let lastError;
  for (const { jsonSchema, ...params } of ready.length ? ready : models) {
    try {
      return await run(params, jsonSchema);
    } catch (err) {
      lastError = err;
      if (err instanceof Groq.RateLimitError) coolDown(params.model, err);
      if (!canSwitchModel(err) || !canRetry()) throw err;
    }
  }
  throw lastError;
}

// Structured output where the model supports it, plain JSON mode (schema described in the prompt) otherwise.
function jsonFormat(name, schema, jsonSchema) {
  return jsonSchema ? { type: "json_schema", json_schema: { name, strict: true, schema } } : { type: "json_object" };
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
const toMessages = (system, history) => [
  { role: "system", content: system },
  ...history.map(({ role, content }) => ({ role, content })),
];

function parseJson(text) {
  if (!text) throw new Error("Die KI hat keine Antwort geschickt. Bitte versuch es nochmal.");
  return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
}

/**
 * Streams the next assistant reply.
 * history: [{ role: "user" | "assistant", content: string, hidden?: true }] – kept only in memory.
 */
export async function streamReply({ apiKey, topic, level, name, history, onText, signal }) {
  const ai = client(apiKey);
  let received = false;
  return withModels(
    CHAT_MODELS,
    async (params) => {
      const stream = await ai.chat.completions.create(
        { ...params, stream: true, messages: toMessages(conversationSystem(topic, level, name), history) },
        { signal },
      );
      let text = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (!delta) continue;
        received = true;
        text += delta;
        onText?.(delta);
      }
      if (!text.trim()) throw new Error("Die KI hat keine Antwort geschickt. Versuch es bitte anders zu formulieren.");
      return text.trim();
    },
    // Only switch models if nothing has been shown yet.
    () => !received,
  );
}

const IDEAS_SCHEMA = {
  type: "object",
  properties: { ideas: { type: "array", items: { type: "string" } } },
  required: ["ideas"],
  additionalProperties: false,
};

export async function suggestIdeas({ apiKey, topic, level, history }) {
  const transcript = visible(history)
    .map((m) => `${m.role === "user" ? "Learner" : "Partner"}: ${m.content}`)
    .join("\n");
  const system = `You help a German learner of English (level ${level}) who is stuck in a conversation about "${topic}". Suggest exactly 3 short, natural sentences the learner could say next, at their level. Vary them: one simple answer, one with an opinion, one question back.
Reply only with JSON like {"ideas": ["...", "...", "..."]}.`;
  const ai = client(apiKey);
  const response = await withModels(CHAT_MODELS, (params, jsonSchema) =>
    ai.chat.completions.create({
      ...params,
      messages: toMessages(system, [{ role: "user", content: `Conversation so far:\n${transcript || "(nothing yet)"}` }]),
      response_format: jsonFormat("ideas", IDEAS_SCHEMA, jsonSchema),
    }),
  );
  return parseJson(response.choices[0]?.message?.content).ideas ?? [];
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
  const ai = client(apiKey);
  const system = `You are an experienced, fair and encouraging English examiner (Cambridge/IELTS speaking style) giving feedback to a German native speaker.
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
- next_goal: one concrete, achievable focus for the next session.

Reply only with a JSON object that follows this JSON schema:
${JSON.stringify(EVAL_SCHEMA)}`;
  const response = await withModels(EVAL_MODELS, (params, jsonSchema) =>
    ai.chat.completions.create({
      ...params,
      messages: toMessages(system, [{ role: "user", content: `Conversation transcript:\n\n${transcript}` }]),
      response_format: jsonFormat("evaluation", EVAL_SCHEMA, jsonSchema),
    }),
  );
  const data = parseJson(response.choices[0]?.message?.content);
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  for (const k of ["overall", "grammar", "vocabulary", "fluency", "coherence"]) data[k] = clamp(data[k]);
  if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(data.cefr)) data.cefr = cefrFromScore(data.overall);
  for (const k of ["strengths", "improvements", "vocabulary_tips"]) if (!Array.isArray(data[k])) data[k] = [];
  return data;
}

function cefrFromScore(score) {
  if (score > 90) return "C2";
  if (score > 75) return "C1";
  if (score > 60) return "B2";
  if (score > 40) return "B1";
  if (score > 20) return "A2";
  return "A1";
}

export function friendlyError(err) {
  if (err instanceof Groq.APIUserAbortError || err?.name === "AbortError") return "Abgebrochen.";
  if (err instanceof Groq.AuthenticationError) return "Der API-Schlüssel ist ungültig. Bitte prüfe ihn in den Einstellungen.";
  if (err instanceof Groq.PermissionDeniedError)
    return "Dein API-Schlüssel darf dieses Modell nicht nutzen. Prüfe dein Konto bei Groq.";
  if (err instanceof Groq.RateLimitError)
    return "Das kostenlose Kontingent ist gerade ausgeschöpft. Warte eine Minute und versuch es nochmal. Ist das Tageslimit erreicht, geht es morgen weiter.";
  if (err instanceof Groq.APIConnectionError) return "Keine Verbindung zur KI. Bist du online?";
  if (err instanceof Groq.APIError) return `Die KI meldet einen Fehler (${err.status ?? "?"}). Bitte versuch es erneut.`;
  if (err instanceof SyntaxError) return "Die Antwort der KI war unvollständig. Bitte versuch es nochmal.";
  return err?.message || "Unbekannter Fehler.";
}
