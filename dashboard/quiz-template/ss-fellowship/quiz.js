// quiz.js — unified engine with Year-wise + System-wise support (polished UI)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  initializeFirestore, runTransaction,
  getFirestore, collection, getDocs, setDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai/+esm";

// ---------------------
// CONFIG (overridden by page)
// ---------------------
let QUIZ_CONFIG = {
  GOOGLE_AI_API_KEY: "",
  ALL_QUIZ_DATA: {},      // { paperId: { sheetId, gid } }
  PAPER_METADATA: [],     // [{id,name,examType}]
  FIREBASE_CONFIG: {},
  title: ""               // optional, used for synthetic paper titles
};

// exam durations (seconds)
const EXAM_DURATIONS = {
  "NEET SS": 3 * 60 * 60,
  "INI SS":  1.5 * 60 * 60,
  "Fellowship exam": 1.5 * 60 * 60
};

// histogram for aggregates
const HISTOGRAM_BUCKETS = 10;
const initHistogram = () => Array.from({ length: HISTOGRAM_BUCKETS }, () => 0);
const getBucketIndex = (pct) => Math.min(HISTOGRAM_BUCKETS - 1, Math.max(0, Math.floor(pct / (100 / HISTOGRAM_BUCKETS))));

// ---------------------
// STATE
// ---------------------
let db, auth;
let currentUser = null;

let allQuestions = [];          // working pool for an active session
let currentPaper = null;        // {id,name,examType,_system?}
let quizMode = "practice";
let isReviewing = false;
let reviewFilter = [];
let userAnswers = {};
let flaggedQuestions = new Set();
let userBookmarks = new Set();
let elapsedSeconds = 0;
let quizInterval = null;
let isSoundOn = true;
let currentQuestionIndex = 0;

// cache: paperId -> parsed questions
const paperCache = new Map();   // Map<string, Question[]>

// dom cache
const dom = {
  screens: document.querySelectorAll('.screen'),
  authCheck: document.getElementById('authCheckScreen'),

  // topic screen
  topicScreen: document.getElementById('topic-screen'),
  paperCardGrid: document.getElementById('paper-card-grid'),
  yearBtn: document.getElementById('yearwise-btn'),
  systemBtn: document.getElementById('systemwise-btn'),
  systemTabs: document.getElementById('system-tabs'),

  // quiz screen
  quizScreen: document.getElementById('quiz-screen'),
  quizTitle: document.getElementById('quiz-title'),
  loadingContainer: document.getElementById('loading-container'),
  loadingMessage: document.getElementById('loading-message'),
  quizContent: document.getElementById('quiz-content'),
  paginationHeader: document.getElementById('quiz-pagination-header'),
  questionsDisplay: document.getElementById('questions-display'),
  timerEl: document.getElementById('timer'),
  modeToggle: document.getElementById('mode-toggle-checkbox'),
  finishQuizBtn: document.getElementById('finish-quiz-btn'),
  soundToggleBtn: document.getElementById('sound-toggle-btn'),
  correctSound: document.getElementById('correct-sound'),
  wrongSound: document.getElementById('wrong-sound'),

  // results screen
  resultsScreen: document.getElementById('results-screen'),

  // modal
  modalBackdrop: document.getElementById('custom-modal-backdrop'),
  modalMessage: document.getElementById('modal-message'),
  modalButtons: document.getElementById('modal-buttons'),
};

// ---------------------
// UTIL
// ---------------------
const byId = (id) => document.getElementById(id);
const safeFeather = () => { if (window.feather) feather.replace(); };
const formatTime = (s) => {
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};
const normalize = (t) => (t || '').replace(/\s+/g, ' ').trim();
const toChip = (txt) => txt ? `<span class="exam-hash">#${txt.replace(/\s+/g,'')}</span>` : "";

// ---------------------
// MODAL
// ---------------------
function showCustomModal(message, buttons) {
  if (!dom.modalBackdrop) return alert(message);
  dom.modalMessage.textContent = message;
  dom.modalButtons.innerHTML = '';
  (buttons || [{ text: 'OK', isPrimary: true, onClick: () => {} }]).forEach(b => {
    const el = document.createElement('button');
    el.textContent = b.text;
    el.className = `results-btn ${b.isPrimary ? 'primary' : 'secondary'}`;
    el.onclick = () => { dom.modalBackdrop.style.display = 'none'; b.onClick?.(); };
    dom.modalButtons.appendChild(el);
  });
  dom.modalBackdrop.style.display = 'flex';
}
const showCustomAlert  = (m, ok=()=>{}) => showCustomModal(m, [{ text:'OK', isPrimary:true, onClick: ok }]);
const showCustomConfirm = (m, ok, cancel=()=>{}) =>
  showCustomModal(m, [{ text:'Yes', isPrimary:true, onClick: ok }, { text:'No', isPrimary:false, onClick: cancel }]);

// ---------------------
// INIT
// ---------------------
export function initQuizApp(config) {
  QUIZ_CONFIG = { ...QUIZ_CONFIG, ...config };

  const app = initializeApp(QUIZ_CONFIG.FIREBASE_CONFIG);
  db   = initializeFirestore(app, { experimentalForceLongPolling: true });
  auth = getAuth(app);

  // UI wiring for view toggles (if present)
  dom.yearBtn?.addEventListener('click', () => setView('year'));
  dom.systemBtn?.addEventListener('click', () => setView('system'));

  // mode toggle
  dom.modeToggle?.addEventListener('change', () => {
    const newMode = dom.modeToggle.checked ? 'exam' : 'practice';
    showCustomConfirm(`Switching to ${newMode} mode will clear your current session. Continue?`,
      () => setQuizMode(newMode),
      () => dom.modeToggle.checked = !dom.modeToggle.checked
    );
  });

  // sounds
  dom.soundToggleBtn?.addEventListener('click', toggleSound);

  // finish
  dom.finishQuizBtn?.addEventListener('click', () => {
    const msg = quizMode === 'exam'
      ? 'Are you sure you want to finish the exam?'
      : 'Are you sure you want to finish this practice session?';
    showCustomConfirm(msg, () => finishExam());
  });

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      if (dom.authCheck) dom.authCheck.style.display = 'none';
      await handleDirectLinkOrShowTopics();
    } else {
      if (dom.authCheck) {
        dom.authCheck.innerHTML =
          '<div class="selection-container"><p>You must be logged in to continue.</p></div>';
      }
    }
  });
}

// ---------------------
// TOPIC VIEW (Year/System)
// ---------------------
let currentView = 'year'; // 'year' | 'system'
function setView(v) {
  currentView = v;
  dom.yearBtn?.classList.toggle('active', v === 'year');
  dom.systemBtn?.classList.toggle('active', v === 'system');

  if (v === 'year') {
    dom.systemTabs?.classList.add('hidden');
    renderYearWise();
  } else {
    dom.systemTabs?.classList.remove('hidden');
    renderSystemWise();
  }
}

async function handleDirectLinkOrShowTopics() {
  const params = new URLSearchParams(window.location.search);
  const directQuestionId = params.get('questionId');
  if (currentUser && directQuestionId) {
    const paperId = params.get('paperId');
    const paper   = QUIZ_CONFIG.PAPER_METADATA.find(p => p.id === paperId);
    if (paper) {
      currentPaper = paper;
      quizMode = 'practice';
      await startQuiz(null, directQuestionId);
      return;
    }
  }
  showScreen('topic-screen');
  setView('year'); // Default to year-wise view
  safeFeather();
}

// Pretty rad-card tiles (horizontal grid)
function renderYearWise() {
  if (!dom.paperCardGrid) return;
  dom.paperCardGrid.innerHTML = '';
  const frag = document.createDocumentFragment();

  QUIZ_CONFIG.PAPER_METADATA.forEach(p => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <a href="#" class="rad-card tilt group focusable block topic-card" data-id="${p.id}" data-name="${p.name}" data-examtype="${p.examType}">
        <div class="rad-card-inner p-5 flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-blue-800">${p.examType}</p>
            <h3 class="text-xl font-bold text-slate-900 mt-1">${p.name}</h3>
          </div>
          <i data-feather="arrow-right-circle" class="w-7 h-7 text-slate-400 group-hover:text-blue-600 transition-colors"></i>
        </div>
      </a>
    `.trim();
    frag.appendChild(wrapper.firstChild);
  });

  dom.paperCardGrid.appendChild(frag);

  dom.paperCardGrid.querySelectorAll('.topic-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const { id, name, examtype } = btn.dataset;
      currentPaper = { id, name, examType: examtype };
      quizMode = 'practice';
      checkResumeAndStart();
    });
  });
  safeFeather();
}

// --- System-wise (start on tab click) ---
async function ensureAllPapersCached() {
  // show a subtle message only once
  if (dom.paperCardGrid) {
    dom.paperCardGrid.innerHTML = `<p class="text-slate-500 text-center col-span-full">Analyzing question banks, please wait...</p>`;
  }
  const jobs = Object.entries(QUIZ_CONFIG.ALL_QUIZ_DATA).map(async ([paperId, { sheetId, gid }]) => {
    if (paperCache.has(paperId)) return;
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return;
      const csv = await r.text();
      paperCache.set(paperId, parseCSVToQuestions(csv, paperId));
    } catch(e) { console.error('cache fetch fail', paperId, e); }
  });
  await Promise.all(jobs);
}

function uniqueTagsFromCache() {
  const tagSet = new Set();
  for (const qs of paperCache.values()) {
    for (const q of qs) {
      (q.tag || '').split(',').forEach(t => {
        const n = normalize(t);
        if (n) tagSet.add(n);
      });
    }
  }
  return Array.from(tagSet).sort((a,b) => a.localeCompare(b));
}

async function renderSystemWise() {
  await ensureAllPapersCached();

  const tags = uniqueTagsFromCache();
  if (!tags.length) {
    dom.paperCardGrid.innerHTML = `<p class="text-slate-500 text-center col-span-full">No system tags found. Check the Tag column in your sheets.</p>`;
    return;
  }

  // Build tabs (no auto-click, no auto-start)
  if (dom.systemTabs) {
    dom.systemTabs.innerHTML = tags.map(t => `<button class="system-tab" data-system="${t}">${t}</button>`).join('');

    // Friendly prompt in the grid area
    dom.paperCardGrid.innerHTML = `
      <div class="rad-card rad-green tilt">
        <div class="rad-card-inner p-5">
          <p class="text-sm font-semibold text-emerald-800 mb-1">System-wise</p>
          <h3 class="text-lg font-bold text-slate-900">Select a system above to begin.</h3>
          <p class="text-slate-600 mt-1">We’ll pull questions across all years for that system.</p>
        </div>
      </div>
    `;

    // Start only when the user clicks a tab
    dom.systemTabs.querySelectorAll('.system-tab').forEach(btn => {
      btn.addEventListener('click', async () => {
        dom.systemTabs.querySelectorAll('.system-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const systemName = btn.dataset.system;
        currentPaper = {
          id: `system-${systemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: `${systemName} — All Years`,
          examType: QUIZ_CONFIG.title || 'Practice',
          _system: systemName
        };
        quizMode = 'practice';
        await startQuiz(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }
}


// ---------------------
// QUIZ FLOW
// ---------------------
function showScreen(id) {
  dom.screens.forEach(s => s.classList.toggle('active', s.id === id));
  safeFeather();
}

function setQuizMode(newMode) {
  quizMode = newMode;
  localStorage.removeItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`);
  startQuiz(null);
}

function checkResumeAndStart() {
  const key = `radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    showCustomConfirm(`You have an unfinished ${quizMode} session. Resume?`,
      () => startQuiz(JSON.parse(saved)),
      () => { localStorage.removeItem(key); startQuiz(null); }
    );
  } else startQuiz(null);
}

async function startQuiz(resumeState, directQuestionId = null) {
  isReviewing = false; reviewFilter = [];
  userAnswers = resumeState?.answers || {};
  elapsedSeconds = resumeState?.elapsedSeconds || 0;
  flaggedQuestions = new Set(resumeState?.flags || []);
  let startIndex = resumeState?.index || 0;

  showScreen('quiz-screen');
  dom.loadingContainer.style.display = 'block';
  dom.quizContent.style.display = 'none';
  initializeSound();

  try {
    updateLoading(`Preparing questions for: ${currentPaper.name}...`);
    await loadWorkingQuestions();

    if (!allQuestions.length)
      throw new Error('No questions found for this selection.');

    updateLoading('Fetching your bookmarks...');
    await fetchUserBookmarks();

    dom.modeToggle.checked = quizMode === 'exam';
    dom.quizTitle.textContent = currentPaper.name;
    dom.finishQuizBtn.style.display = 'block';

    createQuestionNav();
    if (directQuestionId) {
      const i = allQuestions.findIndex(q => q.id === directQuestionId);
      startIndex = (i >= 0 ? i : 0);
    }
    showQuestion(startIndex);
    startTimer();
  } catch (err) {
    console.error(err);
    showCustomAlert(err?.message || 'Error preparing the session.', () => showScreen('topic-screen'));
    return;
  } finally {
    dom.loadingContainer.style.display = 'none';
  }
  dom.quizContent.style.display = 'block';
}

function updateLoading(msg) {
  if (dom.loadingMessage) dom.loadingMessage.textContent = msg;
}

async function loadWorkingQuestions() {
  allQuestions = [];

  // System mode: merge all papers from cache then filter by tag
  if (currentPaper._system) {
    await ensureAllPapersCached();
    const pool = [];
    for (const qs of paperCache.values()) pool.push(...qs);
    const target = normalize(currentPaper._system);
    allQuestions = pool.filter(q =>
      (q.tagsNormalized || []).includes(target)
    );
    // Re-index IDs contiguously for session
    allQuestions = allQuestions.map((q, i) => ({ ...q, id: `${currentPaper.id}-${i}` }));
    return;
  }

  // Year mode: fetch just one sheet (use cache if present)
  const cfg = QUIZ_CONFIG.ALL_QUIZ_DATA[currentPaper.id];
  if (!cfg?.sheetId || !cfg?.gid) throw new Error('Missing sheet configuration.');
  if (paperCache.has(currentPaper.id)) {
    allQuestions = paperCache.get(currentPaper.id).map((q, i) => ({ ...q, id: `${currentPaper.id}-${i}` }));
    return;
  }
  const url = `https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?tqx=out:csv&gid=${cfg.gid}`;
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Sheet fetch failed (${r.status}).`);
  const csv = await r.text();
  const parsed = parseCSVToQuestions(csv, currentPaper.id);
  paperCache.set(currentPaper.id, parsed);
  allQuestions = parsed.map((q, i) => ({ ...q, id: `${currentPaper.id}-${i}` }));
}

function parseCSVToQuestions(csvText, paperIdForId) {
  const lines = csvText.trim().split('\n').slice(1); // skip header
  return lines.map((line, idx) => {
    const parts = line
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map(p => p.trim().replace(/^"|"$/g, ''));

    // A..L columns (Tag is J)
    const [
      question, a, b, c, d,
      correctAns, explanation,
      image, imageForExplTag,
      tag,       // J
      subtag,    // K
      exam       // L
    ] = parts;

    const options = [a, b, c, d].filter(Boolean);
    const letterMap = { a: 0, b: 1, c: 2, d: 3 };
    const correctIndex = letterMap[(correctAns || '').trim().toLowerCase()];

    if (question && correctIndex !== undefined && options.length > 0) {
      const tagsNormalized = (tag || '')
        .split(',')
        .map(normalize)
        .filter(Boolean);

      return {
        id: `${paperIdForId || 'paper'}-${idx}`,
        text: question,
        options,
        correctIndex,
        explanation: explanation || 'N/A',
        image, imageForExplTag,
        tag: tag || '',
        tagsNormalized,
        subtag: normalize(subtag),
        exam: normalize(exam)
      };
    }
    return null;
  }).filter(Boolean);
}

// ---------------------
// NAV + QUESTION RENDER
// ---------------------
function createQuestionNav() {
  dom.paginationHeader.innerHTML =
    allQuestions.map((_, i) => `<div class="page-box" data-index="${i}">${i + 1}</div>`).join('');
  dom.paginationHeader.querySelectorAll('.page-box').forEach(box => {
    box.addEventListener('click', () => showQuestion(parseInt(box.dataset.index)));
  });
}

function updateQuestionNav() {
  dom.paginationHeader.querySelectorAll('.page-box').forEach(box => {
    const i = parseInt(box.dataset.index);
    box.className = 'page-box';
    if (i === currentQuestionIndex) box.classList.add('active');
    if (userAnswers[i] !== undefined) {
      if (quizMode === 'practice' || isReviewing) {
        const correct = userAnswers[i] === allQuestions[i].correctIndex;
        box.classList.add(correct ? 'answered-correct' : 'answered-incorrect');
      } else {
        box.classList.add('answered-correct');
        box.style.backgroundColor = 'var(--primary-color)';
        box.style.borderColor = 'var(--primary-color)';
        box.style.color = 'white';
      }
    }
    if (flaggedQuestions.has(allQuestions[i].id)) box.classList.add('flagged');
  });
  dom.paginationHeader.querySelector('.page-box.active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function showQuestion(index) {
  if (reviewFilter.length > 0 && !reviewFilter.includes(index)) {
    index = reviewFilter.find(i => i >= index) ?? reviewFilter[0];
  }
  currentQuestionIndex = index;
  const q = allQuestions[index]; if (!q) return;

  const isBookmarked = userBookmarks.has(q.id);
  const isFlagged    = flaggedQuestions.has(q.id);
  const isAnswered   = userAnswers[index] !== undefined;

  // Chips: show both #Exam and #Tag (first tag if multiple)
  const firstTag = (q.tagsNormalized && q.tagsNormalized[0]) ? q.tagsNormalized[0] : "";
  const chips = [
    toChip(q.exam),
    toChip(firstTag)
  ].join('');

  let html = `
    <div class="question-title-bar">
      <span class="question-number">Q ${index + 1} / ${allQuestions.length}</span>
      <div class="question-controls">
        ${chips}
        <button class="icon-btn flag-btn ${isFlagged ? 'flagged' : ''}" ${isReviewing ? 'disabled' : ''}><i data-feather="flag"></i></button>
        <button class="icon-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" ${isReviewing ? 'disabled' : ''}><i data-feather="bookmark"></i></button>
      </div>
    </div>
    <p class="main-question-text">${q.text}</p>
    <div>
      ${q.options.map((opt, i) => {
        const shouldDisable = isReviewing || (quizMode === 'practice' && isAnswered);
        let cls = 'option-btn';
        if (quizMode === 'exam' && i === userAnswers[index]) cls += ' selected';
        if (shouldDisable && i === q.correctIndex) cls += ' correct';
        else if (shouldDisable && i === userAnswers[index]) cls += ' incorrect';
        return `<button class="${cls}" data-index="${i}" ${shouldDisable ? 'disabled' : ''}>${opt}</button>`;
      }).join('')}
    </div>
  `;

  if ((quizMode === 'practice' && isAnswered) || isReviewing) {
    html += `<div class="explanation-box"><h4>Explanation</h4><p>${q.explanation}</p></div>`;
  }

  dom.questionsDisplay.innerHTML = html;

  dom.questionsDisplay.querySelector('.flag-btn')?.addEventListener('click', () => toggleFlag(q.id));
  dom.questionsDisplay.querySelector('.bookmark-btn')?.addEventListener('click', () => toggleBookmark(q.id, q.text));

  if (!isReviewing && !(quizMode === 'practice' && isAnswered)) {
    dom.questionsDisplay.querySelectorAll('.option-btn').forEach(b => b.addEventListener('click', handleOptionClick));
  }
  updateQuestionNav();
  safeFeather();
}

function handleOptionClick(e) {
  const selectedIndex = parseInt(e.target.dataset.index);
  userAnswers[currentQuestionIndex] = selectedIndex;
  const q = allQuestions[currentQuestionIndex];
  const correct = selectedIndex === q.correctIndex;

  if (quizMode === 'practice') {
    if (isSoundOn) (correct ? dom.correctSound : dom.wrongSound).play();
    showQuestion(currentQuestionIndex);
  } else {
    showQuestion(currentQuestionIndex);
  }
  saveState();
}

// ---------------------
// SOUND
// ---------------------
function initializeSound() {
  const s = localStorage.getItem('radmentor_sound_pref');
  isSoundOn = s !== 'off';
  updateSoundIcon();
}
function toggleSound() {
  isSoundOn = !isSoundOn;
  localStorage.setItem('radmentor_sound_pref', isSoundOn ? 'on' : 'off');
  updateSoundIcon();
}
function updateSoundIcon() {
  dom.soundToggleBtn.innerHTML = `<i data-feather="${isSoundOn ? 'volume-2' : 'volume-x'}"></i>`;
  safeFeather();
}

// ---------------------
// FLAGS / BOOKMARKS
// ---------------------
function toggleFlag(id) {
  flaggedQuestions.has(id) ? flaggedQuestions.delete(id) : flaggedQuestions.add(id);
  dom.questionsDisplay.querySelector('.flag-btn')?.classList.toggle('flagged', flaggedQuestions.has(id));
  updateQuestionNav();
  saveState();
}

async function toggleBookmark(qid, qtext) {
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid, 'bookmarks', qid);
  const btn = dom.questionsDisplay.querySelector('.bookmark-btn');
  try {
    if (userBookmarks.has(qid)) {
      await deleteDoc(ref);
      userBookmarks.delete(qid);
      btn?.classList.remove('bookmarked');
    } else {
      await setDoc(ref, {
        questionText: qtext,
        topic: currentPaper.name,
        timestamp: serverTimestamp(),
        linkToQuestion: `${window.location.pathname}?paperId=${currentPaper.id}&questionId=${qid}`
      });
      userBookmarks.add(qid);
      btn?.classList.add('bookmarked');
    }
  } catch(e) {
    console.warn('bookmark failed', e);
  }
}

async function fetchUserBookmarks() {
  if (!currentUser) { userBookmarks = new Set(); return; }
  try {
    const snap = await getDocs(collection(db, 'users', currentUser.uid, 'bookmarks'));
    userBookmarks = new Set(snap.docs.map(d => d.id));
  } catch(e) {
    console.warn('bookmarks read failed', e);
    userBookmarks = new Set();
  }
}

// ---------------------
// TIMER & STATE
// ---------------------
function saveState() {
  if (!currentUser || !currentPaper || isReviewing) return;
  const key = `radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`;
  const state = { answers: userAnswers, index: currentQuestionIndex, elapsedSeconds, flags: [...flaggedQuestions] };
  localStorage.setItem(key, JSON.stringify(state));
}

function startTimer() {
  clearInterval(quizInterval);
  const total = EXAM_DURATIONS[currentPaper.examType] || 0;

  if (quizMode === 'exam' && total > 0) {
    let remaining = total - elapsedSeconds;
    dom.timerEl.textContent = formatTime(remaining);
    quizInterval = setInterval(() => {
      if (remaining <= 0) {
        clearInterval(quizInterval);
        showCustomAlert("Time's up! The exam has finished.", () => finishExam());
        return;
      }
      remaining--; elapsedSeconds++;
      dom.timerEl.textContent = formatTime(remaining);
      saveState();
    }, 1000);
  } else {
    let start = Date.now() - (elapsedSeconds * 1000);
    quizInterval = setInterval(() => {
      elapsedSeconds = Math.floor((Date.now() - start) / 1000);
      dom.timerEl.textContent = formatTime(elapsedSeconds);
      saveState();
    }, 1000);
  }
}

// ---------------------
// RESULTS
// ---------------------
async function finishExam() {
  clearInterval(quizInterval);
  showScreen('results-screen');

  let correct = 0, incorrect = 0;
  const incorrectQs = [];
  allQuestions.forEach((q, i) => {
    if (userAnswers[i] !== undefined) {
      if (userAnswers[i] === q.correctIndex) correct++;
      else { incorrect++; incorrectQs.push(q); }
    }
  });

  const unattempted = allQuestions.length - (correct + incorrect);
  const pct = allQuestions.length ? (correct / allQuestions.length) * 100 : 0;

  byId('final-score-percent').textContent = `${pct.toFixed(1)}%`;
  byId('correct-count').textContent = correct;
  byId('incorrect-count').textContent = incorrect;
  byId('unattempted-count').textContent = unattempted;
  byId('time-taken').textContent = formatTime(elapsedSeconds);

  if (window.performanceChart instanceof Chart) window.performanceChart.destroy();
  window.performanceChart = new Chart(byId('performanceChart'), {
    type:'doughnut',
    data:{ labels:['Correct','Incorrect','Unattempted'], datasets:[{ data:[correct,incorrect,unattempted], backgroundColor:['#22c55e','#ef4444','#f59e0b'] }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  // clear local
  localStorage.removeItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser?.uid}`);

  if (quizMode === 'exam' && currentUser) {
    await Promise.all([
      saveUserAttempt(pct),
      updateAggregatesAndGetStats(pct).then(({ average, percentile }) => {
        byId('average-score').textContent = `${average.toFixed(1)}%`;
        byId('percentile-rank').textContent = percentile.toFixed(1);
      })
    ]);
    await getAIInsights(incorrectQs);
  } else {
    byId('peer-comparison-content').innerHTML = '<p>Peer comparison is only available in Exam Mode.</p>';
    byId('ai-insights-card').innerHTML =
      `<div class="flex items-start gap-4"><div class="ai-avatar">🤖</div><div class="ai-message flex-grow"><p>AI Insights are only available for Exam Mode results.</p></div></div>`;
  }

  byId('back-to-topics-btn').addEventListener('click', () => { showScreen('topic-screen'); setView(currentView); });
  byId('review-all-btn').addEventListener('click', () => setupReview('all'));
  byId('review-incorrect-btn').addEventListener('click', () => setupReview('incorrect'));
  byId('review-flagged-btn').addEventListener('click', () => setupReview('flagged'));
}

async function saveUserAttempt(scorePercent) {
  try {
    const attemptsCol = collection(db, 'users', currentUser.uid, 'attempts');
    await setDoc(doc(attemptsCol), {
      paperId: currentPaper.id,
      paperName: currentPaper.name,
      mode: quizMode,
      scorePercent,
      totalQuestions: allQuestions.length,
      elapsedSeconds,
      finishedAt: serverTimestamp()
    });
  } catch(e) { console.error('saveUserAttempt failed', e); }
}

async function updateAggregatesAndGetStats(scorePercent) {
  const ref = doc(db, 'quizAggregates', currentPaper.id);
  let out = { average: scorePercent, percentile: 100 };
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const b = getBucketIndex(scorePercent);
      if (!snap.exists()) {
        const hist = initHistogram(); hist[b] = 1;
        tx.set(ref, { totalAttempts: 1, averageScore: scorePercent, histogram: hist });
        out = { average: scorePercent, percentile: 100 };
      } else {
        const d = snap.data();
        const hist = Array.isArray(d.histogram) ? d.histogram.slice() : initHistogram();
        const priorTotal = hist.reduce((s,v)=>s+v,0);
        const lower = hist.slice(0, b).reduce((s,v)=>s+v,0);
        out.percentile = priorTotal > 0 ? (lower / priorTotal) * 100 : 100;

        const newTotal = (d.totalAttempts || 0) + 1;
        const newAvg = (((d.averageScore || 0) * (d.totalAttempts || 0)) + scorePercent) / newTotal;
        hist[b] = (hist[b] || 0) + 1;
        tx.update(ref, { totalAttempts: newTotal, averageScore: newAvg, histogram: hist });
        out.average = newAvg;
      }
    });
  } catch(e) { console.error('updateAggregates failed', e); }
  return out;
}

async function getAIInsights(incorrectQs) {
  const div = byId('ai-insights-content');
  div.innerHTML = '<p>Generating personalized insights...</p>';
  if (!QUIZ_CONFIG.GOOGLE_AI_API_KEY) { div.innerHTML = '<p>AI features are not enabled.</p>'; return; }
  if (!incorrectQs.length) { div.innerHTML = '<p>Flawless victory! No areas for improvement.</p>'; return; }

  try {
    const genAI = new GoogleGenerativeAI(QUIZ_CONFIG.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `A user answered these radiology exam questions incorrectly. Identify 2-3 core concepts they are struggling with and give concise, actionable study advice.\nQuestions:\n${incorrectQs.map(q => `- ${q.text}`).join('\n')}`;
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.();
    div.innerHTML = text ? text.replace(/\n/g, '<br>').replace(/\*/g,'') : '<p>Could not retrieve AI insights at this time.</p>';
  } catch(e) {
    console.error('AI error', e);
    div.innerHTML = '<p>Could not retrieve AI insights at this time.</p>';
  }
}

// ---------------------
// REVIEW
// ---------------------
function setupReview(type) {
  isReviewing = true;
  if (type === 'all') reviewFilter = allQuestions.map((_, i) => i);
  else if (type === 'incorrect') reviewFilter = allQuestions.map((q,i)=>i).filter(i => userAnswers[i] !== undefined && userAnswers[i] !== allQuestions[i].correctIndex);
  else if (type === 'flagged') reviewFilter = allQuestions.map((q,i)=>i).filter(i => flaggedQuestions.has(q.id));

  if (!reviewFilter.length) {
    showCustomAlert(`No ${type} questions to review.`, () => { isReviewing = false; finishExam(); });
    return;
  }
  dom.finishQuizBtn.style.display = 'none';
  showScreen('quiz-screen');
  createQuestionNav();
  showQuestion(reviewFilter[0]);
}
