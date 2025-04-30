import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import AppFinalFormulari from "./AppFinalFormulari";

function Home() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/"); // Torna al login
  };

  return (
    <div style={{ textAlign: "center", marginTop: "30px" }}>
      <AppFinalFormulari />
      <div style={{ marginTop: "20px" }}>
        <Link to="/database">
          <button style={{ marginRight: "10px", padding: "10px 20px" }}>Veure Comunicats</button>
        </Link>
        <button onClick={handleLogout} style={{ padding: "10px 20px" }}>
          Tancar Sessió
        </button>
      </div>
    </div>
  );
}

export default Home;

