// dashboard.js

// IMPORTANT: This path must correctly point to your main Firebase configuration file.
// It assumes `dashboard.html` is in a `dashboard/` folder and `firebase.js` is in a `js/` folder at the root.
import { auth, db } from '../js/firebase.js'; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Logic for the Question of the Day card
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
            // If user is logged in, fetch their stats
            fetchAndCalculateStats(user.uid);
        } else {
            // If not logged in, show a message
            statsLoader.innerHTML = '<p class="text-gray-500">Please log in to view your progress.</p>';
        }
    });

    async function fetchAndCalculateStats(userId) {
        const attemptsRef = collection(db, "users", userId, "quizAttempts");
        const q = query(attemptsRef);
        const snapshot = await getDocs(q);
        const allAttempts = snapshot.docs.map(doc => doc.data());

        // If user has no attempts, show the empty dashboard
        if (allAttempts.length === 0) {
            statsLoader.style.display = 'none';
            statsContent.style.display = 'block';
            return;
        }

        // --- Calculate Stats ---
        // NOTE: Adjust the total number of papers available on your platform.
        const TOTAL_AVAILABLE_PAPERS = 28; // 8 fellowship + 10 physics + 10 superspeciality papers
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
            // A topic is "mastered" if the user has scored above 60% on it at least once.
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

        document.getElementById('completion-bar').style.width = `${stats.completion}%`;
        document.getElementById('completion-value').textContent = `${stats.completion.toFixed(0)}% Complete`;

        document.getElementById('accuracy-bar').style.width = `${stats.accuracy}%`;
        document.getElementById('accuracy-value').textContent = `${stats.accuracy.toFixed(0)}% Correct`;

        document.getElementById('mock-score-bar').style.width = `${stats.mockScore}%`;
        document.getElementById('mock-score-value').textContent = `${stats.mockScore.toFixed(0)}% Average`;

        document.getElementById('mastery-bar').style.width = `${stats.mastery}%`;
        document.getElementById('mastery-value').textContent = `${stats.mastery.toFixed(0)}% Mastered`;
    }
});
