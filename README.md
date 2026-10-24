# Orbit — Tracker d’objectifs

Application React + Vite pour organiser des objectifs hiérarchiques et suivre le temps passé.

## Fonctionnalités de départ
- Objectifs imbriqués à plusieurs niveaux.
- Temps saisi uniquement sur les objectifs sans sous-objectifs.
- Le temps des parents est calculé à partir de leurs descendants, sans double comptage.
- Historique journalier et courbe par objectif avec sélection de période via le curseur du graphique.
- Sauvegarde locale dans le navigateur, export/import JSON.
- Interface responsive et thème sombre.

## Lancer en local
Installe Node.js LTS, puis dans ce dossier :

```bash
npm install
npm run dev
```

Vite affiche l’adresse locale à ouvrir.

## Déployer sur GitHub Pages
1. Crée un dépôt GitHub nommé exactement `objectif-tracker` (ou adapte `base` dans `vite.config.js`).
2. Dans `vite.config.js`, `base` est configuré pour `/objectif-tracker/`.
3. Installe les dépendances et lance :
   ```bash
   npm install
   npm run build
   ```
4. Pour déployer avec le script fourni :
   ```bash
   npm run deploy
   ```
5. Dans GitHub, ouvre **Settings → Pages** et sélectionne la branche `gh-pages`, dossier `/ (root)`.

Alternative recommandée : workflow GitHub Actions qui construit et publie `dist`.

## Données et confidentialité
Les données restent dans le navigateur de cet appareil. Elles ne sont pas automatiquement synchronisées entre appareils. Utilise régulièrement **Exporter** pour garder une copie de sauvegarde. Le fichier exporté contient les objectifs et les sessions de travail.

## Note sur les objectifs parents
Le temps d’un parent est uniquement la somme des temps de ses sous-objectifs. Quand on ajoute un premier sous-objectif à une feuille qui possède déjà des sessions, l’application déplace automatiquement ces sessions dans un sous-objectif nommé « Travail avant décomposition » afin de préserver l’historique sans double comptage.
