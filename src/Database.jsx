// Database.jsx — amb vista prèvia imprimible, PDF, editar, eliminar,
// filtres, paginació visual i resum per mesos

import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { Link, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

export default function Database() {
  const avui = new Date();
  const anyActual = avui.getFullYear();
  const mesActual = avui.getMonth() + 1;

  const [comunicats, setComunicats] = useState([]);
  const [totsElsComunicats, setTotsElsComunicats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [comunicatSeleccionat, setComunicatSeleccionat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtreAny, setFiltreAny] = useState(String(anyActual));
  const [filtreMes, setFiltreMes] = useState(String(mesActual));
  const [paginaActual, setPaginaActual] = useState(1);

  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 10;

  const mesos = [
    "Gener",
    "Febrer",
    "Març",
    "Abril",
    "Maig",
    "Juny",
    "Juliol",
    "Agost",
    "Setembre",
    "Octubre",
    "Novembre",
    "Desembre",
  ];

  useEffect(() => {
    fetchComunicats();
  }, [filtreAny, filtreMes]);

  useEffect(() => {
    fetchTotsElsComunicats();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [searchQuery, filtreAny, filtreMes]);

  const fetchComunicats = async () => {
    setLoading(true);

    try {
      const ref = collection(db, "comunicatsNova");
      let q = ref;

      if (filtreAny && filtreMes) {
        q = query(
          ref,
          where("any", "==", Number(filtreAny)),
          where("mes", "==", Number(filtreMes))
        );
      } else if (filtreAny) {
        q = query(ref, where("any", "==", Number(filtreAny)));
      } else if (filtreMes) {
        q = query(ref, where("mes", "==", Number(filtreMes)));
      }

      const querySnapshot = await getDocs(q);

      const dades = querySnapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .sort((a, b) => (b.data || "").localeCompare(a.data || ""));

      setComunicats(dades);
    } catch (error) {
      console.error("Error carregant comunicats:", error);
      setComunicats([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotsElsComunicats = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "comunicatsNova"));

      const dades = querySnapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .sort((a, b) => (b.data || "").localeCompare(a.data || ""));

      setTotsElsComunicats(dades);
    } catch (error) {
      console.error("Error carregant resum de comunicats:", error);
      setTotsElsComunicats([]);
    }
  };

  const eliminarComunicat = async (id) => {
    if (window.confirm("Vols eliminar aquest comunicat? Aquesta acció no es pot desfer.")) {
      await deleteDoc(doc(db, "comunicatsNova", id));

      if (comunicatSeleccionat?.id === id) {
        setComunicatSeleccionat(null);
      }

      fetchComunicats();
      fetchTotsElsComunicats();
    }
  };

  const formatValue = (value) => {
    if (Array.isArray(value)) return value.join(", ");
    return value || "";
  };

  const descarregarPDF = (comunicat) => {
    const docu = new jsPDF();
    docu.setFontSize(14);
    docu.text("Vista de comunicat", 14, 20);

    const linies = [
      `Data: ${formatValue(comunicat.data)}`,
      `Responsable Brigada: ${formatValue(comunicat.responsableBrigada)}`,
      `Oficial Responsable: ${formatValue(comunicat.oficialResponsable)}`,
      `Oficials: ${formatValue(comunicat.oficial)}`,
      `Peons: ${formatValue(comunicat.peo)}`,
      `Eines: ${formatValue(comunicat.eines)}`,
      `Tasques: ${formatValue(comunicat.feines)}`,
      `Matrícula: ${formatValue(comunicat.matricula)}`,
      `Incidència: ${formatValue(comunicat.incidencia)}`,
      `Ruta: ${formatValue(comunicat.ruta)}`,
      `Observacions: ${formatValue(comunicat.observacions)}`,
    ];

    linies.forEach((t, i) => docu.text(t, 14, 30 + i * 10));
    docu.save(`comunicat_${comunicat.data || "sense_data"}.pdf`);
  };

  const comunicatsFiltrats = useMemo(() => {
    return comunicats.filter((c) =>
      Object.values(c).some((val) => {
        if (!val) return false;

        if (Array.isArray(val)) {
          return val.join(", ").toLowerCase().includes(searchQuery.toLowerCase());
        }

        return val.toString().toLowerCase().includes(searchQuery.toLowerCase());
      })
    );
  }, [comunicats, searchQuery]);

  const resumPerMesos = useMemo(() => {
    const mapa = new Map();

    totsElsComunicats.forEach((c) => {
      if (!c.any || !c.mes) return;

      const clau = `${c.any}-${String(c.mes).padStart(2, "0")}`;

      if (!mapa.has(clau)) {
        mapa.set(clau, {
          any: Number(c.any),
          mes: Number(c.mes),
          total: 0,
        });
      }

      mapa.get(clau).total += 1;
    });

    return Array.from(mapa.values()).sort((a, b) => {
      if (b.any !== a.any) return b.any - a.any;
      return b.mes - a.mes;
    });
  }, [totsElsComunicats]);

  const totalPagines = Math.max(1, Math.ceil(comunicatsFiltrats.length / ITEMS_PER_PAGE));
  const inici = (paginaActual - 1) * ITEMS_PER_PAGE;
  const fi = inici + ITEMS_PER_PAGE;
  const comunicatsPagina = comunicatsFiltrats.slice(inici, fi);

  const anysDisponibles = [...new Set(totsElsComunicats.map((c) => c.any).filter(Boolean))].sort((a, b) => b - a);

  const celda = {
    border: "1px solid #ddd",
    padding: "10px",
    textAlign: "left",
    fontSize: "0.9rem",
    verticalAlign: "top",
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2
        style={{
          textAlign: "center",
          fontSize: "1.8rem",
          fontWeight: "bold",
          marginBottom: "20px",
        }}
      >
        🗂️ Base de Dades de Comunicats
      </h2>

      <input
        type="text"
        placeholder="🔎 Escriu per cercar comunicats..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          display: "block",
          margin: "0 auto 20px",
          padding: "10px 15px",
          width: "90%",
          maxWidth: "500px",
          borderRadius: "10px",
          border: "1px solid #ccc",
          boxShadow: "1px 1px 5px rgba(0,0,0,0.1)",
          fontSize: "1rem",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "15px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => {
            setFiltreAny(String(anyActual));
            setFiltreMes(String(mesActual));
          }}
          style={{
            padding: "10px 16px",
            backgroundColor: "#2B6CB0",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Aquest mes
        </button>

        <button
          onClick={() => {
            setFiltreAny(String(anyActual));
            setFiltreMes("");
          }}
          style={{
            padding: "10px 16px",
            backgroundColor: "#2F855A",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Aquest any
        </button>

        <button
          onClick={() => {
            setFiltreAny("");
            setFiltreMes("");
          }}
          style={{
            padding: "10px 16px",
            backgroundColor: "#718096",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Tots
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "25px",
          flexWrap: "wrap",
        }}
      >
        <select
          value={filtreAny}
          onChange={(e) => setFiltreAny(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        >
          <option value="">Tots els anys</option>
          {anysDisponibles.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          value={filtreMes}
          onChange={(e) => setFiltreMes(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        >
          <option value="">Tots els mesos</option>
          {mesos.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {resumPerMesos.length > 0 && (
        <div style={{ margin: "0 auto 25px", maxWidth: "1100px" }}>
          <h3
            style={{
              textAlign: "center",
              fontSize: "1.1rem",
              marginBottom: "15px",
              color: "#2D3748",
            }}
          >
            Resum per mesos
          </h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            {resumPerMesos.map((item) => {
              const actiu =
                String(item.any) === String(filtreAny) &&
                String(item.mes) === String(filtreMes);

              return (
                <button
                  key={`${item.any}-${item.mes}`}
                  onClick={() => {
                    setFiltreAny(String(item.any));
                    setFiltreMes(String(item.mes));
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: actiu ? "2px solid #2B6CB0" : "1px solid #CBD5E0",
                    backgroundColor: actiu ? "#EBF8FF" : "#fff",
                    color: "#2D3748",
                    cursor: "pointer",
                    fontWeight: actiu ? "bold" : "normal",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  {mesos[item.mes - 1]} {item.any} ({item.total})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: "center", marginBottom: "20px", color: "#4A5568" }}>
          Carregant comunicats...
        </p>
      ) : (
        <>
          <p style={{ textAlign: "center", marginBottom: "8px", color: "#4A5568" }}>
            Mostrant {comunicatsFiltrats.length} comunicat(s)
          </p>

          {comunicatsFiltrats.length > 0 && (
            <p style={{ textAlign: "center", marginBottom: "20px", color: "#718096" }}>
              Pàgina {paginaActual} de {totalPagines}
            </p>
          )}
        </>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "1200px" }}>
          <thead
            style={{
              position: "sticky",
              top: 0,
              backgroundColor: "#2D3748",
              color: "#fff",
              zIndex: 1,
            }}
          >
            <tr>
              {[
                "Data",
                "Responsable Brigada",
                "Oficial Responsable",
                "Oficials",
                "Peons",
                "Eines",
                "Tasques",
                "Matrícula",
                "Incidència",
                "Ruta",
                "Observacions",
                "Accions",
              ].map((t, i) => (
                <th key={i} style={{ ...celda, backgroundColor: "#2D3748", color: "#fff" }}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {comunicatsPagina.map((c, i) => (
              <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? "#f9f9f9" : "#fff" }}>
                <td style={celda}>{formatValue(c.data)}</td>
                <td style={celda}>{formatValue(c.responsableBrigada)}</td>
                <td style={celda}>{formatValue(c.oficialResponsable)}</td>
                <td style={celda}>{formatValue(c.oficial)}</td>
                <td style={celda}>{formatValue(c.peo)}</td>
                <td style={celda}>{formatValue(c.eines)}</td>
                <td style={celda}>{formatValue(c.feines)}</td>
                <td style={celda}>{formatValue(c.matricula)}</td>
                <td style={celda}>{formatValue(c.incidencia)}</td>
                <td style={celda}>{formatValue(c.ruta)}</td>
                <td style={celda}>{formatValue(c.observacions)}</td>

                <td style={{ ...celda, textAlign: "center", minWidth: "110px" }}>
                  <button
                    onClick={() => setComunicatSeleccionat(c)}
                    style={{
                      backgroundColor: "#3182CE",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      marginBottom: "6px",
                      width: "42px",
                    }}
                    title="Veure"
                  >
                    👁️
                  </button>

                  <br />

                  <button
                    onClick={() => navigate(`/editar/${c.id}`)}
                    style={{
                      backgroundColor: "#D69E2E",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      marginBottom: "6px",
                      width: "42px",
                    }}
                    title="Editar"
                  >
                    ✏️
                  </button>

                  <br />

                  <button
                    onClick={() => eliminarComunicat(c.id)}
                    style={{
                      backgroundColor: "#E53E3E",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      width: "42px",
                    }}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && comunicatsFiltrats.length === 0 && (
        <p style={{ textAlign: "center", marginTop: "25px", color: "#718096" }}>
          No hi ha comunicats amb aquests filtres.
        </p>
      )}

      {!loading && totalPagines > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginTop: "20px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
            disabled={paginaActual === 1}
            style={{
              padding: "10px 16px",
              backgroundColor: paginaActual === 1 ? "#CBD5E0" : "#4A5568",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: paginaActual === 1 ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            ← Anterior
          </button>

          <button
            onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPagines))}
            disabled={paginaActual === totalPagines}
            style={{
              padding: "10px 16px",
              backgroundColor: paginaActual === totalPagines ? "#CBD5E0" : "#4A5568",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: paginaActual === totalPagines ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            Següent →
          </button>
        </div>
      )}

      {comunicatSeleccionat && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            margin: "30px auto",
            maxWidth: "600px",
          }}
        >
          <h3 style={{ textAlign: "center", marginBottom: "20px" }}>
            Vista prèvia de comunicat
          </h3>

          <p><strong>Data:</strong> {formatValue(comunicatSeleccionat.data)}</p>
          <p><strong>Responsable Brigada:</strong> {formatValue(comunicatSeleccionat.responsableBrigada)}</p>
          <p><strong>Oficial Responsable:</strong> {formatValue(comunicatSeleccionat.oficialResponsable)}</p>
          <p><strong>Oficials:</strong> {formatValue(comunicatSeleccionat.oficial)}</p>
          <p><strong>Peons:</strong> {formatValue(comunicatSeleccionat.peo)}</p>
          <p><strong>Eines:</strong> {formatValue(comunicatSeleccionat.eines)}</p>
          <p><strong>Tasques:</strong> {formatValue(comunicatSeleccionat.feines)}</p>
          <p><strong>Matrícula:</strong> {formatValue(comunicatSeleccionat.matricula)}</p>
          <p><strong>Incidència:</strong> {formatValue(comunicatSeleccionat.incidencia)}</p>
          <p><strong>Ruta:</strong> {formatValue(comunicatSeleccionat.ruta)}</p>
          <p><strong>Observacions:</strong> {formatValue(comunicatSeleccionat.observacions)}</p>

          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <button
              onClick={() => descarregarPDF(comunicatSeleccionat)}
              style={{
                backgroundColor: "#2B6CB0",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              📄 Descarregar PDF
            </button>

            <button
              onClick={() => navigate(`/editar/${comunicatSeleccionat.id}`)}
              style={{
                backgroundColor: "#D69E2E",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              ✏️ Editar
            </button>

            <button
              onClick={() => setComunicatSeleccionat(null)}
              style={{
                backgroundColor: "#A0AEC0",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                cursor: "pointer",
              }}
            >
              Tancar vista prèvia
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <Link to="/home">
          <button
            style={{
              padding: "10px 20px",
              backgroundColor: "#4A5568",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ⬅️ Tornar al Formulari
          </button>
        </Link>
      </div>
    </div>
  );
}