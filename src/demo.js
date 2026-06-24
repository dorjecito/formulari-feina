export const DEMO_USERNAME = "convidat";
export const DEMO_AUTH_EMAIL = "convidat.demo@example.com";
export const DEMO_PASSWORD = "convidat2026";
export const DEMO_ENV = "demo";
export const REAL_ENV = "real";
export const DEMO_SESSION_KEY = "comunicatsFeinaDemoMode";
export const DEMO_COMUNICATS_KEY = "comunicatsFeinaDemoComunicats";

export const isDemoIdentifier = (identifier) => {
  const normalized = identifier.trim().toLowerCase();
  return normalized === DEMO_USERNAME || normalized === DEMO_AUTH_EMAIL;
};

export const isDemoLogin = (identifier, password) =>
  isDemoIdentifier(identifier) && password === DEMO_PASSWORD;

export const normalizeLoginIdentifier = (identifier) =>
  isDemoIdentifier(identifier) ? DEMO_AUTH_EMAIL : identifier.trim();

export const isDemoUser = (user) =>
  user?.email?.toLowerCase() === DEMO_AUTH_EMAIL;

export const isDemoComunicat = (comunicat) => comunicat?.entorn === DEMO_ENV;

export const isRealComunicat = (comunicat) =>
  !comunicat?.entorn || comunicat.entorn === REAL_ENV;

export const DEMO_CONFIG = {
  responsables: ["Usuari Demo"],
  oficialsResponsables: ["Oficial Demo"],
  oficials: ["Treballador 1", "Treballador 2"],
  peons: ["Operari Demo"],
  eines: ["Equip Demo"],
  matricules: ["TEST001"],
  tasques: ["Tasca de demostració"],
  oficialsEmails: {
    "Oficial Demo": "demo@example.invalid",
  },
  oficialsTelefons: {
    "Oficial Demo": "000000000",
  },
};

export const applyDemoConfig = ({
  setResponsables,
  setOficialsResponsables,
  setOficials,
  setPeons,
  setEines,
  setMatricules,
  setTasques,
  setOficialsEmails,
  setOficialsTelefons,
}) => {
  setResponsables(DEMO_CONFIG.responsables);
  setOficialsResponsables(DEMO_CONFIG.oficialsResponsables);
  setOficials(DEMO_CONFIG.oficials);
  setPeons(DEMO_CONFIG.peons);
  setEines(DEMO_CONFIG.eines);
  setMatricules(DEMO_CONFIG.matricules);
  setTasques(DEMO_CONFIG.tasques);
  setOficialsEmails(DEMO_CONFIG.oficialsEmails);
  setOficialsTelefons(DEMO_CONFIG.oficialsTelefons);
};

export const getDemoComunicatsLocals = () => {
  try {
    const raw = localStorage.getItem(DEMO_COMUNICATS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((comunicat) => !comunicat.deleted) : [];
  } catch (error) {
    console.warn("No s'han pogut llegir els comunicats demo locals.", error);
    return [];
  }
};

export const saveDemoComunicatLocal = (comunicat) => {
  const comunicats = getDemoComunicatsLocals();
  const existentIndex = comunicats.findIndex((item) => item.id === comunicat.id);
  const actualitzat = {
    ...comunicat,
    entorn: DEMO_ENV,
  };

  if (existentIndex >= 0) {
    comunicats[existentIndex] = actualitzat;
  } else {
    comunicats.unshift(actualitzat);
  }

  localStorage.setItem(DEMO_COMUNICATS_KEY, JSON.stringify(comunicats));
  return actualitzat;
};

export const getDemoComunicatLocal = (id) =>
  getDemoComunicatsLocals().find((comunicat) => comunicat.id === id) || null;

export const deleteDemoComunicatLocal = (id) => {
  const comunicats = getDemoComunicatsLocals().filter((comunicat) => comunicat.id !== id);
  localStorage.setItem(DEMO_COMUNICATS_KEY, JSON.stringify(comunicats));
};
