import { ApiError, GoogleGenAI } from "@google/genai";

// Models with a free tier in the Gemini API, tried in this order. Free quotas are counted per model,
// so when one model's quota is used up (or a model no longer exists) the next one takes over.
const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"];

export const LEVELS = {
  A2: { label: "Einsteiger", hint: "A2 · einfache Sätze, langsam" },
  B1: { label: "Mittel", hint: "B1 · Alltagsgespräche" },
  B2: { label: "Fortgeschritten", hint: "B2 · natürliches Tempo" },
  C1: { label: "Profi", hint: "C1 · anspruchsvoll & idiomatisch" },
};

function client(apiKey) {
  // The key stays on this device and is sent only to the Gemini API.
  return new GoogleGenAI({ apiKey });
}

async function withModels(run, canRetry = () => true) {
  let lastError;
  for (const model of MODELS) {
    try {
      return await run(model);
    } catch (err) {
      lastError = err;
      const next = err instanceof ApiError && (err.status === 404 || err.status === 429);
      if (!next || !canRetry()) throw err;
    }
  }
  throw lastError;
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
const toContents = (history) =>
  history.map(({ role, content }) => ({ role: role === "assistant" ? "model" : "user", parts: [{ text: content }] }));

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
    async (model) => {
      const stream = await ai.models.generateContentStream({
        model,
        contents: toContents(history),
        config: { systemInstruction: conversationSystem(topic, level, name), abortSignal: signal },
      });
      let text = "";
      for await (const chunk of stream) {
        const delta = chunk.text;
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
  const ai = client(apiKey);
  const response = await withModels((model) =>
    ai.models.generateContent({
      model,
      contents: `Conversation so far:\n${transcript || "(nothing yet)"}`,
      config: {
        systemInstruction: `You help a German learner of English (level ${level}) who is stuck in a conversation about "${topic}". Suggest exactly 3 short, natural sentences the learner could say next, at their level. Vary them: one simple answer, one with an opinion, one question back.`,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: { ideas: { type: "array", items: { type: "string" } } },
          required: ["ideas"],
        },
      },
    }),
  );
  return parseJson(response.text).ideas ?? [];
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
      },
    },
    vocabulary_tips: {
      type: "array",
      items: {
        type: "object",
        properties: { phrase: { type: "string" }, meaning: { type: "string" } },
        required: ["phrase", "meaning"],
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
};

export async function evaluate({ apiKey, topic, level, history, spokenTurns }) {
  const transcript = visible(history)
    .map((m) => `${m.role === "user" ? "LEARNER" : "PARTNER"}: ${m.content}`)
    .join("\n");
  const ai = client(apiKey);
  const systemInstruction = `You are an experienced, fair and encouraging English examiner (Cambridge/IELTS speaking style) giving feedback to a German native speaker.
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
  const response = await withModels((model) =>
    ai.models.generateContent({
      model,
      contents: `Conversation transcript:\n\n${transcript}`,
      config: { systemInstruction, responseMimeType: "application/json", responseJsonSchema: EVAL_SCHEMA },
    }),
  );
  const data = parseJson(response.text);
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
  if (err?.name === "AbortError") return "Abgebrochen.";
  if (err instanceof ApiError) {
    if (err.status === 400 && /api.?key/i.test(err.message)) return "Der API-Schlüssel ist ungültig. Bitte prüfe ihn in den Einstellungen.";
    if (err.status === 401 || err.status === 403) return "Dein API-Schlüssel darf die Gemini-API nicht nutzen. Prüfe ihn in Google AI Studio.";
    if (err.status === 429)
      return "Das kostenlose Kontingent ist gerade ausgeschöpft. Warte eine Minute und versuch es nochmal. Ist das Tageslimit erreicht, geht es morgen weiter.";
    if (err.status >= 500) return "Die KI ist gerade überlastet. Bitte versuch es gleich nochmal.";
    return `Die KI meldet einen Fehler (${err.status}). Bitte versuch es erneut.`;
  }
  if (err instanceof TypeError) return "Keine Verbindung zur KI. Bist du online?";
  if (err instanceof SyntaxError) return "Die Antwort der KI war unvollständig. Bitte versuch es nochmal.";
  return err?.message || "Unbekannter Fehler.";
}
