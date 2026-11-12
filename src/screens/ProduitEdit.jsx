import { useState } from "react";

import { memeCategorie } from "../services/categories";

const NOUVELLE = "__nouvelle";
const UNITES = ["L/ha", "kg/ha", "g/ha", "ml/ha", "L", "kg"];
const input = "w-full border p-3 rounded-xl mb-3 bg-white";

export default function ProduitEdit({ produit, categories = [], onSave, onCancel }) {
  const [form, setForm] = useState({
    id: produit?.id,
    nom: produit?.nom || "",
    amm: produit?.amm || "",
    uniteDefaut: produit?.uniteDefaut || "L/ha",
    prix: produit?.prix ?? 0,
    categorie: produit?.categorie || "",
  });

  // catégories proposées : la liste + celles créées pendant cette saisie
  const [ajoutees, setAjoutees] = useState([]);
  const choix = [...categories, ...ajoutees];

  function choisirCategorie(valeur) {
    if (valeur !== NOUVELLE) return update("categorie", valeur);
    const saisie = window.prompt("Nom de la nouvelle catégorie")?.trim();
    if (!saisie) return;
    const existante = choix.find((c) => memeCategorie(c, saisie));
    if (!existante) setAjoutees((a) => [...a, saisie]);
    update("categorie", existante || saisie);
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🧪 Produit</h2>

      <input value={form.nom} onChange={(e) => update("nom", e.target.value)} placeholder="Nom" className={input} />
      <input value={form.amm} onChange={(e) => update("amm", e.target.value)} placeholder="N° AMM (6 à 8 chiffres, vide si aucun)" className={input} />

      <select value={form.categorie} onChange={(e) => choisirCategorie(e.target.value)} className={input}>
        <option value="">Catégorie</option>
        {choix.map((c) => <option key={c}>{c}</option>)}
        <option value={NOUVELLE}>➕ Nouvelle catégorie…</option>
      </select>

      <select value={form.uniteDefaut} onChange={(e) => update("uniteDefaut", e.target.value)} className={input}>
        {UNITES.map((u) => <option key={u}>{u}</option>)}
      </select>

      <label className="block text-sm text-gray-500 mb-1">Prix unitaire</label>
      <input
        type="number"
        step="0.01"
        value={form.prix}
        onChange={(e) => update("prix", e.target.value)}
        className={input}
      />

      <div className="flex gap-2">
        <button onClick={() => onSave({ ...form, prix: Number(form.prix) })} className="flex-1 bg-green-600 text-white p-3 rounded-xl">💾 Enregistrer</button>
        <button onClick={onCancel} className="flex-1 bg-gray-300 p-3 rounded-xl">Annuler</button>
      </div>
    </div>
  );
}
