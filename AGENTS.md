# AGENTS.md — Swedish Trains Fixed (by Hannes)

This file is the working brief for contributors and AI agents. It states the purpose, SoT conventions, architecture, palette workflow, the NML/NewGRF features used, plus gotchas and references. Read this before changing code or art.

## Purpose
- Patch and extend the “Swedish trains by AI” NewGRF to add quality‑of‑life fixes and an alternate history X2000 lineup (tilt, earlier availability, higher‑speed variants, dual‑headed G3), updated UB2 coaches, and a UB2 cargo coach. We depend on and must load after the upstream GRF.

## Repository Map (single sources of truth)
- `trainfix.nml` — Source of truth for NewGRF logic, properties, graphics wiring, and load‑order checks.
- `lang/english.lng` — Source of truth for all user‑facing strings (names, desc, URLs, params).
- `src-img/` — Source of truth for editable sprites (truecolor RGBA while editing).
- `gfx/` — Game‑ready 8bpp indexed sprites consumed by NML. Treat these as generated from `src-img` via the palette workflow; do not hand‑edit.
- `palette_key.png` — Donor palette image (PLTE/tRNS) used to reindex art.
- `palettize.js` — Node tool that copies the palette from `palette_key.png` onto edited PNGs and writes indexed sprites to `gfx`.
- `swedish_trains_fixed_chw*.grf` — Compiled artifacts. Decide per‑release whether to commit or generate on demand.
- `README.md` — Human instructions: palette notes, palettize usage, and build command.

## Build, Tools, and Quick Commands
- Prereqs: `nmlc` (NML compiler) on PATH; Node.js (modern, ESM‑capable) for the palette tool.
- Compile the GRF (from repo root):
  
  ```sh
  nmlc -c \
       --grf swedish_trains_fixed_chw_v2.grf \
       trainfix.nml
  ```
  
- Copy to OpenTTD (macOS example):
  
  ```sh
  cp swedish_trains_fixed_chw_v2.grf ~/Documents/OpenTTD/content_download/newgrf
  ```
  
- Palette reindexing with our tool:
  
  ```sh
  npm install
  node palettize.js -p palette_key.png -i "src-img/*.png" -o gfx/
  ```
  
  Notes:
  - The tool relies on `pngjs`, `png-chunks-*`, and `pako` to read/write PLTE/tRNS and indexed data.
  - It uses modern Node APIs (`fs/promises.glob`, `Array.fromAsync`). If your Node is old, upgrade (Node ≥22 recommended) or replace globs with explicit file lists.

## Graphics and Palettes (why they matter)
- OpenTTD 8bpp sprites use a fixed 256‑entry palette (PLTE) and optional transparency table (tRNS). If your sprite indices don’t match the expected palette, colours will be wrong in‑game.
- Recolour sprites (company colours etc.) operate by remapping palette indices; the NML recolour machinery assumes the “Default (DOS) palette.” If your art uses a different palette, `nmlc` may convert or warn, and recolouring won’t behave as intended.
- Our workflow: edit freely in `src-img` (RGBA), then reindex to the donor palette with `palettize.js` and write to `gfx/`. Do not manually change colours or indices in `gfx`.

Relevant docs:
- Realsprites (sprite coordinates, offsets, warnings): https://newgrf-specs.tt-wiki.net/wiki/NML:Realsprites
- Spriteset (link images to NML): https://newgrf-specs.tt-wiki.net/wiki/NML:Spriteset
- Recolour sprites (company colours and palettes): https://newgrf-specs.tt-wiki.net/wiki/NML:Recolour_sprites
- List of default colour translation palettes: https://newgrf-specs.tt-wiki.net/wiki/NML:List_of_default_colour_translation_palettes

## NML/NewGRF Architecture We Use (with code pointers)
- GRF metadata and versioning
  - Defined once at top of `trainfix.nml`:
    
    ```nml
    grf {
      grfid: "CHTX";
      name: string(NAME);
      desc: string(DESC);
      version: 2; min_compatible_version: 2;
      url: string(URL);
      param { disable_x2 { type: bool; name: string(DISABLE_X2_NAME); desc: string(DISABLE_X2_DESC); } }
    }
    ```
  - Reference: NML:Main (index of GRF, Items, properties): https://newgrf-specs.tt-wiki.net/wiki/NML:Main
  - Reference (block syntax and GRF block): https://newgrf-specs.tt-wiki.net/wiki/NML:Block_syntax

- Global tables
  - `cargotable { MAIL, GOOD, VALU }` for refit allowlists.
  - `railtypetable { _15KV: [SAAa, SAAA, SAAE, ELRL], _X5KV: [NORD, SAAA, SAAE, ELRL] }` for track compatibility/fallbacks.
  - Docs: Cargotable — https://newgrf-specs.tt-wiki.net/wiki/NML:Cargotable
          Railtypetable — https://newgrf-specs.tt-wiki.net/wiki/NML:Railtypetable-Roadtypetable-Tramtypetable

- Interaction with other GRFs
  - We override vehicles from the upstream GRF and enforce load order:
    
    ```nml
    engine_override("AI\00\06");
    if (grf_order_behind("AI\00\06") == 0) {
      error(FATAL, MUST_LOAD_AFTER, "Swedish trains by AI");
    }
    ```
  - Docs: Overriding vehicles — https://newgrf-specs.tt-wiki.net/wiki/NML:Overriding_vehicles_in_other_NewGRFs

- Feature items (trains and a small roadveh tweak)
  - Trains use `item(FEAT_TRAINS, <ID_NAME>, <id>) { property { ... } graphics { ... } }`.
  - Common properties we set: `introduction_date`, `model_life`, `vehicle_life`, `reliability_decay`, `power`, `speed`, `weight`, `tractive_effort_coefficient`, `air_drag_coefficient`, `cost_factor`, `running_cost_*`, `engine_class`, `track_type`, `dual_headed`, `misc_flags` (e.g., `TRAIN_FLAG_TILT`, `TRAIN_FLAG_MU`).
  - Wagons/coaches: `refittable_cargo_classes`, `cargo_allow_refit`, `default_cargo_type`, `cargo_capacity`.
  - Example (X2 G3 excerpt):
    
    ```nml
    item(FEAT_TRAINS, X2_G3, 0x93) {
      property {
        introduction_date: date(1999, 1, 1);
        dual_headed: 1; speed: 276 km/h; power: 7634 kW;
        track_type: _X5KV; misc_flags: bitmask(TRAIN_FLAG_TILT, TRAIN_FLAG_MU);
      }
      graphics { default: spr_x2_grey; purchase: spr_x2_grey_purchase; }
    }
    ```
  - Docs: Vehicles (props/vars/callbacks overview) — https://newgrf-specs.tt-wiki.net/wiki/NML:Vehicles

- Graphics wiring
  - Spritesets for views and purchase icons live in `gfx/*.png` and are declared via `spriteset(...) { [x,y,w,h,xoff,yoff] ... }`. Empty `[]` entries are valid for purchase lists.
  - We select different coach sprites automatically at train tail using a `switch` on `position_in_consist_from_end`:
    
    ```nml
    switch(FEAT_TRAINS, SELF, sw_ub2grey_graphics, position_in_consist_from_end) {
      0:  return spr_ub2x_grey;   // cab on tail
      return spr_ub2_grey;        // plain trailer otherwise
    }
    ```
  - Docs: Switch — https://newgrf-specs.tt-wiki.net/wiki/NML:Switch
          Realsprites — https://newgrf-specs.tt-wiki.net/wiki/NML:Realsprites
          Spriteset — https://newgrf-specs.tt-wiki.net/wiki/NML:Spriteset

- Articulation (example: IORE)
  - We build multi‑part engines by returning part IDs until `CB_RESULT_NO_MORE_ARTICULATED_PARTS`:
    
    ```nml
    switch(FEAT_TRAINS, SELF, sw_iore_articulated_part, extra_callback_info1) {
      1: return 19; // next part id
      return CB_RESULT_NO_MORE_ARTICULATED_PARTS;
    }
    item(FEAT_TRAINS, iore, 19) {
      graphics { articulated_part: sw_iore_articulated_part; /* ... */ }
    }
    ```
  - Docs: Vehicles (callbacks/vars table) — https://newgrf-specs.tt-wiki.net/wiki/NML:Vehicles

- Language files
  - Strings are in `lang/english.lng` and referenced via `string(STR_...)` in NML.
  - Docs: Language files — https://newgrf-specs.tt-wiki.net/wiki/NML:Language_files

- General variables we touch
  - E.g. `traininfo_y_offset`, `train_width_32_px` to improve purchase list rendering.
  - Docs: General variables — https://newgrf-specs.tt-wiki.net/wiki/NML:General

## Oddities and Gotchas vs “regular” JS/Python projects
- Sprites must be aligned and offset correctly; eight viewing angles for vehicles are common. Use `[]` empties for unused purchase sprites; watch `NOWHITE`/`NOANIM`/`ALPHA` warnings from the realsprite parser.
- Palettes are index‑based; colour swaps aren’t free‑form RGB. Company colours use recolour tables; wrong base palette ⇒ wrong colours.
- Load order matters. We explicitly fail load if not placed under the upstream GRF.
- Vehicle IDs and the engine pool: in OpenTTD with engine pool enabled, IDs are per‑GRF; overriding another GRF’s vehicle typically goes via `engine_override` and matching IDs.
- Hiding items: setting `climates_available: NO_CLIMATE` is a common pattern to disable a vehicle (we use this when `disable_x2` is true).
- Track types are labels (from `railtypetable`), not raw enums; plan for fallbacks.
- Articulation and consist position are evaluated at runtime through callbacks/switches; scoping (`SELF` vs `PARENT`) matters.

## Project Conventions (SoT, KISS, LOW‑RISK / HIGH‑IMPACT)
- Single source of truth
  - Code: `trainfix.nml` (+ `lang/english.lng`).
  - Art: edit `src-img/` only; generate `gfx/` via the palette tool; never hand‑edit `gfx/`.
  - Artifacts: `.grf` are derived. Prefer generating in CI or locally; if committed, bump `version` and update README.
- KISS / low‑risk defaults
  - Prefer property tweaks and sprite wiring over deep refactors.
  - Keep refit policies explicit and conservative (labels/classes may vary between industry sets).
- DRY
  - Reuse spritesets and switches; consider templates only when it actually removes duplication without obscuring intent.
- Docs first
  - When adding vehicles, palettes, or refits: update `README.md` and this file if behaviour changes.

## Frequent Tasks (recipes)
- Add or update a livery or coach sprite
  1) Edit art in `src-img/` (RGBA).
  2) `node palettize.js -p palette_key.png -i "src-img/new_*.png" -o gfx/`.
  3) Add or update `spriteset(...)` in `trainfix.nml` and wire it in `graphics { }` or a `switch`.
  4) Compile with `nmlc` and test in‑game.

- Add a refit option to a coach
  1) Ensure the cargo label is in `cargotable`.
  2) On the item: set `refittable_cargo_classes` and, if needed, `cargo_allow_refit: [LABELS...]` and `cargo_capacity`.
  3) Test purchase/refit UI and load behaviour.

## References (primary, “official” docs)
- NML main index: https://newgrf-specs.tt-wiki.net/wiki/NML:Main
- Switch: https://newgrf-specs.tt-wiki.net/wiki/NML:Switch
- Vehicles (props/vars/callbacks): https://newgrf-specs.tt-wiki.net/wiki/NML:Vehicles
- Realsprites: https://newgrf-specs.tt-wiki.net/wiki/NML:Realsprites
- Spriteset: https://newgrf-specs.tt-wiki.net/wiki/NML:Spriteset
- Recolour sprites: https://newgrf-specs.tt-wiki.net/wiki/NML:Recolour_sprites
- Cargotable: https://newgrf-specs.tt-wiki.net/wiki/NML:Cargotable
- Railtypetable / Roadtypetable / Tramtypetable: https://newgrf-specs.tt-wiki.net/wiki/NML:Railtypetable-Roadtypetable-Tramtypetable
- Overriding vehicles in other NewGRFs: https://newgrf-specs.tt-wiki.net/wiki/NML:Overriding_vehicles_in_other_NewGRFs
- General variables: https://newgrf-specs.tt-wiki.net/wiki/NML:General

## Tooling Footnotes (assumptions)
- `nmlc` is installed (via pip package `nml`) and up to date.
- Our palette tool uses `fs/promises.glob` (experimental as of Node 22) and `Array.fromAsync`. If you see errors about missing `glob` or `fromAsync`, upgrade Node or adjust the script.

---

If anything here appears out‑of‑date, prefer the linked specs and update this file in the same change.
