/* ==========================================================
   Lernquiz — Grundgerüst
   - lädt Fächer automatisch aus data/index.json
   - Leitner-Fortschritt pro Vokabel/Fakt, lokal gespeichert
   - 4 Spielmodi: Multiple Choice, Karteikarten, Tippen, Zeit-Modus
   ========================================================== */

const STORAGE_KEY = "lernapp_progress_v1";
const STREAK_KEY = "lernapp_streak_v1";
const ROUND_SIZE = 10;

const view = document.getElementById("view");
const topbarTitle = document.getElementById("topbarTitle");
const btnBack = document.getElementById("btnBack");
const streakBadge = document.getElementById("streakBadge");
const streakCount = document.getElementById("streakCount");

let subjects = [];        // [{file, fach, items:[...]}]
let progress = loadProgress();
let state = { screen: "fach", fach: null, mode: null, round: null };
let backTarget = null;

init();

async function init() {
  updateStreakBadge();
  try {
    const res = await fetch("data/index.json", { cache: "no-store" });
    const files = await res.json();
    subjects = await Promise.all(files.map(loadFach));
    subjects = subjects.filter(Boolean);
  } catch (e) {
    subjects = [];
  }
  renderFachAuswahl();
}

async function loadFach(filename) {
  try {
    const res = await fetch("data/" + filename, { cache: "no-store" });
    const json = await res.json();
    const items = (json.items || []).map(it => ({
      id: it.id,
      frage: it.frage,
      antwort: it.antwort,
      baseStufe: it.stufe || 0
    }));
    return { file: filename, fach: json.fach || filename, items };
  } catch (e) {
    return null;
  }
}

/* ---------------- Fortschritt / Leitner ---------------- */

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
function getStufe(item) {
  const p = progress[item.id];
  return p ? p.stufe : item.baseStufe;
}
function setStufe(item, stufe) {
  stufe = Math.max(0, Math.min(5, stufe));
  const p = progress[item.id] || { stufe: item.baseStufe, richtig: 0, falsch: 0 };
  p.stufe = stufe;
  p.zuletzt = Date.now();
  progress[item.id] = p;
  saveProgress();
}
function markResult(item, korrekt) {
  const p = progress[item.id] || { stufe: item.baseStufe, richtig: 0, falsch: 0 };
  if (korrekt) { p.richtig = (p.richtig || 0) + 1; }
  else { p.falsch = (p.falsch || 0) + 1; }
  progress[item.id] = p;
  setStufe(item, korrekt ? getStufe(item) + 1 : Math.max(0, getStufe(item) - 2));
  bumpStreak(korrekt);
}

function bumpStreak(korrekt) {
  let s = parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);
  s = korrekt ? s + 1 : 0;
  localStorage.setItem(STREAK_KEY, String(s));
  updateStreakBadge();
}
function updateStreakBadge() {
  const s = parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);
  if (s >= 3) {
    streakBadge.hidden = false;
    streakCount.textContent = s;
  } else {
    streakBadge.hidden = true;
  }
}

function fachFortschritt(fach) {
  if (!fach.items.length) return 0;
  const sum = fach.items.reduce((a, it) => a + getStufe(it), 0);
  return Math.round((sum / (fach.items.length * 5)) * 100);
}

// Gewichtete Auswahl: niedrige Stufe = deutlich häufiger dran
function weightedPool(items) {
  return items.map(it => ({ item: it, weight: Math.pow(2, 5 - getStufe(it)) }));
}
function pickRound(items, size) {
  const pool = weightedPool(items);
  const picked = [];
  const n = Math.min(size, items.length);
  const working = [...pool];
  for (let i = 0; i < n; i++) {
    const total = working.reduce((a, p) => a + p.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < working.length; idx++) {
      r -= working[idx].weight;
      if (r <= 0) break;
    }
    idx = Math.min(idx, working.length - 1);
    picked.push(working[idx].item);
    working.splice(idx, 1);
  }
  return picked;
}

/* ---------------- Hilfsfunktionen ---------------- */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function normalize(s) {
  return (s || "").toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return d[m][n];
}
function answerCloseEnough(input, correct) {
  const a = normalize(input), b = normalize(correct);
  if (a === b) return true;
  const tolerance = b.length >= 5 ? 1 : 0;
  return levenshtein(a, b) <= tolerance;
}
function setScreen(name, render, back) {
  state.screen = name;
  backTarget = back || null;
  btnBack.hidden = !back;
  view.innerHTML = "";
  render();
}
btnBack.addEventListener("click", () => { if (backTarget) backTarget(); });

/* ================= Screen: Fach-Auswahl ================= */

function renderFachAuswahl() {
  setScreen("fach", () => {
    topbarTitle.textContent = "Lernquiz";
    if (!subjects.length) {
      view.innerHTML = `<p class="empty-state">Noch keine Lerninhalte gefunden.<br>Leg eine Datei in <code>/data</code> an und trag sie in <code>data/index.json</code> ein.</p>`;
      return;
    }
    const p = document.createElement("p");
    p.className = "intro-line";
    p.textContent = "Wähl ein Fach aus.";
    view.appendChild(p);

    subjects.forEach(fach => {
      const tpl = document.getElementById("tpl-fach-card").content.cloneNode(true);
      const btn = tpl.querySelector(".fach-card");
      tpl.querySelector(".fach-name").textContent = fach.fach;
      tpl.querySelector(".fach-meta").textContent = fach.items.length + " Inhalte";
      tpl.querySelector(".fach-bar-fill").style.width = fachFortschritt(fach) + "%";
      btn.addEventListener("click", () => { state.fach = fach; renderModusAuswahl(); });
      view.appendChild(tpl);
    });
  }, null);
}

/* ================= Screen: Modus-Auswahl ================= */

const MODES = [
  { id: "mc",       icon: "🎯", name: "Multiple Choice", desc: "4 Antworten, eine ist richtig" },
  { id: "karten",   icon: "🔄", name: "Karteikarten",    desc: "Umdrehen & selbst einschätzen" },
  { id: "tippen",   icon: "⌨️", name: "Tippen",          desc: "Antwort selbst eingeben" },
  { id: "zeit",     icon: "⏱️", name: "Zeit-Modus",       desc: "60 Sekunden, so viele wie geht" }
];

function renderModusAuswahl() {
  setScreen("modus", () => {
    topbarTitle.textContent = state.fach.fach;
    const grid = document.createElement("div");
    grid.className = "mode-grid";
    MODES.forEach(m => {
      const tpl = document.getElementById("tpl-mode-card").content.cloneNode(true);
      const btn = tpl.querySelector(".mode-card");
      tpl.querySelector(".mode-icon").textContent = m.icon;
      tpl.querySelector(".mode-name").textContent = m.name;
      tpl.querySelector(".mode-desc").textContent = m.desc;
      btn.addEventListener("click", () => startMode(m.id));
      grid.appendChild(tpl);
    });
    view.appendChild(grid);
  }, renderFachAuswahl);
}

function startMode(modeId) {
  const items = state.fach.items;
  if (!items.length) return;
  if (modeId === "zeit") { renderZeitModus(); return; }
  const round = pickRound(items, ROUND_SIZE);
  state.round = { mode: modeId, items: round, idx: 0, richtig: 0, falsch: 0 };
  if (modeId === "mc") renderMC();
  else if (modeId === "karten") renderKarte();
  else if (modeId === "tippen") renderTippen();
}

function roundProgressBar() {
  const wrap = document.createElement("div");
  wrap.className = "round-progress";
  state.round.items.forEach((_, i) => {
    const dot = document.createElement("div");
    dot.className = "round-dot" + (i < state.round.idx ? " done" : i === state.round.idx ? " current" : "");
    wrap.appendChild(dot);
  });
  return wrap;
}

function nextInRound() {
  state.round.idx++;
  if (state.round.idx >= state.round.items.length) { renderErgebnis(); return; }
  const mode = state.round.mode;
  if (mode === "mc") renderMC();
  else if (mode === "karten") renderKarte();
  else if (mode === "tippen") renderTippen();
}

/* ================= Modus: Multiple Choice ================= */

function renderMC() {
  setScreen("quiz", () => {
    topbarTitle.textContent = state.fach.fach;
    const item = state.round.items[state.round.idx];
    view.appendChild(roundProgressBar());

    const card = document.createElement("div");
    card.className = "quiz-card";
    card.innerHTML = `<div class="quiz-frage">${escapeHtml(item.frage)}</div>`;
    view.appendChild(card);

    const others = shuffle(state.fach.items.filter(i => i.id !== item.id))
      .slice(0, 3).map(i => i.antwort);
    const options = shuffle([item.antwort, ...others]);

    const wrap = document.createElement("div");
    wrap.className = "answers";
    const feedback = document.createElement("div");
    feedback.className = "feedback-msg";

    let answered = false;
    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "answer-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const korrekt = opt === item.antwort;
        markResult(item, korrekt);
        state.round[korrekt ? "richtig" : "falsch"]++;
        btn.classList.add(korrekt ? "correct" : "wrong");
        if (!korrekt) {
          [...wrap.children].find(b => b.textContent === item.antwort)?.classList.add("correct");
        }
        [...wrap.children].forEach(b => { if (b !== btn) b.classList.add("dim"); });
        feedback.textContent = korrekt ? "Richtig!" : "Fast — richtig wäre: " + item.antwort;
        feedback.className = "feedback-msg " + (korrekt ? "good" : "bad");
        setTimeout(nextInRound, korrekt ? 700 : 1400);
      });
      wrap.appendChild(btn);
    });
    view.appendChild(wrap);
    view.appendChild(feedback);
  }, renderModusAuswahl);
}

/* ================= Modus: Karteikarten ================= */

function renderKarte() {
  setScreen("quiz", () => {
    topbarTitle.textContent = state.fach.fach;
    const item = state.round.items[state.round.idx];
    view.appendChild(roundProgressBar());

    const flash = document.createElement("div");
    flash.className = "flashcard";
    flash.innerHTML = `
      <div class="flashcard-inner">
        <div class="flashcard-face front">${escapeHtml(item.frage)}</div>
        <div class="flashcard-face back">${escapeHtml(item.antwort)}</div>
      </div>`;
    view.appendChild(flash);

    const hint = document.createElement("div");
    hint.className = "flip-hint";
    hint.textContent = "Antippen zum Umdrehen";
    view.appendChild(hint);

    const inner = flash.querySelector(".flashcard-inner");
    const grades = document.createElement("div");
    grades.className = "grade-row";
    grades.style.display = "none";
    grades.innerHTML = `
      <button class="grade-btn grade-bad">Nochmal</button>
      <button class="grade-btn grade-mid">Ging so</button>
      <button class="grade-btn grade-good">Wusste ich</button>`;

    flash.addEventListener("click", () => {
      inner.classList.toggle("flipped");
      if (inner.classList.contains("flipped")) {
        hint.textContent = "";
        grades.style.display = "flex";
      }
    });

    const [bBad, bMid, bGood] = grades.querySelectorAll(".grade-btn");
    bBad.addEventListener("click", (e) => { e.stopPropagation(); setStufe(item, 0); state.round.falsch++; nextInRound(); });
    bMid.addEventListener("click", (e) => { e.stopPropagation(); setStufe(item, Math.max(0, getStufe(item) - 1)); state.round.falsch++; nextInRound(); });
    bGood.addEventListener("click", (e) => { e.stopPropagation(); setStufe(item, getStufe(item) + 1); state.round.richtig++; bumpStreak(true); nextInRound(); });

    view.appendChild(grades);
  }, renderModusAuswahl);
}

/* ================= Modus: Tippen ================= */

function renderTippen() {
  setScreen("quiz", () => {
    topbarTitle.textContent = state.fach.fach;
    const item = state.round.items[state.round.idx];
    view.appendChild(roundProgressBar());

    const card = document.createElement("div");
    card.className = "quiz-card";
    card.innerHTML = `<div class="quiz-frage">${escapeHtml(item.frage)}</div>`;
    view.appendChild(card);

    const input = document.createElement("input");
    input.className = "type-input";
    input.type = "text";
    input.placeholder = "Antwort eingeben …";
    input.autocomplete = "off";
    input.autocapitalize = "off";
    input.spellcheck = false;
    view.appendChild(input);

    const feedback = document.createElement("div");
    feedback.className = "feedback-msg";
    view.appendChild(feedback);

    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.textContent = "Prüfen";
    view.appendChild(btn);

    let answered = false;
    function check() {
      if (answered || !input.value.trim()) return;
      answered = true;
      const korrekt = answerCloseEnough(input.value, item.antwort);
      markResult(item, korrekt);
      state.round[korrekt ? "richtig" : "falsch"]++;
      input.classList.add(korrekt ? "correct" : "wrong");
      input.disabled = true;
      feedback.textContent = korrekt ? "Richtig!" : "Richtig wäre: " + item.antwort;
      feedback.className = "feedback-msg " + (korrekt ? "good" : "bad");
      btn.textContent = "Weiter";
      btn.disabled = false;
    }
    btn.addEventListener("click", () => { if (!answered) check(); else nextInRound(); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { if (!answered) check(); else nextInRound(); } });
    setTimeout(() => input.focus(), 50);
  }, renderModusAuswahl);
}

/* ================= Modus: Zeit-Modus ================= */

function renderZeitModus() {
  const items = state.fach.items;
  let timeLeft = 60;
  let score = 0, wrong = 0;
  let timer = null;
  let current = null;

  function nextQuestion() {
    current = pickRound(items, 1)[0];
    const others = shuffle(items.filter(i => i.id !== current.id)).slice(0, 3).map(i => i.antwort);
    const options = shuffle([current.antwort, ...others]);
    renderFrame(options);
  }

  function renderFrame(options) {
    view.innerHTML = "";
    const timerWrap = document.createElement("div");
    timerWrap.className = "timer-wrap";
    timerWrap.innerHTML = `<div class="timer-num">${timeLeft}s</div><div class="score-pill">✅ ${score}</div>`;
    view.appendChild(timerWrap);

    const bar = document.createElement("div");
    bar.className = "timer-bar";
    bar.innerHTML = `<div class="timer-bar-fill" style="width:${(timeLeft / 60) * 100}%"></div>`;
    view.appendChild(bar);

    const card = document.createElement("div");
    card.className = "quiz-card";
    card.innerHTML = `<div class="quiz-frage">${escapeHtml(current.frage)}</div>`;
    view.appendChild(card);

    const wrap = document.createElement("div");
    wrap.className = "answers";
    let answered = false;
    options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "answer-btn";
      b.textContent = opt;
      b.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const korrekt = opt === current.antwort;
        markResult(current, korrekt);
        if (korrekt) score++; else wrong++;
        nextQuestion();
      });
      wrap.appendChild(b);
    });
    view.appendChild(wrap);
  }

  setScreen("quiz", () => {
    topbarTitle.textContent = state.fach.fach + " · Zeit-Modus";
    nextQuestion();
    timer = setInterval(() => {
      timeLeft--;
      const fill = document.querySelector(".timer-bar-fill");
      const num = document.querySelector(".timer-num");
      if (fill) fill.style.width = (timeLeft / 60) * 100 + "%";
      if (num) num.textContent = timeLeft + "s";
      if (timeLeft <= 0) {
        clearInterval(timer);
        state.round = { richtig: score, falsch: wrong, items: { length: score + wrong } };
        renderErgebnis(true);
      }
    }, 1000);
  }, () => { clearInterval(timer); renderModusAuswahl(); });
}

/* ================= Screen: Ergebnis ================= */

function renderErgebnis(fromZeit) {
  setScreen("ergebnis", () => {
    topbarTitle.textContent = "Runde geschafft";
    const r = state.round;
    const total = fromZeit ? r.richtig + r.falsch : r.items.length;
    const hero = document.createElement("div");
    hero.className = "result-hero";
    hero.innerHTML = `<div class="result-num">${r.richtig}/${total}</div><div class="result-label">richtig beantwortet</div>`;
    view.appendChild(hero);

    const stats = document.createElement("div");
    stats.className = "stat-row";
    stats.innerHTML = `
      <div class="stat-box"><div class="n">${fachFortschritt(state.fach)}%</div><div class="l">Fach-Fortschritt</div></div>
      <div class="stat-box"><div class="n">${r.falsch}</div><div class="l">Noch üben</div></div>`;
    view.appendChild(stats);

    const again = document.createElement("button");
    again.className = "btn-primary";
    again.textContent = "Nochmal";
    again.addEventListener("click", () => renderModusAuswahl());
    view.appendChild(again);

    const home = document.createElement("button");
    home.className = "btn-ghost";
    home.textContent = "Anderes Fach";
    home.addEventListener("click", () => renderFachAuswahl());
    view.appendChild(home);
  }, renderModusAuswahl);
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
