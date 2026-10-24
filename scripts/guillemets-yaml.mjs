// Met entre guillemets les champs texte du frontmatter / des YAML de contenu
// (le français contient des « : » qui cassent le YAML non guillemeté).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const racine = new URL('../src/content/', import.meta.url).pathname;
const CLES = ['titre', 'resume', 'sousTitre', 'complement', 'sortie', 'rendu', 'demo'];

async function* fichiers(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* fichiers(p);
    else if (/\.(mdx|yaml)$/.test(e.name)) yield p;
  }
}
const citer = (v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const dejaCite = (v) => /^(["']).*\1$/.test(v) || /^[\d.]+$/.test(v) || v === '' || v === 'true' || v === 'false';

let modifies = 0;
for await (const f of fichiers(racine)) {
  const src = await readFile(f, 'utf8');
  let zone = src;
  let avant = '';
  let apres = '';
  if (f.endsWith('.mdx')) {
    const m = src.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    avant = '---\n';
    zone = m[1];
    apres = src.slice(m[0].length - 4);
  }
  const lignes = zone.split('\n').map((l) => {
    const cle = l.match(/^(\w+):\s(.+)$/);
    if (cle && CLES.includes(cle[1]) && !dejaCite(cle[2].trim())) return `${cle[1]}: ${citer(cle[2].trim())}`;
    const item = l.match(/^(\s+-\s)(.+)$/);
    if (item && !dejaCite(item[2].trim()) && !item[2].includes('[')) return `${item[1]}${citer(item[2].trim())}`;
    return l;
  });
  const nouveau = f.endsWith('.mdx') ? avant + lignes.join('\n') + apres : lignes.join('\n');
  if (nouveau !== src) {
    await writeFile(f, nouveau);
    modifies++;
  }
}
console.log(`YAML : ${modifies} fichier(s) normalisé(s)`);
