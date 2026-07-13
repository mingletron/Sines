# Sines — Feature Roadmap

A living list of possible features to add to the Sines additive synthesis oscilloscope.
Prioritized roughly by impact vs. effort.

---

## 🔊 Audio Synthesis

- [ ] **Wavetable / Custom Waveform per partial** — Let users draw or upload a custom waveform shape instead of only sine. Would make the additive engine much more flexible.
- [ ] **FM / AM / Ring Modulation** — Add modulation routing between waves (modulator/operator model like FM synthesis).
- [x] **Filter section (LP/HP/BP)** — A BiquadFilterNode after the gain stage adds timbral sculpting. The UI reuses the existing panel + slider pattern. *(Done)*
- [ ] **Effects rack (Delay, Reverb, Chorus)** — Add a post-processing chain. Each effect could be a collapsible panel with bypass toggle, matching the existing UI idiom.
- [x] **Detune per wave** — A fine-tuning control (±50 cents) per row, useful for chorus-like effects and microtonal exploration. *(Done)*
- [ ] **Sub-harmonic support** — Allow frequencies below the note base (0.5×, 0.25× etc.) for deeper bass tones.
- [x] **Noise generator** — Add a white/pink/brown noise source as a "wave" row. Technically not additive sine, but hugely useful for real-world timbres. *(Done)*
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

- [x] **Keyboard shortcuts** — Space = Play/Stop, `+` = Add Wave, `Backspace` = Delete last wave, `Escape` = close overlays. *(Done)*
- [x] **Collapsible panels** — `▸`/`▾` toggle on Envelope, MIDI, Presets, and Waves panels. State persisted in localStorage. *(Done)*
- [x] **Canvas resize handle** — Dropdown with 640×480, 800×600, 1024×768, and full-width options. *(Done)*
- [x] **Full-screen scope mode** — Double-click a screen to expand it to fill the viewport. Escape to exit. *(Done)*
- [x] **Screenshot / PNG export** — 📷 button per screen downloads canvas as PNG. *(Done)*
- [x] **Tooltip help overlay** — `?` button shows a guide covering controls, keyboard shortcuts, and oscilloscope terminology. *(Done)*
- [x] **Wave row drag-to-reorder** — HTML5 drag-and-drop with grip handle to reorder harmonics. *(Done)*
- [x] **Colour themes** — 4 selectable themes (Green CRT, Amber CRT, Blue CRT, White) with dropdown selector. Theme applies to all UI and canvas rendering. Persisted in localStorage. *(Done)*

## 🎵 Musical Features

- [ ] **Scale quantizer for frequency inputs** — Option to snap frequency inputs to a selected musical scale (major, minor, pentatonic, etc.).
- [ ] **Arpeggiator / sequencer** — A simple step sequencer that cycles through held notes or a programmed pattern. Would make the app usable for music creation, not just sound design.
- [ ] **Just intonation / microtonal mode** — Toggle between equal temperament (current) and pure ratios (3:2, 5:4, etc.) for the note dropdown.
- [ ] **BPM-syncable LFO** — If an arpeggiator or LFO is added, sync it to a BPM input so it's musically useful.

## ⚙️ Performance & Code Quality

- [ ] **Web Worker for FFT** — The `computeSpectrum()` blocks the main thread for large FFT sizes. Moving it to a Worker would keep the UI smooth.
- [ ] **Incremental buffer rebuild** — Currently `rebuildBuffer()` zeroes and re-sums all waves. For large wave tables, diffing enabled waves and only recomputing deltas would be faster.
- [ ] **OfflineAudioContext for render** — Use `OfflineAudioContext` to pre-render the buffer instead of summing sample-by-sample in JS. Would be dramatically faster for complex patches.
- [x] **Add a test suite** — Node.js test suite covering FFT, buffer synthesis, notes table, Wave class, presets, serialize/deserialize, and display toggles. Runs in CI on every PR. *(Done)*

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
