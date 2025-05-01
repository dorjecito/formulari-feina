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
    <div>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correu" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contrasenya" />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}

export default Login;
