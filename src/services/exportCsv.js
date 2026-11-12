import { COLONNES } from "./registrePhyto";
import { downloadBlob, nomFichier, baseNom } from "./download";

// Séparateur ";" + virgule décimale + BOM UTF-8 : s'ouvre correctement
// dans Excel en version française (accents et nombres compris).
function cellule(valeur, type) {
  if (valeur === "" || valeur == null) return "";
  if (type === "number") return String(valeur).replace(".", ",");
  let t = String(valeur).replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(t)) t = `'${t}`; // évite l'exécution de formules
  return /[;"]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
}

export function buildCsv(rows) {
  const lignes = [COLONNES.map((c) => cellule(c.label)).join(";")];
  for (const r of rows) {
    lignes.push(COLONNES.map((c) => cellule(r[c.key], c.type)).join(";"));
  }
  return "\uFEFF" + lignes.join("\r\n");
}

export function exportCsv(rows, annee) {
  const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8" });
  downloadBlob(nomFichier(baseNom(annee), "csv"), blob);
}
