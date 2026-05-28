import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(__dirname, '..', 'assets', 'fonts');

async function loadFonts() {
  const [reg, bold] = await Promise.all([
    readFile(path.join(FONT_DIR, 'Inter-Regular.woff')),
    readFile(path.join(FONT_DIR, 'Inter-Bold.woff')),
  ]);
  return [
    { name: 'Inter', data: reg, weight: 400, style: 'normal' },
    { name: 'Inter', data: bold, weight: 700, style: 'normal' },
  ];
}

const div = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

// Rendert eine Zitatkarte (1200x1200) als PNG-Buffer.
export async function renderCardPng({ tag = '', quote, sub = '', name = 'Lukas Birgfellner', role = 'ESG & Sustainable Finance' }) {
  const fonts = await loadFonts();
  const tree = div(
    {
      width: '1200px', height: '1200px', flexDirection: 'column', justifyContent: 'space-between',
      padding: '110px 100px',
      backgroundImage: 'linear-gradient(135deg, #0c3b34, #08544c)',
      color: '#f5f7f6', fontFamily: 'Inter',
    },
    [
      div({ justifyContent: 'space-between', alignItems: 'flex-start' }, [
        div({ fontSize: '28px', letterSpacing: '3px', textTransform: 'uppercase', color: '#7fe3c4', fontWeight: 600, maxWidth: '780px', lineHeight: 1.4 }, tag),
        div({ fontSize: '150px', color: '#2f6b61', fontWeight: 700, lineHeight: 1 }, '“'),
      ]),
      div({ flexDirection: 'column' }, [
        div({ fontSize: '76px', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-1px' }, quote),
        ...(sub ? [div({ fontSize: '30px', color: '#bcd6cf', marginTop: '34px', lineHeight: 1.4, maxWidth: '920px' }, sub)] : []),
      ]),
      div({ alignItems: 'center' }, [
        div({ width: '64px', height: '6px', backgroundColor: '#7fe3c4', borderRadius: '3px', marginRight: '24px' }, ''),
        div({ flexDirection: 'column' }, [
          div({ fontSize: '36px', fontWeight: 600 }, name),
          div({ fontSize: '26px', color: '#bcd6cf', marginTop: '4px' }, role),
        ]),
      ]),
    ]
  );
  const svg = await satori(tree, { width: 1200, height: 1200, fonts });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}

if (process.argv[2] === 'test') {
  const out = path.resolve(__dirname, '..', 'assets', 'test-card.png');
  renderCardPng({
    tag: 'Transitionsplan · EBA-Leitlinien 2026',
    quote: 'Reporting-Dokument oder echtes Steuerungsinstrument?',
    sub: 'Seit 2026 ist der Transitionsplan Teil des aufsichtlichen Risikomanagements.',
  })
    .then((png) => writeFile(out, png))
    .then(() => console.log('OK ->', out))
    .catch((e) => { console.error(e); process.exit(1); });
}
