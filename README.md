# Lernquiz

Eine kleine, sich selbst aktualisierende Lern-App. Du pflegst nur noch
Inhalte (JSON-Dateien), der Code bleibt unverändert.

## 1. Einmalig einrichten (5 Minuten)

1. Neues **Repository** auf GitHub anlegen, z. B. `lernquiz`.
2. Diesen ganzen Ordnerinhalt (index.html, style.css, app.js, manifest.json,
   icon.svg, sw.js, data/) in das Repo pushen.
   ```bash
   git init
   git add .
   git commit -m "Lernquiz Grundgerüst"
   git branch -M main
   git remote add origin https://github.com/DEIN-NAME/lernquiz.git
   git push -u origin main
   ```
3. Im Repo unter **Settings → Pages**:
   - Source: „Deploy from a branch"
   - Branch: `main`, Ordner `/ (root)`
   - Speichern. Nach ~1 Minute ist die App live unter
     `https://DEIN-NAME.github.io/lernquiz/`
4. Diese URL deinem Sohn schicken. Auf dem Android-Handy im Browser öffnen,
   dann über das Browser-Menü **„Zum Startbildschirm hinzufügen"** — er
   bekommt ein eigenes App-Icon.

## 2. Neuen Lerninhalt hinzufügen (dein wiederkehrender Workflow)

Am einfachsten richtest du dir dafür ein **Claude-Projekt** ein (einmalig),
das Fotos UND getippte Listen zu fertigem JSON verarbeitet - siehe eigenen
Abschnitt weiter unten. Grundprinzip:

1. Foto der Buchseite ODER eine getippte Liste an das Projekt schicken,
   dazu Fach angeben, bei mehreren Unterthemen (z. B. Geschichte:
   "Weimarer Republik", "Renaissance") auch das Thema - und bei einer
   bestehenden Datei die zuletzt vergebene ID, damit IDs nicht doppelt
   vergeben werden.
2. Fertiges JSON-Snippet einfügen: entweder in eine bestehende Datei unter
   `items` anhängen, oder eine neue Datei anlegen.
3. Bei neuer Datei: Dateinamen in `data/index.json` ergänzen.
4. Push. Er lädt die Seite neu - fertig.

Bestehende Fächer einfach um weitere `items` in ihrer Datei erweitern -
alte Inhalte bleiben erhalten, nur neue kommen dazu.

## 3. Unterthemen (z. B. Geschichte: mehrere Stoffgebiete)

Jedes Item kann optional ein Feld `"thema"` bekommen:

```json
{ "id": "weimar01", "thema": "Weimarer Republik", "frage": "...", "antwort": "...", "stufe": 0 }
```

Enthält eine Fach-Datei **mindestens zwei verschiedene** Themen, zeigt die
App automatisch eine Zwischen-Auswahl: "Alle Themen" (alles gemischt) oder
gezielt ein einzelnes Thema. Bei Vokabeln (z. B. Spanisch) lässt man das
Feld einfach weg - dann entfällt die Zwischen-Auswahl automatisch.

## 4. Wie der Lernfortschritt funktioniert

- Jede Vokabel/jeder Fakt hat eine **Stufe 0–5** (Leitner-Prinzip).
- Richtig beantwortet → Stufe steigt, kommt seltener dran.
- Falsch beantwortet → Stufe sinkt, kommt wieder häufiger dran.
- Der Fortschritt wird **lokal auf dem jeweiligen Gerät** gespeichert
  (Browser-Speicher). Er ist also an das Handy deines Sohnes gebunden,
  nicht an einen Account — du siehst ihn nicht automatisch am PC.

## 5. Struktur

```
index.html      App-Gerüst
style.css       Design
app.js          Logik: Laden, Leitner-Algorithmus, Themen-Filter, 4 Spielmodi
manifest.json   Für "Zum Startbildschirm hinzufügen"
sw.js           Offline-Start der App-Hülle (Inhalte werden immer frisch geladen)
data/index.json Liste aller Fach-Dateien — hier neue Dateien eintragen
data/*.json     Ein Fach pro Datei: { "fach": "...", "items": [...] }
                Jedes Item optional mit "thema" für Unterthemen
```

## 6. Claude-Projekt für die Inhaltserstellung

Anweisungen für ein Claude-Projekt, das sowohl Fotos als auch getippte
Listen zu fertigem JSON verarbeitet:

```
Du hilfst mir, Lerninhalte für die App "Lernquiz" meines Sohnes (7. Klasse
Gymnasium) zu erstellen. Ich liefere dir den Lernstoff auf eine von zwei
Arten:

A) Als Foto einer Buchseite
B) Als getippte Liste (Vokabeln, Fakten, Begriffe - roh oder unsortiert)

In beiden Fällen gebe ich Fach an, bei Fächern mit mehreren Stoffgebieten
(z. B. Geschichte) zusätzlich das Unterthema, z. B.
"Fach: Geschichte, Thema: Weimarer Republik" oder einfach "Fach: Spanisch"
bei Vokabeln ohne Unterthema. Falls ich Fach (bzw. bei Bedarf Thema)
vergesse, frag kurz nach - rate nicht.

Wenn ich eine bestehende Datei erweitere, gebe ich dir auch die zuletzt
vergebene ID mit (z. B. "letzte ID war sp012"). Fehlt die Angabe und du
kannst sie nicht eindeutig ableiten, frag kurz nach, statt zu raten.

Erstelle daraus Frage-Antwort-Paare in genau diesem JSON-Format:

{
  "fach": "[FACH]",
  "items": [
    {
      "id": "kuerzel01",
      "thema": "[THEMA ODER WEGLASSEN]",
      "frage": "...",
      "antwort": "...",
      "falsch": ["plausible Falschantwort 1", "plausible Falschantwort 2", "plausible Falschantwort 3"],
      "stufe": 0
    }
  ]
}

Regeln:
- Das Feld "thema" nur setzen, wenn ich ein Unterthema genannt habe -
  bei reinen Vokabellisten weglassen
- Das Feld "falsch" bei Sachfragen (Geschichte, Bio, etc.) IMMER mit
  genau 3 plausiblen, thematisch passenden Falschantworten füllen -
  keine Antworten, die zu einer völlig anderen Frage gehören könnten
  (sonst ist die richtige Antwort in der Multiple-Choice-Ansicht sofort
  erkennbar). Bei reinen Vokabellisten "falsch" weglassen - dort passen
  andere Vokabeln aus derselben Liste automatisch als Distraktoren.
- Bei Foto: Fragen kurz und eindeutig, Antworten so kurz wie möglich
  (Fakten, Jahreszahlen, Begriffe - keine ganzen Sätze/Absätze), 10-20
  Paare je nach Seitenlänge
- Bei getippter Liste: die gegebenen Paare übernehmen (Rechtschreibung
  und Formulierung dabei nicht eigenmächtig verändern), nur ins
  JSON-Format bringen plus passende Falschantworten ergänzen
- "id" = Kürzel aus dem Thema/Fach + laufende Nummer, fortlaufend zur
  zuletzt genannten ID
- "stufe" immer auf 0 setzen
- Gib NUR das JSON aus, kein Fließtext davor oder danach, damit ich es
  direkt kopieren kann
```

