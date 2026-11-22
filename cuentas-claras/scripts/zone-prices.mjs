/**
 * Regenera js/zone-prices.js con el €/m² medio de venta que Fotocasa publica en la
 * página de cada zona (texto: «En noviembre de 2026, el precio medio de venta en
 * X es de 3706,79 €/m²»).
 *
 * Uso: node scripts/zone-prices.mjs
 * Requiere red. No toca nada más: escribe solo js/zone-prices.js.
 * Si alguna zona no trae dato, se omite y la app usa el índice de respaldo.
 */
import { writeFileSync } from 'node:fs';
import { ZONES } from '../js/data.js';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const MES = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};
const PATTERN =
  /En (\w+) de (\d{4}), el precio medio de venta en (.+?) es de ([\d.,]+)\s*€\/m²/;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function priceFor(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES' } });
  if (!res.ok) return null;
  const html = await res.text();
  const match = PATTERN.exec(html);
  if (!match) return null;
  const perM2 = Math.round(Number(match[4].replace(/\./g, '').replace(',', '.')));
  if (!Number.isFinite(perM2) || perM2 < 200 || perM2 > 30000) return null;
  return { perM2, date: `${match[2]}-${MES[match[1]] || '01'}`, place: match[3].trim() };
}

const rows = [];
for (const zone of ZONES) {
  let price = null;
  for (let attempt = 0; attempt < 2 && !price; attempt += 1) {
    try {
      price = await priceFor(zone.fotocasa);
    } catch (error) {
      price = null;
    }
    if (!price) await wait(600);
  }
  if (price) rows.push({ id: zone.id, ...price });
  else console.warn(`sin dato: ${zone.id}`);
  await wait(250);
}

rows.sort((a, b) => a.id.localeCompare(b.id));
const body = rows
  .map(
    (row) =>
      `  '${row.id}': { perM2: ${row.perM2}, date: '${row.date}', place: '${row.place.replace(/'/g, "\\'")}' },`,
  )
  .join('\n');

writeFileSync(
  'js/zone-prices.js',
  `/**\n * Precio medio de venta (€/m²) por zona, publicado por Fotocasa en la página de\n * cada zona. Regenerado con scripts/zone-prices.mjs el ${new Date().toISOString().slice(0, 10)};\n * \`date\` es el mes del dato publicado y la fuente de cada zona es su URL de Fotocasa.\n */\nexport const ZONE_PRICES = {\n${body}\n};\n`,
);

console.log(`zonas con dato: ${rows.length}/${ZONES.length} → js/zone-prices.js`);
