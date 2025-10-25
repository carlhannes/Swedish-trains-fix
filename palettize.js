#!/usr/bin/env node

import fs from 'node:fs';
import fsp, { glob } from 'node:fs/promises';
import path from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { PNG } from 'pngjs';
import extract from 'png-chunks-extract';
import encode from 'png-chunks-encode';
import pako from 'pako';

// --- PNG helpers ---

function readPalette(file) {
  const buf = fs.readFileSync(file);
  const chunks = extract(buf);
  const plte = chunks.find(c => c.name === 'PLTE');
  if (!plte) throw new Error('Donor has no PLTE');
  if (plte.data.length !== 256 * 3) {
    throw new Error(`Donor PLTE length=${plte.data.length}, expected 768`);
  }
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
  const png = PNG.sync.read(raw); // RGBA
  return { width: png.width, height: png.height, data: png.data };
}

function pack32(r, g, b, a) {
  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

function reindex(target, paletteRGBA) {
  const lut = new Map();
  for (let i = 0; i < 256; i++) {
    const k = pack32(
      paletteRGBA[i*4],
      paletteRGBA[i*4+1],
      paletteRGBA[i*4+2],
      paletteRGBA[i*4+3]
    );
    lut.set(k, i);
  }
  const { width, height, data } = target;
  const out = new Uint8Array(width * height);
  for (let p = 0, q = 0; p < data.length; p += 4, q++) {
    const k = pack32(data[p], data[p+1], data[p+2], data[p+3]);
    const idx = lut.get(k);
    if (idx === undefined) {
      const x = q % width, y = (q / width) | 0;
      throw new Error(
        `Pixel not in donor palette at (${x},${y}) rgba=${data[p]},${data[p+1]},${data[p+2]},${data[p+3]}`
      );
    }
    out[q] = idx;
  }
  return out;
}

function writeIndexedPNG(outPath, width, height, plte, trns, indexData) {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 3; // indexed
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

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

// --- CLI ---

const argv = await yargs(hideBin(process.argv))
  .scriptName('palettize')
  .usage('Usage:\n  $0 -p palette.png -i "src-img/**/*.png" -o gfx/\n  $0 -p palette.png -i in.png -o out.png')
  .option('palette', { alias: 'p', type: 'string', demandOption: true, describe: 'PNG with 256-entry PLTE' })
  .option('in',      { alias: 'i', type: 'array',  demandOption: true, describe: 'Input file(s) or glob(s); quote patterns' })
  .option('out',     { alias: 'o', type: 'string', demandOption: true, describe: 'Output dir/ or single file path' })
  .help()
  .strict()
  .parseAsync();

// Resolve inputs with Node 22 native glob (async iterator → array)
const patterns = /** @type {string[]} */ (argv.in).map(String);

// Collect results from the async iterator(s)
const matchedArrays = await Promise.all(patterns.map(p => Array.fromAsync(glob(p))));
const matched = [...new Set(matchedArrays.flat())];

const files = [];
for (const m of matched) {
  try {
    if ((await fsp.stat(m)).isFile()) files.push(m);
  } catch {}
}
if (files.length === 0) {
  console.error('No input files matched.');
  process.exit(3);
}

const palettePath = String(argv.palette);
const outArg = String(argv.out);

const outStat = fs.existsSync(outArg) ? fs.statSync(outArg) : null;
const outIsDir = outArg.endsWith(path.sep) || (outStat && outStat.isDirectory());
if (!outIsDir && files.length > 1) {
  console.error('When multiple inputs are given, -o/--out must be a directory (e.g. "gfx/").');
  process.exit(4);
}
if (outIsDir && !outStat) await fsp.mkdir(outArg, { recursive: true });

// Read palette once
const donor = readPalette(palettePath);

// Exclude the palette file itself if it accidentally matches
const inputs = files.filter(f => path.resolve(f) !== path.resolve(palettePath) && f.toLowerCase().endsWith('.png'));

let ok = 0, fail = 0;
for (const f of inputs) {
  try {
    const target = decodeRGBA(f);
    const indices = reindex(target, donor.rgba);
    const outPath = outIsDir ? path.join(outArg, path.basename(f)) : outArg;
    writeIndexedPNG(outPath, target.width, target.height, donor.plte, donor.trns, indices);
    console.log('Wrote', outIsDir ? path.relative('.', outPath) : outPath);
    ok++;
  } catch (e) {
    console.error(`ERROR ${f}: ${e.message}`);
    fail++;
  }
}

console.log(`Done. ${ok} ok, ${fail} failed.`);

process.exit(fail ? 1 : 0);
