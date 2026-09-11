# Assembly authoring

Author each independent construction branch as a small module that produces a list of steps in local coordinates with its own ID prefix. An integration script then concatenates branches in build order and writes the project JSON under `public/sets/`. The large JSON is a build artifact; edit the modules, not the file.

## Helpers

`scripts/lib/assembly-utils.mjs`

- `createPartFactory({prefix, approach})` returns a function that makes part records with unique IDs and a default insertion direction.
- `transformPart`, `transformPosition`, `multiplyRotation` apply rigid transforms to parts, holes and studs with one implementation.
- `insetMotion(parts, source, stagingOffset)` builds a loose group in clear space and then places it as one action.

`scripts/lib/pack-geometry.mjs` packs a part's complete LDraw dependency tree into `public/models/parts/<part>.mpd`, preserving every license header. `scripts/pack-parts.mjs` runs it for every part a project references.

`scripts/lib/audit-assembly.mjs` opens the running app with a project injected over the network, renders a step with all motion settled, checks that every piece has geometry, and can save a screenshot. Use it to inspect authored branches before integrating them.

## Step features

- **Subassemblies.** Give steps an `assembly` name to build in a separate coordinate space. A later step in the receiving assembly mounts a completed snapshot with `instances: [{id, assembly, throughStep, position, rotation}]`. Parts are never copied; earlier steps keep showing their original state, and LDraw export references the snapshot as a submodel.
- **Sliding a mounted assembly.** Add `instanceUpdates: [{id, position}]` to a later step in the same receiving assembly. The whole installed snapshot translates as one motion action.
- **Moving one part.** `partUpdates: [{id, position, rotation?}]` moves an existing part, including an installed child addressed by its qualified ID such as `mount-1/pin-3`. Export expands such an instance at its resolved poses so the reusable source snapshot stays unchanged.
- **Motion.** A step may declare `motion: {stagingOffset, actions: [...]}`. Actions are `add` (a part or instance with an `approach` vector), `place` (seat a staged group), `move` (existing parts, optionally around a `pivot`), and `rotate` (fold newly built parts from `fromRotation` around a pivot). Offsets are in the receiving assembly's coordinates.
- **Stickers.** See `docs/sticker-authoring.md`.

Plan parts, then loose subassemblies, then the receiving structure, then the complete mechanism. Branches can be authored in parallel, but check several independent stud or hole contacts and clearances at each join.

## Verification

`node scripts/verify.mjs unit|build|browser|live|all` runs the unit tests, a production build, the Playwright suite, or a live-server data check. `browser --grep PATTERN` filters browser tests. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use an existing Chromium.

On macOS the Playwright configuration enables Metal (`--enable-gpu --use-angle=metal`). Headless Chromium's default software renderer can turn seconds of navigation into minutes; check the rendering backend before raising timeouts.
