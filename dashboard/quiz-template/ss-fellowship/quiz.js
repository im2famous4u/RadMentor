import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, runTransaction, collection, getDocs, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Import the generative AI SDK from Google
import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai/+esm";

// --- CONFIGURATION (to be provided by the specific quiz HTML) ---
let QUIZ_CONFIG = {
    GOOGLE_AI_API_KEY: 'AIzaSyDi7D6W2xjtReXVFkpSSXG_xTJBqRGswxs', // To be filled in by the user
    ALL_QUIZ_DATA: {},
    PAPER_METADATA: [],
    FIREBASE_CONFIG: {}
};

// Map exam types to their duration in seconds
const EXAM_DURATIONS = {
    'NEET SS': 3 * 60 * 60,
    'INI SS': 1.5 * 60 * 60,
    'Fellowship exam': 1.5 * 60 * 60
};

// --- APP STATE & INITIALIZATION ---
let allQuestions = [], currentQuestionIndex = 0, currentUser = null;
let userBookmarks = new Set(), flaggedQuestions = new Set();
let reviewFilter = [];
let currentPaper = null, quizMode = 'practice', quizInterval = null, elapsedSeconds = 0;
let userAnswers = {};
let isReviewing = false;
let isSoundOn = true;
let db, auth;

// DOM elements cached for easy access
const dom = {
    screens: document.querySelectorAll('.screen'), paperCardGrid: document.getElementById('paper-card-grid'), quizTitle: document.getElementById('quiz-title'),
    loadingContainer: document.getElementById('loading-container'), questionsDisplay: document.getElementById('questions-display'), quizContent: document.getElementById('quiz-content'),
    paginationHeader: document.getElementById('quiz-pagination-header'), timerEl: document.getElementById('timer'), resultsScreen: document.getElementById('results-screen'),
    finishQuizBtn: document.getElementById('finish-quiz-btn'),
    soundToggleBtn: document.getElementById('sound-toggle-btn'), correctSound: document.getElementById('correct-sound'), wrongSound: document.getElementById('wrong-sound'),
    modeToggle: document.getElementById('mode-toggle-checkbox'),
    modalBackdrop: document.getElementById('custom-modal-backdrop'),
    modalMessage: document.getElementById('modal-message'),
    modalButtons: document.getElementById('modal-buttons'),
    loadingMessage: document.getElementById('loading-message'),
    modeLabelQuiz: document.querySelector('.mode-label:first-of-type'),
    modeLabelExam: document.querySelector('.mode-label:last-of-type')
};

// --- Custom Modal Functions to replace alert() and confirm() ---
function showCustomModal(message, buttons) {
    dom.modalMessage.textContent = message;
    dom.modalButtons.innerHTML = '';
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.className = 'results-btn ' + (btn.isPrimary ? 'primary' : 'secondary');
        button.onclick = () => {
            dom.modalBackdrop.style.display = 'none';
            btn.onClick();
        };
        dom.modalButtons.appendChild(button);
    });
    dom.modalBackdrop.style.display = 'flex';
}

function showCustomConfirm(message, onConfirm, onCancel) {
    showCustomModal(message, [
        { text: 'Yes', isPrimary: true, onClick: onConfirm },
        { text: 'No', isPrimary: false, onClick: onCancel }
    ]);
}

function showCustomAlert(message, onOk) {
    showCustomModal(message, [
        { text: 'OK', isPrimary: true, onClick: onOk }
    ]);
}

/**
 * The main entry point for initializing the quiz application.
 * This function is exported and called from specific quiz HTML files.
 * @param {object} config - The configuration object for the quiz.
 */
export function initQuizApp(config) {
    QUIZ_CONFIG = { ...QUIZ_CONFIG, ...config };

    const app = initializeApp(QUIZ_CONFIG.FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);

    onAuthStateChanged(auth, (user) => {
        const authCheckScreen = document.getElementById('authCheckScreen');
        currentUser = user;
        if (user) {
            if (authCheckScreen) authCheckScreen.style.display = 'none';
            handleDirectLink(user);
        } else {
            if (authCheckScreen) authCheckScreen.innerHTML = '<div class="selection-container"><p>You must be logged in to continue.</p></div>';
        }
    });

    dom.paperCardGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.paper-button');
        if (button) {
            const { id, name, examtype } = button.dataset;
            currentPaper = { id, name, examType: examtype };
            quizMode = 'practice';
            checkResumeAndStart();
        }
    });

    dom.modeToggle.addEventListener('change', () => {
        const newMode = dom.modeToggle.checked ? 'exam' : 'practice';
        showCustomConfirm(`Switching to ${newMode} mode will clear your current session. Continue?`,
            () => setQuizMode(newMode),
            () => dom.modeToggle.checked = !dom.modeToggle.checked
        );
    });

    dom.soundToggleBtn.addEventListener('click', toggleSound);
    
    dom.finishQuizBtn.addEventListener('click', () => {
        if (quizMode === 'exam') {
            showCustomConfirm('Are you sure you want to finish the exam?', () => finishExam(), () => {});
        } else {
            showCustomConfirm('Are you sure you want to finish this practice session?', () => finishExam(), () => {});
        }
    });
}

// --- CORE QUIZ LOGIC FUNCTIONS ---

function showScreen(screenId) {
    dom.screens.forEach(s => s.classList.toggle('active', s.id === screenId));
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
        `<button class="paper-button" data-id="${paper.id}" data-name="${paper.name}" data-examtype="${paper.examType}">
            <p>${paper.name}</p>
            <p class="text-sm font-normal text-gray-500">${paper.examType}</p>
        </button>`).join('');
}

function setQuizMode(newMode) {
    quizMode = newMode;
    localStorage.removeItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`);
    startQuiz(null);
}

function checkResumeAndStart() {
    const savedState = localStorage.getItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`);
    if (savedState) {
        showCustomConfirm(`You have an unfinished ${quizMode} session. Resume?`,
            () => startQuiz(JSON.parse(savedState)),
            () => {
                localStorage.removeItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`);
                startQuiz(null);
            }
        );
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

    initializeSound();
    
    updateLoadingMessage(`Finding data for paper: ${currentPaper.name}...`);
    await fetchQuizData();
    updateLoadingMessage('Fetching your bookmarks...');
    await fetchUserBookmarks();
    updateLoadingMessage('Session ready! Starting quiz...');

    dom.modeToggle.checked = quizMode === 'exam';
    dom.modeLabelExam.classList.toggle('text-gray-800', quizMode === 'exam');
    dom.modeLabelQuiz.classList.toggle('text-gray-800', quizMode !== 'exam');

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

function updateLoadingMessage(message) {
    dom.loadingMessage.textContent = message;
}

async function fetchQuizData() {
    const paperData = QUIZ_CONFIG.ALL_QUIZ_DATA[currentPaper.id];
    const url = `https://docs.google.com/spreadsheets/d/${paperData.sheetId}/gviz/tq?tqx=out:csv&gid=${paperData.gid}`;
    try {
        const response = await fetch(url);
        const csvText = await response.text();
        allQuestions = parseCSVToQuestions(csvText);
    } catch (error) { 
        console.error("Fetch Error:", error); 
        showCustomAlert('Error loading quiz data. Please try again.', () => showScreen('topic-screen'));
    }
}

function parseCSVToQuestions(csvText) {
    const lines = csvText.trim().split('\n').slice(1);
    return lines.map((line, index) => {
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
        const [question, a, b, c, d, correctAns, explanation, image, imageForExplTag, subtag, exam] = parts;
        const options = [a, b, c, d].filter(Boolean);
        const letterMap = {'a': 0, 'b': 1, 'c': 2, 'd': 3};
        const correctIndex = letterMap[(correctAns || '').trim().toLowerCase()];
        if (question && correctIndex !== undefined && options.length > 0) {
            return {
                id: `${currentPaper.id}-${index}`,
                text: question,
                options,
                correctIndex,
                explanation: explanation || "N/A",
                image: image,
                imageForExplTag: imageForExplTag,
                subtag: subtag,
                exam: exam
            };
        }
        return null;
    }).filter(Boolean);
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

    const isBookmarked = userBookmarks.has(q.id);
    const isFlagged = flaggedQuestions.has(q.id);
    const isAnswered = userAnswers[index] !== undefined;

    let questionHTML = `
        <div class="question-title-bar">
            <span class="question-number">Question ${index + 1} of ${allQuestions.length}</span>
            <div class="question-controls">
                <button class="icon-btn flag-btn ${isFlagged ? 'flagged' : ''}" ${isReviewing ? 'disabled' : ''}><i data-feather="flag"></i></button>
                <button class="icon-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" ${isReviewing ? 'disabled' : ''}><i data-feather="bookmark"></i></button>
            </div>
        </div>
        <p class="main-question-text">${q.text}</p>
        <div>${q.options.map((option, i) => {
            const shouldDisable = isReviewing || (quizMode === 'practice' && isAnswered);
            let btnClass = 'option-btn';
            if (quizMode === 'exam' && i === userAnswers[index]) {
                btnClass += ' selected';
            }
            if (shouldDisable && i === q.correctIndex) btnClass += ' correct';
            else if (shouldDisable && i === userAnswers[index]) btnClass += ' incorrect';
            
            return `<button class="${btnClass}" data-index="${i}" ${shouldDisable ? 'disabled' : ''}>${option}</button>`;
        }).join('')}</div>`;
    
    if ((quizMode === 'practice' && isAnswered) || isReviewing) {
        questionHTML += `<div class="explanation-box"><h4>Explanation</h4><p>${q.explanation}</p></div>`;
    }

    dom.questionsDisplay.innerHTML = questionHTML;

    const flagBtn = dom.questionsDisplay.querySelector('.flag-btn');
    if (flagBtn) flagBtn.addEventListener('click', () => toggleFlag(q.id));

    const bookmarkBtn = dom.questionsDisplay.querySelector('.bookmark-btn');
    if (bookmarkBtn) bookmarkBtn.addEventListener('click', () => toggleBookmark(q.id, q.text));

    if (!isReviewing && !(quizMode === 'practice' && isAnswered)) {
        dom.questionsDisplay.querySelectorAll('.option-btn').forEach(btn => btn.addEventListener('click', handleOptionClick));
    }
    updateQuestionNav();
    feather.replace();
}

function handleOptionClick(e) {
    const selectedIndex = parseInt(e.target.dataset.index);
    userAnswers[currentQuestionIndex] = selectedIndex;
    const q = allQuestions[currentQuestionIndex];
    const isCorrect = selectedIndex === q.correctIndex;

    if (quizMode === 'practice') {
        if(isSoundOn) (isCorrect ? dom.correctSound : dom.wrongSound).play();
        showQuestion(currentQuestionIndex);
    } else {
        showQuestion(currentQuestionIndex);
    }
    saveState();
}

function createQuestionNav() {
    dom.paginationHeader.innerHTML = allQuestions.map((_, i) => `<div class="page-box" data-index="${i}">${i + 1}</div>`).join('');
    dom.paginationHeader.querySelectorAll('.page-box').forEach(box => box.addEventListener('click', () => showQuestion(parseInt(box.dataset.index))));
}

function updateQuestionNav() {
    dom.paginationHeader.querySelectorAll('.page-box').forEach(box => {
        const index = parseInt(box.dataset.index);
        box.className = 'page-box';
        if (index === currentQuestionIndex) box.classList.add('active');
        if (userAnswers[index] !== undefined) {
            if (quizMode === 'practice' || isReviewing) {
                const isCorrect = userAnswers[index] === allQuestions[index].correctIndex;
                box.classList.add(isCorrect ? 'answered-correct' : 'answered-incorrect');
            } else {
                box.classList.add('answered-correct');
                box.style.backgroundColor = 'var(--primary-color)';
                box.style.borderColor = 'var(--primary-color)';
                box.style.color = 'white';
            }
        }
        if (flaggedQuestions.has(allQuestions[index].id)) box.classList.add('flagged');
    });
    const activeBox = dom.paginationHeader.querySelector('.page-box.active');
    if(activeBox) activeBox.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function initializeSound() {
    const savedSoundPref = localStorage.getItem('radmentor_sound_pref');
    isSoundOn = savedSoundPref !== 'off';
    updateSoundIcon();
}

function toggleSound() {
    isSoundOn = !isSoundOn;
    localStorage.setItem('radmentor_sound_pref', isSoundOn ? 'on' : 'off');
    updateSoundIcon();
}

function updateSoundIcon() {
    const iconName = isSoundOn ? 'volume-2' : 'volume-x';
    dom.soundToggleBtn.innerHTML = `<i data-feather="${iconName}"></i>`;
    feather.replace();
}

function toggleFlag(id) {
    flaggedQuestions.has(id) ? flaggedQuestions.delete(id) : flaggedQuestions.add(id);
    document.querySelector(`.flag-btn`).classList.toggle('flagged', flaggedQuestions.has(id));
    updateQuestionNav();
    saveState();
}

async function toggleBookmark(questionId, questionText) {
    if (!currentUser) return;
    const bookmarkRef = doc(db, "users", currentUser.uid, "bookmarks", questionId);
    const button = dom.questionsDisplay.querySelector('.bookmark-btn');
    
    if (userBookmarks.has(questionId)) {
        await deleteDoc(bookmarkRef);
        userBookmarks.delete(questionId);
        button.classList.remove('bookmarked');
    } else {
        await setDoc(bookmarkRef, { questionText, topic: `${currentPaper.name}`, timestamp: serverTimestamp(), linkToQuestion: `${window.location.pathname}?paperId=${currentPaper.id}&questionId=${questionId}` });
        userBookmarks.add(questionId);
        button.classList.add('bookmarked');
    }
}

async function finishExam() {
    clearInterval(quizInterval);
    showScreen('results-screen');
    let correctCount = 0, incorrectCount = 0;
    const incorrectQuestions = [];

    allQuestions.forEach((q, i) => {
        if (userAnswers[i] !== undefined) {
            if(userAnswers[i] === q.correctIndex) correctCount++; else {
                incorrectCount++;
                incorrectQuestions.push(q);
            }
        }
    });

    const unattemptedCount = allQuestions.length - (correctCount + incorrectCount);
    const scorePercent = allQuestions.length > 0 ? (correctCount / allQuestions.length * 100) : 0;
    
    document.getElementById('final-score-percent').textContent = `${scorePercent.toFixed(1)}%`;
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('incorrect-count').textContent = incorrectCount;
    document.getElementById('unattempted-count').textContent = unattemptedCount;
    document.getElementById('time-taken').textContent = formatTime(elapsedSeconds);

    if(window.performanceChart instanceof Chart) window.performanceChart.destroy();
    window.performanceChart = new Chart(document.getElementById('performanceChart'), { 
        type: 'doughnut',
        data: {
            labels: ['Correct', 'Incorrect', 'Unattempted'],
            datasets: [{
                data: [correctCount, incorrectCount, unattemptedCount],
                backgroundColor: ['#22c55e', '#ef4444', '#f59e0b']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    localStorage.removeItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`);
    
    if (quizMode === 'exam') {
        const attemptData = { score: correctCount, total: allQuestions.length };
        const { average, percentile } = await saveTestResultAndGetStats(attemptData);
        document.getElementById('average-score').textContent = `${average.toFixed(1)}%`;
        document.getElementById('percentile-rank').textContent = percentile.toFixed(1);
        await getAIInsights(incorrectQuestions);
    } else {
        document.getElementById('peer-comparison-content').innerHTML = '<p>Peer comparison is only available in Exam Mode.</p>';
        document.getElementById('ai-insights-card').innerHTML = `<div class="flex items-start gap-4"><div class="ai-avatar">🤖</div><div class="ai-message flex-grow"><p>AI Insights are only available for Exam Mode results.</p></div></div>`;
    }

    document.getElementById('back-to-topics-btn').addEventListener('click', () => { showScreen('topic-screen'); handleDirectLink(currentUser); });
    document.getElementById('review-all-btn').addEventListener('click', () => setupReview('all'));
    document.getElementById('review-incorrect-btn').addEventListener('click', () => setupReview('incorrect'));
    document.getElementById('review-flagged-btn').addEventListener('click', () => setupReview('flagged'));
}

async function saveTestResultAndGetStats(attempt) {
    const aggregatesRef = doc(db, "quizAggregates", currentPaper.id);
    let finalStats = { average: 0, percentile: 0 };
    try {
        await runTransaction(db, async (transaction) => {
            const aggDoc = await transaction.get(aggregatesRef);
            const scorePercent = allQuestions.length > 0 ? (attempt.score / allQuestions.length) * 100 : 0;
            if (!aggDoc.exists()) {
                transaction.set(aggregatesRef, { totalAttempts: 1, averageScore: scorePercent, scores: [scorePercent] });
                finalStats = { average: scorePercent, percentile: 100 };
            } else {
                const data = aggDoc.data();
                const scores = data.scores || [];
                finalStats.percentile = scores.length > 0 ? (scores.filter(s => s < scorePercent).length / scores.length) * 100 : 100;
                const newTotalAttempts = data.totalAttempts + 1;
                const newAverageScore = ((data.averageScore * data.totalAttempts) + scorePercent) / newTotalAttempts;
                scores.push(scorePercent);
                transaction.update(aggregatesRef, { totalAttempts: newTotalAttempts, averageScore: newAverageScore, scores });
                finalStats.average = newAverageScore;
            }
        });
    } catch (e) { console.error("Transaction failed: ", e); }
    return finalStats;
}

async function getAIInsights(incorrectQs) {
    const insightsCard = document.getElementById('ai-insights-card');
    const insightsDiv = document.getElementById('ai-insights-content');
    insightsDiv.innerHTML = '<p>Generating personalized insights...</p>';
    if (!QUIZ_CONFIG.AIzaSyDi7D6W2xjtReXVFkpSSXG_xTJBqRGswxs) {
        insightsDiv.innerHTML = '<p>AI features are not enabled. Please add a Google AI API key.</p>'; return;
    }
    if(incorrectQs.length === 0) {
        insightsDiv.innerHTML = '<p>Flawless victory! You answered all questions correctly. No areas for improvement found.</p>'; return;
    }
    
    try {
        const payload = {
            contents: [{
                parts: [{ text: `A user answered these radiology exam questions incorrectly. Identify 2-3 core concepts they are struggling with and give concise, actionable study advice. Questions:\n${incorrectQs.map(q => `- ${q.text}`).join('\n')}` }]
            }]
        };

        const apiKey = QUIZ_CONFIG.AIzaSyDi7D6W2xjtReXVFkpSSXG_xTJBqRGswxs;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
            insightsDiv.innerHTML = text.replace(/\n/g, '<br>').replace(/\*/g, '');
        } else {
            insightsDiv.innerHTML = '<p>Could not retrieve AI insights at this time. Please check your API key and try again.</p>';
        }
    } catch (error) {
        insightsDiv.innerHTML = '<p>Could not retrieve AI insights at this time. Please check your API key and try again.</p>';
        console.error("AI Error:", error);
    }
}

function saveState() {
    if (!currentUser || !currentPaper || isReviewing) return;
    const state = { answers: userAnswers, index: currentQuestionIndex, elapsedSeconds: elapsedSeconds, flags: Array.from(flaggedQuestions) };
    localStorage.setItem(`radmentor_quiz_${currentPaper.id}_${quizMode}_${currentUser.uid}`, JSON.stringify(state));
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function startTimer() {
    clearInterval(quizInterval);
    const totalDuration = EXAM_DURATIONS[currentPaper.examType] || 0;

    if (quizMode === 'exam' && totalDuration > 0) {
        let remainingSeconds = totalDuration - elapsedSeconds;
        dom.timerEl.textContent = formatTime(remainingSeconds);
        quizInterval = setInterval(() => {
            if (remainingSeconds <= 0) {
                clearInterval(quizInterval);
                showCustomAlert("Time's up! The exam has finished.", () => finishExam());
                return;
            }
            remainingSeconds--;
            elapsedSeconds++;
            dom.timerEl.textContent = formatTime(remainingSeconds);
            saveState();
        }, 1000);
    } else {
        let startTime = Date.now() - (elapsedSeconds * 1000);
        quizInterval = setInterval(() => {
            elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            dom.timerEl.textContent = formatTime(elapsedSeconds);
            saveState();
        }, 1000);
    }
}

function setupReview(filterType) {
    isReviewing = true;
    if (filterType === 'all') {
        reviewFilter = allQuestions.map((_, i) => i);
    } else if (filterType === 'incorrect') {
        reviewFilter = allQuestions.map((q, i) => i).filter(i => userAnswers[i] !== undefined && userAnswers[i] !== q.correctIndex);
    } else if (filterType === 'flagged') {
        reviewFilter = allQuestions.map((q, i) => i).filter(i => flaggedQuestions.has(q.id));
    }
    
    if (reviewFilter.length === 0) {
        showCustomAlert(`No ${filterType} questions to review.`, () => {
            isReviewing = false;
            finishExam();
        });
        return;
    }
    dom.finishQuizBtn.style.display = 'none';
    showScreen('quiz-screen');
    createQuestionNav();
    showQuestion(reviewFilter[0]);
}
