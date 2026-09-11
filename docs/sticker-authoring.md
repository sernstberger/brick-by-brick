# Sticker decals

A sticker belongs to the receiving part's `sticker` field. Two kinds exist:

- **Serial label**: `{number, prefix, text}` draws a small canvas-rendered label, for example `{number: 13, prefix: 'S/N', text: '0000 0001'}`.
- **Image**: `{kind: 'image', number, url, width, height, position, euler, fromStep}` maps an image from `public/stickers/` onto the part. Width, height and position use LDraw units in the part's local coordinates; Euler angles are radians in XYZ order. Position defaults to `[0, -0.05, 0]` and rotation to `[Math.PI/2, 0, 0]`, which lies the image flat on a tile's top face.

`fromStep` delays the decal until a later, sticker-only step. That step adds no physical parts; `partsThrough` reveals the decal from that step onward, and rigid instances keep the decoration state of their `throughStep` snapshot.

Decals are viewer-only. LDraw export keeps the physical part and omits the artwork. Only include image files you have the rights to distribute.
