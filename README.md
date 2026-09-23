# 💬 SpeakUp English

Eine iPad-App zum Englisch-Sprechen-Üben mit einer KI als Gesprächspartnerin („Sunny“). **Komplett kostenlos:** Die KI läuft über die Gratis-Stufe von Google Gemini, das Hosting über GitHub Pages.

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
4. Beim ersten Start deinen **kostenlosen Gemini-API-Schlüssel** eingeben:
   - Auf [aistudio.google.com/apikey](https://aistudio.google.com/apikey) mit deinem Google-Konto anmelden
   - *API-Schlüssel erstellen* (Create API key) antippen, **ohne** Abrechnung/Billing einzurichten
   - Den Schlüssel kopieren und in der App einfügen
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

Damit die KI antworten und auswerten kann, wird der Gesprächstext an die Google-Gemini-API geschickt. Laut den [Gemini-API-Nutzungsbedingungen](https://ai.google.dev/gemini-api/terms) gelten für Nutzer in der EU, der Schweiz und Großbritannien auch in der kostenlosen Stufe die Datenregeln der bezahlten Stufe: Google verwendet die Inhalte dann nicht zur Verbesserung seiner Produkte. Außerhalb dieser Regionen darf Google Inhalte aus der Gratis-Stufe dafür nutzen, und Menschen können sie lesen. Die Spracherkennung läuft über die Diktierfunktion von Apple. Die App hat keinen eigenen Server.

Unter *Fortschritt → Deine Daten* kannst du deine Scores als Datei sichern und auf einem anderen Gerät wieder importieren.

## Kosten

**0 €.** Die App nutzt die kostenlose Stufe der Gemini-API (ohne Kreditkarte) und probiert diese Modelle der Reihe nach: `gemini-flash-latest`, `gemini-2.5-flash`, `gemini-flash-lite-latest`, `gemini-2.5-flash-lite`. Die Gratis-Kontingente zählen pro Modell. Ist eines für heute aufgebraucht, übernimmt automatisch das nächste. Für mehrere Gespräche am Tag reicht das normalerweise. Sind alle Kontingente erschöpft, zeigt die App einen Hinweis, und am nächsten Tag geht es weiter.

Solange du in Google AI Studio kein Billing einrichtest, kann auch nichts kosten.

Hinweis: Laut den Nutzungsbedingungen darf eine App, die *anderen* Menschen in der EU angeboten wird, nur die bezahlte Stufe nutzen. Für deine eigene Nutzung mit deinem eigenen Schlüssel gilt das nicht.

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
| `src/ai.js` | KI-Anbindung an Google Gemini (Gespräch, Ideen, Auswertung mit festem JSON-Schema) |
| `src/speech.js` | Spracherkennung und Sprachausgabe (Web Speech API) |
| `src/topics.js` | Themen-Pool und tägliche Auswahl |
| `src/storage.js` | Speicherung von Scores und Einstellungen, Statistiken, Erfolge |
| `src/chart.js` | Fortschrittsdiagramm |
| `src/style.css` | Design (hell und dunkel) |
