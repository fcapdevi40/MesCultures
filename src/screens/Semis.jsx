import { useState } from "react";
import { saveInterventions } from "../services/api";
import { lirePref, ecrirePref } from "../services/stockage";
import { normalise } from "../services/texte";

// Une intervention est un semis si son nom contient « semis » / « semer » / « semailles »
const estSemis = (traitement) =>
  /\b(semis|semer|semailles?)\b/.test(normalise(traitement?.nom));

const champ = "w-full border p-3 rounded-xl mb-3";

export default function Semis({ data, setData, annee }) {
  const [parcelleId, setParcelleId] = useState("");
  const [traitementId, setTraitementId] = useState("");
  const [variete, setVariete] = useState("");
  const [bbch, setBbch] = useState("00");
  const [commentaire, setCommentaire] = useState("");
  const [cible, setCible] = useState("");
  // le dernier applicateur est mémorisé : inutile de le retaper à chaque fois
  const [applicateur, setApplicateur] = useState(() => lirePref("applicateur") || "");

  const parcelle = data.parcelles.find((p) => String(p.id) === String(parcelleId));
  const culture = data.cultures.find((c) => c.id === parcelle?.cultureId);
  const traitement = culture?.traitements?.find((t) => String(t.id) === String(traitementId));
  const semis = estSemis(traitement);

  function choisirParcelle(id) {
    setParcelleId(id);
    setTraitementId("");
    setVariete("");
  }

  function choisirIntervention(id) {
    setTraitementId(id);
    const t = culture?.traitements?.find((x) => String(x.id) === String(id));
    if (!estSemis(t)) setVariete(""); // la variété ne concerne que le semis
  }

  async function saveIntervention() {
    if (!parcelle) return alert("Parcelle obligatoire");
    if (!traitement) return alert("Intervention obligatoire");

    const intervention = {
      id: Date.now(),
      date: new Date().toLocaleDateString("fr-FR"),
      heure: new Date().toLocaleTimeString("fr-FR"),
      parcelleId: parcelle.id,
      cultureId: culture.id,
      traitementId: traitement.id,
      traitementNom: traitement.nom,
      variete: semis ? variete : "",
      bbch,
      surface: parcelle.surface,
      commentaire,
      cible: cible.trim(),
      applicateur: applicateur.trim(),
      produits: traitement.produits || [],
    };

    const interventions = [intervention, ...data.interventions];

    try {
      await saveInterventions(annee, interventions);
      setData({ ...data, interventions });
      alert("Intervention enregistrée");

      ecrirePref("applicateur", applicateur.trim());
      setCommentaire("");
      setCible("");
      setVariete("");
    } catch {
      alert("Erreur sauvegarde");
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🌱 Intervention {annee}</h2>

      <select value={parcelleId} onChange={(e) => choisirParcelle(e.target.value)} className={champ}>
        <option value="">Choisir parcelle</option>
        {data.parcelles.map((p) => (
          <option key={p.id} value={p.id}>{p.nom}</option>
        ))}
      </select>

      {culture && (
        <select value={traitementId} onChange={(e) => choisirIntervention(e.target.value)} className={champ}>
          <option value="">Choisir intervention</option>
          {(culture.traitements || []).map((t) => (
            <option key={t.id} value={t.id}>{t.nom}</option>
          ))}
        </select>
      )}

      {semis && (
        <select value={variete} onChange={(e) => setVariete(e.target.value)} className={champ}>
          <option value="">Choisir variété</option>
          {(culture.varietes || []).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      )}

      <input value={bbch} onChange={(e) => setBbch(e.target.value)} placeholder="BBCH" className={champ} />

      <input
        value={cible}
        onChange={(e) => setCible(e.target.value)}
        placeholder="Cible (ex : graminées, pyrale, limaces…)"
        className={champ}
      />

      <input
        value={applicateur}
        onChange={(e) => setApplicateur(e.target.value)}
        placeholder="Applicateur (nom de la personne)"
        className={champ}
      />

      <textarea
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        placeholder="Commentaire"
        className={champ}
      />

      <button onClick={saveIntervention} className="w-full bg-green-600 text-white p-3 rounded-xl">
        💾 Enregistrer
      </button>
    </div>
  );
}
