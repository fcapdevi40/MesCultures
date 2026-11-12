// Feuilles de classeur au format attendu par l'import :
// - feuillesModele()       : modèle à remplir (avec un exemple cohérent)
// - feuillesDonnees(data)  : export des données actuelles, ré-importable
import { LIBELLES } from "./importData";

const c = (label, type = "text", largeur) => ({ key: label, label, type, largeur });

const COL = {
  produits: [c("Nom"), c("Catégorie"), c("N° AMM"), c("Unité"), c("Prix", "number")],
  cultures: [c("Nom"), c("Variétés", "text", 40)],
  traitements: [c("Culture"), c("Traitement"), c("Stade BBCH"), c("Produit"), c("Dose", "number"), c("Unité")],
  parcelles: [c("Nom"), c("Surface (ha)", "number"), c("Culture"), c("Îlot PAC"), c("N° parcelle PAC"), c("Commune")],
  interventions: [
    c("Date"), c("Heure"), c("Parcelle"), c("Traitement"), c("Variété"), c("Stade BBCH"),
    c("Cible"), c("Applicateur"), c("Commentaire", "text", 30), c("Surface (ha)", "number"),
    c("Produit"), c("Dose", "number"), c("Unité"),
  ],
};

const onglet = (type, lignes) => ({ nom: LIBELLES[type].replace(" types", ""), colonnes: COL[type], lignes });

const MODE_EMPLOI = [
  "Remplis les onglets utiles (inutile de tous les remplir), supprime les lignes d'exemple, puis importe ce fichier depuis l'écran « Importer ».",
  "Produits : un produit par ligne. Nom obligatoire ; N° AMM de 6 à 8 chiffres (vide si aucun) ; Unité parmi L/ha, kg/ha, g/ha, ml/ha, L, kg.",
  "Cultures : une culture par ligne, variétés séparées par des virgules.",
  "Traitements : un traitement type par culture. Une ligne par produit : la même Culture + le même Traitement sur plusieurs lignes donne plusieurs produits.",
  "Parcelles : Nom et Surface (ha) obligatoires. La culture doit exister (sinon elle est créée automatiquement).",
  "Interventions : Date (jj/mm/aaaa), Parcelle et Traitement obligatoires. Sans produit indiqué, ceux du traitement type sont repris.",
  "Les noms sont reconnus sans tenir compte des majuscules ni des accents. L'import ajoute ou met à jour : il ne supprime jamais rien.",
  "Astuce : mets les colonnes « Îlot PAC » et « N° AMM » au format Texte pour conserver les zéros du début.",
];

const lisezMoi = () => ({
  nom: "Lisez-moi",
  colonnes: [c("Mode d'emploi", "text", 120)],
  lignes: MODE_EMPLOI.map((t) => ({ "Mode d'emploi": t })),
});

export function feuillesModele() {
  return [
    lisezMoi(),
    onglet("produits", [{ Nom: "Exemple produit", "Catégorie": "Désherbage", "N° AMM": "1234567", "Unité": "L/ha", Prix: 10 }]),
    onglet("cultures", [{ Nom: "Exemple culture", "Variétés": "Variété A, Variété B" }]),
    onglet("traitements", [
      { Culture: "Exemple culture", Traitement: "Semis", "Stade BBCH": "00", Produit: "Exemple produit", Dose: 3, "Unité": "L/ha" },
    ]),
    onglet("parcelles", [
      { Nom: "Exemple parcelle", "Surface (ha)": 5.2, Culture: "Exemple culture", "Îlot PAC": "0123", "N° parcelle PAC": "1", Commune: "Ma commune" },
    ]),
    onglet("interventions", [
      {
        Date: "15/04/2027", Heure: "09:30", Parcelle: "Exemple parcelle", Traitement: "Semis", "Variété": "Variété A",
        "Stade BBCH": "00", Cible: "", Applicateur: "Nom Prénom", Commentaire: "",
      },
    ]),
  ];
}

export function feuillesDonnees(data) {
  const produit = (id) => data.produits.find((p) => p.id === id)?.nom || "";
  const culture = (id) => data.cultures.find((x) => x.id === id);

  const traitements = [];
  for (const cu of data.cultures) {
    for (const t of cu.traitements || []) {
      const base = { Culture: cu.nom, Traitement: t.nom, "Stade BBCH": t.bbch || "" };
      if (!t.produits?.length) traitements.push(base);
      for (const p of t.produits || []) {
        traitements.push({ ...base, Produit: produit(p.produitId), Dose: p.dose, "Unité": p.unite });
      }
    }
  }

  const interventions = [];
  for (const i of data.interventions) {
    const pa = data.parcelles.find((p) => p.id === i.parcelleId);
    const tr = culture(i.cultureId)?.traitements?.find((t) => t.id === i.traitementId);
    const base = {
      Date: i.date, Heure: i.heure || "", Parcelle: pa?.nom || "", Traitement: i.traitementNom || tr?.nom || "",
      "Variété": i.variete || "", "Stade BBCH": i.bbch || "", Cible: i.cible || "", Applicateur: i.applicateur || "",
      Commentaire: i.commentaire || "", "Surface (ha)": i.surface,
    };
    if (!i.produits?.length) interventions.push(base);
    for (const p of i.produits || []) {
      interventions.push({ ...base, Produit: produit(p.produitId), Dose: p.dose, "Unité": p.unite });
    }
  }

  return [
    onglet("produits", data.produits.map((p) => ({
      Nom: p.nom, "Catégorie": p.categorie || "", "N° AMM": p.amm || "", "Unité": p.uniteDefaut || "", Prix: p.prix,
    }))),
    onglet("cultures", data.cultures.map((x) => ({ Nom: x.nom, "Variétés": (x.varietes || []).join(", ") }))),
    onglet("traitements", traitements),
    onglet("parcelles", data.parcelles.map((p) => ({
      Nom: p.nom, "Surface (ha)": p.surface, Culture: culture(p.cultureId)?.nom || "", "Îlot PAC": p.ilot || "",
      "N° parcelle PAC": p.pacParcelle || "", Commune: p.commune || "",
    }))),
    onglet("interventions", interventions),
  ];
}
