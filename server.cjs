const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Sert le site React compilé par Vite (dossier dist)
const DIST_DIR = path.join(__dirname, "dist");
app.use(express.static(DIST_DIR));

// 2. Gestion du dossier de données
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function safePath(name) {
  if (!/^[A-Za-z0-9_-]+\.json$/.test(name)) return null;
  return path.join(DATA_DIR, name);
}

app.get("/data/:file", (req, res) => {
  const filePath = safePath(req.params.file);
  if (!filePath) return res.status(400).json({ error: "Nom de fichier invalide" });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Fichier introuvable" });

  try {
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json(json);
  } catch (error) {
    res.status(500).json({ error: "Erreur lecture JSON", details: error.message });
  }
});

app.post("/data/:file", (req, res) => {
  const filePath = safePath(req.params.file);
  if (!filePath) return res.status(400).json({ success: false, error: "Nom de fichier invalide" });
  if (!Array.isArray(req.body)) return res.status(400).json({ success: false, error: "Un tableau JSON est attendu" });

  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), "utf8");
    res.json({ success: true, file: req.params.file });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

const GSHEET_BASE = process.env.GSHEET_BASE || "https://google.com";

app.get("/import/gsheet", async (req, res) => {
  const m = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/.exec(
    String(req.query.url || "")
  );
  if (!m) {
    return res.status(400).json({
      error: "Lien Google Sheets invalide (il doit commencer par https://google.com/spreadsheets/d/…)",
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

app.get("/files", (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Redirige toutes les autres requêtes vers l'application React (compatible Express 5)
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚜 MESCULTURES SERVER");
  console.log("====================");
  console.log(`Serveur actif sur le port ${PORT}`);
});
