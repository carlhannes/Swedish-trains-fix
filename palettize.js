// palettize.js
import fs from 'node:fs';
import { PNG } from 'pngjs';
import extract from 'png-chunks-extract';
import encode from 'png-chunks-encode';
import pako from 'pako';

function readPalette(file) {
  const buf = fs.readFileSync(file);
  const chunks = extract(buf);
  const plte = chunks.find(c => c.name === 'PLTE');
  if (!plte) throw new Error('Donor has no PLTE');
  if (plte.data.length !== 256 * 3) throw new Error(`Donor PLTE length=${plte.data.length}, expected 768`);
  const trns = chunks.find(c => c.name === 'tRNS');
  const rgba = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    rgba[i*4+0] = plte.data[i*3+0];
    rgba[i*4+1] = plte.data[i*3+1];
    rgba[i*4+2] = plte.data[i*3+2];
    rgba[i*4+3] = trns && i < trns.data.length ? trns.data[i] : 255;
  }
  return { rgba, plte: plte.data, trns: trns?.data ?? null };
}

function decodeRGBA(file) {
  const raw = fs.readFileSync(file);
  const png = PNG.sync.read(raw); // always RGBA
  return { width: png.width, height: png.height, data: png.data };
}

function pack32(r,g,b,a){ return ((r<<24)|(g<<16)|(b<<8)|a)>>>0; }

function reindex(target, paletteRGBA) {
  const lut = new Map();
  for (let i = 0; i < 256; i++) {
    const k = pack32(paletteRGBA[i*4], paletteRGBA[i*4+1], paletteRGBA[i*4+2], paletteRGBA[i*4+3]);
    lut.set(k, i);
  }
  const { width, height, data } = target;
  const out = new Uint8Array(width * height);
  for (let p = 0, q = 0; p < data.length; p += 4, q++) {
    const k = pack32(data[p], data[p+1], data[p+2], data[p+3]);
    const idx = lut.get(k);
    if (idx === undefined) throw new Error(`Pixel at ${q} not in donor palette: ${data[p]},${data[p+1]},${data[p+2]},${data[p+3]}`);
    out[q] = idx;
  }
  return out;
}

function writeIndexedPNG(outPath, width, height, plte, trns, indexData) {
  // Build IHDR
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 3;  // color type: indexed
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Build IDAT: filter 0 per row
  const stride = width;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y*(stride+1)] = 0; // filter type 0
    raw.set(indexData.subarray(y*stride, y*stride+stride), y*(stride+1)+1);
  }
  const deflated = pako.deflate(raw);
  const chunks = [
    { name: 'IHDR', data: ihdr },
    { name: 'PLTE', data: plte },
    ...(trns ? [{ name: 'tRNS', data: trns }] : []),
    { name: 'IDAT', data: deflated },
    { name: 'IEND', data: new Uint8Array(0) },
  ];
  const png = Buffer.from(encode(chunks));
  fs.writeFileSync(outPath, png);
}

if (process.argv.length < 5) {
  console.error('Usage: node palettize.js <palette.png> <input.png> <out.png>');
  process.exit(2);
}

const [ , , palPath, inPath, outPath ] = process.argv;
const donor = readPalette(palPath);
const target = decodeRGBA(inPath);
const indices = reindex(target, donor.rgba);
writeIndexedPNG(outPath, target.width, target.height, donor.plte, donor.trns, indices);
console.log('Wrote', outPath);