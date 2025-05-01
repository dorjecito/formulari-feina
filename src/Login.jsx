import { updatePassword } from "firebase/auth";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDoc, doc, setDoc } from "firebase/firestore";
import { auth } from "./firebase";
import { useNavigate } from "react-router-dom";

const db = getFirestore();

function Login() {
  const [novaContrasenya, setNovaContrasenya] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dades, setDades] = useState(null);
  const navigate = useNavigate();

  // 🔥 Carregar dades de l'usuari loguejat
  useEffect(() => {
    const fetchDades = async () => {
      if (auth.currentUser) {
        const docSnap = await getDoc(doc(db, "usuaris", auth.currentUser.uid));
        if (docSnap.exists()) {
          setDades(docSnap.data());
        }
      }
    };
    fetchDades();
  }, [auth.currentUser]);

  const handleCanviContrasenya = async () => {
  try {
    const usuari = auth.currentUser;
    await updatePassword(usuari, novaContrasenya);
    await setDoc(doc(db, "usuaris", usuari.uid), { haCanviatContrasenya: true }, { merge: true });
    alert("✅ Contrasenya actualitzada correctament!");
    navigate("/home");  // 👉 redirecciona a la pàgina principal
  } catch (error) {
    console.error("Error canviant la contrasenya:", error);
    alert("❌ Error canviant la contrasenya");
  }
};


  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);

      // 📥 Després de loguejar, carreguem dades de Firestore
      const docSnap = await getDoc(doc(db, "usuaris", auth.currentUser.uid));
      if (docSnap.exists()) {
        setDades(docSnap.data());
      }

      navigate("/home");
    } catch (error) {
      alert("Usuari o contrasenya incorrectes.");
    }
  };

  // 🔒 Si dades carregades i no ha canviat contrasenya → mostrar formulari canvi contrasenya
  if (dades && !dades.haCanviatContrasenya) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Canvia la contrasenya</h2>
        <input
          type="password"
          value={novaContrasenya}
          onChange={e => setNovaContrasenya(e.target.value)}
          placeholder="Nova contrasenya"
          style={{ padding: "8px", width: "200px", margin: "10px 0" }}
        />
        <br />
        <button onClick={handleCanviContrasenya}>Canviar</button>
      </div>
    );
  }

  // 🏠 Formulari de login
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
