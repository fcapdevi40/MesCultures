import { normalise } from "./texte";

export const CATEGORIES_PAR_DEFAUT = [
  "Starter",
  "Désherbage",
  "Fongicide",
  "Insecticide",
  "Limacide",
  "Fertilisant",
];

// Liste enregistrée (categories.json) ; à défaut, la liste par défaut
export function categoriesStockees(data) {
  return Array.isArray(data?.categories) ? data.categories : CATEGORIES_PAR_DEFAUT;
}

// Liste enregistrée + catégories déjà utilisées par des produits (ex : venues d'un import)
export function categoriesEffectives(data) {
  const liste = [...categoriesStockees(data)];
  for (const p of data?.produits || []) {
    const c = String(p.categorie || "").trim();
    if (c && !liste.some((x) => normalise(x) === normalise(c))) liste.push(c);
  }
  return liste;
}

export const memeCategorie = (a, b) => normalise(a) === normalise(b);
