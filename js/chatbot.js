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
