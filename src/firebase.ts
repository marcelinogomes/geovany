import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { toast } from "sonner";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app, firebaseConfig.storageBucket);
export const googleProvider = new GoogleAuthProvider();

export const login = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// User-friendly error messages
export const getUserFriendlyErrorMessage = (error: any) => {
  let message = "Ocorreu um erro inesperado.";
  try {
    const errObj = typeof error === 'object' && error !== null && 'message' in error ? JSON.parse(error.message as string) : { error: String(error) };
    const errCode = errObj.error.toLowerCase();
    
    if (errCode.includes("permission-denied")) {
      message = "Você não tem permissão para realizar esta ação.";
    } else if (errCode.includes("unavailable")) {
      message = "O serviço está temporariamente indisponível. Tente novamente mais tarde.";
    } else if (errCode.includes("quota-exceeded")) {
      message = "Lamentamos, mas atingimos o limite de uso diário. Tente novamente amanhã.";
    } else if (errCode.includes("not-found")) {
      message = "O item solicitado não foi encontrado.";
    }
  } catch (e) {
    // Falls back to generic message string if not JSON, check simple string
    const errStr = String(error).toLowerCase();
    if (errStr.includes("permission-denied")) message = "Você não tem permissão para realizar esta ação.";
  }
  return message;
};

export const handleFirestoreError = (error: any, operationType: string, path: string | null = null) => {
  console.error(`Firestore ${operationType} failed at ${path || 'unknown path'}`, error);
  const info = {
    error: error?.message || String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || 'anonymous',
      email: auth.currentUser?.email || 'none',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || true,
    }
  };
  
  toast.error(getUserFriendlyErrorMessage(error));
  
  throw new Error(JSON.stringify(info));
};
