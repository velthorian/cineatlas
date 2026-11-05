# CinéAtlas
Site statique en français pour explorer les films, rechercher par titre, acteur ou réalisateur, afficher le casting, télécharger les affiches originales et sauvegarder des favoris sur son appareil.

## Ouvrir localement
Depuis ce dossier : `python3 -m http.server 8000`, puis ouvrir http://localhost:8000.
La clé API TMDB v3 publique a été intégrée avec l’accord du propriétaire. Sans accès TMDB, huit films de démonstration sont disponibles. Le mode démo n'est pas un catalogue complet. Les images et les polices nécessitent Internet.

## TMDB
Le bouton « Configurer TMDB » accepte une clé API v3 ou un jeton de lecture ; l'accès reste en mémoire dans l'onglet. Pour un catalogue partagé, une clé API v3 destinée au navigateur peut être placée dans `config.js` : elle sera publique. Ne jamais publier de secret serveur. Un serveur intermédiaire est nécessaire pour protéger un accès partagé.
La recherche multi est paginée et complète chaque page avec les filmographies des quatre premières personnes trouvées. Les séries sont exclues. Les filtres et tris portent sur les films chargés. La liste populaire est paginée.

## Interface
Direction visuelle éditoriale ivoire et corail, trois films à la une sélectionnables, apparitions des cartes au défilement, retours visuels sur les favoris. La fiche comprend trois onglets (histoire, casting, affiches) et une navigation clavier. Sur mobile, elle occupe tout l’écran. Les animations respectent la préférence de réduction des mouvements.
Documentation : https://developer.themoviedb.org/docs/getting-started

## GitHub Pages
1. Importer ce dossier (y compris `.github`) à la racine du dépôt public `cineatlas`, branche `main`.
2. Dans Settings → Pages → Source, choisir **GitHub Actions**.
3. Lancer le workflow « Publier CinéAtlas » ou pousser un commit.
4. Consulter l'URL retournée par le déploiement (normalement https://velthorian.github.io/cineatlas/).
Documentation : https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Droits et données
This product uses the TMDB API but is not endorsed or certified by TMDB.
Les images appartiennent à leurs ayants droit. Télécharger une affiche ne confère aucun droit de redistribution ou d'exploitation commerciale. Les favoris sont stockés localement dans le navigateur.
