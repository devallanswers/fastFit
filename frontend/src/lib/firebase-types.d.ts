// Stubs temporários — serão substituídos pelo pacote real após `npm install`
declare module 'firebase/app' {
  export function initializeApp(config: object): object
}
declare module 'firebase/auth' {
  export function getAuth(app?: object): object
  export function signInWithPopup(auth: object, provider: object): Promise<{ user: { getIdToken(): Promise<string> } }>
  export function signInWithEmailAndPassword(auth: object, email: string, password: string): Promise<object>
  export function createUserWithEmailAndPassword(auth: object, email: string, password: string): Promise<object>
  export function sendPasswordResetEmail(auth: object, email: string): Promise<void>
  export function signOut(auth: object): Promise<void>
  export function onAuthStateChanged(auth: object, callback: (user: object | null) => void): () => void
  export class GoogleAuthProvider {}
  export class OAuthProvider { constructor(id: string) }
  export type User = { getIdToken(): Promise<string>; email: string | null; displayName: string | null }
}
