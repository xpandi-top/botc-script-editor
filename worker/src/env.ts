export type Env = {
  /** Web app URL that share links open (the GitHub Pages deployment). */
  APP_URL: string
  /** Optional Firestore config for short share links (public web client values). */
  FIREBASE_PROJECT_ID?: string
  FIREBASE_API_KEY?: string
}
