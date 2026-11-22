/**
 * Datos de referencia de Cuentas Claras.
 * Tipos generales orientativos (revisados 22/11/2026) y precios de oferta
 * de idealista (fechas indicadas por comunidad). Todo es editable en la app.
 */

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
  otherDebts: 200,
  marketRef: null,
  appreciationPct: 2.5,
  rentGrowthPct: 2,
  altReturnPct: 4,
  horizon: 10,
  sellingCostPct: 3,
  taxRatePct: 24,
};

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
];

export const fmtDate = (iso, locale) => {
  if (!iso) return '';
  const [y, m] = iso.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(d);
};
