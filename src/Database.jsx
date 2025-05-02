import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

const celda = { border: "1px solid #ccc", padding: "8px", textAlign: "left" };

// ✅ Funció segura per mostrar arrays, strings o valors nuls
const safeJoin = (valor) => {
 if (Array.isArray(valor)) return valor.join(", ");
 if (typeof valor === "string") return valor;
 if (valor !== undefined && valor !== null) return String(valor);
 return "-";
};

function Database() {
 const [comunicats, setComunicats] = useState([]);
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
       console.log("DOCS RECUPERATS:", dades);
       setComunicats(dades);
     } catch (error) {
       console.error("Error carregant comunicats:", error);
     } finally {
       setLoading(false);
     }
   };

   fetchData();
 }, []);

 if (loading) return <p>Carregant dades...</p>;

 if (comunicats.length === 0) {
   return (
     <div style={{ padding: "20px" }}>
       <h2>No hi ha comunicats guardats</h2>
       <Link to="/home">
         <button style={{ marginTop: "20px" }}>⬅️ Tornar al Formulari</button>
       </Link>
     </div>
   );
 }

 return (
   <div style={{ padding: "20px" }}>
     <h2>Base de Dades de Comunicats</h2>
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
         {comunicats.map((c) => (
           <tr key={c.id}>
             <td style={celda}>{c.data || "-"}</td>
             <td style={celda}>{safeJoin(c.responsableBrigada)}</td>
             <td style={celda}>{safeJoin(c.oficialResponsable)}</td>
             <td style={celda}>{safeJoin(c.oficial)}</td>
             <td style={celda}>{safeJoin(c.peo)}</td>
             <td style={celda}>{safeJoin(c.eines)}</td>
             <td style={celda}>{safeJoin(c.feines)}</td>
             <td style={celda}>{safeJoin(c.matricula)}</td>
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
