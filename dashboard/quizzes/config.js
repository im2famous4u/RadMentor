/**
 * ==================================================================================
 * QUIZ CONFIGURATION FILE
 * ==================================================================================
 *
 * This file is the central control panel for all quizzes.
 *
 * HOW TO USE:
 * 1. Add a new entry inside the QUIZ_CONFIG object for each new quiz type (e.g., "radiology", "neet").
 * 2. `name`: This is the display name for the quiz on the landing page.
 * 3. `sheetId`: The ID of your Google Sheet. Find it in the sheet's URL:
 * https://docs.google.com/spreadsheets/d/SHEET_ID_IS_HERE/edit
 * 4. `papers`: An object where each key is the display name of a paper/topic (e.g., "Paper 1")
 * and the value is the 'gid' of that specific sheet. Find the gid in the URL when you
 * select a sheet: &gid=GID_IS_HERE
 *
 * GOOGLE SHEET LAYOUT:
 * Your Google Sheet for each paper MUST have the following columns in this exact order:
 * Question | Option a | Option b | Option c | Option d | Correct Answer | Explanation | Image for Question | Image for Explanation | Tag | Subtag | Exam
 *
 * The "Correct Answer" column should contain the letter of the correct option (a, b, c, or d).
 *
 */
const QUIZ_CONFIG = {
  "radiology": {
    name: "Radiology Fellowship Exam",
    sheetId: "YOUR_GOOGLE_SHEET_ID_HERE", // <-- REPLACE THIS
    papers: {
      "Paper 1: Physics": "0", // gid for the first sheet is often 0
      "Paper 2: Anatomy": "123456789", // <-- REPLACE THIS with your actual gid
      "Paper 3: Pathology (25 Qs)": "987654321", // <-- REPLACE THIS
      // Add more papers here
    }
  },
  "neet": {
    name: "NEET Biology Mock Test",
    sheetId: "ANOTHER_GOOGLE_SHEET_ID_HERE", // <-- A different sheet for a different quiz
    papers: {
      "Botany": "111111111", // <-- REPLACE
      "Zoology": "222222222" // <-- REPLACE
    }
  }
  // Add other quizzes like "usmle", "plab", etc. here
};
