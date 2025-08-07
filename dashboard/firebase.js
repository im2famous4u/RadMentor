// dashboard/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-OTIwv6P88eT2PCPJXiHgZEDgFV8ZcSw",
  authDomain: "radiology-mcqs.firebaseapp.com",
  projectId: "radiology-mcqs",
  storageBucket: "radiology-mcqs.appspot.com",
  messagingSenderId: "862300415358",
  appId: "1:862300415358:web:097d5e413f388e30587f2f",
  measurementId: "G-0V1SD1H95V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth and firestore services
export const auth = getAuth(app);
export const db = getFirestore(app);
