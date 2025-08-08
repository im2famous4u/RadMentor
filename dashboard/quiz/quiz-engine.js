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

    if (dom.paperCardGrid) {
        dom.paperCardGrid.addEventListener('click', (e) => {
            if (e.target.matches('.selection-button, .paper-button')) {
                const { id, name, type } = e.target.dataset;
                currentPaper = { id, name, type };
                quizMode = 'practice';
                checkResumeAndStart();
            }
        });
    }

    if (dom.modeToggle) {
        dom.modeToggle.addEventListener('change', () => {
            const newMode = dom.modeToggle.checked ? 'exam' : 'practice';
            if (confirm(`Switching to ${newMode} mode will restart your progress. Continue?`)) {
                setQuizMode(newMode);
            } else {
                dom.modeToggle.checked = !dom.modeToggle.checked;
            }
        });
    }

    if(dom.soundToggleBtn) dom.soundToggleBtn.addEventListener('click', toggleSound);
    
    if (dom.finishQuizBtn) {
        dom.finishQuizBtn.addEventListener('click', () => {
           if (confirm(`Are you sure you want to finish this ${quizMode} session?`)) {
               finishExam();
           }
        });
    }
}

function showScreen(screenId) {
    dom.screens.forEach(s => s.classList.remove('active'));
    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.classList.add('active');
    } else if (screenId === 'topic-screen') {
        // Fallback for different topic screen IDs
        const topicScreen = document.querySelector('#topic-screen');
        if (topicScreen) topicScreen.classList.add('active');
    }
    feather.replace();
}


function handleDirectLink(user) {
    const urlParams = new URLSearchParams(window.location.search);
    const directQuestionId = urlParams.get('questionId');
    if(user && directQuestionId) {
        const paperId = urlParams.get('paperId') || urlParams.get('topicGid'); // Support both param names
        const paper = QUIZ_CONFIG.PAPER_METADATA.find(p => p.id === paperId);
        if(paper) {
            currentPaper = paper;
            quizMode = 'practice';
            startQuiz(null, directQuestionId);
            return; 
        }
    }
    showScreen('topic-screen');
    if (dom.paperCardGrid) {
        dom.paperCardGrid.innerHTML = QUIZ_CONFIG.PAPER_METADATA.map(paper => 
            `<button class="paper-button" data-id="${paper.id}" data-name="${paper.name}" data-type="${paper.type}">${paper.name}</button>`
        ).join('');
    }
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
    if (!paperData) {
        console.error("No quiz data found for paper ID:", currentPaper.id);
        return;
    }
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

    let html = `
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
        html += `<div class="explanation-box"><h4>Explanation</h4><p>${q.explanation}</p></div>`;
    }
    return html;
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
        <p class="main-question-text">${q.question}</p>`;
    
    html += q.subsets.map((subset, i) => {
        const savedAnswer = userAnswers[index]?.[i];
        const shouldDisable = isReviewing || (quizMode === 'practice' && isFullyAnswered);
        const itemClass = (shouldDisable) ? (savedAnswer?.toLowerCase() === subset.correctAnswer.toLowerCase() ? 'correct' : 'incorrect') : '';
        return `<div class="subset-item ${itemClass}">
            <div class="subset-q-container">
                <p class="subset-q-text">${subset.text}</p>
                <div class="subset-options">${['True', 'False'].map(opt => `
                    <input type="radio" id="q${index}s${i}${opt}" name="q${index}s${i}" value="${opt.toLowerCase()}" 
                        ${savedAnswer === opt.toLowerCase() ? 'checked' : ''} ${shouldDisable ? 'disabled' : ''}>
                    <label for="q${index}s${i}${opt}">${opt}</label>
                `).join('')}</div>
            </div>
            ${showExplanations ? `<div class="explanation-box" style="margin-top:1rem;">${subset.explanation}</div>` : ''}
        </div>`;
    }).join('');

    return html;
}

function attachQuestionListeners(q, index) {
    const flagBtn = dom.questionsDisplay.querySelector('.flag-btn');
    if (flagBtn) flagBtn.addEventListener('click', () => toggleFlag(q.id));

    const bookmarkBtn = dom.questionsDisplay.querySelector('.bookmark-btn');
    if (bookmarkBtn) bookmarkBtn.addEventListener('click', () => toggleBookmark(q.id, q.type === 'frcr-physics' ? q.question : q.text));

    if (isReviewing) return;

    if (q.type === 'frcr-physics') {
        if (!userAnswers[index] || Object.keys(userAnswers[index]).length < 5) {
            dom.questionsDisplay.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', (e) => handleFRCRPhysicsAnswer(e, index));
            });
        }
    } else {
        if (userAnswers[index] === undefined) {
            dom.questionsDisplay.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', handleOptionClick);
            });
        }
    }
}

function handleFRCRPhysicsAnswer(event, qIndex) {
    if (!userAnswers[qIndex]) userAnswers[qIndex] = {};
    
    const sIndex = parseInt(event.target.name.match(/s(\d+)/)[1]);
    userAnswers[qIndex][sIndex] = event.target.value;

    if (quizMode === 'practice') {
        const allAnswered = Object.keys(userAnswers[qIndex]).length === allQuestions[qIndex].subsets.length;
        if (allAnswered) {
            const isCorrect = allSubQuestionsCorrect(qIndex);
            if(isSoundOn) (isCorrect ? dom.correctSound : dom.wrongSound).play();
            showQuestion(qIndex);
        }
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
    if (!q.subsets || !answers || Object.keys(answers).length < q.subsets.length) return false;
    return q.subsets.every((s, i) => answers[i]?.toLowerCase() === s.correctAnswer.toLowerCase());
}

function updateQuestionNav() {
    dom.paginationHeader.querySelectorAll('.page-box').forEach(box => {
        const index = parseInt(box.dataset.index);
        const q = allQuestions[index];
        box.className = 'page-box';
        if (index === currentQuestionIndex) box.classList.add('active');

        if (userAnswers[index] !== undefined) {
            if (quizMode === 'practice' || isReviewing) {
                const isCorrect = q.type === 'frcr-physics' ? allSubQuestionsCorrect(index) : userAnswers[index] === q.correctIndex;
                const isFullyAnswered = q.type === 'frcr-physics' ? (userAnswers[index] && Object.keys(userAnswers[index]).length === 5) : (userAnswers[index] !== undefined);
                
                if (isFullyAnswered) {
                    box.classList.add(isCorrect ? 'answered-correct' : 'answered-incorrect');
                } else {
                    box.classList.add('answered-partial');
                }
            } else {
                box.classList.add('answered-exam');
            }
        }
        if (flaggedQuestions.has(allQuestions[index].id)) box.classList.add('flagged');
    });
    const activeBox = dom.paginationHeader.querySelector('.page-box.active');
    if(activeBox) activeBox.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function initializeSound() { /* ... */ }
function toggleSound() { /* ... */ }
function updateSoundIcon() { /* ... */ }

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
        if(button) button.classList.remove('bookmarked');
    } else {
        await setDoc(bookmarkRef, {
            questionText: questionText,
            topic: currentPaper.name,
            timestamp: serverTimestamp(),
            linkToQuestion: `${window.location.pathname}?paperId=${currentPaper.id}&questionId=${questionId}`
        });
        userBookmarks.add(questionId);
        if(button) button.classList.add('bookmarked');
    }
}

async function finishExam() {
    clearInterval(quizInterval);
    showScreen('results-screen');
    let correctCount = 0, incorrectCount = 0;
    const incorrectQuestions = [];

    allQuestions.forEach((q, i) => {
        if (userAnswers[i] !== undefined) {
            const isCorrect = q.type === 'frcr-physics' ? allSubQuestionsCorrect(i) : userAnswers[i] === q.correctIndex;
            if(isCorrect) correctCount++; else {
                incorrectCount++;
                incorrectQuestions.push(q);
            }
        }
    });
    
    // ... (rest of finishExam logic is the same)
}

// ... (The rest of the functions: saveTestResultAndGetStats, getAIInsights, saveState, startTimer, setupReview)
// ... are the same as the previous correct version.
