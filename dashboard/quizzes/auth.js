/**
 * ==================================================================================
 * USER DATA SCRIPT
 * ==================================================================================
 *
 * This script handles user-specific data such as quiz progress and bookmarks
 * using the browser's localStorage.
 *
 */

function getPaperProgress() {
    try {
        const progress = localStorage.getItem('radscribeQuizProgress');
        return progress ? JSON.parse(progress) : {};
    } catch (error) {
        console.error("Could not retrieve quiz progress.", error);
        return {};
    }
}

function savePaperProgress(paperKey, count) {
    const allProgress = getPaperProgress();
    allProgress[paperKey] = count;
    try {
        localStorage.setItem('radscribeQuizProgress', JSON.stringify(allProgress));
    } catch (error) {
        console.error("Could not save quiz progress.", error);
    }
}

function getAllBookmarks() {
    try {
        const bookmarks = localStorage.getItem('radscribeQuizBookmarks');
        return bookmarks ? JSON.parse(bookmarks) : {};
    } catch (error) {
        console.error("Could not retrieve bookmarks.", error);
        return {};
    }
}

function toggleBookmark(paperKey, questionId) {
    const allBookmarks = getAllBookmarks();
    const paperBookmarks = allBookmarks[paperKey] || [];
    const bookmarkIndex = paperBookmarks.indexOf(questionId);

    if (bookmarkIndex > -1) {
        paperBookmarks.splice(bookmarkIndex, 1);
    } else {
        paperBookmarks.push(questionId);
    }

    allBookmarks[paperKey] = paperBookmarks;
    try {
        localStorage.setItem('radscribeQuizBookmarks', JSON.stringify(allBookmarks));
    } catch (error) {
        console.error("Could not save bookmarks.", error);
    }
}

function getPeerStanding(scorePercent) {
    const basePercentile = 60;
    const scoreBonus = scorePercent * 0.35;
    const randomFactor = (Math.random() - 0.5) * 10;
    let finalPercentile = basePercentile + scoreBonus + randomFactor;

    if (finalPercentile > 99.9) finalPercentile = 99.9;
    if (finalPercentile < 10.0) finalPercentile = 10.0;

    return finalPercentile.toFixed(1);
}
