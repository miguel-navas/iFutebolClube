// Gera public/data/countries-50m.geojson a partir do Natural Earth 50m (world-atlas).
// world-atlas e topojson-client só são necessários para rodar este script
// (instale com --no-save; não são dependências do site).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { feature } = require('topojson-client');
const topology = require('world-atlas/countries-50m.json');

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../public/data/countries-50m.geojson');

const round = (n) => Math.round(n * 100) / 100; // ~1 km, suficiente para o mapa (zoom máximo 8)
const roundCoords = (c) => (typeof c[0] === 'number' ? c.map(round) : c.map(roundCoords));

// Anéis que cruzam o antimeridiano (Rússia, Fiji, Antártida) desenhariam linhas retas
// atravessando o mapa: descartamos fios degenerados e dividimos o resto em ±180°.
function clip(ring, keep, cross) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (keep(a)) out.push(a);
    if (keep(a) !== keep(b)) out.push(cross(a, b));
  }
  return out;
}
const atX = (x) => (a, b) => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];

function splitRing(ring) {
  const xs = ring.map((c) => c[0]);
  const ys = ring.map((c) => c[1]);
  if (Math.max(...xs) - Math.min(...xs) > 300 && Math.max(...ys) - Math.min(...ys) < 2) return [];
  if (!ring.some((c, i) => i > 0 && Math.abs(c[0] - ring[i - 1][0]) > 180)) return [ring];

  const flat = [ring[0].slice()];
  let shift = 0;
  for (let i = 1; i < ring.length; i++) {
    const dx = ring[i][0] - ring[i - 1][0];
    if (dx > 180) shift -= 360;
    else if (dx < -180) shift += 360;
    flat.push([ring[i][0] + shift, ring[i][1]]);
  }
  const parts = [
    clip(clip(flat, (c) => c[0] <= 180, atX(180)), (c) => c[0] >= -180, atX(-180)),
    clip(flat, (c) => c[0] > 180 - 1e-9, atX(180)).map(([x, y]) => [x - 360, y]),
    clip(flat, (c) => c[0] < -180 + 1e-9, atX(-180)).map(([x, y]) => [x + 360, y]),
  ];
  return parts.filter((r) => r.length >= 4 && r.some((c) => c[0] !== r[0][0]));
}

function fixGeometry(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const fixed = [];
  for (const rings of polygons) {
    const [outer, ...holes] = rings;
    for (const piece of splitRing(outer)) fixed.push([[...piece, piece[0]], ...(piece === outer ? holes : [])]);
  }
  return { type: 'MultiPolygon', coordinates: fixed };
}

const countries = feature(topology, topology.objects.countries);
const collection = {
  type: 'FeatureCollection',
  features: countries.features.map((f) => ({
    type: 'Feature',
    properties: { name: f.properties?.name ?? '' },
    geometry: (({ coordinates, ...rest }) => ({ ...rest, coordinates: roundCoords(coordinates) }))(fixGeometry(f.geometry)),
  })),
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(collection));
console.log(`${collection.features.length} países gravados em ${out}`);
