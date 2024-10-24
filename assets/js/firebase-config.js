import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
const firebaseConfig = {
  apiKey: "AIzaSyBBPKJcXjkZ0wUbXNremQuf_R1Z6baYcU0",
  authDomain: "karaoke-3aa8f.firebaseapp.com",
  databaseURL: "https://karaoke-3aa8f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "karaoke-3aa8f",
  storageBucket: "karaoke-3aa8f.appspot.com",
  messagingSenderId: "652741363415",
  appId: "1:652741363415:web:e33bb49a0be7eed7e09292"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const realTimeDb = getDatabase(app);
export { app, auth, db, realTimeDb };
