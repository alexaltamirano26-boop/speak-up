# Speak Up – Englisch für die USA 🇺🇸

Eine Lern-App mit echten Gesprächen statt Einzelsätzen. Eine KI (Claude) spielt Rollen wie
Grenzbeamter, Kellner oder Texaner an der Bar. Du antwortest per Sprache oder Text und bekommst
zu jedem Satz Feedback mit deutscher Erklärung.

## Was schon funktioniert (Schritt 1)

- **9 Reise-Szenarien** in 3 Schwierigkeitsstufen, jeweils mit Ziel und nützlichen Sätzen zum Anhören
- **KI-Rollenspiel-Chat**
  - Spracheingabe per Mikrofon (🎤) oder Tastatur
  - Die KI-Antwort wird mit US-Stimme vorgelesen, auch langsam (🐢)
  - **Hörmodus** 👂: Der Text der KI ist verschwommen, bis du ihn antippst. Damit trainierst du das Hörverstehen
  - **Feedback** zu jedem Satz: Korrektur, „So sagt's ein Amerikaner“, Erklärung auf Deutsch, Aussprache-Tipp
  - 💡 Antwortvorschläge, falls du hängst
  - **Auswertung** am Ende mit Punktzahl (ab 80 gilt das Szenario als gemeistert)
- **Wörter**: Neue Vokabeln und deine Fehler werden automatisch gesammelt, dazu die Liste „häufigste Fehler“
- Einstellungen: API-Key, Modell, Stimme, Backup
- PWA: Du kannst die App auf dem iPhone zum Homescreen hinzufügen

## Wie der Code aufgebaut ist

```
src/
├── App.jsx                  Gerüst: welcher Screen wird gezeigt + Tab-Leiste
├── data/
│   └── scenarios.js         ⭐ Alle Szenarien & Schwierigkeitsstufen (hier neue hinzufügen!)
├── lib/
│   ├── prompts.js           ⭐ Anweisungen an Claude + JSON-Format der Antworten
│   ├── claude.js            Verbindung zur Claude API, Fehlermeldungen auf Deutsch
│   ├── speech.js            Mikrofon (Spracherkennung) & Vorlesen (Sprachausgabe)
│   ├── db.js                Lokale Datenbank (IndexedDB): Gespräche, Karten, Fehler
│   └── settings.js          Einstellungen im localStorage
├── screens/                 Die einzelnen Bildschirme
│   ├── ScenariosScreen.jsx  Szenario-Liste + Detailansicht
│   ├── ChatScreen.jsx       ⭐ Der Rollenspiel-Chat
│   ├── WordsScreen.jsx      Gesammelte Wörter & Fehler
│   └── SettingsScreen.jsx
└── components/              Wiederverwendbare Bausteine
    ├── FeedbackCard.jsx     Die Feedback-Box unter deinen Nachrichten
    └── SummaryView.jsx      Auswertung am Gesprächsende
```

### Der wichtigste Trick: Ein Aufruf, drei Ergebnisse

Bei jeder Nachricht schickt die App den Gesprächsverlauf an Claude. Claude **muss** im
festen JSON-Format antworten (`CHAT_SCHEMA` in `prompts.js`):

```json
{
  "reply": "Thanks. What's the purpose of your visit?",
  "feedback": { "status": "error", "corrected": "…", "natural": "…", "explanation": "…", "error_tags": ["word-choice"] },
  "new_vocab": [{ "en": "purpose of your visit", "de": "Zweck Ihres Besuchs", "example": "…" }],
  "suggestions": ["I'm here on vacation.", "…"],
  "goal_reached": false
}
```

`ChatScreen.jsx` verteilt diese Teile dann:
- `reply` erscheint als Sprechblase und wird vorgelesen
- `feedback` kommt unter deine Nachricht
- `new_vocab` und Fehler werden in der Datenbank gespeichert. Daraus speist sich später der Vokabeltrainer.

### Typische Änderungen

| Du willst … | Datei |
|---|---|
| ein neues Szenario (z.B. Mietwagen) | `src/data/scenarios.js`: ein Objekt kopieren und anpassen |
| strengeres oder lockereres Feedback | `src/lib/prompts.js`, Abschnitt „Feedback rules“ |
| andere Farben | `src/index.css`, Block `@theme` |
| ein günstigeres Modell als Standard | `src/lib/settings.js`, `DEFAULTS.model` |

## Lokal starten

```bash
npm install
npm run dev
```

## Veröffentlichen (GitHub Pages)

Bei jedem Push auf `main` baut GitHub die App automatisch (`.github/workflows/deploy.yml`).
Einmalig musst du im Repo unter **Settings → Pages → Source** „**GitHub Actions**“ auswählen.

## iPhone-Hinweise

- Öffne die App in **Safari**. Zum Installieren: Teilen-Symbol → „Zum Home-Bildschirm“.
- Spracherkennung: Beim ersten Mal fragt Safari nach dem Mikrofon. Falls das Mikrofon in der
  Homescreen-Version nicht geht, nutze die App direkt im Safari-Tab (eine bekannte iOS-Einschränkung).
- Bessere Stimmen: iPhone-Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen →
  Englisch (USA) → z.B. „Ava (Premium)“ laden.

## Datenschutz

Alles bleibt auf deinem Gerät. Nur der Gesprächstext geht zur Verarbeitung an die Claude API,
und zwar mit deinem eigenen API-Key, der ebenfalls nur lokal gespeichert ist.
