/**
 * Cuentas Claras — simulador de gastos de compra de vivienda (España).
 * Sin dependencias y sin red: todo se calcula y se guarda en el navegador.
 */

/* -------------------------------------------------------------------------- */
/*  Datos                                                                     */
/* -------------------------------------------------------------------------- */

/** Tipos generales orientativos. ITP y AJD en %. */
const REGIONES = {
  'Andalucía': { itp: 7, ajd: 1.2 },
  'Aragón': { itp: 8, ajd: 1.5 },
  'Asturias': { itp: 8, ajd: 1.2 },
  'Baleares': { itp: 8, ajd: 1.2 },
  'Canarias': { itp: 6.5, ajd: 0.75 },
  'Cantabria': { itp: 10, ajd: 1 },
  'Castilla-La Mancha': { itp: 9, ajd: 1 },
  'Castilla y León': { itp: 8, ajd: 1.5 },
  'Cataluña': { itp: 10, ajd: 1.5 },
  'Ceuta y Melilla': { itp: 6, ajd: 0.5 },
  'Comunidad Valenciana': { itp: 10, ajd: 1.4 },
  'Extremadura': { itp: 8, ajd: 1.2 },
  'Galicia': { itp: 8, ajd: 1.2 },
  'La Rioja': { itp: 7, ajd: 1 },
  'Madrid': { itp: 6, ajd: 0.75 },
  'Murcia': { itp: 8, ajd: 1 },
  'Navarra': { itp: 6, ajd: 0.5 },
  'País Vasco': { itp: 4, ajd: 0.5 },
};

const IVA_OBRA_NUEVA = 10;
const PRECIO_EJEMPLO = 250000;
const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  useGrouping: true,
});
const NUM = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, useGrouping: true });
const ENTERO = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: true });

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const precioDeTexto = (valor) => {
  const digitos = String(valor).replace(/\D/g, '');
  return Math.min(100000000, Number(digitos) || 0);
};
const euros = (n) => (Number.isFinite(n) ? EUR.format(Math.round(n / 10) * 10) : '—');
const pct = (n) => `${NUM.format(n)} %`;
const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* -------------------------------------------------------------------------- */
/*  Referencias                                                               */
/* -------------------------------------------------------------------------- */

const $ = (id) => document.getElementById(id);

const ui = {
  form: $('form'),
  price: $('price'),
  chips: Array.from(document.querySelectorAll('.chip')),
  region: $('region'),
  itp: $('itp'),
  itpField: $('itp-field'),
  mortgage: $('mortgage'),
  mortgageBlock: $('mortgage-block'),
  down: $('down'),
  downOut: $('down-out'),
  tin: $('tin'),
  tinOut: $('tin-out'),
  years: $('years'),
  yearsOut: $('years-out'),
  agency: $('agency'),
  reset: $('reset'),

  cash: $('cash'),
  cashRange: $('cash-range'),
  regionBadge: $('region-badge'),
  feesPct: $('fees-pct'),
  segDown: $('seg-down'),
  segTax: $('seg-tax'),
  segFees: $('seg-fees'),
  donutPct: $('donut-pct'),
  legDownLabel: $('leg-down-label'),
  legDown: $('leg-down'),
  legTax: $('leg-tax'),
  legFees: $('leg-fees'),
  monthlyCard: $('monthly-card'),
  monthly: $('monthly'),
  monthlyTerm: $('monthly-term'),
  monthlyLoan: $('monthly-loan'),
  monthlyInterest: $('monthly-interest'),
  monthlyTin: $('monthly-tin'),
  rows: $('rows'),
  disclaimer: $('disclaimer'),
  copy: $('copy'),
  share: $('share'),

  regions: $('regions'),
  compareLead: $('compare-lead'),

  themeToggle: $('theme-toggle'),
  header: $('site-header'),
  progress: $('progress-bar'),
  sticky: $('sticky'),
  stickyCash: $('sticky-cash'),
  toast: $('toast'),
  heroTotal: $('hero-total'),
  heroFees: $('hero-fees'),
  heroRange: $('hero-range'),
  calc: $('calculadora'),
};

/* -------------------------------------------------------------------------- */
/*  Cálculo (función pura: no toca el DOM)                                    */
/* -------------------------------------------------------------------------- */

function rango(centro, spread) {
  return { min: centro * (1 - spread), max: centro * (1 + spread) };
}

const sumar = (a, b) => ({ min: a.min + b.min, max: a.max + b.max });
const medio = (r) => (r.min + r.max) / 2;

function cuotaMensual(prestamo, tin, anos) {
  if (prestamo <= 0 || anos <= 0) return 0;
  const i = tin / 100 / 12;
  const n = Math.round(anos * 12);
  if (i === 0) return prestamo / n;
  return (prestamo * i) / (1 - Math.pow(1 + i, -n));
}

function calcular(d) {
  const precio = d.precio;

  const iva = precio * (IVA_OBRA_NUEVA / 100);
  const ajd = precio * (d.region.ajd / 100);
  const itp = precio * (d.itp / 100);
  const impuestos = d.obraNueva ? iva + ajd : itp;

  const notaria = rango(clamp(600 + precio * 0.0008, 650, 1800), 0.15);
  const registro = rango(clamp(380 + precio * 0.0005, 420, 1200), 0.15);
  const gestoria = { min: 350, max: 650 };
  const tasacion = d.hipoteca ? { min: 350, max: 550 } : { min: 0, max: 0 };
  const comision = { min: (precio * d.agencia) / 100, max: (precio * d.agencia) / 100 };

  const tramites = [notaria, registro, gestoria, tasacion, comision].reduce(sumar, {
    min: 0,
    max: 0,
  });
  const gastos = {
    min: impuestos + tramites.min,
    max: impuestos + tramites.max,
  };

  const entrada = precio * (d.entrada / 100);
  const aportacion = d.hipoteca ? entrada : precio;
  const prestamo = Math.max(0, precio - aportacion);
  const cuota = cuotaMensual(prestamo, d.tin, d.plazo);
  const intereses = Math.max(0, cuota * Math.round(d.plazo * 12) - prestamo);
  const efectivo = {
    min: aportacion + gastos.min,
    max: aportacion + gastos.max,
  };

  return {
    precio,
    iva,
    ajd,
    itp,
    impuestos,
    notaria,
    registro,
    gestoria,
    tasacion,
    comision,
    tramites,
    gastos,
    aportacion,
    prestamo,
    cuota,
    intereses,
    efectivo,
    costeTotal: { min: precio + gastos.min, max: precio + gastos.max },
  };
}

function rangoTexto(r) {
  if (!r.min && !r.max) return '—';
  const a = Math.round(r.min / 10) * 10;
  const b = Math.round(r.max / 10) * 10;
  return a === b ? euros(a) : `${euros(a)} – ${euros(b)}`;
}

function entreTexto(r) {
  const a = Math.round(r.min / 10) * 10;
  const b = Math.round(r.max / 10) * 10;
  return a === b ? euros(a) : `entre ${euros(a)} y ${euros(b)}`;
}

/* -------------------------------------------------------------------------- */
/*  Estado                                                                    */
/* -------------------------------------------------------------------------- */

function leerEstado() {
  const nombre = REGIONES[ui.region.value] ? ui.region.value : 'Madrid';
  const tipo = document.querySelector('input[name="type"]:checked');
  return {
    precio: precioDeTexto(ui.price.value),
    regionNombre: nombre,
    region: REGIONES[nombre],
    itp: clamp(Number(ui.itp.value) || 0, 0, 25),
    obraNueva: (tipo ? tipo.value : 'usada') === 'nueva',
    hipoteca: ui.mortgage.checked,
    entrada: clamp(Number(ui.down.value) || 0, 0, 100),
    agencia: clamp(Number(ui.agency.value) || 0, 0, 15),
    tin: clamp(Number(ui.tin.value) || 0, 0, 15),
    plazo: clamp(Number(ui.years.value) || 30, 1, 50),
  };
}

/* -------------------------------------------------------------------------- */
/*  Animación de cifras                                                       */
/* -------------------------------------------------------------------------- */

function animarNumero(nodo, destino, formato, duracion = 460) {
  const desde = Number(nodo.dataset.valor || 0);
  nodo.dataset.valor = String(destino);
  const previo = nodo._raf;
  if (previo) cancelAnimationFrame(previo);

  if (reducido || Math.abs(destino - desde) < 0.5) {
    nodo.textContent = formato(destino);
    return;
  }

  const inicio = performance.now();
  const paso = (t) => {
    const k = Math.min(1, (t - inicio) / duracion);
    const suave = 1 - Math.pow(1 - k, 3);
    nodo.textContent = formato(desde + (destino - desde) * suave);
    if (k < 1) nodo._raf = requestAnimationFrame(paso);
  };
  nodo._raf = requestAnimationFrame(paso);
}

/* -------------------------------------------------------------------------- */
/*  Render principal                                                          */
/* -------------------------------------------------------------------------- */

let ultimo = null;

function render() {
  const d = leerEstado();
  const r = calcular(d);
  ultimo = { d, r };

  ui.itpField.hidden = d.obraNueva;
  ui.mortgageBlock.hidden = !d.hipoteca;

  actualizarControles(d);

  const importeMedio = medio(r.efectivo);
  const gastosMedio = medio(r.gastos);
  const pctGastos = d.precio > 0 ? (gastosMedio / d.precio) * 100 : 0;

  if (d.precio <= 0) {
    animarNumero(ui.cash, 0, () => '—', 0);
    ui.cashRange.textContent = 'Escribe un precio para empezar.';
    ui.feesPct.textContent = '—';
    ui.rows.innerHTML = '';
    ui.donutPct.textContent = '—';
    ui.legDown.textContent = '—';
    ui.legTax.textContent = '—';
    ui.legFees.textContent = '—';
    ui.monthlyCard.hidden = true;
    pintarDonut(0, 0, 0);
    ui.stickyCash.textContent = '—';
    ui.disclaimer.textContent =
      'Estimación orientativa con aranceles medios. Comprueba el importe exacto con tu comunidad autónoma, tu notaría y tu banco.';
    renderComparativa(d, 0);
    return;
  }

  animarNumero(ui.cash, importeMedio, euros);
  ui.cashRange.textContent = entreTexto(r.efectivo);
  ui.feesPct.textContent = `${NUM.format(pctGastos)} % en gastos`;
  ui.regionBadge.textContent = `${d.regionNombre} · ${d.obraNueva ? 'obra nueva' : 'segunda mano'}`;

  ui.legDownLabel.textContent = d.hipoteca ? `Entrada (${d.entrada} %)` : 'Precio al contado';
  ui.legDown.textContent = euros(r.aportacion);
  ui.legTax.textContent = euros(r.impuestos);
  ui.legFees.textContent = euros(medio(r.tramites));
  ui.donutPct.textContent = `${NUM.format(pctGastos)} %`;
  pintarDonut(r.aportacion, r.impuestos, medio(r.tramites));

  if (d.hipoteca && r.prestamo > 0) {
    ui.monthlyCard.hidden = false;
    ui.monthly.textContent = euros(r.cuota);
    ui.monthlyTerm.textContent = `/ mes · ${d.plazo} años`;
    ui.monthlyLoan.textContent = euros(r.prestamo);
    ui.monthlyInterest.textContent = euros(r.intereses);
    ui.monthlyTin.textContent = pct(d.tin);
  } else {
    ui.monthlyCard.hidden = true;
  }

  ui.rows.innerHTML = filasDesglose(d, r);
  ui.stickyCash.textContent = euros(importeMedio);
  ui.disclaimer.textContent = `Los gastos suponen un ${NUM.format(pctGastos)} % del precio (${euros(gastosMedio)}). Estimación orientativa con aranceles medios: confirma el importe exacto con tu comunidad autónoma, tu notaría y tu banco.`;

  actualizarChips(d.precio);
  renderComparativa(d, d.precio);
  programarURL();
}

function actualizarControles(d) {
  ui.downOut.textContent = `${d.entrada} %`;
  ui.tinOut.textContent = pct(d.tin);
  ui.yearsOut.textContent = `${d.plazo} años`;
  for (const input of [ui.down, ui.tin, ui.years]) pintarRango(input);
}

function pintarRango(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const v = Number(input.value);
  input.style.setProperty('--fill', `${((v - min) / (max - min)) * 100}%`);
}

function filasDesglose(d, r) {
  const items = [];

  if (d.obraNueva) {
    items.push({ nombre: 'IVA', nota: 'obra nueva · 10 %', valor: { min: r.iva, max: r.iva }, tono: 'tax' });
    items.push({
      nombre: 'AJD',
      nota: `${pct(d.region.ajd)} · ${d.regionNombre}`,
      valor: { min: r.ajd, max: r.ajd },
      tono: 'tax',
    });
  } else {
    items.push({
      nombre: 'ITP',
      nota: `${pct(d.itp)} · ${d.regionNombre}`,
      valor: { min: r.itp, max: r.itp },
      tono: 'tax',
    });
  }

  items.push({ nombre: 'Notaría', nota: 'escritura pública', valor: r.notaria, tono: 'fees' });
  items.push({ nombre: 'Registro', nota: 'inscripción a tu nombre', valor: r.registro, tono: 'fees' });
  items.push({ nombre: 'Gestoría', nota: 'impuestos y papeles', valor: r.gestoria, tono: 'fees' });

  if (d.hipoteca) {
    items.push({ nombre: 'Tasación', nota: 'la exige el banco', valor: r.tasacion, tono: 'fees' });
  }
  if (d.agencia > 0) {
    items.push({
      nombre: 'Inmobiliaria',
      nota: pct(d.agencia),
      valor: r.comision,
      tono: 'main',
    });
  }

  const maximo = Math.max(...items.map((i) => medio(i.valor)), 1);

  return items
    .map((i) => {
      const ancho = Math.max(4, Math.round((medio(i.valor) / maximo) * 100));
      return `<div class="brow" data-tone="${i.tono}">
        <div class="brow-head">
          <span class="brow-name">${i.nombre}<i>${i.nota}</i></span>
          <span class="brow-amount">${rangoTexto(i.valor)}</span>
        </div>
        <div class="brow-track"><i style="width:${ancho}%"></i></div>
      </div>`;
    })
    .join('');
}

function pintarDonut(base, impuestos, tramites) {
  const total = base + impuestos + tramites;
  if (!total) {
    for (const seg of [ui.segDown, ui.segTax, ui.segFees]) {
      seg.style.strokeDasharray = '0 100';
      seg.style.strokeDashoffset = '0';
    }
    return;
  }

  let offset = 0;
  const partes = [
    [ui.segDown, (base / total) * 100],
    [ui.segTax, (impuestos / total) * 100],
    [ui.segFees, (tramites / total) * 100],
  ];
  for (const [nodo, valor] of partes) {
    nodo.style.strokeDasharray = `${valor.toFixed(2)} ${(100 - valor).toFixed(2)}`;
    nodo.style.strokeDashoffset = String(-offset);
    offset += valor;
  }
}

function actualizarChips(precio) {
  for (const chip of ui.chips) {
    chip.classList.toggle('is-active', Number(chip.dataset.price) === precio);
  }
}

/* -------------------------------------------------------------------------- */
/*  Comparativa por comunidad                                                 */
/* -------------------------------------------------------------------------- */

function renderComparativa(d, precioReferencia) {
  const precio = precioReferencia > 0 ? precioReferencia : PRECIO_EJEMPLO;
  const base = { ...d, precio };

  const lista = Object.entries(REGIONES).map(([nombre, region]) => {
    const r = calcular({ ...base, region, itp: region.itp });
    return {
      nombre,
      region,
      gastos: r.gastos,
      efectivo: r.efectivo,
      medio: medio(r.gastos),
    };
  });
  lista.sort((a, b) => a.medio - b.medio);

  const maximo = Math.max(...lista.map((i) => i.medio), 1);
  const barato = lista[0];
  const caro = lista[lista.length - 1];
  const diferencia = caro.medio - barato.medio;

  ui.regions.innerHTML = lista
    .map((i) => {
      const activa = i.nombre === d.regionNombre;
      const tipoTipo = d.obraNueva ? 'AJD' : 'ITP';
      const tipoValor = d.obraNueva ? i.region.ajd : i.region.itp;
      const ancho = Math.max(6, Math.round((i.medio / maximo) * 100));
      return `<button type="button" class="region-tile${activa ? ' is-active' : ''}"
          data-region="${i.nombre}" aria-pressed="${activa}"
          aria-label="${i.nombre}: ${tipoTipo} ${pct(tipoValor)}, ${euros(i.medio)} en gastos. Aplicar al simulador">
        <span class="region-name">${i.nombre}</span>
        <span class="region-tax">${tipoTipo} ${pct(tipoValor)}</span>
        <span class="region-amount">${euros(i.medio)}</span>
        <span class="region-sub">de gastos</span>
        <span class="region-bar"><i style="width:${ancho}%"></i></span>
      </button>`;
    })
    .join('');

  const tipoTexto = d.obraNueva ? 'obra nueva' : 'de segunda mano';
  ui.compareLead.innerHTML = `Para una vivienda ${tipoTexto} de <strong>${euros(precio)}</strong>, los gastos van de <strong>${euros(barato.medio)}</strong> en ${barato.nombre} a <strong>${euros(caro.medio)}</strong> en ${caro.nombre}: <strong>${euros(diferencia)}</strong> de diferencia por el mismo piso.`;
}

/* -------------------------------------------------------------------------- */
/*  URL compartible                                                           */
/* -------------------------------------------------------------------------- */

let urlTimer;
function programarURL() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(sincronizarURL, 400);
}

function sincronizarURL() {
  const d = leerEstado();
  const p = new URLSearchParams();
  const porDefecto =
    d.precio === PRECIO_EJEMPLO &&
    d.regionNombre === 'Madrid' &&
    !d.obraNueva &&
    d.itp === REGIONES.Madrid.itp &&
    d.entrada === 20 &&
    d.agencia === 0 &&
    d.tin === 3.1 &&
    d.plazo === 30 &&
    d.hipoteca;
  p.set('p', String(d.precio));
  p.set('cc', d.regionNombre);
  if (d.obraNueva) p.set('t', 'nueva');
  if (d.itp !== d.region.itp) p.set('i', String(d.itp));
  if (d.entrada !== 20) p.set('e', String(d.entrada));
  if (d.agencia) p.set('a', String(d.agencia));
  if (d.tin !== 3.1) p.set('tin', String(d.tin));
  if (d.plazo !== 30) p.set('y', String(d.plazo));
  if (!d.hipoteca) p.set('h', '0');
  const consulta = porDefecto ? '' : `?${p.toString()}`;
  try {
    history.replaceState(null, '', `${location.pathname}${consulta}${location.hash}`);
  } catch (e) {
    /* file:// u origen restringido: la app funciona igual */
  }
}

function leerURL() {
  const p = new URLSearchParams(location.search);
  if (!p.toString()) return;

  if (p.has('p')) {
    const precio = precioDeTexto(p.get('p'));
    ui.price.value = precio ? ENTERO.format(precio) : '';
  }

  const cc = p.get('cc');
  if (cc && REGIONES[cc]) {
    ui.region.value = cc;
    ui.itp.value = String(REGIONES[cc].itp);
  }
  if (p.get('i') !== null) ui.itp.value = String(clamp(Number(p.get('i')) || 0, 0, 25));
  if (p.get('t') === 'nueva') {
    const radio = document.querySelector('input[name="type"][value="nueva"]');
    if (radio) radio.checked = true;
  }
  if (p.get('e') !== null) ui.down.value = String(clamp(Number(p.get('e')) || 20, 5, 50));
  if (p.get('a') !== null) ui.agency.value = String(clamp(Number(p.get('a')) || 0, 0, 10));
  if (p.get('tin') !== null) ui.tin.value = String(clamp(Number(p.get('tin')) || 3.1, 1, 6));
  if (p.get('y') !== null) ui.years.value = String(clamp(Number(p.get('y')) || 30, 10, 40));
  if (p.get('h') === '0') ui.mortgage.checked = false;
}

/* -------------------------------------------------------------------------- */
/*  Resumen, copiar y compartir                                               */
/* -------------------------------------------------------------------------- */

function resumenTexto() {
  if (!ultimo) return '';
  const { d, r } = ultimo;
  const lineas = [
    `Cuentas Claras — ${euros(d.precio)} · ${d.regionNombre} · ${d.obraNueva ? 'obra nueva' : 'segunda mano'}`,
    '',
    `Necesitas el día de la firma: ${euros(medio(r.efectivo))} (${rangoTexto(r.efectivo)})`,
    d.hipoteca ? `Entrada (${d.entrada} %): ${euros(r.aportacion)}` : `Precio al contado: ${euros(r.aportacion)}`,
    d.obraNueva
      ? `IVA (10 %): ${euros(r.iva)} · AJD (${pct(d.region.ajd)}): ${euros(r.ajd)}`
      : `ITP (${pct(d.itp)}): ${euros(r.itp)}`,
    `Notaría: ${rangoTexto(r.notaria)}`,
    `Registro: ${rangoTexto(r.registro)}`,
    `Gestoría: ${rangoTexto(r.gestoria)}`,
  ];
  if (d.hipoteca) {
    lineas.push(`Tasación: ${rangoTexto(r.tasacion)}`);
    lineas.push(
      `Cuota estimada: ${euros(r.cuota)}/mes a ${d.plazo} años (${pct(d.tin)} TIN), préstamo de ${euros(r.prestamo)}`,
    );
  }
  if (d.agencia > 0) lineas.push(`Inmobiliaria (${pct(d.agencia)}): ${rangoTexto(r.comision)}`);
  lineas.push('', 'Estimación orientativa. Calculado en cuentasclaras.es');
  return lineas.join('\n');
}

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch (e) {
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (err) {
      return false;
    }
  }
}

function aviso(mensaje) {
  ui.toast.textContent = mensaje;
  ui.toast.classList.add('is-visible');
  clearTimeout(aviso.timer);
  aviso.timer = setTimeout(() => ui.toast.classList.remove('is-visible'), 2600);
}

/* -------------------------------------------------------------------------- */
/*  Interfaz                                                                  */
/* -------------------------------------------------------------------------- */

function initRegiones() {
  const nombres = Object.keys(REGIONES).sort((a, b) => a.localeCompare(b, 'es'));
  ui.region.replaceChildren(
    ...nombres.map((nombre) => {
      const opt = document.createElement('option');
      opt.value = nombre;
      opt.textContent = nombre;
      return opt;
    }),
  );
  ui.region.value = 'Madrid';
  ui.itp.value = String(REGIONES.Madrid.itp);
}

function initTema() {
  const actual = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  ui.themeToggle.setAttribute(
    'aria-label',
    actual === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
  );
  ui.themeToggle.addEventListener('click', () => {
    const siguiente = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = siguiente;
    document.documentElement.style.colorScheme = siguiente;
    ui.themeToggle.setAttribute(
      'aria-label',
      siguiente === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
    );
    try {
      localStorage.setItem('cc-theme', siguiente);
    } catch (e) {
      /* modo privado */
    }
  });
}

function initEventos() {
  ui.price.addEventListener('input', () => {
    // Mientras se escribe no se reescribe el valor (rompería la selección y el cursor).
    if (/[^\d.]/.test(ui.price.value)) {
      ui.price.value = ui.price.value.replace(/[^\d.]/g, '');
    }
    render();
  });
  ui.price.addEventListener('blur', () => {
    const valor = precioDeTexto(ui.price.value);
    ui.price.value = valor ? ENTERO.format(valor) : '';
    render();
  });
  ui.itp.addEventListener('input', render);
  ui.agency.addEventListener('input', render);

  for (const chip of ui.chips) {
    chip.addEventListener('click', () => {
      ui.price.value = ENTERO.format(Number(chip.dataset.price));
      render();
    });
  }

  for (const radio of document.querySelectorAll('input[name="type"]')) {
    radio.addEventListener('change', render);
  }

  ui.region.addEventListener('change', () => {
    const region = REGIONES[ui.region.value];
    if (region) ui.itp.value = String(region.itp);
    render();
  });

  ui.mortgage.addEventListener('change', render);

  for (const input of [ui.down, ui.tin, ui.years]) {
    input.addEventListener('input', () => {
      pintarRango(input);
      render();
    });
  }

  ui.form.addEventListener('reset', () => {
    setTimeout(() => {
      ui.region.value = 'Madrid';
      ui.itp.value = String(REGIONES.Madrid.itp);
      ui.mortgage.checked = true;
      ui.down.value = '20';
      ui.tin.value = '3.1';
      ui.years.value = '30';
      ui.agency.value = '0';
      ui.price.value = ENTERO.format(PRECIO_EJEMPLO);
      const usada = document.querySelector('input[name="type"][value="usada"]');
      if (usada) usada.checked = true;
      for (const input of [ui.price, ui.itp, ui.agency]) input.dispatchEvent(new Event('input'));
      render();
      aviso('Ejemplo restaurado');
    }, 0);
  });

  ui.regions.addEventListener('click', (evento) => {
    const tile = evento.target.closest('.region-tile');
    if (!tile) return;
    const nombre = tile.dataset.region;
    if (!REGIONES[nombre]) return;
    ui.region.value = nombre;
    ui.itp.value = String(REGIONES[nombre].itp);
    render();
    const activa = ui.regions.querySelector(`.region-tile[data-region="${nombre}"]`);
    if (activa) activa.focus({ preventScroll: true });
    aviso(`${nombre} aplicada al simulador`);
  });

  ui.copy.addEventListener('click', async () => {
    const ok = await copiar(resumenTexto());
    aviso(ok ? 'Resumen copiado al portapapeles' : 'No se pudo copiar el resumen');
  });

  ui.share.addEventListener('click', async () => {
    const datos = {
      title: 'Cuentas Claras — gastos de compra de vivienda',
      text: ultimo
        ? `Para una vivienda de ${euros(ultimo.d.precio)} en ${ultimo.d.regionNombre}, necesitas ${euros(medio(ultimo.r.efectivo))} el día de la firma.`
        : 'Calculadora de gastos de compra de vivienda en España.',
      url: location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(datos);
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    const ok = await copiar(location.href);
    aviso(ok ? 'Enlace copiado' : 'No se pudo copiar el enlace');
  });
}

function initScroll() {
  let pendiente = false;

  const alScroll = () => {
    pendiente = false;
    const y = window.scrollY || document.documentElement.scrollTop;

    ui.header.classList.toggle('is-scrolled', y > 8);

    const alto = document.documentElement.scrollHeight - window.innerHeight;
    ui.progress.style.width = `${alto > 0 ? Math.min(100, (y / alto) * 100) : 0}%`;

    if (ui.calc) {
      const inicioCalc = ui.calc.getBoundingClientRect().top + y;
      const visible = y > inicioCalc + 160;
      ui.sticky.classList.toggle('is-visible', visible);
    }
  };

  window.addEventListener(
    'scroll',
    () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(alScroll);
    },
    { passive: true },
  );
  alScroll();
}

function initRevelado() {
  const nodos = document.querySelectorAll('.reveal');
  if (reducido || !('IntersectionObserver' in window)) {
    nodos.forEach((n) => n.classList.add('is-visible'));
    return;
  }
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('is-visible');
          observador.unobserve(entrada.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );
  nodos.forEach((n) => observador.observe(n));
}

function initNav() {
  const enlaces = Array.from(document.querySelectorAll('.site-nav a'));
  const secciones = enlaces
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (!secciones.length || !('IntersectionObserver' in window)) return;

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        for (const a of enlaces) {
          a.classList.toggle('is-active', a.getAttribute('href') === `#${entrada.target.id}`);
        }
      }
    },
    { rootMargin: '-42% 0px -52% 0px' },
  );
  secciones.forEach((s) => observador.observe(s));
}

function initHero() {
  const d = {
    precio: PRECIO_EJEMPLO,
    regionNombre: 'Madrid',
    region: REGIONES.Madrid,
    itp: REGIONES.Madrid.itp,
    obraNueva: false,
    hipoteca: true,
    entrada: 20,
    agencia: 0,
    tin: 3.1,
    plazo: 30,
  };
  const r = calcular(d);

  if (ui.heroFees) ui.heroFees.textContent = rangoTexto(r.gastos);
  if (ui.heroRange) ui.heroRange.textContent = entreTexto(r.efectivo);
  if (ui.heroTotal) {
    const destino = medio(r.efectivo);
    const formato = (n) => ENTERO.format(Math.round(n / 10) * 10);
    ui.heroTotal.textContent = '0';
    if (reducido) {
      ui.heroTotal.textContent = formato(destino);
    } else {
      setTimeout(() => animarNumero(ui.heroTotal, destino, formato, 1100), 320);
    }
  }

  const hero = document.getElementById('hero');
  if (hero && !reducido) {
    let cuadro = 0;
    hero.addEventListener('pointermove', (e) => {
      if (cuadro) return;
      cuadro = requestAnimationFrame(() => {
        cuadro = 0;
        const caja = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', `${((e.clientX - caja.left) / caja.width) * 100}%`);
        hero.style.setProperty('--my', `${((e.clientY - caja.top) / caja.height) * 100}%`);
      });
    });
  }
}

function initMonetizacion() {
  const cfg = (window.CUENTAS_CLARAS || {}).support;
  if (!cfg || !cfg.url || !cfg.label) return;
  const seccion = $('apoyo');
  $('support-title').textContent = cfg.title || '¿Te ha sido útil?';
  $('support-text').textContent = cfg.text || '';
  const enlace = $('support-link');
  enlace.href = cfg.url;
  enlace.textContent = cfg.label;
  seccion.hidden = false;
}

/* -------------------------------------------------------------------------- */
/*  Arranque                                                                  */
/* -------------------------------------------------------------------------- */

initRegiones();
initTema();
leerURL();
ui.sticky.hidden = false;
initEventos();
initScroll();
initRevelado();
initNav();
initHero();
render();
initMonetizacion();
