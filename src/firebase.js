import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDmtoBkI9Xv9_yWnpxtjFvOe1gU6_UwsCU",
  authDomain: "formularifeinaapp.firebaseapp.com",
  projectId: "formularifeinaapp",
  storageBucket: "formularifeinaapp.firebasestorage.app",
  messagingSenderId: "834326933204",
  appId: "1:834326933204:web:d8c907d1585ea934e81541",
  measurementId: "G-GRSFRY32XS",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;