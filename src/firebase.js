import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAc4Zt8W2l7vE6bablr64jKXNfZk6_7iGw",
  authDomain: "bare-60e06.firebaseapp.com",
  projectId: "bare-60e06",
  storageBucket: "bare-60e06.firebasestorage.app",
  messagingSenderId: "849466379368",
  appId: "1:849466379368:web:8ecb95ce11da2c6baf3fdd",
  measurementId: "G-85YGE5BXD8",
}

const app = initializeApp(FIREBASE_CONFIG)
const db = getFirestore(app)

export async function saveReport(data) {
  try {
    await addDoc(collection(db, 'reports'), { ...data, createdAt: new Date().toISOString() })
    return true
  } catch (e) {
    console.warn('Firebase save failed:', e.message)
    return false
  }
}
