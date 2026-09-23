# 💬 SpeakUp English

Eine iPad-App zum Englisch-Sprechen-Üben mit einer KI als Gesprächspartnerin („Sunny“). **Komplett kostenlos:** Die KI läuft über den Gratis-Plan von Mistral (Frankreich), das Hosting über GitHub Pages.

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
4. Beim ersten Start deinen **kostenlosen Mistral-API-Schlüssel** eingeben:
   - Auf [console.mistral.ai](https://console.mistral.ai) ein Konto erstellen
   - Den Gratis-Plan **Experiment** wählen und die Handynummer bestätigen (keine Kreditkarte nötig)
   - Unter **API Keys** einen Schlüssel erstellen, kopieren und in der App einfügen
   - Empfohlen: In den Datenschutz-Einstellungen (*Privacy*) des Mistral-Kontos das Training mit deinen Daten ausschalten
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

Damit die KI antworten und auswerten kann, wird der Gesprächstext an die API von Mistral AI (Frankreich, EU) geschickt. Im Gratis-Plan darf Mistral API-Eingaben und -Antworten zum Training seiner Modelle nutzen, solange du das nicht in den Datenschutz-Einstellungen deines Mistral-Kontos abschaltest. Die Spracherkennung läuft über die Diktierfunktion von Apple. Die App hat keinen eigenen Server.

Unter *Fortschritt → Deine Daten* kannst du deine Scores als Datei sichern und auf einem anderen Gerät wieder importieren.

## Kosten

**0 €.** Die App nutzt den kostenlosen Plan *Experiment* von Mistral (ohne Kreditkarte). Für die Gespräche nimmt sie das schnelle Modell `mistral-small-latest`, für die Auswertung `mistral-medium-latest` (Ersatz: `mistral-large-latest`, dann `mistral-small-latest`). Der Gratis-Plan erlaubt nur wenige Anfragen pro Sekunde. Wenn es kurz zu viele sind, wartet die App automatisch und versucht es erneut.

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
| `src/ai.js` | KI-Anbindung an Mistral (Gespräch, Ideen, Auswertung mit festem JSON-Schema) |
| `src/speech.js` | Spracherkennung und Sprachausgabe (Web Speech API) |
| `src/topics.js` | Themen-Pool und tägliche Auswahl |
| `src/storage.js` | Speicherung von Scores und Einstellungen, Statistiken, Erfolge |
| `src/chart.js` | Fortschrittsdiagramm |
| `src/style.css` | Design (hell und dunkel) |
