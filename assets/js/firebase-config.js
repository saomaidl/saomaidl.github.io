// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyBBPKJcXjkZ0wUbXNremQuf_R1Z6baYcU0",
  authDomain: "karaoke-3aa8f.firebaseapp.com",
  databaseURL: "https://karaoke-3aa8f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "karaoke-3aa8f",
  storageBucket: "karaoke-3aa8f.appspot.com",
  messagingSenderId: "652741363415",
  appId: "1:652741363415:web:e33bb49a0be7eed7e09292"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Export auth để sử dụng ở các file khác
export { auth };
