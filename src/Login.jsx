import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/home");
    } catch (error) {
      alert("Usuari o contrasenya incorrectes.");
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

      {/* Logo */}
      <img src="/ajuntament.png" alt="Logo Ajuntament" style={{ width: "120px", marginBottom: "30px" }} />

      {/* Formulari de login */}
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
    </div>
  );
}

export default Login;
