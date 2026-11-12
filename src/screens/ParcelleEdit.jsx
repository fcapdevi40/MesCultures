import { useState } from "react";

export default function ParcelleEdit({
  parcelle,
  cultures,
  onSave,
  onCancel,
}) {
  const [form, setForm] =
    useState({
      id: parcelle?.id,

      nom:
        parcelle?.nom || "",

      surface:
        parcelle?.surface || 0,

      cultureId:
        parcelle?.cultureId || "",

      ilot:
        parcelle?.ilot || "",

      pacParcelle:
        parcelle?.pacParcelle || "",

      commune:
        parcelle?.commune || "",
    });

  function update(
    field,
    value
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function save() {
    if (!form.nom.trim()) {
      alert(
        "Nom de parcelle obligatoire"
      );
      return;
    }

    if (
      Number(form.surface) <= 0
    ) {
      alert(
        "Surface invalide"
      );
      return;
    }

    if (!form.cultureId) {
      alert(
        "Culture obligatoire"
      );
      return;
    }

    onSave({
      ...form,

      surface:
        Number(form.surface),
    });
  }

  return (
    <div>

      <h2
        className="
          text-2xl
          font-bold
          mb-4
        "
      >
        📍 Parcelle
      </h2>

      <input
        value={form.nom}
        onChange={(e) =>
          update(
            "nom",
            e.target.value
          )
        }
        placeholder="Nom parcelle"
        className="
          w-full
          border
          p-3
          rounded-xl
          mb-3
        "
      />

      <input
        type="number"
        step="0.01"
        value={form.surface}
        onChange={(e) =>
          update(
            "surface",
            e.target.value
          )
        }
        placeholder="Surface (ha)"
        className="
          w-full
          border
          p-3
          rounded-xl
          mb-3
        "
      />

      <select
        value={form.cultureId}
        onChange={(e) =>
          update(
            "cultureId",
            e.target.value
          )
        }
        className="
          w-full
          border
          p-3
          rounded-xl
          mb-3
        "
      >
        <option value="">
          Choisir une culture
        </option>

        {cultures.map(
          (culture) => (
            <option
              key={culture.id}
              value={
                culture.id
              }
            >
              {culture.nom}
            </option>
          )
        )}
      </select>

      <input
        value={form.ilot}
        onChange={(e) =>
          update(
            "ilot",
            e.target.value
          )
        }
        placeholder="Îlot PAC"
        className="
          w-full
          border
          p-3
          rounded-xl
          mb-3
        "
      />

      <input
        value={form.pacParcelle}
        onChange={(e) =>
          update(
            "pacParcelle",
            e.target.value
          )
        }
        placeholder="N° parcelle PAC (dans l'îlot)"
        className="
          w-full
          border
          p-3
          rounded-xl
          mb-3
        "
      />

      <input
        value={form.commune}
        onChange={(e) =>
          update(
            "commune",
            e.target.value
          )
        }
        placeholder="Commune"
        className="
          w-full
          border
          p-3
          rounded-xl
          mb-4
        "
      />

      <div className="flex gap-2">

        <button
          onClick={save}
          className="
            flex-1
            bg-green-600
            text-white
            p-3
            rounded-xl
          "
        >
          💾 Sauvegarder
        </button>

        <button
          onClick={onCancel}
          className="
            flex-1
            bg-gray-300
            p-3
            rounded-xl
          "
        >
          Annuler
        </button>

      </div>

    </div>
  );
}