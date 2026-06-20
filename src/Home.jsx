import { useNavigate } from "react-router-dom";
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
    <div>
      <AppFinalFormulari
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
