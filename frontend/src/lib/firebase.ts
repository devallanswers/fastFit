import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey:            'AIzaSyCXZ5yL3tIq6sdYvLbgP_npZt2Rb6PuNic',
  authDomain:        'fastfit-f2fc0.firebaseapp.com',
  projectId:         'fastfit-f2fc0',
  storageBucket:     'fastfit-f2fc0.firebasestorage.app',
  messagingSenderId: '751643086320',
  appId:             '1:751643086320:web:b0a8a41b5f1abbdc0c2135',
}

export const app = initializeApp(firebaseConfig) as ReturnType<typeof initializeApp>
export const auth           = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const appleProvider  = new OAuthProvider('apple.com')

/** Login com email/senha via Firebase */
export const firebaseLoginEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

/** Cadastro com email/senha via Firebase */
export const firebaseRegisterEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password)

/** Login com Google (popup) */
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider)

/** Login com Apple (popup) */
export const loginWithApple = () => signInWithPopup(auth, appleProvider)

/** Recuperação de senha */
export const firebaseForgotPassword = (email: string) =>
  sendPasswordResetEmail(auth, email)

/** Deslogar do Firebase */
export const firebaseSignOut = () => signOut(auth)

export type { FirebaseUser }
export { onAuthStateChanged }
