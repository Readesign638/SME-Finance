import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type QuerySnapshot
} from "firebase/firestore";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserSessionPersistence,
  type User
} from "firebase/auth";

import type { Transaction } from "../types/schema";

export type TransactionInput = Omit<Transaction, 'id'>;

const firebaseConfig = {
  apiKey: "AIzaSyDEuaxy66-JcuOyrqRD0FCQxGvOZNmvzMQ",
  authDomain: "sme-finance-app-c02eb.firebaseapp.com",
  projectId: "sme-finance-app-c02eb",
  storageBucket: "sme-finance-app-c02eb.firebasestorage.app",
  messagingSenderId: "986217939926",
  appId: "1:986217939926:web:6eede5e4f7769a7422da77"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore ONCE
export const db = getFirestore(app);

// Keep user logged in for the session
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence);

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const logoutUser = () => signOut(auth);

export const createTransaction = async (userId: string, data: TransactionInput) => {
  return await addDoc(collection(db, "transactions"), {
    ...data,
    userId,
    createdAt: serverTimestamp()
  });
};

export const editTransaction = async (id: string, data: Partial<TransactionInput>) => {
  const docRef = doc(db, "transactions", id);
  return await updateDoc(docRef, data);
};

export const subscribeToTransactions = (
  userId: string,
  callback: (data: Transaction[]) => void
) => {
  const q = query(
    collection(db, "transactions"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const items = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as Transaction[];
    callback(items);
  });
};

export const removeTransaction = async (id: string) => {
  return await deleteDoc(doc(db, "transactions", id));
};