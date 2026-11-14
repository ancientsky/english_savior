# Vendored libraries

## three.min.js — three.js r187 (0.187.0)

three.js no longer ships a classic `<script>` build (the UMD `build/three.min.js` was
removed in r160), and this site has no build step and must also work from `file://`
(where ES modules are blocked). So the vendored file is a **one-off esbuild bundle** that
exposes everything on the global `THREE`, exactly like the old UMD build did.

It also bundles a few official `examples/jsm` addons, available as `THREE.<name>`:
`RoundedBoxGeometry`, `BufferGeometryUtils` (namespace), `EffectComposer`, `RenderPass`,
`ShaderPass`, `UnrealBloomPass`, `OutputPass`, `FXAAShader`, `Sky`, `ImprovedNoise`,
`SimplexNoise`. To add another addon, add an `export` line to `src/three-entry.js` and rebuild.

### Rebuild / upgrade

```bash
mkdir /tmp/three-build && cd /tmp/three-build
cp <repo>/js/vendor/src/three-entry.js entry.js
npm init -y && npm install three@<version> esbuild
npx esbuild entry.js --bundle --format=iife --global-name=THREE --minify \
  --legal-comments=none --target=es2019 --outfile=three.min.js
# prepend the licence banner (see the top of the current file), copy to js/vendor/three.min.js,
# then bump ?v= in index.html
```

Used by `js/empire.js` and the 天空之城 files (`js/sky*.js`).

### Notes for the r149 → r187 jump

- Colour management is on: `renderer.outputColorSpace` is sRGB by default, and every
  **colour** canvas texture needs `tex.colorSpace = THREE.SRGBColorSpace` (otherwise it
  renders washed out). `texture.encoding` / `THREE.sRGBEncoding` no longer exist.
- Lights are physically based: ambient/hemisphere/directional intensities are ×π compared
  with r149 for the same brightness.
- WebGL 1 is gone — a WebGL 2 browser is required (iOS/Safari 15+, any current Chrome/Edge/Firefox).
