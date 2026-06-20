// Generates the project's favicon / app-icon set from the brand house mark using
// @resvg/resvg-js. Outputs are committed to public/ so they are served as plain
// static assets (no runtime cost).
//
// Usage: node scripts/generate-favicons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');

const BRAND = '#2679a3';

function houseMarkSvg({ maskable = false } = {}) {
  const id = maskable ? 'door-m' : 'door';
  const inset = maskable ? 3.5 : 0;
  const scale = maskable ? 0.78 : 1;
  const transform = maskable ? ` transform="translate(${inset},${inset}) scale(${scale})"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <defs>
    <linearGradient id="${id}-grad" x1="13" y1="20" x2="13" y2="27" gradientUnits="userSpaceOnUse">
      <stop stop-color="#dd4477"/>
      <stop offset="100%" stop-color="#c42d63"/>
    </linearGradient>
  </defs>
  <g${transform}>
    <path d="M7 27.2V16H3.5L16 4.5 28.5 16H25v11.2q0 .8-.8.8H7.8q-.8 0-.8-.8Z" fill="${BRAND}"/>
    <rect x="13" y="20" width="6" height="7.5" rx="1" fill="url(#${id}-grad)"/>
  </g>
</svg>`;
}

function renderPng(svg, size) {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  })
    .render()
    .asPng();
}

function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const e = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, e + 0);
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1);
    dir.writeUInt8(0, e + 2);
    dir.writeUInt8(0, e + 3);
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });

  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

const standard = houseMarkSvg();
const maskable = houseMarkSvg({ maskable: true });

const icoSizes = [16, 32, 48];
const icoPngs = icoSizes.map((size) => ({ size, data: renderPng(standard, size) }));
for (const { size, data } of icoPngs) {
  fs.writeFileSync(path.join(publicDir, `favicon-${size}x${size}.png`), data);
}
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buildIco(icoPngs));

fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderPng(maskable, 180));
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), renderPng(maskable, 192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), renderPng(maskable, 512));

console.log('Generated favicon set in public/:');
for (const f of [
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon-48x48.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
]) {
  const { size } = fs.statSync(path.join(publicDir, f));
  console.log(`  ${f} (${size} bytes)`);
}
