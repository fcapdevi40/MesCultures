export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function nomFichier(base, ext) {
  return `${base}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

// registre-phyto-campagne-2027 (ou registre-phyto si l'année est inconnue)
export function baseNom(annee) {
  return annee ? `registre-phyto-campagne-${annee}` : "registre-phyto";
}
