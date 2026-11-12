# MesCultures

Application mobile de suivi des interventions d'une exploitation agricole (cahier de culture / registre phytosanitaire).
React + Vite + Tailwind, avec un petit serveur Express qui lit et écrit des fichiers JSON dans `data/`.

## Lancer

```bash
npm install
node server.cjs            # API sur le port 3000
npm run dev -- --host      # interface (ouvrable depuis un téléphone du même réseau)
```

## Données

- `produits.json`, `cultures.json`, `parcelles.json` : communs à toutes les campagnes.
- `interventions_AAAA.json` : un fichier par campagne (sélecteur « Campagne » dans l'app).

## Importer des données (écran « 📥 Importer des données »)

1. Télécharge le **modèle Excel** (ou **Mes données** pour repartir de l'existant).
2. Remplis les onglets utiles : Produits, Cultures, Traitements, Parcelles, Interventions.
3. Importe le fichier (`.xlsx` ou `.csv`) ou colle le lien d'un **Google Sheets** partagé « avec le lien ».
4. L'écran montre ce qui sera ajouté, mis à jour ou ignoré (avec la ligne et la raison) avant de valider.

Règles : l'import **ajoute ou met à jour, ne supprime jamais**. Les noms sont reconnus sans tenir compte des
majuscules ni des accents. Un import déjà fait peut être rejoué sans créer de doublons.
Une sauvegarde JSON complète est téléchargeable depuis l'écran avant d'importer.

## Produits et catégories

Écran « 🧪 Produits » → « 🏷️ Gérer les catégories » : ajouter, renommer (les produits suivent) ou supprimer
une catégorie inutilisée. La liste est dans `data/categories.json`.

## Interventions

Choisis la parcelle, puis l'intervention ; la variété n'est demandée que pour un semis.
L'historique permet de supprimer une intervention (avec confirmation).

## Export

Écran « 📤 Export du registre » : CSV ou Excel, une ligne par produit appliqué, pour la campagne choisie.
