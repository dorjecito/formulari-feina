import "./firebase";

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

import Login from "./Login";
import Home from "./Home";
import Database from "./Database";
import AppFinalFormulari from "./AppFinalFormulari";

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
        <Route
          path="/"
          element={user ? <Navigate to="/home" /> : <Login />}
        />

        <Route
          path="/home"
          element={user ? <Home /> : <Navigate to="/" />}
        />

        <Route
          path="/database"
          element={user ? <Database /> : <Navigate to="/" />}
        />

        <Route
          path="/editar/:id"
          element={user ? <AppFinalFormulari /> : <Navigate to="/" />}
        />
      </Routes>
    </Router>
  );
}

export default App;