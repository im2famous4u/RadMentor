// dashboard/quiz-template/ss-fellowship/quiz.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  // initializeFirestore to force long-polling (ad-blocker safe)
  initializeFirestore,
  doc, runTransaction, collection, getDocs, setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Google Generative AI
import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai/+esm";

// ---------------------
// CONFIG (overridden by page)
// ---------------------
let QUIZ_CONFIG = {
  GOOGLE_AI_API_KEY: "",
  ALL_QUIZ_DATA: {},
  PAPER_METADATA: [],
  FIREBASE_CONFIG: {},
  ENABLE_SYSTEM_WISE: false,   // set true in NEETSS page
  SYSTEM_TAGS: []              // list of tags for tabs (NEETSS only)
};

// Map exam types to duration (seconds)
const EXAM_DURATIONS = {
  "NEET SS": 3 * 60 * 60,
  "INI SS": 1.5 * 60 * 60,
  "Fellowship exam": 1.5 * 60 * 60
};

// Aggregates config (histogram-based, scalable)
const HISTOGRAM_BUCKETS = 10; // 0–10, 10–20, ... 90–100
const initHistogram = () => Array.from({ length: HISTOGRAM_BUCKETS }, () => 0);
const getBucketIndex = (scorePercent) =>
  Math.min(HISTOGRAM_BUCKETS - 1, Math.max(0, Math.floor(scorePercent / (100 / HISTOGRAM_BUCKETS))));

// ---------------------
// APP STATE
// ---------------------
let allQuestions = [], currentQuestionIndex = 0, currentUser = null;
let userBookmarks = new Set(), flaggedQuestions = new Set();
let reviewFilter = [];
let currentPaper = null, quizMode = "practice", quizInterval = null, elapsedSeconds = 0;
let userAnswers = {};
let isReviewing = false;
let isSoundOn = true;
let db, auth;

// extra state for System-wise (NEET SS)
let viewBy = 'year';             // 'year' | 'system'
let selectedSystem = null;       // current tag
let allYearCache = null;         // merged questions across all sheets (for system-wise)

// Cache DOM
const dom = {
  screens: document.querySelectorAll('.screen'),
  paperCardGrid: document.getElementById('paper-card-grid'),
  quizTitle: document.getElementById('quiz-title'),
  loadingContainer: document.getElementById('loading-container'),
  questionsDisplay: document.getElementById('questions-display'),
  quizContent: document.getElementById('quiz-content'),
  paginationHeader: document.getElementById('quiz-pagination-header'),
  timerEl: document.getElementById('timer'),
  resultsScreen: document.getElementById('results-screen'),
  finishQuizBtn: document.getElementById('finish-quiz-btn'),
  soundToggleBtn: document.getElementById('sound-toggle-btn'),
  correctSound: document.getElementById('correct-sound'),
  wrongSound: document.getElementById('wrong-sound'),
  modeToggle: document.getElementById('mode-toggle-checkbox'),
  modalBackdrop: document.getElementById('custom-modal-backdrop'),
  modalMessage: document.getElementById('modal-message'),
  modalButtons: document.getElementById('modal-buttons'),
  loadingMessage: document.getElementById('loading-message'),
  // view toggle + tabs (exist in NEETSS only)
  systemTabs: document.getElementById('system-tabs'),
  viewYearBtn: document.getElementById('view-year'),
  viewSystemBtn: document.getElementById('view-system')
};

// ---------------------
// Custom modal helpers
// ---------------------
// --- View toggle state ---
let currentView = 'year';        // 'year' | 'system'
let activeSystemTag = null;      // e.g. 'Abdomen'

// Renders the 2 big buttons + (optionally) system tabs
function initViewToggle() {
  const yearBtn   = document.getElementById('btn-view-year');
  const sysBtn    = document.getElementById('btn-view-system');
  const tabsWrap  = document.getElementById('system-tabs');

  if (!yearBtn || !sysBtn) return;

  yearBtn.addEventListener('click', () => {
    currentView = 'year';
    yearBtn.classList.add('active');
    sysBtn.classList.remove('active');
    // hide tabs, show year grid
    if (tabsWrap) tabsWrap.innerHTML = '';
    renderYearCards();
  });

  sysBtn.addEventListener('click', () => {
    currentView = 'system';
    sysBtn.classList.add('active');
    yearBtn.classList.remove('active');
    // build tabs and default to first tag
    renderSystemTabs();
  });
}

function renderYearCards() {
  const grid = dom.paperCardGrid;
  if (!grid) return;
  grid.innerHTML = QUIZ_CONFIG.PAPER_METADATA.map(p => `
    <button class="paper-button rad-card"
            data-id="${p.id}" data-name="${p.name}" data-examtype="${p.examType}">
      <div class="rad-card-inner paper-inner">
        <div class="paper-text">
          <span class="paper-badge">${p.examType}</span>
          <span class="paper-title">${p.name}</span>
        </div>
        <i data-feather="arrow-right" class="paper-arrow"></i>
      </div>
    </button>
  `).join('');
  grid.querySelectorAll('.paper-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, name, examtype } = btn.dataset;
      currentPaper = { id, name, examType: examtype };
      quizMode = 'practice';
      checkResumeAndStart();
    });
  });
  if (window.feather) feather.replace();
}

// build clickable chips for each system tag
function renderSystemTabs() {
  const tabsWrap = document.getElementById('system-tabs');
  const grid     = dom.paperCardGrid;
  if (!tabsWrap || !grid) return;

  const tags = Array.isArray(QUIZ_CONFIG.SYSTEM_TAGS) ? QUIZ_CONFIG.SYSTEM_TAGS : [];
  if (!tags.length) {
    tabsWrap.innerHTML = `<div class="text-sm text-gray-500">No system tags configured.</div>`;
    grid.innerHTML = '';
    return;
  }

  // default tag
  if (!activeSystemTag) activeSystemTag = tags[0];

  tabsWrap.innerHTML = tags.map(t =>
    `<button class="view-tab ${t===activeSystemTag ? 'active':''}" data-tag="${t}" role="tab">${t}</button>`
  ).join('');

  tabsWrap.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeSystemTag = tab.dataset.tag;
      renderSystemTabs(); // re-render to move active class
    });
  });

  // Render a single “Start” card for the chosen system
  grid.innerHTML = `
    <button class="paper-button rad-card" id="start-system-paper">
      <div class="rad-card-inner paper-inner">
        <div class="paper-text">
          <span class="paper-badge">NEET SS</span>
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

// Fetch ALL years, filter by Tag, and start a virtual paper
async function startSystemQuiz(tag) {
  // virtual paper to display in header and to key your localStorage
  currentPaper = { id: `neet-ss-${tag.toLowerCase().replace(/\s+/g,'-')}`, name: `${tag} — All Years`, examType: 'NEET SS' };
  quizMode = 'practice';

  isReviewing = false; reviewFilter = [];
  userAnswers = {};
  currentQuestionIndex = 0;
  elapsedSeconds = 0;
  flaggedQuestions = new Set();

  showScreen('quiz-screen');
  dom.loadingContainer.style.display = 'block';
  dom.quizContent.style.display = 'none';
  dom.quizTitle.textContent = currentPaper.name;
  initializeSound();

  try {
    // fetch all papers in parallel
    const entries = QUIZ_CONFIG.PAPER_METADATA.map(p => {
      const d = QUIZ_CONFIG.ALL_QUIZ_DATA[p.id];
      return { id:p.id, name:p.name, sheetId:d?.sheetId, gid:d?.gid };
    }).filter(x => x.sheetId && x.gid);

    const csvs = await Promise.all(entries.map(async e => {
      const url = `https://docs.google.com/spreadsheets/d/${e.sheetId}/gviz/tq?tqx=out:csv&gid=${e.gid}`;
      const r = await fetch(url, { cache:'no-store' });
      if (!r.ok) throw new Error(`Failed to load ${e.name}`);
      return r.text();
    }));

    // parse all and filter by Tag column
    let merged = [];
    csvs.forEach((csv, idx) => {
      const parsed = parseCSVToQuestions(csv);
      // keep those with Tag == tag (case-insensitive)
      const subset = parsed.filter(q => (q.subtag || q.tag || q.examTag || q.Tag || q.tagName, true) || true); // keep structure
      // Our parse filled q.subtag=K column, q.exam=L column; Tag is J column -> we didn't store it earlier!
      // quick fix: re-parse to read the J column (Tag) and L column (Exam)
    });

    // Re-parse to capture Tag + Exam explicitly
    function parseWithTag(csv, paperId) {
      const lines = csv.trim().split('\n');
      const header = lines[0].split(',');
      const rows = lines.slice(1);

      // indices (fallbacks if header text changed)
      const idx = (label, def) => {
        const i = header.findIndex(h => h.trim().toLowerCase() === label.toLowerCase());
        return i >= 0 ? i : def;
      };
      const iQ = idx('Question', 0);
      const iA = idx('Option A', 1);
      const iB = idx('Option B', 2);
      const iC = idx('Option C', 3);
      const iD = idx('Option D', 4);
      const iCorrect = idx('Correct Answer', 5);
      const iExplain = idx('Explanation', 6);
      const iImg = idx('Image', 7);
      const iImgExp = idx('Image for Explan', 8);
      const iTag = idx('Tag', 9);
      const iSub = idx('Subtag', 10);
      const iExam = idx('Exam', 11);

      return rows.map((raw, rIndex) => {
        const parts = raw.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(x => x.replace(/^"|"$/g,'').trim());
        const q = parts[iQ]; if (!q) return null;
        const opts = [parts[iA],parts[iB],parts[iC],parts[iD]].filter(Boolean);
        const map = {a:0,b:1,c:2,d:3};
        const ci = map[(parts[iCorrect]||'').toLowerCase()];
        if (ci === undefined || !opts.length) return null;
        return {
          id: `${paperId}-${rIndex}`,
          text: q,
          options: opts,
          correctIndex: ci,
          explanation: parts[iExplain] || 'N/A',
          image: parts[iImg],
          imageForExplTag: parts[iImgExp],
          tag: parts[iTag] || '',
          subtag: parts[iSub] || '',
          exam: parts[iExam] || ''
        };
      }).filter(Boolean);
    }

    // Build merged dataset with tag filter
    const mergedAll = [];
    csvs.forEach((csv, i) => {
      const paperId = entries[i].id;
      const parsed = parseWithTag(csv, paperId);
      parsed.forEach(q => {
        if ((q.tag || '').toLowerCase() === tag.toLowerCase()) mergedAll.push(q);
      });
    });

    if (!mergedAll.length) throw new Error(`No questions found under “${tag}”. Check the Tag column values.`);

    // attach to global and launch UI
    allQuestions = mergedAll;
    dom.modeToggle.checked = false;
    createQuestionNav();
    showQuestion(0);
    startTimer();
  } catch (err) {
    console.error(err);
    showCustomAlert(err.message || 'Could not start system-wise quiz.', () => showScreen('topic-screen'));
  } finally {
    dom.loadingContainer.style.display = 'none';
    dom.quizContent.style.display = 'block';
  }
function showCustomModal(message, buttons){
  if (!dom.modalBackdrop) { alert(message); return; }
  dom.modalMessage.textContent = message;
  dom.modalButtons.innerHTML = '';
  buttons.forEach(btn => {
    const b = document.createElement('button');
    b.textContent = btn.text;
    b.className = 'results-btn ' + (btn.isPrimary ? 'primary' : 'secondary');
    b.onclick = () => { dom.modalBackdrop.style.display = 'none'; btn.onClick(); };
    dom.modalButtons.appendChild(b);
  });
  dom.modalBackdrop.style.display = 'flex';
}
const showCustomConfirm = (msg, ok, cancel=()=>{}) => showCustomModal(msg,[{text:'Yes',isPrimary:true,onClick:ok},{text:'No',isPrimary:false,onClick:cancel}]);
const showCustomAlert = (msg, ok=()=>{}) => showCustomModal(msg,[{text:'OK',isPrimary:true,onClick:ok}]);

// ---------------------
// INIT ENTRYPOINT
// ---------------------
export function initQuizApp(config){
  QUIZ_CONFIG = { ...QUIZ_CONFIG, ...config };

  const app = initializeApp(QUIZ_CONFIG.FIREBASE_CONFIG);
  // Force long-polling to avoid WebChannel being blocked by ad-blockers / proxies
  db = initializeFirestore(app, { experimentalForceLongPolling: true });
  auth = getAuth(app);

  onAuthStateChanged(auth, (user) => {
    const authCheckScreen = document.getElementById('authCheckScreen');
    currentUser = user;
    if(user){
      if(authCheckScreen) authCheckScreen.style.display = 'none';
      handleDirectLink(user);
    }else{
      if(authCheckScreen) authCheckScreen.innerHTML = '<div class="selection-container"><p>You must be logged in to continue.</p></div>';
      function handleDirectLink(user) {
  // ... existing build of topic screen ...
  showScreen('topic-screen');
  // render the default year cards
  renderYearCards();
  // wire up the two big buttons + (later) system tabs
  initViewToggle();
}
  });

  // paper click (delegated)
  dom.paperCardGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('.paper-button');
    if (!btn) return;
    const { id, name, examtype } = btn.dataset;
    currentPaper = { id, name, examType: examtype || 'NEET SS' };
    quizMode = 'practice';
    checkResumeAndStart();
  });

  // Mode toggle with confirm
  dom.modeToggle?.addEventListener('change', ()=>{
    const newMode = dom.modeToggle.checked ? 'exam' : 'practice';
    showCustomConfirm(`Switching to ${newMode} mode will clear your current session. Continue?`,
      ()=> setQuizMode(newMode),
      ()=> dom.modeToggle.checked = !dom.modeToggle.checked
    );
  });

  dom.soundToggleBtn?.addEventListener('click', toggleSound);

  dom.finishQuizBtn?.addEventListener('click', ()=>{
    const msg = quizMode==='exam' ? 'Are you sure you want to finish the exam?' : 'Are you sure you want to finish this practice session?';
    showCustomConfirm(msg, ()=>finishExam(), ()=>{});
  });

  // Year/System toggle (NEET SS)
  if (QUIZ_CONFIG.ENABLE_SYSTEM_WISE && dom.viewYearBtn && dom.viewSystemBtn) {
    const setView = (v) => {
      viewBy = v;
      dom.viewYearBtn.classList.toggle('active', v === 'year');
      dom.viewSystemBtn.classList.toggle('active', v === 'system');
      if (v === 'year') {
        dom.systemTabs.style.display = 'none';
        dom.paperCardGrid.style.display = '';
        renderPaperCards();
      } else {
        dom.paperCardGrid.style.display = 'none';
        dom.systemTabs.style.display = 'flex';
        renderSystemTabs();
      }
    };
    dom.viewYearBtn.addEventListener('click', () => setView('year'));
    dom.viewSystemBtn.addEventListener('click', () => setView('system'));
  }
}

// ---------------------
// Core UI helpers
// ---------------------
function showScreen(id){
  dom.screens.forEach(s => s.classList.toggle('active', s.id===id));
  if(window.feather){ feather.replace(); }
}

function handleDirectLink(user) {
  const params = new URLSearchParams(window.location.search);
  const directQuestionId = params.get('questionId');

  if (user && directQuestionId) {
    const paperId = params.get('paperId');
    const paper = QUIZ_CONFIG.PAPER_METADATA.find((p) => p.id === paperId);
    if (paper) {
      currentPaper = paper;
      quizMode = 'practice';
      startQuiz(null, directQuestionId);
      return;
    }
  }

  // Topic screen
  showScreen('topic-screen');
  if (QUIZ_CONFIG.ENABLE_SYSTEM_WISE && dom.viewYearBtn && dom.viewSystemBtn) {
    // default to Year-wise
    if (dom.systemTabs) dom.systemTabs.style.display = 'none';
    if (dom.paperCardGrid) dom.paperCardGrid.style.display = '';
    renderPaperCards();
  } else {
    renderPaperCards();
  }
}

// Build paper cards (year-wise)
function renderPaperCards() {
  if (!dom.paperCardGrid) return;
  dom.paperCardGrid.innerHTML = QUIZ_CONFIG.PAPER_METADATA.map(p => `
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
  if (window.feather) feather.replace();
}

// Build system tabs (NEET SS)
function renderSystemTabs() {
  if (!dom.systemTabs) return;
  const tags = QUIZ_CONFIG.SYSTEM_TAGS || [];
  dom.systemTabs.innerHTML = tags.map(t => `<button class="tab" data-tag="${t}">${t}</button>`).join('');
  dom.systemTabs.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      dom.systemTabs.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSystem = btn.dataset.tag;
      await startSystemQuiz(selectedSystem);
    });
  });
}

// Load & merge all sheets once (for system-wise)
async function ensureMergedQuestions() {
  if (allYearCache) return allYearCache;
  const entries = Object.entries(QUIZ_CONFIG.ALL_QUIZ_DATA || {});
  const merged = [];
  for (const [id, conf] of entries) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${conf.sheetId}/gviz/tq?tqx=out:csv&gid=${conf.gid}`;
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const csv = await r.text();
      const parsed = parseCSVToQuestions(csv).map((q, idx) => ({ ...q, id: `${id}-${idx}` }));
      merged.push(...parsed);
    } catch (e) { /* skip bad sheet */ }
  }
  allYearCache = merged;
  return merged;
}

async function startSystemQuiz(tag) {
  if (!tag) return;
  const merged = await ensureMergedQuestions();
  allQuestions = merged.filter(q => (q.tag || '').toLowerCase() === tag.toLowerCase());
  if (allQuestions.length === 0) {
    showCustomAlert(`No questions found for "${tag}". Try another tag.`);
    return;
  }
  currentPaper = { id: `neet-ss-system-${tag}`, name: `NEET SS — ${tag}`, examType: 'NEET SS' };
  quizMode = 'practice';
  isReviewing = false; reviewFilter = []; userAnswers = {}; flaggedQuestions = new Set();
  elapsedSeconds = 0; currentQuestionIndex = 0;

  showScreen('quiz-screen');
  dom.loadingContainer && (dom.loadingContainer.style.display = 'none');
  dom.quizContent && (dom.quizContent.style.display = 'block');
  if (dom.quizTitle) dom.quizTitle.textContent = `${currentPaper.name}`;
  if (dom.finishQuizBtn) { dom.finishQuizBtn.textContent = 'Finish'; dom.finishQuizBtn.style.display = 'block'; }

  createQuestionNav();
  showQuestion(0);
  startTimer();
}

function setQuizMode(newMode){
  quizMode = newMode;
  if (currentUser && currentPaper) {
    localStorage.removeItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`);
  }
  startQuiz(null);
}

function checkResumeAndStart(){
  const key = `radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`;
  const saved = localStorage.getItem(key);
  if(saved){
    showCustomConfirm(`You have an unfinished ${quizMode} session. Resume?`,
      ()=> startQuiz(JSON.parse(saved)),
      ()=> { localStorage.removeItem(key); startQuiz(null); }
    );
  }else{ startQuiz(null); }
}

// ---------------------
// QUIZ FLOW
// ---------------------
async function startQuiz(resumeState, directQuestionId = null) {
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
    updateLoadingMessage(`Finding data for paper: ${currentPaper.name}...`);
    await fetchQuizData();

    if (!allQuestions.length) {
      throw new Error('No questions found in the sheet. Check sharing settings, gid, and column order.');
    }

    updateLoadingMessage('Fetching your bookmarks...');
    await fetchUserBookmarks(); // continue even if it fails

    // UI ready
    if (dom.modeToggle) dom.modeToggle.checked = quizMode === 'exam';
    const labels = document.querySelectorAll('.mode-label');
    labels[1]?.classList.toggle('text-gray-800', quizMode === 'exam'); // Exam
    labels[0]?.classList.toggle('text-gray-800', quizMode !== 'exam'); // Quiz

    if (dom.quizTitle) dom.quizTitle.textContent = `${currentPaper.name}`;
    if (dom.finishQuizBtn) { dom.finishQuizBtn.textContent = 'Finish'; dom.finishQuizBtn.style.display = 'block'; }

    createQuestionNav();

    if (directQuestionId) {
      const i = allQuestions.findIndex(q => q.id === directQuestionId);
      showQuestion(i >= 0 ? i : 0);
    } else {
      showQuestion(currentQuestionIndex);
    }
    startTimer();
  } catch (err) {
    console.error('Start quiz failed:', err);
    showCustomAlert(err?.message || 'Error preparing the session. Please try again.', () => {
      showScreen('topic-screen');
    });
    return;
  } finally {
    if (dom.loadingContainer) dom.loadingContainer.style.display = 'none';
  }
  if (dom.quizContent) dom.quizContent.style.display = 'block';
}

function updateLoadingMessage(msg){ if (dom.loadingMessage) dom.loadingMessage.textContent = msg; }

async function fetchQuizData(){
  const paperData = QUIZ_CONFIG.ALL_QUIZ_DATA[currentPaper.id];
  if (!paperData?.sheetId || !paperData?.gid) {
    throw new Error('Missing sheet configuration for this paper.');
  }
  const url = `https://docs.google.com/spreadsheets/d/${paperData.sheetId}/gviz/tq?tqx=out:csv&gid=${paperData.gid}`;
  let csvText = '';
  try{
    const r = await fetch(url, { cache: 'no-store' });
    if(!r.ok) throw new Error(`Sheet fetch failed (${r.status}).`);
    csvText = await r.text();
  }catch(err){
    throw new Error('Could not load the question sheet. Check sharing settings and network.');
  }
  const parsed = parseCSVToQuestions(csvText);
  allQuestions = Array.isArray(parsed) ? parsed : [];
}

function parseCSVToQuestions(csvText) {
  const lines = csvText.trim().split('\n').slice(1);
  return lines.map((line, index) => {
    const parts = line
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map(p => p.trim().replace(/^"|"$/g, ''));
    // A:Question B:OptA C:OptB D:OptC E:OptD F:Correct G:Explanation H:Image I:ImageForExpl J:Tag K:Subtag L:Exam
    const [question, a, b, c, d, correctAns, explanation, image, imageForExplTag, tag, subtag, exam] = parts;
    const options = [a, b, c, d].filter(Boolean);
    const letterMap = { a:0, b:1, c:2, d:3 };
    const correctIndex = letterMap[(correctAns || '').trim().toLowerCase()];

    if (question && correctIndex !== undefined && options.length > 0) {
      return {
        id: `${currentPaper?.id || 'merged'}-${index}`,
        text: question,
        options,
        correctIndex,
        explanation: explanation || "N/A",
        image,
        imageForExplTag,
        tag: (tag || '').trim(),
        subtag: (subtag || '').trim(),
        exam: (exam || '').trim()
      };
    }
    return null;
  }).filter(Boolean);
}

async function fetchUserBookmarks() {
  if (!currentUser) { userBookmarks = new Set(); return; }
  try {
    const bookmarksRef = collection(db, "users", currentUser.uid, "bookmarks");
    const snapshot = await getDocs(bookmarksRef);
    userBookmarks = new Set(snapshot.docs.map(d => d.id));
  } catch (e) {
    console.warn('Bookmarks read failed (continuing without them):', e);
    userBookmarks = new Set();
  }
}

function showQuestion(index){
  if(reviewFilter.length>0 && !reviewFilter.includes(index)){
    index = reviewFilter.find(i=>i>=index) ?? reviewFilter[0];
  }
  currentQuestionIndex = index;
  const q = allQuestions[index];
  if(!q) return;

  const isBookmarked = userBookmarks.has(q.id);
  const isFlagged = flaggedQuestions.has(q.id);
  const isAnswered = userAnswers[index] !== undefined;

  const examHash = (q.exam || '').trim()
    ? `#${q.exam.replace(/\s+/g,'').toUpperCase()}`
    : '';

  let html = `
    <div class="question-title-bar">
      <span class="question-number">Question ${index+1} of ${allQuestions.length}</span>
      <div class="question-controls">
        ${examHash ? `<span class="exam-hash">${examHash}</span>` : ''}
        <button class="icon-btn flag-btn ${isFlagged?'flagged':''}" ${isReviewing?'disabled':''}><i data-feather="flag"></i></button>
        <button class="icon-btn bookmark-btn ${isBookmarked?'bookmarked':''}" ${isReviewing?'disabled':''}><i data-feather="bookmark"></i></button>
      </div>
    </div>
    <p class="main-question-text">${q.text}</p>
    <div>
      ${q.options.map((opt,i)=>{
        const shouldDisable = isReviewing || (quizMode==='practice' && isAnswered);
        let cls = 'option-btn';
        if(quizMode==='exam' && i===userAnswers[index]) cls += ' selected';
        if(shouldDisable && i===q.correctIndex) cls += ' correct';
        else if(shouldDisable && i===userAnswers[index]) cls += ' incorrect';
        return `<button class="${cls}" data-index="${i}" ${shouldDisable?'disabled':''}>${opt}</button>`;
      }).join('')}
    </div>`;

  if((quizMode==='practice' && isAnswered) || isReviewing){
    html += `<div class="explanation-box"><h4>Explanation</h4><p>${q.explanation}</p></div>`;
  }

  dom.questionsDisplay.innerHTML = html;

  dom.questionsDisplay.querySelector('.flag-btn')?.addEventListener('click', ()=> toggleFlag(q.id));
  dom.questionsDisplay.querySelector('.bookmark-btn')?.addEventListener('click', ()=> toggleBookmark(q.id, q.text));

  if(!isReviewing && !(quizMode==='practice' && isAnswered)){
    dom.questionsDisplay.querySelectorAll('.option-btn').forEach(b=> b.addEventListener('click', handleOptionClick));
  }
  updateQuestionNav();
  if(window.feather){ feather.replace(); }
}

function handleOptionClick(e){
  const selectedIndex = parseInt(e.target.dataset.index);
  userAnswers[currentQuestionIndex] = selectedIndex;
  const q = allQuestions[currentQuestionIndex];
  const isCorrect = selectedIndex === q.correctIndex;

  if(quizMode==='practice'){
    if(isSoundOn) (isCorrect ? dom.correctSound : dom.wrongSound).play();
    showQuestion(currentQuestionIndex);
  }else{
    showQuestion(currentQuestionIndex);
  }
  saveState();
}

function createQuestionNav(){
  dom.paginationHeader.innerHTML = allQuestions.map((_,i)=>`<div class="page-box" data-index="${i}">${i+1}</div>`).join('');
  dom.paginationHeader.querySelectorAll('.page-box').forEach(box => box.addEventListener('click', ()=> showQuestion(parseInt(box.dataset.index))));
}

function updateQuestionNav(){
  dom.paginationHeader.querySelectorAll('.page-box').forEach(box=>{
    const i = parseInt(box.dataset.index);
    box.className = 'page-box';
    if(i===currentQuestionIndex) box.classList.add('active');
    if(userAnswers[i] !== undefined){
      if(quizMode==='practice' || isReviewing){
        const correct = userAnswers[i] === allQuestions[i].correctIndex;
        box.classList.add(correct ? 'answered-correct' : 'answered-incorrect');
      }else{
        box.classList.add('answered-correct');
        box.style.backgroundColor = 'var(--primary-color)';
        box.style.borderColor = 'var(--primary-color)';
        box.style.color = 'white';
      }
    }
    if(flaggedQuestions.has(allQuestions[i].id)) box.classList.add('flagged');
  });
  const active = dom.paginationHeader.querySelector('.page-box.active');
  active?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
}

// ---------------------
// Sound prefs
// ---------------------
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
  if (dom.soundToggleBtn) {
    dom.soundToggleBtn.innerHTML = `<i data-feather="${icon}"></i>`;
    if(window.feather){ feather.replace(); }
  }
}

// ---------------------
// Flags & Bookmarks
// ---------------------
function toggleFlag(id){
  flaggedQuestions.has(id) ? flaggedQuestions.delete(id) : flaggedQuestions.add(id);
  document.querySelector('.flag-btn')?.classList.toggle('flagged', flaggedQuestions.has(id));
  updateQuestionNav();
  saveState();
}

async function toggleBookmark(questionId, questionText){
  if(!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid, 'bookmarks', questionId);
  const btn = dom.questionsDisplay.querySelector('.bookmark-btn');
  try{
    if(userBookmarks.has(questionId)){
      await deleteDoc(ref);
      userBookmarks.delete(questionId);
      btn?.classList.remove('bookmarked');
    }else{
      await setDoc(ref, {
        questionText,
        topic: `${currentPaper.name}`,
        timestamp: serverTimestamp(),
        linkToQuestion: `${window.location.pathname}?paperId=${currentPaper.id}&questionId=${questionId}`
      });
      userBookmarks.add(questionId);
      btn?.classList.add('bookmarked');
    }
  }catch(e){
    console.warn('Bookmark toggle failed:', e);
  }
}

// ---------------------
// Finish & Results
// ---------------------
async function finishExam(){
  clearInterval(quizInterval);
  showScreen('results-screen');
  let correct = 0, incorrect = 0; const incorrectQs = [];
  allQuestions.forEach((q,i)=>{
    if(userAnswers[i] !== undefined){
      if(userAnswers[i] === q.correctIndex) correct++; else { incorrect++; incorrectQs.push(q); }
    }
  });
  const unattempted = allQuestions.length - (correct + incorrect);
  const scorePercent = allQuestions.length>0 ? (correct/allQuestions.length*100) : 0;

  document.getElementById('final-score-percent').textContent = `${scorePercent.toFixed(1)}%`;
  document.getElementById('correct-count').textContent = correct;
  document.getElementById('incorrect-count').textContent = incorrect;
  document.getElementById('unattempted-count').textContent = unattempted;
  document.getElementById('time-taken').textContent = formatTime(elapsedSeconds);

  if(window.performanceChart instanceof Chart) window.performanceChart.destroy();
  window.performanceChart = new Chart(document.getElementById('performanceChart'),{
    type:'doughnut',
    data:{ labels:['Correct','Incorrect','Unattempted'], datasets:[{ data:[correct,incorrect,unattempted], backgroundColor:['#22c55e','#ef4444','#f59e0b'] }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  // Clear local session
  if (currentUser && currentPaper) {
    localStorage.removeItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`);
  }

  // Persist attempt + update aggregates only for Exam mode
  if(quizMode==='exam' && currentUser){
    await Promise.all([
      saveUserAttempt(scorePercent),
      updateAggregatesAndGetStats(scorePercent).then(({ average, percentile })=>{
        document.getElementById('average-score').textContent = `${average.toFixed(1)}%`;
        document.getElementById('percentile-rank').textContent = percentile.toFixed(1);
      })
    ]);
    await getAIInsights(incorrectQs);
  }else{
    document.getElementById('peer-comparison-content').innerHTML = '<p>Peer comparison is only available in Exam Mode.</p>';
    document.getElementById('ai-insights-card').innerHTML =
      `<div class="flex items-start gap-4"><div class="ai-avatar">🤖</div><div class="ai-message flex-grow"><p>AI Insights are only available for Exam Mode results.</p></div></div>`;
  }

  document.getElementById('back-to-topics-btn').addEventListener('click', ()=>{ showScreen('topic-screen'); handleDirectLink(currentUser); });
  document.getElementById('review-all-btn').addEventListener('click', ()=> setupReview('all'));
  document.getElementById('review-incorrect-btn').addEventListener('click', ()=> setupReview('incorrect'));
  document.getElementById('review-flagged-btn').addEventListener('click', ()=> setupReview('flagged'));
}

// Save one user's attempt under users/{uid}/attempts/{autoId}
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
  }catch(e){ console.error('saveUserAttempt failed:', e); }
}

// Update quizAggregates/{paperId} using running mean + histogram (no unbounded arrays)
async function updateAggregatesAndGetStats(scorePercent){
  const aggregatesRef = doc(db, 'quizAggregates', currentPaper.id);
  let out = { average: scorePercent, percentile: 100 };
  try{
    await runTransaction(db, async (tx)=>{
      const snap = await tx.get(aggregatesRef);
      const b = getBucketIndex(scorePercent);
      if(!snap.exists()){
        const hist = initHistogram(); hist[b] = 1;
        tx.set(aggregatesRef, { totalAttempts: 1, averageScore: scorePercent, histogram: hist });
        out = { average: scorePercent, percentile: 100 };
      }else{
        const data = snap.data();
        const total = (data.totalAttempts || 0);
        const prevAvg = data.averageScore || 0;
        const hist = Array.isArray(data.histogram) ? data.histogram.slice() : initHistogram();
        // Percentile BEFORE including current (how many prior < you)
        const lowerCount = hist.slice(0, b).reduce((s,v)=>s+v,0);
        const priorTotal = hist.reduce((s,v)=>s+v,0);
        const percentile = priorTotal>0 ? (lowerCount/priorTotal)*100 : 100;
        out.percentile = percentile;
        // Update running mean
        const newTotal = total + 1;
        const newAvg = ((prevAvg * total) + scorePercent) / newTotal;
        hist[b] = (hist[b]||0) + 1;
        tx.update(aggregatesRef, { totalAttempts: newTotal, averageScore: newAvg, histogram: hist });
        out.average = newAvg;
      }
    });
  }catch(e){ console.error('updateAggregatesAndGetStats failed:', e); }
  return out;
}

async function getAIInsights(incorrectQs){
  const insightsDiv = document.getElementById('ai-insights-content');
  insightsDiv.innerHTML = '<p>Generating personalized insights...</p>';
  if(!QUIZ_CONFIG.GOOGLE_AI_API_KEY){ insightsDiv.innerHTML = '<p>AI features are not enabled. Please add a Google AI API key.</p>'; return; }
  if(incorrectQs.length===0){ insightsDiv.innerHTML = '<p>Flawless victory! You answered all questions correctly. No areas for improvement found.</p>'; return; }

  try{
    const genAI = new GoogleGenerativeAI(QUIZ_CONFIG.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `A user answered these radiology exam questions incorrectly. Identify 2-3 core concepts they are struggling with and give concise, actionable study advice. Questions:\n${incorrectQs.map(q=>`- ${q.text}`).join('\n')}`;
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.();
    if(text){ insightsDiv.innerHTML = text.replace(/\n/g,'<br>').replace(/\*/g,''); }
    else{ insightsDiv.innerHTML = '<p>Could not retrieve AI insights at this time.</p>'; }
  }catch(err){
    console.error('AI Error:', err);
    insightsDiv.innerHTML = '<p>Could not retrieve AI insights at this time. Please check your API key and try again.</p>';
  }
}

// ---------------------
// Persistence & Timer
// ---------------------
function saveState(){
  if(!currentUser || !currentPaper || isReviewing) return;
  const state = { answers:userAnswers, index:currentQuestionIndex, elapsedSeconds, flags:[...flaggedQuestions] };
  localStorage.setItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`, JSON.stringify(state));
}

function formatTime(s){ const m=Math.floor(s/60), r=s%60; return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`; }

function startTimer(){
  clearInterval(quizInterval);
  const total = EXAM_DURATIONS[currentPaper.examType] || 0;
  if(quizMode==='exam' && total>0){
    let remaining = total - elapsedSeconds;
    if (dom.timerEl) dom.timerEl.textContent = formatTime(remaining);
    quizInterval = setInterval(()=>{
      if(remaining<=0){ clearInterval(quizInterval); showCustomAlert("Time's up! The exam has finished.", ()=>finishExam()); return; }
      remaining--; elapsedSeconds++; if (dom.timerEl) dom.timerEl.textContent = formatTime(remaining); saveState();
    }, 1000);
  }else{
    let start = Date.now() - (elapsedSeconds*1000);
    quizInterval = setInterval(()=>{
      elapsedSeconds = Math.floor((Date.now()-start)/1000);
      if (dom.timerEl) dom.timerEl.textContent = formatTime(elapsedSeconds);
      saveState();
    }, 1000);
  }
}

// ---------------------
// Review mode
// ---------------------
function setupReview(type){
  isReviewing = true;
  if(type==='all') reviewFilter = allQuestions.map((_,i)=>i);
  else if(type==='incorrect') reviewFilter = allQuestions.map((q,i)=>i).filter(i=> userAnswers[i]!==undefined && userAnswers[i]!==allQuestions[i].correctIndex);
  else if(type==='flagged') reviewFilter = allQuestions.map((q,i)=>i).filter(i=> flaggedQuestions.has(q.id));

  if(reviewFilter.length===0){
    showCustomAlert(`No ${type} questions to review.`, ()=>{ isReviewing=false; finishExam(); });
    return;
  }
  if (dom.finishQuizBtn) dom.finishQuizBtn.style.display='none';
  showScreen('quiz-screen');
  createQuestionNav();
  showQuestion(reviewFilter[0]);
}
