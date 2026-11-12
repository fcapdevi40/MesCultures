import { useEffect, useRef, useState } from "react";
import Home from "./screens/Home";
import Semis from "./screens/Semis";
import Produits from "./screens/Produits";
import Cultures from "./screens/Cultures";
import Parcelles from "./screens/Parcelles";
import Historique from "./screens/Historique";
import Export from "./screens/Export";
import Import from "./screens/Import";
import BottomNav from "./components/BottomNav";
import CampagneSelect from "./components/CampagneSelect";
import { listAnnees, loadAllData, loadInterventions } from "./services/api";
import { lirePref, ecrirePref } from "./services/stockage";

const lireCampagne = () => Number(lirePref("campagne")) || null;
const ecrireCampagne = (a) => ecrirePref("campagne", a);
const triees = (liste) => [...new Set(liste)].sort((a, b) => a - b);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState("home");
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [annees, setAnnees] = useState([]);
  const [data, setData] = useState({
    produits: [],
    cultures: [],
    parcelles: [],
    interventions: [],
    categories: null,
  });
  const derniereDemande = useRef(0);

  useEffect(() => {
    async function init() {
      try {
        const existantes = await listAnnees();
        // Campagne ouverte : la dernière utilisée, sinon la plus récente, sinon l'année en cours
        const initiale =
          lireCampagne() ?? existantes.at(-1) ?? new Date().getFullYear();

        setData(await loadAllData(initiale));
        setAnnee(initiale);
        setAnnees(triees([...existantes, initiale]));
      } catch (e) {
        setError(`${e.message}. Le serveur est-il lancé ? (node server.cjs)`);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function changerCampagne(nouvelle) {
    const demande = ++derniereDemande.current;
    try {
      const interventions = await loadInterventions(nouvelle);
      if (demande !== derniereDemande.current) return; // une demande plus récente a pris le relais
      setData((d) => ({ ...d, interventions }));
      setAnnee(nouvelle);
      setAnnees((liste) => triees([...liste, nouvelle]));
      ecrireCampagne(nouvelle);
    } catch (e) {
      alert(`Impossible d'ouvrir la campagne ${nouvelle} : ${e.message}`);
    }
  }

  function nouvelleCampagne() {
    const saisie = window.prompt("Année de la nouvelle campagne (ex : 2028)");
    if (saisie === null) return;
    const a = Number(saisie.trim());
    if (!Number.isInteger(a) || a < 2000 || a > 2100) {
      return alert("Année invalide (4 chiffres, entre 2000 et 2100).");
    }
    changerCampagne(a);
  }

  if (loading) return <div className="p-6">🚜 Chargement...</div>;
  if (error) return <div className="p-6 text-red-700">⚠️ {error}</div>;

  const props = { data, setData, setScreen, annee };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-md mx-auto p-4 pb-24">
        <CampagneSelect
          annee={annee}
          annees={annees}
          onChange={changerCampagne}
          onNouvelle={nouvelleCampagne}
        />
        {screen === "home" && <Home {...props} />}
        {screen === "semis" && <Semis {...props} />}
        {screen === "produits" && <Produits {...props} />}
        {screen === "cultures" && <Cultures {...props} />}
        {screen === "parcelles" && <Parcelles {...props} />}
        {screen === "historique" && <Historique {...props} />}
        {screen === "export" && <Export {...props} />}
        {screen === "import" && <Import {...props} />}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} />
    </div>
  );
}
