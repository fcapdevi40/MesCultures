import { useState } from "react";
import { saveFile } from "../services/api";
import { categoriesEffectives, memeCategorie } from "../services/categories";

// Gestion des catégories de produits : ajouter, renommer (met à jour les produits), supprimer (si inutilisée)
export default function CategoriesEdit({ data, setData, onClose }) {
  const [nouvelle, setNouvelle] = useState("");
  const categories = categoriesEffectives(data);
  const usage = (c) => data.produits.filter((p) => memeCategorie(p.categorie, c)).length;

  async function enregistrer(liste, produits = data.produits) {
    try {
      // produits d'abord : si la liste échoue ensuite, les catégories utilisées restent visibles
      if (produits !== data.produits) await saveFile("produits.json", produits);
      await saveFile("categories.json", liste);
      setData({ ...data, produits, categories: liste });
      return true;
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la sauvegarde.");
      return false;
    }
  }

  async function ajouter() {
    const nom = nouvelle.trim();
    if (!nom) return;
    if (categories.some((c) => memeCategorie(c, nom))) return alert("Cette catégorie existe déjà.");
    if (await enregistrer([...categories, nom])) setNouvelle("");
  }

  async function renommer(ancien) {
    const saisie = window.prompt("Nouveau nom de la catégorie", ancien);
    const nom = saisie?.trim();
    if (!nom || nom === ancien) return;
    if (categories.some((c) => c !== ancien && memeCategorie(c, nom))) {
      return alert("Une catégorie porte déjà ce nom.");
    }
    const produits = data.produits.map((p) =>
      memeCategorie(p.categorie, ancien) ? { ...p, categorie: nom } : p
    );
    await enregistrer(categories.map((c) => (c === ancien ? nom : c)), produits);
  }

  async function supprimer(nom) {
    const n = usage(nom);
    if (n > 0) {
      return alert(
        `Impossible : ${n} produit(s) utilisent « ${nom} ». Change d'abord leur catégorie, ou renomme celle-ci.`
      );
    }
    if (!window.confirm(`Supprimer la catégorie « ${nom} » ?`)) return;
    await enregistrer(categories.filter((c) => c !== nom));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">🏷️ Catégories</h2>
        <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded-xl">← Retour</button>
      </div>

      {categories.map((c) => (
        <div key={c} className="bg-white rounded-2xl shadow p-3 mb-2 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{c}</div>
            <div className="text-xs text-gray-500">{usage(c)} produit(s)</div>
          </div>
          <button onClick={() => renommer(c)} className="bg-blue-600 text-white rounded-xl px-3 py-2">✏</button>
          <button onClick={() => supprimer(c)} className="bg-red-600 text-white rounded-xl px-3 py-2">🗑</button>
        </div>
      ))}

      <div className="flex gap-2 mt-4">
        <input
          value={nouvelle}
          onChange={(e) => setNouvelle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ajouter()}
          placeholder="Nouvelle catégorie"
          className="flex-1 min-w-0 border p-3 rounded-xl bg-white"
        />
        <button onClick={ajouter} className="bg-green-600 text-white px-4 rounded-xl">➕</button>
      </div>
    </div>
  );
}
