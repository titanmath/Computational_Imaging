// Vérifie que tous les liens internes de dist/ pointent vers une page existante.
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const base = (process.env.BASE ?? '/').replace(/\/?$/, '/');

async function* fichiers(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* fichiers(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}
async function existe(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

let erreurs = 0;
let total = 0;
for await (const f of fichiers(dist)) {
  const html = await readFile(f, 'utf8');
  for (const [, href] of html.matchAll(/href="([^"#?]+)[^"]*"/g)) {
    if (!href.startsWith(base) || href.startsWith('//')) continue;
    total++;
    const chemin = join(dist, href.slice(base.length));
    const ok = (await existe(join(chemin, 'index.html'))) || ((await existe(chemin)) && !(await stat(chemin)).isDirectory());
    if (!ok) {
      erreurs++;
      console.error(`✗ ${relative(dist, f)} → ${href}`);
    }
  }
}
console.log(`Liens internes vérifiés : ${total}, cassés : ${erreurs}`);
if (erreurs) process.exit(1);
