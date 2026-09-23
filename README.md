# 💬 SpeakUp English

Eine iPad-App zum Englisch-Sprechen-Üben mit einer KI als Gesprächspartnerin („Sunny“).

- 🗓️ **Jeden Tag 5 neue Themen**: von „Dream vacation“ bis zum Rollenspiel „Job interview“, dazu ein eigenes Thema nach Wahl
- 🎙️ **Sprechen statt tippen**: Du sprichst ins Mikrofon, Sunny antwortet und liest ihre Antwort laut vor
- 🎚️ **4 Niveaus** (A2–C1): Die KI passt Wortschatz und Satzbau an dich an
- 💡 **Ideen-Knopf**, wenn dir gerade nichts einfällt
- 📊 **Auswertung nach jedem Gespräch**: Score 0–100, GER-Niveau, Teilnoten (Grammatik, Wortschatz, Redefluss, Zusammenhang), konkrete Verbesserungen und neue Vokabeln
- 📈 **Fortschritt**: Verlaufsdiagramm, Tage in Folge, Bestwert und Erfolge
- 🔒 **Privat**: Gespräche werden **nie gespeichert**, nur deine Scores

## Auf dem iPad installieren

1. **App veröffentlichen** (einmalig): Im GitHub-Repository unter **Settings → Pages** bei „Source“ **GitHub Actions** auswählen. Danach baut der Workflow `.github/workflows/deploy.yml` die App bei jedem Push automatisch. Die Adresse steht anschließend unter *Settings → Pages*, z. B. `https://<dein-name>.github.io/englisch/`.
2. Die Adresse auf dem iPad in **Safari** öffnen.
3. Auf **Teilen** (Quadrat mit Pfeil) → **Zum Home-Bildschirm** tippen. Jetzt startet SpeakUp wie eine normale App im Vollbild.
4. Beim ersten Start deinen **Anthropic-API-Schlüssel** eingeben:
   - Auf [console.anthropic.com](https://console.anthropic.com/settings/keys) anmelden
   - Unter *Billing* etwas Guthaben aufladen
   - Unter *API Keys* einen Schlüssel erstellen und in der App einfügen
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

Damit die KI antworten und auswerten kann, wird der Gesprächstext an die Anthropic-API geschickt. Die Spracherkennung läuft über die Diktierfunktion von Apple. Die App hat keinen eigenen Server.

Unter *Fortschritt → Deine Daten* kannst du deine Scores als Datei sichern und auf einem anderen Gerät wieder importieren.

## Kosten

Die App nutzt das Modell `claude-opus-5`. Für Gespräche läuft es mit wenig „Nachdenk“-Aufwand (schnelle Antworten), für die Auswertung mit hohem Aufwand (gründliche Analyse). Grobe Schätzung: Ein Gespräch von etwa 10 Minuten inklusive Auswertung kostet ungefähr 20–40 Cent (hängt von der Länge ab). Deinen Verbrauch siehst du jederzeit in der Anthropic Console.

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
| `src/ai.js` | KI-Anbindung (Gespräch, Ideen, Auswertung mit festem JSON-Schema) |
| `src/speech.js` | Spracherkennung und Sprachausgabe (Web Speech API) |
| `src/topics.js` | Themen-Pool und tägliche Auswahl |
| `src/storage.js` | Speicherung von Scores und Einstellungen, Statistiken, Erfolge |
| `src/chart.js` | Fortschrittsdiagramm |
| `src/style.css` | Design (hell und dunkel) |
