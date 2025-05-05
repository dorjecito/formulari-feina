import React, { useState } from "react";
import { auth } from "./firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [missatge, setMissatge] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/home");
    } catch (err) {
      alert("Error d'inici de sessió: usuari o contrasenya incorrectes.");
      console.error(err);
    }
  };

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setMissatge("T'hem enviat un correu per restablir la contrasenya.");
    } catch (err) {
      setMissatge("Error enviant l'enllaç. Comprova l'adreça.");
      console.error(err);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#f0f4f8",
      padding: "20px"
    }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#2B6CB0", marginBottom: "10px" }}>
        Ajuntament de Llucmajor
      </h1>

      <h2 style={{ fontSize: "1.5rem", color: "#4A5568", marginBottom: "20px" }}>
        Comunicats de feina - Brigada
      </h2>

      <img src="/ajuntament.png" alt="Logo Ajuntament" style={{ width: "120px", marginBottom: "30px" }} />

      {!showResetForm ? (
        <>
          <form onSubmit={handleLogin} style={{
            background: "white",
            padding: "30px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            width: "100%",
            maxWidth: "400px",
            display: "flex",
            flexDirection: "column",
            gap: "15px"
          }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correu electrònic"
              required
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contrasenya"
              required
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
            <button type="submit" style={{
              padding: "12px",
              backgroundColor: "#2B6CB0",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem"
            }}>
              Entrar
            </button>
          </form>

          <p style={{ marginTop: "15px" }}>
            <button
              onClick={() => setShowResetForm(true)}
              style={{
                background: "none",
                border: "none",
                color: "#2B6CB0",
                textDecoration: "underline",
                cursor: "pointer"
              }}
            >
              Has oblidat la teva contrasenya?
            </button>
          </p>
        </>
      ) : (
        <div style={{
          background: "white",
          padding: "30px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center"
        }}>
          <h3>Recupera la teva contrasenya</h3>
          <p>Introdueix el teu correu electrònic i t'enviarem un enllaç per restablir-la.</p>
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="Correu electrònic"
            required
            style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", marginBottom: "15px" }}
          />
          <button
            onClick={handleResetPassword}
            style={{
              padding: "12px",
              backgroundColor: "#2B6CB0",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
              width: "100%"
            }}
          >
            Envia enllaç
          </button>
          <p style={{ color: "green", marginTop: "15px" }}>{missatge}</p>
          <p style={{ marginTop: "15px" }}>
            <button
              onClick={() => { setShowResetForm(false); setMissatge(""); }}
              style={{
                background: "none",
                border: "none",
                color: "#2B6CB0",
                textDecoration: "underline",
                cursor: "pointer"
              }}
            >
              ⬅️ Torna a l'inici de sessió
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

export default Login;