// Moteur d'import : transforme des tableaux (issus d'Excel / CSV / Google Sheets)
// en nouvelles données pour l'app, avec un rapport détaillé.
// RÈGLE : l'import ajoute ou met à jour, il ne supprime jamais rien.
import { validateNomProduit, validateAMM, validatePrice } from "./validation";
import { dateKey, serialVersDate } from "./dates";
import { normalise } from "./texte";
import { categoriesEffectives } from "./categories";

export { normalise };

export const TYPES = [
  ["produits", "Produits"],
  ["cultures", "Cultures"],
  ["varietes", "Variétés"],
  ["traitements", "Traitements types"],
  ["parcelles", "Parcelles"],
  ["interventions", "Interventions"],
];
export const ORDRE = TYPES.map(([id]) => id);
export const LIBELLES = Object.fromEntries(TYPES);

const UNITES = ["L/ha", "kg/ha", "g/ha", "ml/ha", "L", "kg"];

// Noms de colonnes acceptés (sans tenir compte des accents, majuscules, ponctuation).
// Le premier alias est celui affiché dans les messages.
const CHAMPS = {
  produits: {
    nom: ["nom", "produit", "nom commercial", "designation", "libelle"],
    categorie: ["categorie", "type", "famille"],
    amm: ["n° amm", "amm", "numero amm", "no amm"],
    unite: ["unite", "unite par defaut", "unite defaut"],
    prix: ["prix", "prix unitaire", "tarif"],
  },
  cultures: {
    nom: ["nom", "culture"],
    varietes: ["varietes", "variete"],
  },
  varietes: {
    culture: ["culture"],
    variete: ["variete", "nom variete", "nom"],
  },
  traitements: {
    culture: ["culture"],
    traitement: ["traitement", "nom traitement", "operation", "intervention"],
    bbch: ["stade bbch", "bbch", "stade"],
    produit: ["produit", "nom produit"],
    dose: ["dose", "dose ha", "dose par ha"],
    unite: ["unite", "unite dose"],
  },
  parcelles: {
    nom: ["nom", "parcelle", "nom parcelle"],
    surface: ["surface (ha)", "surface", "superficie", "ha"],
    culture: ["culture"],
    ilot: ["ilot pac", "ilot", "n ilot", "numero ilot"],
    pac: ["n° parcelle pac", "parcelle pac", "num parcelle pac", "pac"],
    commune: ["commune", "ville"],
  },
  interventions: {
    date: ["date", "date intervention"],
    heure: ["heure"],
    parcelle: ["parcelle", "nom parcelle"],
    traitement: ["traitement", "nom traitement", "operation", "intervention"],
    variete: ["variete"],
    bbch: ["stade bbch", "bbch", "stade"],
    cible: ["cible"],
    applicateur: ["applicateur", "operateur"],
    commentaire: ["commentaire", "remarque", "observations"],
    surface: ["surface (ha)", "surface traitee (ha)", "surface traitee", "surface"],
    produit: ["produit", "nom produit"],
    dose: ["dose"],
    unite: ["unite", "unite dose"],
  },
};

const OBLIGATOIRES = {
  produits: ["nom"],
  cultures: ["nom"],
  varietes: ["culture", "variete"],
  traitements: ["culture", "traitement"],
  parcelles: ["nom", "surface"],
  interventions: ["date", "parcelle", "traitement"],
};

// ---------------------------------------------------------------- utilitaires

const slug = (s) => normalise(s).replaceAll(" ", "_");

function txt(v) {
  if (v == null) return "";
  return String(v).replace(/\u00a0/g, " ").trim();
}

// nombre : null si vide, NaN si invalide ("12,5" accepté)
function num(v) {
  if (typeof v === "number") return v;
  const s = txt(v).replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

function uniteCanonique(v) {
  const s = txt(v).replace(/\s/g, "").toLowerCase();
  if (!s) return "";
  return UNITES.find((u) => u.toLowerCase() === s) || null;
}

// BBCH : 0 numérique -> "00"
function bbch(v) {
  if (typeof v === "number" && Number.isInteger(v)) return String(v).padStart(2, "0");
  return txt(v);
}

function decouper(v) {
  return txt(v).split(/[,;/\n]/).map((x) => x.trim()).filter(Boolean);
}

function lireDate(v) {
  if (typeof v === "number") {
    if (v < 20000 || v > 80000) return null;
    const r = serialVersDate(v);
    return r.date ? r : null;
  }
  const s = txt(v);
  if (!s) return null;
  let j, mo, a, h, mi;
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?:[ T]+(\d{1,2})[:h](\d{2}))?/.exec(s);
  if (m) {
    j = +m[1]; mo = +m[2]; a = +m[3]; if (m[3].length === 2) a += 2000;
    [h, mi] = [m[4], m[5]];
  } else {
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]+(\d{1,2}):(\d{2}))?/.exec(s);
    if (!m) return null;
    a = +m[1]; mo = +m[2]; j = +m[3];
    [h, mi] = [m[4], m[5]];
  }
  const d = new Date(Date.UTC(a, mo - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) return null;
  const p = (n) => String(n).padStart(2, "0");
  return { date: `${p(j)}/${p(mo)}/${a}`, heure: h !== undefined ? `${p(h)}:${mi}` : "" };
}

function lireHeure(v) {
  if (typeof v === "number") return v > 0 && v < 1 ? serialVersDate(v).heure : "";
  const m = /^(\d{1,2})[:h](\d{2})/.exec(txt(v));
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
}

function fabriqueId(etat) {
  let n = Date.now();
  for (const liste of [etat.produits, etat.parcelles, etat.interventions]) {
    for (const x of liste) if (Number.isFinite(x.id)) n = Math.max(n, x.id);
  }
  return () => ++n;
}

function nouveauRapport() {
  return { ajouts: 0, maj: 0, inchanges: 0, ignores: 0, erreurs: [], avertissements: [] };
}
function erreur(rap, t, l, msg) {
  rap.erreurs.push({ feuille: t.nom, ligne: l.n, msg });
  rap.ignores++;
}
function avertir(rap, t, l, msg) {
  rap.avertissements.push({ feuille: t.nom, ligne: l.n, msg });
}

function colonnes(t, type, rap) {
  const entetes = t.entetes.map(normalise);
  const idx = {};
  for (const [champ, alias] of Object.entries(CHAMPS[type])) {
    for (const a of alias) {
      const i = entetes.indexOf(normalise(a));
      if (i >= 0) { idx[champ] = i; break; }
    }
  }
  const manquants = OBLIGATOIRES[type].filter((c) => idx[c] === undefined);
  if (manquants.length) {
    rap.erreurs.push({
      feuille: t.nom,
      ligne: 1,
      msg: `Colonne(s) obligatoire(s) absente(s) : ${manquants.map((m) => CHAMPS[type][m][0]).join(", ")}`,
    });
    return null;
  }
  return idx;
}

const lire = (l, idx, champ) => (idx[champ] === undefined ? null : (l.v[idx[champ]] ?? null));

// Devine le type de données d'un onglet (par son nom, sinon par ses colonnes)
export function devinerType(nom, entetes) {
  const n = normalise(nom);
  if (/lisez|readme|instruction|mode d emploi|aide/.test(n)) return "ignorer";
  if (n.includes("intervention") || n.includes("registre")) return "interventions";
  if (n.includes("traitement")) return "traitements";
  if (n.includes("variete")) return "varietes";
  if (n.includes("culture")) return "cultures";
  if (n.includes("parcelle")) return "parcelles";
  if (n.includes("produit")) return "produits";
  const h = entetes.map(normalise);
  const a = (x) => h.includes(x);
  if (a("amm") || a("n amm") || a("prix") || a("categorie")) return "produits";
  if (a("date")) return "interventions";
  if (a("dose") || a("bbch")) return "traitements";
  if (a("surface") || a("superficie") || a("ilot")) return "parcelles";
  if (a("variete") && a("culture")) return "varietes";
  return "ignorer";
}

// ------------------------------------------------------------- cultures (outils)

function trouverCulture(etat, nom) {
  const n = normalise(nom);
  return etat.cultures.find((c) => normalise(c.nom) === n || c.id === slug(nom));
}

function creerCulture(etat, nom) {
  const base = slug(nom) || "culture";
  let id = base;
  for (let k = 2; etat.cultures.some((c) => c.id === id); k++) id = `${base}_${k}`;
  const c = { id, nom: nom.trim(), varietes: [], traitements: [] };
  etat.cultures.push(c);
  return c;
}

// culture existante, sinon créée avec un avertissement (une seule fois)
function cultureOuCreer(etat, nom, rap, t, l, creees) {
  let c = trouverCulture(etat, nom);
  if (!c) {
    c = creerCulture(etat, nom);
    if (!creees.has(c.id)) {
      creees.add(c.id);
      avertir(rap, t, l, `Culture « ${c.nom} » inconnue : créée automatiquement.`);
    }
  }
  return c;
}

function ajouterVariete(c, v) {
  const n = normalise(v);
  if (!n || c.varietes.some((x) => normalise(x) === n)) return false;
  c.varietes.push(v.trim());
  return true;
}

// ------------------------------------------------------------------ importeurs

function importerProduits(etat, tables, rap, nextId) {
  for (const t of tables) {
    const idx = colonnes(t, "produits", rap);
    if (!idx) continue;
    for (const l of t.lignes) {
      const g = (c) => lire(l, idx, c);
      const nom = txt(g("nom"));
      if (!validateNomProduit(nom)) { erreur(rap, t, l, "nom du produit manquant (2 caractères minimum)"); continue; }

      const amm = txt(g("amm"));
      if (!validateAMM(amm)) { erreur(rap, t, l, `« ${nom} » : n° AMM invalide (6 à 8 chiffres)`); continue; }

      const uniteBrute = txt(g("unite"));
      const unite = uniteCanonique(uniteBrute);
      if (uniteBrute && unite === null) { erreur(rap, t, l, `« ${nom} » : unité « ${uniteBrute} » inconnue (${UNITES.join(", ")})`); continue; }

      const prix = num(g("prix"));
      if (Number.isNaN(prix) || (prix !== null && !validatePrice(prix))) { erreur(rap, t, l, `« ${nom} » : prix invalide`); continue; }

      // catégorie : reprend l'écriture d'une catégorie existante, sinon l'ajoute à la liste
      let categorie = txt(g("categorie"));
      if (categorie) {
        const existante = etat.categories.find((x) => normalise(x) === normalise(categorie));
        if (existante) categorie = existante;
        else etat.categories.push(categorie);
      }
      const fournis = {};
      if (categorie) fournis.categorie = categorie;
      if (amm) fournis.amm = amm;
      if (unite) fournis.uniteDefaut = unite;
      if (prix !== null) fournis.prix = prix;

      const i = etat.produits.findIndex((p) => normalise(p.nom) === normalise(nom));
      if (i >= 0) {
        const fusion = { ...etat.produits[i], ...fournis };
        if (JSON.stringify(fusion) === JSON.stringify(etat.produits[i])) rap.inchanges++;
        else { etat.produits[i] = fusion; rap.maj++; }
      } else {
        etat.produits.push({
          id: nextId(), nom, amm: amm || "", uniteDefaut: unite || "L/ha", prix: prix ?? 0, categorie: categorie || "",
        });
        rap.ajouts++;
      }
    }
  }
}

function importerCultures(etat, tables, rap) {
  for (const t of tables) {
    const idx = colonnes(t, "cultures", rap);
    if (!idx) continue;
    for (const l of t.lignes) {
      const nom = txt(lire(l, idx, "nom"));
      if (!nom) { erreur(rap, t, l, "nom de la culture manquant"); continue; }
      let c = trouverCulture(etat, nom);
      const cree = !c;
      if (!c) c = creerCulture(etat, nom);
      const avant = JSON.stringify(c);
      for (const v of decouper(lire(l, idx, "varietes"))) ajouterVariete(c, v);
      if (cree) rap.ajouts++;
      else if (JSON.stringify(c) !== avant) rap.maj++;
      else rap.inchanges++;
    }
  }
}

function importerVarietes(etat, tables, rap) {
  const creees = new Set();
  for (const t of tables) {
    const idx = colonnes(t, "varietes", rap);
    if (!idx) continue;
    for (const l of t.lignes) {
      const cNom = txt(lire(l, idx, "culture"));
      const v = txt(lire(l, idx, "variete"));
      if (!cNom || !v) { erreur(rap, t, l, "culture ou variété manquante"); continue; }
      const c = cultureOuCreer(etat, cNom, rap, t, l, creees);
      if (ajouterVariete(c, v)) rap.ajouts++;
      else rap.inchanges++;
    }
  }
}

function importerTraitements(etat, tables, rap) {
  const creees = new Set();
  for (const t of tables) {
    const idx = colonnes(t, "traitements", rap);
    if (!idx) continue;

    // 1) regrouper : même culture + même traitement = un seul traitement, plusieurs produits
    const groupes = new Map();
    for (const l of t.lignes) {
      const g = (c) => lire(l, idx, c);
      const cNom = txt(g("culture"));
      const tNom = txt(g("traitement"));
      if (!cNom || !tNom) { erreur(rap, t, l, "culture ou traitement manquant"); continue; }

      const pNom = txt(g("produit"));
      let ligneProduit = null;
      if (pNom) {
        const produit = etat.produits.find((p) => normalise(p.nom) === normalise(pNom));
        if (!produit) { erreur(rap, t, l, `produit « ${pNom} » inconnu (à ajouter dans les produits)`); continue; }
        const dose = num(g("dose"));
        if (dose === null || Number.isNaN(dose) || dose < 0) { erreur(rap, t, l, `dose manquante ou invalide pour « ${pNom} »`); continue; }
        const uBrute = txt(g("unite"));
        const u = uniteCanonique(uBrute);
        if (uBrute && u === null) { erreur(rap, t, l, `unité « ${uBrute} » inconnue`); continue; }
        ligneProduit = { produitId: produit.id, dose, unite: u || produit.uniteDefaut };
      }

      const cle = `${normalise(cNom)}|${normalise(tNom)}`;
      if (!groupes.has(cle)) groupes.set(cle, { cNom, tNom, bbch: "", produits: [], l });
      const grp = groupes.get(cle);
      if (!grp.bbch) grp.bbch = bbch(g("bbch"));
      if (ligneProduit) grp.produits.push(ligneProduit);
    }

    // 2) appliquer
    for (const grp of groupes.values()) {
      const c = cultureOuCreer(etat, grp.cNom, rap, t, grp.l, creees);
      const i = c.traitements.findIndex((x) => normalise(x.nom) === normalise(grp.tNom));
      if (i >= 0) {
        const ancien = c.traitements[i];
        const fusion = {
          ...ancien,
          bbch: grp.bbch || ancien.bbch,
          produits: grp.produits.length ? grp.produits : ancien.produits,
        };
        if (JSON.stringify(fusion) === JSON.stringify(ancien)) rap.inchanges++;
        else { c.traitements[i] = fusion; rap.maj++; }
      } else {
        const base = slug(grp.tNom) || "traitement";
        let id = base;
        for (let k = 2; c.traitements.some((x) => x.id === id); k++) id = `${base}_${k}`;
        c.traitements.push({ id, nom: grp.tNom, bbch: grp.bbch, produits: grp.produits });
        rap.ajouts++;
      }
    }
  }
}

function importerParcelles(etat, tables, rap, nextId) {
  const creees = new Set();
  for (const t of tables) {
    const idx = colonnes(t, "parcelles", rap);
    if (!idx) continue;
    for (const l of t.lignes) {
      const g = (c) => lire(l, idx, c);
      const nom = txt(g("nom"));
      if (!nom) { erreur(rap, t, l, "nom de la parcelle manquant"); continue; }
      const surface = num(g("surface"));
      if (surface === null || Number.isNaN(surface) || surface <= 0) { erreur(rap, t, l, `« ${nom} » : surface manquante ou invalide`); continue; }

      const cNom = txt(g("culture"));
      const culture = cNom ? cultureOuCreer(etat, cNom, rap, t, l, creees) : null;
      if (!culture) avertir(rap, t, l, `« ${nom} » : pas de culture indiquée.`);

      const fournis = { surface };
      if (culture) fournis.cultureId = culture.id;
      if (txt(g("ilot"))) fournis.ilot = txt(g("ilot"));
      if (txt(g("pac"))) fournis.pacParcelle = txt(g("pac"));
      if (txt(g("commune"))) fournis.commune = txt(g("commune"));

      const i = etat.parcelles.findIndex((p) => normalise(p.nom) === normalise(nom));
      if (i >= 0) {
        const fusion = { ...etat.parcelles[i], ...fournis };
        if (JSON.stringify(fusion) === JSON.stringify(etat.parcelles[i])) rap.inchanges++;
        else { etat.parcelles[i] = fusion; rap.maj++; }
      } else {
        etat.parcelles.push({
          id: nextId(), nom, surface, cultureId: fournis.cultureId || "",
          ilot: fournis.ilot || "", pacParcelle: fournis.pacParcelle || "", commune: fournis.commune || "",
        });
        rap.ajouts++;
      }
    }
  }
}

function importerInterventions(etat, tables, rap, nextId) {
  const groupes = new Map();

  for (const t of tables) {
    const idx = colonnes(t, "interventions", rap);
    if (!idx) continue;
    for (const l of t.lignes) {
      const g = (c) => lire(l, idx, c);

      const d = lireDate(g("date"));
      if (!d) { erreur(rap, t, l, `date invalide « ${txt(g("date"))} » (format jj/mm/aaaa)`); continue; }
      const heure = lireHeure(g("heure")) || d.heure;

      const pNom = txt(g("parcelle"));
      const parcelle = etat.parcelles.find((p) => normalise(p.nom) === normalise(pNom));
      if (!parcelle) { erreur(rap, t, l, `parcelle « ${pNom} » inconnue`); continue; }
      const culture = etat.cultures.find((c) => c.id === parcelle.cultureId);
      if (!culture) { erreur(rap, t, l, `la parcelle « ${parcelle.nom} » n'a pas de culture`); continue; }

      const tNom = txt(g("traitement"));
      const traitement = culture.traitements?.find((x) => normalise(x.nom) === normalise(tNom));
      if (!traitement) { erreur(rap, t, l, `traitement « ${tNom} » inconnu pour la culture ${culture.nom}`); continue; }

      const variete = txt(g("variete"));
      if (variete && !culture.varietes.some((v) => normalise(v) === normalise(variete))) {
        avertir(rap, t, l, `variété « ${variete} » absente de la culture ${culture.nom}`);
      }

      // produit éventuel de cette ligne
      let ligneProduit = null;
      const prNom = txt(g("produit"));
      if (prNom) {
        const produit = etat.produits.find((p) => normalise(p.nom) === normalise(prNom));
        if (!produit) { erreur(rap, t, l, `produit « ${prNom} » inconnu`); continue; }
        const defaut = traitement.produits?.find((p) => p.produitId === produit.id);
        let dose = num(g("dose"));
        if (dose === null) dose = defaut?.dose ?? null;
        if (dose === null || Number.isNaN(dose) || dose < 0) { erreur(rap, t, l, `dose manquante ou invalide pour « ${prNom} »`); continue; }
        const uBrute = txt(g("unite"));
        const u = uniteCanonique(uBrute);
        if (uBrute && u === null) { erreur(rap, t, l, `unité « ${uBrute} » inconnue`); continue; }
        ligneProduit = { produitId: produit.id, dose, unite: u || defaut?.unite || produit.uniteDefaut };
      }

      const cle = [d.date, heure, parcelle.id, traitement.id, normalise(variete)].join("|");
      if (!groupes.has(cle)) {
        const s = num(g("surface"));
        groupes.set(cle, {
          date: d.date, heure, parcelle, culture, traitement, variete,
          bbch: bbch(g("bbch")) || traitement.bbch || "",
          surface: s !== null && !Number.isNaN(s) && s > 0 ? s : parcelle.surface,
          commentaire: txt(g("commentaire")),
          cible: txt(g("cible")),
          applicateur: txt(g("applicateur")),
          produits: [],
        });
      }
      if (ligneProduit) groupes.get(cle).produits.push(ligneProduit);
    }
  }

  const nouvelles = [];
  for (const grp of groupes.values()) {
    const nv = normalise(grp.variete);
    const doublon = etat.interventions.some(
      (e) =>
        e.date === grp.date &&
        e.parcelleId === grp.parcelle.id &&
        e.traitementId === grp.traitement.id &&
        normalise(e.variete || "") === nv &&
        (!grp.heure || !e.heure || e.heure.slice(0, 5) === grp.heure)
    );
    if (doublon) { rap.inchanges++; continue; }
    nouvelles.push(grp);
  }

  // identifiants croissants dans l'ordre chronologique
  nouvelles.sort((a, b) => (dateKey(a.date) + a.heure).localeCompare(dateKey(b.date) + b.heure));
  const ajoutees = nouvelles.map((grp) => ({
    id: nextId(),
    date: grp.date,
    heure: grp.heure,
    parcelleId: grp.parcelle.id,
    cultureId: grp.culture.id,
    traitementId: grp.traitement.id,
    traitementNom: grp.traitement.nom,
    variete: grp.variete,
    bbch: grp.bbch,
    surface: grp.surface,
    commentaire: grp.commentaire,
    cible: grp.cible,
    applicateur: grp.applicateur,
    produits: grp.produits.length ? grp.produits : (grp.traitement.produits || []).map((p) => ({ ...p })),
  }));
  rap.ajouts += ajoutees.length;
  etat.interventions = [...ajoutees.reverse(), ...etat.interventions];
}

const IMPORTEURS = {
  produits: importerProduits,
  cultures: importerCultures,
  varietes: importerVarietes,
  traitements: importerTraitements,
  parcelles: importerParcelles,
  interventions: importerInterventions,
};

// tables[i] est traitée comme un tableau de type types[i] ("ignorer" = laissé de côté).
// Retourne { data, rapport, modifies } SANS rien écrire : l'écran décide ensuite d'enregistrer.
export function construireImport(data, tables, types) {
  const etat = {
    produits: data.produits.map((p) => ({ ...p })),
    cultures: data.cultures.map((c) => ({ ...c, varietes: [...(c.varietes || [])], traitements: [...(c.traitements || [])] })),
    parcelles: data.parcelles.map((p) => ({ ...p })),
    interventions: [...data.interventions],
    categories: categoriesEffectives(data),
  };
  const avant = { ...data, categories: categoriesEffectives(data) };
  const nextId = fabriqueId(etat);
  const rapport = {};

  for (const type of ORDRE) {
    const concernees = tables.filter((_, i) => types[i] === type);
    if (!concernees.length) continue;
    rapport[type] = nouveauRapport();
    IMPORTEURS[type](etat, concernees, rapport[type], nextId);
  }

  const modifies = {};
  for (const k of Object.keys(etat)) modifies[k] = JSON.stringify(etat[k]) !== JSON.stringify(avant[k]);
  return { data: { ...data, ...etat }, rapport, modifies };
}
