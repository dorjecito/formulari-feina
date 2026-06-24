// AppFinalFormulari.jsx — corregit per evitar doble enviament i guardar ruta compatible amb Firestore

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import {
  DEMO_ENV,
  REAL_ENV,
  DEMO_CONFIG,
  applyDemoConfig,
  getDemoComunicatLocal,
  isDemoComunicat,
  isRealComunicat,
  saveDemoComunicatLocal,
} from "./demo";
import {
  formatLlocsFeina,
  netejarPaisEspanya,
  normalitzarLlocsFeina,
} from "./llocsFeina";
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
  llocsFeina: [],
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
const MISSATGE_RUTA_ERROR =
  "No s'ha pogut calcular la ruta. Revisa el destí o prova amb una adreça més concreta.";
const MISSATGE_MAPA_NO_GENERAT =
  "No s'ha pogut generar el mapa de la ruta. El comunicat és igualment vàlid.";
const RUTES_HABITUALS = [
  "Voltor, Llucmajor",
  "Carrer de Voltor, Llucmajor",
  "Llucmajor",
  "S'Arenal, Llucmajor",
  "Badia Gran, Llucmajor",
  "Badia Blava, Llucmajor",
  "Maioris, Llucmajor",
  "Sa Torre, Llucmajor",
  "Son Verí Nou, Llucmajor",
  "Cala Blava, Llucmajor",
  "Estanyol, Llucmajor",
];

const crearVariantsRuta = (ruta) => {
  const rutaNeta = ruta.trim().replace(/\s+/g, " ");
  if (!rutaNeta) return [];

  const rutaLower = rutaNeta.toLowerCase();
  const conteMunicipi = /llucmajor|mallorca|illes balears|islas baleares|spain|españa/.test(rutaLower);
  const variants = [
    rutaNeta,
    ...(conteMunicipi
      ? []
      : [
          `${rutaNeta}, Llucmajor`,
          `${rutaNeta}, Llucmajor, Mallorca`,
          `${rutaNeta}, Illes Balears, España`,
        ]),
    ...(rutaLower.includes("carrer de ")
      ? [rutaNeta.replace(/^carrer de\s+/i, ""), `${rutaNeta.replace(/^carrer de\s+/i, "")}, Llucmajor`]
      : []),
  ];

  return [...new Set(variants.map((variant) => variant.trim()).filter(Boolean))];
};

const getDemoFormData = () => ({
  ...emptyFormData,
  responsableBrigada: ["Usuari Demo"],
  oficialResponsable: ["Oficial Demo"],
  oficial: ["Treballador 1"],
  peo: ["Operari Demo"],
  eines: ["Equip Demo"],
  matricula: ["TEST001"],
  feines: ["Tasca de demostració"],
  llocsFeina: ["Cala Blava"],
  ruta: "Cala Blava",
  to_email: DEMO_CONFIG.oficialsEmails["Oficial Demo"],
  telefon: DEMO_CONFIG.oficialsTelefons["Oficial Demo"],
});

export default function AppFinalFormulari({ topActions = null, isDemoMode = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const editId = id || null;

  const [formData, setFormData] = useState(emptyFormData);
  const [statusMsg, setStatusMsg] = useState("");
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeMarkers, setRouteMarkers] = useState([]);
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
  const [routeStatus, setRouteStatus] = useState("idle");
  const [routeErrorMsg, setRouteErrorMsg] = useState("");
  const [mostrarSuggerimentsRuta, setMostrarSuggerimentsRuta] = useState(false);
  const [llocSuggerimentsActiu, setLlocSuggerimentsActiu] = useState(0);

  const mapRef = useRef(null);
  const impressioRef = useRef(null);
  const lastRouteRequestRef = useRef("");
  const routeAbortRef = useRef(null);

  const carregarConfiguracio = async () => {
    if (isDemoMode) {
      applyDemoConfig({
        setResponsables,
        setOficialsResponsables,
        setOficials,
        setPeons,
        setEines,
        setMatricules,
        setTasques,
        setOficialsEmails,
        setOficialsTelefons,
      });
      return;
    }

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
    if (isDemoMode) return;

    try {
      const docRef = doc(db, "configuracio_formulari", "default");
      await setDoc(docRef, dataActualitzada);
    } catch (error) {
      console.error("Error actualitzant configuració:", error);
    }
  };

  useEffect(() => {
    carregarConfiguracio();
  }, [isDemoMode]);

  useEffect(() => {
    if (!isDemoMode || editId) return;

    setFormData(getDemoFormData());
  }, [isDemoMode, editId]);

  useEffect(() => {
    const carregarComunicat = async () => {
      if (!editId) return;

      try {
        const data = isDemoMode
          ? getDemoComunicatLocal(editId)
          : await (async () => {
              const docRef = doc(db, "comunicatsNova", editId);
              const docSnap = await getDoc(docRef);
              return docSnap.exists() ? docSnap.data() : null;
            })();

        if (!data) {
          alert("❌ El comunicat no existeix.");
          navigate("/database");
          return;
        }

        if (
          (isDemoMode && !isDemoComunicat(data)) ||
          (!isDemoMode && !isRealComunicat(data))
        ) {
          alert("❌ No tens permisos per editar aquest comunicat.");
          navigate("/database");
          return;
        }

        const llocsNormalitzats = normalitzarLlocsFeina(data);
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
          llocsFeina: llocsNormalitzats,
          ruta: formatLlocsFeina(llocsNormalitzats),
          observacions: data.observacions || "",
          to_email: data.to_email || "",
          telefon: data.telefon || "",
          reply_to: data.reply_to || "",
        };

        setFormData(normalitzat);

        if (Array.isArray(data.rutaCoords) && data.rutaCoords.length > 0) {
          setRouteCoords(convertirRutaDesDeFirestore(data.rutaCoords));
          lastRouteRequestRef.current = llocsNormalitzats.join("|").trim().toLowerCase();
          setRouteStatus("success");
          setRouteErrorMsg("");
          setStatusMsg("Ruta carregada desada ✅");
        }

        setStatusMsg("Comunicat carregat per editar ✏️");
      } catch (error) {
        console.error("Error carregant comunicat:", error);
        alert("❌ Error carregant el comunicat.");
      }
    };

    carregarComunicat();
  }, [editId, navigate, isDemoMode]);

  const llocsFeinaActius = useMemo(
    () => normalitzarLlocsFeina(formData),
    [formData.llocsFeina, formData.ruta]
  );

  useEffect(() => {
    const llocs = llocsFeinaActius;
    const destination = llocs.join("|");

    if (!destination) {
      routeAbortRef.current?.abort();
      lastRouteRequestRef.current = "";
      setRouteCoords([]);
      setRouteMarkers([]);
      setRouteStatus("idle");
      setRouteErrorMsg("");
      return;
    }

    if (destination.length < 4) {
      routeAbortRef.current?.abort();
      setRouteCoords([]);
      setRouteMarkers([]);
      setRouteStatus("idle");
      setRouteErrorMsg("");
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchRoute(llocs);
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [llocsFeinaActius]);

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
  };

  const sincronitzarLlocsFeina = (llocs) => {
    setFormData((prev) => ({
      ...prev,
      llocsFeina: llocs,
      ruta: formatLlocsFeina(llocs),
    }));
  };

  const actualitzarLlocFeina = (index, value) => {
    const llocs = formData.llocsFeina?.length ? [...formData.llocsFeina] : [""];
    llocs[index] = value;
    sincronitzarLlocsFeina(llocs);
  };

  const afegirLlocFeina = () => {
    sincronitzarLlocsFeina([...(formData.llocsFeina?.length ? formData.llocsFeina : [""]), ""]);
    setLlocSuggerimentsActiu(formData.llocsFeina?.length || 0);
  };

  const eliminarLlocFeina = (index) => {
    const llocsActuals = formData.llocsFeina?.length ? formData.llocsFeina : [""];
    const llocs = llocsActuals.filter((_, i) => i !== index);
    sincronitzarLlocsFeina(llocs.length ? llocs : [""]);
    setLlocSuggerimentsActiu(0);
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
  const suggerimentsRuta = useMemo(() => {
    const ruta = formData.llocsFeina?.[llocSuggerimentsActiu]?.trim() || "";
    if (ruta.length < 2) return [];

    const rutaLower = ruta.toLowerCase();
    const suggerimentsHabituals = RUTES_HABITUALS.filter((opcio) =>
      opcio.toLowerCase().includes(rutaLower)
    );
    const variants = crearVariantsRuta(ruta).filter(
      (opcio) => opcio.toLowerCase() !== rutaLower
    );

    return [...new Set([...suggerimentsHabituals, ...variants])].slice(0, 6);
  }, [formData.llocsFeina, llocSuggerimentsActiu]);

  const handleReset = () => {
    setFormData(isDemoMode ? getDemoFormData() : emptyFormData);
    setRouteCoords([]);
    setRouteMarkers([]);
    setRouteStatus("idle");
    setRouteErrorMsg("");
    lastRouteRequestRef.current = "";
    routeAbortRef.current?.abort();
    setStatusMsg("Formulari reiniciat ✨");
  };

  const crearComunicatAmbReferencia = async (dadesAmbMapa, any, mes, yyyymm) => {
    return runTransaction(db, async (transaction) => {
      const counterRef = doc(
        db,
        isDemoMode ? "comptadorsComunicatsDemo" : "comptadorsComunicats",
        yyyymm
      );
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

  const crearComunicatDemoAmbReferencia = async (dadesAmbMapa, yyyymm) => {
    const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const numeroDemo = [...id].reduce(
      (acc, char) => (acc * 31 + char.charCodeAt(0)) % 10000,
      0
    );
    const referenciaComunicat = formatReferencia(yyyymm, numeroDemo || 1);

    saveDemoComunicatLocal({
      id,
      ...dadesAmbMapa,
      referenciaComunicat,
      createdAt: new Date().toISOString(),
    });

    return { id, referenciaComunicat };
  };

  const enviarCorreuComunicat = async (dadesPerCorreu) => {
    if (isDemoMode) {
      console.info("Mode demo: enviament de correu simulat.", dadesPerCorreu);
      setStatusMsg("Simulació d'enviament realitzada.");
      return;
    }

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

  const fetchRoute = async (destinations, { force = false } = {}) => {
    const llocs = (Array.isArray(destinations) ? destinations : [destinations])
      .map((destination) => netejarPaisEspanya(destination))
      .filter(Boolean);
    const routeKey = llocs.join("|").toLowerCase();

    if (llocs.length === 0 || routeKey.length < 4) {
      routeAbortRef.current?.abort();
      lastRouteRequestRef.current = "";
      setRouteCoords([]);
      setRouteMarkers([]);
      setRouteStatus("idle");
      setRouteErrorMsg("");
      return;
    }

    if (!force && lastRouteRequestRef.current === routeKey) {
      return;
    }

    routeAbortRef.current?.abort();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    routeAbortRef.current = controller;
    lastRouteRequestRef.current = routeKey;

    setRouteStatus("loading");
    setRouteErrorMsg("");
    setStatusMsg("Carregant ruta...");

    try {
      const puntsValids = [];
      const llocsFallits = [];

      for (const lloc of llocs) {
        const variantsRuta = crearVariantsRuta(lloc);
        let puntTrobat = null;
        let ultimError = null;

        for (const variant of variantsRuta) {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                variant
              )}&format=json&limit=1`,
              { signal: controller.signal }
            );

            if (!res.ok) {
              throw new Error("No s'han pogut obtenir coordenades del lloc de feina.");
            }

            const data = await res.json();

            if (!Array.isArray(data) || !data.length) {
              throw new Error(`Sense coordenades per a: ${variant}`);
            }

            const lon = parseFloat(data[0].lon);
            const lat = parseFloat(data[0].lat);

            if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
              throw new Error(`Coordenades no vàlides per a: ${variant}`);
            }

            puntTrobat = {
              nom: netejarPaisEspanya(lloc),
              coords: [lon, lat],
              position: [lat, lon],
            };
            break;
          } catch (errorVariant) {
            if (errorVariant.name === "AbortError") throw errorVariant;
            ultimError = errorVariant;
            console.warn("Variant de lloc fallida:", variant, errorVariant.message);
          }
        }

        if (puntTrobat) {
          puntsValids.push(puntTrobat);
        } else {
          llocsFallits.push(netejarPaisEspanya(lloc));
          console.warn("No s'ha pogut geocodificar el lloc:", lloc, ultimError?.message);
        }
      }

      if (puntsValids.length === 0) {
        throw new Error("No s'ha pogut geocodificar cap lloc de feina.");
      }

      const routeRes = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          method: "POST",
          headers: {
            Authorization: "5b3ce3597851110001cf6248b9be20c2ac9f4960afb9260f5d30097e",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coordinates: [[2.89174, 39.4924], ...puntsValids.map((punt) => punt.coords)],
          }),
          signal: controller.signal,
        }
      );

      if (!routeRes.ok) {
        throw new Error("OpenRouteService no ha calculat la ruta multipunt.");
      }

      const geojson = await routeRes.json();
      const coordinates = geojson?.features?.[0]?.geometry?.coordinates;

      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        throw new Error("La ruta rebuda és buida o no és vàlida.");
      }

      const polyline = coordinates
        .map((c) => [c[1], c[0]])
        .filter(([latitud, longitud]) =>
          Number.isFinite(latitud) && Number.isFinite(longitud)
        );

      if (polyline.length === 0) {
        throw new Error("La ruta rebuda no conté coordenades vàlides.");
      }

      setRouteCoords(polyline);
      setRouteMarkers(puntsValids);
      setRouteStatus("success");
      setRouteErrorMsg("");

      if (llocsFallits.length > 0) {
        setStatusMsg(
          `Ruta carregada parcialment. No s'ha pogut localitzar: ${llocsFallits.join(", ")}`
        );
      } else {
        setStatusMsg("Ruta carregada ✅");
      }
    } catch (err) {
      if (err.name === "AbortError") return;

      console.error("Error generant la ruta:", err.message);
      setRouteCoords([]);
      setRouteMarkers([]);
      setRouteStatus("error");
      setRouteErrorMsg(MISSATGE_RUTA_ERROR);
      setStatusMsg(MISSATGE_RUTA_ERROR);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const generarImatgeMapaNoDisponible = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 320;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 38px Arial, sans-serif";
    ctx.fillText("No s'ha pogut generar el mapa de la ruta.", canvas.width / 2, 135);
    ctx.font = "32px Arial, sans-serif";
    ctx.fillText("El comunicat és igualment vàlid.", canvas.width / 2, 190);

    return canvas.toDataURL("image/jpeg", 0.72);
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
    const rutaAmbError = routeStatus === "error";

    try {
      if (rutaAmbError) {
        console.warn("Mapa no capturat perquè la ruta té un error.");
      } else if (!mapRef.current || !mapReady) {
        console.warn("⚠️ El mapa encara no està llest.");
      } else if (routeCoords.length > 0) {
        const bounds = L.latLngBounds(routeCoords);
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
        await new Promise((resolve) => setTimeout(resolve, 1200));

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

    if (imgMapa.length > 45000) {
      alert("❌ La imatge del mapa encara és massa gran per EmailJS.");
      return;
    }

    const mapaPerCorreu = imgMapa || (rutaAmbError ? generarImatgeMapaNoDisponible() : "");
    const llocsNormalitzats = normalitzarLlocsFeina(formData);
    const llocsText = formatLlocsFeina(llocsNormalitzats);
    const etiquetaLlocs =
      llocsNormalitzats.length > 1 ? "Llocs de feina" : "Lloc de feina";

    const {
      dataBase: dataFormulari,
      any,
      mes,
      yyyymm,
    } = obtenirAnyMesReferencia(formData.data);

    const dadesAmbMapa = {
      ...formData,
      data: dataFormulari,
      entorn: isDemoMode ? DEMO_ENV : REAL_ENV,
      any: Number(any),
      mes: Number(mes),
      llocsFeina: llocsNormalitzats,
      ruta: llocsText,
      mapa: imgMapa,
      rutaCoords: routeStatus === "success" ? convertirRutaPerFirestore(routeCoords) : [],
      updatedAt: isDemoMode ? new Date().toISOString() : serverTimestamp(),
    };

    if (editId) {
      const dadesPerActualitzar = { ...dadesAmbMapa };

      if (!dadesPerActualitzar.referenciaComunicat) {
        delete dadesPerActualitzar.referenciaComunicat;
      }

      if (isDemoMode) {
        saveDemoComunicatLocal({
          ...dadesPerActualitzar,
          id: editId,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const refDoc = doc(db, "comunicatsNova", editId);
        await updateDoc(refDoc, dadesPerActualitzar);
      }
    } else {
      const resultat = isDemoMode
        ? await crearComunicatDemoAmbReferencia(dadesAmbMapa, yyyymm)
        : await crearComunicatAmbReferencia(
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
      assumpte: `Referència: ${referenciaPerCorreu}`,
      subject: `Referència: ${referenciaPerCorreu}`,
      titolReferencia: `Referència: ${referenciaPerCorreu}`,
      llocFeina: llocsNormalitzats[0] || "",
      llocsFeina: llocsText,
      llocsFeinaText: llocsText,
      llocsFeinaLabel: etiquetaLlocs,
      ruta: llocsText,
      mapa: mapaPerCorreu,
      mapaText: rutaAmbError ? MISSATGE_MAPA_NO_GENERAT : "",
      mapaDisponible: imgMapa ? "sí" : "no",
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
      isDemoMode
        ? haDeReenviar
          ? "✅ Comunicat demo desat. Simulació d'enviament realitzada."
          : "✅ Comunicat demo actualitzat correctament!"
        : editId && !haDeReenviar
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
        {isDemoMode ? (
          <div className="demo-logo">DEMO</div>
        ) : (
          <div className="logo-frame">
            <img
              src="/ajuntament.png"
              alt="Logo"
              className="app-logo"
            />
          </div>
        )}

      <h1>
        {isDemoMode
          ? editId
            ? "Editar comunicat demo · Brigada Test"
            : "Comunicat demo · Brigada Test"
          : editId
          ? "Editar comunicat de feina · Brigada de jardineria"
          : "Comunicat de feina · Brigada de jardineria"}
      </h1>
      {isDemoMode && (
        <div className="demo-banner">
          ENTORN DE DEMOSTRACIÓ · DADES FICTÍCIES
        </div>
      )}
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
          <label className="field-label">Llocs de feina</label>
          <div className="work-locations-list">
            {(formData.llocsFeina?.length ? formData.llocsFeina : [""]).map(
              (lloc, index) => (
                <div className="work-location-row" key={`lloc-feina-${index}`}>
                  <div className="work-location-input-wrap">
                    <label className="field-sublabel">Lloc de feina {index + 1}</label>
                    <input
                      type="text"
                      value={lloc}
                      onChange={(e) => {
                        actualitzarLlocFeina(index, e.target.value);
                        setLlocSuggerimentsActiu(index);
                        setMostrarSuggerimentsRuta(true);
                      }}
                      onFocus={() => {
                        setLlocSuggerimentsActiu(index);
                        setMostrarSuggerimentsRuta(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setMostrarSuggerimentsRuta(false), 150);
                      }}
                      placeholder="Lloc de feina"
                      className="form-input"
                      autoComplete="off"
                    />

                    {mostrarSuggerimentsRuta &&
                      llocSuggerimentsActiu === index &&
                      suggerimentsRuta.length > 0 && (
                        <div className="route-suggestions">
                          {suggerimentsRuta.map((suggeriment) => (
                            <button
                              type="button"
                              key={suggeriment}
                              className="route-suggestion"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                actualitzarLlocFeina(index, suggeriment);
                                setMostrarSuggerimentsRuta(false);
                              }}
                            >
                              {suggeriment}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>

                  {(formData.llocsFeina?.length || 1) > 1 && (
                    <button
                      type="button"
                      className="button-danger work-location-remove"
                      onClick={() => eliminarLlocFeina(index)}
                    >
                      Eliminar lloc
                    </button>
                  )}
                </div>
              )
            )}
          </div>

          <button
            type="button"
            className="button-secondary work-location-add"
            onClick={afegirLlocFeina}
          >
            Afegir lloc de feina
          </button>
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
        {routeStatus === "error" ? (
          <div className="route-error-card">
            <p className="route-error-title">{MISSATGE_MAPA_NO_GENERAT}</p>
            <p className="route-error-text">{routeErrorMsg || MISSATGE_RUTA_ERROR}</p>
            <button
              type="button"
              onClick={() => fetchRoute(llocsFeinaActius, { force: true })}
              className="button-secondary route-retry-button"
              disabled={routeStatus === "loading"}
            >
              Reintentar ruta
            </button>
          </div>
        ) : (
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

            {routeMarkers.map((punt, index) => (
              <Marker
                key={`${punt.nom}-${index}`}
                position={punt.position}
                icon={L.icon({
                  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
                })}
              >
                <Popup>
                  {index + 1}. {punt.nom}
                </Popup>
              </Marker>
            ))}

            {routeCoords.length > 0 && (
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: "blue", weight: 4 }}
              />
            )}
          </MapContainer>
        )}
      </div>

      <ImpressioComunicat
        comunicat={formData}
        mapaRef={mapRef}
        isDemoMode={isDemoMode}
        mapaNoDisponible={routeStatus === "error"}
        missatgeMapaNoDisponible={MISSATGE_MAPA_NO_GENERAT}
        onPrintReady={(handlePrint) => {
          impressioRef.current = handlePrint;
        }}
      />
    </div>
  );
}
