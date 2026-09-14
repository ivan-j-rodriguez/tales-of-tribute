/**
 * Optional Firebase web config for GitHub Pages.
 * Copy firebase-config.example.js, paste your project keys, and enable Auth + Firestore.
 * Web API keys are expected to be public; lock access with Auth providers + Firestore rules.
 *
 * Leave FIREBASE_CONFIG null to use on-device email accounts (this browser only).
 */
export const FIREBASE_CONFIG = null;

/**
 * Extra providers beyond email. Google/Apple/Phone need the matching Firebase
 * (and Apple/Google) console setup — keep false until that work is done so the
 * UI does not pretend they work.
 */
export const FIREBASE_PROVIDERS = {
  google: false,
  apple: false,
  phone: false,
};
