const pad2 = (n) => String(n).padStart(2, "0");

// "15/04/2027" -> "2027-04-15" (pour trier correctement)
export function dateKey(dateFr = "") {
  const [j, m, a] = String(dateFr).split("/");
  return a && m && j ? `${a}-${pad2(m)}-${pad2(j)}` : "";
}

// Numéro de série Excel -> { date: "jj/mm/aaaa", heure: "HH:MM" }
// (date vide si le nombre ne contient qu'une heure, heure vide si minuit)
export function serialVersDate(serial) {
  const minutes = Math.round(serial * 1440);
  const jours = Math.floor(minutes / 1440);
  const reste = minutes - jours * 1440;
  const d = new Date(Date.UTC(1899, 11, 30) + jours * 86400000);
  return {
    date:
      jours >= 1
        ? `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
        : "",
    heure: reste > 0 ? `${pad2(Math.floor(reste / 60))}:${pad2(reste % 60)}` : "",
  };
}
