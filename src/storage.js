// Everything persisted lives here. Only settings and scores are stored –
// conversation transcripts never touch localStorage (see conversation.js).
import { todayKey } from "./topics.js";

const KEYS = {
  settings: "speakup.settings",
  results: "speakup.results",
};

const DEFAULT_SETTINGS = {
  apiKey: "",
  name: "",
  level: "B1",
  voiceURI: "",
  speechRate: 0.95,
  autoSpeak: true,
  autoSend: true,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  write(KEYS.settings, next);
  return next;
}

/**
 * A result only holds scores and metadata:
 * { id, date (ISO), day (YYYY-MM-DD), topic, emoji, level, cefr, overall,
 *   grammar, vocabulary, fluency, coherence, turns, minutes }
 */
export function getResults() {
  const list = read(KEYS.results, []);
  return Array.isArray(list) ? list.sort((a, b) => a.date.localeCompare(b.date)) : [];
}

export function addResult(result) {
  const list = getResults();
  list.push(result);
  write(KEYS.results, list);
  return list;
}

export function deleteAllResults() {
  write(KEYS.results, []);
}

export function importResults(list) {
  if (!Array.isArray(list)) throw new Error("Ungültige Datei");
  const valid = list.filter((r) => r && typeof r.date === "string" && Number.isFinite(r.overall));
  const byId = new Map(getResults().map((r) => [r.id, r]));
  for (const r of valid) byId.set(r.id ?? r.date, { ...r, id: r.id ?? r.date });
  write(KEYS.results, [...byId.values()]);
  return valid.length;
}

export function computeStats(results = getResults()) {
  const days = new Set(results.map((r) => r.day));
  // Streak: consecutive days up to today (or up to yesterday if nothing yet today).
  let streak = 0;
  const cursor = new Date();
  if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const scores = results.map((r) => r.overall);
  const best = scores.length ? Math.max(...scores) : 0;
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const recent = scores.slice(-5);
  const earlier = scores.slice(0, Math.min(5, Math.max(0, scores.length - 5)));
  const trend =
    recent.length && earlier.length
      ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length - earlier.reduce((a, b) => a + b, 0) / earlier.length)
      : null;
  const minutes = Math.round(results.reduce((a, r) => a + (r.minutes || 0), 0));
  return {
    count: results.length,
    best,
    avg,
    streak,
    trend,
    minutes,
    doneToday: days.has(todayKey()),
    last: results[results.length - 1] ?? null,
  };
}

export const ACHIEVEMENTS = [
  { id: "first", emoji: "🌱", title: "Erster Schritt", desc: "Dein erstes Gespräch", test: (s) => s.count >= 1 },
  { id: "five", emoji: "🗣️", title: "Plaudertasche", desc: "5 Gespräche geführt", test: (s) => s.count >= 5 },
  { id: "twenty", emoji: "🎙️", title: "Talk-Profi", desc: "20 Gespräche geführt", test: (s) => s.count >= 20 },
  { id: "fifty", emoji: "👑", title: "Conversation King", desc: "50 Gespräche geführt", test: (s) => s.count >= 50 },
  { id: "streak3", emoji: "🔥", title: "Warm gelaufen", desc: "3 Tage in Folge", test: (s) => s.streak >= 3 },
  { id: "streak7", emoji: "⚡", title: "Wochen-Held", desc: "7 Tage in Folge", test: (s) => s.streak >= 7 },
  { id: "streak30", emoji: "🏅", title: "Unaufhaltsam", desc: "30 Tage in Folge", test: (s) => s.streak >= 30 },
  { id: "score70", emoji: "⭐", title: "Stark!", desc: "Einen Score von 70+ erreicht", test: (s) => s.best >= 70 },
  { id: "score85", emoji: "🌟", title: "Fast Muttersprache", desc: "Einen Score von 85+ erreicht", test: (s) => s.best >= 85 },
  { id: "hour", emoji: "⏱️", title: "Eine Stunde Englisch", desc: "60 Minuten gesprochen", test: (s) => s.minutes >= 60 },
];
