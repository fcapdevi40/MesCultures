// Lecture d'un fichier CSV (séparateur ; , ou tabulation détecté automatiquement).
// Les CSV d'Excel français sont parfois en Windows-1252 : on essaie UTF-8 puis on bascule.

export function decoderTexte(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function lireCsv(buffer, nom = "CSV") {
  const texte = decoderTexte(buffer).replace(/^\uFEFF/, "");
  const premiere = texte.split(/\r?\n/, 1)[0] || "";
  const compte = (c) => premiere.split(c).length - 1;
  const sep = [";", "\t", ","].sort((a, b) => compte(b) - compte(a))[0];

  const lignes = [];
  let ligne = [];
  let champ = "";
  let guillemets = false;

  const finChamp = () => { ligne.push(champ); champ = ""; };
  const finLigne = () => { finChamp(); lignes.push(ligne); ligne = []; };

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"' && champ === "") guillemets = true;
    else if (c === sep) finChamp();
    else if (c === "\n") finLigne();
    else if (c !== "\r") champ += c;
  }
  if (champ !== "" || ligne.length) finLigne();

  const numerotees = lignes
    .map((v, i) => ({ n: i + 1, v: v.map((x) => (x.trim() === "" ? null : x.trim())) }))
    .filter((l) => l.v.some((x) => x !== null));

  if (numerotees.length < 1) throw new Error("Fichier CSV vide.");
  const [entete, ...reste] = numerotees;
  return [{ nom, entetes: entete.v.map((v) => v ?? ""), lignes: reste }];
}
