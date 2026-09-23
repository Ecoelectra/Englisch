import "./style.css";
import { dailyTopics, msUntilMidnight, todayKey } from "./topics.js";
import {
  ACHIEVEMENTS,
  addResult,
  computeStats,
  deleteAllResults,
  getResults,
  getSettings,
  importResults,
  saveSettings,
} from "./storage.js";
import { LEVELS, OPENING, evaluate, friendlyError, streamReply, suggestIdeas } from "./ai.js";
import { canListen, canSpeak, createSpeaker, englishVoices, listen, speakOnce, unlockSpeech } from "./speech.js";
import { escapeHtml as esc, renderChart } from "./chart.js";

const app = document.getElementById("app");
const MIN_TURNS = 4;
// 5 daily topics + the custom-topic card fill the grid evenly in 2 or 3 columns.
const DAILY_TOPICS = 5;
const METRICS = [
  { key: "overall", label: "Gesamt" },
  { key: "grammar", label: "Grammatik" },
  { key: "vocabulary", label: "Wortschatz" },
  { key: "fluency", label: "Redefluss" },
  { key: "coherence", label: "Zusammenhang" },
];

let settings = getSettings();
let view = settings.apiKey ? "home" : "welcome";
let chartMetric = "overall";
let customTopic = "";

// The running conversation. Lives only in memory and is discarded after the evaluation.
let convo = null;
// The latest evaluation (incl. corrections). Only shown once, never persisted.
let lastEval = null;

// ---------------------------------------------------------------- helpers

function toast(message, ms = 3500) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), ms);
}

function go(next) {
  view = next;
  render();
  window.scrollTo({ top: 0 });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Good morning";
  if (h < 17) return "Hello";
  return "Good evening";
}

const MOTIVATION = [
  "Jedes Gespräch bringt dich ein Stück weiter. 🚀",
  "Fehler sind erlaubt – nur so lernst du. 💪",
  "Zehn Minuten am Tag machen einen riesigen Unterschied. ⏱️",
  "Sprechen lernt man nur durch Sprechen. Los geht's! 🎙️",
  "Dein zukünftiges Ich wird dir dankbar sein. 🌟",
  "Heute ist ein guter Tag, um Englisch zu sprechen. ☀️",
];

function scoreWord(score) {
  if (score >= 91) return "Herausragend!";
  if (score >= 76) return "Ausgezeichnet!";
  if (score >= 61) return "Richtig gut!";
  if (score >= 41) return "Gute Arbeit!";
  if (score >= 21) return "Guter Anfang!";
  return "Weiter so!";
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function relativeDay(iso) {
  const day = todayKey(new Date(iso));
  const today = todayKey();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (day === today) return "Heute";
  if (day === todayKey(y)) return "Gestern";
  return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

function ring(value, size = 160, stroke = 14, cls = "") {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return `<svg class="ring ${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-value" stroke-width="${stroke}"
      stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c * (1 - value / 100)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

function animateRings() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      document.querySelectorAll(".ring-value").forEach((el) => el.setAttribute("stroke-dashoffset", el.dataset.target));
      document.querySelectorAll("[data-bar]").forEach((el) => (el.style.width = `${el.dataset.bar}%`));
    }),
  );
}

function countUp(el, target, ms = 1400) {
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function confetti() {
  const colors = ["#6d5dfc", "#ff7a59", "#ffc83d", "#2ec4b6", "#ff5d8f"];
  const layer = document.createElement("div");
  layer.className = "confetti";
  for (let i = 0; i < 90; i++) {
    const p = document.createElement("i");
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.6}s`;
    p.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.append(p);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 4500);
}

const topbar = (title, { back = true, right = "" } = {}) => `
  <header class="topbar">
    ${back ? `<button class="icon-btn" data-go="home" aria-label="Zurück">‹</button>` : `<div class="brand"><span class="brand-mark">💬</span> SpeakUp</div>`}
    ${title ? `<h1 class="topbar-title">${title}</h1>` : ""}
    <div class="topbar-right">${right}</div>
  </header>`;

// ---------------------------------------------------------------- views

function welcomeView() {
  return `
  <main class="page welcome">
    <div class="welcome-hero">
      <div class="welcome-logo">💬</div>
      <h1>SpeakUp English</h1>
      <p class="lead">Dein persönlicher KI-Gesprächspartner, um entspannt Englisch sprechen zu üben.</p>
    </div>
    <div class="feature-grid">
      <div class="feature"><span>🗓️</span><b>Jeden Tag neue Themen</b><small>Von Reisen bis Jobinterview</small></div>
      <div class="feature"><span>🎙️</span><b>Einfach lossprechen</b><small>Die KI hört zu und antwortet laut</small></div>
      <div class="feature"><span>📊</span><b>Ehrliche Auswertung</b><small>Score, Niveau & konkrete Tipps</small></div>
      <div class="feature"><span>🔒</span><b>Privat</b><small>Gespräche werden nie gespeichert</small></div>
    </div>
    <section class="card setup">
      <h2>Einmalig einrichten</h2>
      <p>Die App nutzt die KI <b>Gemini</b> von Google – <b>kostenlos</b>, ohne Kreditkarte. Du brauchst nur einen eigenen Schlüssel:</p>
      <ol class="steps">
        <li>Öffne <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> und melde dich mit deinem Google-Konto an.</li>
        <li>Tippe auf <i>API-Schlüssel erstellen</i> (Create API key).</li>
        <li>Kopiere den Schlüssel und füge ihn hier ein.</li>
      </ol>
      <label class="field">
        <span>Wie heißt du? <small>(optional)</small></span>
        <input id="w-name" type="text" autocomplete="given-name" placeholder="z. B. Alex" value="${esc(settings.name)}" />
      </label>
      <label class="field">
        <span>API-Schlüssel</span>
        <input id="w-key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="AIza…" />
      </label>
      <button class="btn primary big" id="w-save">Los geht's 🚀</button>
      <p class="fineprint">Der Schlüssel bleibt nur auf diesem iPad gespeichert.</p>
    </section>
  </main>`;
}

function homeView() {
  const stats = computeStats();
  const topics = dailyTopics(DAILY_TOPICS);
  const hoursLeft = Math.floor(msUntilMidnight() / 3600000);
  const minsLeft = Math.floor((msUntilMidnight() % 3600000) / 60000);
  const motivation = MOTIVATION[new Date().getDate() % MOTIVATION.length];
  const last = stats.last;

  return `
  ${topbar("", {
    back: false,
    right: `<button class="icon-btn" data-go="progress" aria-label="Fortschritt">📈</button>
            <button class="icon-btn" data-go="settings" aria-label="Einstellungen">⚙️</button>`,
  })}
  <main class="page home">
    <section class="hero">
      <div class="hero-text">
        <h1>${greeting()}${settings.name ? `, ${esc(settings.name)}` : ""}! 👋</h1>
        <p>${stats.doneToday ? "Tagesziel geschafft – stark! Lust auf noch eine Runde? 🎉" : motivation}</p>
        <div class="pills">
          <span class="pill streak ${stats.streak ? "on" : ""}">🔥 ${stats.streak} ${stats.streak === 1 ? "Tag" : "Tage"} in Folge</span>
          <span class="pill">🗣️ ${stats.count} Gespräche</span>
          ${stats.best ? `<span class="pill">🏆 Bestwert ${stats.best}</span>` : ""}
        </div>
      </div>
      <button class="hero-score" data-go="progress" aria-label="Fortschritt öffnen">
        ${ring(last ? last.overall : 0, 150, 14)}
        <div class="hero-score-inner">
          ${last ? `<b>${last.overall}</b><small>Letzter Score</small><span class="cefr-chip">${esc(last.cefr)}</span>` : `<b>–</b><small>Noch kein Score</small>`}
        </div>
      </button>
    </section>

    <section>
      <div class="section-head">
        <h2>Themen des Tages</h2>
        <span class="muted">✨ Neue Themen in ${hoursLeft} Std ${minsLeft} Min</span>
      </div>
      <div class="topic-grid">
        ${topics
          .map(
            (t, i) => `
          <button class="topic-card c${i % 6}" data-topic="${t.id}">
            <span class="topic-emoji">${t.emoji}</span>
            <span class="topic-title">${esc(t.title)}</span>
            <span class="topic-de">${esc(t.de)}</span>
            <span class="topic-go">Starten →</span>
          </button>`,
          )
          .join("")}
        <div class="topic-card custom">
          <span class="topic-emoji">🎲</span>
          <span class="topic-title">Eigenes Thema</span>
          <input id="custom-topic" type="text" placeholder="Worüber möchtest du reden?" value="${esc(customTopic)}" maxlength="120" />
          <button class="btn primary small" id="custom-go">Starten →</button>
        </div>
      </div>
    </section>

    <section class="card level-card">
      <div class="section-head"><h2>Dein Niveau</h2><span class="muted">Die KI passt ihre Sprache daran an</span></div>
      <div class="segmented" role="radiogroup">
        ${Object.entries(LEVELS)
          .map(
            ([k, l]) => `<button role="radio" aria-checked="${settings.level === k}" class="seg ${settings.level === k ? "active" : ""}" data-level="${k}">
              <b>${l.label}</b><small>${l.hint}</small></button>`,
          )
          .join("")}
      </div>
    </section>
  </main>`;
}

function chatView() {
  const c = convo;
  const remaining = Math.max(0, MIN_TURNS - c.learnerTurns);
  return `
  <div class="chat-screen">
    <header class="chat-top">
      <button class="icon-btn" id="chat-cancel" aria-label="Gespräch abbrechen">✕</button>
      <div class="chat-topic">
        <span class="chat-emoji">${c.emoji}</span>
        <div><b>${esc(c.topic)}</b><small><span id="timer">0:00</span> · Niveau ${c.level}</small></div>
      </div>
      <div class="chat-actions">
        <button class="icon-btn" id="toggle-voice" aria-label="Vorlesen an/aus">${settings.autoSpeak ? "🔊" : "🔇"}</button>
        <button class="btn finish" id="finish" ${remaining ? "disabled" : ""}>
          ${remaining ? `Noch ${remaining} ${remaining === 1 ? "Antwort" : "Antworten"}` : "Beenden & auswerten ✓"}
        </button>
      </div>
    </header>
    <div class="progress-strip"><div style="width:${Math.min(100, (c.learnerTurns / MIN_TURNS) * 100)}%"></div></div>
    <main class="messages" id="messages">
      <div class="privacy-note">🔒 Dieses Gespräch wird nirgends gespeichert und nach der Auswertung gelöscht.</div>
      ${c.history
        .filter((m) => !m.hidden)
        .map((m) => bubble(m.role, m.content))
        .join("")}
    </main>
    <div class="ideas" id="ideas" hidden></div>
    <footer class="dock">
      <div class="status" id="status"></div>
      <div class="dock-row">
        <button class="dock-btn" id="ideas-btn" aria-label="Ideen, was ich sagen könnte">💡<small>Idee</small></button>
        <div class="composer">
          <textarea id="input" rows="1" placeholder="${canListen ? "Tippe auf das Mikrofon oder schreibe hier…" : "Schreibe hier – oder nutze die 🎤-Diktiertaste der Tastatur"}" enterkeyhint="send" autocapitalize="sentences"></textarea>
          <button class="send" id="send" aria-label="Senden">➤</button>
        </div>
        <button class="mic" id="mic" aria-label="Sprechen">
          <span class="mic-waves"></span>🎙️
        </button>
      </div>
    </footer>
  </div>`;
}

function bubble(role, text) {
  if (role === "assistant")
    return `<div class="msg ai"><div class="avatar">🌞</div><div class="bubble" data-say>${esc(text)}</div></div>`;
  return `<div class="msg me"><div class="bubble">${esc(text)}</div></div>`;
}

function evaluatingView() {
  return `
  <main class="page evaluating">
    <div class="orb"><span>🧠</span></div>
    <h1>Deine Auswertung wird erstellt…</h1>
    <p class="muted" id="eval-tip">Die KI analysiert Grammatik, Wortschatz, Redefluss und Zusammenhang.</p>
    <div class="dots"><i></i><i></i><i></i></div>
  </main>`;
}

function resultView() {
  const e = lastEval;
  const deltaText =
    e.previous == null
      ? "Dein erster Score – der Startpunkt deiner Reise! 🌱"
      : e.isBest
        ? `🏆 Neuer Bestwert! ${e.overall - e.previous >= 0 ? "+" : ""}${e.overall - e.previous} zum letzten Mal`
        : e.overall >= e.previous
          ? `📈 +${e.overall - e.previous} gegenüber dem letzten Mal`
          : `${e.overall - e.previous} zum letzten Mal – Tagesform schwankt, dranbleiben! 💪`;
  return `
  ${topbar("Deine Auswertung")}
  <main class="page result">
    <section class="card result-hero">
      <div class="score-big">
        ${ring(e.overall, 210, 18, "big")}
        <div class="score-big-inner"><b id="score-num">0</b><small>von 100</small></div>
      </div>
      <div class="result-headline">
        <span class="cefr-badge">${esc(e.cefr)}</span>
        <h1>${scoreWord(e.overall)}</h1>
        <p class="delta">${deltaText}</p>
        <p>${esc(e.summary)}</p>
        <p class="muted small">${e.emoji} ${esc(e.topic)} · ${e.turns} Antworten · ${Math.max(1, Math.round(e.minutes))} Min</p>
      </div>
    </section>

    <section class="card">
      <h2>Deine Teilbereiche</h2>
      <div class="bars">
        ${METRICS.slice(1)
          .map(
            (m) => `<div class="bar-row"><span>${m.label}</span><div class="bar"><div data-bar="${e[m.key]}"></div></div><b>${e[m.key]}</b></div>`,
          )
          .join("")}
      </div>
    </section>

    ${
      e.strengths?.length
        ? `<section class="card"><h2>Das hast du richtig gut gemacht 💚</h2><ul class="strengths">${e.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>`
        : ""
    }

    ${
      e.improvements?.length
        ? `<section class="card"><h2>So klingst du noch natürlicher ✍️</h2>
        <div class="fixes">${e.improvements
          .map(
            (f) => `<div class="fix">
              <div class="fix-orig">„${esc(f.original)}"</div>
              <div class="fix-better" data-say-text="${esc(f.better)}">✓ ${esc(f.better)} <span class="say-icon">🔈</span></div>
              <div class="fix-why">${esc(f.explanation)}</div>
            </div>`,
          )
          .join("")}</div></section>`
        : ""
    }

    ${
      e.vocabulary_tips?.length
        ? `<section class="card"><h2>Neue Wörter für dieses Thema 📚</h2>
        <div class="vocab">${e.vocabulary_tips
          .map((v) => `<button class="vocab-chip" data-say-text="${esc(v.phrase)}"><b>${esc(v.phrase)}</b><small>${esc(v.meaning)}</small></button>`)
          .join("")}</div></section>`
        : ""
    }

    <section class="card goal">
      <span>🎯</span>
      <div><h2>Dein Ziel fürs nächste Mal</h2><p>${esc(e.next_goal)}</p></div>
    </section>

    <p class="privacy-note">🔒 Das Gespräch wurde gelöscht. Gespeichert wurde nur dein Score. Diese Tipps siehst du nur jetzt.</p>
    <div class="result-actions">
      <button class="btn primary big" data-go="home">Neues Gespräch 🎙️</button>
      <button class="btn ghost big" data-go="progress">Fortschritt ansehen 📈</button>
    </div>
  </main>`;
}

function progressView() {
  const results = getResults();
  const stats = computeStats(results);
  const recent = results.slice(-5);
  const avgOf = (key) => (recent.length ? Math.round(recent.reduce((a, r) => a + (r[key] || 0), 0) / recent.length) : 0);
  const trendText =
    stats.trend == null
      ? "Nach ein paar Gesprächen zeigen wir dir hier deinen Trend."
      : stats.trend > 0
        ? `Deine letzten 5 Gespräche liegen im Schnitt <b>${stats.trend} Punkte</b> über deinen ersten. Super Entwicklung! 🚀`
        : stats.trend === 0
          ? "Du hältst dein Niveau stabil. Probier mal ein schwereres Level! 💪"
          : "Die letzten Runden waren etwas schwächer – ganz normal. Bleib dran! 🌱";

  return `
  ${topbar("Dein Fortschritt")}
  <main class="page progress">
    <section class="stat-grid">
      <div class="stat"><span>🗣️</span><b>${stats.count}</b><small>Gespräche</small></div>
      <div class="stat"><span>⌀</span><b>${stats.avg || "–"}</b><small>Ø Score</small></div>
      <div class="stat"><span>🏆</span><b>${stats.best || "–"}</b><small>Bestwert</small></div>
      <div class="stat"><span>🔥</span><b>${stats.streak}</b><small>Tage in Folge</small></div>
      <div class="stat"><span>⏱️</span><b>${stats.minutes}</b><small>Minuten gesprochen</small></div>
    </section>

    <section class="card">
      <div class="section-head">
        <h2>Verlauf</h2>
        <div class="segmented compact" role="radiogroup">
          ${METRICS.map((m) => `<button role="radio" aria-checked="${chartMetric === m.key}" class="seg ${chartMetric === m.key ? "active" : ""}" data-metric="${m.key}">${m.label}</button>`).join("")}
        </div>
      </div>
      <div class="chart" id="chart"></div>
      <p class="trend">${trendText}</p>
    </section>

    ${
      recent.length
        ? `<section class="card"><h2>Deine Stärken & Baustellen <small class="muted">(letzte ${recent.length})</small></h2>
      <div class="bars">${METRICS.slice(1)
        .map((m) => `<div class="bar-row"><span>${m.label}</span><div class="bar"><div data-bar="${avgOf(m.key)}"></div></div><b>${avgOf(m.key)}</b></div>`)
        .join("")}</div></section>`
        : ""
    }

    <section class="card">
      <h2>Erfolge</h2>
      <div class="achievements">
        ${ACHIEVEMENTS.map((a) => {
          const got = a.test(stats);
          return `<div class="achievement ${got ? "got" : ""}"><span>${got ? a.emoji : "🔒"}</span><b>${a.title}</b><small>${a.desc}</small></div>`;
        }).join("")}
      </div>
    </section>

    <section class="card">
      <h2>Alle Gespräche</h2>
      ${
        results.length
          ? `<ul class="history">${[...results]
              .reverse()
              .map(
                (r) => `<li><span class="h-emoji">${r.emoji ?? "💬"}</span>
                <div class="h-main"><b>${esc(r.topic)}</b><small>${relativeDay(r.date)} · Niveau ${esc(r.level)} · ${Math.max(1, Math.round(r.minutes || 0))} Min</small></div>
                <span class="cefr-chip">${esc(r.cefr)}</span><span class="h-score">${r.overall}</span></li>`,
              )
              .join("")}</ul>`
          : `<p class="muted">Noch keine Gespräche. Dein erstes wartet schon! 😊</p>`
      }
    </section>

    <section class="card data-card">
      <h2>Deine Daten</h2>
      <p class="muted">Deine Scores liegen nur auf diesem Gerät. Mit einer Sicherung kannst du sie auf ein anderes Gerät mitnehmen.</p>
      <div class="row-btns">
        <button class="btn ghost" id="export">⬇️ Sicherung exportieren</button>
        <label class="btn ghost">⬆️ Sicherung importieren<input type="file" id="import" accept="application/json" hidden /></label>
        <button class="btn danger" id="reset">Alle Scores löschen</button>
      </div>
    </section>
  </main>`;
}

function settingsView() {
  const voices = englishVoices();
  return `
  ${topbar("Einstellungen")}
  <main class="page settings">
    <section class="card">
      <h2>Profil</h2>
      <label class="field"><span>Dein Name</span><input id="s-name" type="text" value="${esc(settings.name)}" placeholder="optional" /></label>
    </section>

    <section class="card">
      <h2>Stimme</h2>
      ${
        canSpeak
          ? `<label class="field"><span>Stimme der KI</span>
        <select id="s-voice">
          <option value="">Automatisch</option>
          ${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === settings.voiceURI ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("")}
        </select></label>
        <label class="field"><span>Sprechtempo <b id="rate-val">${settings.speechRate.toFixed(2)}×</b></span>
          <input id="s-rate" type="range" min="0.6" max="1.3" step="0.05" value="${settings.speechRate}" /></label>
        <button class="btn ghost" id="s-test">🔈 Stimme testen</button>
        <p class="fineprint">Tipp: Schönere Stimmen lädst du unter iPad-Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Englisch (z. B. „Ava (Premium)").</p>`
          : `<p class="muted">Dein Browser unterstützt keine Sprachausgabe.</p>`
      }
      <label class="switch"><input type="checkbox" id="s-autospeak" ${settings.autoSpeak ? "checked" : ""}/><span></span>Antworten der KI automatisch vorlesen</label>
      <label class="switch"><input type="checkbox" id="s-autosend" ${settings.autoSend ? "checked" : ""}/><span></span>Nach dem Sprechen automatisch senden</label>
      ${canListen ? "" : `<p class="fineprint">Die Spracherkennung im Browser ist hier nicht verfügbar. Nutze stattdessen die 🎤-Diktiertaste der iPad-Tastatur (Sprache auf Englisch stellen).</p>`}
    </section>

    <section class="card">
      <h2>KI-Verbindung</h2>
      <label class="field"><span>Gemini API-Schlüssel</span>
        <input id="s-key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(settings.apiKey)}" placeholder="AIza…" /></label>
      <p class="fineprint">Den kostenlosen Schlüssel bekommst du auf <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. Er wird nur auf diesem Gerät gespeichert. Die Gratis-Stufe hat ein Tageslimit an Anfragen – für mehrere Gespräche pro Tag reicht es normalerweise.</p>
    </section>

    <section class="card">
      <h2>🔒 Datenschutz</h2>
      <ul class="plain">
        <li><b>Gespräche werden nie gespeichert</b> – weder auf dem iPad noch in der App. Sie existieren nur im Arbeitsspeicher und werden nach der Auswertung (oder beim Abbrechen) verworfen.</li>
        <li>Gespeichert werden nur deine <b>Scores</b> (Datum, Thema, Punkte, Niveau) – lokal auf diesem Gerät.</li>
        <li>Zum Antworten und Auswerten wird der Gesprächstext an die KI (Google Gemini API) gesendet. Für Nutzer in der EU nutzt Google diese Inhalte laut seinen Nutzungsbedingungen auch in der Gratis-Stufe nicht zur Verbesserung seiner Produkte. Die Spracherkennung läuft über die Diktierfunktion von Apple.</li>
      </ul>
    </section>
    <button class="btn primary big" id="s-save">Speichern</button>
  </main>`;
}

// ---------------------------------------------------------------- rendering & events

function render() {
  const views = { welcome: welcomeView, home: homeView, chat: chatView, evaluating: evaluatingView, result: resultView, progress: progressView, settings: settingsView };
  app.className = `view-${view}`;
  app.innerHTML = views[view]();
  bindCommon();
  ({ welcome: bindWelcome, home: bindHome, chat: bindChat, result: bindResult, progress: bindProgress, settings: bindSettings })[view]?.();
  animateRings();
}

function bindCommon() {
  app.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => {
      if (view === "result") lastEval = null;
      go(b.dataset.go);
    }),
  );
}

function bindWelcome() {
  document.getElementById("w-save").addEventListener("click", () => {
    const key = document.getElementById("w-key").value.trim();
    if (key.length < 20) return toast("Bitte füge deinen Gemini-API-Schlüssel ein (beginnt meist mit „AIza“).");
    settings = saveSettings({ apiKey: key, name: document.getElementById("w-name").value.trim() });
    go("home");
    toast("Alles bereit! Wähle ein Thema. 🎉");
  });
}

function bindHome() {
  app.querySelectorAll("[data-topic]").forEach((b) =>
    b.addEventListener("click", () => {
      const t = dailyTopics(DAILY_TOPICS).find((x) => String(x.id) === b.dataset.topic);
      startConversation(t.title, t.emoji);
    }),
  );
  const input = document.getElementById("custom-topic");
  input.addEventListener("input", () => (customTopic = input.value));
  const startCustom = () => {
    const t = input.value.trim();
    if (!t) return toast("Schreib kurz, worüber du reden möchtest. 😊");
    startConversation(t, "🎲");
  };
  document.getElementById("custom-go").addEventListener("click", startCustom);
  input.addEventListener("keydown", (e) => e.key === "Enter" && startCustom());
  app.querySelectorAll("[data-level]").forEach((b) =>
    b.addEventListener("click", () => {
      settings = saveSettings({ level: b.dataset.level });
      render();
    }),
  );
}

// ---------------------------------------------------------------- conversation

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && "wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
    else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    /* not supported – no problem */
  }
}

function startConversation(topic, emoji) {
  unlockSpeech();
  convo = {
    topic,
    emoji,
    level: settings.level,
    history: [{ role: "user", content: OPENING, hidden: true }],
    learnerTurns: 0,
    spokenTurns: 0,
    startedAt: Date.now(),
    busy: false,
    recognizer: null,
    speaker: null,
    abort: null,
    spokenDraft: false,
    timer: null,
  };
  keepAwake(true);
  go("chat");
  askAI();
}

function endConversation() {
  if (!convo) return;
  convo.abort?.abort();
  convo.recognizer?.cancel();
  convo.speaker?.stop();
  clearInterval(convo.timer);
  convo = null; // drop the transcript
  keepAwake(false);
}

function setStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}

function scrollDown() {
  const m = document.getElementById("messages");
  if (m) m.scrollTop = m.scrollHeight;
}

function updateFinishButton() {
  const btn = document.getElementById("finish");
  if (!btn || !convo) return;
  const remaining = Math.max(0, MIN_TURNS - convo.learnerTurns);
  btn.disabled = remaining > 0 || convo.busy;
  btn.textContent = remaining ? `Noch ${remaining} ${remaining === 1 ? "Antwort" : "Antworten"}` : "Beenden & auswerten ✓";
  const strip = app.querySelector(".progress-strip div");
  if (strip) strip.style.width = `${Math.min(100, (convo.learnerTurns / MIN_TURNS) * 100)}%`;
}

function setBusy(busy) {
  convo.busy = busy;
  app.querySelector(".chat-screen")?.classList.toggle("busy", busy);
  updateFinishButton();
}

async function askAI() {
  const c = convo;
  const list = document.getElementById("messages");
  const wrap = document.createElement("div");
  wrap.className = "msg ai";
  wrap.innerHTML = `<div class="avatar">🌞</div><div class="bubble typing"><i></i><i></i><i></i></div>`;
  list.append(wrap);
  scrollDown();
  const bubbleEl = wrap.querySelector(".bubble");
  setBusy(true);
  setStatus("Sunny denkt nach…");

  const speaker = settings.autoSpeak
    ? createSpeaker({
        voiceURI: settings.voiceURI,
        rate: settings.speechRate,
        onStart: () => convo === c && (setStatus("Sunny spricht… (tippe aufs Mikrofon, um zu unterbrechen)"), app.querySelector(".chat-screen")?.classList.add("speaking")),
        onEnd: () => convo === c && (setStatus(""), app.querySelector(".chat-screen")?.classList.remove("speaking")),
      })
    : null;
  c.speaker = speaker;
  c.abort = new AbortController();

  let text = "";
  try {
    const reply = await streamReply({
      apiKey: settings.apiKey,
      topic: c.topic,
      level: c.level,
      name: settings.name,
      history: c.history,
      signal: c.abort.signal,
      onText: (delta) => {
        if (convo !== c) return;
        if (!text) bubbleEl.classList.remove("typing");
        text += delta;
        bubbleEl.textContent = text;
        speaker?.feed(delta);
        scrollDown();
      },
    });
    if (convo !== c) return;
    speaker?.flush();
    bubbleEl.classList.remove("typing");
    bubbleEl.textContent = reply;
    bubbleEl.setAttribute("data-say", "");
    c.history.push({ role: "assistant", content: reply });
    if (!speaker) setStatus("");
  } catch (err) {
    if (convo !== c) return;
    speaker?.stop();
    wrap.remove();
    const errEl = document.createElement("div");
    errEl.className = "msg error";
    errEl.innerHTML = `<div class="bubble">⚠️ ${esc(friendlyError(err))} <button class="btn small">Nochmal versuchen</button></div>`;
    errEl.querySelector("button").addEventListener("click", () => {
      errEl.remove();
      askAI();
    });
    list.append(errEl);
    setStatus("");
    scrollDown();
  } finally {
    if (convo === c) setBusy(false);
  }
}

function sendLearner(text, spoken) {
  const c = convo;
  text = text.trim();
  if (!text || !c || c.busy) return;
  document.getElementById("ideas").hidden = true;
  c.speaker?.stop();
  // After a failed request the last turn may already be the learner's – merge instead of sending two in a row.
  const last = c.history[c.history.length - 1];
  if (last.role === "user" && !last.hidden) {
    last.content += "\n" + text;
    app.querySelector(".msg.error")?.remove();
  } else c.history.push({ role: "user", content: text });
  c.learnerTurns++;
  if (spoken) c.spokenTurns++;
  document.getElementById("messages").insertAdjacentHTML("beforeend", bubble("user", text));
  askAI();
}

function bindChat() {
  const c = convo;
  const input = document.getElementById("input");
  const mic = document.getElementById("mic");
  const screen = app.querySelector(".chat-screen");

  c.timer = setInterval(() => {
    const el = document.getElementById("timer");
    if (el && convo === c) el.textContent = formatDuration(Date.now() - c.startedAt);
  }, 1000);

  const autoGrow = () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(160, input.scrollHeight)}px`;
  };
  input.addEventListener("input", () => {
    c.spokenDraft = false;
    autoGrow();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });
  function submit() {
    if (c.busy) return toast("Einen Moment – Sunny antwortet gerade. 🙂", 2000);
    const text = input.value;
    const spoken = c.spokenDraft;
    input.value = "";
    c.spokenDraft = false;
    autoGrow();
    sendLearner(text, spoken);
  }
  document.getElementById("send").addEventListener("click", submit);

  mic.addEventListener("click", () => {
    unlockSpeech();
    if (!canListen) {
      toast("Tippe ins Textfeld und nutze die 🎤-Diktiertaste der iPad-Tastatur (auf Englisch stellen).", 5000);
      input.focus();
      return;
    }
    if (c.recognizer) {
      c.recognizer.stop();
      return;
    }
    c.speaker?.stop();
    screen.classList.add("listening");
    setStatus("Ich höre zu… tippe nochmal, wenn du fertig bist.");
    const before = input.value.trim();
    c.recognizer = listen({
      onInterim: (t) => {
        input.value = (before ? before + " " : "") + t;
        autoGrow();
      },
      onDone: (t) => {
        c.recognizer = null;
        screen.classList.remove("listening");
        setStatus("");
        const full = ((before ? before + " " : "") + t).trim();
        input.value = full;
        c.spokenDraft = Boolean(t);
        autoGrow();
        if (!t) return toast("Ich habe nichts gehört – versuch es nochmal. 🎙️", 2500);
        if (settings.autoSend && !c.busy) submit();
      },
      onError: (msg) => {
        toast(msg, 6000);
      },
    });
  });

  document.getElementById("toggle-voice").addEventListener("click", (e) => {
    settings = saveSettings({ autoSpeak: !settings.autoSpeak });
    e.currentTarget.textContent = settings.autoSpeak ? "🔊" : "🔇";
    if (!settings.autoSpeak) c.speaker?.stop();
    toast(settings.autoSpeak ? "Sunny liest ihre Antworten vor." : "Vorlesen aus.", 1800);
  });

  document.getElementById("messages").addEventListener("click", (e) => {
    const b = e.target.closest("[data-say]");
    if (b && !b.classList.contains("typing")) {
      c.speaker?.stop();
      speakOnce(b.textContent, { voiceURI: settings.voiceURI, rate: settings.speechRate });
    }
  });

  document.getElementById("ideas-btn").addEventListener("click", async () => {
    const box = document.getElementById("ideas");
    if (!box.hidden) return (box.hidden = true);
    box.hidden = false;
    box.innerHTML = `<div class="ideas-head">💡 Ideen werden gesucht…</div>`;
    try {
      const ideas = await suggestIdeas({ apiKey: settings.apiKey, topic: c.topic, level: c.level, history: c.history });
      if (convo !== c) return;
      box.innerHTML = `<div class="ideas-head">💡 Du könntest z. B. sagen – tippe zum Übernehmen, dann laut aussprechen!</div>${ideas
        .map((i) => `<button class="idea">${esc(i)}</button>`)
        .join("")}`;
      box.querySelectorAll(".idea").forEach((b) =>
        b.addEventListener("click", () => {
          speakOnce(b.textContent, { voiceURI: settings.voiceURI, rate: settings.speechRate });
          box.hidden = true;
          toast("Hör gut zu und sprich es dann selbst nach! 🎙️", 2500);
        }),
      );
    } catch (err) {
      box.innerHTML = `<div class="ideas-head">⚠️ ${esc(friendlyError(err))}</div>`;
    }
  });

  document.getElementById("chat-cancel").addEventListener("click", () => {
    if (convo.learnerTurns > 0 && !confirm("Gespräch abbrechen? Es wird nicht ausgewertet und sofort gelöscht.")) return;
    endConversation();
    go("home");
  });

  document.getElementById("finish").addEventListener("click", runEvaluation);
}

const EVAL_TIPS = [
  "Wusstest du? Schon 10 Minuten tägliches Sprechen verbessern deinen Redefluss spürbar.",
  "Die KI achtet auf typische Fehler deutscher Muttersprachler.",
  "Dein Score wird mit deinen bisherigen Gesprächen verglichen.",
  "Gleich bekommst du konkrete Tipps, wie du natürlicher klingst.",
];

async function runEvaluation() {
  const c = convo;
  if (!c || c.busy) return;
  c.recognizer?.cancel();
  c.speaker?.stop();
  clearInterval(c.timer);
  go("evaluating");
  let tipIndex = 0;
  const tipTimer = setInterval(() => {
    const el = document.getElementById("eval-tip");
    if (el) el.textContent = EVAL_TIPS[tipIndex++ % EVAL_TIPS.length];
  }, 3500);
  try {
    const data = await evaluate({
      apiKey: settings.apiKey,
      topic: c.topic,
      level: c.level,
      history: c.history,
      spokenTurns: c.spokenTurns,
    });
    const before = computeStats();
    const minutes = (Date.now() - c.startedAt) / 60000;
    const now = new Date();
    addResult({
      id: `${now.getTime()}`,
      date: now.toISOString(),
      day: todayKey(now),
      topic: c.topic,
      emoji: c.emoji,
      level: c.level,
      cefr: data.cefr,
      overall: data.overall,
      grammar: data.grammar,
      vocabulary: data.vocabulary,
      fluency: data.fluency,
      coherence: data.coherence,
      turns: c.learnerTurns,
      minutes: Math.round(minutes * 10) / 10,
    });
    lastEval = {
      ...data,
      topic: c.topic,
      emoji: c.emoji,
      turns: c.learnerTurns,
      minutes,
      previous: before.last?.overall ?? null,
      isBest: before.count > 0 && data.overall > before.best,
    };
    endConversation();
    clearInterval(tipTimer);
    go("result");
  } catch (err) {
    clearInterval(tipTimer);
    app.querySelector(".evaluating").innerHTML = `
      <div class="orb error"><span>😕</span></div>
      <h1>Die Auswertung hat nicht geklappt</h1>
      <p class="muted">${esc(friendlyError(err))}</p>
      <div class="row-btns center">
        <button class="btn primary" id="retry-eval">Nochmal versuchen</button>
        <button class="btn ghost" id="back-chat">Zurück zum Gespräch</button>
      </div>`;
    document.getElementById("retry-eval").addEventListener("click", runEvaluation);
    document.getElementById("back-chat").addEventListener("click", () => go("chat"));
  }
}

function bindResult() {
  if (!lastEval) return go("home");
  countUp(document.getElementById("score-num"), lastEval.overall);
  if (lastEval.isBest || lastEval.previous == null) setTimeout(confetti, 600);
  app.querySelectorAll("[data-say-text]").forEach((el) =>
    el.addEventListener("click", () => speakOnce(el.dataset.sayText, { voiceURI: settings.voiceURI, rate: settings.speechRate })),
  );
}

function bindProgress() {
  const results = getResults();
  const draw = () => renderChart(document.getElementById("chart"), results, chartMetric, METRICS.find((m) => m.key === chartMetric).label);
  draw();
  app.querySelectorAll("[data-metric]").forEach((b) =>
    b.addEventListener("click", () => {
      chartMetric = b.dataset.metric;
      app.querySelectorAll("[data-metric]").forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-checked", x === b);
      });
      draw();
    }),
  );
  document.getElementById("export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(getResults(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `speakup-scores-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  document.getElementById("import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const n = importResults(JSON.parse(await file.text()));
      toast(`${n} Ergebnisse importiert. ✅`);
      render();
    } catch {
      toast("Die Datei konnte nicht gelesen werden.");
    }
  });
  document.getElementById("reset").addEventListener("click", () => {
    if (!confirm("Wirklich alle gespeicherten Scores löschen? Das kann nicht rückgängig gemacht werden.")) return;
    deleteAllResults();
    render();
  });
}

function bindSettings() {
  const rate = document.getElementById("s-rate");
  rate?.addEventListener("input", () => (document.getElementById("rate-val").textContent = `${Number(rate.value).toFixed(2)}×`));
  document.getElementById("s-test")?.addEventListener("click", () =>
    speakOnce("Hi there! I'm Sunny. Let's practise your English together.", {
      voiceURI: document.getElementById("s-voice").value,
      rate: Number(rate.value),
    }),
  );
  document.getElementById("s-save").addEventListener("click", () => {
    const key = document.getElementById("s-key").value.trim();
    if (!key) return toast("Ohne API-Schlüssel kann die KI nicht antworten.");
    settings = saveSettings({
      name: document.getElementById("s-name").value.trim(),
      apiKey: key,
      voiceURI: document.getElementById("s-voice")?.value ?? settings.voiceURI,
      speechRate: rate ? Number(rate.value) : settings.speechRate,
      autoSpeak: document.getElementById("s-autospeak").checked,
      autoSend: document.getElementById("s-autosend").checked,
    });
    toast("Gespeichert ✅", 1800);
    go("home");
  });
}

// Voices load asynchronously on iPadOS.
if (canSpeak) speechSynthesis.addEventListener?.("voiceschanged", () => view === "settings" && render());

// Refresh the home screen (new daily topics, countdown) while the app stays open.
setInterval(() => view === "home" && !document.activeElement?.matches("input") && render(), 60000);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

render();
