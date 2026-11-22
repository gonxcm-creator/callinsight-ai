/**
 * Datos de referencia de Cuentas Claras.
 * Tipos generales orientativos (revisados 22/11/2026) y precios de oferta
 * de idealista (fechas indicadas por comunidad). Todo es editable en la app.
 */

import { ZONE_PRICES } from './zone-prices.js';

export const LOCALES = ['es', 'en', 'fr'];

export const EURIBOR = {
  value: 3.3,
  date: '2026-11',
  source: 'https://www.bde.es/',
};

/** ITP por tramos marginales: [límite superior, tipo]. null = sin límite. */
export const REGIONS = [
  {
    id: 'andalucia',
    name: { es: 'Andalucía', en: 'Andalusia', fr: 'Andalousie' },
    itp: [[null, 0.07]],
    ajd: 0.012,
    iva: 0.1,
    market: 2952,
    marketDate: '2026-09',
    taxUrl: 'https://www.juntadeandalucia.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/andalucia/',
  },
  {
    id: 'aragon',
    name: { es: 'Aragón', en: 'Aragon', fr: 'Aragon' },
    itp: [
      [400000, 0.08],
      [450000, 0.085],
      [750000, 0.09],
      [1000000, 0.095],
      [null, 0.1],
    ],
    ajd: 0.015,
    iva: 0.1,
    market: 1719,
    marketDate: '2026-10',
    taxUrl: 'https://www.aragon.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/aragon/',
  },
  {
    id: 'asturias',
    name: { es: 'Asturias', en: 'Asturias', fr: 'Asturies' },
    itp: [
      [300000, 0.08],
      [500000, 0.09],
      [null, 0.1],
    ],
    ajd: 0.012,
    iva: 0.1,
    market: 1923,
    marketDate: '2026-10',
    taxUrl: 'https://sede.asturias.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/asturias/',
  },
  {
    id: 'baleares',
    name: { es: 'Illes Balears', en: 'Balearic Islands', fr: 'Îles Baléares' },
    itp: [
      [400000, 0.08],
      [600000, 0.09],
      [1000000, 0.1],
      [2000000, 0.12],
      [null, 0.13],
    ],
    ajd: 0.015,
    iva: 0.1,
    market: 5619,
    marketDate: '2026-10',
    taxUrl: 'https://atib.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/baleares/',
  },
  {
    id: 'canarias',
    name: { es: 'Canarias', en: 'Canary Islands', fr: 'Îles Canaries' },
    itp: [[null, 0.065]],
    ajd: 0.0075,
    iva: 0.07,
    market: 3348,
    marketDate: '2026-10',
    taxUrl: 'https://www.gobiernodecanarias.org/tributos/',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/canarias/',
  },
  {
    id: 'cantabria',
    name: { es: 'Cantabria', en: 'Cantabria', fr: 'Cantabrie' },
    itp: [[null, 0.09]],
    ajd: 0.015,
    iva: 0.1,
    market: 2423,
    marketDate: '2026-10',
    taxUrl: 'https://www.cantabria.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/cantabria/',
  },
  {
    id: 'castilla-leon',
    name: { es: 'Castilla y León', en: 'Castile and León', fr: 'Castille-et-León' },
    itp: [
      [250000, 0.08],
      [null, 0.1],
    ],
    ajd: 0.015,
    iva: 0.1,
    market: 1412,
    marketDate: '2026-10',
    taxUrl: 'https://www.jcyl.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/castilla-y-leon/',
  },
  {
    id: 'castilla-la-mancha',
    name: {
      es: 'Castilla-La Mancha',
      en: 'Castile-La Mancha',
      fr: 'Castille-La Manche',
    },
    itp: [[null, 0.09]],
    ajd: 0.0125,
    iva: 0.1,
    market: 1178,
    marketDate: '2026-10',
    taxUrl: 'https://www.castillalamancha.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/castilla-la-mancha/',
  },
  {
    id: 'cataluna',
    name: { es: 'Cataluña', en: 'Catalonia', fr: 'Catalogne' },
    itp: [
      [600000, 0.1],
      [900000, 0.11],
      [1500000, 0.12],
      [null, 0.13],
    ],
    ajd: 0.015,
    iva: 0.1,
    market: 3081,
    marketDate: '2026-08',
    taxUrl: 'https://atc.gencat.cat',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/cataluna/',
  },
  {
    id: 'ceuta',
    name: { es: 'Ceuta', en: 'Ceuta', fr: 'Ceuta' },
    itp: [[null, 0.03]],
    ajd: 0.005,
    iva: 0.04,
    market: 2698,
    marketDate: '2026-09',
    taxUrl: 'https://www.ceuta.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/ceuta/',
  },
  {
    id: 'valencia',
    name: {
      es: 'Comunitat Valenciana',
      en: 'Valencian Community',
      fr: 'Communauté valencienne',
    },
    itp: [
      [1000000, 0.1],
      [null, 0.11],
    ],
    ajd: 0.014,
    iva: 0.1,
    market: 2497,
    marketDate: '2026-09',
    taxUrl: 'https://hisenda.gva.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/comunitat-valenciana/',
  },
  {
    id: 'extremadura',
    name: { es: 'Extremadura', en: 'Extremadura', fr: 'Estrémadure' },
    itp: [
      [360000, 0.08],
      [600000, 0.1],
      [null, 0.11],
    ],
    ajd: 0.015,
    iva: 0.1,
    market: 1049,
    marketDate: '2026-09',
    taxUrl: 'https://www.juntaex.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/extremadura/',
  },
  {
    id: 'galicia',
    name: { es: 'Galicia', en: 'Galicia', fr: 'Galice' },
    itp: [[null, 0.08]],
    ajd: 0.015,
    iva: 0.1,
    market: 1661,
    marketDate: '2026-07',
    taxUrl: 'https://www.xunta.gal',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/galicia/',
  },
  {
    id: 'rioja',
    name: { es: 'La Rioja', en: 'La Rioja', fr: 'La Rioja' },
    itp: [[null, 0.07]],
    ajd: 0.01,
    iva: 0.1,
    market: 1447,
    marketDate: '2026-02',
    taxUrl: 'https://www.larioja.org',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/la-rioja/',
  },
  {
    id: 'madrid',
    name: { es: 'Comunidad de Madrid', en: 'Community of Madrid', fr: 'Communauté de Madrid' },
    itp: [[null, 0.06]],
    ajd: 0.0075,
    iva: 0.1,
    market: 5065,
    marketDate: '2026-09',
    taxUrl: 'https://www.comunidad.madrid',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/madrid-comunidad/',
  },
  {
    id: 'melilla',
    name: { es: 'Melilla', en: 'Melilla', fr: 'Melilla' },
    itp: [[null, 0.03]],
    ajd: 0.005,
    iva: 0.04,
    market: 2086,
    marketDate: '2026-09',
    taxUrl: 'https://www.melilla.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/melilla/',
  },
  {
    id: 'murcia',
    name: { es: 'Región de Murcia', en: 'Region of Murcia', fr: 'Région de Murcie' },
    itp: [[null, 0.0775]],
    ajd: 0.015,
    iva: 0.1,
    market: 1689,
    marketDate: '2026-09',
    taxUrl: 'https://www.carm.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/murcia-region/',
  },
  {
    id: 'navarra',
    name: { es: 'Navarra', en: 'Navarre', fr: 'Navarre' },
    itp: [[null, 0.06]],
    ajd: 0.005,
    iva: 0.1,
    market: 1980,
    marketDate: '2026-09',
    taxUrl: 'https://www.navarra.es',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/navarra/',
  },
  {
    id: 'pais-vasco',
    name: { es: 'País Vasco', en: 'Basque Country', fr: 'Pays basque' },
    itp: [[null, 0.04]],
    ajd: 0.005,
    iva: 0.1,
    market: 3784,
    marketDate: '2026-08',
    taxUrl: 'https://www.euskadi.eus',
    marketUrl:
      'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/euskadi/',
  },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export const CONDITIONS = [
  { id: 'reform', reformPerM2: 700, factor: 0.85 },
  { id: 'regular', reformPerM2: 350, factor: 0.95 },
  { id: 'good', reformPerM2: 0, factor: 1 },
  { id: 'new', reformPerM2: 0, factor: 1.08 },
];

export const CONDITION_BY_ID = Object.fromEntries(CONDITIONS.map((c) => [c.id, c]));

export const DEFAULT_STATE = {
  label: '',
  price: 420000,
  m2: 90,
  regionId: 'madrid',
  propertyType: 'usada', // usada | nueva
  conditionId: 'good',
  year: 2005,
  downPct: 20,
  years: 30,
  mortgageType: 'fixed', // fixed | variable | mixed
  tin: 3.2,
  euribor: EURIBOR.value,
  spread: 0.99,
  fixedYears: 5,
  openingFeePct: 0,
  agencyPct: 0,
  reformPerM2: null,
  furniture: 0,
  rent: 1800,
  vacancyPct: 5,
  opexYear: 1800,
  managementPct: 0,
  income: 5200,
  savings: 120000,
  otherDebts: 200,
  marketRef: null,
  appreciationPct: 2.5,
  rentGrowthPct: 2,
  altReturnPct: 4,
  horizon: 10,
  sellingCostPct: 3,
  taxRatePct: 24,
};

/**
 * Zonas recomendadas por comunidad.
 * El €/m² de cada zona es el precio medio de venta que publica Fotocasa para esa zona
 * (ver js/zone-prices.js, con su mes y su lugar exactos). `index` es solo el respaldo
 * relativo a la media autonómica si algún día faltara el dato publicado.
 * Los enlaces llevan a la búsqueda real del portal para esa zona.
 */
const zone = (id, regionId, name, city, index, fotoPath, pisosSlug) => {
  const price = ZONE_PRICES[id];
  return {
    id,
    regionId,
    name,
    city,
    index,
    fotocasa: `https://www.fotocasa.es/es/comprar/viviendas/${fotoPath}/l`,
    pisos: `https://www.pisos.com/venta/pisos-${pisosSlug}/`,
    /** €/m² publicado por Fotocasa para esa zona (null si no hubiera dato). */
    market: price ? price.perM2 : null,
    marketDate: price ? price.date : null,
    marketPlace: price ? price.place : null,
  };
};

export const ZONES = [
  // Andalucía
  zone('sevilla-nervion', 'andalucia', 'Nervión', 'Sevilla', 1.15, 'sevilla-capital/nervion', 'sevilla'),
  zone('sevilla-triana', 'andalucia', 'Triana', 'Sevilla', 1.05, 'sevilla-capital/triana', 'sevilla'),
  zone('malaga-centro', 'andalucia', 'Centro', 'Málaga', 1.45, 'malaga-capital/centro', 'malaga'),
  zone('granada-centro', 'andalucia', 'Centro', 'Granada', 0.95, 'granada-capital/centro', 'granada'),
  zone('jerez-centro', 'andalucia', 'Centro', 'Jerez de la Frontera', 0.7, 'jerez-de-la-frontera/todas-las-zonas', 'jerez_de_la_frontera'),

  // Aragón
  zone('zaragoza-centro', 'aragon', 'Centro', 'Zaragoza', 1.2, 'zaragoza-capital/centro', 'zaragoza'),
  zone('zaragoza-delicias', 'aragon', 'Delicias', 'Zaragoza', 0.95, 'zaragoza-capital/delicias', 'zaragoza'),
  zone('huesca-centro', 'aragon', 'Centro', 'Huesca', 0.9, 'huesca-capital/todas-las-zonas', 'huesca'),
  zone('teruel-centro', 'aragon', 'Centro', 'Teruel', 0.72, 'teruel-capital/todas-las-zonas', 'teruel'),

  // Asturias
  zone('oviedo-centro', 'asturias', 'Centro', 'Oviedo', 1.2, 'oviedo/centro-casco-historico', 'oviedo'),
  zone('gijon-centro', 'asturias', 'Centro', 'Gijón', 1.15, 'gijon/centro', 'gijon'),
  zone('aviles', 'asturias', 'Centro', 'Avilés', 0.82, 'aviles/todas-las-zonas', 'aviles'),

  // Illes Balears
  zone('palma-centre', 'baleares', 'Centre', 'Palma', 1.1, 'palma-de-mallorca/centre', 'palma_de_mallorca'),
  zone('palma-santa-catalina', 'baleares', 'Santa Catalina', 'Palma', 1.35, 'palma-de-mallorca/santa-catalina', 'palma_de_mallorca'),
  zone('eivissa', 'baleares', 'Centro', 'Eivissa', 1.3, 'eivissa/todas-las-zonas', 'ibiza'),
  zone('manacor', 'baleares', 'Centro', 'Manacor', 0.6, 'manacor/todas-las-zonas', 'manacor'),

  // Canarias
  zone('las-palmas-centro', 'canarias', 'Centro', 'Las Palmas de G.C.', 1.0, 'las-palmas-de-gran-canaria/centro', 'las_palmas_de_gran_canaria'),
  zone('tenerife-centro', 'canarias', 'Centro', 'Santa Cruz de Tenerife', 1.05, 'santa-cruz-de-tenerife/centro', 'santa_cruz_de_tenerife'),
  zone('la-laguna', 'canarias', 'Centro', 'San Cristóbal de La Laguna', 0.9, 'san-cristobal-de-la-laguna/todas-las-zonas', 'san_cristobal_de_la_laguna'),
  zone('arona', 'canarias', 'Costa', 'Arona', 1.0, 'arona/todas-las-zonas', 'arona'),

  // Cantabria
  zone('santander-centro', 'cantabria', 'Centro', 'Santander', 1.25, 'santander/centro-ayuntamiento', 'santander'),
  zone('torrelavega', 'cantabria', 'Centro', 'Torrelavega', 0.72, 'torrelavega/todas-las-zonas', 'torrelavega'),
  zone('castro-urdiales', 'cantabria', 'Casco', 'Castro Urdiales', 0.95, 'castro-urdiales/todas-las-zonas', 'castro_urdiales'),

  // Castilla y León
  zone('valladolid-centro', 'castilla-leon', 'Centro', 'Valladolid', 1.2, 'valladolid-capital/centro', 'valladolid'),
  zone('burgos-centro', 'castilla-leon', 'Centro', 'Burgos', 1.05, 'burgos-capital/centro', 'burgos'),
  zone('salamanca-centro', 'castilla-leon', 'Centro', 'Salamanca', 1.1, 'salamanca-capital/centro', 'salamanca'),
  zone('leon-centro', 'castilla-leon', 'Centro', 'León', 1.0, 'leon-capital/centro-ciudad', 'leon'),

  // Castilla-La Mancha
  zone('toledo-centro', 'castilla-la-mancha', 'Casco', 'Toledo', 1.15, 'toledo-capital/casco-historico', 'toledo'),
  zone('albacete-centro', 'castilla-la-mancha', 'Centro', 'Albacete', 1.0, 'albacete-capital/centro', 'albacete'),
  zone('guadalajara', 'castilla-la-mancha', 'Centro', 'Guadalajara', 1.05, 'guadalajara-capital/todas-las-zonas', 'guadalajara'),
  zone('ciudad-real', 'castilla-la-mancha', 'Centro', 'Ciudad Real', 0.9, 'ciudad-real-capital/todas-las-zonas', 'ciudad_real'),

  // Cataluña
  zone('barcelona-eixample', 'cataluna', 'Eixample', 'Barcelona', 1.55, 'barcelona-capital/eixample', 'barcelona'),
  zone('barcelona-gracia', 'cataluna', 'Gràcia', 'Barcelona', 1.4, 'barcelona-capital/gracia', 'barcelona'),
  zone('barcelona-sants', 'cataluna', 'Sants-Montjuïc', 'Barcelona', 1.05, 'barcelona-capital/sants-montjuic', 'barcelona'),
  zone('girona', 'cataluna', 'Centro', 'Girona', 1.0, 'girona-capital/todas-las-zonas', 'girona'),
  zone('hospitalet', 'cataluna', 'Centro', 'L Hospitalet de Llobregat', 0.85, 'l-hospitalet-de-llobregat/centre', 'hospitalet_de_llobregat'),

  // Ceuta
  zone('ceuta-centro', 'ceuta', 'Centro', 'Ceuta', 1.1, 'ceuta/todas-las-zonas', 'ceuta'),
  zone('ceuta-hadu', 'ceuta', 'Hadú', 'Ceuta', 0.9, 'ceuta/todas-las-zonas', 'ceuta'),

  // Comunitat Valenciana
  zone('valencia-eixample', 'valencia', 'Eixample', 'València', 1.3, 'valencia-capital/l-eixample', 'valencia'),
  zone('valencia-russafa', 'valencia', 'Russafa', 'València', 1.25, 'valencia-capital/russafa', 'valencia'),
  zone('valencia-cabanyal', 'valencia', 'El Cabanyal', 'València', 1.0, 'valencia-capital/el-cabanyal-el-canyamelar', 'valencia'),
  zone('alicante-centro', 'valencia', 'Centro', 'Alicante', 1.1, 'alicante-alacant/centro', 'alicante'),
  zone('castellon', 'valencia', 'Centro', 'Castelló de la Plana', 0.82, 'castellon/todas-las-zonas', 'castellon_de_la_plana'),

  // Extremadura
  zone('badajoz-centro', 'extremadura', 'Centro', 'Badajoz', 1.1, 'badajoz-capital/casco-antiguo', 'badajoz'),
  zone('caceres-centro', 'extremadura', 'Centro', 'Cáceres', 1.05, 'caceres-capital/centro', 'caceres'),
  zone('merida', 'extremadura', 'Centro', 'Mérida', 0.9, 'merida/todas-las-zonas', 'merida'),

  // Galicia
  zone('coruna-centro', 'galicia', 'Centro', 'A Coruña', 1.2, 'a-coruna-capital/centro-juan-florez-plaza-pontevedra', 'a_coruna'),
  zone('vigo-centro', 'galicia', 'Centro', 'Vigo', 1.15, 'vigo/centro-urbano', 'vigo'),
  zone('santiago', 'galicia', 'Centro', 'Santiago de Compostela', 1.05, 'santiago-de-compostela/todas-las-zonas', 'santiago_de_compostela'),
  zone('lugo', 'galicia', 'Centro', 'Lugo', 0.82, 'lugo-capital/todas-las-zonas', 'lugo'),

  // La Rioja
  zone('logrono-centro', 'rioja', 'Centro', 'Logroño', 1.15, 'logrono/centro', 'logrono'),
  zone('logrono-cascajos', 'rioja', 'Cascajos', 'Logroño', 0.95, 'logrono/cascajos-piqueras', 'logrono'),
  zone('haro', 'rioja', 'Centro', 'Haro', 0.8, 'haro/todas-las-zonas', 'haro'),

  // Comunidad de Madrid
  zone('madrid-chamberi', 'madrid', 'Chamberí', 'Madrid', 1.3, 'madrid-capital/chamberi', 'madrid'),
  zone('madrid-salamanca', 'madrid', 'Salamanca', 'Madrid', 1.75, 'madrid-capital/barrio-de-salamanca', 'madrid'),
  zone('madrid-retiro', 'madrid', 'Retiro', 'Madrid', 1.35, 'madrid-capital/retiro', 'madrid'),
  zone('madrid-tetuan', 'madrid', 'Tetuán', 'Madrid', 0.95, 'madrid-capital/tetuan', 'madrid'),
  zone('madrid-carabanchel', 'madrid', 'Carabanchel', 'Madrid', 0.75, 'madrid-capital/carabanchel', 'madrid'),
  zone('getafe', 'madrid', 'Centro', 'Getafe', 0.62, 'getafe/todas-las-zonas', 'getafe'),
  zone('alcala-henares', 'madrid', 'Centro', 'Alcalá de Henares', 0.68, 'alcala-de-henares/todas-las-zonas', 'alcala_de_henares'),

  // Melilla
  zone('melilla-centro', 'melilla', 'Centro', 'Melilla', 1.1, 'melilla/todas-las-zonas', 'melilla'),
  zone('melilla-real', 'melilla', 'Real', 'Melilla', 0.9, 'melilla/todas-las-zonas', 'melilla'),

  // Región de Murcia
  zone('murcia-centro', 'murcia', 'Centro', 'Murcia', 1.15, 'murcia-capital/centro', 'murcia'),
  zone('murcia-carmen', 'murcia', 'El Carmen', 'Murcia', 0.9, 'murcia-capital/el-carmen', 'murcia'),
  zone('cartagena-centro', 'murcia', 'Centro', 'Cartagena', 1.0, 'cartagena/casco-antiguo', 'cartagena'),
  zone('lorca', 'murcia', 'Centro', 'Lorca', 0.72, 'lorca/todas-las-zonas', 'lorca'),

  // Navarra
  zone('pamplona-centro', 'navarra', 'Centro', 'Pamplona', 1.3, 'pamplona-iruna/casco-antiguo', 'pamplona'),
  zone('pamplona-iturrama', 'navarra', 'Iturrama', 'Pamplona', 1.05, 'pamplona-iruna/iturrama', 'pamplona'),
  zone('tudela', 'navarra', 'Centro', 'Tudela', 0.8, 'tudela/todas-las-zonas', 'tudela'),

  // País Vasco
  zone('bilbao-abando', 'pais-vasco', 'Abando', 'Bilbao', 1.4, 'bilbao/abando-albia', 'bilbao'),
  zone('bilbao-deusto', 'pais-vasco', 'Deusto', 'Bilbao', 1.05, 'bilbao/deusto', 'bilbao'),
  zone('donostia-centro', 'pais-vasco', 'Centro', 'San Sebastián', 1.45, 'donostia-san-sebastian/centro', 'san_sebastian'),
  zone('vitoria', 'pais-vasco', 'Centro', 'Vitoria-Gasteiz', 1.0, 'vitoria-gasteiz/todas-las-zonas', 'vitoria'),
];

export const zonesFor = (regionId) => ZONES.filter((z) => z.regionId === regionId);

export const SOURCES = [
  {
    id: 'idealista',
    label: { es: 'idealista — informes de precios', en: 'idealista — price reports', fr: 'idealista — rapports de prix' },
    url: 'https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/venta/report',
    date: '2026-10',
  },
  {
    id: 'euribor',
    label: { es: 'Banco de España / BCE — Euríbor', en: 'Bank of Spain / ECB — Euribor', fr: 'Banque d’Espagne / BCE — Euribor' },
    url: 'https://www.bde.es/',
    date: '2026-11',
  },
  {
    id: 'itp',
    label: { es: 'Agencias tributarias autonómicas', en: 'Regional tax agencies', fr: 'Agences fiscales régionales' },
    url: 'https://sede.agenciatributaria.gob.es/',
    date: '2026-11',
  },
  {
    id: 'aranceles',
    label: { es: 'Arancel notarial y registral (normativa estatal)', en: 'Notary and land-registry tariffs (Spanish law)', fr: 'Tarifs notariaux et cadastraux (droit espagnol)' },
    url: 'https://www.notariado.org/',
    date: '2026-11',
  },
  {
    id: 'fotocasa',
    label: {
      es: 'Fotocasa — precio medio por zona y vivienda en venta',
      en: 'Fotocasa — average price per area and homes for sale',
      fr: 'Fotocasa — prix moyen par quartier et biens à vendre',
    },
    url: 'https://www.fotocasa.es/es/comprar/viviendas/',
    date: '2026-11',
  },
  {
    id: 'pisos',
    label: {
      es: 'pisos.com — oferta de venta',
      en: 'pisos.com — sale listings',
      fr: 'pisos.com — annonces de vente',
    },
    url: 'https://www.pisos.com/venta/',
    date: '2026-11',
  },
  {
    id: 'ine',
    label: {
      es: 'INE — Índice de Precios de Vivienda (IPV)',
      en: 'INE — House Price Index (IPV)',
      fr: 'INE — Indice des prix du logement (IPV)',
    },
    url: 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736152838',
    date: '2026-09',
  },
  {
    id: 'registradores',
    label: {
      es: 'Colegio de Registradores — estadística inmobiliaria',
      en: 'Land Registrars — housing statistics',
      fr: 'Registres fonciers — statistiques immobilières',
    },
    url: 'https://www.registradores.org/',
    date: '2026-10',
  },
  {
    id: 'notariado',
    label: {
      es: 'Consejo General del Notariado — precios de escritura',
      en: 'General Council of Notaries — deed prices',
      fr: 'Conseil général du notariat — prix des actes',
    },
    url: 'https://www.notariado.org/',
    date: '2026-10',
  },
];

export const fmtDate = (iso, locale) => {
  if (!iso) return '';
  const [y, m] = iso.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(d);
};
