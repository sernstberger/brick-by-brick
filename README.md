# Brick by brick

An interactive 3D viewer for step-by-step brick assembly instructions, built with Three.js and the LDraw part library. Each step animates new pieces into place, subassemblies build in their own space before mounting, and the finished model exports as a standard LDraw MPD file.

The included sample project is a pinball table: 665 steps, 16 numbered bags, and 2,272 pieces.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5174. Select a step in the sidebar, drag to orbit, scroll to zoom, or use the Top, Front and Reset views. Yellow edges mark the pieces added in the current step. "Separate new pieces" shows each piece's approach direction. Plain left and right arrow keys add or remove one piece at a time; Shift plus arrows moves between whole steps. The URL tracks the current step, so any step can be bookmarked or shared.

## Project format

A project is a single JSON file under `public/sets/`. It lists steps in order, and each step lists the parts it adds with an LDraw part filename, color, position and rotation. Coordinates use LDraw units: 20 per stud, 8 per plate, 24 per brick, with positive Y pointing down. Rotations are row-major 3 × 3 matrices.

Beyond plain additions, steps can:

- build a **subassembly** in its own coordinate space (`assembly`) and later mount a completed snapshot of it with a rigid transform (`instances`);
- **slide** an already mounted assembly (`instanceUpdates`) or **move** an individual part (`partUpdates`);
- describe **motion**: parts that stage in clear space, then place together, thread along an axle, or fold around a pivot;
- attach a **sticker** decal to a part, either a canvas-drawn serial label or an image.

`src/project.js` validates the format and resolves the parts visible at any step. See `docs/assembly-authoring.md` for the authoring helpers and conventions.

## Geometry and attribution

Part geometry comes from the [LDraw library](https://library.ldraw.org/), used under the CC BY 4.0 license included in `public/models/CAreadme.txt`. Every packed part keeps its original author and license header. A full LDraw library is not needed to run the viewer: `public/models/parts/` already contains the dependency tree for every part the sample project uses.

To add parts for a new project, extract the LDraw library to `public/ldraw/` (ignored by Git) and pack the parts your project references:

```sh
node scripts/pack-parts.mjs public/sets/your-project.json
```

One part in the sample, a one-way clutch gear, has no LDraw equivalent and is represented by a simple placeholder drum (`clutch-placeholder.dat`).

This is an independent hobby project. It is not affiliated with, endorsed by, or sponsored by any brick manufacturer or by LDraw. The sample project is a fan-made reconstruction; it is not an official digital model.

## Checks

```sh
npm test            # unit tests
npm run build       # production bundle
npx playwright install chromium
npm run test:e2e    # browser tests, with npm run dev running
npm run verify      # all of the above plus a live-server data check
```

To use an existing Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. On macOS the Playwright config enables Metal so headless rendering of the full model stays fast.

## Deploying

`npm run build` writes a self-contained static site to `dist/`. Asset paths are relative, so it works from a domain root or a subdirectory.

## License

MIT for the code in this repository. LDraw part geometry under `public/models/` is CC BY 4.0 as noted in each file.
