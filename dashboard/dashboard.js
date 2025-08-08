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

// Source for the Question of the Day. Using NEET SS - Paper 1 as an example.
const QOTD_CONFIG = {
    sheetId: "16wV4XJqFpgdJejIqWRvnL3ZwCKp8C8DWj12ukrsNqHk",
    gid: "0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- MAIN SCRIPT LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize both parts of the dashboard
    initPerformanceSnapshot();
    initQuestionOfTheDay();
});


// --- QUESTION OF THE DAY MODULE ---
async function initQuestionOfTheDay() {
    const todayStr = new Date().toISOString().split('T')[0]; // Get date as "YYYY-MM-DD"
    const qotdLoader = document.getElementById('qotd-loader');
    const qotdContent = document.getElementById('qotd-content');
    
    // 1. Try to load from cache first
    try {
        const cachedData = JSON.parse(localStorage.getItem('radmentor_qotd'));
        if (cachedData && cachedData.date === todayStr) {
            displayQotD(cachedData.question);
            return;
        }
    } catch (e) { console.warn("Could not load cached QOTD.", e); }

    // 2. If no valid cache, fetch a new question
    try {
        const url = `https://docs.google.com/spreadsheets/d/${QOTD_CONFIG.sheetId}/gviz/tq?tqx=out:csv&gid=${QOTD_CONFIG.gid}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const csvText = await response.text();
        const allQuestions = parseCSV(csvText);
        
        // Filter out questions that have images
        const nonImageQuestions = allQuestions.filter(q => !q.Image || q.Image.trim() === '');
        
        if (nonImageQuestions.length === 0) throw new Error("No non-image questions found.");

        // Deterministic selection based on the day of the year
        const start = new Date(new Date().getFullYear(), 0, 0);
        const diff = (new Date() - start) + ((start.getTimezoneOffset() - new Date().getTimezoneOffset()) * 60 * 1000);
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const questionIndex = dayOfYear % nonImageQuestions.length;
        const todaysQuestion = nonImageQuestions[questionIndex];

        // Cache the new question for today
        localStorage.setItem('radmentor_qotd', JSON.stringify({ date: todayStr, question: todaysQuestion }));
        
        displayQotD(todaysQuestion);

    } catch (error) {
        console.error("Error setting up Question of the Day:", error);
        qotdLoader.innerHTML = `<p class="text-red-500">Could not load today's question.</p>`;
    }
}

function displayQotD(q) {
    document.getElementById('qotd-question-text').textContent = q.Question;
    document.getElementById('qotd-option-a').textContent = `A) ${q['Option A']}`;
    document.getElementById('qotd-option-b').textContent = `B) ${q['Option B']}`;
    document.getElementById('qotd-option-c').textContent = `C) ${q['Option C']}`;
    document.getElementById('qotd-option-d').textContent = `D) ${q['Option D']}`;

    document.getElementById('qotd-answer-text').textContent = `Correct Answer: ${q['Correct Answer']}`;
    document.getElementById('qotd-explanation-text').innerHTML = `<strong>Explanation:</strong> ${q.Explanation}`;

    // Show the content and hide the loader
    document.getElementById('qotd-loader').classList.add('hidden');
    const qotdContent = document.getElementById('qotd-content');
    qotdContent.classList.remove('hidden');
    qotdContent.style.display = 'flex'; 

    // Wire up the reveal button for the new dynamic question
    const revealAnswerButton = document.getElementById('revealAnswerButton');
    const qotdAnswer = document.getElementById('qotdAnswer');
    revealAnswerButton.onclick = () => {
        qotdAnswer.classList.remove('hidden');
        revealAnswerButton.disabled = true;
        document.querySelectorAll('input[name="qotd-option"]').forEach(radio => radio.disabled = true);
    };
}

// Helper function to parse CSV text from Google Sheets
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const header = lines[0].slice(1, -1).split('","');
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const currentline = lines[i].slice(1, -1).split('","');
        header.forEach((h, j) => {
            obj[h] = currentline[j];
        });
        result.push(obj);
    }
    return result;
}


// --- PERFORMANCE SNAPSHOT MODULE ---
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

            const TOTAL_AVAILABLE_PAPERS = 28;
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
            console.error("Error fetching stats:", error);
            statsLoader.innerHTML = `<p class="text-red-500">Could not load stats.</p>`;
        }
    }

    function updateDashboardUI(stats) {
        const statsContent = document.getElementById('stats-content');
        statsLoader.style.display = 'none';
        statsContent.style.display = 'block';

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
