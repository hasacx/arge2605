// Firebase yapılandırması
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Gerçek Firebase yapılandırması (test için yorum satırı yapıldı)
// export const firebaseConfig = {
//   apiKey: "AIzaSyA-4l49UOG-1XUWn6mLi2ki0x_Jth4y1MQ",
//   authDomain: "esans-talep-sistemi.firebaseapp.com",
//   projectId: "esans-talep-sistemi",
//   storageBucket: "esans-talep-sistemi.appspot.com",
//   messagingSenderId: "810199839185",
//   appId: "1:810199839185:web:42f13704bfa5318aaeb0f0"
// };

// Gerçek Firebase yapılandırması
export const firebaseConfig = {
  apiKey: "AIzaSyCq1d0YLECfGbZ8dB_bV8QROoj2lP-5hz4",
  authDomain: "esans-6d0aa.firebaseapp.com",
  projectId: "esans-6d0aa",
  storageBucket: "esans-6d0aa.firebasestorage.app",
  messagingSenderId: "354183453900",
  appId: "1:354183453900:web:a6e6fa27b9344dca2af669",
  measurementId: "G-6ECM0W7WW2"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Firestore ve Auth servislerini dışa aktar
export const db = getFirestore(app);
export const auth = getAuth(app);

// Emülatör bağlantısı için (Test ortamı için etkinleştiriyoruz)
if (window.location.hostname === 'localhost') {
  // Hata mesajlarını görmemek için ikinci parametreyi { disableWarnings: true } olarak ayarlıyoruz
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}