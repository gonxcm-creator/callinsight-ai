# CallInsight AI

Pegas la transcripción de una llamada inmobiliaria y obtienes ficha del lead, score 0–100, objeciones, competencia y 3 textos listos (email / siguiente llamada / WhatsApp).

**URL prevista:** https://gonxcm-creator.github.io/callinsight-ai/

## Qué hace / qué NO hace

- Sí: analiza texto que tú pegas (motor local; Groq opcional).
- Sí: guarda historial solo en IndexedDB de tu navegador.
- No: no grabamos llamadas, no conectamos el teléfono, no hay login ni pagos.
- No: la clave Groq nunca va al repo (solo `localStorage`).

## Stack

Vite + React + TypeScript, hash router, base `/callinsight-ai/`, PWA, GitHub Pages.

## Local

```bash
npm install
npm run dev
npm run build
```

## Licencia

MIT
