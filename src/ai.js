// Standalone functions: the lightweight, tree-shakeable API that Mistral recommends for browsers.
import { MistralCore } from "@mistralai/mistralai/core.js";
import { chatComplete } from "@mistralai/mistralai/funcs/chatComplete.js";
import { chatStream } from "@mistralai/mistralai/funcs/chatStream.js";
import { MistralError } from "@mistralai/mistralai/models/errors";

// Fast model for the live conversation, stronger ones for the evaluation.
// If a model is unavailable, the next one in the list takes over.
const CHAT_MODELS = ["mistral-small-latest", "mistral-medium-latest"];
const EVAL_MODELS = ["mistral-medium-latest", "mistral-large-latest", "mistral-small-latest"];

// The free tier allows only a few requests per second – wait briefly and retry on 429 / 5xx.
const RETRIES = {
  retries: {
    strategy: "backoff",
    backoff: { initialInterval: 1200, maxInterval: 8000, exponent: 1.8, maxElapsedTime: 25000 },
    retryConnectionErrors: false,
  },
  retryCodes: ["429", "5XX"],
};

export const LEVELS = {
  A2: { label: "Einsteiger", hint: "A2 · einfache Sätze, langsam" },
  B1: { label: "Mittel", hint: "B1 · Alltagsgespräche" },
  B2: { label: "Fortgeschritten", hint: "B2 · natürliches Tempo" },
  C1: { label: "Profi", hint: "C1 · anspruchsvoll & idiomatisch" },
};

function client(apiKey) {
  // The key stays on this device and is sent only to the Mistral API.
  return new MistralCore({ apiKey });
}

// Standalone functions return { ok, value, error } instead of throwing.
function unwrap(result) {
  if (!result.ok) throw result.error;
  return result.value;
}

async function withModels(models, run, canRetry = () => true) {
  let lastError;
  for (const model of models) {
    try {
      return await run(model);
    } catch (err) {
      lastError = err;
      const next = err instanceof MistralError && (err.statusCode === 404 || err.statusCode === 429);
      if (!next || !canRetry()) throw err;
    }
  }
  throw lastError;
}

// Message content is either a string or a list of chunks (text, thinking, …) – keep only the text.
function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c) => (c.type === "text" ? c.text : "")).join("");
  return "";
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
    async (model) => {
      const stream = unwrap(
        await chatStream(
          ai,
          { model, messages: toMessages(conversationSystem(topic, level, name), history) },
          { ...RETRIES, signal },
        ),
      );
      let text = "";
      for await (const event of stream) {
        const delta = textOf(event.data?.choices[0]?.delta?.content);
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

export async function suggestIdeas({ apiKey, topic, level, history }) {
  const transcript = visible(history)
    .map((m) => `${m.role === "user" ? "Learner" : "Partner"}: ${m.content}`)
    .join("\n");
  const system = `You help a German learner of English (level ${level}) who is stuck in a conversation about "${topic}". Suggest exactly 3 short, natural sentences the learner could say next, at their level. Vary them: one simple answer, one with an opinion, one question back.`;
  const ai = client(apiKey);
  const response = await withModels(CHAT_MODELS, async (model) =>
    unwrap(
      await chatComplete(
        ai,
        {
          model,
          messages: toMessages(system, [{ role: "user", content: `Conversation so far:\n${transcript || "(nothing yet)"}` }]),
          responseFormat: {
            type: "json_schema",
            jsonSchema: {
              name: "ideas",
              strict: true,
              schemaDefinition: {
                type: "object",
                properties: { ideas: { type: "array", items: { type: "string" } } },
                required: ["ideas"],
                additionalProperties: false,
              },
            },
          },
        },
        RETRIES,
      ),
    ),
  );
  return parseJson(textOf(response.choices?.[0]?.message?.content)).ideas ?? [];
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
- next_goal: one concrete, achievable focus for the next session.`;
  const response = await withModels(EVAL_MODELS, async (model) =>
    unwrap(
      await chatComplete(
        ai,
        {
          model,
          messages: toMessages(system, [{ role: "user", content: `Conversation transcript:\n\n${transcript}` }]),
          responseFormat: {
            type: "json_schema",
            jsonSchema: { name: "evaluation", strict: true, schemaDefinition: EVAL_SCHEMA },
          },
        },
        RETRIES,
      ),
    ),
  );
  const data = parseJson(textOf(response.choices?.[0]?.message?.content));
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
  if (err?.name === "AbortError" || err?.name === "RequestAbortedError") return "Abgebrochen.";
  if (err instanceof MistralError) {
    if (err.statusCode === 401) return "Der API-Schlüssel ist ungültig. Bitte prüfe ihn in den Einstellungen.";
    if (err.statusCode === 403) return "Dein API-Schlüssel darf dieses Modell nicht nutzen. Prüfe dein Konto bei Mistral.";
    if (err.statusCode === 429)
      return "Das kostenlose Kontingent ist gerade ausgeschöpft. Warte kurz und versuch es nochmal. Ist das Monatslimit erreicht, geht es im nächsten Monat weiter.";
    if (err.statusCode >= 500) return "Die KI ist gerade überlastet. Bitte versuch es gleich nochmal.";
    return `Die KI meldet einen Fehler (${err.statusCode}). Bitte versuch es erneut.`;
  }
  if (err?.name === "ConnectionError" || err instanceof TypeError) return "Keine Verbindung zur KI. Bist du online?";
  if (err instanceof SyntaxError) return "Die Antwort der KI war unvollständig. Bitte versuch es nochmal.";
  return err?.message || "Unbekannter Fehler.";
}
