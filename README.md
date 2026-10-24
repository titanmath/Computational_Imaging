# Imagerie computationnelle

Un cours en ligne, en français, sur l'**imagerie computationnelle** : comment la lumière devient une image,
et comment le calcul permet d'aller plus loin que l'optique seule.

👉 **Lire le cours : https://titanmath.github.io/Computational_Imaging/**

## Au programme

| | Chapitre | En bref |
| --- | --- | --- |
| 00 | Introduction | optique, capteur et calcul pensés ensemble |
| 01 | Lentilles | sténopé, lentille mince, PSF, diffraction, aberrations |
| 02 | Capteurs | photons, efficacité quantique, matrice de Bayer, bruit |
| 03 | Traitement d'image (ISP) | du RAW au JPEG : dématriçage, balance des blancs, compression |
| 04 | Perception visuelle | l'œil, la couleur, les illusions, la profondeur |
| 05 | Calibration | bruit, champ plat, PSF, géométrie de la caméra |
| 06 | Imagerie HDR | fusion d'expositions, courbe de réponse, tone mapping |
| 07 | Problèmes inverses | déconvolution, moindres carrés, régularisation |
| 08 | A priori d'image | normes, variation totale, canal sombre, réseaux de neurones |

Chaque chapitre est découpé en courtes leçons (une idée par page), avec des **simulations interactives**
et des **scènes 3D** à manipuler directement dans le navigateur. Une section *Assignments* relie des
exercices pratiques (caméra sténopé, courbe de réponse, mesure de PSF) à la théorie nécessaire.

Ce sont des notes personnelles et non officielles, rédigées en suivant un cours universitaire
d'imagerie computationnelle. Toutes les illustrations sont recréées : images générées par le code,
schémas et rendus 3D.

## Lancer le site sur son ordinateur

Il faut [Node.js](https://nodejs.org) (version 22 ou plus) et [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Le site est alors disponible sur http://localhost:4321.

Autres commandes utiles :

- `pnpm build` : construit le site statique dans `dist/` ;
- `pnpm test` : lance les tests des calculs (FFT, débruitage, calibration…) ;
- `pnpm check` : vérifie les types.

## Ajouter un chapitre

Un chapitre est un simple dossier dans `src/content/chapitres/`, avec une fiche `_chapitre.yaml` et une
leçon par fichier `.mdx`. Un modèle prêt à copier se trouve dans [`modele-chapitre/`](modele-chapitre/LISEZMOI.md).
La page d'accueil et la navigation se mettent à jour automatiquement.

## Technique

Site statique construit avec [Astro](https://astro.build) et [MDX](https://mdxjs.com), simulations en
[Svelte](https://svelte.dev), scènes 3D avec [three.js](https://threejs.org) et des shaders écrits à la
main (dont un petit moteur de rendu par lancer de rayons), formules avec [KaTeX](https://katex.org).
Le site est publié sur GitHub Pages à chaque mise à jour de la branche `main`.
