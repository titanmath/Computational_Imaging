# Imagerie computationnelle — cours en ligne

Site de cours en français pour CSED520 / AIGS529 (POSTECH, automne 2026) : neuf chapitres découpés en
leçons courtes, des simulations interactives, des scènes 3D (dont un path tracer GPU), et une section
**assignments** (A1, A2) qui relie chaque tâche à la théorie à maîtriser.

Tous les visuels sont recréés (images procédurales, schémas, rendus) : le dépôt ne contient ni les PDF
du cours, ni photos personnelles, ni figures d'articles.

## Démarrer

Prérequis : Node 22 ou plus et pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:4321
```

| Commande | Rôle |
| --- | --- |
| `pnpm dev` | serveur de développement (rechargement à chaud) |
| `pnpm build` | site statique dans `dist/`, puis vérification de tous les liens internes |
| `pnpm preview` | sert `dist/` localement |
| `pnpm test` | tests numériques (`vitest`) des bibliothèques de simulation |
| `pnpm check` | vérification des types (Astro, TypeScript, Svelte) |

`pnpm dev` et `pnpm build` passent d'abord par `scripts/guillemets-yaml.mjs`, qui met entre guillemets
les valeurs YAML des en-têtes (le français contient souvent « : », que YAML interprète).

## Organisation

```
src/
  content/
    chapitres/NN-slug/        un chapitre = un dossier
      _chapitre.yaml          titre, résumé, objectifs, icône de la carte
      01-…mdx … 99-essentiel.mdx   une leçon par fichier, dans l'ordre des préfixes
    assignments/aN-slug/      un assignment = un dossier
      _assignment.yaml        dates, livrables, chapitres liés
      01-…mdx …               les étapes
  components/
    nav/                      barre du haut, segments, précédent / suivant, thème
    carte/                    carte « trajet de la lumière » de l'accueil
    contenu/                  encadrés (Concept, Formule, Attention…), Figure, Terme, Pseudocode, Checklist
    schemas/<chapitre>/       schémas SVG statiques ou animés en CSS
    sims/ui/                  kit commun : Panneau, Curseur, Bascule, Toile, Scene3D
    sims/<chapitre>/          simulations Svelte (îlots hydratés à l'apparition)
  lib/
    navigation.ts             séquence de lecture, fil d'Ariane, URL (base GitHub Pages incluse)
    spectre.ts                couleur d'accent de chaque chapitre (longueur d'onde → couleur)
    sim/                      calcul numérique : FFT, convolution, moindres carrés, ISP, HDR, a priori…
    optique/                  tracé de rayons exact, diffraction, œil
    gl/                       moteur 3D : Scene3D, qualité adaptative, studio, path tracer, scènes
  layouts/  pages/  styles/
modele-chapitre/              gabarit à copier pour un nouveau chapitre (exclu de la compilation)
scripts/                      guillemets YAML, vérification des liens
```

## Ajouter un chapitre

Copier `modele-chapitre/NN-slug/` dans `src/content/chapitres/`, le renommer (`09-rendu/`), remplir
`_chapitre.yaml` et écrire les leçons. La carte d'accueil, la barre de segments, la navigation
précédent / suivant et la couleur d'accent se mettent à jour seules. Détails dans
[`modele-chapitre/LISEZMOI.md`](modele-chapitre/LISEZMOI.md).

Ajouter un assignment suit le même principe : un dossier `src/content/assignments/aN-slug/` avec
`_assignment.yaml` et des étapes `01-…mdx`. Une leçon qui déclare `assignments: ["aN"]` dans son
en-tête apparaît automatiquement sur la page de l'assignment.

## Simulations et 3D

- **2D** : un composant Svelte dans `src/components/sims/<chapitre>/`, construit avec `Panneau`
  (figure, puis contrôles dessous, jamais par-dessus). Les calculs vivent dans `src/lib/sim/` et sont testés.
- **3D** : un module `src/lib/gl/scenes/<nom>.ts` qui exporte une fabrique
  `({ THREE, renderer, canvas, qualite, params }) => { maj, frame, redimensionner, detruire, etat }`,
  chargé par `<Scene3D charger={() => import(...)} params={...}>`. three.js n'est téléchargé que sur les
  pages qui en ont besoin, la scène ne tourne que visible, et la qualité s'adapte à la machine.
- **Path tracer** : `src/lib/gl/pathtracer/`. Une scène fournit en GLSL
  `bool scene(Rayon r, inout Impact h)` et `vec3 ciel(vec3 d)` ; caméras sténopé et lentille mince physiques,
  accumulation progressive, brume optionnelle (`#define BRUME`).

## Déployer sur GitHub Pages

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) construit et publie le site à
chaque push sur `main`. Il déduit `SITE` et `BASE` du nom du dépôt :
`https://<utilisateur>.github.io/<depot>/`, ou la racine si le dépôt s'appelle `<utilisateur>.github.io`.

1. Créer un dépôt GitHub vide, et y pousser **uniquement** ce dossier `site/`.
2. Dans *Settings → Pages*, choisir *GitHub Actions* comme source.
3. Chaque push sur `main` met le site à jour (onglet *Actions* pour suivre le déploiement).

Pour tester localement le rendu avec un sous-dossier :

```bash
SITE=https://<utilisateur>.github.io BASE=/<depot>/ pnpm build && pnpm preview
```
