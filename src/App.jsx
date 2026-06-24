import "./firebase";

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

import Login from "./Login";
import Home from "./Home";
import Database from "./Database";
import AppFinalFormulari from "./AppFinalFormulari";
import { DEMO_SESSION_KEY, isDemoUser } from "./demo";

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
  const isDemoMode =
    isDemoUser(user) || localStorage.getItem(DEMO_SESSION_KEY) === "true";

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/home" /> : <Login />}
        />

        <Route
          path="/home"
          element={user ? <Home isDemoMode={isDemoMode} /> : <Navigate to="/" />}
        />

        <Route
          path="/database"
          element={user ? <Database isDemoMode={isDemoMode} /> : <Navigate to="/" />}
        />

        <Route
          path="/editar/:id"
          element={user ? <AppFinalFormulari isDemoMode={isDemoMode} /> : <Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
