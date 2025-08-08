import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// --- CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyD-OTIwv6P88eT2PCPJXiHgZEDgFV8ZcSw",
    authDomain: "radiology-mcqs.firebaseapp.com",
    projectId: "radiology-mcqs",
    storageBucket: "radiology-mcqs.appspot.com",
    messagingSenderId: "862300415358",
    appId: "1:862300415358:web:097d5e413f388e30587f2f"
};

// All available question sources for the "Question of the Day"
const QOTD_SOURCES_CONFIG = {
    "ini-ss": {
        name: "INI-SS Exam",
        sheetId: "1Zd-UhR966r8FE5pJ3yqqPInQBrAzLSG4pTc_wytr4I0",
        papers: {
            "Paper 1": "0", "Paper 2": "123269442", "Paper 3": "1278979358",
            "Paper 4": "470498245", "Paper 5": "94227388", "Paper 6": "855680808",
            "Paper 7": "1771985316", "Paper 8": "153180989", "Paper 9": "1725673059"
        }
    },
    "neet-ss": {
        name: "NEET SS Exam",
        sheetId: "16wV4XJqFpgdJejIqWRvnL3ZwCKp8C8DWj12ukrsNqHk",
        papers: {
            "Paper 1": "0", "Paper 2": "385825325", "Paper 3": "1302055466",
            "Paper 4": "472403230", "Paper 5": "1502909003"
        }
    }
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    initPerformanceSnapshot();
    initQuestionOfTheDay();
});

// --- NEW, ROBUST QUESTION OF THE DAY MODULE ---
async function initQuestionOfTheDay() {
    const todayStr = new Date().toISOString().split('T')[0];
    const qotdLoader = document.getElementById('qotd-loader');

    // 1. Check local storage cache first to avoid re-fetching
    try {
        const cachedData = JSON.parse(localStorage.getItem('radmentor_qotd'));
        if (cachedData && cachedData.date === todayStr) {
            displayQotD(cachedData.question);
            return;
        }
    } catch (e) { /* Invalid cache, proceed to fetch new data */ }

    // 2. Prepare the list of all sheet/gid combinations
    const sources = [];
    for (const examKey in QOTD_SOURCES_CONFIG) {
        const exam = QOTD_SOURCES_CONFIG[examKey];
        for (const paperKey in exam.papers) {
            sources.push({ sheetId: exam.sheetId, gid: exam.papers[paperKey] });
        }
    }

    try {
        // 3. Fetch questions from all sources concurrently
        const fetchPromises = sources.map(source => {
            const url = `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?tqx=out:json&gid=${source.gid}`;
            return fetch(url)
                .then(res => {
                    if (!res.ok) throw new Error(`Fetch failed for sheet ${source.sheetId}`);
                    return res.text();
                })
                .then(text => {
                    const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\)/s);
                    if (!match || !match[1]) return [];
                    const data = JSON.parse(match[1]);
                    if (data.status === 'error') {
                        console.warn(`Google Sheets API error for ${source.sheetId}:`, data.errors[0].detailed_message);
                        return [];
                    }
                    return parseGoogleSheetJSON(data);
                }).catch(error => {
                    console.warn(`Could not load QotD from sheet ${source.sheetId} (gid: ${source.gid}):`, error);
                    return []; // Return empty array on failure so one bad sheet doesn't stop everything
                });
        });

        const results = await Promise.all(fetchPromises);
        const allQuestions = results.flat();

        // 4. Filter for valid questions (must have text, must not have an image)
        const validQuestions = allQuestions.filter(q =>
            q && q.Question && q.Question.trim() !== '' &&
            (!q.Image || q.Image.trim().toLowerCase() === 'no')
        );

        if (validQuestions.length === 0) {
            throw new Error("No valid, non-image questions could be found across all sheets.");
        }

        // 5. Deterministically select one question for the day
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const questionIndex = dayOfYear % validQuestions.length;
        const todaysQuestion = validQuestions[questionIndex];

        // 6. Cache the question for today and display it
        localStorage.setItem('radmentor_qotd', JSON.stringify({ date: todayStr, question: todaysQuestion }));
        displayQotD(todaysQuestion);

    } catch (error) {
        console.error("QotD Error:", error);
        qotdLoader.innerHTML = `<p class="text-red-500 p-4 text-center"><strong>Error:</strong> ${error.message}</p>`;
    }
}

function parseGoogleSheetJSON(data) {
    if (!data.table || !data.table.cols || !data.table.rows) return [];
    const cols = data.table.cols.map(col => col.label || col.id);
    return data.table.rows.map(row => {
        const obj = {};
        cols.forEach((colName, index) => {
            const cell = row.c[index];
            obj[colName] = cell ? cell.v : "";
        });
        return obj;
    });
}

function displayQotD(q) {
    if (!q || !q.Question) {
        document.getElementById('qotd-loader').innerHTML = `<p class="text-red-500">Error: Received invalid question data.</p>`;
        return;
    }

    // Ensure all elements exist before trying to set their content
    const questionTextElem = document.getElementById('qotd-question-text');
    const optionAElem = document.getElementById('qotd-option-a');
    const optionBElem = document.getElementById('qotd-option-b');
    const optionCElem = document.getElementById('qotd-option-c');
    const optionDElem = document.getElementById('qotd-option-d');
    const answerTextElem = document.getElementById('qotd-answer-text');
    const explanationElem = document.getElementById('qotd-explanation-text');

    if (questionTextElem) questionTextElem.textContent = q.Question;
    if (optionAElem) optionAElem.textContent = `A) ${q['Option A']}`;
    if (optionBElem) optionBElem.textContent = `B) ${q['Option B']}`;
    if (optionCElem) optionCElem.textContent = `C) ${q['Option C']}`;
    if (optionDElem) optionDElem.textContent = `D) ${q['Option D']}`;
    if (answerTextElem) answerTextElem.textContent = `Correct Answer: ${q['Correct Answer']}`;
    if (explanationElem) explanationElem.innerHTML = `<strong>Explanation:</strong> ${q.Explanation || 'Not available.'}`;

    document.getElementById('qotd-loader').classList.add('hidden');
    const qotdContent = document.getElementById('qotd-content');
    qotdContent.classList.remove('hidden');
    qotdContent.style.display = 'flex';

    const revealAnswerButton = document.getElementById('revealAnswerButton');
    const qotdAnswer = document.getElementById('qotdAnswer');
    if (revealAnswerButton && qotdAnswer) {
        revealAnswerButton.onclick = () => {
            qotdAnswer.classList.remove('hidden');
            revealAnswerButton.disabled = true;
        };
    }
}

// --- PERFORMANCE SNAPSHOT MODULE (Unchanged) ---
function initPerformanceSnapshot() {
    const statsLoader = document.getElementById('stats-loader');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchAndCalculateStats(user.uid);
        } else {
            statsLoader.innerHTML = '<p class="text-gray-500">Log in to see your progress.</p>';
        }
    });

    async function fetchAndCalculateStats(userId) {
        try {
            const attemptsRef = collection(db, "users", userId, "quizAttempts");
            const q = query(attemptsRef);
            const snapshot = await getDocs(q);
            const allAttempts = snapshot.docs.map(doc => doc.data());

            if (allAttempts.length === 0) {
                updateDashboardUI({ completion: 0, accuracy: 0, mockScore: 0, mastery: 0 });
                return;
            }

            const TOTAL_AVAILABLE_PAPERS = 14; // 9 from ini-ss + 5 from neet-ss
            const uniquePapersAttempted = new Set(allAttempts.map(a => a.paperId));
            const completion = (uniquePapersAttempted.size / TOTAL_AVAILABLE_PAPERS) * 100;
            const totalCorrect = allAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
            const totalQuestions = allAttempts.reduce((sum, a) => sum + (a.totalQuestions || 0), 0);
            const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
            const examAttempts = allAttempts.filter(a => a.mode === 'exam');
            const mockScore = examAttempts.length > 0 ? examAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / examAttempts.length : 0;
            const masteredPapers = new Set(allAttempts.filter(a => a.percentage > 60).map(a => a.paperId));
            const mastery = uniquePapersAttempted.size > 0 ? (masteredPapers.size / uniquePapersAttempted.size) * 100 : 0;
            
            updateDashboardUI({ completion, accuracy, mockScore, mastery });
        } catch (error) {
            console.error("Error fetching performance stats:", error);
            statsLoader.innerHTML = '<p class="text-red-500">Could not load stats.</p>';
        }
    }

    function updateDashboardUI(stats) {
        const statsContent = document.getElementById('stats-content');
        if (statsLoader) statsLoader.style.display = 'none';
        if (statsContent) statsContent.style.display = 'block';

        // Add checks to prevent errors if elements aren't found
        const completionBar = document.getElementById('completion-bar');
        const completionValue = document.getElementById('completion-value');
        const accuracyBar = document.getElementById('accuracy-bar');
        const accuracyValue = document.getElementById('accuracy-value');
        const mockScoreBar = document.getElementById('mock-score-bar');
        const mockScoreValue = document.getElementById('mock-score-value');
        const masteryBar = document.getElementById('mastery-bar');
        const masteryValue = document.getElementById('mastery-value');

        if (completionBar) completionBar.style.width = `${stats.completion}%`;
        if (completionValue) completionValue.textContent = `${stats.completion.toFixed(0)}% Complete`;
        if (accuracyBar) accuracyBar.style.width = `${stats.accuracy}%`;
        if (accuracyValue) accuracyValue.textContent = `${stats.accuracy.toFixed(0)}% Correct`;
        if (mockScoreBar) mockScoreBar.style.width = `${stats.mockScore}%`;
        if (mockScoreValue) mockScoreValue.textContent = `${stats.mockScore.toFixed(0)}% Average`;
        if (masteryBar) masteryBar.style.width = `${stats.mastery}%`;
        if (masteryValue) masteryValue.textContent = `${stats.mastery.toFixed(0)}% Mastered`;
    }
}
