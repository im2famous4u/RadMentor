/**
 * ==================================================================================
 * QUIZ CONFIGURATION FILE
 * ==================================================================================
 *
 * This file is the central control panel for all quizzes.
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
  "neet-ss": {
    name: "NEET SS Exam",
    sheetId: "16wV4XJqFpgdJejIqWRvnL3ZwCKp8C8DWj12ukrsNqHk",
    papers: {
      "Paper 1": "0",
      "Paper 2": "385825325",
      "Paper 3": "1302055466",
      "Paper 4": "472403230",
      "Paper 5": "1502909003"
    }
  }
};
