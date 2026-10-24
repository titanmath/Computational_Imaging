import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Un chapitre = un dossier `NN-slug/` contenant `_chapitre.yaml` et des leçons `NN-slug.mdx`.
// Ajouter un chapitre = ajouter un dossier : rien d'autre à modifier.

const dossier = (entry: string) => entry.split('/')[0];
const sansExtension = (entry: string) => entry.replace(/\.mdx?$/, '');

const chapitres = defineCollection({
  loader: glob({
    pattern: '*/_chapitre.yaml',
    base: './src/content/chapitres',
    generateId: ({ entry }) => dossier(entry),
  }),
  schema: z.object({
    numero: z.number().int().nonnegative(),
    titre: z.string(),
    sousTitre: z.string(),
    resume: z.string(),
    objectifs: z.array(z.string()).min(1),
    /** Glyphe de la station sur la carte d'accueil (voir components/carte/glyphes.ts). */
    icone: z.string().default('point'),
    /** Longueur d'onde de la couleur d'accent ; dérivée du numéro si absente. */
    nm: z.number().min(380).max(780).optional(),
    /** Fichier PDF source (pour mémoire, jamais publié). */
    source: z.string().optional(),
  }),
});

const lecons = defineCollection({
  loader: glob({
    pattern: '*/[0-9]*.mdx',
    base: './src/content/chapitres',
    generateId: ({ entry }) => sansExtension(entry),
  }),
  schema: z.object({
    titre: z.string(),
    resume: z.string(),
    duree: z.number().int().positive().default(4),
    /** Assignments qui s'appuient sur cette leçon, ex. ['a2']. */
    assignments: z.array(z.string()).default([]),
    /** Leçon de synthèse de fin de chapitre. */
    essentiel: z.boolean().default(false),
    /** Contenu ajouté hors slides (complément), signalé au lecteur. */
    complement: z.string().optional(),
  }),
});

const assignments = defineCollection({
  loader: glob({
    pattern: '*/_assignment.yaml',
    base: './src/content/assignments',
    generateId: ({ entry }) => dossier(entry),
  }),
  schema: z.object({
    code: z.string(), // "A1", "A2"…
    titre: z.string(),
    resume: z.string(),
    sortie: z.string(),
    rendu: z.string(),
    demo: z.string().optional(),
    livrables: z.array(z.string()).default([]),
    chapitresLies: z.array(z.string()).default([]),
  }),
});

const etapes = defineCollection({
  loader: glob({
    pattern: '*/[0-9]*.mdx',
    base: './src/content/assignments',
    generateId: ({ entry }) => sansExtension(entry),
  }),
  schema: z.object({
    titre: z.string(),
    resume: z.string(),
    duree: z.number().int().positive().default(6),
  }),
});

export const collections = { chapitres, lecons, assignments, etapes };
