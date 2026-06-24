export const netejarPaisEspanya = (text = "") =>
  String(text)
    .replace(/\s*,?\s*(España|Spain)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

export const normalitzarLlocsFeina = (comunicat = {}) => {
  const llocs = Array.isArray(comunicat.llocsFeina)
    ? comunicat.llocsFeina
    : convertirALlista(comunicat.llocsFeina);

  const origen = llocs.length > 0 ? llocs : convertirALlista(comunicat.ruta);

  return [
    ...new Set(
      origen
        .map((lloc) => netejarPaisEspanya(lloc))
        .filter(Boolean)
    ),
  ];
};

export const formatLlocsFeina = (llocs = []) =>
  (Array.isArray(llocs) ? llocs : convertirALlista(llocs))
    .map((lloc) => netejarPaisEspanya(lloc))
    .filter(Boolean)
    .join("\n");

const convertirALlista = (valor) => {
  if (!valor) return [];
  if (Array.isArray(valor)) return valor;

  return String(valor)
    .split(/\n|;|\s+\|\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
};
