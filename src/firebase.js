import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCj6edi2ZrsSv0mpbGh5gGDEIxmUSzFo6g",
  authDomain: "inventory-4614f.firebaseapp.com",
  projectId: "inventory-4614f",
  storageBucket: "inventory-4614f.firebasestorage.app",
  messagingSenderId: "252486694632",
  appId: "1:252486694632:web:2e3c7b5f66df1e76157b5d",
  measurementId: "G-0GBQJD9Q23"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
