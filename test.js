/**
 * Test suite for sines.html — runs in Node.js with no dependencies.
 * Usage: node test.js
 */

const fs = require('fs');
const vm = require('vm');

// ── Assertion helpers ─────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) { passed++; }
    else { failed++; console.error('  FAIL: ' + msg); }
}
function assertClose(a, b, tol, msg) {
    assert(Math.abs(a - b) < tol, msg + ` (got ${a}, expected ${b})`);
}

// ── DOM stub ──────────────────────────────────────────────────────
function createStubEnvironment() {
    function makeProxy(id) {
        return {
            id,
            addEventListener: () => {},
            querySelector: () => null,
            querySelectorAll: () => [],
            classList: { toggle: () => false, add: () => {}, remove: () => {}, contains: () => false },
            style: {},
            textContent: '',
            innerHTML: '',
            value: '',
            checked: false,
            disabled: false,
            options: [],
            selectedIndex: 0,
            dataset: {},
            width: 640,
            height: 480,
            getContext: () => new Proxy({}, {
                get: (_target, prop) => {
                    // Methods that return objects with their own methods (gradient, pattern)
                    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
                        return () => new Proxy({}, { get: () => () => {} });
                    }
                    if (prop === 'createPattern') return () => null;
                    if (prop === 'measureText') return () => ({ width: 0 });
                    if (prop === 'getLineDash') return () => [];
                    if (prop === 'createImageData') return () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 });
                    if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 });
                    // All other properties/methods are no-ops
                    return () => {};
                },
            }),
            appendChild: () => {},
            removeChild: () => {},
            remove: () => {},
            closest: () => null,
            before: () => {},
            after: () => {},
            insertBefore: () => {},
            insertRow: () => ({ insertCell: () => ({ appendChild: () => {} }), appendChild: () => {} }),
            deleteRow: () => {},
            tBodies: [{ rows: [], insertRow: () => ({ insertCell: () => ({ appendChild: () => {} }), appendChild: () => {}, draggable: false, dataset: {} }) }],
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 480 }),
        };
    }

    const elements = {};
    const ids = [
        'gainSlider', 'zoomSlider', 'loopToggle', 'playBtn', 'stopBtn',
        'clearBtn', 'addWaveBtn', 'xyBtn', 'specLabel', 'attackSlider',
        'attackReadout', 'decaySlider', 'decayReadout', 'sustainSlider',
        'sustainReadout', 'releaseSlider', 'releaseReadout', 'waveTable',
        'savePresetBtn', 'dbToggle', 'logFreqToggle', 'trigRising',
        'trigFalling', 'trigLevel', 'cursorsToggle', 'waveCanvas', 'specCanvas',
        'powerLed', 'midiDevice', 'midiStatus', 'midiNoteDisplay',
        'gainReadout', 'zoomReadout', 'controls', 'savedPresets',
        'waveScreen', 'specScreen', 'canvasSize', 'themeSelect', 'helpOverlay', 'helpBtn', 'helpClose',
    ];
    for (const id of ids) elements[id] = makeProxy(id);

    // Set canvas data-mode attributes
    elements['waveCanvas'].dataset = { mode: 'wave' };
    elements['specCanvas'].dataset = { mode: 'spec' };

    // controls.querySelector('.spacer') returns an element with .before()
    elements['controls'].querySelector = (sel) => sel === '.spacer' ? { before: () => {} } : null;

    return {
        document: {
            getElementById: (id) => elements[id] || makeProxy(id),
            querySelector: (sel) => {
                if (sel === '.screen.fullscreen') return null;
                if (sel === '.screens') return elements['controls'];
                return null;
            },
            querySelectorAll: (sel) => [],
            createElement: (tag) => makeProxy(tag),
            body: { appendChild: () => {} },
            addEventListener: () => {},
            activeElement: null,
        },
        window: {
            AudioContext: function () {
                return {
                    sampleRate: 44100,
                    createBuffer: (ch, len, rate) => ({
                        getChannelData: () => new Float32Array(len),
                        duration: len / rate, length: len,
                        numberOfChannels: ch, sampleRate: rate,
                    }),
                    createGain: () => ({
                        gain: { value: 0.8, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
                        connect: () => {}, disconnect: () => {},
                    }),
                    createBufferSource: () => ({
                        buffer: null, loop: false,
                        connect: () => {}, start: () => {}, stop: () => {},
                        disconnect: () => {}, onended: null,
                    }),
                    destination: {}, currentTime: 0, state: 'running',
                    resume: () => Promise.resolve(),
                };
            },
            requestAnimationFrame: () => {},
            getComputedStyle: () => ({}),
            navigator: { requestMIDIAccess: () => Promise.reject() },
            alert: () => {}, confirm: () => false, prompt: () => '',
            crypto: { randomUUID: () => '00000000-0000-0000-0000-000000000000' },
            location: { hash: '' },
            addEventListener: () => {},
            innerWidth: 1024, innerHeight: 768,
        },
        navigator: { requestMIDIAccess: () => Promise.reject() },
        localStorage: {
            _store: {},
            getItem(k) { return this._store[k] || null; },
            setItem(k, v) { this._store[k] = v; },
            removeItem(k) { delete this._store[k]; },
            clear() { this._store = {}; },
        },
        Math, Float32Array, Uint32Array, Int32Array, Uint8ClampedArray,
        console, setTimeout, clearTimeout, setInterval, clearInterval,
        Date, JSON, Array, Object, String, Number, Boolean, RegExp,
        Error, TypeError, RangeError, parseInt, parseFloat, isNaN, isFinite,
    };
}

// ── Load script and export internals ──────────────────────────────
function loadSines() {
    const html = fs.readFileSync('sines.html', 'utf-8');
    const match = html.match(/<script>([\s\S]*?)<\/script>/);
    if (!match) throw new Error('Could not find <script> block in sines.html');

    // Append an export block so const/let declarations are accessible.
    // Use getters for mutable state so reads reflect current values.
    const exportBlock = `
;var __test = {
    kSampleRate: kSampleRate, kNumSamples: kNumSamples, kFrequency: kFrequency,
    kPI_2: kPI_2, MAX_PERSIST: MAX_PERSIST, FFT_SIZE: FFT_SIZE,
    LOG2_FFT: LOG2_FFT, FREQ_MAX: FREQ_MAX,
    notes: notes, Wave: Wave,
    get waves() { return waves; },
    set waves(v) { waves = v; },
    get buf() { return buf; },
    get aud() { return aud; },
    get buffer() { return buffer; },
    get midiRatio() { return midiRatio; },
    set midiRatio(v) { midiRatio = v; },
    get gain() { return gain; },
    set gain(v) { gain = v; },
    get zoom() { return zoom; },
    set zoom(v) { zoom = v; },
    get attack() { return attack; },
    set attack(v) { attack = v; },
    get decay() { return decay; },
    set decay(v) { decay = v; },
    get sustain() { return sustain; },
    set sustain(v) { sustain = v; },
    get release() { return release; },
    set release(v) { release = v; },
    get looping() { return looping; },
    set looping(v) { looping = v; },
    get waveVisible() { return waveVisible; },
    get nextId() { return nextId; },
    get spectrumDirty() { return spectrumDirty; },
    set spectrumDirty(v) { spectrumDirty = v; },
    get spectrumCache() { return spectrumCache; },
    set spectrumCache(v) { spectrumCache = v; },
    get fftRe() { return fftRe; },
    get fftIm() { return fftIm; },
    get fftWin() { return fftWin; },
    set fftWin(v) { fftWin = v; },
    get fftBitRev() { return fftBitRev; },
    set fftBitRev(v) { fftBitRev = v; },
    get fftCosT() { return fftCosT; },
    set fftCosT(v) { fftCosT = v; },
    get fftSinT() { return fftSinT; },
    set fftSinT(v) { fftSinT = v; },
    get triggerMode() { return triggerMode; },
    get triggerLevel() { return triggerLevel; },
    get spectrumDbScale() { return spectrumDbScale; },
    get spectrumLogScale() { return spectrumLogScale; },
    get waterfallMode() { return waterfallMode; },
    get waterfallFrames() { return waterfallFrames; },
    get MAX_WATERFALL() { return MAX_WATERFALL; },
    get multiColor() { return multiColor; },
    get xyMode() { return xyMode; },
    get xyPhaseOffset() { return xyPhaseOffset; },
    get cursorsActive() { return cursorsActive; },
    get cursorV1() { return cursorV1; },
    get cursorV2() { return cursorV2; },
    get cursorH1() { return cursorH1; },
    get cursorH2() { return cursorH2; },
    get cursorDrag() { return cursorDrag; },
    get persistFrames() { return persistFrames; },
    // Functions
    clearBuffer, writeSine, writeSines, rebuildBuffer, ensureFftTables, fft,
    computeSpectrum, draw, loadPreset, findWave, ensureAudioContext,
    getSavedPresets, persistPresets, serializeState, deserializeState,
    refreshSavedPresetsUI, addRow, clearWaveforms, removeWave,
    noteOn, noteOff,
    localStorage: localStorage,
};
`;

    const ctx = vm.createContext(createStubEnvironment());
    vm.runInContext(match[1] + exportBlock, ctx);
    return ctx.__test;
}

// ── Test groups ───────────────────────────────────────────────────

function testConstants(t) {
    console.log('\n=== Constants ===');
    assert(t.kSampleRate === 44100, 'kSampleRate');
    assert(t.kNumSamples === 44100 * 2, 'kNumSamples');
    assert(t.kFrequency === 440, 'kFrequency');
    assertClose(t.kPI_2, Math.PI * 2, 1e-10, 'kPI_2');
    assert(t.MAX_PERSIST === 4, 'MAX_PERSIST');
    assert(t.FFT_SIZE === 4096, 'FFT_SIZE');
    assert(t.LOG2_FFT === 12, 'LOG2_FFT');
    assert(t.FREQ_MAX === 4000, 'FREQ_MAX');
}

function testFFT(t) {
    console.log('\n=== FFT ===');
    const N = t.FFT_SIZE;
    const rate = t.kSampleRate;
    const binHz = rate / N;

    // Ensure FFT tables are ready and buf is allocated
    t.ensureAudioContext();
    t.ensureFftTables();

    // Pure sine at 440Hz → peak at correct bin
    {
        t.clearBuffer();
        for (let i = 0; i < N; i++) t.buf[i] = Math.sin(2 * Math.PI * 440 * i / rate);
        t.spectrumDirty = true;
        t.spectrumCache = null;
        const mags = t.computeSpectrum();
        assert(mags !== null, 'FFT returns magnitudes');
        assert(mags.length === N / 2, 'FFT returns N/2 magnitudes');

        let peakBin = 0, peakMag = 0;
        for (let i = 1; i < mags.length; i++) {
            if (mags[i] > peakMag) { peakMag = mags[i]; peakBin = i; }
        }
        const expectedBin = Math.round(440 / binHz);
        assertClose(peakBin, expectedBin, 1, `Peak near bin ${expectedBin} for 440Hz`);
    }

    // Two sines → two peaks
    {
        t.clearBuffer();
        for (let i = 0; i < N; i++) {
            t.buf[i] = Math.sin(2 * Math.PI * 440 * i / rate) +
                       Math.sin(2 * Math.PI * 880 * i / rate);
        }
        t.spectrumDirty = true;
        t.spectrumCache = null;
        const mags = t.computeSpectrum();
        const peaks = [];
        for (let i = 1; i < mags.length; i++) {
            if (mags[i] > 0) peaks.push({ bin: i, mag: mags[i] });
        }
        peaks.sort((a, b) => b.mag - a.mag);
        assert(peaks.length >= 2, 'Two sines produce ≥2 peaks');
        if (peaks.length >= 2) {
            assertClose(peaks[0].bin, Math.round(440 / binHz), 2, 'First peak');
            assertClose(peaks[1].bin, Math.round(880 / binHz), 2, 'Second peak');
        }
    }

    // DC signal → energy in bin 0
    {
        t.clearBuffer();
        t.buf.fill(1.0);
        t.spectrumDirty = true;
        t.spectrumCache = null;
        const mags = t.computeSpectrum();
        let total = 0, dc = 0;
        for (let i = 0; i < mags.length; i++) {
            total += mags[i] * mags[i];
            if (i <= 1) dc += mags[i] * mags[i];
        }
        assert(dc / total > 0.9, 'DC energy concentrated in bin 0');
    }

    // Cache: second call returns same reference
    {
        t.clearBuffer();
        t.spectrumDirty = true;
        t.spectrumCache = null;
        const m1 = t.computeSpectrum();
        const m2 = t.computeSpectrum();
        assert(m1 === m2, 'Second call returns cached result');

        t.clearBuffer();
        const m3 = t.computeSpectrum();
        assert(m3 !== m1, 'After clearBuffer, new spectrum computed');
    }
}

function testWriteSine(t) {
    console.log('\n=== writeSine ===');
    const N = 4096;
    const rate = 44100;

    // Zero amplitude → silence
    {
        const buf = new Float32Array(N);
        t.writeSine(buf, 440, 0, 0, true, rate);
        let max = 0;
        for (let i = 0; i < N; i++) max = Math.max(max, Math.abs(buf[i]));
        assertClose(max, 0, 1e-10, 'Zero amplitude = silence');
    }

    // Known values match Math.sin
    {
        const buf = new Float32Array(N);
        const freq = 440, amp = 0.7, phase = Math.PI / 4;
        t.writeSine(buf, freq, amp, phase, true, rate);
        for (const i of [0, 100, 500, 1000]) {
            const expected = Math.sin(freq * (Math.PI * 2) * i / rate + phase) * amp;
            assertClose(buf[i], expected, 1e-6, `Sample ${i} matches Math.sin`);
        }
    }

    // Disabled wave is no-op
    {
        const buf = new Float32Array(N);
        t.writeSine(buf, 440, 0.5, 0, false, rate);
        let max = 0;
        for (let i = 0; i < N; i++) max = Math.max(max, Math.abs(buf[i]));
        assertClose(max, 0, 1e-10, 'Disabled wave = no-op');
    }

    // Superposition
    {
        const buf = new Float32Array(N);
        t.writeSine(buf, 440, 0.5, 0, true, rate);
        t.writeSine(buf, 880, 0.3, Math.PI / 3, true, rate);
        for (const i of [0, 100, 500]) {
            const expected = Math.sin(440 * (Math.PI * 2) * i / rate) * 0.5 +
                           Math.sin(880 * (Math.PI * 2) * i / rate + Math.PI / 3) * 0.3;
            assertClose(buf[i], expected, 1e-6, `Superposition at sample ${i}`);
        }
    }
}

function testNotes(t) {
    console.log('\n=== Notes Table ===');
    const notes = t.notes;
    assert(Array.isArray(notes), 'notes is array');
    assert(notes.length === 108, `108 notes (got ${notes.length})`);

    // All frequencies are finite numbers
    let allFinite = true;
    for (const n of notes) {
        if (!isFinite(parseFloat(n.freq))) { allFinite = false; break; }
    }
    assert(allFinite, 'All frequencies are finite');

    // A4 = 440
    const a4 = notes.find(n => n.note === 'A4');
    assert(a4, 'A4 exists');
    if (a4) assertClose(parseFloat(a4.freq), 440, 0.01, 'A4 = 440Hz');

    // Semitone ratio
    const ratio = Math.pow(2, 1/12);
    let ratioOk = true;
    for (let i = 1; i < notes.length; i++) {
        if (Math.abs(parseFloat(notes[i].freq) / parseFloat(notes[i-1].freq) - ratio) > 0.01) {
            ratioOk = false; break;
        }
    }
    assert(ratioOk, 'Adjacent semitones ≈ 2^(1/12)');

    // Boundary notes
    const c0 = notes.find(n => n.note === 'C0');
    const b8 = notes.find(n => n.note === 'B8');
    assert(c0, 'C0 exists');
    assert(b8, 'B8 exists');
    if (c0) assertClose(parseFloat(c0.freq), 16.35, 0.01, 'C0 ≈ 16.35Hz');
    if (b8) assertClose(parseFloat(b8.freq), 7902.13, 0.1, 'B8 ≈ 7902.13Hz');
}

function testWaveClass(t) {
    console.log('\n=== Wave Class ===');
    const w = new t.Wave(123, 440, 0.5, 0.25, true);
    assert(w.id === 123, 'id');
    assert(w.freq === 440, 'freq');
    assert(w.amp === 0.5, 'amp');
    assert(w.phase === 0.25, 'phase');
    assert(w.enabled === true, 'enabled');
}

function testTriggerModes(t) {
    console.log('\n=== Trigger Modes ===');
    assert(t.triggerMode === 'none', 'Initial mode = none');
    assert(t.triggerLevel === 0, 'Initial level = 0');
}

function testPresets(t) {
    console.log('\n=== Presets ===');

    // Sine → 1 wave
    t.loadPreset('sine');
    assert(t.waves.length === 1, `Sine: 1 wave (got ${t.waves.length})`);
    if (t.waves.length >= 1) assertClose(t.waves[0].freq, 440, 0.01, 'Sine fundamental');

    // Saw → 8 waves
    t.loadPreset('saw');
    assert(t.waves.length === 8, `Saw: 8 waves (got ${t.waves.length})`);
    for (let i = 0; i < 8; i++) {
        assertClose(t.waves[i].freq, 440 * (i + 1), 0.01, `Saw wave ${i}`);
    }

    // Square → 4 waves (odd harmonics)
    t.loadPreset('square');
    assert(t.waves.length === 4, `Square: 4 waves (got ${t.waves.length})`);
    for (let i = 0; i < 4; i++) {
        assertClose(t.waves[i].freq, 440 * (2 * i + 1), 0.01, `Square wave ${i}`);
    }

    // Triangle → 4 waves with alternating phase
    t.loadPreset('triangle');
    assert(t.waves.length === 4, `Triangle: 4 waves (got ${t.waves.length})`);
    const expectedPhases = [0, Math.PI, 0, Math.PI];
    for (let i = 0; i < 4; i++) {
        assertClose(t.waves[i].phase, expectedPhases[i], 0.01, `Triangle phase ${i}`);
    }
}

function testSaveLoadPresets(t) {
    console.log('\n=== Save/Load Presets ===');

    // getSavedPresets returns empty initially
    t.localStorage._store = {};
    const store = t.getSavedPresets();
    assert(typeof store === 'object' && store !== null, 'Returns object');
    assert(Object.keys(store).length === 0, 'Starts empty');

    // Round-trip
    const testStore = { 'test': { waves: [{ freq: 440, amp: 0.5, phase: 0, enabled: true }] } };
    t.persistPresets(testStore);
    const loaded = t.getSavedPresets();
    assert(loaded['test'] !== undefined, 'Saved preset retrievable');
    assert(loaded['test'].waves.length === 1, 'Wave count preserved');

    // Invalid JSON → empty
    t.localStorage._store = { 'sines-presets': '!!!' };
    const fallback = t.getSavedPresets();
    assert(Object.keys(fallback).length === 0, 'Invalid JSON → empty');
}

function testSerializeDeserialize(t) {
    console.log('\n=== Serialize/Deserialize ===');

    // serialize captures state
    t.loadPreset('sine');
    t.gain = 0.6;
    t.zoom = 1.5;
    t.looping = true;
    const state = t.serializeState();
    assert(state.gain === 0.6, 'Gain captured');
    assert(state.zoom === 1.5, 'Zoom captured');
    assert(state.looping === true, 'Looping captured');
    assert(state.waves.length === 1, 'Waves captured');

    // deserialize restores state
    const fullState = {
        waves: [{ freq: 440, amp: 0.7, phase: 0, enabled: true }],
        gain: 0.9, zoom: 2.0, attack: 0.1, decay: 0.2,
        sustain: 0.8, release: 0.3, looping: false,
    };
    t.deserializeState(fullState);
    assertClose(t.gain, 0.9, 0.001, 'Gain restored');
    assertClose(t.zoom, 2.0, 0.001, 'Zoom restored');
    assertClose(t.attack, 0.1, 0.001, 'Attack restored');
    assertClose(t.decay, 0.2, 0.001, 'Decay restored');
    assertClose(t.sustain, 0.8, 0.001, 'Sustain restored');
    assertClose(t.release, 0.3, 0.001, 'Release restored');
    assert(t.looping === false, 'Looping restored');

    // Round-trip
    t.loadPreset('square');
    t.gain = 0.5;
    t.looping = true;
    const s = t.serializeState();
    t.deserializeState(s);
    assert(t.waves.length === s.waves.length, 'Round-trip wave count');
    assertClose(t.gain, 0.5, 0.001, 'Round-trip gain');
    assert(t.looping === true, 'Round-trip looping');
}

function testDisplayToggles(t) {
    console.log('\n=== Display Toggles ===');
    assert(t.spectrumDbScale === false, 'dB scale off');
    assert(t.spectrumLogScale === false, 'Log scale off');
    assert(t.multiColor === false, 'Multi-color off');
    assert(t.xyMode === false, 'XY mode off');
    assertClose(t.xyPhaseOffset, Math.PI / 2, 0.001, 'XY phase offset');
    assert(t.waterfallMode === false, 'Waterfall off');
    assert(t.cursorsActive === false, 'Cursors off');
}

function testCursors(t) {
    console.log('\n=== Cursors ===');
    assert(t.cursorsActive === false, 'Not active');
    assert(t.cursorV1 === null, 'V1 null');
    assert(t.cursorV2 === null, 'V2 null');
    assert(t.cursorH1 === null, 'H1 null');
    assert(t.cursorH2 === null, 'H2 null');
    assert(t.cursorDrag === null, 'Drag null');
}

function testFFTTables(t) {
    console.log('\n=== FFT Tables ===');
    t.ensureFftTables();
    const N = t.FFT_SIZE;

    assert(t.fftWin.length === N, 'fftWin length');
    assert(t.fftRe.length === N, 'fftRe length');
    assert(t.fftIm.length === N, 'fftIm length');
    assert(t.fftBitRev.length === N, 'fftBitRev length');
    assert(t.fftCosT.length === N / 2, 'fftCosT length');
    assert(t.fftSinT.length === N / 2, 'fftSinT length');

    // Hann window: 0 at endpoints, ~1 at center, symmetric
    assertClose(t.fftWin[0], 0, 1e-10, 'Hann 0 at start');
    assertClose(t.fftWin[N - 1], 0, 1e-10, 'Hann 0 at end');
    assert(t.fftWin[N / 2] > 0.9, 'Hann ~1 at center');
    for (let i = 0; i < N / 2; i++) {
        assertClose(t.fftWin[i], t.fftWin[N - 1 - i], 1e-10, `Hann symmetric ${i}`);
    }

    // Bit-reversal is a permutation
    const seen = new Set();
    for (let i = 0; i < N; i++) seen.add(t.fftBitRev[i]);
    assert(seen.size === N, 'Bit-reversal is permutation');
    assert(t.fftBitRev[0] === 0, 'Bit-rev[0] = 0');
}

function testBufferSynthesis(t) {
    console.log('\n=== Buffer Synthesis ===');

    // clearBuffer zeros the buffer
    t.ensureAudioContext();
    for (let i = 0; i < t.buf.length; i++) t.buf[i] = Math.random();
    t.clearBuffer();
    let allZero = true;
    for (let i = 0; i < t.buf.length; i++) {
        if (t.buf[i] !== 0) { allZero = false; break; }
    }
    assert(allZero, 'clearBuffer zeros buffer');

    // writeSines sums enabled waves
    t.clearBuffer();
    const waves = [
        new t.Wave(1, 440, 0.5, 0, true),
        new t.Wave(2, 880, 0.3, 0, true),
        new t.Wave(3, 1320, 0.2, 0, false),
    ];
    t.writeSines(t.buf, waves);
    const rate = t.kSampleRate;
    for (const i of [0, 100, 500]) {
        const expected = Math.sin(440 * t.kPI_2 * i / rate) * 0.5 +
                       Math.sin(880 * t.kPI_2 * i / rate) * 0.3;
        assertClose(t.buf[i], expected, 1e-6, `writeSines at ${i}`);
    }

    // rebuildBuffer produces signal
    t.loadPreset('sine');
    t.rebuildBuffer();
    let hasSignal = false;
    for (let i = 0; i < 1000; i++) {
        if (Math.abs(t.buf[i]) > 0.1) { hasSignal = true; break; }
    }
    assert(hasSignal, 'rebuildBuffer produces signal');
}

function testWaveLookup(t) {
    console.log('\n=== Wave Lookup ===');
    t.waves = [new t.Wave(100, 440, 0.5, 0, true), new t.Wave(200, 880, 0.3, 0, true)];
    const found = t.findWave(200);
    assert(found !== undefined, 'findWave finds existing');
    assert(found.freq === 880, 'Correct freq');
    assert(t.findWave(999) === null, 'findWave returns null for missing');
}

// ── Run ───────────────────────────────────────────────────────────
console.log('Loading sines.html...');
const t = loadSines();

console.log('Running tests...');
testConstants(t);
testFFT(t);
testWriteSine(t);
testNotes(t);
testWaveClass(t);
testTriggerModes(t);
testPresets(t);
testSaveLoadPresets(t);
testSerializeDeserialize(t);
testDisplayToggles(t);
testCursors(t);
testFFTTables(t);
testBufferSynthesis(t);
testWaveLookup(t);

console.log(`\n${'='.repeat(50)}`);
console.log(`${passed} passed, ${failed} failed`);
console.log('='.repeat(50));
process.exit(failed ? 1 : 0);
