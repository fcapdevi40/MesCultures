import { useState } from "react";

const UNITES = ["L/ha", "kg/ha", "g/ha", "ml/ha", "L", "kg"];
const input = "w-full border p-3 rounded-xl mb-3 bg-white";

export default function CultureEdit({ culture, produits = [], onSave, onCancel }) {
  const [form, setForm] = useState({
    id: culture?.id,
    nom: culture?.nom || "",
    varietes: culture?.varietes || [],
    traitements: culture?.traitements || [],
  });
  const [nouvelleVariete, setNouvelleVariete] = useState("");

  // ---- Variétés
  function addVariete() {
    const v = nouvelleVariete.trim();
    if (!v || form.varietes.includes(v)) return;
    setForm((f) => ({ ...f, varietes: [...f.varietes, v] }));
    setNouvelleVariete("");
  }
  function removeVariete(v) {
    setForm((f) => ({ ...f, varietes: f.varietes.filter((x) => x !== v) }));
  }

  // ---- Traitements
  function updateTraitement(index, patch) {
    setForm((f) => ({
      ...f,
      traitements: f.traitements.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  }
  function addTraitement() {
    setForm((f) => ({
      ...f,
      traitements: [
        ...f.traitements,
        { id: `t_${Date.now()}`, nom: "", bbch: "", produits: [] },
      ],
    }));
  }
  function removeTraitement(index) {
    setForm((f) => ({ ...f, traitements: f.traitements.filter((_, i) => i !== index) }));
  }

  // ---- Produits d'un traitement
  function addProduit(tIndex) {
    const t = form.traitements[tIndex];
    updateTraitement(tIndex, {
      produits: [...(t.produits || []), { produitId: "", dose: 0, unite: "L/ha" }],
    });
  }
  function updateProduit(tIndex, pIndex, patch) {
    const t = form.traitements[tIndex];
    updateTraitement(tIndex, {
      produits: t.produits.map((p, i) => (i === pIndex ? { ...p, ...patch } : p)),
    });
  }
  function removeProduit(tIndex, pIndex) {
    const t = form.traitements[tIndex];
    updateTraitement(tIndex, { produits: t.produits.filter((_, i) => i !== pIndex) });
  }
  function choisirProduit(tIndex, pIndex, value) {
    const produit = produits.find((p) => String(p.id) === value);
    updateProduit(tIndex, pIndex, {
      produitId: value === "" ? "" : Number(value),
      ...(produit ? { unite: produit.uniteDefaut } : {}),
    });
  }

  function save() {
    if (!form.nom.trim()) return alert("Le nom de la culture est obligatoire.");
    for (const t of form.traitements) {
      if (!t.nom.trim()) return alert("Chaque traitement doit avoir un nom.");
      for (const p of t.produits || []) {
        if (p.produitId === "") return alert(`Choisis un produit pour le traitement « ${t.nom} ».`);
      }
    }
    onSave({
      ...form,
      nom: form.nom.trim(),
      traitements: form.traitements.map((t) => ({
        ...t,
        produits: (t.produits || []).map((p) => ({ ...p, dose: Number(p.dose) })),
      })),
    });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🌾 Culture</h2>

      <input
        value={form.nom}
        onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
        placeholder="Nom de la culture"
        className={input}
      />

      <h3 className="font-bold mb-2">🌱 Variétés</h3>
      <div className="mb-2">
        {form.varietes.map((v) => (
          <span key={v} className="inline-block bg-white rounded-full px-3 py-1 text-sm mr-1 mb-1 shadow">
            {v}{" "}
            <button onClick={() => removeVariete(v)} className="text-red-600 ml-1">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 mb-5">
        <input
          value={nouvelleVariete}
          onChange={(e) => setNouvelleVariete(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addVariete()}
          placeholder="Nouvelle variété"
          className="flex-1 border p-3 rounded-xl bg-white"
        />
        <button onClick={addVariete} className="bg-green-600 text-white px-4 rounded-xl">➕</button>
      </div>

      <h3 className="font-bold mb-2">🧪 Traitements types</h3>
      {form.traitements.map((t, ti) => (
        <div key={t.id} className="bg-white rounded-2xl shadow p-3 mb-3">
          <div className="flex gap-2 mb-2">
            <input
              value={t.nom}
              onChange={(e) => updateTraitement(ti, { nom: e.target.value })}
              placeholder="Nom (ex: Semis)"
              className="flex-1 border p-2 rounded-xl"
            />
            <input
              value={t.bbch}
              onChange={(e) => updateTraitement(ti, { bbch: e.target.value })}
              placeholder="BBCH"
              className="w-20 border p-2 rounded-xl"
            />
            <button onClick={() => removeTraitement(ti)} className="text-red-600 px-2">🗑</button>
          </div>

          {(t.produits || []).map((p, pi) => (
            <div key={pi} className="flex gap-1 mb-2">
              <select
                value={p.produitId}
                onChange={(e) => choisirProduit(ti, pi, e.target.value)}
                className="flex-1 min-w-0 border p-2 rounded-xl"
              >
                <option value="">Produit…</option>
                {produits.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.nom}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={p.dose}
                onChange={(e) => updateProduit(ti, pi, { dose: e.target.value })}
                className="w-20 border p-2 rounded-xl"
              />
              <select
                value={p.unite}
                onChange={(e) => updateProduit(ti, pi, { unite: e.target.value })}
                className="w-24 border p-2 rounded-xl"
              >
                {UNITES.map((u) => <option key={u}>{u}</option>)}
              </select>
              <button onClick={() => removeProduit(ti, pi)} className="text-red-600 px-1">×</button>
            </div>
          ))}

          <button onClick={() => addProduit(ti)} className="text-sm text-blue-700">
            ➕ Ajouter un produit
          </button>
        </div>
      ))}
      <button onClick={addTraitement} className="w-full border-2 border-dashed rounded-xl p-3 mb-5 text-gray-600">
        ➕ Ajouter un traitement
      </button>

      <div className="flex gap-2">
        <button onClick={save} className="flex-1 bg-green-600 text-white p-3 rounded-xl">💾 Sauvegarder</button>
        <button onClick={onCancel} className="flex-1 bg-gray-300 p-3 rounded-xl">Annuler</button>
      </div>
    </div>
  );
}
