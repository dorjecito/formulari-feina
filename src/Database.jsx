import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

function Database() {
  const [comunicats, setComunicats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const novaColleccio = collection(db, "comunicatsNova");
        const snapshot = await getDocs(novaColleccio);
        const dades = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Docs recuperats:", dades);
        setComunicats(dades);
        setLoading(false);
      } catch (error) {
        console.error("Error carregant comunicats:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const comunicatsFiltrats = [...comunicats].reverse().filter((comunicat) => {
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

  const celda = { border: "1px solid #ccc", padding: "8px", textAlign: "left" };

  if (loading) return <p>Carregant dades...</p>;

  if (comunicats.length === 0) {
    return (
      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <h2>No hi ha comunicats guardats</h2>
        <Link to="/home">
          <button>⬅️ Tornar al Formulari</button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Base de Dades de Comunicats</h2>

      <input
        type="text"
        placeholder="🔎 Introdueix una paraula per cercar..."
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

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead style={{ backgroundColor: "#4A5568", color: "white" }}>
          <tr>
            <th style={celda}>Data</th>
            <th style={celda}>Responsable Brigada</th>
            <th style={celda}>Oficial Responsable</th>
            <th style={celda}>Oficials</th>
            <th style={celda}>Peons</th>
            <th style={celda}>Eines</th>
            <th style={celda}>Tasques</th>
            <th style={celda}>Matrícula</th>
            <th style={celda}>Incidència</th>
            <th style={celda}>Ruta</th>
            <th style={celda}>Observacions</th>
          </tr>
        </thead>
        <tbody>
          {comunicatsFiltrats.map((c) => (
            <tr key={c.id}>
              <td style={celda}>{c.data || "-"}</td>
              <td style={celda}>{Array.isArray(c.responsableBrigada) ? c.responsableBrigada.join(", ") : c.responsableBrigada || "-"}</td>
              <td style={celda}>{Array.isArray(c.oficialResponsable) ? c.oficialResponsable.join(", ") : c.oficialResponsable || "-"}</td>
              <td style={celda}>{Array.isArray(c.oficial) ? c.oficial.join(", ") : c.oficial || "-"}</td>
              <td style={celda}>{Array.isArray(c.peo) ? c.peo.join(", ") : c.peo || "-"}</td>
              <td style={celda}>{Array.isArray(c.eines) ? c.eines.join(", ") : c.eines || "-"}</td>
              <td style={celda}>{Array.isArray(c.feines) ? c.feines.join(", ") : c.feines || "-"}</td>
              <td style={celda}>{Array.isArray(c.matricula) ? c.matricula.join(", ") : c.matricula || "-"}</td>
              <td style={celda}>{c.incidencia || "-"}</td>
              <td style={celda}>{c.ruta || "-"}</td>
              <td style={celda}>{c.observacions || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Link to="/home">
        <button style={{ marginTop: "20px" }}>⬅️ Tornar al Formulari</button>
      </Link>
    </div>
  );
}

export default Database;