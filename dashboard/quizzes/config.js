/**
 * ==================================================================================
 * QUIZ CONFIGURATION FILE
 * ==================================================================================
 *
 * This file is the central control panel for all quizzes.
 *
 * HOW TO USE:
 * 1. Add a new entry inside the QUIZ_CONFIG object for each new quiz type (e.g., "ini-ss", "neet").
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
  "ini-ss": {
    name: "INI-SS Exam",
    sheetId: "1Zd-UhR966r8FE5pJ3yqqPInQBrAzLSG4pTc_wytr4I0",
    papers: {
      "Paper 1": "0",
      "Paper 2": "123269442",
      "Paper 3": "1278979358",
      "Paper 4": "470498245",
      "Paper 5": "94227388",
      "Paper 6": "855680808",
      "Paper 7": "1771985316",
      "Paper 8": "153180989",
      "Paper 9": "1725673059"
    }
  },
  // You can add other quizzes here following the same structure
  // "neet": {
  //   name: "NEET Biology Mock Test",
  //   sheetId: "ANOTHER_GOOGLE_SHEET_ID_HERE",
  //   papers: {
  //     "Botany": "111111111",
  //     "Zoology": "222222222"
  //   }
  // }
};
