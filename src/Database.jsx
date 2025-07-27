// Database.jsx — amb vista prèvia imprimible per cada comunicat i opció de guardar com a PDF

import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";

export default function Database() {
  const [comunicats, setComunicats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [comunicatSeleccionat, setComunicatSeleccionat] = useState(null);

  useEffect(() => {
    fetchComunicats();
  }, []);

  const fetchComunicats = async () => {
    const querySnapshot = await getDocs(collection(db, "comunicatsNova"));
    const dades = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setComunicats(dades);
  };

  const eliminarComunicat = async (id) => {
    if (window.confirm("Vols eliminar aquest comunicat? Aquesta acció no es pot desfer.")) {
      await deleteDoc(doc(db, "comunicatsNova", id));
      fetchComunicats();
    }
  };

  const descarregarPDF = (comunicat) => {
    const docu = new jsPDF();
    docu.setFontSize(14);
    docu.text("Vista de comunicat", 14, 20);
    const linies = [
      `Data: ${comunicat.data || ""}`,
      `Responsable Brigada: ${comunicat.responsableBrigada || ""}`,
      `Oficial Responsable: ${comunicat.oficialResponsable || ""}`,
      `Oficials: ${(comunicat.oficial || []).join(", ")}`,
      `Peons: ${(comunicat.peo || []).join(", ")}`,
      `Eines: ${(comunicat.eines || []).join(", ")}`,
      `Tasques: ${(comunicat.feines || []).join(", ")}`,
      `Matrícula: ${comunicat.matricula || ""}`,
      `Incidència: ${comunicat.incidencia || ""}`,
      `Ruta: ${comunicat.ruta || ""}`,
      `Observacions: ${comunicat.observacions || ""}`
    ];
    linies.forEach((t, i) => docu.text(t, 14, 30 + i * 10));
    docu.save(`comunicat_${comunicat.data || "sense_data"}.pdf`);
  };

  const comunicatsFiltrats = comunicats.filter(c =>
    Object.values(c).some(val => val && val.toString().toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const celda = {
    border: "1px solid #ddd",
    padding: "10px",
    textAlign: "left",
    fontSize: "0.9rem",
    verticalAlign: "top"
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2 style={{ textAlign: "center", fontSize: "1.8rem", fontWeight: "bold", marginBottom: "20px" }}>
        🗂️ Base de Dades de Comunicats
      </h2>

      <input
        type="text"
        placeholder="🔎 Escriu per cercar comunicats..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          display: "block",
          margin: "0 auto 30px",
          padding: "10px 15px",
          width: "90%",
          maxWidth: "500px",
          borderRadius: "10px",
          border: "1px solid #ccc",
          boxShadow: "1px 1px 5px rgba(0,0,0,0.1)",
          fontSize: "1rem"
        }}
      />

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "1200px" }}>
          <thead style={{ position: "sticky", top: 0, backgroundColor: "#2D3748", color: "#fff", zIndex: 1 }}>
            <tr>
              {["Data", "Responsable Brigada", "Oficial Responsable", "Oficials", "Peons",
                "Eines", "Tasques", "Matrícula", "Incidència", "Ruta", "Observacions", ""]
                .map((t, i) => (
                  <th key={i} style={{ ...celda, backgroundColor: "#2D3748", color: "#fff" }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comunicatsFiltrats.map((c, i) => (
              <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? "#f9f9f9" : "#fff" }}>
                <td style={celda}>{c.data}</td>
                <td style={celda}>{c.responsableBrigada}</td>
                <td style={celda}>{c.oficialResponsable}</td>
                <td style={celda}>{(c.oficial || []).join(", ")}</td>
                <td style={celda}>{(c.peo || []).join(", ")}</td>
                <td style={celda}>{(c.eines || []).join(", ")}</td>
                <td style={celda}>{(c.feines || []).join(", ")}</td>
                <td style={celda}>{c.matricula}</td>
                <td style={celda}>{c.incidencia}</td>
                <td style={celda}>{c.ruta}</td>
                <td style={celda}>{c.observacions}</td>
                <td style={{ ...celda, textAlign: "center" }}>
                  <button onClick={() => setComunicatSeleccionat(c)} style={{
                    backgroundColor: "#3182CE",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    marginBottom: "6px"
                  }}>👁️</button>
                  <br />
                  <button onClick={() => eliminarComunicat(c.id)} style={{
                    backgroundColor: "#E53E3E",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "6px 10px",
                    cursor: "pointer"
                  }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comunicatSeleccionat && (
        <div style={{
          backgroundColor: "#fff",
          border: "1px solid #ccc",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          margin: "30px auto",
          maxWidth: "600px"
        }}>
          <h3 style={{ textAlign: "center", marginBottom: "20px" }}>Vista prèvia de comunicat</h3>
          <p><strong>Data:</strong> {comunicatSeleccionat.data}</p>
          <p><strong>Responsable Brigada:</strong> {comunicatSeleccionat.responsableBrigada}</p>
          <p><strong>Oficial Responsable:</strong> {comunicatSeleccionat.oficialResponsable}</p>
          <p><strong>Oficials:</strong> {(comunicatSeleccionat.oficial || []).join(", ")}</p>
          <p><strong>Peons:</strong> {(comunicatSeleccionat.peo || []).join(", ")}</p>
          <p><strong>Eines:</strong> {(comunicatSeleccionat.eines || []).join(", ")}</p>
          <p><strong>Tasques:</strong> {(comunicatSeleccionat.feines || []).join(", ")}</p>
          <p><strong>Matrícula:</strong> {comunicatSeleccionat.matricula}</p>
          <p><strong>Incidència:</strong> {comunicatSeleccionat.incidencia}</p>
          <p><strong>Ruta:</strong> {comunicatSeleccionat.ruta}</p>
          <p><strong>Observacions:</strong> {comunicatSeleccionat.observacions}</p>
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <button onClick={() => descarregarPDF(comunicatSeleccionat)} style={{
              backgroundColor: "#2B6CB0",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "10px 20px",
              cursor: "pointer",
              marginRight: "10px"
            }}>
              📄 Descarregar PDF
            </button>
            <button onClick={() => setComunicatSeleccionat(null)} style={{
              backgroundColor: "#A0AEC0",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "10px 20px",
              cursor: "pointer"
            }}>
              Tancar vista prèvia
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <Link to="/home">
          <button style={{
            padding: "10px 20px",
            backgroundColor: "#4A5568",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold"
          }}>
            ⬅️ Tornar al Formulari
          </button>
        </Link>
      </div>
    </div>
  );
}