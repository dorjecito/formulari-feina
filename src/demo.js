export const DEMO_USERNAME = "convidat";
export const DEMO_AUTH_EMAIL = "convidat.demo@example.com";
export const DEMO_PASSWORD = "convidat2026";
export const DEMO_ENV = "demo";
export const REAL_ENV = "real";
export const DEMO_SESSION_KEY = "comunicatsFeinaDemoMode";

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
