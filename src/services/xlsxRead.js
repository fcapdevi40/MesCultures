// Lecteur de classeurs Excel (.xlsx) sans dépendance :
// un .xlsx est un ZIP de fichiers XML. On lit le ZIP, on décompresse avec
// DecompressionStream (intégré aux navigateurs récents) puis on lit les XML.
import { serialVersDate } from "./dates";

const utf8 = new TextDecoder("utf-8");
const MAX_OCTETS = 30 * 1024 * 1024; // garde-fou (fichier "zip bomb")
const MAX_LIGNES = 5000;

async function inflate(octets) {
  const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

async function ouvrirZip(buffer) {
  const octets = new Uint8Array(buffer);
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);

  let fin = -1;
  for (let i = octets.length - 22; i >= Math.max(0, octets.length - 22 - 65535); i--) {
    if (vue.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error("Fichier illisible : ce n'est pas un classeur Excel (.xlsx).");

  const nb = vue.getUint16(fin + 10, true);
  let p = vue.getUint32(fin + 16, true);
  const entrees = new Map();
  for (let k = 0; k < nb; k++) {
    if (vue.getUint32(p, true) !== 0x02014b50) break;
    const methode = vue.getUint16(p + 10, true);
    const taille = vue.getUint32(p + 20, true);
    const tailleReelle = vue.getUint32(p + 24, true);
    const nom = vue.getUint16(p + 28, true);
    const extra = vue.getUint16(p + 30, true);
    const comm = vue.getUint16(p + 32, true);
    const decalage = vue.getUint32(p + 42, true);
    entrees.set(utf8.decode(octets.subarray(p + 46, p + 46 + nom)).replaceAll("\\", "/"), {
      methode, taille, tailleReelle, decalage,
    });
    p += 46 + nom + extra + comm;
  }

  async function lire(nom) {
    const e = entrees.get(nom);
    if (!e) return null;
    if (e.tailleReelle > MAX_OCTETS) throw new Error("Classeur trop volumineux.");
    const l = vue.getUint16(e.decalage + 26, true);
    const x = vue.getUint16(e.decalage + 28, true);
    const debut = e.decalage + 30 + l + x;
    const donnees = octets.subarray(debut, debut + e.taille);
    if (e.methode === 0) return utf8.decode(donnees);
    if (e.methode === 8) return utf8.decode(await inflate(donnees));
    throw new Error("Compression non prise en charge dans ce classeur.");
  }
  return { lire };
}

// ---------- petits utilitaires XML (les XML d'Excel sont très réguliers)

function decoder(t) {
  return t.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e) => {
    if (e === "amp") return "&";
    if (e === "lt") return "<";
    if (e === "gt") return ">";
    if (e === "quot") return '"';
    if (e === "apos") return "'";
    return String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });
}

function attributs(chaine) {
  const out = {};
  for (const m of chaine.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    out[m[1]] = decoder(m[2] ?? m[3] ?? "");
  }
  return out;
}

// Concatène les <t> d'un bloc (texte simple ou riche), sans les annotations phonétiques
function textes(bloc) {
  const propre = bloc.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  let s = "";
  for (const m of propre.matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)) s += decoder(m[1] ?? "");
  return s;
}

function chaînesPartagees(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)].map((m) => textes(m[1] ?? ""));
}

const FORMATS_DATE = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

function formatEstDate(id, codes) {
  if (FORMATS_DATE.has(id)) return true;
  const code = codes.get(id);
  if (!code) return false;
  const nu = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "");
  return /[dmyhs]/i.test(nu) && !/^general$/i.test(nu);
}

// Pour chaque style de cellule (index), indique s'il s'agit d'une date/heure
function stylesDates(xml) {
  if (!xml) return [];
  const codes = new Map();
  for (const m of xml.matchAll(/<numFmt\b([^>]*?)\/?>/g)) {
    const a = attributs(m[1]);
    codes.set(Number(a.numFmtId), a.formatCode || "");
  }
  const bloc = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml);
  if (!bloc) return [];
  return [...bloc[1].matchAll(/<xf\b([^>]*?)(?:\/>|>)/g)].map((m) =>
    formatEstDate(Number(attributs(m[1]).numFmtId), codes)
  );
}

function indexColonne(ref) {
  let n = 0;
  for (const ch of /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? "") n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

function valeurCellule(a, interieur, partagees, dates) {
  if (a.t === "inlineStr") return textes(interieur);
  const m = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(interieur);
  if (!m) return null;
  const brut = decoder(m[1]);
  if (a.t === "s") return partagees[Number(brut)] ?? "";
  if (a.t === "str") return brut;
  if (a.t === "b") return brut === "1" ? "VRAI" : "FAUX";
  if (a.t === "e") return null;
  const n = Number(brut);
  if (Number.isNaN(n)) return brut;
  if (dates[Number(a.s)]) {
    const { date, heure } = serialVersDate(n);
    return `${date} ${heure}`.trim();
  }
  return n;
}

function lireFeuille(xml, partagees, dates) {
  const lignes = [];
  let dernier = 0;
  for (const r of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const n = Number(attributs(r[1]).r) || dernier + 1;
    dernier = n;
    const cellules = [];
    let suivante = 0;
    for (const c of (r[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = attributs(c[1]);
      const col = a.r ? indexColonne(a.r) : suivante;
      suivante = col + 1;
      const v = valeurCellule(a, c[2] ?? "", partagees, dates);
      if (v !== null && v !== "") cellules[col] = v;
    }
    if (cellules.some((v) => v !== undefined)) lignes.push({ n, v: Array.from(cellules, (v) => v ?? null) });
    if (lignes.length > MAX_LIGNES + 1) throw new Error(`Plus de ${MAX_LIGNES} lignes dans un onglet : découpe le fichier.`);
  }
  return lignes;
}

// -> [{ nom, entetes: [...], lignes: [{ n: numéroDeLigneExcel, v: [valeurs] }] }]
export async function lireClasseur(buffer) {
  const zip = await ouvrirZip(buffer);

  const classeur = await zip.lire("xl/workbook.xml");
  if (!classeur) throw new Error("Classeur Excel invalide (workbook.xml introuvable).");
  const liens = await zip.lire("xl/_rels/workbook.xml.rels");

  const cibles = new Map();
  for (const m of (liens || "").matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const a = attributs(m[1]);
    cibles.set(a.Id, a.Target);
  }

  const partagees = chaînesPartagees(await zip.lire("xl/sharedStrings.xml"));
  const dates = stylesDates(await zip.lire("xl/styles.xml"));

  const tables = [];
  for (const m of classeur.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const a = attributs(m[1]);
    let cible = cibles.get(a["r:id"]);
    if (!cible) continue;
    cible = cible.startsWith("/") ? cible.slice(1) : `xl/${cible}`;
    const xml = await zip.lire(cible);
    if (!xml) continue;

    const lignes = lireFeuille(xml, partagees, dates);
    if (!lignes.length) continue;
    const [entete, ...reste] = lignes;
    tables.push({
      nom: a.name,
      entetes: entete.v.map((v) => (v == null ? "" : String(v).trim())),
      lignes: reste,
    });
  }
  if (!tables.length) throw new Error("Aucune donnée trouvée dans ce classeur.");
  return tables;
}
