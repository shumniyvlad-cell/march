// Качает Inter (кириллица + латиница) в fonts/ и пишет css/fonts.css.
// На технике Apple сайт берёт системный SF, Inter нужен остальным.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const get = (u) => fetch(u, { headers: { 'User-Agent': UA } });

let css = '/* Собрано tools/fonts.mjs, руками не править */\n';
const base = await (await get('https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap')).text();
for (const m of base.matchAll(/\/\* ([a-z-]+) \*\/\s*@font-face \{([^}]+)\}/g)) {
  if (!['cyrillic', 'latin'].includes(m[1])) continue;
  const url = m[2].match(/url\(([^)]+)\)/)[1];
  const range = m[2].match(/unicode-range:([^;]+);/)[1].trim();
  fs.writeFileSync(path.join(ROOT, 'fonts', `inter-${m[1]}.woff2`), Buffer.from(await (await get(url)).arrayBuffer()));
  css += `@font-face{font-family:"Inter";font-weight:400 700;font-display:swap;src:url(../fonts/inter-${m[1]}.woff2) format("woff2");unicode-range:${range}}\n`;
}
fs.writeFileSync(path.join(ROOT, 'css', 'fonts.css'), css);
console.log(fs.readdirSync(path.join(ROOT, 'fonts')));
