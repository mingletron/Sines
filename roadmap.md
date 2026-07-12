# Sines — Feature Roadmap

A living list of possible features to add to the Sines additive synthesis oscilloscope.
Prioritized roughly by impact vs. effort.

---

## 🔊 Audio Synthesis

- [ ] **Wavetable / Custom Waveform per partial** — Let users draw or upload a custom waveform shape instead of only sine. Would make the additive engine much more flexible.
- [ ] **FM / AM / Ring Modulation** — Add modulation routing between waves (modulator/operator model like FM synthesis).
- [ ] **Filter section (LP/HP/BP)** — A BiquadFilterNode after the gain stage would add timbral sculpting. The UI could reuse the existing panel + slider pattern.
- [ ] **Effects rack (Delay, Reverb, Chorus)** — Add a post-processing chain. Each effect could be a collapsible panel with bypass toggle, matching the existing UI idiom.
- [ ] **Detune per wave** — A fine-tuning control (±50 cents) per row, useful for chorus-like effects and microtonal exploration.
- [ ] **Sub-harmonic support** — Allow frequencies below the note base (0.5×, 0.25× etc.) for deeper bass tones.
- [ ] **Noise generator** — Add a white/pink/brown noise source as a "wave" row. Technically not additive sine, but hugely useful for real-world timbres.
- [ ] **Polyphony** — Currently only one note at a time. Stack multiple buffers/voices for chordal play via MIDI.

## 🎹 MIDI Enhancements

- [ ] **Pitch bend wheel support** — Currently `midiRatio` is set once on Note On. Updating it in real-time from pitch bend CC would make the MIDI integration feel complete.
- [ ] **Mod wheel (CC1) mapping** — Map CC1 to a chosen parameter (e.g., LFO depth, filter cutoff).
- [ ] **Sustain pedal (CC64)** — Let notes hold across key releases.
- [ ] **MIDI channel selector** — Currently auto-connects to the first device. Add a channel filter dropdown.
- [ ] **MIDI Learn** — Click a control, wiggle a knob, it's mapped. Would make the app usable as a soft-synth controller.

## 📊 Visualization Enhancements

- [x] **Measurement cursors** — Click-drag on the waveform screen to place vertical/horizontal cursors and read out ΔT (time) and ΔV (amplitude). *(Done)*
- [x] **dB scale toggle for spectrum** — Toggle between linear and dB magnitude display. *(Done)*
- [x] **Log-frequency scale for spectrum** — Optional log X-axis for musically useful frequency display. *(Done)*
- [x] **Waterfall spectrum** — Rolling waterfall display showing spectra over time (frequency vs. time vs. magnitude). *(Done)*
- [x] **Multi-colour traces per wave** — Each harmonic rendered in a distinct colour for educational clarity. *(Done)*
- [x] **Configurable trigger mode** — Rising/falling/level trigger for the waveform display. *(Done)*

## 💾 State & Presets

- [x] **Save/load presets to localStorage** — The preset buttons are hard-coded. Let users save their current wave table as a named preset and recall it later. *(Done)*
- [ ] **Share patch via URL hash** — Encode the current `waves[]` + params as a base64 string in the URL so patches can be bookmarked and shared.
- [ ] **Import/export patch as JSON** — A simple `Download .json` / `Upload .json` button pair. Enables patch libraries and collaboration.
- [ ] **Undo/redo for wave table** — Currently removing a wave or changing a value is destructive. A simple command stack would fix this.

## 🖥️ UI/UX

- [ ] **Keyboard shortcuts** — Space = Play/Stop, `+` = Add Wave, `Backspace` on selected row = Delete, `Ctrl+Z` = Undo.
- [ ] **Collapsible panels** — The ADSR + MIDI + Presets + Wave Table sections are always visible. Add a small `▸`/`▾` toggle to each panel header to reclaim vertical space.
- [ ] **Canvas resize handle** — The screens are fixed at 640×480. A drag-resize or dropdown (640, 800, 1024, full-width) would help on larger monitors.
- [ ] **Full-screen scope mode** — Double-click a screen to expand it to fill the viewport (like a real scope's full-screen button).
- [ ] **Screenshot / PNG export** — A 📷 button per screen that opens a download dialog with the current canvas contents.
- [ ] **Tooltip help overlay** — A `?` button that shows a brief "How to use this synth" guide, especially helpful for the oscilloscope terminology.
- [ ] **Wave row drag-to-reorder** — Use HTML drag-and-drop API so users can order harmonics meaningfully (e.g., fundamentals first).

## 🎵 Musical Features

- [ ] **Scale quantizer for frequency inputs** — Option to snap frequency inputs to a selected musical scale (major, minor, pentatonic, etc.).
- [ ] **Arpeggiator / sequencer** — A simple step sequencer that cycles through held notes or a programmed pattern. Would make the app usable for music creation, not just sound design.
- [ ] **Just intonation / microtonal mode** — Toggle between equal temperament (current) and pure ratios (3:2, 5:4, etc.) for the note dropdown.
- [ ] **BPM-syncable LFO** — If an arpeggiator or LFO is added, sync it to a BPM input so it's musically useful.

## ⚙️ Performance & Code Quality

- [ ] **Web Worker for FFT** — The `computeSpectrum()` blocks the main thread for large FFT sizes. Moving it to a Worker would keep the UI smooth.
- [ ] **Incremental buffer rebuild** — Currently `rebuildBuffer()` zeroes and re-sums all waves. For large wave tables, diffing enabled waves and only recomputing deltas would be faster.
- [ ] **OfflineAudioContext for render** — Use `OfflineAudioContext` to pre-render the buffer instead of summing sample-by-sample in JS. Would be dramatically faster for complex patches.
- [ ] **Add a test suite** — The CLAUDE.md notes "no test suite." Adding a small harness (even just `node` running the synthesis math) would prevent regressions.

## 🏆 Stretch Goals

- [ ] **VST/AU wrapper** — Package as a WebAudio-based plugin using the WebAudio Plugin API or a wrapper like `iwwrite`. Turns the educational toy into a real instrument.
- [ ] **Collaborative mode (WebRTC)** — Two people on the same URL hear each other's note presses. Would be a delightful demo.
- [ ] **3D spectrogram** — WebGL-accelerated rolling spectrogram as a third visualization mode. Visually stunning and scientifically useful.

---

## Suggested First Picks

If you're not sure where to start, these are high-impact and fit naturally into the existing codebase:

1. **Share patch via URL hash** — Encode state into the URL so patches can be bookmarked and shared. No backend needed.
2. **Pitch bend + Mod wheel MIDI support** — Completes the MIDI integration for surprisingly little code.
3. **Screenshot / PNG export** — Trivial to implement (`canvas.toDataURL()`), makes the app shareable on social media.
4. **Collapsible panels** — Pure CSS/JS, no new dependencies, immediately improves usability on laptops.
