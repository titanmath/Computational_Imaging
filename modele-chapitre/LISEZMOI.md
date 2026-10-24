# Gabarit de chapitre

Pour ajouter un chapitre :

1. Copier `NN-slug/` dans `src/content/chapitres/` et le renommer, par exemple `09-rendu/`.
   Le préfixe numérique fixe l'ordre. L'URL du chapitre reprend le nom du dossier (`/09-rendu/`),
   celle d'une leçon retire son propre préfixe (`02-shading.mdx` → `/09-rendu/shading/`).
2. Remplir `_chapitre.yaml` (`numero` doit correspondre au préfixe).
3. Écrire les leçons `01-…mdx`, `02-…mdx`… et garder `99-essentiel.mdx` en dernier.
4. `pnpm dev` : la carte d'accueil, la barre de segments, les boutons précédent/suivant
   et la couleur d'accent (dérivée du numéro) se mettent à jour seuls.

Simulations : un composant Svelte par simulation dans `src/components/sims/<chapitre>/`,
inséré dans une leçon avec `client:visible`. Les scènes 3D sont des modules de
`src/lib/gl/scenes/` chargés par `Scene3D.svelte` (voir `ch01/LentilleBokeh.svelte`).

Lien avec un assignment : `assignments: ["a2"]` dans l'en-tête d'une leçon affiche
le bandeau « Utilisé dans A2 » et ajoute la leçon sur la page de l'assignment.

Ce dossier est exclu des collections et de la compilation.
