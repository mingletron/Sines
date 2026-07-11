# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Sines is a single-file, zero-dependency browser experiment for additive synthesis: it builds an audio buffer by summing sine waves and draws the resulting waveform on a `<canvas>`. All code lives in `sines.html` (inline `<style>` + one `<script>` block). There is no build step, package manager, or test suite.

## Running

Open `sines.html` directly in a browser, or serve it (e.g. `python3 -m http.server`) and visit the page. Audio requires a Web Audio-capable browser. `window.AudioContext || window.webkitAudioContext` handles the Safari prefix.

The `AudioContext` is created/resumed lazily on the first call that needs audio (via `ensureAudioContext()`), so audio starts from a user gesture as modern browsers require. There is no build step, package manager, or test suite; validate JS by parsing the `<script>` block with `node -e 'new Function(require("fs").readFileSync("sines.html","utf-8").match(/<script>([\\s\\S]*?)<\\/script>/)[1])'`.

## Code organization

The single `<script>` block is organized into sections (in order):

### Constants (`kSampleRate`, `kNumSamples`, `kFrequency`, `kPI_2`, `MAX_PERSIST`)
Numeric constants for sample rate (44100), buffer length (2 seconds), default frequency (440 Hz), and rendering.

### Note frequency table (`notes`)
Array of `{note, freq}` objects covering C0–B8 (87 tones). Populates the per-row note dropdowns.

### State (`gain`, `zoom`, `waves`, `looping`, `waveVisible`, `nextId`, `aud`, `buffer`, `buf`, `sourceNode`, `persistFrames`)
All mutable state is declared at the top of the script for visibility. `waves` is the array of active `Wave` objects. `buf` is the shared Float32Array serving as both audio source and canvas data.

### Wave model (`class Wave`)
A `Wave` carries `id`, `freq`, `amp`, `phase`, and `enabled`. Each wave's `id` (a `Date.now()*1000 + nextId++` timestamp) ties the in-memory object to its DOM table row.

### Audio buffer synthesis (`clearBuffer`, `writeSine`, `writeSines`, `rebuildBuffer`)
- `clearBuffer()` — zeroes `buf` via `buf.fill(0)`.
- `writeSine(buf, freq, amp, phase, enabled, rate)` — adds one sine wave's samples into `buf` (no-op if `!enabled`).
- `writeSines(buf, waves)` — iterates `waves` and calls `writeSine` for each, using the AudioContext's actual sample rate.
- `rebuildBuffer()` — ensures the audio context exists, clears, re-sums all enabled waves into `buf`, and redraws. This is the standard "apply changes" function called by most handlers.

### Canvas rendering (`drawBackground`, `drawGraticule`, `drawPersistenceFrames`, `drawWaveform`, `drawScanlines`, `drawBezel`, `drawReadouts`, `draw`)
Each sub-function handles one visual layer. The orchestrating `draw(showWave)` function clears the canvas, paints layers in order (background → graticule → persistence frames → waveform → scanlines → bezel → readouts), and manages the phosphor persistence frame buffer.

- `buf` is the single source of truth for the waveform render. The 800px (CSS) canvas maps to the buffer via `zoom` (samples-per-pixel): index with `Math.round(x * zoom)`, clamped to `buf.length - 1`.
- `persistFrames` stores up to `MAX_PERSIST` (4) previous waveform Y-arrays for the decaying phosphor trail effect.

### Web Audio API (`ensureAudioContext`, `setPowerLed`, `play`, `stop`, `toggleLoop`)
- `ensureAudioContext()` — lazily creates the shared `AudioContext` (handling the `webkitAudioContext` Safari prefix), allocates the mono `AudioBuffer` and its `Float32Array` view `buf` at the context's actual sample rate, primes the buffer with current waves, and lights the power LED.
- `play()` — stops any existing source, creates a fresh `BufferSourceNode` (buffer sources are single-use), connects it, and starts playback. Sets the LED on.
- `stop()` — stops the active source and clears the LED.
- `toggleLoop()` — reads the loop checkbox and sets `.loop` on the live source.

### Wave lookup (`findWave`)
Uses `Array.find()` to locate a `Wave` by numeric id from the `waves` array.

### UI event handlers (`setGain`, `setZoom`, `toggleWave`, `clearWaveforms`, `removeWave`, `updateFreqFromDD`, `updateFreq`, `updateAmp`, `updatePhase`)
All follow the same pattern: locate the relevant `Wave` via `findWave(id)`, mutate its property, call `rebuildBuffer()` (if the wave is enabled) or `clearBuffer() + writeSines() + draw()`, which keeps `buf`, audio, and the canvas in sync.

### UI row construction (`makeEnabledToggle`, `makeRemoveButton`, `addRow`)
Builds table rows via DOM APIs (`createElement`/`addEventListener`), not HTML strings. `addRow(opts)` defaults missing values to `kFrequency` / 0.5 / 0 / false. Returns the new wave's `id`.

### Presets (`loadPreset`)
`loadPreset(shape)` clears everything, then calls `addRow` once per harmonic to build a classic waveform additively: `sine` (fundamental only), `saw` (all harmonics, `1/n`), `square` (odd harmonics, `1/n`), `triangle` (odd harmonics, `1/n²` with alternating phase). This is the app's showcase — verify a preset still renders the right shape after touching `writeSine`/`writeSines`/`draw`.

### DOM initialization
All event handlers are wired here via `getElementById(...).addEventListener(...)`, keeping the HTML free of inline `onclick`/`oninput` attributes.

## Key invariants when editing

- `buf` is the single source of truth for both audio playback and the canvas render. Any change to a wave must re-fill `buf` (zero it, then `writeSines`) and redraw, or the visual/audio will drift from the controls. Use `rebuildBuffer()` for standard apply-and-redraw.
- A `Wave` object and its DOM row are linked only by the shared `id`. Handlers locate their wave via `findWave(id)` — preserve that linkage when adding controls. IDs come from `Date.now()*1000 + nextId++` so batch inserts (presets) within one millisecond stay unique.
- `buf` holds `kNumSamples` (`kSampleRate * 2` = 2 seconds) of samples, allocated at the AudioContext's actual sample rate. `draw` maps the canvas width across the buffer via `zoom` (samples-per-pixel), indexing with `Math.round(x * zoom)` clamped to `buf.length - 1`.
- `waves.length` rows live in the table `<tbody>` (`tBodies[0]`), never the `<thead>` — `insertRow(-1)` on the table element lands in the header when the body is empty.
- All event handlers are wired in the DOM initialization section. When adding a new control, add its listener there rather than using inline HTML attributes.