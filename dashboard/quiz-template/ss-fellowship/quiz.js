// dashboard/quiz-template/ss-fellowship/quiz.js
// ============================================================================
// Imports
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  initializeFirestore, doc, runTransaction, collection, getDocs,
  setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai/+esm";

// ============================================================================
// Config (overridden by page)
// ============================================================================
let QUIZ_CONFIG = {
  GOOGLE_AI_API_KEY: "",
  ALL_QUIZ_DATA: {},     // { paperId: {sheetId,gid}, ... }
  PAPER_METADATA: [],    // [{id,name,examType}, ...]
  FIREBASE_CONFIG: {},

  // Optional: when 'auto' (recommended), tags are discovered from sheets
  SYSTEM_TAGS: 'auto'
};

// Exam durations (seconds)
const EXAM_DURATIONS = {
  "NEET SS": 3 * 60 * 60,
  "INI SS":  1.5 * 60 * 60,
  "Fellowship exam": 1.5 * 60 * 60
};

// Aggregates config
const HISTOGRAM_BUCKETS = 10;
const initHistogram = () => Array.from({ length: HISTOGRAM_BUCKETS }, () => 0);
const getBucketIndex = (scorePercent) =>
  Math.min(HISTOGRAM_BUCKETS - 1, Math.max(0, Math.floor(scorePercent / (100 / HISTOGRAM_BUCKETS))));

// ============================================================================
// State
// ============================================================================
let allQuestions = [];
let currentQuestionIndex = 0;
let currentUser = null;
let userBookmarks = new Set();
let flaggedQuestions = new Set();
let userAnswers = {};
let reviewFilter = [];

let currentPaper = null;          // {id, name, examType}
let quizMode = "practice";
let quizInterval = null;
let elapsedSeconds = 0;
let isReviewing = false;
let isSoundOn = true;
let activeView = 'year';          // 'year' | 'system'
let activeSystemTag = null;       // display label (e.g., "Abdomen")
let _discoveredTags = null;

let db, auth;

// ============================================================================
// DOM Cache
// ============================================================================
const dom = {
  screens: document.querySelectorAll('.screen'),
  paperCardGrid: document.getElementById('paper-card-grid'),

  // Header / quiz
  quizTitle: document.getElementById('quiz-title'),
  loadingContainer: document.getElementById('loading-container'),
  loadingMessage: document.getElementById('loading-message'),
  quizContent: document.getElementById('quiz-content'),
  questionsDisplay: document.getElementById('questions-display'),
  paginationHeader: document.getElementById('quiz-pagination-header'),
  timerEl: document.getElementById('timer'),
  finishQuizBtn: document.getElementById('finish-quiz-btn'),
  soundToggleBtn: document.getElementById('sound-toggle-btn'),
  correctSound: document.getElementById('correct-sound'),
  wrongSound: document.getElementById('wrong-sound'),
  modeToggle: document.getElementById('mode-toggle-checkbox'),

  // Modal
  modalBackdrop: document.getElementById('custom-modal-backdrop'),
  modalMessage: document.getElementById('modal-message'),
  modalButtons: document.getElementById('modal-buttons'),

  // Results
  resultsScreen: document.getElementById('results-screen'),
};

// ============================================================================
// Small helpers
// ============================================================================
const showScreen = (id) => {
  dom.screens.forEach(s => s.classList.toggle('active', s.id === id));
  if (window.feather) feather.replace();
};

const updateLoadingMessage = (msg) => {
  if (dom.loadingMessage) dom.loadingMessage.textContent = msg;
};

const normalizeTag = (t) =>
  (t || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();

// Title-case a normalized tag for display
const displayTag = (norm) =>
  norm.replace(/\b\w/g, c => c.toUpperCase());

// ============================================================================
// Modal helpers
// ============================================================================
function showCustomModal(message, buttons){
  if (!dom.modalBackdrop) return alert(message);
  dom.modalMessage.textContent = message;
  dom.modalButtons.innerHTML = '';
  buttons.forEach(btn => {
    const b = document.createElement('button');
    b.textContent = btn.text;
    b.className = 'results-btn ' + (btn.isPrimary ? 'primary' : 'secondary');
    b.onclick = () => { dom.modalBackdrop.style.display = 'none'; btn.onClick?.(); };
    dom.modalButtons.appendChild(b);
  });
  dom.modalBackdrop.style.display = 'flex';
}

const showCustomConfirm = (msg, ok, cancel=()=>{}) =>
  showCustomModal(msg, [
    { text: 'Yes', isPrimary: true, onClick: ok },
    { text: 'No',  isPrimary: false, onClick: cancel }
  ]);

const showCustomAlert = (msg, ok=()=>{}) =>
  showCustomModal(msg, [{ text:'OK', isPrimary:true, onClick:ok }]);

// ============================================================================
// CSV parsing (header-based, robust to column order/casing)
// ============================================================================
function parseCSVFlexible(csvText, paperIdForIds) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0]
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

  const colIndex = (nameCandidates) => {
    for (const name of nameCandidates) {
      const i = header.findIndex(h => h === name.toLowerCase());
      if (i >= 0) return i;
    }
    // try partial match
    for (const name of nameCandidates) {
      const i = header.findIndex(h => h.includes(name.toLowerCase()));
      if (i >= 0) return i;
    }
    return -1;
  };

  const idx = {
    q:  colIndex(['question']),
    a:  colIndex(['option a','a']),
    b:  colIndex(['option b','b']),
    c:  colIndex(['option c','c']),
    d:  colIndex(['option d','d']),
    ans: colIndex(['correct answer','answer','correct']),
    expl:colIndex(['explanation','rationale']),
    img: colIndex(['image']),
    imgExpl: colIndex(['image for explan','image for explar','image for expl','explanation image']),
    tag: colIndex(['tag','system','category']),
    subtag: colIndex(['subtag','sub-category','subsystem']),
    exam: colIndex(['exam','year','paper'])
  };

  const out = [];
  for (let r = 1; r < lines.length; r++){
    const parts = lines[r]
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map(p => p.trim().replace(/^"|"$/g, ''));

    const pick = (i) => (i >= 0 ? parts[i] : '');
    const qText = pick(idx.q);
    if (!qText) continue;

    const options = [pick(idx.a), pick(idx.b), pick(idx.c), pick(idx.d)].filter(Boolean);
    const ans = (pick(idx.ans) || '').trim().toLowerCase();
    const letterMap = { a:0, b:1, c:2, d:3 };
    const correctIndex = letterMap[ans];

    if (typeof correctIndex !== 'number' || !options.length) continue;

    out.push({
      id: `${paperIdForIds}-${r-1}`,
      text: qText,
      options,
      correctIndex,
      explanation: pick(idx.expl) || 'N/A',
      image: pick(idx.img),
      imageForExplTag: pick(idx.imgExpl),
      tag: pick(idx.tag),
      subtag: pick(idx.subtag),
      exam: pick(idx.exam)
    });
  }
  return out;
}

// ============================================================================
// System Tag discovery
// ============================================================================
async function discoverAllTagsFromSheets(){
  if (_discoveredTags) return _discoveredTags;

  const entries = QUIZ_CONFIG.PAPER_METADATA
    .map(p => ({ id:p.id, data: QUIZ_CONFIG.ALL_QUIZ_DATA[p.id] }))
    .filter(e => e.data?.sheetId && e.data?.gid);

  const all = new Set();

  await Promise.all(entries.map(async ({id, data}) => {
    const url = `https://docs.google.com/spreadsheets/d/${data.sheetId}/gviz/tq?tqx=out:csv&gid=${data.gid}`;
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return;
      const csv = await r.text();
      const qs = parseCSVFlexible(csv, id);
      qs.forEach(q => {
        const n = normalizeTag(q.tag);
        if (n) all.add(n);
      });
    } catch(_) {}
  }));

  const labels = Array.from(all).sort().map(displayTag);
  _discoveredTags = labels;
  return labels;
}

// ============================================================================
// Entry point
// ============================================================================
export function initQuizApp(config){
  QUIZ_CONFIG = { ...QUIZ_CONFIG, ...config };

  const app = initializeApp(QUIZ_CONFIG.FIREBASE_CONFIG);
  db = initializeFirestore(app, { experimentalForceLongPolling: true });
  auth = getAuth(app);

  // Auth gate
  onAuthStateChanged(auth, async (user) => {
    const authCheckScreen = document.getElementById('authCheckScreen');
    currentUser = user;
    if (user){
      if (authCheckScreen) authCheckScreen.style.display = 'none';
      // Initial topic view
      activeView = 'year';
      showTopicScreen();
    } else {
      if (authCheckScreen) {
        authCheckScreen.innerHTML = `
          <div class="selection-container">
            <div class="loader"></div>
            <p class="mt-4 text-lg text-gray-600">You must be logged in to continue.</p>
          </div>`;
      }
    }
  });

  // Header controls (these exist on quiz screen)
  dom.modeToggle?.addEventListener('change', ()=>{
    const newMode = dom.modeToggle.checked ? 'exam' : 'practice';
    showCustomConfirm(`Switching to ${newMode} mode will clear your current session. Continue?`,
      ()=> setQuizMode(newMode),
      ()=> dom.modeToggle.checked = !dom.modeToggle.checked
    );
  });

  dom.soundToggleBtn?.addEventListener('click', toggleSound);

  dom.finishQuizBtn?.addEventListener('click', ()=>{
    const msg = quizMode==='exam'
      ? 'Are you sure you want to finish the exam?'
      : 'Are you sure you want to finish this practice session?';
    showCustomConfirm(msg, ()=>finishExam(), ()=>{});
  });
}

// ============================================================================
// Topic screen (Year vs System)
// ============================================================================
function showTopicScreen(){
  showScreen('topic-screen');

  // Top heading area (if present on page)
  const yearBtn   = document.getElementById('btn-yearwise');
  const systemBtn = document.getElementById('btn-systemwise');
  const systemTabsWrap = document.getElementById('system-tabs');

  // Wire toggles (if present in page)
  yearBtn?.addEventListener('click', ()=>{
    activeView = 'year';
    yearBtn.classList.add('active');
    systemBtn?.classList.remove('active');
    systemTabsWrap && (systemTabsWrap.innerHTML = '');
    renderYearCards();
  });

  systemBtn?.addEventListener('click', async ()=>{
    activeView = 'system';
    systemBtn.classList.add('active');
    yearBtn?.classList.remove('active');
    await renderSystemTabs();
  });

  // Initial render
  if (activeView === 'system') renderSystemTabs(); else renderYearCards();
}

function renderYearCards(){
  if (!dom.paperCardGrid) return;
  dom.paperCardGrid.innerHTML =
    QUIZ_CONFIG.PAPER_METADATA.map(p => `
      <button class="paper-button rad-card" data-id="${p.id}" data-name="${p.name}" data-examtype="${p.examType}">
        <div class="rad-card-inner paper-inner">
          <div class="paper-text">
            <span class="paper-badge">${p.examType || ''}</span>
            <span class="paper-title">${p.name}</span>
          </div>
          <i data-feather="arrow-right" class="paper-arrow"></i>
        </div>
      </button>
    `).join('');

  // Clicks
  dom.paperCardGrid.querySelectorAll('.paper-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, name, examtype } = btn.dataset;
      currentPaper = { id, name, examType: examtype || 'NEET SS' };
      quizMode = 'practice';
      checkResumeAndStart();
    });
  });

  if (window.feather) feather.replace();
}

async function renderSystemTabs(){
  const tabsWrap = document.getElementById('system-tabs');
  if (!tabsWrap || !dom.paperCardGrid) return;

  let tags = [];
  if (QUIZ_CONFIG.SYSTEM_TAGS === 'auto' || !Array.isArray(QUIZ_CONFIG.SYSTEM_TAGS)){
    tabsWrap.innerHTML = `<div class="text-sm text-gray-500">Loading systems…</div>`;
    tags = await discoverAllTagsFromSheets();
  } else {
    tags = QUIZ_CONFIG.SYSTEM_TAGS;
  }

  if (!tags.length){
    tabsWrap.innerHTML = `<div class="text-sm text-gray-500">No systems found.</div>`;
    dom.paperCardGrid.innerHTML = '';
    return;
  }

  if (!activeSystemTag || !tags.includes(activeSystemTag)) activeSystemTag = tags[0];

  tabsWrap.innerHTML = tags.map(t =>
    `<button class="view-tab ${t===activeSystemTag?'active':''}" data-tag="${t}" role="tab">${t}</button>`
  ).join('');

  tabsWrap.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeSystemTag = tab.dataset.tag;
      renderSystemTabs(); // re-render to set active and card
    });
  });

  dom.paperCardGrid.innerHTML = `
    <button class="paper-button rad-card" id="start-system-paper">
      <div class="rad-card-inner paper-inner">
        <div class="paper-text">
          <span class="paper-badge">System</span>
          <span class="paper-title">${activeSystemTag} — All Years</span>
        </div>
        <i data-feather="arrow-right" class="paper-arrow"></i>
      </div>
    </button>
  `;

  document.getElementById('start-system-paper').addEventListener('click', () => {
    startSystemQuiz(activeSystemTag);
  });

  if (window.feather) feather.replace();
}

// ============================================================================
// Mode & resume
// ============================================================================
function setQuizMode(newMode){
  quizMode = newMode;
  if (currentPaper && currentUser){
    localStorage.removeItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`);
  }
  startQuiz(null);
}

function checkResumeAndStart(){
  const key = `radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`;
  const saved = localStorage.getItem(key);
  if (saved){
    showCustomConfirm(`You have an unfinished ${quizMode} session. Resume?`,
      ()=> startQuiz(JSON.parse(saved)),
      ()=> { localStorage.removeItem(key); startQuiz(null); }
    );
  } else {
    startQuiz(null);
  }
}

// ============================================================================
// Start quiz (paper) / system quiz (merged)
// ============================================================================
async function startQuiz(resumeState, directQuestionId = null){
  isReviewing = false; reviewFilter = [];
  userAnswers = resumeState?.answers || {};
  currentQuestionIndex = resumeState?.index || 0;
  elapsedSeconds = resumeState?.elapsedSeconds || 0;
  flaggedQuestions = new Set(resumeState?.flags || []);

  showScreen('quiz-screen');
  if (dom.loadingContainer) dom.loadingContainer.style.display = 'block';
  if (dom.quizContent) dom.quizContent.style.display = 'none';
  initializeSound();

  try {
    updateLoadingMessage(`Finding data for paper: ${currentPaper.name}…`);
    await fetchQuizData();
    if (!allQuestions.length) throw new Error('No questions found in the sheet.');

    updateLoadingMessage('Fetching your bookmarks…');
    await fetchUserBookmarks();

    dom.modeToggle && (dom.modeToggle.checked = quizMode === 'exam');
    dom.quizTitle && (dom.quizTitle.textContent = `${currentPaper.name}`);
    dom.finishQuizBtn && (dom.finishQuizBtn.style.display = 'block');

    createQuestionNav();
    if (directQuestionId){
      const i = allQuestions.findIndex(q => q.id === directQuestionId);
      showQuestion(i >= 0 ? i : 0);
    } else {
      showQuestion(currentQuestionIndex);
    }
    startTimer();
  } catch (err){
    console.error('Start quiz failed:', err);
    showCustomAlert(err?.message || 'Error preparing the session. Please try again.', () => {
      showTopicScreen();
    });
    return;
  } finally {
    if (dom.loadingContainer) dom.loadingContainer.style.display = 'none';
  }
  if (dom.quizContent) dom.quizContent.style.display = 'block';
}

async function startSystemQuiz(tagDisplay){
  // Build synthetic paper
  currentPaper = {
    id: `system-${normalizeTag(tagDisplay)}`,
    name: `${tagDisplay} — All Years`,
    examType: (QUIZ_CONFIG.PAPER_METADATA[0]?.examType) || 'NEET SS'
  };
  quizMode = 'practice';

  isReviewing = false; reviewFilter = [];
  userAnswers = {};
  currentQuestionIndex = 0;
  elapsedSeconds = 0;
  flaggedQuestions = new Set();

  showScreen('quiz-screen');
  dom.loadingContainer && (dom.loadingContainer.style.display = 'block');
  dom.quizContent && (dom.quizContent.style.display = 'none');
  initializeSound();

  try {
    updateLoadingMessage(`Collecting ${tagDisplay} questions across years…`);

    const entries = QUIZ_CONFIG.PAPER_METADATA
      .map(p => ({ id:p.id, name:p.name, examType:p.examType, data: QUIZ_CONFIG.ALL_QUIZ_DATA[p.id] }))
      .filter(e => e.data?.sheetId && e.data?.gid);

    const merged = [];
    const targetNorm = normalizeTag(tagDisplay);

    await Promise.all(entries.map(async e => {
      const url = `https://docs.google.com/spreadsheets/d/${e.data.sheetId}/gviz/tq?tqx=out:csv&gid=${e.data.gid}`;
      const r = await fetch(url, { cache:'no-store' });
      if (!r.ok) return;
      const csv = await r.text();
      const qs = parseCSVFlexible(csv, e.id);
      qs.forEach(q => {
        if (normalizeTag(q.tag) === targetNorm) {
          merged.push(q);
        }
      });
    }));

    allQuestions = merged;
    if (!allQuestions.length) throw new Error(`No questions found for “${tagDisplay}”.`);

    updateLoadingMessage('Fetching your bookmarks…');
    await fetchUserBookmarks();

    dom.modeToggle && (dom.modeToggle.checked = quizMode === 'exam');
    dom.quizTitle && (dom.quizTitle.textContent = `${currentPaper.name}`);
    dom.finishQuizBtn && (dom.finishQuizBtn.style.display = 'block');

    createQuestionNav();
    showQuestion(0);
    startTimer();
  } catch (err){
    console.error('System quiz start failed:', err);
    showCustomAlert(err?.message || 'Could not start system-wise quiz.', () => showTopicScreen());
    return;
  } finally {
    dom.loadingContainer && (dom.loadingContainer.style.display = 'none');
  }
  dom.quizContent && (dom.quizContent.style.display = 'block');
}

// Fetch one paper
async function fetchQuizData(){
  const paperData = QUIZ_CONFIG.ALL_QUIZ_DATA[currentPaper.id];
  if (!paperData?.sheetId || !paperData?.gid) {
    throw new Error('Missing sheet configuration for this paper.');
  }
  const url = `https://docs.google.com/spreadsheets/d/${paperData.sheetId}/gviz/tq?tqx=out:csv&gid=${paperData.gid}`;
  const r = await fetch(url, { cache:'no-store' });
  if (!r.ok) throw new Error(`Sheet fetch failed (${r.status}).`);
  const csv = await r.text();
  allQuestions = parseCSVFlexible(csv, currentPaper.id);
}

async function fetchUserBookmarks(){
  if (!currentUser){ userBookmarks = new Set(); return; }
  try {
    const bookmarksRef = collection(db, "users", currentUser.uid, "bookmarks");
    const snapshot = await getDocs(bookmarksRef);
    userBookmarks = new Set(snapshot.docs.map(d => d.id));
  } catch (e){
    console.warn('Bookmarks read failed:', e);
    userBookmarks = new Set();
  }
}

// ============================================================================
// Render + interactions
// ============================================================================
function createQuestionNav(){
  if (!dom.paginationHeader) return;
  dom.paginationHeader.innerHTML = allQuestions.map((_,i)=>`<div class="page-box" data-index="${i}">${i+1}</div>`).join('');
  dom.paginationHeader.querySelectorAll('.page-box').forEach(box =>
    box.addEventListener('click', ()=> showQuestion(parseInt(box.dataset.index,10)))
  );
}

function updateQuestionNav(){
  if (!dom.paginationHeader) return;
  dom.paginationHeader.querySelectorAll('.page-box').forEach(box=>{
    const i = parseInt(box.dataset.index,10);
    box.className = 'page-box';
    if (i === currentQuestionIndex) box.classList.add('active');

    if (userAnswers[i] !== undefined){
      if (quizMode==='practice' || isReviewing){
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

  dom.paginationHeader.querySelector('.page-box.active')
    ?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
}

function showQuestion(index){
  if (reviewFilter.length>0 && !reviewFilter.includes(index)){
    index = reviewFilter.find(i => i >= index) ?? reviewFilter[0];
  }
  currentQuestionIndex = index;
  const q = allQuestions[index];
  if (!q) return;

  const isBookmarked = userBookmarks.has(q.id);
  const isFlagged = flaggedQuestions.has(q.id);
  const isAnswered = userAnswers[index] !== undefined;

  // Exam hashtag (right side) when we have q.exam (esp. useful in system-wise)
  const examHash = q.exam ? `<span class="exam-hash">#${(q.exam || '').replace(/\s+/g,'')}</span>` : '';

  let html = `
    <div class="question-title-bar">
      <span class="question-number">Question ${index+1} of ${allQuestions.length}</span>
      <div class="question-controls">
        ${examHash}
        <button class="icon-btn flag-btn ${isFlagged?'flagged':''}" ${isReviewing?'disabled':''}><i data-feather="flag"></i></button>
        <button class="icon-btn bookmark-btn ${isBookmarked?'bookmarked':''}" ${isReviewing?'disabled':''}><i data-feather="bookmark"></i></button>
      </div>
    </div>
    <p class="main-question-text">${q.text}</p>
    <div class="options-wrap">
      ${q.options.map((opt,i)=>{
        const shouldDisable = isReviewing || (quizMode==='practice' && isAnswered);
        let cls = 'option-btn';
        if (quizMode==='exam' && i===userAnswers[index]) cls += ' selected';
        if (shouldDisable && i===q.correctIndex) cls += ' correct';
        else if (shouldDisable && i===userAnswers[index]) cls += ' incorrect';
        return `<button class="${cls}" data-index="${i}" ${shouldDisable?'disabled':''}>${opt}</button>`;
      }).join('')}
    </div>`;

  if ((quizMode==='practice' && isAnswered) || isReviewing){
    html += `<div class="explanation-box"><h4>Explanation</h4><p>${q.explanation}</p></div>`;
  }

  dom.questionsDisplay.innerHTML = html;

  dom.questionsDisplay.querySelector('.flag-btn')?.addEventListener('click', ()=> toggleFlag(q.id));
  dom.questionsDisplay.querySelector('.bookmark-btn')?.addEventListener('click', ()=> toggleBookmark(q.id, q.text));

  if (!isReviewing && !(quizMode==='practice' && isAnswered)){
    dom.questionsDisplay.querySelectorAll('.option-btn').forEach(b => b.addEventListener('click', handleOptionClick));
  }
  updateQuestionNav();
  if (window.feather) feather.replace();
}

function handleOptionClick(e){
  const selectedIndex = parseInt(e.currentTarget.dataset.index,10);
  userAnswers[currentQuestionIndex] = selectedIndex;
  const q = allQuestions[currentQuestionIndex];
  const isCorrect = selectedIndex === q.correctIndex;

  if (quizMode==='practice'){
    if (isSoundOn) (isCorrect ? dom.correctSound : dom.wrongSound)?.play?.();
    showQuestion(currentQuestionIndex);
  } else {
    showQuestion(currentQuestionIndex);
  }
  saveState();
}

// ============================================================================
// Flags, bookmarks, sound
// ============================================================================
function toggleFlag(id){
  flaggedQuestions.has(id) ? flaggedQuestions.delete(id) : flaggedQuestions.add(id);
  document.querySelector('.flag-btn')?.classList.toggle('flagged', flaggedQuestions.has(id));
  updateQuestionNav();
  saveState();
}

async function toggleBookmark(questionId, questionText){
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid, 'bookmarks', questionId);
  const btn = dom.questionsDisplay.querySelector('.bookmark-btn');
  try {
    if (userBookmarks.has(questionId)){
      await deleteDoc(ref);
      userBookmarks.delete(questionId);
      btn?.classList.remove('bookmarked');
    } else {
      await setDoc(ref, {
        questionText,
        topic: `${currentPaper.name}`,
        timestamp: serverTimestamp(),
        linkToQuestion: `${window.location.pathname}?paperId=${currentPaper.id}&questionId=${questionId}`
      });
      userBookmarks.add(questionId);
      btn?.classList.add('bookmarked');
    }
  } catch (e){
    console.warn('Bookmark toggle failed:', e);
  }
}

function initializeSound(){
  const saved = localStorage.getItem('radmentor_sound_pref');
  isSoundOn = saved !== 'off';
  updateSoundIcon();
}

function toggleSound(){
  isSoundOn = !isSoundOn;
  localStorage.setItem('radmentor_sound_pref', isSoundOn ? 'on' : 'off');
  updateSoundIcon();
}

function updateSoundIcon(){
  const icon = isSoundOn ? 'volume-2' : 'volume-x';
  if (dom.soundToggleBtn) dom.soundToggleBtn.innerHTML = `<i data-feather="${icon}"></i>`;
  if (window.feather) feather.replace();
}

// ============================================================================
// Timer & persistence
// ============================================================================
function saveState(){
  if (!currentUser || !currentPaper || isReviewing) return;
  const key = `radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`;
  const state = { answers:userAnswers, index:currentQuestionIndex, elapsedSeconds, flags:[...flaggedQuestions] };
  localStorage.setItem(key, JSON.stringify(state));
}

function formatTime(s){
  const m = Math.floor(s/60), r = s%60;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}

function startTimer(){
  clearInterval(quizInterval);
  const total = EXAM_DURATIONS[currentPaper.examType] || 0;

  if (quizMode==='exam' && total>0){
    let remaining = total - elapsedSeconds;
    dom.timerEl && (dom.timerEl.textContent = formatTime(remaining));
    quizInterval = setInterval(()=>{
      if (remaining <= 0){
        clearInterval(quizInterval);
        showCustomAlert("Time's up! The exam has finished.", ()=>finishExam());
        return;
      }
      remaining--; elapsedSeconds++;
      dom.timerEl && (dom.timerEl.textContent = formatTime(remaining));
      saveState();
    }, 1000);
  } else {
    let start = Date.now() - (elapsedSeconds*1000);
    quizInterval = setInterval(()=>{
      elapsedSeconds = Math.floor((Date.now()-start)/1000);
      dom.timerEl && (dom.timerEl.textContent = formatTime(elapsedSeconds));
      saveState();
    }, 1000);
  }
}

// ============================================================================
// Finish & results (with aggregates + AI insights)
// ============================================================================
async function finishExam(){
  clearInterval(quizInterval);
  showScreen('results-screen');

  let correct = 0, incorrect = 0;
  const incorrectQs = [];

  allQuestions.forEach((q,i)=>{
    if (userAnswers[i] !== undefined){
      if (userAnswers[i] === q.correctIndex) correct++;
      else { incorrect++; incorrectQs.push(q); }
    }
  });

  const unattempted = allQuestions.length - (correct + incorrect);
  const scorePercent = allQuestions.length > 0 ? (correct / allQuestions.length) * 100 : 0;

  document.getElementById('final-score-percent').textContent = `${scorePercent.toFixed(1)}%`;
  document.getElementById('correct-count').textContent = correct;
  document.getElementById('incorrect-count').textContent = incorrect;
  document.getElementById('unattempted-count').textContent = unattempted;
  document.getElementById('time-taken').textContent = formatTime(elapsedSeconds);

  if (window.performanceChart instanceof Chart) window.performanceChart.destroy();
  window.performanceChart = new Chart(document.getElementById('performanceChart'), {
    type:'doughnut',
    data:{
      labels:['Correct','Incorrect','Unattempted'],
      datasets:[{ data:[correct,incorrect,unattempted], backgroundColor:['#22c55e','#ef4444','#f59e0b'] }]
    },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  // Clear session
  if (currentUser) {
    localStorage.removeItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`);
  }

  if (quizMode==='exam' && currentUser){
    await Promise.all([
      saveUserAttempt(scorePercent),
      updateAggregatesAndGetStats(scorePercent).then(({average,percentile})=>{
        document.getElementById('average-score').textContent = `${average.toFixed(1)}%`;
        document.getElementById('percentile-rank').textContent = percentile.toFixed(1);
      })
    ]);
    await getAIInsights(incorrectQs);
  } else {
    document.getElementById('peer-comparison-content').innerHTML = '<p>Peer comparison is only available in Exam Mode.</p>';
    document.getElementById('ai-insights-card').innerHTML =
      `<div class="flex items-start gap-4"><div class="ai-avatar">🤖</div><div class="ai-message flex-grow"><p>AI Insights are only available for Exam Mode results.</p></div></div>`;
  }

  document.getElementById('back-to-topics-btn')?.addEventListener('click', ()=> showTopicScreen());
  document.getElementById('review-all-btn')?.addEventListener('click', ()=> setupReview('all'));
  document.getElementById('review-incorrect-btn')?.addEventListener('click', ()=> setupReview('incorrect'));
  document.getElementById('review-flagged-btn')?.addEventListener('click', ()=> setupReview('flagged'));
}

async function saveUserAttempt(scorePercent){
  try{
    const attemptsCol = collection(db, 'users', currentUser.uid, 'attempts');
    const attemptRef = doc(attemptsCol);
    await setDoc(attemptRef, {
      paperId: currentPaper.id,
      paperName: currentPaper.name,
      mode: quizMode,
      scorePercent,
      totalQuestions: allQuestions.length,
      elapsedSeconds,
      finishedAt: serverTimestamp()
    });
  } catch(e){
    console.error('saveUserAttempt failed:', e);
  }
}

async function updateAggregatesAndGetStats(scorePercent){
  const aggregatesRef = doc(db, 'quizAggregates', currentPaper.id);
  let out = { average: scorePercent, percentile: 100 };
  try {
    await runTransaction(db, async (tx)=>{
      const snap = await tx.get(aggregatesRef);
      const b = getBucketIndex(scorePercent);
      if (!snap.exists()){
        const hist = initHistogram(); hist[b] = 1;
        tx.set(aggregatesRef, { totalAttempts: 1, averageScore: scorePercent, histogram: hist });
        out = { average: scorePercent, percentile: 100 };
      } else {
        const data = snap.data();
        const total = data.totalAttempts || 0;
        const prevAvg = data.averageScore || 0;
        const hist = Array.isArray(data.histogram) ? data.histogram.slice() : initHistogram();

        // Percentile based on prior distribution
        const lowerCount = hist.slice(0,b).reduce((s,v)=>s+v,0);
        const priorTotal = hist.reduce((s,v)=>s+v,0);
        out.percentile = priorTotal>0 ? (lowerCount/priorTotal)*100 : 100;

        const newTotal = total + 1;
        const newAvg = ((prevAvg * total) + scorePercent) / newTotal;
        hist[b] = (hist[b]||0) + 1;

        tx.update(aggregatesRef, { totalAttempts:newTotal, averageScore:newAvg, histogram:hist });
        out.average = newAvg;
      }
    });
  } catch(e){
    console.error('updateAggregatesAndGetStats failed:', e);
  }
  return out;
}

async function getAIInsights(incorrectQs){
  const insightsDiv = document.getElementById('ai-insights-content');
  insightsDiv.innerHTML = '<p>Generating personalized insights...</p>';
  if (!QUIZ_CONFIG.GOOGLE_AI_API_KEY){
    insightsDiv.innerHTML = '<p>AI features are not enabled. Please add a Google AI API key.</p>';
    return;
  }
  if (!incorrectQs.length){
    insightsDiv.innerHTML = '<p>Flawless victory! You answered all questions correctly. No areas for improvement found.</p>';
    return;
  }

  try{
    const genAI = new GoogleGenerativeAI(QUIZ_CONFIG.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `A user answered these radiology exam questions incorrectly. Identify 2-3 core concepts they are struggling with and give concise, actionable study advice.\nQuestions:\n${incorrectQs.map(q=>`- ${q.text}`).join('\n')}`;
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.();
    if (text) insightsDiv.innerHTML = text.replace(/\n/g,'<br>').replace(/\*/g,'');
    else insightsDiv.innerHTML = '<p>Could not retrieve AI insights at this time.</p>';
  } catch (e){
    console.error('AI error:', e);
    insightsDiv.innerHTML = '<p>Could not retrieve AI insights at this time. Please check your API key and try again.</p>';
  }
}

// ============================================================================
// Review mode
// ============================================================================
function setupReview(type){
  isReviewing = true;
  if (type==='all') reviewFilter = allQuestions.map((_,i)=>i);
  else if (type==='incorrect') reviewFilter = allQuestions.map((q,i)=>i).filter(i => userAnswers[i]!==undefined && userAnswers[i]!==allQuestions[i].correctIndex);
  else if (type==='flagged') reviewFilter = allQuestions.map((q,i)=>i).filter(i => flaggedQuestions.has(q.id));

  if (!reviewFilter.length){
    showCustomAlert(`No ${type} questions to review.`, ()=>{
      isReviewing = false; finishExam();
    });
    return;
  }
  dom.finishQuizBtn && (dom.finishQuizBtn.style.display = 'none');
  showScreen('quiz-screen');
  createQuestionNav();
  showQuestion(reviewFilter[0]);
}
