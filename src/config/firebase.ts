import { initializeApp, FirebaseError } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableMultiTabIndexedDbPersistence,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC2TFAGQ2729Qfbf-KVh5dqjiSrUF4oMcE",
  authDomain: "financas-77acb.firebaseapp.com",
  projectId: "financas-77acb",
  storageBucket: "financas-77acb.firebasestorage.app",
  messagingSenderId: "29502618913",
  appId: "1:29502618913:web:3946810cc2f5a0d1b05260",
  measurementId: "G-M59CG0BZP4"
};

let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Enable offline persistence with multi-tab support
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code !== 'failed-precondition') {
      console.warn('Firebase persistence error:', err);
    }
  });

  // Error handling for auth state changes
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('User is signed in');
    } else {
      console.log('User is signed out');
    }
  }, (error) => {
    console.error('Auth state change error:', error);
  });

} catch (error) {
  if (error instanceof FirebaseError) {
    console.error('Firebase initialization error:', error.code, error.message);
  } else {
    console.error('Unexpected error during Firebase initialization:', error);
  }
  
  // Provide fallback initialization
  if (!app) app = initializeApp(firebaseConfig);
  if (!auth) auth = getAuth(app);
  if (!db) db = getFirestore(app);
}

// Development environment check for emulators
if (process.env.NODE_ENV === 'development') {
  try {
    if (getConnectionStatus()) {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
  } catch (error) {
    console.warn('Failed to connect to Firebase emulators:', error);
  }
}

export { auth, db };

// Add connection status monitoring with network state management
let isOnline = navigator.onLine;

const updateNetworkState = async (online: boolean) => {
  isOnline = online;
  try {
    if (online) {
      await enableNetwork(db);
      console.log('Application is online, network enabled');
    } else {
      await disableNetwork(db);
      console.log('Application is offline, network disabled');
    }
  } catch (error) {
    console.error('Error updating network state:', error);
  }
};

window.addEventListener('online', () => {
  updateNetworkState(true);
});

window.addEventListener('offline', () => {
  updateNetworkState(false);
});

// Initial network state
updateNetworkState(isOnline);

export const getConnectionStatus = () => isOnline;