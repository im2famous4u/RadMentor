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
            authCheckScreen.style.display = 'none';
            handleDirectLink(user);
        } else {
            authCheckScreen.innerHTML = '<div class="selection-container"><p>You must be logged in to continue.</p></div>';
        }
    });

    // Attach initial event listeners
    dom.paperCardGrid.addEventListener('click', (e) => {
        if (e.target.matches('.paper-button')) {
            // Added 'type' to be stored in the currentPaper object
            const { id, name, type } = e.target.dataset;
            currentPaper = { id, name, type };
            quizMode = 'practice';
            checkResumeAndStart();
        }
    });

    dom.modeToggle.addEventListener('change', () => {
        const newMode = dom.modeToggle.checked ? 'exam' : 'practice';
        if (confirm(`Switching to ${newMode} mode will restart your progress for this paper. Continue?`)) {
            setQuizMode(newMode);
        } else {
            dom.modeToggle.checked = !dom.modeToggle.checked;
        }
    });

    dom.soundToggleBtn.addEventListener('click', toggleSound);
    
    dom.finishQuizBtn.addEventListener('click', () => {
       if (quizMode === 'exam') {
           if(confirm('Are you sure you want to finish the exam?')) finishExam();
       } else {
           if(confirm('Are you sure you want to finish this practice session?')) finishExam();
       }
    });
}

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
            // Ensure type is carried over for direct links
            currentPaper = paper;
            quizMode = 'practice';
            startQuiz(null, directQuestionId);
            return; 
        }
    }
    showScreen('topic-screen');
    // Added data-type to the button mapping
    dom.paperCardGrid.innerHTML = QUIZ_CONFIG.PAPER_METADATA.map(paper => 
        `<button class="paper-button" data-id="${paper.id}" data-name="${paper.name}" data-type="${paper.type}">${paper.name}</button>`
    ).join('');
}

function setQuizMode(newMode) {
    quizMode = newMode;
    localStorage.removeItem(`radmentor_quiz_fellowship_${currentUser.uid}_${currentPaper.id}_${quizMode}`);
    startQuiz(null);
}

function checkResumeAndStart() {
    const savedState = localStorage.getItem(`radmentor_quiz_fellowship_${currentUser.uid}_${currentPaper.id}_${quizMode}`);
    if (savedState) {
        if (confirm(`You have an unfinished ${quizMode} session. Resume?`)) {
            startQuiz(JSON.parse(savedState));
        } else {
            localStorage.removeItem(`radmentor_quiz_fellowship_${currentUser.uid}_${currentPaper.id}_${quizMode}`);
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
    
    initializeSound();
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
        // Pass the quiz type to the parser
        allQuestions = parseCSVToQuestions(csvText, currentPaper.type);
    } catch (error) { console.error("Fetch Error:", error); }
}

function parseCSVToQuestions(csvText, quizType) {
    const lines = csvText.trim().split('\n').slice(1);
    
    switch (quizType) {
        case 'frcr-physics':
            return lines.map((line, index) => {
                const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
                const questionText = parts[0];
                if (!questionText) return null;
                
                const subQuestions = [];
                for (let i = 0; i < 5; i++) {
                    subQuestions.push({
                        text: parts[1 + i] || '',
                        correctAnswer: (parts[6 + i * 2] || '').toLowerCase().trim(),
                        explanation: parts[7 + i * 2] || "N/A"
                    });
                }
                
                return { id: `${currentPaper.id}-${index}`, text: questionText, type: 'frcr-physics', subQuestions };
            }).filter(Boolean);

        case 'frcr-2a': // 5-option MCQ
        case 'mcq': // 4-option MCQ
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
    // Render based on question type
    switch (q.type) {
        case 'frcr-physics':
            questionHTML = renderFRCRPhysicsQuestion(q, index);
            break;
        case 'frcr-2a':
        case 'mcq':
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
    return questionHTML;
}

function renderFRCRPhysicsQuestion(q, index) {
    const isBookmarked = userBookmarks.has(q.id);
    const isFlagged = flaggedQuestions.has(q.id);
    const isFullyAnswered = userAnswers[index] && Object.keys(userAnswers[index]).length === 5;
    const showExplanations = isReviewing || (quizMode === 'practice' && isFullyAnswered);

    let html = `
        <div class="question-title-bar">
            <span class="question-number">Question ${index + 1} of ${allQuestions.length}</span>
            <div class="question-controls">
                <button class="icon-btn flag-btn ${isFlagged ? 'flagged' : ''}" ${isReviewing ? 'disabled' : ''}><i data-feather="flag"></i></button>
                <button class="icon-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" ${isReviewing ? 'disabled' : ''}><i data-feather="bookmark"></i></button>
            </div>
        </div>
        <p class="main-question-text">${q.text}</p>`;
    
    html += q.subQuestions.map((sq, sqIndex) => {
        const userAnswer = userAnswers[index] ? userAnswers[index][sqIndex] : undefined;
        
        const getLabelClass = (optionValue) => {
            if (!showExplanations) return userAnswer === optionValue ? 'selected' : '';
            if (sq.correctAnswer === optionValue) return 'correct';
            if (userAnswer === optionValue) return 'incorrect';
            return '';
        };

        return `
            <div class="sub-question-container" style="margin-bottom: 1.5rem; border-left: 3px solid #e5e7eb; padding-left: 1rem;">
                <p class="sub-question-text" style="font-weight: 500;">${sqIndex + 1}. ${sq.text}</p>
                <div class="true-false-options" style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                    <label class="tf-label ${getLabelClass('true')}">
                        <input type="radio" name="q${index}_sq${sqIndex}" value="true" ${userAnswer === 'true' ? 'checked' : ''} ${showExplanations ? 'disabled' : ''}> True
                    </label>
                    <label class="tf-label ${getLabelClass('false')}">
                        <input type="radio" name="q${index}_sq${sqIndex}" value="false" ${userAnswer === 'false' ? 'checked' : ''} ${showExplanations ? 'disabled' : ''}> False
                    </label>
                </div>
                ${showExplanations ? `<div class="explanation-box" style="margin-top: 1rem;">${sq.explanation}</div>` : ''}
            </div>
        `;
    }).join('');

    return html;
}


function attachQuestionListeners(q, index) {
    const flagBtn = dom.questionsDisplay.querySelector('.flag-btn');
    if (flagBtn) flagBtn.addEventListener('click', () => toggleFlag(q.id));

    const bookmarkBtn = dom.questionsDisplay.querySelector('.bookmark-btn');
    if (bookmarkBtn) bookmarkBtn.addEventListener('click', () => toggleBookmark(q.id, q.text));

    if (isReviewing) return;

    if (q.type === 'frcr-physics') {
        dom.questionsDisplay.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => handleFRCRPhysicsAnswer(e, index));
        });
    } else {
        if (!userAnswers[index]) { // Only attach if not answered
            dom.questionsDisplay.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', handleOptionClick);
            });
        }
    }
}

function handleFRCRPhysicsAnswer(event, qIndex) {
    if (!userAnswers[qIndex]) userAnswers[qIndex] = {};
    
    const radioName = event.target.name; // e.g., "q0_sq1"
    const sqIndex = parseInt(radioName.split('_sq')[1]);
    userAnswers[qIndex][sqIndex] = event.target.value;

    // In practice mode, check and show explanation once all 5 are answered
    if (quizMode === 'practice' && Object.keys(userAnswers[qIndex]).length === 5) {
        const allCorrect = allSubQuestionsCorrect(qIndex);
        if(isSoundOn) (allCorrect ? dom.correctSound : dom.wrongSound).play();
        showQuestion(qIndex); // Re-render to show explanations and disable inputs
    } else {
        showQuestion(qIndex); // Re-render to show selection
    }
    
    saveState();
    updateQuestionNav();
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
    updateQuestionNav();
}

function createQuestionNav() {
    dom.paginationHeader.innerHTML = allQuestions.map((_, i) => `<div class="page-box" data-index="${i}">${i + 1}</div>`).join('');
    dom.paginationHeader.querySelectorAll('.page-box').forEach(box => box.addEventListener('click', () => showQuestion(parseInt(box.dataset.index))));
}

function allSubQuestionsCorrect(qIndex) {
    const q = allQuestions[qIndex];
    const answers = userAnswers[qIndex];
    if (!q.subQuestions || !answers || Object.keys(answers).length < q.subQuestions.length) return false;
    return q.subQuestions.every((sq, sqIndex) => sq.correctAnswer === answers[sqIndex]);
}

function updateQuestionNav() {
    dom.paginationHeader.querySelectorAll('.page-box').forEach(box => {
        const index = parseInt(box.dataset.index);
        const q = allQuestions[index];
        box.className = 'page-box';
        if (index === currentQuestionIndex) box.classList.add('active');

        if (userAnswers[index] !== undefined) {
            if (quizMode === 'practice' || isReviewing) {
                let isCorrect = false;
                if (q.type === 'frcr-physics') {
                    isCorrect = allSubQuestionsCorrect(index);
                } else {
                    isCorrect = userAnswers[index] === q.correctIndex;
                }
                // Only add correctness class if fully answered
                const isFullyAnswered = (q.type === 'frcr-physics') 
                    ? (userAnswers[index] && Object.keys(userAnswers[index]).length === 5)
                    : (userAnswers[index] !== undefined);

                if (isFullyAnswered) {
                    box.classList.add(isCorrect ? 'answered-correct' : 'answered-incorrect');
                } else {
                    box.classList.add('answered-partial'); // A new class for partially answered T/F
                }
            } else { // Exam mode
                 box.classList.add('answered-exam');
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
    const button = dom.questionsDisplay.querySelector('.flag-btn');
    if (flaggedQuestions.has(id)) {
        flaggedQuestions.delete(id);
        if (button) button.classList.remove('flagged');
    } else {
        flaggedQuestions.add(id);
        if (button) button.classList.add('flagged');
    }
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
            let isCorrect = false;
            if (q.type === 'frcr-physics') {
                isCorrect = allSubQuestionsCorrect(i);
            } else {
                isCorrect = userAnswers[i] === q.correctIndex;
            }
            
            if (isCorrect) {
                correctCount++;
            } else {
                incorrectCount++;
                incorrectQuestions.push(q);
            }
        }
    });

    const unattemptedCount = allQuestions.length - (correctCount + incorrectCount);
    const scorePercent = allQuestions.length > 0 ? (correctCount / allQuestions.length * 100) : 0;

    dom.resultsScreen.innerHTML = `
      <div class="results-container">
          <h2 style="font-size: 2.2rem; font-weight: 700; color: var(--header-text-color);">Test Results</h2>
          <div class="results-grid" style="margin-top: 2rem;">
              <div class="stat-card"><h3>Score Summary</h3><p style="font-size: 3rem; font-weight: 700; color: var(--primary-color);" id="final-score-percent"></p><p><strong>Correct:</strong> <span id="correct-count"></span></p><p><strong>Incorrect:</strong> <span id="incorrect-count"></span></p><p><strong>Unattempted:</strong> <span id="unattempted-count"></span></p></div>
              <div class="stat-card"><h3>Performance Chart</h3><canvas id="performanceChart" style="max-height: 200px;"></canvas></div>
              <div class="stat-card"><h3>Peer Comparison</h3><div id="peer-comparison-content"><p><strong>Average Score:</strong> <span id="average-score">Calculating...</span></p><p><strong>Your Rank:</strong> You scored higher than <span id="percentile-rank">Calculating...</span>% of users.</p></div></div>
              <div class="stat-card">
                  <h3 style="display: flex; justify-content: space-between; align-items: center;"><span>🤖 RadMentor Insights</span><span style="background-color: #ef4444; color: white; font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 99px; text-transform: uppercase;">Exclusive</span></h3>
                  <div id="ai-insights-content"><p>Generating feedback...</p></div>
             </div>
          </div>
          <div class="results-actions">
              <button class="results-btn primary" id="review-all-btn">Review All</button>
              <button class="results-btn danger" id="review-incorrect-btn">Review Incorrect</button>
              <button class="results-btn warning" id="review-flagged-btn">Review Flagged</button>
              <button class="results-btn secondary" id="back-to-topics-btn">Back to Papers</button>
          </div>
      </div>`;
    
    document.getElementById('final-score-percent').textContent = `${scorePercent.toFixed(1)}%`;
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('incorrect-count').textContent = incorrectCount;
    document.getElementById('unattempted-count').textContent = unattemptedCount;
    
    if(window.performanceChart instanceof Chart) window.performanceChart.destroy();
    window.performanceChart = new Chart(document.getElementById('performanceChart'), { type: 'doughnut', data: { labels: ['Correct', 'Incorrect', 'Unattempted'], datasets: [{ data: [correctCount, incorrectCount, unattemptedCount], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'] }]}});
    
    localStorage.removeItem(`radmentor_quiz_fellowship_${currentUser.uid}_${currentPaper.id}_${quizMode}`);
    
    if (quizMode === 'exam') {
        const attemptData = { score: correctCount, total: allQuestions.length };
        const { average, percentile } = await saveTestResultAndGetStats(attemptData);
        document.getElementById('average-score').textContent = `${average.toFixed(1)}%`;
        document.getElementById('percentile-rank').textContent = percentile.toFixed(1);
        getAIInsights(incorrectQuestions);
    } else {
        document.getElementById('peer-comparison-content').innerHTML = '<p>Peer comparison is only available in Exam Mode.</p>';
        document.getElementById('ai-insights-content').innerHTML = '<p>AI Insights are only available for Exam Mode results.</p>';
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
    const insightsDiv = document.getElementById('ai-insights-content');
    if (QUIZ_CONFIG.GOOGLE_AI_API_KEY === 'YOUR_API_KEY_HERE') {
        insightsDiv.innerHTML = '<p>AI features are not enabled. Please add a Google AI API key.</p>'; return;
    }
    if(incorrectQs.length === 0) {
        insightsDiv.innerHTML = '<p>Flawless victory! No incorrect answers to analyze.</p>'; return;
    }
    try {
        const genAI = new GoogleGenerativeAI(QUIZ_CONFIG.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro"});
        const prompt = `A user answered these radiology fellowship exam questions incorrectly. Identify 2-3 core concepts they are struggling with and give concise, actionable study advice. Questions:\n${incorrectQs.map(q => `- ${q.text}`).join('\n')}`;
        const result = await model.generateContent(prompt);
        insightsDiv.innerHTML = result.response.text().replace(/\n/g, '<br>').replace(/\*/g, '');
    } catch (error) {
        insightsDiv.innerHTML = '<p>Could not retrieve AI insights at this time.</p>';
        console.error("AI Error:", error);
    }
}

function saveState() {
     if (!currentUser || !currentPaper || isReviewing) return;
     const state = { answers: userAnswers, index: currentQuestionIndex, elapsedSeconds: elapsedSeconds, flags: Array.from(flaggedQuestions) };
     localStorage.setItem(`radmentor_quiz_fellowship_${currentUser.uid}_${currentPaper.id}_${quizMode}`, JSON.stringify(state));
}

function startTimer() {
    clearInterval(quizInterval);
    let startTime = Date.now() - (elapsedSeconds * 1000);
    quizInterval = setInterval(() => {
        elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        dom.timerEl.textContent = `${String(Math.floor(elapsedSeconds/60)).padStart(2,'0')}:${String(elapsedSeconds%60).padStart(2,'0')}`;
    }, 1000);
}

function setupReview(filterType) {
    isReviewing = true;
    if (filterType === 'all') {
        reviewFilter = allQuestions.map((_, i) => i).filter(i => userAnswers[i] !== undefined);
    } else if (filterType === 'incorrect') {
        reviewFilter = allQuestions.map((q, i) => i).filter(i => {
            if (userAnswers[i] === undefined) return false;
            if (q.type === 'frcr-physics') return !allSubQuestionsCorrect(i);
            return userAnswers[i] !== q.correctIndex;
        });
    } else if (filterType === 'flagged') {
        reviewFilter = allQuestions.map((q, i) => i).filter(i => flaggedQuestions.has(q.id));
    }
    
    if (reviewFilter.length === 0) {
        alert(`No ${filterType} questions to review.`);
        isReviewing = false;
        return;
    }
    dom.finishQuizBtn.style.display = 'none';
    showScreen('quiz-screen');
    createQuestionNav();
    showQuestion(reviewFilter[0]);
}
