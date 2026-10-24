// Séquence de lecture du cours, entièrement déduite des collections :
// ouverture du chapitre → leçons (ordre des préfixes) → leçon « essentiel » → chapitre suivant.
// Les assignments forment chacun leur propre petite séquence.
import { getCollection, type CollectionEntry } from 'astro:content';
import { accent, nmDuChapitre, type Accent } from './spectre';
import { slugSansNumero, url } from './chemins';
export { lienLecon, slugSansNumero, url } from './chemins';

const nomFichier = (id: string) => id.split('/').pop()!;

export interface Page {
  url: string;
  titre: string;
  /** Titre court pour le fil d'Ariane / les segments. */
  court: string;
  type: 'ouverture' | 'lecon' | 'assignment' | 'etape';
}

export interface LeconNav extends Page {
  type: 'lecon';
  entree: CollectionEntry<'lecons'>;
  index: number; // 1-based dans le chapitre
}

export interface ChapitreNav {
  id: string;
  entree: CollectionEntry<'chapitres'>;
  numero: number;
  code: string; // "03"
  url: string;
  accent: Accent;
  lecons: LeconNav[];
  duree: number;
}

export interface EtapeNav extends Page {
  type: 'etape';
  entree: CollectionEntry<'etapes'>;
  index: number;
}

export interface AssignmentNav {
  id: string;
  entree: CollectionEntry<'assignments'>;
  url: string;
  accent: Accent;
  etapes: EtapeNav[];
}

export interface Cours {
  chapitres: ChapitreNav[];
  assignments: AssignmentNav[];
}

let cache: Promise<Cours> | undefined;

export function getCours(): Promise<Cours> {
  cache ??= construire();
  return cache;
}

async function construire(): Promise<Cours> {
  const [chaps, lecons, assigns, etapes] = await Promise.all([
    getCollection('chapitres'),
    getCollection('lecons'),
    getCollection('assignments'),
    getCollection('etapes'),
  ]);

  const chapitres: ChapitreNav[] = chaps
    .sort((a, b) => a.data.numero - b.data.numero)
    .map((c) => {
      const urlChap = url(c.id);
      const siennes = lecons
        .filter((l) => l.id.startsWith(c.id + '/'))
        .sort((a, b) => nomFichier(a.id).localeCompare(nomFichier(b.id), 'fr', { numeric: true }))
        .map<LeconNav>((l, i) => ({
          type: 'lecon',
          url: url(`${c.id}/${slugSansNumero(nomFichier(l.id))}`),
          titre: l.data.titre,
          court: l.data.essentiel ? 'L’essentiel' : l.data.titre,
          entree: l,
          index: i + 1,
        }));
      return {
        id: c.id,
        entree: c,
        numero: c.data.numero,
        code: String(c.data.numero).padStart(2, '0'),
        url: urlChap,
        accent: accent(nmDuChapitre(c.data.numero, c.data.nm)),
        lecons: siennes,
        duree: siennes.reduce((s, l) => s + l.entree.data.duree, 0),
      };
    });

  const assignments: AssignmentNav[] = assigns
    .sort((a, b) => a.data.code.localeCompare(b.data.code, 'fr', { numeric: true }))
    .map((a, k) => ({
      id: a.id,
      entree: a,
      url: url(`assignments/${a.id}`),
      // Les assignments prennent la couleur de la fin du spectre visible, décalée par assignment.
      accent: accent(Math.min(700, 470 + k * 60)),
      etapes: etapes
        .filter((e) => e.id.startsWith(a.id + '/'))
        .sort((x, y) => nomFichier(x.id).localeCompare(nomFichier(y.id), 'fr', { numeric: true }))
        .map<EtapeNav>((e, i) => ({
          type: 'etape',
          url: url(`assignments/${a.id}/${slugSansNumero(nomFichier(e.id))}`),
          titre: e.data.titre,
          court: e.data.titre,
          entree: e,
          index: i + 1,
        })),
    }));

  return { chapitres, assignments };
}

/** Séquence linéaire complète des chapitres (ouvertures + leçons). */
export function sequenceChapitres(cours: Cours): Page[] {
  return cours.chapitres.flatMap<Page>((c) => [
    {
      type: 'ouverture',
      url: c.url,
      titre: `${c.code} · ${c.entree.data.titre}`,
      court: c.entree.data.titre,
    },
    ...c.lecons,
  ]);
}

export function sequenceAssignment(a: AssignmentNav): Page[] {
  return [
    { type: 'assignment', url: a.url, titre: `${a.entree.data.code} · ${a.entree.data.titre}`, court: 'Aperçu' },
    ...a.etapes,
  ];
}

export function voisins(seq: Page[], urlCourante: string): { prec?: Page; suiv?: Page } {
  const i = seq.findIndex((p) => p.url === urlCourante);
  if (i < 0) return {};
  return { prec: seq[i - 1], suiv: seq[i + 1] };
}

/** Leçons de tout le cours qui déclarent s'appuyer sur un assignment. */
export function leconsLiees(cours: Cours, codeAssignment: string) {
  const code = codeAssignment.toLowerCase();
  return cours.chapitres.flatMap((c) =>
    c.lecons
      .filter((l) => l.entree.data.assignments.map((s) => s.toLowerCase()).includes(code))
      .map((l) => ({ chapitre: c, lecon: l })),
  );
}
