# 💬 SpeakUp English

Eine iPad-App zum Englisch-Sprechen-Üben mit einer KI als Gesprächspartnerin („Sunny“). **Komplett kostenlos:** Die KI läuft über die Gratis-Stufe von Groq (sehr schnelle Antworten), das Hosting über GitHub Pages.

- 🗓️ **Jeden Tag 5 neue Themen**: von „Dream vacation“ bis zum Rollenspiel „Job interview“, dazu ein eigenes Thema nach Wahl
- 🎙️ **Sprechen statt tippen**: Du sprichst ins Mikrofon, Sunny antwortet und liest ihre Antwort laut vor
- 🎚️ **4 Niveaus** (A2–C1): Die KI passt Wortschatz und Satzbau an dich an
- 💡 **Ideen-Knopf**, wenn dir gerade nichts einfällt
- 📊 **Auswertung nach jedem Gespräch**: Score 0–100, GER-Niveau, Teilnoten (Grammatik, Wortschatz, Redefluss, Zusammenhang), konkrete Verbesserungen und neue Vokabeln
- 📈 **Fortschritt**: Verlaufsdiagramm, Tage in Folge, Bestwert und Erfolge
- 🔒 **Privat**: Gespräche werden **nie gespeichert**, nur deine Scores

## Auf dem iPad installieren

1. **App veröffentlichen** (einmalig):
   - Das Repository öffentlich machen: **Settings → General → Danger Zone → Change repository visibility → Public**. Nur dann ist GitHub Pages kostenlos. Im Code stehen keine Geheimnisse, dein Schlüssel liegt nur auf dem iPad.
   - Unter **Settings → Pages** bei „Source“ **GitHub Actions** auswählen. Danach baut der Workflow `.github/workflows/deploy.yml` die App bei jedem Push automatisch. Die Adresse steht anschließend unter *Settings → Pages*, z. B. `https://<dein-name>.github.io/englisch/`.
2. Die Adresse auf dem iPad in **Safari** öffnen.
3. Auf **Teilen** (Quadrat mit Pfeil) → **Zum Home-Bildschirm** tippen. Jetzt startet SpeakUp wie eine normale App im Vollbild.
4. Beim ersten Start deinen **kostenlosen Groq-API-Schlüssel** eingeben:
   - Auf [console.groq.com/keys](https://console.groq.com/keys) ein kostenloses Konto erstellen (keine Kreditkarte nötig)
   - **Create API Key** antippen, einen Namen vergeben und den Schlüssel (beginnt mit `gsk_`) kopieren
   - Den Schlüssel in der App einfügen
   - Optional: In den Groq-Einstellungen **Zero Data Retention** einschalten
5. Beim ersten Tippen aufs Mikrofon den **Mikrofon-Zugriff erlauben**.

**Tipps für eine schönere Stimme:** iPad-Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Englisch → z. B. „Ava (Premium)“ laden und danach in den App-Einstellungen auswählen.

Falls die Spracherkennung im Browser nicht verfügbar ist, kannst du die 🎤-Diktiertaste der iPad-Tastatur verwenden (Tastatursprache auf Englisch stellen).

## Datenschutz

| Was | Wo |
|---|---|
| Gesprächsverlauf | nur im Arbeitsspeicher der App, wird nach der Auswertung oder beim Abbrechen verworfen, nie auf dem Gerät gespeichert |
| Korrekturen und Tipps der Auswertung | nur einmal angezeigt, nicht gespeichert |
| Scores (Datum, Thema, Punkte, Niveau, Dauer) | lokal auf dem iPad (`localStorage`) |
| API-Schlüssel und Einstellungen | lokal auf dem iPad |

Damit die KI antworten und auswerten kann, wird der Gesprächstext an den KI-Dienst Groq (USA) geschickt. Laut [Groq](https://console.groq.com/docs/your-data) werden Anfragen standardmäßig nicht gespeichert und nicht zum Training genutzt. Nur zur Fehlersuche oder bei Missbrauchsverdacht können sie bis zu 30 Tage protokolliert werden. Mit *Zero Data Retention* in den Groq-Einstellungen lässt sich auch das abschalten. Die Spracherkennung läuft über die Diktierfunktion von Apple. Die App hat keinen eigenen Server.

Unter *Fortschritt → Deine Daten* kannst du deine Scores als Datei sichern und auf einem anderen Gerät wieder importieren.

## Kosten

**0 €.** Die App nutzt die kostenlose Stufe von Groq (ohne Kreditkarte). Für Gespräche nimmt sie `llama-3.3-70b-versatile`, für die Auswertung `openai/gpt-oss-120b`. Die Gratis-Limits gelten pro Modell. Ist eines gerade ausgelastet oder für heute aufgebraucht, übernimmt automatisch ein anderes (`openai/gpt-oss-120b`, `llama-3.1-8b-instant` bzw. `llama-3.3-70b-versatile`, `openai/gpt-oss-20b`). Sind alle erschöpft, zeigt die App einen Hinweis, und am nächsten Tag geht es weiter.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver (auch im WLAN erreichbar, z. B. zum Testen auf dem iPad)
npm run build    # Produktions-Build nach dist/
```

Aufbau:

| Datei | Inhalt |
|---|---|
| `src/main.js` | Oberfläche, Ansichten und Gesprächsablauf |
| `src/ai.js` | KI-Anbindung an Groq (Gespräch, Ideen, Auswertung mit festem JSON-Schema) |
| `src/speech.js` | Spracherkennung und Sprachausgabe (Web Speech API) |
| `src/topics.js` | Themen-Pool und tägliche Auswahl |
| `src/storage.js` | Speicherung von Scores und Einstellungen, Statistiken, Erfolge |
| `src/chart.js` | Fortschrittsdiagramm |
| `src/style.css` | Design (hell und dunkel) |
