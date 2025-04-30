import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

function Database() {
  const [comunicats, setComunicats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const novaColleccio = collection(db, "comunicatsNova");
        const snapshot = await getDocs(novaColleccio);

        let dades = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Ordenar per data (del més nou al més antic)
        dades = dades.sort((a, b) => {
          if (!a.data) return 1;
          if (!b.data) return -1;
          return new Date(b.data) - new Date(a.data);
        });

        setComunicats(dades);
      } catch (error) {
        console.error("Error carregant nous comunicats:", error);
      }
    };

    fetchData();
  }, []);

  const comunicatsFiltrats = comunicats.filter((comunicat) => {
    const query = searchQuery.toLowerCase();

    return (
      (comunicat.data && comunicat.data.toLowerCase().includes(query)) ||
      (comunicat.responsableBrigada && comunicat.responsableBrigada.join(", ").toLowerCase().includes(query)) ||
      (comunicat.oficialResponsable && comunicat.oficialResponsable.join(", ").toLowerCase().includes(query)) ||
      (comunicat.oficial && comunicat.oficial.join(", ").toLowerCase().includes(query)) ||
      (comunicat.peo && comunicat.peo.join(", ").toLowerCase().includes(query)) ||
      (comunicat.eines && comunicat.eines.join(", ").toLowerCase().includes(query)) ||
      (comunicat.feines && comunicat.feines.join(", ").toLowerCase().includes(query)) ||
      (comunicat.matricula && comunicat.matricula.join(", ").toLowerCase().includes(query)) ||
      (comunicat.ruta && comunicat.ruta.toLowerCase().includes(query)) ||
      (comunicat.incidencia && comunicat.incidencia.toLowerCase().includes(query)) ||
      (comunicat.observacions && comunicat.observacions.toLowerCase().includes(query))
    );
  });

  return (
    <div style={{ textAlign: "center", marginTop: "30px" }}>
      <h2>Base de Dades de Comunicats</h2>

      <input
        type="text"
        placeholder="🔎 Cerca comunicats..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          padding: "8px",
          margin: "20px 0",
          width: "60%",
          maxWidth: "400px",
          borderRadius: "8px",
          border: "1px solid #ccc"
        }}
      />

      {comunicats.length === 0 ? (
        <p>No hi ha comunicats guardats.</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#4A5568", color: "white" }}>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Data</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Responsable Brigada</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Oficial Responsable</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Oficials</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Peons</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Eines</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Tasques (Feines)</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Matrícula</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Ruta</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Incidència</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Observacions</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px" }}>Mapa</th>

                </tr>
              </thead>
              <tbody>
                {comunicatsFiltrats.map((comunicat) => (
                  <tr key={comunicat.id} style={{ backgroundColor: comunicat.incidencia ? "#F7FAFC" : "#EDF2F7" }}>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.data || "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.responsableBrigada?.join(", ") || "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.oficialResponsable?.join(", ") || "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.oficial?.join(", ") || "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.peo?.join(", ") || "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.eines?.join(", ") || "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.feines?.join(", ") || "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.matricula?.join(", ") || "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.ruta || "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.incidencia || "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.observacions || "-"}</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}>{comunicat.mapa ? (<img src={comunicat.mapa} alt="Mapa" style={{ width:  "120px", borderRadius: "8px" }} />
  ) : (
    "-"
  )}
</td>



                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "30px" }}>
            <Link to="/home">
              <button style={{
                padding: "12px 24px",
                fontSize: "16px",
                borderRadius: "8px",
                backgroundColor: "#2B6CB0",
                color: "white",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.3s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#2C5282"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#2B6CB0"}
              >
                ⬅️ Tornar al Formulari
              </button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default Database;
