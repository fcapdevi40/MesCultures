import { dateKey } from "./dates";

// Construit les lignes du registre : une ligne par produit appliqué
// lors d'une intervention (ou une ligne sans produit si le traitement n'en a pas).

export const COLONNES = [
  { key: "date", label: "Date" },
  { key: "heure", label: "Heure" },
  { key: "parcelle", label: "Parcelle" },
  { key: "ilot", label: "Îlot PAC" },
  { key: "pacParcelle", label: "N° parcelle PAC" },
  { key: "commune", label: "Commune" },
  { key: "culture", label: "Culture" },
  { key: "variete", label: "Variété" },
  { key: "surface", label: "Surface traitée (ha)", type: "number" },
  { key: "traitement", label: "Traitement" },
  { key: "bbch", label: "Stade BBCH" },
  { key: "cible", label: "Cible" },
  { key: "produit", label: "Produit" },
  { key: "categorie", label: "Catégorie" },
  { key: "amm", label: "N° AMM" },
  { key: "dose", label: "Dose", type: "number" },
  { key: "unite", label: "Unité" },
  { key: "quantite", label: "Quantité totale", type: "number" },
  { key: "uniteQuantite", label: "Unité quantité" },
  { key: "applicateur", label: "Applicateur" },
  { key: "commentaire", label: "Commentaire" },
];

const arrondi = (n) => Math.round(n * 1000) / 1000;

export function genererRegistre(data, { parcelleId = "", seulementAmm = false } = {}) {
  const rows = [];

  for (const i of data?.interventions || []) {
    if (parcelleId && String(i.parcelleId) !== String(parcelleId)) continue;

    const parcelle = data.parcelles?.find((p) => p.id === i.parcelleId);
    const culture = data.cultures?.find((c) => c.id === i.cultureId);
    const traitement = culture?.traitements?.find((t) => t.id === i.traitementId);

    const base = {
      date: i.date || "",
      heure: i.heure || "",
      parcelle: parcelle?.nom || "Parcelle supprimée",
      ilot: parcelle?.ilot || "",
      pacParcelle: parcelle?.pacParcelle || "",
      commune: parcelle?.commune || "",
      culture: culture?.nom || i.cultureId || "",
      variete: i.variete || "",
      surface: Number(i.surface) || 0,
      traitement: i.traitementNom || traitement?.nom || "",
      bbch: i.bbch || "",
      cible: i.cible || "",
      applicateur: i.applicateur || "",
      commentaire: i.commentaire || "",
      _tri: `${dateKey(i.date)} ${i.heure || ""}`,
    };

    const produits = i.produits?.length ? i.produits : [null];

    for (const ligne of produits) {
      const produit = ligne && data.produits?.find((p) => p.id === ligne.produitId);
      const amm = produit?.amm || "";
      if (seulementAmm && !amm) continue;

      const dose = ligne ? Number(ligne.dose) || 0 : 0;
      const unite = ligne?.unite || "";
      // "L/ha" x surface -> "L" ; une unité sans "/ha" est déjà un total
      const parHa = unite.endsWith("/ha");

      rows.push({
        ...base,
        produit: ligne ? produit?.nom || `Produit #${ligne.produitId}` : "",
        categorie: produit?.categorie || "",
        amm,
        dose: ligne ? dose : "",
        unite,
        quantite: ligne ? arrondi(parHa ? dose * base.surface : dose) : "",
        uniteQuantite: parHa ? unite.replace("/ha", "") : unite,
      });
    }
  }

  return rows.sort((a, b) => a._tri.localeCompare(b._tri));
}
