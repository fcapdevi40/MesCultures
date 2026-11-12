import { dateKey } from "../services/dates";
import { saveInterventions } from "../services/api";

export default function Historique({ data, setData, annee }) {
  const interventions = [...data.interventions].sort(
    (a, b) =>
      (dateKey(b.date) + (b.heure || "")).localeCompare(dateKey(a.date) + (a.heure || "")) ||
      b.id - a.id
  );

  function nomTraitement(i) {
    if (i.traitementNom) return i.traitementNom;
    const culture = data.cultures.find((c) => c.id === i.cultureId);
    return culture?.traitements?.find((t) => t.id === i.traitementId)?.nom || "-";
  }

  async function supprimer(i) {
    const parcelle = data.parcelles.find((p) => p.id === i.parcelleId);
    const ok = window.confirm(
      `Supprimer cette intervention ?\n\n${parcelle?.nom || "Parcelle supprimée"} · ${nomTraitement(i)}\n${i.date}${i.heure ? ` à ${i.heure}` : ""}\n\nCette action est définitive.`
    );
    if (!ok) return;

    const interventions = data.interventions.filter((x) => x !== i);
    try {
      await saveInterventions(annee, interventions);
      setData({ ...data, interventions });
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression.");
    }
  }

  function nomProduit(id) {
    return data.produits.find((p) => p.id === id)?.nom || `Produit #${id}`;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📋 Historique {annee}</h2>

      {interventions.length === 0 && (
        <div className="text-gray-500">Aucune intervention enregistrée.</div>
      )}

      {interventions.map((i) => {
        const parcelle = data.parcelles.find((p) => p.id === i.parcelleId);
        return (
          <div key={i.id} className="bg-white rounded-2xl shadow p-4 mb-3">
            <div className="font-bold text-lg">{parcelle?.nom || "Parcelle supprimée"}</div>
            <div>Date : {i.date}{i.heure ? ` à ${i.heure}` : ""}</div>
            <div>Variété : {i.variete || "-"}</div>
            <div>Traitement : {nomTraitement(i)}</div>
            <div>BBCH : {i.bbch}</div>
            {i.cible && <div>Cible : {i.cible}</div>}
            {i.applicateur && <div>Applicateur : {i.applicateur}</div>}
            <div>Surface : {i.surface} ha</div>

            {i.produits?.length > 0 && (
              <ul className="mt-2 text-sm text-gray-700 list-disc ml-5">
                {i.produits.map((p, k) => (
                  <li key={k}>{nomProduit(p.produitId)} : {p.dose} {p.unite}</li>
                ))}
              </ul>
            )}

            {i.commentaire && <div className="mt-2 text-sm text-gray-600">{i.commentaire}</div>}

            <button
              onClick={() => supprimer(i)}
              className="mt-3 w-full bg-red-600 text-white rounded-xl p-2 text-sm"
            >
              🗑 Supprimer
            </button>
          </div>
        );
      })}
    </div>
  );
}
