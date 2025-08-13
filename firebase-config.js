// Firebase web config for FarmLink GH (provided by user)
// This is safe to be public; it identifies your Firebase project but does not grant admin access.
const firebaseConfig = {
  apiKey: "AIzaSyClIzS-zRM3Ue-se9DZ-IcW-5Nt7ybeV2k",
  authDomain: "attitude-fred.firebaseapp.com",
  projectId: "attitude-fred",
  storageBucket: "attitude-fred.firebasestorage.app",
  messagingSenderId: "137107425115",
  appId: "1:137107425115:web:c72011263fda2b065a3c7e",
  measurementId: "G-Z0K64KQLJX"
};

// Initialize Firebase
let firebaseApp, firebaseAuth, firebaseDb;

// Initialize Firebase when the script loads
async function initializeFirebase() {
  try {
    // Import Firebase modules
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    
    // Initialize Firebase
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
    
    console.log('Firebase initialized successfully');
    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

// Export for use in other scripts
window.FIREBASE_CONFIG = firebaseConfig;
window.initializeFirebase = initializeFirebase;
