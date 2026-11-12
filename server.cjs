const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");

// Nom de fichier autorisé : lettres, chiffres, _ et - uniquement, extension .json
// (empêche d'écrire/lire en dehors du dossier data/)
function safePath(name) {
  if (!/^[A-Za-z0-9_-]+\.json$/.test(name)) return null;
  return path.join(DATA_DIR, name);
}

/*
 * Lire un fichier JSON
 * Exemple :
 * http://localhost:3000/data/produits.json
 */
app.get("/data/:file", (req, res) => {
  const filePath = safePath(req.params.file);

  if (!filePath) {
    return res.status(400).json({ error: "Nom de fichier invalide" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "Fichier introuvable",
    });
  }

  try {
    const json = JSON.parse(
      fs.readFileSync(
        filePath,
        "utf8"
      )
    );

    res.json(json);
  } catch (error) {
    res.status(500).json({
      error:
        "Erreur lecture JSON",
      details:
        error.message,
    });
  }
});

/*
 * Sauvegarder un fichier JSON
 * POST :
 *
 * http://localhost:3000/data/produits.json
 */
app.post("/data/:file", (req, res) => {
  const filePath = safePath(req.params.file);

  if (!filePath) {
    return res.status(400).json({ success: false, error: "Nom de fichier invalide" });
  }

  if (!Array.isArray(req.body)) {
    return res.status(400).json({ success: false, error: "Un tableau JSON est attendu" });
  }

  try {
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        req.body,
        null,
        2
      ),
      "utf8"
    );

    res.json({
      success: true,
      file:
        req.params.file,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error.message,
    });
  }
});

/*
 * Sauvegarde : tous les fichiers de données dans un seul JSON
 */
app.get("/backup", (req, res) => {
  try {
    const out = {};
    for (const f of fs.readdirSync(DATA_DIR)) {
      if (safePath(f)) out[f] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8"));
    }
    res.json(out);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
 * Google Sheets : le serveur télécharge le classeur (au format xlsx) à la place du
 * navigateur, car Google n'autorise pas ce téléchargement directement depuis une page web.
 * Le classeur doit être partagé « Tous les utilisateurs disposant du lien » (lecteur).
 */
const GSHEET_BASE = process.env.GSHEET_BASE || "https://docs.google.com";

app.get("/import/gsheet", async (req, res) => {
  const m = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/.exec(
    String(req.query.url || "")
  );
  if (!m) {
    return res.status(400).json({
      error: "Lien Google Sheets invalide (il doit commencer par https://docs.google.com/spreadsheets/d/…)",
    });
  }

  try {
    const r = await fetch(`${GSHEET_BASE}/spreadsheets/d/${m[1]}/export?format=xlsx`, {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      return res.status(502).json({
        error: `Google a répondu ${r.status}. Le classeur doit être partagé avec « Tous les utilisateurs disposant du lien ».`,
      });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: "Classeur trop volumineux (10 Mo max)." });
    }
    if (buf.subarray(0, 2).toString() !== "PK") {
      return res.status(403).json({
        error: "Accès refusé : partage le classeur avec « Tous les utilisateurs disposant du lien ».",
      });
    }
    res.type("application/octet-stream").send(buf);
  } catch (error) {
    res.status(502).json({ error: `Impossible de joindre Google Sheets : ${error.message}` });
  }
});

/*
 * Campagnes disponibles : interventions_2027.json -> 2027
 */
app.get("/annees", (req, res) => {
  try {
    const annees = fs
      .readdirSync(DATA_DIR)
      .map((f) => /^interventions_(\d{4})\.json$/.exec(f))
      .filter(Boolean)
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);

    res.json(annees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
 * Liste des fichiers de données
 */
app.get("/files", (req, res) => {
  try {
    const files =
      fs.readdirSync(
        DATA_DIR
      );

    res.json(files);
  } catch (error) {
    res.status(500).json({
      error:
        error.message,
    });
  }
});

/*
 * Sauvegarde complète
 */
app.get("/backup", (req, res) => {
  try {
    const backup = {};

    const files =
      fs.readdirSync(
        DATA_DIR
      );

    files.forEach((file) => {
      const content =
        JSON.parse(
          fs.readFileSync(
            path.join(
              DATA_DIR,
              file
            ),
            "utf8"
          )
        );

      backup[file] =
        content;
    });

    res.json(backup);
  } catch (error) {
    res.status(500).json({
      error:
        error.message,
    });
  }
});

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log("");
    console.log(
      "🚜 MESCULTURES SERVER"
    );
    console.log(
      "===================="
    );
    console.log(
      `Local : http://localhost:${PORT}`
    );
    console.log("");
  }
);