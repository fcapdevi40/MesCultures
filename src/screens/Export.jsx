import { useMemo, useState } from "react";
import { genererRegistre } from "../services/registrePhyto";
import { exportCsv } from "../services/exportCsv";
import { exportExcel } from "../services/exportExcel";

export default function Export({ data, annee }) {
  const [parcelleId, setParcelleId] = useState("");
  const [seulementAmm, setSeulementAmm] = useState(false);

  const rows = useMemo(
    () => genererRegistre(data, { parcelleId, seulementAmm }),
    [data, parcelleId, seulementAmm]
  );

  // Lignes avec produit (hors lignes vides) auxquelles il manque une info exigée au registre
  const incompletes = rows.filter((r) => r.produit && (!r.cible || !r.applicateur)).length;

  const nbInterventions = new Set(rows.map((r) => `${r.date} ${r.heure} ${r.parcelle}`)).size;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📤 Export du registre {annee}</h2>

      <select
        value={parcelleId}
        onChange={(e) => setParcelleId(e.target.value)}
        className="w-full border p-3 rounded-xl mb-3 bg-white"
      >
        <option value="">Toutes les parcelles</option>
        {data.parcelles.map((p) => (
          <option key={p.id} value={p.id}>{p.nom}</option>
        ))}
      </select>

      <label className="flex items-center gap-2 mb-4 text-sm">
        <input
          type="checkbox"
          checked={seulementAmm}
          onChange={(e) => setSeulementAmm(e.target.checked)}
        />
        Produits phytosanitaires uniquement (avec n° AMM)
      </label>

      <div className="text-sm text-gray-500 mb-3">
        {rows.length} ligne(s) · {nbInterventions} intervention(s)
      </div>

      {incompletes > 0 && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 text-sm rounded-xl p-3 mb-3">
          ⚠️ {incompletes} ligne(s) sans cible ou sans applicateur : ces champs
          sont à renseigner pour un registre complet.
        </div>
      )}

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => exportCsv(rows, annee)}
          disabled={rows.length === 0}
          className="flex-1 bg-green-600 text-white p-3 rounded-xl disabled:opacity-40"
        >
          📄 CSV
        </button>
        <button
          onClick={() => exportExcel(rows, annee)}
          disabled={rows.length === 0}
          className="flex-1 bg-blue-600 text-white p-3 rounded-xl disabled:opacity-40"
        >
          📊 Excel
        </button>
      </div>

      {rows.length === 0 && (
        <div className="text-gray-500">Aucune ligne à exporter avec ces filtres.</div>
      )}

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Parcelle</th>
                <th className="p-2">Produit</th>
                <th className="p-2">Qté</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 whitespace-nowrap">{r.date}</td>
                  <td className="p-2">{r.parcelle}</td>
                  <td className="p-2">{r.produit || "—"}</td>
                  <td className="p-2 whitespace-nowrap">
                    {r.quantite !== "" ? `${r.quantite} ${r.uniteQuantite}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
