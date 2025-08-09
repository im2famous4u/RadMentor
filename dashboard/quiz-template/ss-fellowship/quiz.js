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

const EXAM_DURATIONS = { "NEET SS": 10800, "INI SS": 5400, "Fellowship exam": 5400 };

// ---------------------
// STATE
// ---------------------
let db, auth, currentUser = null;
let allQuestions = [], currentPaper = null, quizMode = "practice", isReviewing = false;
let reviewFilter = [], userAnswers = {}, flaggedQuestions = new Set(), userBookmarks = new Set();
let elapsedSeconds = 0, quizInterval = null, isSoundOn = true, currentQuestionIndex = 0;
const paperCache = new Map();

// ---------------------
// DOM Cache (Updated for new layout)
// ---------------------
const dom = {
  screens: document.querySelectorAll('.screen'),
  authCheck: document.getElementById('authCheckScreen'),
  topicScreen: document.getElementById('topic-screen'),

  // View-specific containers
  yearwiseContent: document.getElementById('yearwise-content'),
  systemwiseContent: document.getElementById('systemwise-content'),
  yearwiseCardGrid: document.getElementById('yearwise-card-grid'),
  systemwiseCardGrid: document.getElementById('systemwise-card-grid'),

  // Controls
  yearBtn: document.getElementById('yearwise-btn'),
  systemBtn: document.getElementById('systemwise-btn'),
  systemTabs: document.getElementById('system-tabs'),

  // Quiz Screen elements
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

  // Results Screen elements
  resultsScreen: document.getElementById('results-screen'),

  // Modal elements
  modalBackdrop: document.getElementById('custom-modal-backdrop'),
  modalMessage: document.getElementById('modal-message'),
  modalButtons: document.getElementById('modal-buttons'),
};

// ---------------------
// UTILS & MODAL
// ---------------------
const byId = (id) => document.getElementById(id);
const safeFeather = () => { try { if (window.feather) feather.replace(); } catch (e) { console.warn("Feather icons not available.") } };
const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const normalize = (t) => (t || '').replace(/\s+/g, ' ').trim();
const toChip = (txt) => txt ? `<span class="exam-hash">#${txt.replace(/\s+/g,'')}</span>` : "";

function showCustomModal(message, buttons) {
  if (!dom.modalBackdrop) return alert(message);
  dom.modalMessage.textContent = message;
  dom.modalButtons.innerHTML = '';
  (buttons || [{ text: 'OK', isPrimary: true }]).forEach(b => {
    const el = document.createElement('button');
    el.textContent = b.text;
    el.className = `results-btn ${b.isPrimary ? 'primary' : 'secondary'}`;
    el.onclick = () => { dom.modalBackdrop.style.display = 'none'; b.onClick?.(); };
    dom.modalButtons.appendChild(el);
  });
  dom.modalBackdrop.style.display = 'flex';
}
const showCustomAlert  = (m, ok=()=>{}) => showCustomModal(m, [{ text:'OK', isPrimary:true, onClick: ok }]);
const showCustomConfirm = (m, ok, cancel=()=>{}) => showCustomModal(m, [{ text:'Yes', isPrimary:true, onClick: ok }, { text:'No', onClick: cancel }]);


// ---------------------
// INIT
// ---------------------
export function initQuizApp(config) {
  QUIZ_CONFIG = { ...QUIZ_CONFIG, ...config };
  const app = initializeApp(QUIZ_CONFIG.FIREBASE_CONFIG);
  db = getFirestore(app);
  auth = getAuth(app);

  dom.yearBtn?.addEventListener('click', () => setView('year'));
  dom.systemBtn?.addEventListener('click', () => setView('system'));
  dom.modeToggle?.addEventListener('change', () => {
    const newMode = dom.modeToggle.checked ? 'exam' : 'practice';
    showCustomConfirm(`Switching to ${newMode} mode will clear your current session. Continue?`,
      () => setQuizMode(newMode),
      () => dom.modeToggle.checked = !dom.modeToggle.checked
    );
  });
  dom.soundToggleBtn?.addEventListener('click', toggleSound);
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
      if (dom.authCheck) dom.authCheck.innerHTML = `<div class="topic-container"><p>You must be logged in to continue.</p></div>`;
    }
  });
}

// ---------------------
// TOPIC VIEW
// ---------------------
let currentView = 'year';

function setView(v) {
  currentView = v;
  dom.yearBtn?.classList.toggle('active', v === 'year');
  dom.systemBtn?.classList.toggle('active', v === 'system');
  dom.yearwiseContent?.classList.toggle('hidden', v !== 'year');
  dom.systemwiseContent?.classList.toggle('hidden', v !== 'system');
  
  if (v === 'year') {
    renderYearWise();
  } else {
    renderSystemWise();
  }
}

async function handleDirectLinkOrShowTopics() {
  const params = new URLSearchParams(window.location.search);
  const directQuestionId = params.get('questionId');
  if (currentUser && directQuestionId) {
    const paperId = params.get('paperId');
    const paper = QUIZ_CONFIG.PAPER_METADATA.find(p => p.id === paperId);
    if (paper) {
      currentPaper = paper;
      quizMode = 'practice';
      await startQuiz(null, directQuestionId);
      return;
    }
  }
  showScreen('topic-screen');
  setView('year');
}

function createTopicCardHTML(config) {
  return `
    <a href="#" class="topic-card" ${config.dataAttrs}>
      <div class="topic-card-content">
        <div>
          <p>${config.subtitle}</p>
          <h3>${config.title}</h3>
        </div>
        <i data-feather="arrow-right" class="w-6 h-6 text-slate-400"></i>
      </div>
    </a>
  `;
}

function renderYearWise() {
  if (!dom.yearwiseCardGrid) return;
  const cardsHTML = QUIZ_CONFIG.PAPER_METADATA.map(p => createTopicCardHTML({
    title: p.name,
    subtitle: p.examType,
    dataAttrs: `data-id="${p.id}" data-name="${p.name}" data-examtype="${p.examType}"`
  })).join('');

  dom.yearwiseCardGrid.innerHTML = cardsHTML;
  dom.yearwiseCardGrid.querySelectorAll('.topic-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      currentPaper = { ...btn.dataset };
      checkResumeAndStart();
    });
  });
  safeFeather();
}

async function renderSystemWise() {
  if (!dom.systemTabs || !dom.systemwiseCardGrid) return;
  dom.systemwiseCardGrid.innerHTML = `<p class="text-center text-slate-500 col-span-full">Analyzing question banks, please wait...</p>`;
  await ensureAllPapersCached();
  const allTags = uniqueTagsFromCache();

  if (!allTags.length) {
    dom.systemwiseCardGrid.innerHTML = `<p class="text-center text-slate-500 col-span-full">No system tags found. Check Column J in your sheets.</p>`;
    return;
  }

  dom.systemTabs.innerHTML = allTags.map(tag => `<button class="system-tab" data-system="${tag}">${tag}</button>`).join('');
  dom.systemwiseCardGrid.innerHTML = `<div class="text-center p-8 bg-slate-50 rounded-lg border border-slate-200 col-span-full"><h3 class="font-bold text-slate-800">Select a system above to begin.</h3><p class="text-slate-500 mt-1">We'll pull questions across all years for that system.</p></div>`;
  
  dom.systemTabs.querySelectorAll('.system-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      dom.systemTabs.querySelectorAll('.system-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const systemName = btn.dataset.system;
      currentPaper = {
        id: `system-${systemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: `${systemName} - All Years`,
        examType: QUIZ_CONFIG.title || 'Practice',
        _system: systemName
      };
      quizMode = 'practice';
      await startQuiz(null);
    });
  });
}

async function ensureAllPapersCached() {
  const promises = Object.entries(QUIZ_CONFIG.ALL_QUIZ_DATA).map(async ([paperId, { sheetId, gid }]) => {
    if (paperCache.has(paperId)) return;
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
      const response = await fetch(url);
      if (!response.ok) return;
      const csv = await response.text();
      paperCache.set(paperId, parseCSVToQuestions(csv, paperId));
    } catch (error) {
      console.error(`Failed to fetch or parse paper: ${paperId}`, error);
    }
  });
  await Promise.all(promises);
}

function uniqueTagsFromCache() {
  const tagSet = new Set();
  for (const questions of paperCache.values()) {
    for (const q of questions) {
      (q.tagsNormalized || []).forEach(tag => tagSet.add(tag));
    }
  }
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

// ---------------------
// QUIZ FLOW & DATA PARSING
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

    if (!allQuestions.length) throw new Error('No questions found for this selection.');

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
  if (currentPaper._system) {
    await ensureAllPapersCached();
    const pool = Array.from(paperCache.values()).flat();
    const target = normalize(currentPaper._system);
    allQuestions = pool.filter(q => (q.tagsNormalized || []).includes(target));
    allQuestions = allQuestions.map((q, i) => ({ ...q, id: `${currentPaper.id}-${i}` }));
    return;
  }

  const cfg = QUIZ_CONFIG.ALL_QUIZ_DATA[currentPaper.id];
  if (!cfg?.sheetId || !cfg?.gid) throw new Error('Missing sheet configuration.');
  if (paperCache.has(currentPaper.id)) {
    allQuestions = paperCache.get(currentPaper.id).map((q, i) => ({ ...q, id: `${currentPaper.id}-${i}` }));
    return;
  }
  const url = `https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?tqx=out:csv&gid=${cfg.gid}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Sheet fetch failed (${r.status}).`);
  const csv = await r.text();
  const parsed = parseCSVToQuestions(csv, currentPaper.id);
  paperCache.set(currentPaper.id, parsed);
  allQuestions = parsed.map((q, i) => ({ ...q, id: `${currentPaper.id}-${i}` }));
}

function parseCSVToQuestions(csvText, paperId) {
  return csvText.trim().split('\n').slice(1).map((line, idx) => {
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
    const [question, a, b, c, d, correctAns, explanation, image, imageForExplTag, tag, subtag, exam] = parts;

    const options = [a, b, c, d].filter(Boolean);
    const correctIndex = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 }[normalize(correctAns).toLowerCase()];

    if (question && correctIndex !== undefined && options.length > 0) {
      const tagsNormalized = (tag || '').split(',').map(normalize).filter(Boolean);
      return {
        id: `${paperId || 'paper'}-${idx}`,
        text: question, options, correctIndex,
        explanation: explanation || 'N/A',
        image, imageForExplTag, tag: tag || '',
        tagsNormalized,
        subtag: normalize(subtag),
        exam: normalize(exam)
      };
    }
    return null;
  }).filter(Boolean);
}

// ---------------------
// RENDER QUESTION & NAV
// ---------------------
function createQuestionNav() {
  dom.paginationHeader.innerHTML = allQuestions.map((_, i) => `<div class="page-box" data-index="${i}">${i + 1}</div>`).join('');
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
      const isCorrect = userAnswers[i] === allQuestions[i].correctIndex;
      if (quizMode === 'practice' || isReviewing) {
        box.classList.add(isCorrect ? 'answered-correct' : 'answered-incorrect');
      } else {
        box.classList.add('answered');
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
  const isFlagged = flaggedQuestions.has(q.id);
  const isAnswered = userAnswers[index] !== undefined;
  const firstTag = q.tagsNormalized?.[0] || "";
  const chips = [toChip(q.exam), toChip(firstTag)].join('');

  dom.questionsDisplay.innerHTML = `
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
    ${((quizMode === 'practice' && isAnswered) || isReviewing) ? `<div class="explanation-box"><h4>Explanation</h4><p>${q.explanation}</p></div>` : ''}
  `;
  
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
  const isCorrect = selectedIndex === allQuestions[currentQuestionIndex].correctIndex;

  if (quizMode === 'practice') {
    if (isSoundOn) (isCorrect ? dom.correctSound : dom.wrongSound).play();
  }
  showQuestion(currentQuestionIndex);
  saveState();
}

// ---------------------
// SOUND, FLAGS, BOOKMARKS, TIMER
// ---------------------
function initializeSound() { const s=localStorage.getItem('radmentor_sound_pref'); isSoundOn=s!=='off'; updateSoundIcon(); }
function toggleSound() { isSoundOn=!isSoundOn; localStorage.setItem('radmentor_sound_pref',isSoundOn?'on':'off'); updateSoundIcon(); }
function updateSoundIcon() { dom.soundToggleBtn.innerHTML=`<i data-feather="${isSoundOn?'volume-2':'volume-x'}"></i>`; safeFeather(); }
function toggleFlag(id) { flaggedQuestions.has(id)?flaggedQuestions.delete(id):flaggedQuestions.add(id); showQuestion(currentQuestionIndex); saveState(); }
async function toggleBookmark(qid, qtext) {
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid, 'bookmarks', qid);
  try {
    if (userBookmarks.has(qid)) {
      await deleteDoc(ref);
      userBookmarks.delete(qid);
    } else {
      await setDoc(ref, { questionText: qtext, topic: currentPaper.name, timestamp: serverTimestamp(), linkToQuestion: `${window.location.pathname}?paperId=${currentPaper.id}&questionId=${qid}` });
      userBookmarks.add(qid);
    }
  } catch(e) { console.warn('bookmark failed', e); }
  showQuestion(currentQuestionIndex);
}
async function fetchUserBookmarks() {
  if (!currentUser) { userBookmarks = new Set(); return; }
  try {
    const snap = await getDocs(collection(db, 'users', currentUser.uid, 'bookmarks'));
    userBookmarks = new Set(snap.docs.map(d => d.id));
  } catch(e) { console.warn('bookmarks read failed', e); userBookmarks = new Set(); }
}
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
      if (--remaining <= 0) {
        clearInterval(quizInterval);
        showCustomAlert("Time's up! The exam has finished.", () => finishExam());
        return;
      }
      elapsedSeconds++;
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
// RESULTS & REVIEW
// ---------------------
const HISTOGRAM_CONFIG = {
  type: 'doughnut',
  options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
  data: {
    labels: ['Correct', 'Incorrect', 'Unattempted'],
    datasets: [{ data: [0, 0, 0], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'] }]
  }
};

async function finishExam() {
  clearInterval(quizInterval);
  showScreen('results-screen');

  let correct = 0, incorrect = 0;
  const incorrectQs = [];
  allQuestions.forEach((q, i) => {
    if (userAnswers[i] !== undefined) {
      if (userAnswers[i] === q.correctIndex) {
        correct++;
      } else {
        incorrect++;
        incorrectQs.push(q);
      }
    }
  });

  const unattempted = allQuestions.length - (correct + incorrect);
  const pct = allQuestions.length > 0 ? (correct / allQuestions.length) * 100 : 0;

  byId('final-score-percent').textContent = `${pct.toFixed(1)}%`;
  byId('correct-count').textContent = correct;
  byId('incorrect-count').textContent = incorrect;
  byId('unattempted-count').textContent = unattempted;
  byId('time-taken').textContent = formatTime(elapsedSeconds);

  if (window.performanceChart instanceof Chart) {
    window.performanceChart.destroy();
  }
  const chartConfig = JSON.parse(JSON.stringify(HISTOGRAM_CONFIG));
  chartConfig.data.datasets[0].data = [correct, incorrect, unattempted];
  window.performanceChart = new Chart(byId('performanceChart'), chartConfig);

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
    byId('ai-insights-card').innerHTML = `<div class="flex items-start gap-4"><div class="ai-avatar">🤖</div><div class="ai-message flex-grow"><p>AI Insights are only available for Exam Mode results.</p></div></div>`;
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
  } catch (e) {
    console.error('saveUserAttempt failed', e);
  }
}

async function updateAggregatesAndGetStats(scorePercent) {
    const HISTOGRAM_BUCKETS = 10;
    const getBucketIndex = (pct) => Math.min(HISTOGRAM_BUCKETS - 1, Math.max(0, Math.floor(pct / (100 / HISTOGRAM_BUCKETS))));
    const initHistogram = () => Array.from({ length: HISTOGRAM_BUCKETS }, () => 0);

    const aggregateRef = doc(db, 'quizAggregates', currentPaper.id);
    let output = { average: scorePercent, percentile: 100 };
    try {
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(aggregateRef);
            const bucketIndex = getBucketIndex(scorePercent);

            if (!snap.exists()) {
                const newHistogram = initHistogram();
                newHistogram[bucketIndex] = 1;
                transaction.set(aggregateRef, { totalAttempts: 1, averageScore: scorePercent, histogram: newHistogram });
                output = { average: scorePercent, percentile: 100 };
            } else {
                const data = snap.data();
                const histogram = Array.isArray(data.histogram) && data.histogram.length === HISTOGRAM_BUCKETS ? data.histogram : initHistogram();
                
                const priorTotal = histogram.reduce((sum, val) => sum + val, 0);
                const lowerCount = histogram.slice(0, bucketIndex).reduce((sum, val) => sum + val, 0);
                output.percentile = priorTotal > 0 ? (lowerCount / priorTotal) * 100 : 100;

                const newTotalAttempts = (data.totalAttempts || 0) + 1;
                const newAverageScore = (((data.averageScore || 0) * (data.totalAttempts || 0)) + scorePercent) / newTotalAttempts;
                
                histogram[bucketIndex] = (histogram[bucketIndex] || 0) + 1;

                transaction.update(aggregateRef, { totalAttempts: newTotalAttempts, averageScore: newAverageScore, histogram: histogram });
                output.average = newAverageScore;
            }
        });
    } catch (e) {
        console.error('updateAggregates failed', e);
    }
    return output;
}

async function getAIInsights(incorrectQs) {
  const div = byId('ai-insights-content');
  div.innerHTML = '<p>Generating personalized insights...</p>';
  if (!QUIZ_CONFIG.GOOGLE_AI_API_KEY) {
    div.innerHTML = '<p>AI features are not enabled.</p>';
    return;
  }
  if (!incorrectQs.length) {
    div.innerHTML = '<p>Flawless victory! No areas for improvement.</p>';
    return;
  }
  try {
    const genAI = new GoogleGenerativeAI(QUIZ_CONFIG.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `A user answered these radiology exam questions incorrectly. Identify 2-3 core concepts they are struggling with and give concise, actionable study advice.\nQuestions:\n${incorrectQs.map(q => `- ${q.text}`).join('\n')}`;
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.();
    div.innerHTML = text ? text.replace(/\n/g, '<br>').replace(/\*/g, '') : '<p>Could not retrieve AI insights at this time.</p>';
  } catch (e) {
    console.error('AI error', e);
    div.innerHTML = '<p>Could not retrieve AI insights at this time.</p>';
  }
}

function setupReview(type) {
  isReviewing = true;
  if (type === 'all') {
    reviewFilter = allQuestions.map((_, i) => i);
  } else if (type === 'incorrect') {
    reviewFilter = allQuestions.map((q, i) => i).filter(i => userAnswers[i] !== undefined && userAnswers[i] !== allQuestions[i].correctIndex);
  } else if (type === 'flagged') {
    reviewFilter = allQuestions.map((q, i) => i).filter(i => flaggedQuestions.has(allQuestions[i].id));
  }

  if (!reviewFilter.length) {
    showCustomAlert(`No ${type} questions to review.`, () => { isReviewing = false; finishExam(); });
    return;
  }
  
  dom.finishQuizBtn.style.display = 'none';
  showScreen('quiz-screen');
  createQuestionNav();
  showQuestion(reviewFilter[0]);
}
