# Working in this repository

- `npm test` runs the unit tests; `npm run test:e2e` runs the browser suite against a dev server on port 5174. Run the relevant tests before claiming a change works.
- The app uses port 5174 with strict binding. If it is occupied, restart the existing process rather than switching ports.
- Project data lives in `public/sets/*.json`. Author new branches as small modules and integrate them into the project JSON; do not hand-edit the large file.
- Reuse `scripts/lib/assembly-utils.mjs` (part factories and transforms), `scripts/lib/pack-geometry.mjs` (LDraw dependency packing) and `scripts/lib/audit-assembly.mjs` (settled render captures). See `docs/assembly-authoring.md`.
- Packed geometry keeps its LDraw license headers. Do not add part geometry from any source other than the LDraw library.
