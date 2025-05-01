import { signInWithEmailAndPassword } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { auth, db } from "./firebase"; // assegura't que exportes auth i db correctament
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [novaContrasenya, setNovaContrasenya] = useState("");
  const [dades, setDades] = useState({ haCanviatContrasenya: true });
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const usuari = userCredential.user;

      // 👇 Comprovem si ha canviat la contrasenya a Firestore
      const docRef = doc(db, "usuaris", usuari.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && !docSnap.data().haCanviatContrasenya) {
        setDades({ haCanviatContrasenya: false });
      } else {
        setDades({ haCanviatContrasenya: true });
        navigate("/home"); // ja pot entrar si la contrasenya està canviada
      }
    } catch (error) {
      alert("Usuari o contrasenya incorrectes.");
      console.error("Error login:", error);
    }
  };

  const handleCanviContrasenya = async () => {
    try {
      const usuari = auth.currentUser;
      await updatePassword(usuari, novaContrasenya);
      await setDoc(doc(db, "usuaris", usuari.uid), { haCanviatContrasenya: true }, { merge: true });
      alert("✅ Contrasenya actualitzada correctament!");
      navigate("/home");
    } catch (error) {
      console.error("Error canviant la contrasenya:", error);
      alert("❌ Error canviant la contrasenya");
    }
  };

  if (!dades.haCanviatContrasenya) {
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

    {mostrarCanvi ? (
      <div style={{
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
        <h3>Canvia la contrasenya</h3>
        <input
          type="password"
          value={novaContrasenya}
          onChange={e => setNovaContrasenya(e.target.value)}
          placeholder="Nova contrasenya"
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
        />
        <button onClick={handleCanviContrasenya} style={{
          padding: "12px",
          backgroundColor: "#2B6CB0",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "1rem"
        }}>
          Canviar
        </button>
      </div>
    ) : (
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
    )}
  </div>
);

export default Login;
