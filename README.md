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

1. Foto der Buchseite an Claude/ChatGPT schicken, mit diesem Prompt:

   > Ich schicke dir ein Foto einer Schulbuchseite zum Thema [THEMA],
   > Fach [FACH], Klasse 7 Gymnasium.
   >
   > Erstelle daraus Frage-Antwort-Paare für eine Lern-App, in diesem
   > JSON-Format:
   > ```json
   > { "fach": "[FACH]", "items": [
   >   { "id": "kurzid01", "frage": "...", "antwort": "...", "stufe": 0 }
   > ]}
   > ```
   > Regeln: Fragen kurz und eindeutig, Antworten so kurz wie möglich
   > (Fakten, Jahreszahlen, Begriffe). 10–20 Paare je nach Seitenlänge.
   > `id` = Kürzel aus Thema + laufende Nummer. `stufe` immer 0.
   > Gib nur das JSON aus, kein Fließtext.

2. Ergebnis als neue Datei speichern, z. B. `data/geschichte_weimar.json`.
3. Den Dateinamen in `data/index.json` ergänzen, z. B.:
   ```json
   ["spanisch.json", "geschichte_weimar.json"]
   ```
4. Push:
   ```bash
   git add data/
   git commit -m "Geschichte: Weimarer Republik ergänzt"
   git push
   ```
5. Er lädt die Seite neu (Pull-to-refresh oder App neu öffnen) — das neue
   Fach erscheint automatisch in der Fach-Auswahl.

Bestehende Fächer einfach um weitere `items` in ihrer Datei erweitern —
alte Vokabeln bleiben erhalten, nur neue kommen dazu.

## 3. Wie der Lernfortschritt funktioniert

- Jede Vokabel/jeder Fakt hat eine **Stufe 0–5** (Leitner-Prinzip).
- Richtig beantwortet → Stufe steigt, kommt seltener dran.
- Falsch beantwortet → Stufe sinkt, kommt wieder häufiger dran.
- Der Fortschritt wird **lokal auf dem jeweiligen Gerät** gespeichert
  (Browser-Speicher). Er ist also an das Handy deines Sohnes gebunden,
  nicht an einen Account — du siehst ihn nicht automatisch am PC.

## 4. Struktur

```
index.html      App-Gerüst
style.css       Design
app.js          Logik: Laden, Leitner-Algorithmus, 4 Spielmodi
manifest.json   Für "Zum Startbildschirm hinzufügen"
sw.js           Offline-Start der App-Hülle (Inhalte werden immer frisch geladen)
data/index.json Liste aller Fach-Dateien — hier neue Dateien eintragen
data/*.json     Ein Fach pro Datei: { "fach": "...", "items": [...] }
```
