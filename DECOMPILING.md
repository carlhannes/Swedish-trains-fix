# DECOMPILING.md — Decode NewGRFs to Sprites + Coordinates

This guide shows how to decode a `.grf` into sprite atlases and an index (`.nfo`), read exact coordinates/offsets, tweak art, and re‑encode. It also covers in‑game debugging helpers and pointers to detailed specs.

## What You Get When You Decode
- A PNG sprite sheet and an accompanying NFO text file:
  - Output path convention (default): `sprites/NAME.png` and `sprites/NAME.nfo` after `grfcodec -d NAME.grf`. The tool creates the `sprites/` subdirectory if missing. 
- The `.nfo` contains “real sprite” lines that give the exact rectangle in the sheet and the draw offsets. See RealSprites info v32 format below. 

## Install the Tools
- `grfcodec` (with `grfdiff`, `grfmerge`, often shipped with `nforenum`). It decodes `.grf` to `.png` + `.nfo` and encodes the reverse. Packages exist on Linux; Windows binaries are available. 
- Optional helpers:
  - Grf2Html — produces a browsable HTML view of a GRF’s NFO actions; handy for studying logic. 
  - NFORenum — NFO linter (often bundled with grfcodec). 

## Quick Start

```bash
# 1) Decode → writes sprites/NAME.png and sprites/NAME.nfo
grfcodec -d NAME.grf

# If colours look wrong, choose palette (-p). For classic Windows palette use -p 2
grfcodec -d NAME.grf -p 2

# Very large atlases? Split while decoding (values are examples)
grfcodec -d NAME.grf -w 800 -h 600
```
- `-p` sets the palette (e.g., DOS=1, Windows=2). Use only if the automatic choice looks wrong. 
- `-w`/`-h` control atlas size/splitting; defaults: width 800, unlimited height. 

Re‑encode after editing:
```bash
# 2) Encode back to GRF from sprites/NAME.nfo + sprites/NAME.png
grfcodec -e NAME.grf
```
- `grfdiff` / `grfmerge` can produce/apply compact patch files (`.grd`) if you want to ship only the delta. 

## Reading Coordinates From .NFO (RealSprites)
RealSprites describe where each sprite lives in the atlas and how it is anchored in-game. Info v32 syntax (8bpp example):
```
<Sprite#> <file> 8bpp <x> <y> <w> <h> <xrel> <yrel> normal <flags>
```
- `<x>,<y>`: top‑left in the PNG.
- `<w>,<h>`: width/height in pixels.
- `<xrel>,<yrel>`: draw offset relative to the in‑game anchor (often negative). Tweak these to fix alignment.
- `<flags>`: e.g., `chunked`, `nocrop`. See spec for full list and zoom/32bpp variants.

Older info v7 (still seen in legacy decodes) looks like:
```
<Sprite#> <file> <x> <y> <compression> <h> <w> <xrel> <yrel>
```
Same meanings, different order.

## Understanding the Atlas
- The PNG is a simple sprite sheet; each real‑sprite NFO line points to a rectangle `<x,y,w,h>`. There’s no hidden packing metadata beyond those coordinates.

## In‑Game Debugging (OpenTTD)
- Enable dev tools in the console, then use helpers from the Info toolbar:
```text
set newgrf_developer_tools 1
```
- Sprite alignment tool: interactively nudge offsets to sanity‑check alignment.
  - Known quirk: the aligner’s reported offsets are 4× the NML/NFO values — divide by 4 when transcribing.
- Bounding box viewer: `Ctrl+B` shows draw boxes. 
- Quick iteration during testing: 
```text
reload_newgrfs
```
This reloads the GRFs used by the current game.

## About Logic vs. Graphics
- Decoding yields NFO (low‑level metadata) plus sprites, not NML source. To study logic (Action 0/1/2/3, callbacks), read the NFO or render it with Grf2Html.

## Typical Patch Workflow
1) Decode the target GRF: `grfcodec -d target.grf`  (use `-p 2` if needed).
2) Edit sprites in the generated PNG(s). Keep the correct TTD palette applied for 8bpp graphics.
3) If you add/trim transparent margins, adjust `<xrel>,<yrel>` in the NFO real‑sprite lines (see RealSprites).
4) Re‑encode: `grfcodec -e target.grf`, test in OpenTTD. Use `reload_newgrfs` to re‑init quickly.
5) To distribute only changes, use `grfdiff`/`grfmerge` to build/apply a `.grd` patch.

## Extra Notes
- PNG vs PCX: modern grfcodec decodes to PNG by default; older docs and tools reference PCX. The workflow is otherwise identical.
- Palette handling: if colours are off, force palette with `-p` (Windows=2, DOS=1). For art tooling, ensure the image is truly indexed to the correct TTD palette.
- NML sprite flags: when coding in NML, flags like `WHITE`/`NOWHITE`, `ANIM`/`NOANIM` control warnings for pure‑white or animated palette pixels and can help catch bad crop/slice coordinates.

## References
- grfcodec manpages (decode/encode, sprites folder, -w/-h/-p):
  - https://manpages.debian.org/unstable/grfcodec/grfcodec.1.en.html
  - https://manpages.ubuntu.com/manpages/jammy/man1/grfcodec.1.html
- RealSprites spec (info v7/v32 formats, fields):
  - https://newgrf-specs.tt-wiki.net/wiki/RealSprites
- NML spriteset / realsprites docs (flags and usage):
  - https://newgrf-specs.tt-wiki.net/wiki/NML:Realsprites
  - https://newgrf-specs.tt-wiki.net/wiki/NML:Spriteset
- OpenTTD NewGRF debugging (dev tools, aligner, reload):
  - https://wiki.openttd.org/en/Development/NewGRF/Debugging
- GRFDiff/GRFMerge overview:
  - https://www.ttdpatch.de/grfcodec/grfcodec-manual.html
