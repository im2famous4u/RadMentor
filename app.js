// --- Feather Icons Initialization ---
feather.replace();

// --- START: AI CHATBOT JAVASCRIPT LOGIC ---
const GEMINI_API_KEY = 'AIzaSyDi7D6W2xjtReXVFkpSSXG_xTJBqRGswxs'; // <-- ACTION: PASTE YOUR NEW KEY HERE

const SYSTEM_PROMPT = `
You are "RadTutor AI", a specialized AI assistant designed for a radiology learning website for residents and students. Your mission is to be a trustworthy, comprehensive, and reliable source of information for radiology education and exam preparation, including FRCR, MICR, and MD exams.

**Your Personality:**
- Your tone must be professional, educational, precise, and encouraging.
- You are an expert study partner, not just a search engine.
- Structure complex answers with headings, lists, or bold text for clarity.

**Core Capabilities:**
- Explain complex radiology concepts (e.g., physics of MRI, contrast mechanisms).
- Provide detailed information on imaging modalities (X-ray, CT, MRI, Ultrasound).
- Discuss radiological signs, classic cases, and differential diagnoses.
- Answer detailed questions about anatomy as it relates to medical imaging.
- Offer strategies and key topics for exam preparation.

**CRITICAL RULES:**
1.  **MEDICAL DISCLAIMER:** At the end of every single response, you MUST include this disclaimer on a new line: "Disclaimer: This information is for educational purposes only and is not a substitute for clinical judgment or patient care. Always consult peer-reviewed sources and clinical supervisors."
2.  **PRIORITIZE ACCURACY:** If you are not certain about an answer, state that the topic is complex and recommend consulting specific textbooks (e.g., "For a deeper understanding of this topic, I recommend reviewing 'Brant and Helms' Core Radiology'...") or journals. Do not invent information.
3.  **NO CLINICAL ADVICE:** You must refuse to answer any questions that ask for advice on a specific, real-world patient case. You can explain the concepts related to the case but must state clearly: "I cannot provide advice on specific patient cases. This must be discussed with a clinical supervisor."
4.  **IDENTITY:** You are "RadTutor AI". Do not reveal you are a Google model.
        `;

const chatbotContainer = document.getElementById('chatbot-container');
const toggleButton = document.getElementById('chat-toggle-button');
const chatbox = document.getElementById('chatbox');
const chatUserInput = document.getElementById('chat-userInput');
const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
let conversationHistory = [{role: "user", parts: [{ text: SYSTEM_PROMPT }]}, {role: "model", parts: [{ text: "Understood. I am RadTutor AI. I will provide accurate, educational information for radiology residents and always include the required disclaimer."}]}];

toggleButton.addEventListener('click', () => {
    chatbotContainer.classList.toggle('active');
});

async function sendChatMessage() {
    const userMessage = chatUserInput.value;
    if (!userMessage) return;
    displayChatMessage(userMessage, 'user-message');
    chatUserInput.value = '';
    conversationHistory.push({role: "user", parts: [{ text: userMessage }]});
    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: conversationHistory })
        });
        const data = await response.json();
        if (data.candidates && data.candidates[0].content) {
            const botMessage = data.candidates[0].content.parts[0].text;
            conversationHistory.push({role: "model", parts: [{ text: botMessage }]});
            displayChatMessage(botMessage, 'bot-message');
        } else {
            let errorMessage = "Sorry, I couldn't get a response. Please check your API key.";
            if (data.error) errorMessage += ` (Error: ${data.error.message})`;
            displayChatMessage(errorMessage, 'bot-message');
        }
    } catch (error) {
        console.error('Chatbot Error:', error);
        displayChatMessage('Sorry, something went wrong. Please check the console for errors.', 'bot-message');
    }
}

function displayChatMessage(message, className) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';
    const messageDiv = document.createElement('div');
    messageDiv.className = className;
    messageDiv.textContent = message;
    wrapper.appendChild(messageDiv);
    chatbox.appendChild(wrapper);
    chatbox.scrollTop = chatbox.scrollHeight;
}
// --- END: AI CHATBOT JAVASCRIPT LOGIC ---


// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyD-OTIwv6P88eT2PCPJXiHgZEDgFV8ZcSw", // Placeholder for safety
    authDomain: "radiology-mcqs.firebaseapp.com",
    projectId: "radiology-mcqs",
    storageBucket: "radiology-mcqs.appspot.com",
    messagingSenderId: "862300415358",
    appId: "1:862300415358:web:097d5e413f388e30587f2f",
    measurementId: "G-0V1SD1H95V"
};

// --- Firebase Initialization ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Global State ---
let authMode = 'signin';
let currentUserData = null;

// --- UI Elements ---
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authBtn = document.getElementById('auth-btn');
const toggleBtn = document.getElementById('toggle-btn');
const authMessage = document.getElementById('auth-message');
const landingPage = document.getElementById('landing-page');
const dashboard = document.getElementById('dashboard');
const profileFormContainer = document.getElementById('profile-form-container');
const headerLoggedOut = document.getElementById('header-logged-out');
const headerLoggedIn = document.getElementById('header-logged-in');
const userGreetingHeader = document.getElementById('user-greeting-header');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const mobileLoggedOut = document.getElementById('mobile-logged-out');
const mobileLoggedIn = document.getElementById('mobile-logged-in');
const mainDashboardContent = document.getElementById('dashboard-main-content');
const frcrPartsView = document.getElementById('frcr-parts-view');
const frcrPart1SubjectsView = document.getElementById('frcr-part1-subjects-view');


// --- Event Listeners ---
mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// --- Auth Modal Logic ---
function showAuthModal(mode = 'signin') {
    authMode = mode;
    updateAuthModalUI();
    authModal.classList.remove('hidden');
}

function hideAuthModal() {
    authModal.classList.add('hidden');
    authMessage.textContent = '';
}

function toggleAuth() {
    authMode = authMode === 'signin' ? 'signup' : 'signin';
    updateAuthModalUI();
}

function updateAuthModalUI() {
    if (authMode === 'signin') {
        authTitle.textContent = 'Login to RadMentor';
        authSubtitle.textContent = 'Welcome back!';
        authBtn.textContent = 'Sign In';
        toggleBtn.textContent = "Don't have an account? Sign up";
    } else { // signup
        authTitle.textContent = 'Create Your Account';
        authSubtitle.textContent = 'Start your journey with us today.';
        authBtn.textContent = 'Sign Up';
        toggleBtn.textContent = 'Already have an account? Sign in';
    }
    authMessage.textContent = '';
}

// --- Authentication Logic ---
function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authMessage.textContent = '';

    if (!email || !password) {
        authMessage.textContent = "Please enter both email and password.";
        return;
    }

    if (authMode === 'signin') {
        auth.signInWithEmailAndPassword(email, password)
            .catch(err => {
                authMessage.textContent = err.message;
            });
    } else { // signup
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                return user.sendEmailVerification().then(() => {
                    auth.signOut();
                    authMode = 'signin';
                    updateAuthModalUI();
                    authMessage.textContent = "Verification email sent! Please check your inbox and verify your email before signing in.";
                    return db.collection('users').doc(user.uid).set({
                        email: user.email,
                        accessLevel: 'restricted',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                });
            })
            .catch(err => {
                authMessage.textContent = err.message;
            });
    }
}

// --- Profile Logic ---
function submitProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const profileData = {
        name: document.getElementById('name').value,
        dob: document.getElementById('dob').value,
        sex: document.getElementById('sex').value,
        position: document.getElementById('position').value,
        college: document.getElementById('college').value,
        examPursuing: document.getElementById('exam_pursuing').value,
    };

    if (Object.values(profileData).some(val => !val)) {
        alert("Please fill in all profile fields.");
        return;
    }

    db.collection('users').doc(user.uid).update(profileData)
        .then(() => {
            currentUserData = { ...currentUserData, ...profileData };
            profileFormContainer.classList.add('hidden');
            setupLoggedInState(currentUserData); // Go back to landing page with logged-in header
        })
        .catch(err => alert("Error saving profile: " + err.message));
}

// --- Main Application Flow & State Changes ---
auth.onAuthStateChanged(user => {
    if (user) {
        if (!user.emailVerified) {
            auth.signOut();
            showAuthModal('signin');
            authMessage.textContent = "Please verify your email before logging in.";
            return;
        }
        
        db.collection('users').doc(user.uid).get().then(doc => {
            hideAuthModal();
            if (doc.exists) {
                currentUserData = doc.data();
                if (currentUserData.name && currentUserData.dob) {
                    setupLoggedInState(currentUserData);
                } else {
                    profileFormContainer.classList.remove('hidden');
                    landingPage.classList.add('hidden');
                    dashboard.classList.add('hidden');
                }
            }
        });

    } else {
        // User is signed out
        currentUserData = null;
        setupLoggedOutState();
    }
});

function setupLoggedInState(userData) {
    headerLoggedOut.classList.add('hidden');
    headerLoggedIn.classList.remove('hidden');
    mobileLoggedOut.classList.add('hidden');
    mobileLoggedIn.classList.remove('hidden');
    userGreetingHeader.textContent = userData.name.split(' ')[0];
    
    landingPage.classList.remove('hidden');
    dashboard.classList.add('hidden');
    feather.replace();
}

function setupLoggedOutState() {
    headerLoggedOut.classList.remove('hidden');
    headerLoggedIn.classList.add('hidden');
    mobileLoggedOut.classList.remove('hidden');
    mobileLoggedIn.classList.add('hidden');

    landingPage.classList.remove('hidden');
    dashboard.classList.add('hidden');
    profileFormContainer.classList.add('hidden');
    hideAuthModal();
}

function showDashboard() {
    landingPage.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('user-greeting-name').textContent = currentUserData.name.split(' ')[0];
    
    const noticeDiv = document.getElementById('access-level-notice');
    if(currentUserData.accessLevel === 'restricted') {
        noticeDiv.innerHTML = `<div class="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-r-lg">
            <p class="font-bold">Restricted Access</p>
            <p>Some content is locked. <a href="#" onclick="showDashboardSection('subscription')" class="underline">Subscribe</a> for full access.</p>
        </div>`;
    } else {
        noticeDiv.innerHTML = `<div class="mt-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-r-lg">
            <p class="font-bold">Full Access Granted</p>
            <p>You have access to all features. Happy learning!</p>
        </div>`;
    }
    showMainDashboard();
}

function showLandingPage() {
    dashboard.classList.add('hidden');
    landingPage.classList.remove('hidden');
}

function logout() {
    auth.signOut();
}

// --- Dashboard Navigation & Sidebar ---
const sidebar = document.getElementById('sidebar');
document.getElementById('dashboard-menu-button').addEventListener('click', () => {
    sidebar.classList.remove('translate-x-full');
});
document.getElementById('close-sidebar-button').addEventListener('click', () => {
    sidebar.classList.add('translate-x-full');
});

function showDashboardSection(sectionId) {
    // Hide all dashboard views
    mainDashboardContent.classList.add('hidden');
    frcrPartsView.classList.add('hidden');
    frcrPart1SubjectsView.classList.add('hidden');

    ['profile-section', 'subscription-section', 'settings-section'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    
    const sectionToShow = document.getElementById(`${sectionId}-section`) || mainDashboardContent;
    sectionToShow.classList.remove('hidden');
    
    if (sectionId === 'main') showMainDashboard();
    if (sectionId === 'profile') populateProfileDetails();
    if (sectionId === 'subscription') populateSubscriptionDetails();
    if (sectionId === 'settings') populateSettingsDetails();

    sidebar.classList.add('translate-x-full');
    feather.replace();
}

// --- NEW Dashboard View Functions ---
function showMainDashboard() {
    mainDashboardContent.classList.remove('hidden');
    frcrPartsView.classList.add('hidden');
    frcrPart1SubjectsView.classList.add('hidden');
    feather.replace();
}

function showFrcrParts() {
    mainDashboardContent.classList.add('hidden');
    frcrPartsView.classList.remove('hidden');
    frcrPart1SubjectsView.classList.add('hidden');
    feather.replace();
}

function showFrcrPart1Subjects() {
    mainDashboardContent.classList.add('hidden');
    frcrPartsView.classList.add('hidden');
    frcrPart1SubjectsView.classList.remove('hidden');
    feather.replace();
}

function populateProfileDetails() {
    const section = document.getElementById('profile-section');
    section.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Your Profile</h2>
        <div class="space-y-4">
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Name:</strong> ${currentUserData.name || 'Not set'}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Email:</strong> ${currentUserData.email || 'Not set'}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Date of Birth:</strong> ${currentUserData.dob || 'Not set'}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Position:</strong> ${currentUserData.position || 'Not set'}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>College:</strong> ${currentUserData.college || 'Not set'}</div>
            <div class="p-4 bg-gray-50 rounded-lg"><strong>Exam Pursuing:</strong> ${currentUserData.examPursuing || 'Not set'}</div>
        </div>
    `;
}

function populateSubscriptionDetails() {
    const section = document.getElementById('subscription-section');
    section.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Subscription</h2>
        <p class="text-gray-600">Your current plan: <span class="font-bold text-blue-600">${currentUserData.accessLevel.toUpperCase()}</span></p>
        <p class="mt-4">Subscription management features coming soon!</p>
    `;
}

function populateSettingsDetails() {
    const section = document.getElementById('settings-section');
    section.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Settings</h2>
        <p class="text-gray-600">Settings page is under construction.</p>
    `;
}

// Populate datalist for colleges
const collegeDatalist = document.getElementById('colleges');
const colleges = ["All India Institute of Medical Sciences, New Delhi", "Postgraduate Institute of Medical Education and Research, Chandigarh", "Christian Medical College, Vellore", "National Institute of Mental Health and Neuro Sciences, Bangalore", "Jawaharlal Institute of Postgraduate Medical Education & Research, Puducherry", "Amrita Vishwa Vidyapeetham, Coimbatore", "Sanjay Gandhi Postgraduate Institute of Medical Sciences, Lucknow", "Banaras Hindu University, Varanasi", "Kasturba Medical College, Manipal", "King George's Medical University, Lucknow", "Sree Chitra Tirunal Institute for Medical Sciences and Technology, Trivandrum", "Madras Medical College, Chennai", "St. John's Medical College, Bangalore", "Institute of Liver and Biliary Sciences, New Delhi", "AIIMS, Bhopal", "AIIMS, Bhubaneswar", "AIIMS, Jodhpur", "AIIMS, Patna", "AIIMS, Raipur", "AIIMS, Rishikesh", "AIIMS, Nagpur", "AIIMS, Mangalagiri", "AIIMS, Gorakhpur", "AIIMS, Raebareli", "AIIMS, Kalyani", "AIIMS, Bathinda", "AIIMS, Deoghar", "AIIMS, Bibinagar", "AIIMS, Guwahati", "AIIMS, Jammu", "AIIMS, Rajkot", "Maulana Azad Medical College, New Delhi", "Vardhman Mahavir Medical College & Safdarjung Hospital, New Delhi", "University College of Medical Sciences, New Delhi", "Lady Hardinge Medical College, New Delhi", "Grant Medical College and Sir J.J. Group of Hospitals, Mumbai", "Seth GS Medical College, Mumbai", "Lokmanya Tilak Municipal Medical College, Mumbai", "Armed Forces Medical College, Pune", "B. J. Medical College, Pune", "B. J. Medical College, Ahmedabad", "SMS Medical College, Jaipur", "Bangalore Medical College and Research Institute, Bangalore", "Medical College and Hospital, Kolkata", "Institute of Post-Graduate Medical Education and Research, Kolkata", "Stanley Medical College, Chennai", "Osmania Medical College, Hyderabad", "Gandhi Medical College, Hyderabad", "Government Medical College, Kozhikode", "Government Medical College, Thiruvananthapuram", "Indira Gandhi Medical College, Shimla", "Patna Medical College, Patna", "Government Medical College and Hospital, Chandigarh", "Sher-i-Kashmir Institute of Medical Sciences, Srinagar", "Gauhati Medical College and Hospital, Guwahati", "Regional Institute of Medical Sciences, Imphal", "Kasturba Medical College, Mangalore", "Christian Medical College, Ludhiana", "M. S. Ramaiah Medical College, Bangalore", "JSS Medical College, Mysore", "Sri Ramachandra Institute of Higher Education and Research, Chennai", "Kalinga Institute of Medical Sciences, Bhubaneswar", "Saveetha Institute of Medical and Technical Sciences, Chennai", "Dayanand Medical College & Hospital, Ludhiana", "PSG Institute of Medical Sciences & Research, Coimbatore", "Terna Medical College, Navi Mumbai", "Dr. D. Y. Patil Medical College, Hospital and Research Centre, Pune", "Jawaharlal Nehru Medical College, Belgaum", "Jawaharlal Nehru Medical College, Wardha", "Hamdard Institute of Medical Sciences and Research, New Delhi", "Mahatma Gandhi Mission's Medical College, Aurangabad", "K.S. Hegde Medical Academy, Mangaluru", "Pramukhswami Medical College, Karamsad", "Kempegowda Institute of Medical Sciences, Bangalore"];
colleges.forEach(college => {
    const option = document.createElement('option');
    option.value = college;
    collegeDatalist.appendChild(option);
});
