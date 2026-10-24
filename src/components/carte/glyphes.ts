// Glyphes des stations de la carte (viewBox 0 0 40 40, trait = currentColor).
// Pour un nouveau chapitre, choisir une clé existante dans `_chapitre.yaml` (icone: …) ou en ajouter une ici.
export const glyphes: Record<string, string> = {
  point: '<circle cx="20" cy="20" r="5"/>',
  source:
    '<circle cx="20" cy="20" r="6"/><path d="M20 6v4M20 30v4M6 20h4M30 20h4M10.1 10.1l2.8 2.8M27.1 27.1l2.8 2.8M10.1 29.9l2.8-2.8M27.1 12.9l2.8-2.8"/>',
  lentille:
    '<path d="M20 6c4 4 4 24 0 28c-4-4-4-24 0-28Z"/><path d="M3 14l17 6M3 26l17-6M20 20l17-6M20 20l17 6" opacity=".55"/>',
  capteur:
    '<rect x="9" y="9" width="22" height="22" rx="2"/><path d="M16.3 9v22M23.6 9v22M9 16.3h22M9 23.6h22" opacity=".6"/>',
  isp: '<rect x="8" y="12" width="16" height="16" rx="1.5" opacity=".45"/><rect x="12" y="8" width="16" height="16" rx="1.5" opacity=".7"/><rect x="16" y="4" width="16" height="16" rx="1.5"/>',
  oeil: '<path d="M4 20c5-8 11-11 16-11s11 3 16 11c-5 8-11 11-16 11S9 28 4 20Z"/><circle cx="20" cy="20" r="5.5"/><circle cx="20" cy="20" r="1.8" fill="currentColor"/>',
  mire: '<rect x="7" y="7" width="26" height="26" rx="1.5"/><path d="M7 20h26M20 7v26"/><path d="M7 7h13v13H7zM20 20h13v13H20z" fill="currentColor" opacity=".35" stroke="none"/>',
  hdr: '<circle cx="20" cy="20" r="11"/><path d="M20 9a11 11 0 0 1 0 22Z" fill="currentColor" stroke="none" opacity=".8"/>',
  inverse:
    '<path d="M8 15h20l-4-4M32 25H12l4 4"/><circle cx="8" cy="15" r="1.6" fill="currentColor"/><circle cx="32" cy="25" r="1.6" fill="currentColor"/>',
  prior:
    '<path d="M5 28c4 0 4-10 8-10s4 6 7 6 4-14 8-14 4 18 7 18" opacity=".45"/><path d="M5 26h8v-6h7v4h8v-12h7"/>',
};

export function glyphe(cle: string): string {
  return glyphes[cle] ?? glyphes.point;
}
