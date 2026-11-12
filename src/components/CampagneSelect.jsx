const NOUVELLE = "__nouvelle";

export default function CampagneSelect({ annee, annees, onChange, onNouvelle }) {
  return (
    <div className="flex justify-end items-center gap-2 mb-3 text-sm text-gray-600">
      <label htmlFor="campagne">Campagne</label>
      <select
        id="campagne"
        value={annee}
        onChange={(e) =>
          e.target.value === NOUVELLE ? onNouvelle() : onChange(Number(e.target.value))
        }
        className="border rounded-lg px-2 py-1 bg-white"
      >
        {annees.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
        <option value={NOUVELLE}>➕ Nouvelle campagne…</option>
      </select>
    </div>
  );
}
