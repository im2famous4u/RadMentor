/**
 * ==================================================================================
 * USER DATA & AUTHENTICATION SCRIPT
 * ==================================================================================
 *
 * This script handles user-specific data such as quiz progress and bookmarks.
 * It uses the browser's localStorage, a simple way to store data on the user's
 * computer across browsing sessions.
 *
 * In a full-scale application, this file would be replaced with calls to a
 * real backend server to manage user accounts and data securely.
 *
 */

/**
 * Retrieves the user's progress on all quiz papers from local storage.
 * @returns {object} An object where keys are paper IDs (e.g., "Paper 1: Physics")
 * and values are the number of questions completed. Returns an empty object if no
 * progress is found.
 */
function getPaperProgress() {
    try {
        const progress = localStorage.getItem('radscribeQuizProgress');
        return progress ? JSON.parse(progress) : {};
    } catch (error) {
        console.error("Could not retrieve quiz progress from local storage.", error);
        return {};
    }
}

/**
 * Saves the user's completion count for a specific quiz paper to local storage.
 * @param {string} paperKey - The unique key identifying the paper (e.g., "Paper 1: Physics").
 * @param {number} count - The number of questions the user has completed for that paper.
 */
function savePaperProgress(paperKey, count) {
    const allProgress = getPaperProgress();
    allProgress[paperKey] = count;
    try {
        localStorage.setItem('radscribeQuizProgress', JSON.stringify(allProgress));
    } catch (error) {
        console.error("Could not save quiz progress to local storage.", error);
    }
}

/**
 * Retrieves all of the user's bookmarks from local storage.
 * @returns {object} An object where keys are paper IDs and values are arrays
 * of bookmarked question IDs.
 */
function getAllBookmarks() {
    try {
        const bookmarks = localStorage.getItem('radscribeQuizBookmarks');
        return bookmarks ? JSON.parse(bookmarks) : {};
    } catch (error) {
        console.error("Could not retrieve bookmarks from local storage.", error);
        return {};
    }
}

/**
 * Adds or removes a bookmark for a specific question.
 * @param {string} paperKey - The key for the paper the question belongs to.
 * @param {string} questionId - The unique ID of the question to bookmark/unbookmark.
 */
function toggleBookmark(paperKey, questionId) {
    const allBookmarks = getAllBookmarks();
    const paperBookmarks = allBookmarks[paperKey] || [];

    const bookmarkIndex = paperBookmarks.indexOf(questionId);

    if (bookmarkIndex > -1) {
        // If already bookmarked, remove it.
        paperBookmarks.splice(bookmarkIndex, 1);
    } else {
        // If not bookmarked, add it.
        paperBookmarks.push(questionId);
    }

    allBookmarks[paperKey] = paperBookmarks;
    try {
        localStorage.setItem('radscribeQuizBookmarks', JSON.stringify(allBookmarks));
    } catch (error) {
        console.error("Could not save bookmarks to local storage.", error);
    }
}

/**
 * Generates a "Peer Standing" percentile to show the user on the results screen.
 * NOTE: This is a simulation. In a real application, this data would come from
 * a server comparing the user's score against others.
 * @param {number} scorePercent - The user's final score percentage (0-100).
 * @returns {string} The simulated peer standing as a formatted string (e.g., "85.3").
 */
function getPeerStanding(scorePercent) {
    // This formula creates a mock, but realistic-looking, percentile.
    const basePercentile = 60;
    const scoreBonus = scorePercent * 0.35; // Adds up to 35 points based on score
    const randomFactor = (Math.random() - 0.5) * 10; // Adds +/- 5 points of randomness
    let finalPercentile = basePercentile + scoreBonus + randomFactor;

    // Clamp the value between a realistic range.
    if (finalPercentile > 99.9) finalPercentile = 99.9;
    if (finalPercentile < 10.0) finalPercentile = 10.0;

    return finalPercentile.toFixed(1);
}
