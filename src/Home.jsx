import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import AppFinalFormulari from "./AppFinalFormulari";
import { DEMO_SESSION_KEY } from "./demo";

function Home({ isDemoMode = false }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    localStorage.removeItem(DEMO_SESSION_KEY);
    await signOut(auth);
    navigate("/"); // Torna al login
  };

  return (
    <div>
      <AppFinalFormulari
        isDemoMode={isDemoMode}
        topActions={
          <>
            <button
              type="button"
              onClick={() => navigate("/database")}
              className="button-primary"
            >
              📂 Veure comunicats
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="button-secondary"
            >
              🚪 Tancar sessió
            </button>
          </>
        }
      />
    </div>
  );
}

export default Home;
