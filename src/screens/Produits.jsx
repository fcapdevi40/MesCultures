import { useMemo, useState } from "react";
import ProduitEdit from "./ProduitEdit";
import CategoriesEdit from "./CategoriesEdit";
import { categoriesEffectives } from "../services/categories";
import { saveFile } from "../services/api";
import { validateNomProduit, validateAMM, validatePrice } from "../services/validation";

export default function Produits({ data, setData }) {
  const [editing, setEditing] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [gestionCategories, setGestionCategories] = useState(false);

  const produits = useMemo(
    () =>
      [...(data?.produits || [])]
        .filter((p) => p.nom.toLowerCase().includes(recherche.toLowerCase()))
        .sort((a, b) => a.nom.localeCompare(b.nom)),
    [data, recherche]
  );

  async function persist(list) {
    try {
      await saveFile("produits.json", list);
      // une catégorie créée dans le formulaire d'un produit rejoint la liste
      const categories = categoriesEffectives({ ...data, produits: list });
      if (JSON.stringify(categories) !== JSON.stringify(data.categories)) {
        await saveFile("categories.json", categories);
      }
      setData({ ...data, produits: list, categories });
      return true;
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la sauvegarde.");
      return false;
    }
  }

  async function saveProduit(produit) {
    if (!validateNomProduit(produit.nom)) return alert("Nom invalide");
    if (!validateAMM(produit.amm)) return alert("AMM invalide (6 à 8 chiffres)");
    if (!validatePrice(produit.prix)) return alert("Prix invalide");

    const list = produit.id
      ? data.produits.map((p) => (p.id === produit.id ? produit : p))
      : [...data.produits, { ...produit, id: Date.now() }];

    if (await persist(list)) setEditing(null);
  }

  async function deleteProduit(id) {
    const utilise = data.cultures.some((c) =>
      c.traitements?.some((t) => t.produits?.some((p) => p.produitId === id))
    );
    if (utilise) {
      return alert("Impossible : ce produit est utilisé dans un traitement d'une culture.");
    }
    if (!window.confirm("Supprimer ce produit ?")) return;
    await persist(data.produits.filter((p) => p.id !== id));
  }

  if (gestionCategories) {
    return <CategoriesEdit data={data} setData={setData} onClose={() => setGestionCategories(false)} />;
  }

  if (editing) {
    return (
      <ProduitEdit
        produit={editing}
        categories={categoriesEffectives(data)}
        onSave={saveProduit}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">🧪 Produits</h2>
        <button
          onClick={() => setEditing({ nom: "", amm: "", categorie: "", uniteDefaut: "L/ha", prix: 0 })}
          className="bg-green-600 text-white px-4 py-2 rounded-xl"
        >
          ➕
        </button>
      </div>

      <button
        onClick={() => setGestionCategories(true)}
        className="w-full bg-white border rounded-xl p-2 mb-3 text-sm"
      >
        🏷️ Gérer les catégories
      </button>

      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher un produit..."
        className="w-full border p-3 rounded-xl mb-4 bg-white"
      />

      <div className="text-sm text-gray-500 mb-4">{produits.length} produit(s)</div>

      {produits.map((p) => (
        <div key={p.id} className="bg-white rounded-2xl shadow p-4 mb-3">
          <div className="text-lg font-bold">{p.nom}</div>
          <div className="text-sm text-gray-600">
            {p.categorie || "Sans catégorie"} · {p.amm ? `AMM ${p.amm}` : "pas d'AMM"}
          </div>
          <div className="text-sm text-gray-600">
            Unité par défaut : {p.uniteDefaut}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setEditing(p)} className="flex-1 bg-blue-600 text-white rounded-xl p-2">✏ Modifier</button>
            <button onClick={() => deleteProduit(p.id)} className="flex-1 bg-red-600 text-white rounded-xl p-2">🗑 Supprimer</button>
          </div>
        </div>
      ))}
    </div>
  );
}
