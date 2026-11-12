const ITEMS = [
  ["home", "🏠"],
  ["semis", "🌱"],
  ["parcelles", "📍"],
  ["cultures", "🌾"],
  ["produits", "🧪"],
  ["historique", "📋"],
  ["export", "📤"],
];

export default function BottomNav({ screen, setScreen }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3">
      {ITEMS.map(([id, icon]) => (
        <button
          key={id}
          onClick={() => setScreen(id)}
          className={`text-2xl px-2 ${screen === id ? "" : "opacity-40"}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
