// Speech input (Web Speech API, available in Safari on iPadOS) and speech output (speechSynthesis).

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const canListen = Boolean(Recognition);
export const canSpeak = "speechSynthesis" in window;

/**
 * Starts listening. Calls onInterim(text) while the learner talks and
 * onDone(finalText) once recognition ends. Returns { stop, cancel }.
 */
export function listen({ onInterim, onDone, onError }) {
  const rec = new Recognition();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = "";
  let interim = "";
  let cancelled = false;

  rec.onresult = (event) => {
    interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      if (r.isFinal) finalText += (finalText ? " " : "") + r[0].transcript.trim();
      else interim += r[0].transcript;
    }
    onInterim?.((finalText + " " + interim).trim());
  };
  rec.onerror = (e) => {
    if (e.error === "no-speech" || e.error === "aborted") return;
    const messages = {
      "not-allowed": "Mikrofon-Zugriff wurde verweigert. Erlaube ihn in den iPad-Einstellungen → Safari → Mikrofon.",
      "service-not-allowed": "Spracherkennung ist nicht verfügbar. Aktiviere Siri & Diktierfunktion in den iPad-Einstellungen.",
      network: "Die Spracherkennung braucht eine Internetverbindung.",
    };
    onError?.(messages[e.error] || `Spracherkennung: ${e.error}`);
  };
  rec.onend = () => {
    if (!cancelled) onDone?.((finalText + " " + interim).trim());
  };
  rec.start();

  return {
    stop: () => rec.stop(),
    cancel: () => {
      cancelled = true;
      rec.abort();
    },
  };
}

// ---------- Text to speech ----------

let voicesCache = [];
function loadVoices() {
  voicesCache = canSpeak ? speechSynthesis.getVoices() : [];
  return voicesCache;
}
if (canSpeak) {
  loadVoices();
  speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}

export function englishVoices() {
  const voices = (voicesCache.length ? voicesCache : loadVoices()).filter((v) => /^en[-_]/i.test(v.lang));
  const quality = (v) => (/premium/i.test(v.name) ? 3 : /enhanced|erweitert/i.test(v.name) ? 2 : 0) + (/en[-_]US/i.test(v.lang) ? 0.5 : 0);
  return voices.sort((a, b) => quality(b) - quality(a) || a.name.localeCompare(b.name));
}

function pickVoice(voiceURI) {
  const voices = englishVoices();
  return voices.find((v) => v.voiceURI === voiceURI) || voices.find((v) => /samantha|ava|allison|daniel/i.test(v.name)) || voices[0];
}

// iOS only allows speech after a user gesture – call this from a tap handler once.
export function unlockSpeech() {
  if (!canSpeak) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  speechSynthesis.speak(u);
}

/**
 * Speaks text as it streams in: feed() chunks, sentences are queued as soon as they are complete.
 */
export function createSpeaker({ voiceURI, rate, onStart, onEnd }) {
  let buffer = "";
  let pending = 0;
  let stopped = false;
  const voice = pickVoice(voiceURI);

  function say(sentence) {
    const text = sentence.trim();
    if (!text || stopped || !canSpeak) return;
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || "en-US";
    u.rate = rate;
    pending++;
    if (pending === 1) onStart?.();
    u.onend = u.onerror = () => {
      if (stopped) return;
      pending--;
      if (pending === 0) onEnd?.();
    };
    speechSynthesis.speak(u);
  }

  return {
    feed(chunk) {
      buffer += chunk;
      const re = /[^.!?]+[.!?]+["')\]]*\s+/g;
      let match;
      let last = 0;
      while ((match = re.exec(buffer))) {
        say(match[0]);
        last = re.lastIndex;
      }
      buffer = buffer.slice(last);
    },
    flush() {
      say(buffer);
      buffer = "";
      if (pending === 0) onEnd?.();
    },
    stop() {
      stopped = true;
      buffer = "";
      if (canSpeak) speechSynthesis.cancel();
      pending = 0;
      onEnd?.();
    },
  };
}

export function speakOnce(text, { voiceURI, rate }) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const s = createSpeaker({ voiceURI, rate });
  s.feed(text + " ");
  s.flush();
}
