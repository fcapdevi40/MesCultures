// Petites préférences gardées dans le navigateur (dernier applicateur, campagne ouverte).
// Lit aussi les anciennes clés « agriapp.* » pour ne rien perdre au changement de nom.
const PREFIXE = "mescultures.";
const ANCIEN = "agriapp.";

export function lirePref(cle) {
  try {
    return localStorage.getItem(PREFIXE + cle) ?? localStorage.getItem(ANCIEN + cle);
  } catch {
    return null;
  }
}

export function ecrirePref(cle, valeur) {
  try {
    localStorage.setItem(PREFIXE + cle, String(valeur));
  } catch {
    /* stockage indisponible */
  }
}
