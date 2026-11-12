import { useMemo, useState } from "react";
import { lireClasseur } from "../services/xlsxRead";
import { lireCsv } from "../services/csvRead";
import { TYPES, ORDRE, LIBELLES, devinerType, construireImport } from "../services/importData";
import { feuillesModele, feuillesDonnees } from "../services/modele";
import { telechargerClasseur } from "../services/exportExcel";
import { downloadBlob, nomFichier } from "../services/download";
import { saveFile, saveInterventions, loadAllData, loadBackup, fetchGsheet } from "../services/api";

const MAX_OCTETS = 10 * 1024 * 1024;
const MAX_MESSAGES = 40;

export default function Import({ data, setData, annee }) {
  const [tables, setTables] = useState(null);
  const [types, setTypes] = useState([]);
  const [source, setSource] = useState("");
  const [lienGsheet, setLienGsheet] = useState("");
  const [message, setMessage] = useState(null); // { ok: bool, texte }
  const [occupe, setOccupe] = useState(false);

  // Simulation de l'import (rien n'est écrit tant qu'on n'a pas validé)
  const plan = useMemo(
    () => (tables ? construireImport(data, tables, types) : null),
    [data, tables, types]
  );

  async function charger(buffer, nom) {
    setMessage(null);
    try {
      const o = new Uint8Array(buffer);
      let lues;
      if (o[0] === 0x50 && o[1] === 0x4b) lues = await lireClasseur(buffer); // .xlsx (zip)
      else if (o[0] === 0xd0 && o[1] === 0xcf)
        throw new Error("Ancien format .xls : enregistre le fichier en .xlsx (ou .csv) puis réessaie.");
      else lues = lireCsv(buffer, nom.replace(/\.[^.]+$/, ""));

      setTables(lues);
      setTypes(lues.map((t) => devinerType(t.nom, t.entetes)));
      setSource(nom);
    } catch (e) {
      setTables(null);
      setMessage({ ok: false, texte: e.message });
    }
  }

  async function choisirFichier(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_OCTETS) return setMessage({ ok: false, texte: "Fichier trop volumineux (10 Mo max)." });
    setOccupe(true);
    await charger(await f.arrayBuffer(), f.name);
    setOccupe(false);
  }

  async function recupererGsheet() {
    if (!lienGsheet.trim()) return;
    setOccupe(true);
    setMessage(null);
    try {
      await charger(await fetchGsheet(lienGsheet.trim()), "Google Sheets");
    } catch (e) {
      setTables(null);
      setMessage({ ok: false, texte: e.message });
    }
    setOccupe(false);
  }

  function changerType(i, type) {
    setTypes((t) => t.map((x, k) => (k === i ? type : x)));
  }

  async function sauvegardeJson() {
    try {
      const blob = new Blob([JSON.stringify(await loadBackup(), null, 2)], { type: "application/json" });
      downloadBlob(nomFichier("sauvegarde-mescultures", "json"), blob);
    } catch (e) {
      setMessage({ ok: false, texte: e.message });
    }
  }

  async function appliquer() {
    const { data: suivant, modifies } = plan;
    setOccupe(true);
    try {
      if (modifies.categories) await saveFile("categories.json", suivant.categories);
      if (modifies.produits) await saveFile("produits.json", suivant.produits);
      if (modifies.cultures) await saveFile("cultures.json", suivant.cultures);
      if (modifies.parcelles) await saveFile("parcelles.json", suivant.parcelles);
      if (modifies.interventions) await saveInterventions(annee, suivant.interventions);
      setData(suivant);
      setMessage({ ok: true, texte: `Import terminé : ${resume(plan.rapport)}.` });
      setTables(null);
      setTypes([]);
    } catch (e) {
      // on recharge l'état réel du serveur : certains fichiers ont pu être écrits avant l'erreur
      try { setData(await loadAllData(annee)); } catch { /* serveur injoignable */ }
      setMessage({ ok: false, texte: `Import interrompu : ${e.message}. Vérifie les données avant de recommencer.` });
    }
    setOccupe(false);
  }

  const activite = plan ? ORDRE.filter((k) => plan.rapport[k]) : [];
  const total = activite.reduce((s, k) => s + plan.rapport[k].ajouts + plan.rapport[k].maj, 0);
  const erreurs = activite.flatMap((k) => plan.rapport[k].erreurs.map((e) => ({ ...e, type: k })));
  const avertissements = activite.flatMap((k) => plan.rapport[k].avertissements.map((e) => ({ ...e, type: k })));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">📥 Importer des données</h2>
      <p className="text-sm text-gray-600 mb-4">
        Remplis un classeur Excel (ou Google Sheets) pour pré-remplir produits, cultures, traitements,
        parcelles et interventions. L'import ajoute ou met à jour, il ne supprime jamais rien.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={() => telechargerClasseur(feuillesModele(), "modele-import-mescultures")}
          className="bg-white border rounded-xl p-3 text-sm"
        >
          📄 Modèle Excel
        </button>
        <button
          onClick={() => telechargerClasseur(feuillesDonnees(data), `donnees-mescultures-${annee}`)}
          className="bg-white border rounded-xl p-3 text-sm"
        >
          📊 Mes données (Excel)
        </button>
      </div>
      <button onClick={sauvegardeJson} className="w-full bg-white border rounded-xl p-3 text-sm mb-5">
        💾 Sauvegarde complète (JSON) avant import
      </button>

      <label className="block bg-green-600 text-white text-center rounded-xl p-3 mb-3 cursor-pointer">
        📂 Choisir un fichier (.xlsx ou .csv)
        <input type="file" accept=".xlsx,.xlsm,.csv,.txt" onChange={choisirFichier} className="hidden" />
      </label>

      <div className="flex gap-2 mb-1">
        <input
          value={lienGsheet}
          onChange={(e) => setLienGsheet(e.target.value)}
          placeholder="…ou lien Google Sheets"
          className="flex-1 min-w-0 border p-3 rounded-xl bg-white text-sm"
        />
        <button
          onClick={recupererGsheet}
          disabled={occupe || !lienGsheet.trim()}
          className="bg-blue-600 text-white px-4 rounded-xl disabled:opacity-40"
        >
          Récupérer
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        Google Sheets : partage-le avec « Tous les utilisateurs disposant du lien » (lecteur).
      </p>

      {occupe && <div className="text-gray-500 mb-3">⏳ Traitement en cours…</div>}

      {message && (
        <div
          className={`rounded-xl p-3 mb-4 text-sm border ${
            message.ok ? "bg-green-50 border-green-300 text-green-900" : "bg-red-50 border-red-300 text-red-900"
          }`}
        >
          {message.ok ? "✅" : "⚠️"} {message.texte}
        </div>
      )}

      {tables && plan && (
        <div>
          <h3 className="font-bold mb-2">Contenu de « {source} »</h3>
          {tables.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl shadow p-3 mb-2">
              <div className="flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <div className="font-bold truncate">{t.nom}</div>
                  <div className="text-xs text-gray-500">{t.lignes.length} ligne(s)</div>
                </div>
                <select
                  value={types[i]}
                  onChange={(e) => changerType(i, e.target.value)}
                  className="border rounded-lg p-2 text-sm"
                >
                  {TYPES.map(([id, nom]) => (
                    <option key={id} value={id}>{nom}</option>
                  ))}
                  <option value="ignorer">— Ignorer —</option>
                </select>
              </div>
            </div>
          ))}

          {activite.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-3 my-4">
              <h3 className="font-bold mb-2">Ce que l'import va faire</h3>
              {activite.map((k) => {
                const r = plan.rapport[k];
                return (
                  <div key={k} className="text-sm mb-1">
                    <b>{LIBELLES[k]}</b> : {r.ajouts} ajout(s), {r.maj} mise(s) à jour, {r.inchanges} inchangé(s)
                    {r.erreurs.length > 0 && <span className="text-red-700">, {r.erreurs.length} erreur(s)</span>}
                  </div>
                );
              })}
              {annee && plan.rapport.interventions && (
                <div className="text-xs text-gray-500 mt-2">
                  Les interventions seront ajoutées à la campagne {annee}.
                </div>
              )}
            </div>
          )}

          {erreurs.length > 0 && (
            <Liste
              titre={`Lignes ignorées (${erreurs.length})`}
              couleur="red"
              items={erreurs}
              note="Ces lignes ne seront pas importées. Corrige-les dans le fichier et réimporte : les lignes déjà importées ne seront pas dupliquées."
            />
          )}
          {avertissements.length > 0 && (
            <Liste titre={`À vérifier (${avertissements.length})`} couleur="amber" items={avertissements} />
          )}

          {activite.length === 0 && (
            <div className="text-gray-500 my-4">
              Aucun onglet reconnu : choisis le type de données de chaque onglet ci-dessus.
            </div>
          )}

          <button
            onClick={appliquer}
            disabled={occupe || total === 0}
            className="w-full bg-green-600 text-white p-3 rounded-xl mb-2 disabled:opacity-40"
          >
            {total === 0 ? "Rien à importer" : `✅ Importer (${total} modification${total > 1 ? "s" : ""})`}
          </button>
          <button
            onClick={() => { setTables(null); setTypes([]); }}
            className="w-full bg-gray-300 p-3 rounded-xl"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

function resume(rapport) {
  const morceaux = ORDRE.filter((k) => rapport[k] && (rapport[k].ajouts || rapport[k].maj)).map((k) => {
    const r = rapport[k];
    return `${LIBELLES[k].toLowerCase()} +${r.ajouts}${r.maj ? ` / ${r.maj} mis à jour` : ""}`;
  });
  return morceaux.join(", ") || "aucune modification";
}

function Liste({ titre, couleur, items, note }) {
  const styles = {
    red: "bg-red-50 border-red-300 text-red-900",
    amber: "bg-amber-50 border-amber-300 text-amber-900",
  };
  return (
    <div className={`rounded-xl border p-3 mb-3 text-sm ${styles[couleur]}`}>
      <div className="font-bold mb-1">{titre}</div>
      <ul className="list-disc ml-5">
        {items.slice(0, MAX_MESSAGES).map((e, i) => (
          <li key={i}>
            {e.feuille} ligne {e.ligne} : {e.msg}
          </li>
        ))}
      </ul>
      {items.length > MAX_MESSAGES && <div className="mt-1">… et {items.length - MAX_MESSAGES} autre(s).</div>}
      {note && <div className="mt-2 text-xs">{note}</div>}
    </div>
  );
}
