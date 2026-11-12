import { useMemo, useState } from "react";
import CultureEdit from "./CultureEdit";
import { saveFile } from "../services/api";

export default function Cultures({
  data,
  setData,
}) {
  const [editing, setEditing] =
    useState(null);

  const [search,
    setSearch] =
    useState("");

  const cultures =
    useMemo(() => {
      return [...(data?.cultures || [])]
        .filter((culture) =>
          culture.nom
            ?.toLowerCase()
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
      data?.cultures,
      search,
    ]);

  async function saveCulture(
    culture
  ) {
    if (
      !culture.nom ||
      !culture.nom.trim()
    ) {
      alert(
        "Le nom de la culture est obligatoire."
      );
      return;
    }

    let culturesUpdated;

    if (culture.id) {
      culturesUpdated =
        data.cultures.map(
          (c) =>
            c.id === culture.id
              ? culture
              : c
        );
    } else {
      const generatedId =
        culture.nom
          .trim()
          .toLowerCase()
          .replaceAll(
            " ",
            "_"
          );

      if (
        data.cultures.some(
          (c) =>
            c.id ===
            generatedId
        )
      ) {
        alert(
          "Cette culture existe déjà."
        );
        return;
      }

      culturesUpdated = [
        ...data.cultures,
        {
          ...culture,
          id: generatedId,
        },
      ];
    }

    try {
      await saveFile(
        "cultures.json",
        culturesUpdated
      );

      setData({
        ...data,
        cultures:
          culturesUpdated,
      });

      setEditing(null);
    } catch (error) {
      console.error(error);

      alert(
        "Erreur lors de la sauvegarde."
      );
    }
  }

  async function deleteCulture(
    cultureId
  ) {
    const parcellesLiees =
      data.parcelles?.some(
        (p) =>
          p.cultureId ===
          cultureId
      );

    if (
      parcellesLiees
    ) {
      alert(
        "Impossible de supprimer une culture utilisée par une ou plusieurs parcelles."
      );
      return;
    }

    if (
      !window.confirm(
        "Supprimer cette culture ?"
      )
    ) {
      return;
    }

    const culturesUpdated =
      data.cultures.filter(
        (c) =>
          c.id !==
          cultureId
      );

    try {
      await saveFile(
        "cultures.json",
        culturesUpdated
      );

      setData({
        ...data,
        cultures:
          culturesUpdated,
      });
    } catch (error) {
      console.error(error);

      alert(
        "Erreur lors de la suppression."
      );
    }
  }

  if (editing) {
    return (
      <CultureEdit
        culture={editing}
        produits={data.produits}
        onSave={
          saveCulture
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
          🌾 Cultures
        </h2>

        <button
          onClick={() =>
            setEditing({
              nom: "",
              varietes: [],
              traitements: [],
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
        placeholder="Rechercher une culture..."
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
        {cultures.length}
        {" "}
        culture(s)
      </div>

      {cultures.map(
        (culture) => {

          const nbVarietes =
            culture.varietes
              ?.length || 0;

          const nbTraitements =
            culture.traitements
              ?.length || 0;

          return (
            <div
              key={culture.id}
              className="
                bg-white
                rounded-2xl
                shadow
                p-4
                mb-3
              "
            >
              <div
                className="
                  text-lg
                  font-bold
                  mb-2
                "
              >
                {culture.nom}
              </div>

              <div
                className="
                  text-sm
                  text-gray-600
                "
              >
                🌱 Variétés :
                {" "}
                {nbVarietes}
              </div>

              <div
                className="
                  text-sm
                  text-gray-600
                "
              >
                🧪 Traitements :
                {" "}
                {nbTraitements}
              </div>

              {culture.varietes
                ?.slice(0, 3)
                .map(
                  (
                    variete,
                    index
                  ) => (
                    <span
                      key={index}
                      className="
                        inline-block
                        bg-slate-100
                        rounded-full
                        px-2
                        py-1
                        text-xs
                        mr-1
                        mt-2
                      "
                    >
                      {variete}
                    </span>
                  )
                )}

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
                      culture
                    )
                  }
                  className="
                    flex-1
                    bg-blue-600
                    text-white
                    rounded-xl
                    p-2
                  "
                >
                  ✏ Modifier
                </button>

                <button
                  onClick={() =>
                    deleteCulture(
                      culture.id
                    )
                  }
                  className="
                    flex-1
                    bg-red-600
                    text-white
                    rounded-xl
                    p-2
                  "
                >
                  🗑 Supprimer
                </button>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}