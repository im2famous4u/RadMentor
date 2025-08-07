// dashboard.js

// IMPORTANT: Ensure this path correctly points to your main firebase configuration file.
// It assumes `dashboard.html` is in the `dashboard/` folder and `firebase.js` is in `js/` at the root.
import { auth, db } from '../js/firebase.js'; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Page-specific JavaScript for QOTD
    const revealAnswerButton = document.getElementById('revealAnswerButton');
    const qotdAnswer = document.getElementById('qotdAnswer');

    if (revealAnswerButton && qotdAnswer) {
        revealAnswerButton.addEventListener('click', () => {
            qotdAnswer.classList.remove('hidden');
            revealAnswerButton.disabled = true;
            revealAnswerButton.textContent = "Answer Revealed";
            document.querySelectorAll('input[name="qotd-option"]').forEach(radio => radio.disabled = true);
        });
    }

    // --- Performance Snapshot Logic ---
    const statsLoader = document.getElementById('stats-loader');
    const statsContent = document.getElementById('stats-content');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchAndCalculateStats(user.uid);
        } else {
            statsLoader.innerHTML = '<p class="text-gray-500">Please log in to view your progress.</p>';
        }
    });

    async function fetchAndCalculateStats(userId) {
        const attemptsRef = collection(db, "users", userId, "quizAttempts");
        const q = query(attemptsRef);
        const snapshot = await getDocs(q);
        const allAttempts = snapshot.docs.map(doc => doc.data());

        if (allAttempts.length === 0) {
            statsLoader.style.display = 'none';
            statsContent.style.display = 'block';
            feather.replace();
            return;
        }

        // --- Calculate Stats ---
        // NOTE: Define the total number of papers available on your platform.
        const TOTAL_AVAILABLE_PAPERS = 20; // Adjust this number as you add more papers
        const uniquePapersAttempted = new Set(allAttempts.map(attempt => attempt.paperId));
        const completion = (uniquePapersAttempted.size / TOTAL_AVAILABLE_PAPERS) * 100;

        const practiceAttempts = allAttempts.filter(a => a.mode === 'practice');
        const totalPracticeCorrect = practiceAttempts.reduce((sum, a) => sum + a.score, 0);
        const totalPracticeQuestions = practiceAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
        const accuracy = totalPracticeQuestions > 0 ? (totalPracticeCorrect / totalPracticeQuestions) * 100 : 0;

        const examAttempts = allAttempts.filter(a => a.mode === 'exam');
        const totalExamScorePercent = examAttempts.reduce((sum, a) => sum + a.percentage, 0);
        const mockScore = examAttempts.length > 0 ? totalExamScorePercent / examAttempts.length : 0;

        const masteredPapers = new Set();
        allAttempts.forEach(attempt => {
            if (attempt.percentage > 60) {
                masteredPapers.add(attempt.paperId);
            }
        });
        const mastery = uniquePapersAttempted.size > 0 ? (masteredPapers.size / uniquePapersAttempted.size) * 100 : 0;

        updateDashboardUI({ completion, accuracy, mockScore, mastery });
    }

    function updateDashboardUI(stats) {
        statsLoader.style.display = 'none';
        statsContent.style.display = 'block';

        document.getElementById('completion-value').textContent = `${stats.completion.toFixed(0)}%`;
        document.getElementById('completion-bar').style.width = `${stats.completion}%`;

        document.getElementById('accuracy-value').textContent = `${stats.accuracy.toFixed(0)}% Correct`;
        document.getElementById('accuracy-bar').style.width = `${stats.accuracy}%`;

        document.getElementById('mock-score-value').textContent = `${stats.mockScore.toFixed(0)}% Avg`;
        document.getElementById('mock-score-bar').style.width = `${stats.mockScore}%`;

        document.getElementById('mastery-value').textContent = `${stats.mastery.toFixed(0)}% Mastered`;
        document.getElementById('mastery-bar').style.width = `${stats.mastery}%`;

        feather.replace();
    }
});
