// Chemins internes, sans dépendance à astro:content : utilisables aussi côté navigateur (composants Svelte).

/** Lien interne qui respecte `base` (déploiement dans un sous-dossier). */
export function url(chemin = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const propre = chemin.replace(/^\/+/, '').replace(/\/?$/, '/');
  return chemin === '' || chemin === '/' ? `${base}/` : `${base}/${propre}`;
}

/** "04-champ-de-vision" → "champ-de-vision" */
export const slugSansNumero = (nom: string) => nom.replace(/^\d+[-_]/, '');

/** Identifiant de leçon "06-hdr/05-courbe-de-reponse" → URL de la leçon (ou du chapitre si pas de « / »). */
export function lienLecon(id: string): string {
  const [chapitre, fichier] = id.split('/');
  return fichier ? url(`${chapitre}/${slugSansNumero(fichier)}`) : url(chapitre);
}
