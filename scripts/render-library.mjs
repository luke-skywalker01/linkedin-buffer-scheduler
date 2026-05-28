import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCardPng } from '../src/card.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'images');

// On-Brand-Zitatkarten-Bibliothek (DE, Sustainable-Finance-Nische).
// Evergreen/Meinung formuliert (geringes Faktenrisiko) — die konkreten
// Regulatorik-Details trägt der frisch geschriebene Post-Text.
const CARDS = [
  { slug: 'card-transitionsplan',   tag: 'Transitionsplan',        quote: 'Reporting-Dokument oder echtes Steuerungsinstrument?', sub: 'Die Antwort entscheidet über Glaubwürdigkeit.' },
  { slug: 'card-csrd-omnibus',      tag: 'CSRD · Omnibus',         quote: 'Weniger Berichtspflicht heißt nicht weniger Verantwortung.', sub: 'Datenqualität bleibt der Vorsprung.' },
  { slug: 'card-transition-finance',tag: 'Transition Finance',     quote: 'Kapital lenkt den Wandel — nicht das Reporting.', sub: 'Finanzierung macht Transformationspfade real.' },
  { slug: 'card-klimafinanzierung', tag: 'Klimaschutzfinanzierung',quote: 'Jede Finanzierungsentscheidung ist eine Klimaentscheidung.', sub: 'Auch die, die man nicht trifft.' },
  { slug: 'card-glaubwuerdigkeit',  tag: 'Glaubwürdigkeit',        quote: 'Ambition ohne Pfad ist Greenwashing mit besserem Wording.', sub: 'Ein Transitionsplan macht Ambition überprüfbar.' },
  { slug: 'card-esg-daten',         tag: 'ESG-Daten',              quote: 'Was man nicht misst, kann man nicht transformieren.', sub: 'Datenqualität ist die Voraussetzung der Dekarbonisierung.' },
  { slug: 'card-wesentlichkeit',    tag: 'Doppelte Wesentlichkeit',quote: 'Wesentlich ist, was Risiko und Wirkung verbindet.', sub: 'Mehr als eine Pflichtübung.' },
  { slug: 'card-klimarisiko',       tag: 'Klimarisiko',            quote: 'Klimarisiko ist Kreditrisiko — mit längerem Horizont.', sub: 'Die Aufsicht erwartet, dass Banken es einpreisen.' },
  { slug: 'card-net-zero',          tag: 'Net Zero',               quote: 'Eine Net-Zero-Zusage ohne Bilanz ist eine Schlagzeile.', sub: 'Glaubwürdig wird sie mit Messung und Pfad.' },
  { slug: 'card-eu-taxonomie',      tag: 'EU-Taxonomie',           quote: 'Taxonomie-Quoten zeigen Richtung, nicht Tempo.', sub: 'Entscheidend ist der Pfad dorthin.' },
];

await mkdir(OUT, { recursive: true });
for (const c of CARDS) {
  const png = await renderCardPng(c);
  await writeFile(path.join(OUT, `${c.slug}.png`), png);
  console.log('rendered', c.slug);
}
console.log('DONE', CARDS.length, 'cards ->', OUT);
