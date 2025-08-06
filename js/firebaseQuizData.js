
// js/firebaseQuizData.js

// Import Firebase functions (these URLs are for client-side use)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Initialization and Authentication ---
let app;
let db;
let auth;
let currentUserId = null; // To store the authenticated user's ID

// These global variables are expected to be provided by your Canvas environment
// If running locally, you might need to hardcode them for testing, but keep them as is for Canvas.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

/**
 * Initializes Firebase and sets up authentication listener.
 * This function should be called once when your application starts.
 * It will automatically sign in the user (anonymously or with a custom token).
 * @returns {Promise<void>}
 */
export async function initFirebaseAndAuth() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Listen for authentication state changes
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                console.log('Firebase: User authenticated:', currentUserId);
                // You can trigger a data load here or let individual pages call loadUserProgress
            } else {
                console.log('Firebase: No user, attempting anonymous sign-in or custom token sign-in.');
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            }
            // Notify any listeners that auth is ready, if needed
            document.dispatchEvent(new CustomEvent('firebaseAuthReady', { detail: { userId: currentUserId } }));
        });
    } catch (error) {
        console.error("Firebase: Error initializing Firebase:", error);
        // You might want to display an error message to the user here
    }
}

/**
 * Gets the currently authenticated user ID.
 * @returns {string|null} The user ID or null if not authenticated.
 */
export function getUserId() {
    return currentUserId;
}

// --- Firebase Data Operations ---

/**
 * Loads the user's quiz progress from Firestore.
 * @returns {Promise<{completedQuestions: string[], bookmarkedQuestions: string[]}>}
 * An object containing arrays of completed and bookmarked question IDs.
 */
export async function loadUserProgress() {
    if (!db || !currentUserId) {
        console.warn('Firebase: Firestore DB or User ID not ready. Cannot load progress.');
        return { completedQuestions: [], bookmarkedQuestions: [] };
    }

    try {
        // Path for private user data: /artifacts/{appId}/users/{userId}/quizProgress
        const userDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/quizProgress`, 'myProgress');
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('Firebase: User progress loaded:', data);
            return {
                completedQuestions: data.completedQuestions || [],
                bookmarkedQuestions: data.bookmarkedQuestions || []
            };
        } else {
            console.log("Firebase: No existing user progress document found, creating a new one.");
            // Create initial document if it doesn't exist
            await setDoc(userDocRef, { completedQuestions: [], bookmarkedQuestions: [] });
            return { completedQuestions: [], bookmarkedQuestions: [] };
        }
    } catch (error) {
        console.error("Firebase: Error loading user progress:", error);
        // You might want to return a default empty state or throw the error
        return { completedQuestions: [], bookmarkedQuestions: [] };
    }
}

/**
 * Marks a question as completed for the current user.
 * @param {string} questionId The ID of the question to mark as completed.
 * @returns {Promise<void>}
 */
export async function saveCompletedQuestion(questionId) {
    if (!db || !currentUserId) {
        console.warn('Firebase: Firestore DB or User ID not ready. Cannot save completed question.');
        return;
    }

    try {
        const userDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/quizProgress`, 'myProgress');
        await updateDoc(userDocRef, {
            completedQuestions: arrayUnion(questionId) // Add questionId if not already present
        });
        console.log(`Firebase: Question ${questionId} marked as completed for user ${currentUserId}.`);
    } catch (error) {
        console.error("Firebase: Error saving completed question:", error);
    }
}

/**
 * Toggles the bookmark status of a question for the current user.
 * @param {string} questionId The ID of the question to toggle bookmark for.
 * @param {boolean} isCurrentlyBookmarked True if the question is currently bookmarked, false otherwise.
 * @returns {Promise<void>}
 */
export async function toggleBookmarkQuestion(questionId, isCurrentlyBookmarked) {
    if (!db || !currentUserId) {
        console.warn('Firebase: Firestore DB or User ID not ready. Cannot toggle bookmark.');
        return;
    }

    try {
        const userDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/quizProgress`, 'myProgress');

        if (isCurrentlyBookmarked) {
            await updateDoc(userDocRef, {
                bookmarkedQuestions: arrayRemove(questionId) // Remove if already bookmarked
            });
            console.log(`Firebase: Question ${questionId} unbookmarked for user ${currentUserId}.`);
        } else {
            await updateDoc(userDocRef, {
                bookmarkedQuestions: arrayUnion(questionId) // Add if not bookmarked
            });
            console.log(`Firebase: Question ${questionId} bookmarked for user ${currentUserId}.`);
        }
    } catch (error) {
        console.error("Firebase: Error toggling bookmark:", error);
    }
}
