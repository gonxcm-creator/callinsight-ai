# HANDOFF — Cuentas Claras Pro

**Fecha:** 22/11/2026
**Rama de trabajo:** `freebuff/e96254ba43006e208df9516c`
**Commit de la app:** `0ef9851` (`feat: Cuentas Claras Pro, calculadora hipotecaria con cuentas`)
**Estado:** funcional y desplegado en **preview**. Producción sin publicar.

---

## 1. Resumen

`cuentas-claras/` es una aplicación nueva dentro del repo `gonxcm-creator/callinsight-ai`:
una calculadora profesional de compra, hipoteca, alquiler e inversión de vivienda para
España. Sustituye la v1 publicada anteriormente.

Incluye:

- Front estático modular (sin framework) en `cuentas-claras/`.
- Worker de Cloudflare con login de Freebuff, API y D1 en `cuentas-claras/worker/`.
- Datos fiscales y de mercado de las 19 comunidades/ciudades autónomas.
- Tres idiomas: español, inglés y francés.
- Guardado local y guardado en nube por usuario.
- Tests del motor y de paridad de traducciones.

**Preview publicado (visible por enlace, no indexado):**
https://cuentas-claras-w1vc2h-preview.freebuff.site

**Producción:** `https://cuentas-claras-w1vc2h.freebuff.site` — **sin desplegar y sin publicar**.

---

## 2. Qué está terminado

### Producto y cálculo

- Motor financiero puro en `js/engine.js`: ITP por tramos marginales, IVA/IGIC, AJD,
  gastos de compra, reforma, hipoteca francesa fija/variable/mixta, TAE por bisección
  de flujos, cuota extra y aportación puntual, test de estrés, DTI, tabla de sensibilidad,
  cuadro de amortización, valoración de mercado, coste real de propiedad, alquilar vs
  comprar con cartera alternativa, rentabilidades y flujo de caja después de impuestos.
- Datos en `js/data.js`: 19 regímenes (Andalucía, Aragón, Asturias, Baleares, Canarias,
  Cantabria, Castilla y León, Castilla-La Mancha, Cataluña, Ceuta, Comunitat Valenciana,
  Extremadura, Galicia, La Rioja, Madrid, Melilla, Murcia, Navarra, País Vasco), con
  ITP por tramos, AJD, IVA/IGIC, benchmark €/m² de idealista, fecha, URL fiscal y de mercado.
  Euríbor 12M = 3,30 % (media provisional nov. 2026).
- Interfaz completa: panel de ficha, KPIs, pestañas Compra / Hipoteca / Alquilar o comprar /
  Inversión, donut de costes, gráfico de patrimonio, barras de amortización, tablas de datos,
  fuentes y método.
- Diseño editorial responsive (crema/verde/lime, Instrument Serif + Inter autoalojadas),
  tema claro/oscuro, impresión a PDF, copiar resumen.
- i18n ES/EN/FR con paridad de claves y de variables comprobada por test.
- Guardado local en `localStorage` (abrir, exportar JSON, borrar) y guardado en nube.
- Estado del análisis persistido en `localStorage` (`cc.state.v2`), idioma en `cc.locale`,
  tema en `cc.theme`.

### Backend, cuentas y seguridad

- Login con **Sign in with Freebuff** (`@freebuff/auth` 0.1.0), sin contraseñas nuevas
  ni secretos de sesión en el proyecto. Rutas: `/auth/freebuff/signin`,
  `/auth/freebuff/signout`, `/auth/freebuff/session`, callback registrado.
- D1 (`binding DB`) con tabla `reports` creada de forma perezosa. Filas aisladas por
  `user.sub`; nunca se acepta un `user_id` del cliente.
- API:
  - `GET /api/health` → comprueba binding y esquema D1.
  - `GET /api/reports` → 401 sin sesión; lista solo las del usuario.
  - `POST /api/reports` → valida origen, sesión, nombre, estado y tamaño; límite 20.
  - `DELETE /api/reports/:id` → origen + sesión + propiedad de la fila.
- CSRF: `isSameOriginRequest` en POST y DELETE. `SameSite=Lax` no se usa como única defensa.
- Cabeceras: CSP estricta (`script-src 'self'`, sin scripts inline), HSTS, nosniff,
  `Referrer-Policy: no-referrer`, `Permissions-Policy`, `X-Robots-Tag: noindex, nofollow`,
  CORP same-origin. `robots.txt` con `Disallow: /`.
- Sin cookies de analítica propias; la CSP bloquea el beacon de Cloudflare que la plataforma
  inyecta (por eso aparece un error de consola de `static.cloudflareinsights.com`: es
  intencional, no afecta a la app).
- Producción sin publicar; solo preview.

### Verificación realizada

- `node --test cuentas-claras/tests/`: **16/16 pasan** (10 de motor + 6 de i18n),
  re-ejecutado el 22/11/2026 con Node 26.13.1.
- `esbuild` del Worker: **pasa** (40,5 KB). Re-verificado el 22/11/2026 tras `npm ci`
  en `cuentas-claras/worker/` desde su `package-lock.json` (sin modificarlo).
- `node --check` de todos los módulos JS: pasa.
- HTTP en el dominio real:
  - `/` 200 y assets 200 con content-type correcto.
  - `/api/reports` 401 sin sesión.
  - `POST /api/reports` con `Origin` ajeno 403; mismo origen sin cookie 401.
  - `DELETE` con origen ajeno 403.
  - `/api/health` → `{"ok":true,"db":true}` 200 (D1 y esquema funcionan).
  - `/auth/freebuff/signin` 303 al proveedor correcto.
  - `/auth/freebuff/session` → `{"user":null}`.
  - `robots.txt` → `Disallow: /`; `sitemap.xml` 404.
- Navegador real (desktop 1440 px y móvil 390 px):
  - Sin overflow horizontal; header sticky correcto.
  - KPIs completos, comunidad completa, inputs legibles en claro/oscuro.
  - Cambio ES → EN → FR y vuelta a ES correcto (título, hero, región, tabs).
  - Pestañas y tablas renderizan; leyenda de amortización visible.
  - Guardado local: diálogo, guardado, apertura, recarga, exportación JSON y borrado
    verificados (ver «HECHO — Guardado local re-verificado»).
  - Preview publicado (`published: true`), producción `published: false`.

---

## 3. Qué está a medias / EN PROGRESO

### EN PROGRESO — Verificación E2E del login y del guardado en nube

**Qué falta exactamente:**

1. Abrir la preview en un navegador con una cuenta Freebuff real y completar
   `Entrar con Freebuff` → callback → sesión → vuelta a `/#cuenta`.
2. Guardar un análisis estando autenticado y comprobar que aparece en «En tu cuenta».
3. Recargar, abrir el análisis guardado, borrarlo y comprobar que desaparece.
4. Probar con una **segunda cuenta** que no ve los análisis de la primera.
5. Probar el cierre de sesión (`POST /auth/freebuff/signout`) y que la API vuelve a 401.

**Por qué no se cerró:** el navegador de este chat no tiene una sesión de Freebuff y no
se dispone de credenciales. El resto del flujo (redirección, callback registrado, SDK,
D1 y 401/403) sí está verificado.

**Riesgo:** si el callback fallara, el guardado en nube no funcionaría; el guardado local
sí funciona. No debilitar la validación de issuer/redirect para «hacerlo pasar».

### HECHO — Guardado local re-verificado tras el refactor (22/11/2026)

Re-verificado E2E contra la preview publicada, sin sesión, después del refactor de
`saveReport`:

- Abrir diálogo → nombre → guardar: contador `1`, 1 elemento en «En tu cuenta»,
  `cc.reports.v1` con 1 registro, toast «Análisis guardado.».
- La sección «En la nube» muestra solo «Entra para guardar en la nube»: **no se duplica**
  el análisis en local y nube.
- Recargar: el análisis sigue (contador 1, 1 elemento).
- Abrir el guardado: restaura `label` en el campo y en `cc.state.v2`, toast «Análisis cargado.».
- Exportar JSON: descarga `prueba-local-post-refactor.json` (antes no se había probado).
- Borrar (confirm aceptado): contador 0, lista vacía, `cc.reports.v1` vacío.
- Sin errores de página (`pageerror`) durante todo el recorrido.

Queda pendiente solo la mitad con sesión (que el guardado vaya a nube y no a local), que
depende del punto siguiente.

### EN PROGRESO — Build del repo raíz (`callinsight-ai`)

`npm run build` en la raíz **falla en este entorno** porque no hay `node_modules`
(`Cannot find module 'react'`, `vite`, etc.). No es un error de código de Cuentas Claras.
No se instaló nada porque el repo raíz **no tiene `package-lock.json`** y `npm install`
crearía uno, incumpliendo la instrucción de no tocar lockfiles.

**Qué falta:** en un entorno con dependencias instaladas, ejecutar `npm run build` en la
raíz. Cuentas Claras no depende del build raíz.

### EN PROGRESO — Limpieza de la v1

En `cuentas-claras/` siguen los archivos de la v1: `app.js`, `config.js`, `sitemap.xml`.
**No están referenciados** por la v2 (`index.html` usa `js/app.js` y `styles.css`; el
sitemap no se despliega). Se conservaron para no borrar trabajo. Pendiente decidir si se
eliminan o se mueven a `legacy/`.

### EN PROGRESO — Publicación en producción

Solo está publicado el preview. Falta la decisión explícita del propietario para desplegar
y publicar producción. No hacerlo sin autorización.

---

## 4. Decisiones tomadas y por qué

1. **Login con Freebuff en vez de email/contraseña.** Evita almacenar contraseñas y
   secretos, delega OIDC + PKCE en el proveedor y permite identificar por `sub`. Es más
   seguro que auth propia para este caso.
2. **D1 y no un servicio externo.** Ya está integrado en Sites, aísla por entorno y evita
   añadir otro proveedor. Cada fila se consulta por `user.sub`.
3. **Preview, no producción.** El usuario pidió privacidad. Se publicó solo preview con
   `noindex`, `X-Robots-Tag`, `robots.txt` y sin sitemap. Producción sigue apagada.
4. **Analizador de una vivienda concreta, no feed de anuncios.** No hay API/licencia de
   listings de idealista/Fotocasa. Se implementó una ficha editable (precio, m², zona,
   estado, reforma) contra benchmark de mercado. Un feed real requiere contrato/API.
5. **Español por defecto, no idioma del navegador.** El producto es para España; el
   navegador de pruebas entraba en inglés y rompía la primera impresión. El idioma se
   guarda al cambiarlo.
6. **Datos editables y con fecha.** ITP/AJD/IVA y benchmark son orientativos; la app
   muestra fuente, fecha y avisos. No se aplican reducciones autonómicas automáticamente.
7. **Sin framework en el front.** Mantiene el sitio pequeño, rápido y fácil de auditar;
   el motor y los datos son módulos puros y testeables.
8. **CSP estricta.** `script-src 'self'` bloquea el beacon de Cloudflare. Se prioriza
   privacidad/seguridad sobre la analítica inyectada por la plataforma.

---

## 5. Arquitectura y archivos clave

```
cuentas-claras/
  index.html          Shell, panel, pestañas, datos, cuenta
  styles.css          Diseño responsive, claro/oscuro, print
  js/data.js          Regiones, ITP/AJD/IVA, benchmark, fuentes, defaults
  js/engine.js        Motor puro (tests)
  js/i18n.js          ES/EN/FR (tests de paridad)
  js/format.js        Moneda/porcentaje/número localizados
  js/charts.js        Donut, línea de patrimonio, barras de amortización
  js/app.js           Estado, binding, render, cuenta, guardados
  js/theme-init.js    Tema antes del primer pintado
  tests/              16 tests (motor + i18n)
  worker/index.js     Auth, API, D1, cabeceras
  worker/package.json @freebuff/auth + esbuild
  worker/package-lock.json
  deploy.json         Manifiesto de Sites
  dist/               Build ignorado por git (se regenera)
```

**IDs de Sites:**

- Site: `f4adb87a-551f-421d-8732-c3ad92df5868`
- Preview env: `d8f09f4d-a2e9-4a7a-8f0f-a2cbb9a42863`
- Producción env: `bd1d4bf7-a109-4113-b65a-360493b304b6` (sin publicar)
- D1 `DB` resource: `a1055173-d973-4d2c-aab4-add889c494e0`
- Auth client público: `eec7e771-3108-4734-916c-aba54521266d`

---

## 6. Instalar, probar, construir, arrancar

Requisitos: Node 20+ (probado con Node del entorno) y Python 3 para el servidor estático.

### Tests

```bash
cd cuentas-claras
node --test tests/
```

### Dependencias del Worker (solo si faltan)

```bash
cd cuentas-claras/worker
npm ci
```

### Build del sitio + Worker

```bash
cd cuentas-claras
rm -rf dist
mkdir -p dist/public
cp index.html styles.css robots.txt dist/public/
cp -r js fonts dist/public/
cp favicon.svg dist/public/
cd worker
npx esbuild index.js --bundle --format=esm --platform=browser \
  --target=es2022 --minify --outfile=../dist/worker.js
```

El manifiesto `deploy.json` apunta a `./dist/worker.js` y `./dist/public`.
`dist/` y `node_modules/` están ignorados por git; hay que regenerarlos tras clonar.

### Preview local solo del front

```bash
cd cuentas-claras
python3 -m http.server 3000
# http://localhost:3000
```

Sin Worker no funcionan `/api/*` ni `/auth/freebuff/*`; el cálculo y el guardado local sí.

### Despliegue

Usar Sites con `cuentas-claras/deploy.json` en el entorno **preview**. Producción no está
autorizada todavía. Tras desplegar, comprobar `published` con la inspección de Sites.
No hace falta `convex` ni `wrangler login` en este proyecto.

---

## 7. Limitaciones conocidas

- **El preview es público por enlace.** No tiene contraseña de sitio; el login protege
  los datos guardados, no la calculadora. Si se quiere cerrar todo el sitio, hay que
  añadir una comprobación de sesión en el Worker para `/` y assets (no implementado).
- **No hay feed de inmuebles reales.** El análisis es de la vivienda que introduce el
  usuario; el benchmark es de idealista. Un feed requiere API/licencia.
- **ITP/AJD orientativos.** No aplica reducciones por edad, vivienda habitual, familia
  numerosa o discapacidad; hay que confirmar en la agencia autonómica.
- **Hipoteca variable/mixta sin revisiones anuales.** La cuota mostrada es la inicial;
  el modelo no simula el Euríbor futuro.
- **Fiscalidad del alquiler simplificada.** Tipo fijo sobre NOI menos intereses; no
  modela gastos deducibles personales ni bonificaciones.
- **Login/callback y guardado en nube sin verificación E2E** por falta de sesión Freebuff:
  el navegador del chat redirige a `freebuff.com/login`, así que el flujo se corta en el
  proveedor. Hace falta una cuenta real; no debilitar issuer/redirect para probarlo.
  Sí está verificado el 303 al `authorize` correcto (PKCE S256, `state`, `nonce`,
  `redirect_uri` exacta), el 401 de `/api/reports` sin sesión y el 403 de origen ajeno.
- **Build raíz no verificable** sin instalar dependencias (y sin lockfile raíz).
- **Cloudflare beacon bloqueado por CSP**: error de consola esperado, sin efecto funcional.
- **Archivos v1** (`app.js`, `config.js`, `sitemap.xml`) siguen en la carpeta, sin uso.
- **`artifacts/`** (24 MB de capturas) queda sin commitear a propósito; son artefactos de
  verificación, no producto.

---

## 8. Siguiente paso concreto

1. Abrir https://cuentas-claras-w1vc2h-preview.freebuff.site en un navegador con una cuenta
   Freebuff y completar el login.
2. Guardar un análisis, recargar, abrirlo, exportarlo y borrarlo. Verificar que el contador
   y la lista de nube se actualizan.
3. Repetir con una segunda cuenta: no debe ver el análisis de la primera.
4. Si todo pasa, decidir con el propietario:
   - ¿Cerrar toda la web tras login o dejar la calculadora pública?
   - ¿Publicar producción?
5. Solo si hay API/licencia de listings, añadir un buscador de viviendas concretas.
6. Limpiar la v1 (`app.js`, `config.js`, `sitemap.xml`) o moverla a `legacy/`.

## 9. Actualización v3 — Zonas, presupuesto y viviendas (22/11/2026)

Se añade lo que faltaba para que un presupuesto sirva de algo: **a dónde ir con él**.

- **Presupuesto máximo** (`maxPrice` en `js/engine.js`): con ingresos y ahorros calcula el
  precio alcanzable. Dos topes: la cuota al 35 % de los ingresos netos (menos otras deudas)
  y el ahorro, que debe cubrir entrada + impuestos + gastos + reforma + muebles. Reutiliza
  `buyCosts`, el mismo cálculo de gastos que `computeState`, para que presupuesto y desglose
  nunca discrepen.
- **Nuevo campo `savings`** en `DEFAULT_STATE` (120.000 € por defecto, coherente con el
  análisis de 420.000 € al 20 % de entrada) e input «Ahorros disponibles» en Supuestos. El
  worker lo sanea solo: `sanitizeState` recorre `DEFAULT_STATE`.
- **73 zonas** en `ZONES` (3–7 por comunidad; barrios y ciudades reales) con enlaces a la
  búsqueda real de **Fotocasa** y **pisos.com** de esa zona. **146/146 enlaces comprobados
  con HTTP 200**. Los slugs se obtuvieron de las páginas de cada municipio; idealista
  responde 403 a IPs de datacenter, por eso no se enlaza ahí a nivel de barrio.
- **€/m² por zona con dato real**: `js/zone-prices.js` guarda el precio medio de venta que
  **Fotocasa publica en la página de cada zona** («En noviembre de 2026, el precio medio de
  venta en Carabanchel, Madrid es de 3706,79 €/m²»), con su mes y su lugar exactos.
  **73/73 zonas con dato** (rango 1.271–10.882 €/m²). Se regenera con
  `node scripts/zone-prices.mjs`. El campo `index` queda solo como respaldo si faltara el
  dato: la tarjeta muestra «Fotocasa nov 2026» y la nota ya no atribuye a idealista nada
  que no sea suyo (idealista sigue siendo la fuente del €/m² autonómico).
- **Interfaz nueva `#zonas`**: tarjeta de presupuesto con los dos límites en barras,
  contador «N de M zonas entran», orden «más baratas / mejor encaje», y tarjetas de zona
  con €/m² estimado, precio para tus m², cuota, m² que te caben, badge Entra/Justo/Fuera,
  botón «Analizar esta zona» (fija `marketRef` y el nombre, recalcula y vuelve a la
  calculadora) y enlaces a los dos portales. Checklist «Antes de firmar».
- **Fuentes**: +5 (Fotocasa, pisos.com, INE/IPV, Colegio de Registradores, Notariado); 9 en total.
- **Dinamismo**: reveal al hacer scroll, contador animado en los KPIs, transición de
  pestañas, hover en tarjetas y glow suave en el hero. Todo respeta `prefers-reduced-motion`.
- **Verificado**: 23/23 tests (3 de `maxPrice` + 4 de datos de zonas), esbuild del Worker
  OK (52,8 KB), sin overflow horizontal a 390 px ni 1280 px, ES/EN/FR comprobados, claro y
  oscuro revisados por captura, y la URL publicada comprobada tras el despliegue
  (`/` 200, `/js/zone-prices.js` 200, `/api/health` `{ok:true,db:true}`, `/api/reports` 401).
- **Limitación honesta**: no se incrustan anuncios (los portales no dan API ni licencia de
  redistribución); cada zona abre su búsqueda real para ver casas en venta hoy. El €/m² es
  el precio medio publicado por Fotocasa para la zona, no el precio de un anuncio concreto.
- **Desplegado en preview** el 22/11/2026 a las 01:09 (sustituye la versión del chat
  «Explicación De Qué Puedo Hacer», autorizado por el propietario). Producción sigue sin
  desplegar y sin publicar.

## Refinamiento v4 (22/11/2026)

- **Referencia de mercado con fuente real**: al pulsar «Analizar esta zona» la pista del
  precio y el pie del KPI dicen ya «Fotocasa nov 2026 · Carabanchel, Madrid» en vez de
  atribuirlo a idealista. `marketReference()` en `app.js` decide la fuente: `region`
  (idealista, media autonómica), `zone` (Fotocasa, cuando el €/m² coincide con una zona de la
  comunidad) o `manual` (dato escrito a mano). Claves nuevas en ES/EN/FR:
  `property.marketHintZone|Manual` y `kpi.marketFootZone|Manual`.
- **Diagnóstico automático** (`#diag-card`): cuota sobre ingresos (DTI), efectivo del día uno
  frente a ahorros, precio frente a la referencia, zona aplicada y encaje en el presupuesto,
  con veredicto «Va bien / Justo / Ajustado» y color por punto.
- **Comparador fija · variable · mixta** (`#compare-table`, pestaña Hipoteca): cuota, cuota con
  +2 puntos, TAE e intereses totales con la misma entrada y plazo; la mixta muestra la cuota
  del tramo fijo y la de después (`1.453 € → 1.631 €`) y se resalta la de menos intereses.
- **Cinta de datos en el hero** (`#hero-data`): Euríbor 12M, media de la comunidad y número de
  zonas con precio publicado.
- **Barra de resumen fija** (`#summary-bar`): efectivo, cuota y presupuesto máximo cuando la
  calculadora sale de pantalla; `aria-hidden` al ocultarse y fuera de la impresión.
- **Formato**: importes y €/m² agrupan miles siempre (`1.453 €`, `5.065 €/m²`).
- **Verificado** en la preview publicada: 23/23 tests, ES/EN revisados, sin overflow a 390 px
  ni 1280 px, sin errores de consola salvo el beacon de Cloudflare bloqueado por CSP, y la
  pista nombrando Fotocasa tras aplicar una zona.

**Prompt sugerido para el chat nuevo:**

> Continúa Cuentas Claras Pro en `cuentas-claras/`. Lee `HANDOFF.md` y el commit `0ef9851`.
> La preview está en https://cuentas-claras-w1vc2h-preview.freebuff.site (publicada) y
> producción sigue sin publicar. Falta verificar el login/callback de Freebuff y el guardado
> en nube con una cuenta real y con una segunda cuenta (aislamiento por `sub`), y decidir si
> se cierra toda la web tras login. No toques lockfiles ni publiques producción sin permiso.
