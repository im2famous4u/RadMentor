/**
 * ==================================================================================
 * AUTH & USER DATA SERVICE
 * ==================================================================================
 *
 * This file simulates a backend service for user-specific data.
 * It uses the browser's localStorage to persist data across sessions.
 * In a real-world application, these functions would make API calls to a server.
 *
 */
const AuthService = {
    /**
     * Retrieves the progress for all papers.
     * @returns {object} An object where keys are paper IDs and values are completion counts.
     */
    getPaperProgress() {
        try {
            const progress = localStorage.getItem('quizAppProgress');
            return progress ? JSON.parse(progress) : {};
        } catch (error) {
            console.error("Failed to parse progress from localStorage:", error);
            return {};
        }
    },

    /**
     * Saves the completion count for a specific paper.
     * @param {string} paperId - The unique identifier for the paper.
     * @param {number} count - The number of questions completed.
     */
    savePaperProgress(paperId, count) {
        const progress = this.getPaperProgress();
        progress[paperId] = count;
        localStorage.setItem('quizAppProgress', JSON.stringify(progress));
    },

    /**
     * Retrieves all bookmarks.
     * @returns {object} An object where keys are paper IDs and values are arrays of question IDs.
     */
    getAllBookmarks() {
        try {
            const bookmarks = localStorage.getItem('quizAppBookmarks');
            return bookmarks ? JSON.parse(bookmarks) : {};
        } catch (error) {
            console.error("Failed to parse bookmarks from localStorage:", error);
            return {};
        }
    },

    /**
     * Toggles a bookmark for a specific question within a paper.
     * @param {string} paperId - The unique identifier for the paper.
     * @param {string} questionId - The unique identifier for the question.
     */
    toggleBookmark(paperId, questionId) {
        const allBookmarks = this.getAllBookmarks();
        const paperBookmarks = allBookmarks[paperId] || [];
        
        const index = paperBookmarks.indexOf(questionId);
        if (index > -1) {
            paperBookmarks.splice(index, 1); // Remove bookmark
        } else {
            paperBookmarks.push(questionId); // Add bookmark
        }
        
        allBookmarks[paperId] = paperBookmarks;
        localStorage.setItem('quizAppBookmarks', JSON.stringify(allBookmarks));
    },

    /**
     * Generates a mock "peer standing" percentile based on the user's score.
     * In a real app, this would be calculated on the server.
     * @param {number} scorePercent - The user's score percentage (0-100).
     * @returns {string} The calculated peer standing percentile as a formatted string.
     */
    getPeerStanding(scorePercent) {
        // Mock a more realistic distribution
        const basePercentile = 60;
        const scoreBonus = scorePercent * 0.35; // Max 35 points from score
        const randomFactor = (Math.random() - 0.5) * 10; // +/- 5 points randomness
        let finalPercentile = basePercentile + scoreBonus + randomFactor;

        if (finalPercentile > 99.9) finalPercentile = 99.9;
        if (finalPercentile < 10.0) finalPercentile = 10.0;
        
        return finalPercentile.toFixed(1);
    }
};
