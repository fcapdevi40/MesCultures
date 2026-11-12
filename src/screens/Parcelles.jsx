import { useMemo } from "react";
import { useState } from "react";

import ParcelleEdit
  from "./ParcelleEdit";

import { saveFile }
  from "../services/api";

export default function Parcelles({
  data,
  setData,
}) {
  const [editing,
    setEditing] =
    useState(null);

  const [search,
    setSearch] =
    useState("");

  const parcelles =
    useMemo(() => {

      return [
        ...data.parcelles,
      ]

        .filter((p) =>
          p.nom
            .toLowerCase()
            .includes(
              search.toLowerCase()
            )
        )

        .sort((a, b) =>
          a.nom.localeCompare(
            b.nom
          )
        );

    }, [
      data.parcelles,
      search,
    ]);

  async function saveParcelle(
    parcelle
  ) {

    let parcellesUpdated;

    if (parcelle.id) {

      parcellesUpdated =
        data.parcelles.map(
          (p) =>
            p.id ===
            parcelle.id
              ? parcelle
              : p
        );

    } else {

      parcellesUpdated = [
        ...data.parcelles,

        {
          ...parcelle,

          id:
            Date.now(),
        },
      ];
    }

    try {

      await saveFile(
        "parcelles.json",
        parcellesUpdated
      );

      setData({
        ...data,
        parcelles:
          parcellesUpdated,
      });

      setEditing(null);

    } catch {

      alert(
        "Erreur de sauvegarde"
      );
    }
  }

  async function deleteParcelle(
    id
  ) {

    if (
      !window.confirm(
        "Supprimer cette parcelle ?"
      )
    ) {
      return;
    }

    const parcellesUpdated =
      data.parcelles.filter(
        (p) =>
          p.id !== id
      );

    try {

      await saveFile(
        "parcelles.json",
        parcellesUpdated
      );

      setData({
        ...data,
        parcelles:
          parcellesUpdated,
      });

    } catch {

      alert(
        "Erreur serveur"
      );
    }
  }

  function getCultureName(
    cultureId
  ) {

    return (
      data.cultures.find(
        (c) =>
          c.id ===
          cultureId
      )?.nom || "-"
    );
  }

  if (editing) {

    return (
      <ParcelleEdit
        parcelle={editing}
        cultures={
          data.cultures
        }
        onSave={
          saveParcelle
        }
        onCancel={() =>
          setEditing(null)
        }
      />
    );
  }

  return (
    <div>

      <div
        className="
          flex
          justify-between
          items-center
          mb-4
        "
      >

        <h2
          className="
            text-2xl
            font-bold
          "
        >
          📍 Parcelles
        </h2>

        <button
          onClick={() =>
            setEditing({
              nom: "",
              surface: 0,
              cultureId: "",
              ilot: "",
              pacParcelle: "",
              commune: "",
            })
          }
          className="
            bg-green-600
            text-white
            px-4
            py-2
            rounded-xl
          "
        >
          ➕
        </button>

      </div>

      <input
        value={search}
        onChange={(e) =>
          setSearch(
            e.target.value
          )
        }
        placeholder="Rechercher une parcelle"
        className="
          w-full
          border
          p-3
          rounded-xl
          mb-4
        "
      />

      <div
        className="
          text-sm
          text-gray-500
          mb-4
        "
      >
        {
          parcelles.length
        }
        {" "}
        parcelle(s)
      </div>

      {parcelles.map(
        (parcelle) => (

          <div
            key={parcelle.id}
            className="
              bg-white
              shadow
              rounded-2xl
              p-4
              mb-3
            "
          >

            <div
              className="
                text-lg
                font-bold
              "
            >
              {parcelle.nom}
            </div>

            <div>
              Surface :
              {" "}
              {parcelle.surface}
              {" "}ha
            </div>

            <div>
              Culture :
              {" "}
              {
                getCultureName(
                  parcelle.cultureId
                )
              }
            </div>

            <div>
              Îlot :
              {" "}
              {parcelle.ilot}
              {parcelle.pacParcelle
                ? ` · parcelle ${parcelle.pacParcelle}`
                : ""}
            </div>

            <div>
              Commune :
              {" "}
              {
                parcelle.commune
              }
            </div>

            <div
              className="
                flex
                gap-2
                mt-4
              "
            >

              <button
                onClick={() =>
                  setEditing(
                    parcelle
                  )
                }
                className="
                  flex-1
                  bg-blue-600
                  text-white
                  p-2
                  rounded-xl
                "
              >
                ✏ Modifier
              </button>

              <button
                onClick={() =>
                  deleteParcelle(
                    parcelle.id
                  )
                }
                className="
                  flex-1
                  bg-red-600
                  text-white
                  p-2
                  rounded-xl
                "
              >
                🗑 Supprimer
              </button>

            </div>

          </div>

        )
      )}

    </div>
  );
}