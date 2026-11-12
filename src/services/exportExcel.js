import { COLONNES } from "./registrePhyto";
import { createZip } from "./zip";
import { downloadBlob, nomFichier, baseNom } from "./download";

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function esc(v) {
  return String(v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// 0 -> A, 25 -> Z, 26 -> AA ...
function colLetter(n) {
  let s = "";
  for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function cell(ref, valeur, type, style = 0) {
  if (valeur === "" || valeur == null) return "";
  if (type === "number" && Number.isFinite(Number(valeur))) {
    return `<c r="${ref}" s="${style}"><v>${Number(valeur)}</v></c>`;
  }
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(valeur)}</t></is></c>`;
}

function feuille(colonnes, rows) {
  const largeurs = colonnes
    .map(
      (c, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${c.largeur || Math.max(12, c.label.length + 3)}" customWidth="1"/>`
    )
    .join("");

  const entete = colonnes.map((c, i) => cell(`${colLetter(i)}1`, c.label, "text", 1)).join("");
  const lignes = rows
    .map((r, ri) => {
      const n = ri + 2;
      return `<row r="${n}">${colonnes.map((c, i) => cell(`${colLetter(i)}${n}`, r[c.key], c.type)).join("")}</row>`;
    })
    .join("");

  return (
    XML +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${largeurs}</cols>` +
    `<sheetData><row r="1">${entete}</row>${lignes}</sheetData>` +
    "</worksheet>"
  );
}

function nomOnglet(nom, utilises) {
  let base = String(nom).replace(/[[\]:*?/\\]/g, "-").slice(0, 31) || "Feuille";
  let n = base;
  for (let k = 2; utilises.has(n.toLowerCase()); k++) n = `${base.slice(0, 28)} ${k}`;
  utilises.add(n.toLowerCase());
  return n;
}

// feuilles : [{ nom, colonnes: [{ key, label, type?, largeur? }], lignes: [{...}] }]
export function buildWorkbook(feuilles) {
  const utilises = new Set();
  const noms = feuilles.map((f) => nomOnglet(f.nom, utilises));
  const n = feuilles.length;
  const files = [
    {
      name: "[Content_Types].xml",
      data:
        XML +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        feuilles
          .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
          .join("") +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        "</Types>",
    },
    {
      name: "_rels/.rels",
      data:
        XML +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>",
    },
    {
      name: "xl/workbook.xml",
      data:
        XML +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets>${noms.map((nom, i) => `<sheet name="${esc(nom)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data:
        XML +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        feuilles
          .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
          .join("") +
        `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        "</Relationships>",
    },
    {
      name: "xl/styles.xml",
      data:
        XML +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        "</styleSheet>",
    },
    ...feuilles.map((f, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: feuille(f.colonnes, f.lignes) })),
  ];
  return createZip(files);
}

// Registre phyto : un seul onglet
export function buildXlsx(rows) {
  return buildWorkbook([{ nom: "Registre", colonnes: COLONNES, lignes: rows }]);
}


export function exportExcel(rows, annee) {
  const blob = new Blob([buildXlsx(rows)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(nomFichier(baseNom(annee), "xlsx"), blob);
}

// Télécharge un classeur à plusieurs onglets (modèle d'import, export des données…)
export function telechargerClasseur(feuilles, base) {
  const blob = new Blob([buildWorkbook(feuilles)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(nomFichier(base, "xlsx"), blob);
}
