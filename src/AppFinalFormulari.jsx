// AppFinalFormulari.jsx — Versió final

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import emailjs from "emailjs-com";
import html2canvas from "html2canvas";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc } from "firebase/firestore";
import axios from "axios";

const firebaseConfig = {
  apiKey: "AIzaSyDmtoBkI9Xv9_yWnpxtjFvOe1gU6_UwsCU",
  authDomain: "formularifeinaapp.firebaseapp.com",
  projectId: "formularifeinaapp",
  storageBucket: "formularifeinaapp.firebasestorage.app",
  messagingSenderId: "834326933204",
  appId: "1:834326933204:web:d8c907d1585ea934e81541",
  measurementId: "G-GRSFRY32XS"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const center = [39.49240, 2.89174]; // Carrer de Castella, Llucmajor

export default function AppFinalFormulari() {
  const [formData, setFormData] = useState({
    data: "",
    responsableBrigada: "",
    oficialResponsable: "",
    oficial: [],
    peo: [],
    incidencia: "",
    eines: [],
    matricula: "",
    feines: [],
    ruta: "",
    observacions: "",
    to_email: "",
    telefon: "",
    reply_to: ""
  });

  const [statusMsg, setStatusMsg] = useState("");
  const [routeCoords, setRouteCoords] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [oficialsResponsables, setOficialsResponsables] = useState([]);
  const [oficials, setOficials] = useState([]);
  const [peons, setPeons] = useState([]);
  const [eines, setEines] = useState([]);
  const [matricules, setMatricules] = useState([]);
  const [tasques, setTasques] = useState([]);
  const [oficialsEmails, setOficialsEmails] = useState({});
  const [oficialsTelefons, setOficialsTelefons] = useState({});
  const mapRef = useRef();

  const apiKeyOpenAI = "***REMOVED***cjD7wGth2FpgFNBXwUZ0XN3c9KBM9jfHa0zeV4M_t990_cu-56_LZMrXUnZkaMb7iY7oFJm17aT3BlbkFJ4ViaRZWi_HrIy3py_X8mTycOk1JLK7tvSvmv2U8uszOBumXENqu-HG_ck8xEEx4pm1vkXlG6YA";

  const carregarConfiguracio = async () => {
    try {
      const docRef = doc(db, "configuracio_formulari", "default");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setResponsables(data.responsables || []);
        setOficialsResponsables(data.oficialsResponsables || []);
        setOficials(data.oficials || []);
        setPeons(data.peons || []);
        setEines(data.eines || []);
        setMatricules(data.matricules || []);
        setTasques(data.tasques || []);
        setOficialsEmails(data.oficialsEmails || {});
        setOficialsTelefons(data.oficialsTelefons || {});
      } else {
        await setDoc(docRef, {
          responsables: [],
          oficialsResponsables: [],
          oficials: [],
          peons: [],
          eines: [],
          matricules: [],
          tasques: [],
          oficialsEmails: {},
          oficialsTelefons: {}
        });
      }
    } catch (error) {
      console.error("Error carregant configuració:", error);
    }
  };

  const actualitzarConfiguracio = async (dataActualitzada) => {
    try {
      const docRef = doc(db, "configuracio_formulari", "default");
      await setDoc(docRef, dataActualitzada);
    } catch (error) {
      console.error("Error actualitzant configuració:", error);
    }
  };

  useEffect(() => {
    carregarConfiguracio();
  }, []);

  const afegirValor = (setFunc, val, camp) => {
    if (val && val.trim() !== "") {
      setFunc(prev => {
        const actualitzat = [...new Set([...prev, val.trim()])];
        actualitzarConfiguracio({
          responsables,
          oficialsResponsables,
          oficials,
          peons,
          eines,
          matricules,
          tasques,
          oficialsEmails,
          oficialsTelefons
        });
        return actualitzat;
      });
    }
  };

  const eliminarValor = (setFunc, val, camp) => {
    if (val && val.trim() !== "") {
      setFunc(prev => {
        const actualitzat = prev.filter(v => v !== val.trim());
        actualitzarConfiguracio({
          responsables,
          oficialsResponsables,
          oficials,
          peons,
          eines,
          matricules,
          tasques,
          oficialsEmails,
          oficialsTelefons
        });
        return actualitzat;
      });
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === "oficialResponsable" && {
        to_email: oficialsEmails[value] || "",
        telefon: oficialsTelefons[value] || ""
      })
    }));

    if (field === "ruta") fetchRoute(value);
  };

  const handleReset = () => {
    setFormData({
      data: "",
      responsableBrigada: [],
      oficialResponsable: [],
      oficial: [],
      peo: [],
      incidencia: "",
      eines: [],
      matricula: [],
      feines: [],
      ruta: "",
      observacions: "",
      to_email: "",
      telefon: "",
      reply_to: ""
    });
    setRouteCoords([]);
    setStatusMsg("Formulari reiniciat ✨");
  };

  const handleEmailPhoneChange = (nom, nouEmail, nouTelefon) => {
    const updatedEmails = { ...oficialsEmails, [nom]: nouEmail };
    const updatedTelefons = { ...oficialsTelefons, [nom]: nouTelefon };
    setOficialsEmails(updatedEmails);
    setOficialsTelefons(updatedTelefons);

    actualitzarConfiguracio({
      responsables,
      oficialsResponsables,
      oficials,
      peons,
      eines,
      matricules,
      tasques,
      oficialsEmails: updatedEmails,
      oficialsTelefons: updatedTelefons
    });

    if (formData.oficialResponsable === nom) {
      setFormData(prev => ({ ...prev, to_email: nouEmail, telefon: nouTelefon }));
    }
  };

  const fetchRoute = async (destination) => {
  if (!destination || destination.trim().length < 4) {
    console.warn("❗ Ruta no vàlida o massa curta. No es generarà cap ruta.");
    setRouteCoords([]);
    return;
  }

  setStatusMsg("Carregant ruta...");

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json`);
    const data = await res.json();

    if (!data.length) {
      throw new Error("Adreça no trobada.");
    }

    const coords = [parseFloat(data[0].lon), parseFloat(data[0].lat)];

    const routeRes = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        Authorization: "5b3ce3597851110001cf6248b9be20c2ac9f4960afb9260f5d30097e",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ coordinates: [[2.89174, 39.49240], coords] })
    });

    if (!routeRes.ok) {
      throw new Error("Error carregant la ruta des d'OpenRouteService.");
    }

    const geojson = await routeRes.json();
    const polyline = geojson.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    setRouteCoords(polyline);
    setStatusMsg("Ruta carregada ✅");

  } catch (err) {
    console.error("Error generant la ruta:", err.message);
    setStatusMsg("No s'ha pogut carregar la ruta ❌");
    setRouteCoords([]);
  }
};

  const capturarMapa = async () => {
    const mapNode = mapRef.current;
    if (!mapNode) return "";
    const canvas = await html2canvas(mapNode._container);
    return canvas.toDataURL("image/png");
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    let imgMapa = "";

    if (mapRef.current) {
      const canvas = await html2canvas(mapRef.current._container);
      imgMapa = canvas.toDataURL("image/png");
    }

    const dataFormulari = formData.data || new Date().toISOString().split('T')[0];
    const dadesAmbMapa = { ...formData, mapa: imgMapa };

    const refComunicats = collection(db, "comunicatsNova");
    await addDoc(refComunicats, dadesAmbMapa);

    await emailjs.send("service_7axqbdq", "template_t97ykta", { ...formData, mapa: imgMapa }, "yDXUC6WUOq8lxjst_");

    alert("✅ Formulari enviat i desat correctament!");

  } catch (err) {
    console.error("Error enviant o desant:", err);
    alert("❌ Hi ha hagut un error en desar o enviar el formulari.");
  }
};


  const blocOpcions = (label, valors, setFunc, camp) => (
    <div className="space-y-2">
      <label className="font-semibold">{label}</label>
      <div className="flex gap-2">
        <input id={`nou-${camp}`} placeholder={`Nou ${camp}`} className="border p-1 rounded w-full" />
        <button type="button" onClick={() => {
          const nouValor = document.getElementById(`nou-${camp}`).value;
          if (nouValor) afegirValor(setFunc, nouValor.trim(), camp);
        }} className="bg-green-500 text-white px-2 py-1 rounded">Afegir</button>
        <button type="button" onClick={() => {
          const valorEliminar = document.getElementById(`nou-${camp}`).value;
          if (valorEliminar) eliminarValor(setFunc, valorEliminar.trim(), camp);
        }} className="bg-red-500 text-white px-2 py-1 rounded">Eliminar</button>
      </div>
      <select multiple value={formData[camp]} onChange={e => handleChange(camp, Array.from(e.target.selectedOptions).map(o => o.value))} className="border p-2 rounded w-full">
        {valors.map((v, i) => <option key={i} value={v}>{v}</option>)}
      </select>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow space-y-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-4">
        <img src="/ajuntament.png" alt="Logo" className="h-10" />
        Comunicat de feina · Brigada de jardineria
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="date" value={formData.data} onChange={e => handleChange("data", e.target.value)} className="border p-2 rounded w-full" />

        {blocOpcions("Responsables Brigada", responsables, setResponsables, "responsableBrigada")}
        {blocOpcions("Oficials Responsables", oficialsResponsables, setOficialsResponsables, "oficialResponsable")}

        
        {/* Bloc per afegir nous oficials responsables */}
        <div className="space-y-2 border-t pt-4 mt-4">
          <label className="font-semibold">Afegir nou oficial responsable</label>
          <input id="nouOficialResponsable" placeholder="Nom oficial" className="border p-1 rounded w-full" />
          <input id="nouEmailResponsable" placeholder="Email oficial" className="border p-1 rounded w-full" />
          <input id="nouTelefonResponsable" placeholder="Telèfon oficial" className="border p-1 rounded w-full" />
          <button
            type="button"
            onClick={() => {
              const nouNom = document.getElementById("nouOficialResponsable").value.trim();
              const nouEmail = document.getElementById("nouEmailResponsable").value.trim();
              const nouTelefon = document.getElementById("nouTelefonResponsable").value.trim();

              if (nouNom && nouEmail) {
                const actualitzats = [...new Set([...oficialsResponsables, nouNom])];
                setOficialsResponsables(actualitzats);
                setOficialsEmails(prev => ({ ...prev, [nouNom]: nouEmail }));
                setOficialsTelefons(prev => ({ ...prev, [nouNom]: nouTelefon }));

                actualitzarConfiguracio({
                  responsables,
                  oficialsResponsables: actualitzats,
                  oficials,
                  peons,
                  eines,
                  matricules,
                  tasques,
                  oficialsEmails: { ...oficialsEmails, [nouNom]: nouEmail },
                  oficialsTelefons: { ...oficialsTelefons, [nouNom]: nouTelefon }
                });

                document.getElementById("nouOficialResponsable").value = "";
                document.getElementById("nouEmailResponsable").value = "";
                document.getElementById("nouTelefonResponsable").value = "";

                alert("✅ Nou responsable afegit!");
              } else {
                alert("❗ Cal posar com a mínim Nom i Email");
              }
            }}
            className="bg-green-500 text-white px-4 py-2 rounded mt-2"
          >
            Afegir nou responsable
          </button>
        </div>

        {blocOpcions("Oficials", oficials, setOficials, "oficial")}
        {blocOpcions("Peons", peons, setPeons, "peo")}
        {blocOpcions("Eines", eines, setEines, "eines")}
        {blocOpcions("Matrícules", matricules, setMatricules, "matricula")}
        {blocOpcions("Tasques", tasques, setTasques, "feines")}

        <input type="text" value={formData.incidencia} onChange={e => handleChange("incidencia", e.target.value)} placeholder="Número d'incidència" className="border p-2 rounded w-full" />
        <input type="text" value={formData.ruta} onChange={e => handleChange("ruta", e.target.value)} placeholder="Ruta a seguir" className="border p-2 rounded w-full" />
        <textarea value={formData.observacions} onChange={e => handleChange("observacions", e.target.value)} placeholder="Observacions" className="border p-2 rounded w-full"></textarea>

        <input type="email" value={formData.to_email} onChange={e => handleChange("to_email", e.target.value)} placeholder="Email destinatari" className="border p-2 rounded w-full" />
        <input type="text" value={formData.telefon} onChange={e => handleChange("telefon", e.target.value)} placeholder="Telèfon destinatari" className="border p-2 rounded w-full" />

        <div className="flex gap-4">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Enviar</button>
          <button type="button" onClick={handleReset} className="bg-gray-400 text-white px-4 py-2 rounded">Neteja</button>
        </div>

        {statusMsg && <p className="text-sm text-gray-600 italic">{statusMsg}</p>}
      </form>

      <MapContainer center={center} zoom={13} style={{ height: "300px" }} whenCreated={mapInstance => (mapRef.current = mapInstance)}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={center} icon={L.icon({ iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png" })}>
          <Popup>Sortida: Carrer de Castella, Llucmajor</Popup>
        </Marker>
        {routeCoords.length > 0 && <Polyline positions={routeCoords} color="blue" />}
      </MapContainer>
    </div>
  );
}
