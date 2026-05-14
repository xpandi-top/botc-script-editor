/**
 * Firebase app singleton — lazily initialised on first use.
 *
 * Firestore rules required (Firebase console → Firestore → Rules):
 * ─────────────────────────────────────────────────────────────────
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /shortlinks/{id} {
 *       allow read: if true;
 *       allow create: if request.resource.data.keys().hasOnly(['data','expiresAt'])
 *                     && request.resource.data.data is string
 *                     && request.resource.data.data.size() < 500000;
 *       allow delete, update: if false;
 *     }
 *   }
 * }
 *
 * No TTL policy needed — expired docs are lazily deleted on read (Spark plan compatible).
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             as string,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     as string,
}

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
}
