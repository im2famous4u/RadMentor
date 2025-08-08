import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, runTransaction, collection, getDocs, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai/+esm";

// --- CONFIGURATION (to be provided by the specific quiz HTML) ---
let QUIZ_CONFIG = {
    GOOGLE_AI_API_KEY: 'YOUR_API_KEY_HERE',
    ALL_QUIZ_DATA: {},
    PAPER_METADATA: [],
    FIREBASE_CONFIG: {}
};

// --- APP STATE & INITIALIZATION ---
let allQuestions = [], currentQuestionIndex = 0, currentUser = null;
let userBookmarks = new Set(), flaggedQuestions = new Set(), reviewFilter = [];
let currentPaper = null, quizMode = 'practice', quizInterval = null, elapsedSeconds = 0;
let userAnswers = {};
let isReviewing = false;
let isSoundOn = true;
let db, auth;

const dom = {
    screens: document.querySelectorAll('.screen'), paperCardGrid: document.getElementById('paper-card-grid'), quizTitle: document.getElementById('quiz-title'),
    loadingContainer: document.getElementById('loading-container'), questionsDisplay: document.getElementById('questions-display'), quizContent: document.getElementById('quiz-content'),
    paginationHeader: document.getElementById('quiz-pagination-header'), timerEl: document.getElementById('timer'), resultsScreen: document.getElementById('results-screen'),
    finishQuizBtn: document.getElementById('finish-quiz-btn'),
    soundToggleBtn: document.getElementById('sound-toggle-btn'), correctSound: document.getElementById('correct-sound'), wrongSound: document.getElementById('wrong-sound'),
    modeToggle: document.getElementById('mode-toggle-checkbox')
};

export function initQuizApp(config) {
    QUIZ_CONFIG = { ...QUIZ_CONFIG, ...config };

    const app = initializeApp(QUIZ_CONFIG.FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);

    onAuthStateChanged(auth, (user) => {
        const authCheckScreen = document.querySelector('#auth-check-screen, #authCheckScreen');
        currentUser = user;
        if (user) {
            if (authCheckScreen) authCheckScreen.style.display = 'none';
            handleDirectLink(user);
        } else {
            if (authCheckScreen) authCheckScreen.innerHTML = '<div class="selection-container"><p>You must be logged in to continue.</p></div>';
        }
    });

    dom.paperCardGrid.addEventListener('click', (e) => {
        if (e.target.matches('.selection-button, .paper-button')) {
            const { id, name, type } = e.target.dataset;
            currentPaper = { id, name, type };
            quizMode = 'practice';
            checkResumeAndStart();
        }
    });

    dom.modeToggle.addEventListener('change', () => {
        const newMode = dom.modeToggle.checked ? 'exam' : 'practice';
        if (confirm(`Switching to ${newMode} mode will restart your progress. Continue?`)) {
            setQuizMode(newMode);
        } else {
            dom.modeToggle.checked = !dom.modeToggle.checked;
        }
    });

    if(dom.soundToggleBtn) dom.soundToggleBtn.addEventListener('click', toggleSound);
    
    dom.finishQuizBtn.addEventListener('click', () => {
       if (confirm(`Are you sure you want to finish this ${quizMode} session?`)) {
           finishExam();
       }
    });
}

function showScreen(screenId) {
    dom.screens.forEach(s => s.classList.toggle('active', s.id === screenId || s.id === 'topic-screen' && screenId.startsWith('auth')));
    feather.replace();
}

function handleDirectLink(user) {
    const urlParams = new URLSearchParams(window.location.search);
    const directQuestionId = urlParams.get('questionId');
    if(user && directQuestionId) {
        const paperId = urlParams.get('paperId');
        const paper = QUIZ_CONFIG.PAPER_METADATA.find(p => p.id === paperId);
        if(paper) {
            currentPaper = paper;
            quizMode = 'practice';
            startQuiz(null, directQuestionId);
            return; 
        }
    }
    showScreen('topic-screen');
    dom.paperCardGrid.innerHTML = QUIZ_CONFIG.PAPER_METADATA.map(paper => 
        `<button class="paper-button" data-id="${paper.id}" data-name="${paper.name}" data-type="${paper.type}">${paper.name}</button>`
    ).join('');
}

function setQuizMode(newMode) {
    quizMode = newMode;
    localStorage.removeItem(`radmentor_quiz_${currentUser.uid}_${currentPaper.id}_${quizMode}`);
    startQuiz(null);
}

function checkResumeAndStart() {
    const savedState = localStorage.getItem(`radmentor_quiz_${currentUser.uid}_${currentPaper.id}_${quizMode}`);
    if (savedState) {
        if (confirm(`You have an unfinished ${quizMode} session. Resume?`)) {
            startQuiz(JSON.parse(savedState));
        } else {
            localStorage.removeItem(`radmentor_quiz_${currentUser.uid}_${currentPaper.id}_${quizMode}`);
            startQuiz(null);
        }
    } else {
        startQuiz(null);
    }
}

async function startQuiz(resumeState, directQuestionId = null) {
    isReviewing = false; reviewFilter = [];
    userAnswers = resumeState?.answers || {};
    currentQuestionIndex = resumeState?.index || 0;
    elapsedSeconds = resumeState?.elapsedSeconds || 0;
    flaggedQuestions = new Set(resumeState?.flags || []);
    
    showScreen('quiz-screen');
    dom.loadingContainer.style.display = 'block';
    dom.quizContent.style.display = 'none';
    
    if(dom.soundToggleBtn) initializeSound();
    await Promise.all([fetchQuizData(), fetchUserBookmarks()]);

    dom.modeToggle.checked = quizMode === 'exam';

    dom.loadingContainer.style.display = 'none';
    dom.quizContent.style.display = 'block';
    dom.quizTitle.textContent = `${currentPaper.name}`;
    dom.finishQuizBtn.textContent = 'Finish';
    dom.finishQuizBtn.style.display = 'block';
    createQuestionNav();

    if (directQuestionId) {
        const questionIndex = allQuestions.findIndex(q => q.id === directQuestionId);
        showQuestion(questionIndex >= 0 ? questionIndex : 0);
    } else {
        showQuestion(currentQuestionIndex);
    }
    startTimer();
}

async function fetchQuizData() {
    const paperData = QUIZ_CONFIG.ALL_QUIZ_DATA[currentPaper.id];
    const url = `https://docs.google.com/spreadsheets/d/${paperData.sheetId}/gviz/tq?tqx=out:csv&gid=${paperData.gid}`;
    try {
        const response = await fetch(url);
        const csvText = await response.text();
        allQuestions = parseCSVToQuestions(csvText, currentPaper.type);
    } catch (error) { console.error("Fetch Error:", error); }
}

function parseCSVToQuestions(csvText, quizType) {
    const lines = csvText.trim().split('\n').slice(1);
    
    switch (quizType) {
        case 'frcr-physics':
            return lines.map((line, index) => {
                const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
                if (parts.length < 16 || !parts[0]) return null;
                const question = { id: `${currentPaper.id}-${index}`, type: 'frcr-physics', question: parts[0], subsets: [] };
                for (let k = 0; k < 5; k++) {
                    const subQuestionText = parts[1 + k];
                    const answer = (parts[6 + (k * 2)] || '').toLowerCase().trim();
                    const explanation = parts[7 + (k * 2)];
                    if (subQuestionText && answer) {
                        question.subsets.push({ text: subQuestionText, correctAnswer: answer, explanation: explanation || "N/A" });
                    }
                }
                return question.subsets.length > 0 ? question : null;
            }).filter(Boolean);

        case 'frcr-2a':
        case 'mcq':
        default:
            return lines.map((line, index) => {
                const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
                const numOptions = (quizType === 'frcr-2a') ? 5 : 4;
                const options = parts.slice(1, 1 + numOptions).filter(Boolean);
                const correctAns = parts[1 + numOptions];
                const explanation = parts[2 + numOptions];
                const letterMap = {'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4};
                const correctIndex = letterMap[(correctAns || '').trim().toLowerCase()];

                if (parts[0] && correctIndex !== undefined && options.length > 0) {
                    return { id: `${currentPaper.id}-${index}`, text: parts[0], options, correctIndex, explanation: explanation || "N/A", type: quizType };
                }
                return null;
            }).filter(Boolean);
    }
}

async function fetchUserBookmarks() {
    if (!currentUser) return;
    const bookmarksRef = collection(db, "users", currentUser.uid, "bookmarks");
    const snapshot = await getDocs(bookmarksRef);
    userBookmarks = new Set(snapshot.docs.map(doc => doc.id));
}

function showQuestion(index) {
    if (reviewFilter.length > 0 && !reviewFilter.includes(index)) {
        index = reviewFilter.find(i => i >= index) || reviewFilter[0];
    }
    currentQuestionIndex = index;
    const q = allQuestions[index];
    if (!q) return;

    let questionHTML = '';
    switch (q.type) {
        case 'frcr-physics':
            questionHTML = renderFRCRPhysicsQuestion(q, index);
            break;
        default:
            questionHTML = renderMCQQuestion(q, index);
            break;
    }
    
    dom.questionsDisplay.innerHTML = questionHTML;
    attachQuestionListeners(q, index);
    updateQuestionNav();
    feather.replace();
}

function renderMCQQuestion(q, index) {
    const isBookmarked = userBookmarks.has(q.id);
    const isFlagged = flaggedQuestions.has(q.id);
    const isAnswered = userAnswers[index] !== undefined;
    let html = `<div class="question-title-bar">...</div> <p class="main-question-text">${q.text}</p>`;
    // ... (rest of your original MCQ rendering logic)
    return html;
}

function renderFRCRPhysicsQuestion(q, index) {
    const isBookmarked = userBookmarks.has(q.id);
    const isFlagged = flaggedQuestions.has(q.id);
    const isFullyAnswered = userAnswers[index] && Object.keys(userAnswers[index]).length === 5;
    const showExplanations = isReviewing || (quizMode === 'practice' && isFullyAnswered);

    let html = `...`; // (your original FRCR Physics rendering logic)
    return html;
}

function attachQuestionListeners(q, index) {
    // ... (logic to attach listeners for flag, bookmark, and answers)
}

function handleFRCRPhysicsAnswer(event, qIndex) {
    // ... (logic to handle T/F answers)
}

function handleOptionClick(e) {
    // ... (logic to handle MCQ answers)
}

function createQuestionNav() {
    // ... (logic to create pagination)
}

function allSubQuestionsCorrect(qIndex) {
    // ... (logic to check FRCR Physics answers)
}

function updateQuestionNav() {
    // ... (logic to update pagination styles)
}

function initializeSound() {
    // ... (logic for sound)
}

function toggleSound() {
    // ... (logic for sound)
}

function updateSoundIcon() {
    // ... (logic for sound)
}

function toggleFlag(id) {
    // ... (logic to toggle flag)
}

async function toggleBookmark(questionId, questionText) {
    // ... (logic to toggle bookmark)
}

async function finishExam() {
    // ... (logic to finish exam and show results)
}

async function saveTestResultAndGetStats(attempt) {
    // ... (logic to save stats)
}

async function getAIInsights(incorrectQs) {
    // ... (logic for AI insights)
}

function saveState() {
    // ... (logic to save progress)
}

function startTimer() {
    // ... (logic for timer)
}

function setupReview(filterType) {
    // ... (logic for review mode)
}
