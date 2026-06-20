// AppFinalFormulari.jsx — corregit per evitar doble enviament i guardar ruta compatible amb Firestore

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { useParams, useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./App.css";
import L from "leaflet";
import emailjs from "emailjs-com";
import html2canvas from "html2canvas";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import ImpressioComunicat from "./ImpressioComunicat";

const center = [39.4924, 2.89174]; // Carrer de Castella, Llucmajor

const emptyFormData = {
  data: "",
  responsableBrigada: [],
  oficialResponsable: [],
  oficial: [],
  peo: [],
  referenciaComunicat: "",
  incidencia: "",
  eines: [],
  matricula: [],
  feines: [],
  ruta: "",
  observacions: "",
  to_email: "",
  telefon: "",
  reply_to: "",
};

const convertirRutaPerFirestore = (coords) => {
  if (!Array.isArray(coords)) return [];
  return coords.map((punt) => ({
    lat: Number(punt[0]),
    lng: Number(punt[1]),
  }));
};

const convertirRutaDesDeFirestore = (coords) => {
  if (!Array.isArray(coords)) return [];
  return coords
    .filter(
      (punt) =>
        punt &&
        typeof punt.lat === "number" &&
        typeof punt.lng === "number"
    )
    .map((punt) => [punt.lat, punt.lng]);
};

const obtenirAnyMesReferencia = (dataFormulari) => {
  const dataBase = dataFormulari || new Date().toISOString().split("T")[0];
  const [any, mes] = dataBase.split("-");
  return {
    dataBase,
    any,
    mes,
    yyyymm: `${any}${mes}`,
  };
};

const formatReferencia = (yyyymm, numero) =>
  `CF-${yyyymm}-${String(numero).padStart(4, "0")}`;

const referenciaVisible = (comunicat) =>
  comunicat?.referenciaComunicat || comunicat?.incidencia || "Sense referència";

const esEmailValid = (email) => /\S+@\S+\.\S+/.test(email);

export default function AppFinalFormulari({ topActions = null }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const editId = id || null;

  const [formData, setFormData] = useState(emptyFormData);
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
  const [mapReady, setMapReady] = useState(false);
  const [enviant, setEnviant] = useState(false);

  const mapRef = useRef(null);
  const impressioRef = useRef(null);

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
          oficialsTelefons: {},
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

  useEffect(() => {
    const carregarComunicat = async () => {
      if (!editId) return;

      try {
        const docRef = doc(db, "comunicatsNova", editId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          alert("❌ El comunicat no existeix.");
          navigate("/database");
          return;
        }

        const data = docSnap.data();

        const normalitzat = {
          data: data.data || "",
          responsableBrigada: Array.isArray(data.responsableBrigada)
            ? data.responsableBrigada
            : data.responsableBrigada
            ? [data.responsableBrigada]
            : [],
          oficialResponsable: Array.isArray(data.oficialResponsable)
            ? data.oficialResponsable
            : data.oficialResponsable
            ? [data.oficialResponsable]
            : [],
          oficial: Array.isArray(data.oficial)
            ? data.oficial
            : data.oficial
            ? [data.oficial]
            : [],
          peo: Array.isArray(data.peo)
            ? data.peo
            : data.peo
            ? [data.peo]
            : [],
          referenciaComunicat: data.referenciaComunicat || "",
          incidencia: data.incidencia || "",
          eines: Array.isArray(data.eines)
            ? data.eines
            : data.eines
            ? [data.eines]
            : [],
          matricula: Array.isArray(data.matricula)
            ? data.matricula
            : data.matricula
            ? [data.matricula]
            : [],
          feines: Array.isArray(data.feines)
            ? data.feines
            : data.feines
            ? [data.feines]
            : [],
          ruta: data.ruta || "",
          observacions: data.observacions || "",
          to_email: data.to_email || "",
          telefon: data.telefon || "",
          reply_to: data.reply_to || "",
        };

        setFormData(normalitzat);

        if (Array.isArray(data.rutaCoords) && data.rutaCoords.length > 0) {
          setRouteCoords(convertirRutaDesDeFirestore(data.rutaCoords));
          setStatusMsg("Ruta carregada desada ✅");
        } else if (normalitzat.ruta) {
          fetchRoute(normalitzat.ruta);
        }

        setStatusMsg("Comunicat carregat per editar ✏️");
      } catch (error) {
        console.error("Error carregant comunicat:", error);
        alert("❌ Error carregant el comunicat.");
      }
    };

    carregarComunicat();
  }, [editId, navigate]);

  const getConfigActualitzada = (camp, actualitzat) => ({
    responsables: camp === "responsables" ? actualitzat : responsables,
    oficialsResponsables:
      camp === "oficialsResponsables" ? actualitzat : oficialsResponsables,
    oficials: camp === "oficials" ? actualitzat : oficials,
    peons: camp === "peons" ? actualitzat : peons,
    eines: camp === "eines" ? actualitzat : eines,
    matricules: camp === "matricules" ? actualitzat : matricules,
    tasques: camp === "tasques" ? actualitzat : tasques,
    oficialsEmails,
    oficialsTelefons,
  });

  const afegirValor = (setFunc, val, campConfig) => {
    if (val && val.trim() !== "") {
      setFunc((prev) => {
        const actualitzat = [...new Set([...prev, val.trim()])];
        actualitzarConfiguracio(getConfigActualitzada(campConfig, actualitzat));
        return actualitzat;
      });
    }
  };

  const eliminarValor = (setFunc, val, campConfig) => {
    if (val && val.trim() !== "") {
      setFunc((prev) => {
        const actualitzat = prev.filter((v) => v !== val.trim());
        actualitzarConfiguracio(getConfigActualitzada(campConfig, actualitzat));
        return actualitzat;
      });
    }
  };

  const handleChange = (field, value) => {
    let extra = {};

    if (field === "oficialResponsable") {
      const seleccionats = Array.isArray(value) ? value : value ? [value] : [];
      const primerSeleccionat = seleccionats[0] || "";
      extra = {
        to_email: oficialsEmails[primerSeleccionat] || "",
        telefon: oficialsTelefons[primerSeleccionat] || "",
      };
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...extra,
    }));

    if (field === "ruta") fetchRoute(value);
  };

  const toggleValorCamp = (camp, valor) => {
    const actuals = Array.isArray(formData[camp])
      ? formData[camp]
      : formData[camp]
      ? [formData[camp]]
      : [];

    const actualitzat = actuals.includes(valor)
      ? actuals.filter((item) => item !== valor)
      : [...actuals, valor];

    handleChange(camp, actualitzat);
  };

  const obtenirEmailsOficialsResponsables = () => {
    const seleccionats = Array.isArray(formData.oficialResponsable)
      ? formData.oficialResponsable
      : formData.oficialResponsable
      ? [formData.oficialResponsable]
      : [];

    const emails = [];

    seleccionats.forEach((nom) => {
      const email = oficialsEmails[nom];

      if (!email) {
        console.warn(`Oficial responsable sense email configurat: ${nom}`);
        return;
      }

      if (!esEmailValid(email)) {
        console.warn(`Email no vàlid per a l'oficial responsable ${nom}: ${email}`);
        return;
      }

      if (!emails.includes(email)) {
        emails.push(email);
      }
    });

    return emails;
  };

  const obtenirValorsOficialsResponsables = (mapaValors) => {
    const seleccionats = Array.isArray(formData.oficialResponsable)
      ? formData.oficialResponsable
      : formData.oficialResponsable
      ? [formData.oficialResponsable]
      : [];

    return seleccionats.reduce((valors, nom) => {
      const valor = mapaValors[nom];

      if (valor && !valors.includes(valor)) {
        valors.push(valor);
      }

      return valors;
    }, []);
  };

  const emailsDestinatarisVisibles = obtenirValorsOficialsResponsables(oficialsEmails);
  const telefonsDestinatarisVisibles = obtenirValorsOficialsResponsables(oficialsTelefons);
  const valorEmailsVisible =
    emailsDestinatarisVisibles.length > 0
      ? emailsDestinatarisVisibles.join(", ")
      : formData.to_email;
  const valorTelefonsVisible =
    telefonsDestinatarisVisibles.length > 0
      ? telefonsDestinatarisVisibles.join(", ")
      : formData.telefon;

  const handleReset = () => {
    setFormData(emptyFormData);
    setRouteCoords([]);
    setStatusMsg("Formulari reiniciat ✨");
  };

  const crearComunicatAmbReferencia = async (dadesAmbMapa, any, mes, yyyymm) => {
    return runTransaction(db, async (transaction) => {
      const counterRef = doc(db, "comptadorsComunicats", yyyymm);
      const nouComunicatRef = doc(collection(db, "comunicatsNova"));
      const counterSnap = await transaction.get(counterRef);

      const ultimNumero = counterSnap.exists()
        ? Number(counterSnap.data().ultimNumero || 0)
        : 0;
      const nouNumero = ultimNumero + 1;
      const referenciaComunicat = formatReferencia(yyyymm, nouNumero);

      transaction.set(
        counterRef,
        {
          any: Number(any),
          mes: Number(mes),
          ultimNumero: nouNumero,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      transaction.set(nouComunicatRef, {
        ...dadesAmbMapa,
        referenciaComunicat,
        createdAt: serverTimestamp(),
      });

      return { id: nouComunicatRef.id, referenciaComunicat };
    });
  };

  const enviarCorreuComunicat = async (dadesPerCorreu) => {
    const emailsResponsables = obtenirEmailsOficialsResponsables();
    const destinataris = emailsResponsables.length > 0
      ? emailsResponsables
      : dadesPerCorreu.to_email && esEmailValid(dadesPerCorreu.to_email)
      ? [dadesPerCorreu.to_email]
      : [];

    if (destinataris.length === 0) {
      console.warn("No s'ha trobat cap email vàlid per enviar el comunicat.");
      throw new Error("No hi ha cap destinatari vàlid per enviar el comunicat.");
    }

    for (const email of destinataris) {
      await emailjs.send(
        "service_7axqbdq",
        "template_t97ykta",
        { ...dadesPerCorreu, to_email: email },
        "yDXUC6WUOq8lxjst_"
      );
    }
  };

  const fetchRoute = async (destination) => {
    if (!destination || destination.trim().length < 4) {
      setRouteCoords([]);
      return;
    }

    setStatusMsg("Carregant ruta...");

    try {
      const queryPrincipal = destination.includes("Mallorca")
        ? destination
        : `${destination}, Mallorca, Spain`;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          queryPrincipal
        )}&format=json&limit=1`
      );

      let data = await res.json();

      if (!data.length) {
        console.warn("Intent 1 fallit, provant fallback...");

        const res2 = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            destination
          )}&format=json&limit=1`
        );

        data = await res2.json();
      }

      if (!data.length) {
        setStatusMsg("❌ No s'ha trobat la ruta");
        setRouteCoords([]);
        return;
      }

      const coords = [parseFloat(data[0].lon), parseFloat(data[0].lat)];

      const routeRes = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          method: "POST",
          headers: {
            Authorization: "5b3ce3597851110001cf6248b9be20c2ac9f4960afb9260f5d30097e",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ coordinates: [[2.89174, 39.4924], coords] }),
        }
      );

      if (!routeRes.ok) {
        throw new Error("Error carregant la ruta des d'OpenRouteService.");
      }

      const geojson = await routeRes.json();

      if (
        !geojson.features ||
        !geojson.features.length ||
        !geojson.features[0].geometry ||
        !geojson.features[0].geometry.coordinates
      ) {
        throw new Error("La ruta rebuda no és vàlida.");
      }

      const polyline = geojson.features[0].geometry.coordinates.map((c) => [
        c[1],
        c[0],
      ]);

      setRouteCoords(polyline);
      setStatusMsg("Ruta carregada ✅");
    } catch (err) {
      console.error("Error generant la ruta:", err.message);
      setStatusMsg("No s'ha pogut carregar la ruta ❌");
      setRouteCoords([]);
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (enviant) return;

  const haDeReenviar =
    !editId || e.nativeEvent?.submitter?.value === "reenviar";

  setEnviant(true);
  console.log("SUBMIT EXECUTAT");

  try {
    let imgMapa = "";

    try {
      if (!mapRef.current || !mapReady) {
        console.warn("⚠️ El mapa encara no està llest.");
      } else {
        if (routeCoords.length > 0) {
          const bounds = L.latLngBounds(routeCoords);
          mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }

        mapRef.current.invalidateSize();
        await new Promise((resolve) => setTimeout(resolve, 600));

        const mapContainer = mapRef.current.getContainer();

        const canvas = await html2canvas(mapContainer, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          scale: 0.5,
        });

        imgMapa = canvas.toDataURL("image/jpeg", 0.45);
      }
    } catch (error) {
      console.error("❌ Error capturant mapa:", error);
    }

    console.log("Mapa generat?", !!imgMapa);
    console.log("Longitud mapa:", imgMapa?.length || 0);
    console.log("Inici mapa:", imgMapa?.slice(0, 50) || "");

    if (!imgMapa) {
      alert("❌ No s'ha pogut capturar el mapa. Espera un moment i torna-ho a provar.");
      return;
    }

    if (imgMapa.length > 45000) {
      alert("❌ La imatge del mapa encara és massa gran per EmailJS.");
      return;
    }

    const {
      dataBase: dataFormulari,
      any,
      mes,
      yyyymm,
    } = obtenirAnyMesReferencia(formData.data);

    const dadesAmbMapa = {
      ...formData,
      data: dataFormulari,
      any: Number(any),
      mes: Number(mes),
      mapa: imgMapa,
      rutaCoords: convertirRutaPerFirestore(routeCoords),
      updatedAt: serverTimestamp(),
    };

    if (editId) {
      const refDoc = doc(db, "comunicatsNova", editId);
      const dadesPerActualitzar = { ...dadesAmbMapa };

      if (!dadesPerActualitzar.referenciaComunicat) {
        delete dadesPerActualitzar.referenciaComunicat;
      }

      await updateDoc(refDoc, dadesPerActualitzar);
    } else {
      const resultat = await crearComunicatAmbReferencia(
        dadesAmbMapa,
        any,
        mes,
        yyyymm
      );
      dadesAmbMapa.referenciaComunicat = resultat.referenciaComunicat;
    }

    const referenciaPerCorreu = referenciaVisible(dadesAmbMapa);

    const dadesPerCorreu = {
      ...dadesAmbMapa,
      updatedAt: new Date().toISOString(),
      referenciaComunicat: referenciaPerCorreu,
      incidencia: referenciaPerCorreu,
      responsableBrigada: Array.isArray(dadesAmbMapa.responsableBrigada)
        ? dadesAmbMapa.responsableBrigada.join(", ")
        : dadesAmbMapa.responsableBrigada || "",
      oficialResponsable: Array.isArray(dadesAmbMapa.oficialResponsable)
        ? dadesAmbMapa.oficialResponsable.join(", ")
        : dadesAmbMapa.oficialResponsable || "",
      oficial: Array.isArray(dadesAmbMapa.oficial)
        ? dadesAmbMapa.oficial.join(", ")
        : dadesAmbMapa.oficial || "",
      peo: Array.isArray(dadesAmbMapa.peo)
        ? dadesAmbMapa.peo.join(", ")
        : dadesAmbMapa.peo || "",
      eines: Array.isArray(dadesAmbMapa.eines)
        ? dadesAmbMapa.eines.join(", ")
        : dadesAmbMapa.eines || "",
      feines: Array.isArray(dadesAmbMapa.feines)
        ? dadesAmbMapa.feines.join(", ")
        : dadesAmbMapa.feines || "",
      matricula: Array.isArray(dadesAmbMapa.matricula)
        ? dadesAmbMapa.matricula.join(", ")
        : dadesAmbMapa.matricula || "",
    };

    if (haDeReenviar) {
      await enviarCorreuComunicat(dadesPerCorreu);
    }

    alert(
      editId && !haDeReenviar
        ? "✅ Comunicat actualitzat correctament!"
        : "✅ Formulari enviat i desat correctament!"
    );

    navigate("/database");
  } catch (err) {
    console.error("Error enviant o desant:", err);
    alert("❌ Hi ha hagut un error en desar o enviar el formulari.");
  } finally {
    setEnviant(false);
  }
};

  const blocOpcions = (label, valors, setFunc, camp, campConfig) => (
    <div className="config-section">
      <label className="section-title">{label}</label>

      <div className="config-row">
        <input
          id={`nou-${camp}`}
          placeholder={`Nou ${camp}`}
          className="form-input"
        />

        <button
          type="button"
          onClick={() => {
            const input = document.getElementById(`nou-${camp}`);
            const nouValor = input.value;
            if (nouValor) {
              afegirValor(setFunc, nouValor.trim(), campConfig);
              input.value = "";
            }
          }}
          className="button-success"
        >
          Afegir
        </button>

        <button
          type="button"
          onClick={() => {
            const input = document.getElementById(`nou-${camp}`);
            const valorEliminar = input.value;
            if (valorEliminar) {
              eliminarValor(setFunc, valorEliminar.trim(), campConfig);
              input.value = "";
            }
          }}
          className="button-danger"
        >
          Eliminar
        </button>
      </div>

      <div className="selection-list">
        {valors.length === 0 ? (
          <p className="empty-options">No hi ha opcions configurades.</p>
        ) : (
          valors.map((v, i) => {
            const seleccionats = Array.isArray(formData[camp])
              ? formData[camp]
              : formData[camp]
              ? [formData[camp]]
              : [];
            const seleccionat = seleccionats.includes(v);

            return (
              <label
                key={`${v}-${i}`}
                className={`selection-option${seleccionat ? " selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={seleccionat}
                  onChange={() => toggleValorCamp(camp, v)}
                />
                <span>{v}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <div className="form-header">
        <div className="logo-frame">
        <img
          src="/ajuntament.png"
          alt="Logo"
          className="app-logo"
        />
        </div>

      <h1>
        {editId
          ? "Editar comunicat de feina · Brigada de jardineria"
          : "Comunicat de feina · Brigada de jardineria"}
      </h1>
      {topActions && <div className="top-nav-actions">{topActions}</div>}
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="input-group">
          <label className="field-label">Data</label>
        <input
          type="date"
          value={formData.data}
          onChange={(e) => handleChange("data", e.target.value)}
            className="form-input"
        />
        </div>

        {blocOpcions(
          "Responsables Brigada",
          responsables,
          setResponsables,
          "responsableBrigada",
          "responsables"
        )}

        {blocOpcions(
          "Oficials Responsables",
          oficialsResponsables,
          setOficialsResponsables,
          "oficialResponsable",
          "oficialsResponsables"
        )}

        <div className="config-section">
          <label className="section-title">Afegir nou oficial responsable</label>

          <input
            id="nouOficialResponsable"
            placeholder="Nom oficial"
            className="form-input"
          />
          <input
            id="nouEmailResponsable"
            placeholder="Email oficial"
            className="form-input"
          />
          <input
            id="nouTelefonResponsable"
            placeholder="Telèfon oficial"
            className="form-input"
          />

          <button
            type="button"
            onClick={() => {
              const inputNom = document.getElementById("nouOficialResponsable");
              const inputEmail = document.getElementById("nouEmailResponsable");
              const inputTelefon = document.getElementById("nouTelefonResponsable");

              const nouNom = inputNom.value.trim();
              const nouEmail = inputEmail.value.trim();
              const nouTelefon = inputTelefon.value.trim();

              if (nouNom && nouEmail) {
                const actualitzats = [...new Set([...oficialsResponsables, nouNom])];
                const nousEmails = { ...oficialsEmails, [nouNom]: nouEmail };
                const nousTelefons = { ...oficialsTelefons, [nouNom]: nouTelefon };

                setOficialsResponsables(actualitzats);
                setOficialsEmails(nousEmails);
                setOficialsTelefons(nousTelefons);

                actualitzarConfiguracio({
                  responsables,
                  oficialsResponsables: actualitzats,
                  oficials,
                  peons,
                  eines,
                  matricules,
                  tasques,
                  oficialsEmails: nousEmails,
                  oficialsTelefons: nousTelefons,
                });

                inputNom.value = "";
                inputEmail.value = "";
                inputTelefon.value = "";

                alert("✅ Nou responsable afegit!");
              } else {
                alert("❗ Cal posar com a mínim Nom i Email");
              }
            }}
            className="button-success button-full"
          >
            Afegir nou responsable
          </button>
        </div>

        {blocOpcions("Oficials", oficials, setOficials, "oficial", "oficials")}
        {blocOpcions("Peons", peons, setPeons, "peo", "peons")}
        {blocOpcions("Eines", eines, setEines, "eines", "eines")}
        {blocOpcions(
          "Matrícules",
          matricules,
          setMatricules,
          "matricula",
          "matricules"
        )}
        {blocOpcions("Tasques", tasques, setTasques, "feines", "tasques")}

        <div className="input-group">
          <label className="field-label">Referència del comunicat</label>
          <input
            type="text"
            value={editId ? referenciaVisible(formData) : "Es generarà automàticament en desar"}
            readOnly
            className="form-input readonly-input"
          />
        </div>

        <div className="input-group">
          <label className="field-label">Ruta a seguir</label>
        <input
          type="text"
          value={formData.ruta}
          onChange={(e) => handleChange("ruta", e.target.value)}
          placeholder="Ruta a seguir"
            className="form-input"
        />
        </div>

        <div className="input-group">
          <label className="field-label">Observacions</label>
        <textarea
          value={formData.observacions}
          onChange={(e) => handleChange("observacions", e.target.value)}
          placeholder="Observacions"
            className="form-textarea"
        />
        </div>

        <div className="input-group">
          <label className="field-label">
            {emailsDestinatarisVisibles.length > 1
              ? "Emails destinataris"
              : "Email destinatari"}
          </label>
        <input
          type="text"
          value={valorEmailsVisible}
          onChange={(e) => handleChange("to_email", e.target.value)}
          placeholder="Email destinatari"
            className="form-input"
        />
        </div>

        <div className="input-group">
          <label className="field-label">
            {telefonsDestinatarisVisibles.length > 1
              ? "Telèfons destinataris"
              : "Telèfon destinatari"}
          </label>
        <input
          type="text"
          value={valorTelefonsVisible}
          onChange={(e) => handleChange("telefon", e.target.value)}
          placeholder="Telèfon destinatari"
            className="form-input"
        />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            value="desar"
            disabled={enviant}
            className="button-primary"
          >
            {enviant ? "Desant..." : editId ? "Desar canvis" : "Enviar"}
          </button>

          {editId && (
            <button
              type="submit"
              value="reenviar"
              disabled={enviant}
              className="button-secondary"
            >
              {enviant ? "Desant..." : "Desar i reenviar"}
            </button>
          )}

          {editId && (
            <button
              type="button"
              onClick={() => navigate("/database")}
              disabled={enviant}
              className="button-secondary"
            >
              Cancel·lar
            </button>
          )}

          {!editId && (
            <button
              type="button"
              onClick={handleReset}
              disabled={enviant}
              className="button-secondary"
            >
              Neteja
            </button>
          )}

          <button
            type="button"
            onClick={() => impressioRef.current?.()}
            className="button-secondary"
          >
            🖨️ Previsualitzar i imprimir
          </button>
        </div>

        {statusMsg && <p className="status-message">{statusMsg}</p>}
      </form>

      <div className="map-card">
      <MapContainer
        center={center}
        zoom={13}
        preferCanvas={true}
        style={{ height: "300px", width: "100%" }}
        whenReady={(event) => {
          mapRef.current = event.target;
          setMapReady(true);
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker
          position={center}
          icon={L.icon({
            iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
          })}
        >
          <Popup>Sortida: Carrer de Castella, Llucmajor</Popup>
        </Marker>

        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "blue", weight: 4 }}
          />
        )}
      </MapContainer>
      </div>

      <ImpressioComunicat
        comunicat={formData}
        mapaRef={mapRef}
        onPrintReady={(handlePrint) => {
          impressioRef.current = handlePrint;
        }}
      />
    </div>
  );
}
