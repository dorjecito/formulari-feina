import { initializeApp } from "firebase/app";

// Aquí has de posar la teva configuració firebaseConfig:
const firebaseConfig = {
  apiKey: "AIzaSyDmtoBkI9Xv9_yWnpxtjFvOe1gU6_UwsCU",
  authDomain: "formularifeinaapp.firebaseapp.com",
  projectId: "formularifeinaapp",
  storageBucket: "formularifeinaapp.firebasestorage.app",
  messagingSenderId: "834326933204",
  appId: "1:834326933204:web:d8c907d1585ea934e81541",
  measurementId: "G-GRSFRY32XS"

};

// Inicialitzar Firebase només 1 vegada
initializeApp(firebaseConfig);



import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

import Login from "./Login";
import Home from "./Home"; // el teu formulari aquí
import Database from "./Database"; // la vista dels comunicats

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <p>Carregant...</p>;
  console.log("Usuari logat?", user);


  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/home" /> : <Login />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/" />} />
        <Route path="/database" element={user ? <Database /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
