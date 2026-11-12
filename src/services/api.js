// L'adresse du serveur suit celle de la page : fonctionne sur le PC (localhost)
// comme depuis un téléphone sur le même réseau (ex: http://192.168.1.20:5173).
const API_URL =
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`;

// Un fichier d'interventions par campagne : interventions_2027.json, etc.
export const fichierInterventions = (annee) => `interventions_${annee}.json`;

// Si `vide` est fourni, un fichier absent (404) donne cette valeur par défaut
// (ex : nouvelle campagne dont le fichier n'existe pas encore).
async function getJson(file, { vide } = {}) {
  const res = await fetch(`${API_URL}/data/${file}`);
  if (res.status === 404 && vide !== undefined) return vide;
  if (!res.ok) throw new Error(`Impossible de lire ${file} (${res.status})`);
  return res.json();
}

export async function listAnnees() {
  const res = await fetch(`${API_URL}/annees`);
  if (!res.ok) throw new Error(`Liste des campagnes indisponible (${res.status})`);
  return res.json();
}

export function loadInterventions(annee) {
  return getJson(fichierInterventions(annee), { vide: [] });
}

export async function loadAllData(annee) {
  const [produits, cultures, parcelles, interventions, categories] = await Promise.all([
    getJson("produits.json"),
    getJson("cultures.json"),
    getJson("parcelles.json"),
    loadInterventions(annee),
    getJson("categories.json", { vide: null }), // absent : liste par défaut
  ]);
  return { produits, cultures, parcelles, interventions, categories };
}

export async function saveFile(file, data) {
  const res = await fetch(`${API_URL}/data/${file}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  // fetch ne lève pas d'erreur sur un 4xx/5xx : on le fait nous-mêmes
  if (!res.ok) throw new Error(`Sauvegarde de ${file} refusée (${res.status})`);
  return res.json();
}

export function saveInterventions(annee, interventions) {
  return saveFile(fichierInterventions(annee), interventions);
}

// Sauvegarde complète (tous les fichiers de données) pour la télécharger avant un import
export async function loadBackup() {
  const res = await fetch(`${API_URL}/backup`);
  if (!res.ok) throw new Error(`Sauvegarde impossible (${res.status})`);
  return res.json();
}

// Télécharge un Google Sheets (partagé par lien) via le serveur -> ArrayBuffer xlsx
export async function fetchGsheet(url) {
  const res = await fetch(`${API_URL}/import/gsheet?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `Récupération impossible (${res.status})`);
  }
  return res.arrayBuffer();
}
