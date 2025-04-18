import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC2TFAGQ2729Qfbf-KVh5dqjiSrUF4oMcE",
  authDomain: "financas-77acb.firebaseapp.com",
  projectId: "financas-77acb",
  storageBucket: "financas-77acb.firebasestorage.app",
  messagingSenderId: "29502618913",
  appId: "1:29502618913:web:3946810cc2f5a0d1b05260",
  measurementId: "G-M59CG0BZP4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);