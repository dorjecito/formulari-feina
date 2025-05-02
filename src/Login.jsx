import React, { useState } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Login() {
  const [novaContrasenya, setNovaContrasenya] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dades, setDades] = useState({ haCanviatContrasenya: true }); // inicialment true
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();
  try {
    console.log("Intentant login per a:", email);

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const usuari = userCredential.user;
    console.log("Usuari autenticat:", usuari.uid);

    const docRef = doc(db, "usuaris", usuari.uid);
    const docSnap = await getDoc(docRef);
    console.log("Firestore docSnap:", docSnap.exists() ? docSnap.data() : "No existeix el document!");

    if (docSnap.exists() && !docSnap.data().haCanviatContrasenya) {
      setDades({ haCanviatContrasenya: false }); // mostrar formulari canvi
    } else {
      console.log("Accés normal a /home");
      navigate("/home"); // accés normal
    }
  } catch (err) {
    console.error("Error login:", err);
    alert("Error d'inici de sessió: usuari o contrasenya incorrectes.");
  }
};

  const handleCanviContrasenya = async () => {
    try {
      const usuari = auth.currentUser;
      await updatePassword(usuari, novaContrasenya);
      await setDoc(doc(db, "usuaris", usuari.uid), { haCanviatContrasenya: true }, { merge: true });
      alert("✅ Contrasenya canviada correctament!");
      navigate("/home");
    } catch (err) {
      alert("❌ Error canviant la contrasenya.");
      console.error(err);
    }
  };

  if (!dades.haCanviatContrasenya) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Canvia la contrasenya</h2>
        <input
          type="password"
          value={novaContrasenya}
          onChange={(e) => setNovaContrasenya(e.target.value)}
          placeholder="Nova contrasenya"
          style={{ padding: "8px", margin: "10px" }}
        />
        <br />
        <button onClick={handleCanviContrasenya} style={{ padding: "10px", backgroundColor: "#2B6CB0", color: "white" }}>
          Canviar
        </button>
      </div>
    );
  }

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
