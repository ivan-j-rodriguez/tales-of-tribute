/**
 * Example Club cloud config. Copy to firebase-config.js (same folder) and fill in.
 * Firebase console: Authentication → Email/password (+ Google / Apple / Phone as needed).
 * Firestore: users/{uid} documents with the rules in ../../firebase/firestore.rules.example
 * Authorized domains: your GitHub Pages host (e.g. ivan-j-rodriguez.github.io).
 */
export const FIREBASE_CONFIG = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

export const FIREBASE_PROVIDERS = {
  google: true,
  apple: false,
  phone: false,
};
