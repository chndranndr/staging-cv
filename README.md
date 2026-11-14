# Staging

A CV for Chandra Aji Anindra told as a chiptune concept album you walk through. ANI, a small made thing, leaves the test environment it grew up in. Seven tracks are seven roles, and every door opens only when the visitor approves it.

`index.html` is the whole page: one self-contained file, no network requests. Open it directly or serve the folder.

## Layout

- `index.html` — the built page. Generated; do not edit by hand.
- `src/template.html`, `src/style.css`, `src/app.js` — the source.
- `data/cv.json` — the single source of truth for the CV. The `placeholder` block is invented.
- `build.mjs` — inlines the source and data into `index.html` and writes the static Plain Sheet.
- `docs/prompt.md`, `docs/shared-brief-v3.md` — the creative direction and the brief it was built from.
- `tools/` — headless Edge scenarios for screenshots and behaviour checks.

## Build

```bash
node build.mjs
```

## Check

Serve the folder, then run a scenario. Screenshots go to `output/`.

```bash
python -m http.server 8711 --bind 127.0.0.1
```

```bash
node tools/cdp-preview.mjs tools/check.mjs
```

```bash
node tools/cdp-preview.mjs tools/shots.mjs
```

`shots.mjs` reads `SIZE` (for example `390x844m`), `SHOTS` (`scene:x` pairs), `STILL=1` for reduced motion and `TAG`. The page exposes `window.__staging` (`goScene`, `ani`, `state`) for driving it.

## Controls

Hold → or ← to walk. Enter approves a door or opens the nearest sign. M opens the map, 1–9 and 0 jump to a track, ? opens the plain CV (also `#cv` in the URL). The loudspeaker turns the sound on.

## Not yet verified

The music has not been listened to, and the print layout has not been checked in a print preview. Very short windows are cramped.
