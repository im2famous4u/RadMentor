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

// Simplified configuration for a single question source
const QOTD_CONFIG = {
    sheetId: "1yjtawm3cPzacUcXFqrqZTn7x14YrJo25wN4ikuJsDeQ",
    gid: "0"
};

// --- FIREBASE INITIALIZATION ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- STARTUP SCRIPT ---
document.addEventListener('DOMContentLoaded', () => {
    initQuestionOfTheDay();
    initPerformanceSnapshot();
});


// --- QUESTION OF THE DAY MODULE (WITH DEBUGGING) ---
async function initQuestionOfTheDay() {
    const todayStr = new Date().toISOString().split('T')[0];
    const qotdLoader = document.getElementById('qotd-loader');

    try {
        const cachedData = JSON.parse(localStorage.getItem('radmentor_qotd'));
        if (cachedData && cachedData.date === todayStr) {
            displayQotD(cachedData.question);
            return;
        }
    } catch (e) { /* Invalid cache, proceed to fetch */ }

    try {
        const url = `https://docs.google.com/spreadsheets/d/${QOTD_CONFIG.sheetId}/gviz/tq?tqx=out:json&gid=${QOTD_CONFIG.gid}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Google Sheets API failed with status: ${response.status}`);
        
        const jsonText = await response.text();
        const jsonMatch = jsonText.match(/google\.visualization\.Query\.setResponse\((.*)\)/s);
        if (!jsonMatch || !jsonMatch[1]) throw new Error("Could not parse JSONP response from Google Sheets.");
        
        const jsonData = JSON.parse(jsonMatch[1]);
        if (jsonData.status === 'error') {
            throw new Error(`Google Sheets Error: ${jsonData.errors[0].detailed_message}`);
        }
        
        const allQuestions = parseGoogleSheetJSON(jsonData);

        // --- DEBUGGING LOGS ---
        console.log("--- QotD DEBUGGING INFO ---");
        if (jsonData.table && jsonData.table.cols) {
            const headers = jsonData.table.cols.map(col => col.label || 'NO_LABEL');
            console.log("Detected Headers from Sheet:", headers);
        }
        if (allQuestions.length > 0) {
            console.log("First Parsed Row (as an object):", allQuestions[0]);
        } else {
            console.log("No data rows were found or parsed from the sheet.");
        }
        console.log("---------------------------");
        // --- END DEBUGGING ---

        const validQuestions = allQuestions.filter(q => q && q.Question && q.Question.trim() !== '');

        if (validQuestions.length === 0) {
            throw new Error("No questions with text could be found in the sheet.");
        }

        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const questionIndex = dayOfYear % validQuestions.length;
        const todaysQuestion = validQuestions[questionIndex];

        localStorage.setItem('radmentor_qotd', JSON.stringify({ date: todayStr, question: todaysQuestion }));
        displayQotD(todaysQuestion);

    } catch (error) {
        console.error("QotD Error:", error);
        if (qotdLoader) qotdLoader.innerHTML = `<p class="text-red-500 p-4 text-center"><strong>Error:</strong> ${error.message}</p>`;
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
        const qotdLoader = document.getElementById('qotd-loader');
        if (qotdLoader) qotdLoader.innerHTML = `<p class="text-red-500">Error: Received invalid question data.</p>`;
        return;
    }

    document.getElementById('qotd-question-text').textContent = q.Question;
    document.getElementById('qotd-option-a').textContent = `A) ${q['Option A']}`;
    document.getElementById('qotd-option-b').textContent = `B) ${q['Option B']}`;
    document.getElementById('qotd-option-c').textContent = `C) ${q['Option C']}`;
    document.getElementById('qotd-option-d').textContent = `D) ${q['Option D']}`;
    document.getElementById('qotd-answer-text').textContent = `Correct Answer: ${q['Correct Answer']}`;
    document.getElementById('qotd-explanation-text').innerHTML = `<strong>Explanation:</strong> ${q.Explanation || 'Not available.'}`;

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


// --- PERFORMANCE SNAPSHOT MODULE ---
function initPerformanceSnapshot() {
    const statsLoader = document.getElementById('stats-loader');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchAndCalculateStats(user.uid);
        } else {
            if(statsLoader) statsLoader.innerHTML = '<p class="text-gray-500">Log in to see your progress.</p>';
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

            const TOTAL_AVAILABLE_PAPERS = 14; 
            const uniquePapersAttempted = new Set(allAttempts.map(a => a.paper.paperId));
            const completion = (uniquePapersAttempted.size / TOTAL_AVAILABLE_PAPERS) * 100;
            const totalCorrect = allAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
            const totalQuestions = allAttempts.reduce((sum, a) => sum + (a.totalQuestions || 0), 0);
            const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
            const examAttempts = allAttempts.filter(a => a.mode === 'exam');
            const mockScore = examAttempts.length > 0 ? examAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / examAttempts.length : 0;
            const masteredPapers = new Set(allAttempts.filter(a => a.percentage > 60).map(a => a.paper.paperId));
            const mastery = uniquePapersAttempted.size > 0 ? (masteredPapers.size / uniquePapersAttempted.size) * 100 : 0;
            
            updateDashboardUI({ completion, accuracy, mockScore, mastery });
        } catch (error) {
            console.error("Error fetching performance stats:", error);
            if(statsLoader) statsLoader.innerHTML = '<p class="text-red-500">Could not load stats.</p>';
        }
    }

    function updateDashboardUI(stats) {
        const statsContent = document.getElementById('stats-content');
        if (statsLoader) statsLoader.style.display = 'none';
        if (statsContent) statsContent.style.display = 'block';

        document.getElementById('completion-bar').style.width = `${stats.completion}%`;
        document.getElementById('completion-value').textContent = `${stats.completion.toFixed(0)}% Complete`;
        document.getElementById('accuracy-bar').style.width = `${stats.accuracy}%`;
        document.getElementById('accuracy-value').textContent = `${stats.accuracy.toFixed(0)}% Correct`;
        document.getElementById('mock-score-bar').style.width = `${stats.mockScore}%`;
        document.getElementById('mock-score-value').textContent = `${stats.mockScore.toFixed(0)}% Average`;
        document.getElementById('mastery-bar').style.width = `${stats.mastery}%`;
        document.getElementById('mastery-value').textContent = `${stats.mastery.toFixed(0)}% Mastered`;
    }
}
