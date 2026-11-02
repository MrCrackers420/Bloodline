# Latch 98 Round 4 — Thread 3 Audio Editing Results

**Owner:** `apps`  
**Starting baseline:** `LATCH-R4-2026-11-01-R3-NORN-MERGED` (Round 4 shared source).  
**Patch:** `Latch98-R4-Thread-3-Changes.zip`  
**Scope:** `apps/audacity/index.html`, `apps/soundstudio/index.html`, owned audio tests only. No Latch shell, virtual disk implementation, Norn, or other game code was edited.

## Reproduced problems and fixes

1. **Audacity WAV import rate/channels**: browser `decodeAudioData` may resample WAV to the audio context's rate (and remix); the editor then treated that as the source recording. Conventional RIFF WAV with PCM 8/16/24/32-bit or IEEE 32-bit float is now decoded locally with original channel order, frame count, and rate (8–192 kHz, mono/stereo). Unsupported/malformed WAV reports an explicit error. Compressed/other containers still use browser decoding.
2. **Audacity paste**: pasting before the start or after the end of a selected track previously clamped to the edge; different sample rates could not be pasted at all, and a stereo clipboard sent to a mono track silently ignored its right channel. Paste now inserts at the timeline's exact frame, fills gaps with zero samples, aligns early insertion to a new track offset, linearly resamples a different-rate clipboard, and averages stereo-to-mono clipboard channels. Tape-speed processing remains separate from WSOLA tempo changes.
3. **Waveform peak loss**: the old overview deliberately skipped samples above a per-pixel threshold (and so could hide a single-sample impulse). Both editors now build cached exact minimum/maximum envelopes and scan every source frame, including across source/sample-rate boundaries. In-place Audacity effects invalidate cached peaks. This is a rendering fix; the actual signal remains PCM, not an illustrative approximation.
4. **Sound Studio selection/undo**: its millisecond fields could not identify a single source PCM frame. Added source-rate inclusive/exclusive frame fields, and bounded 8-step *session-only* undo/redo for sample crop/cut (previously only one undo). Source-frame selection is converted into Sound Studio's existing mono 22,050 Hz sampler output; the export always reflects that output rate. WAV writer now reads the actual audio buffer sample rate instead of a compile-time constant.

## Tests (all synthetic audio; no copyrighted clips)

Run from the project root:

```sh
node --test apps/tests/audio-accuracy.test.cjs apps/tests/soundstudio-disk.test.cjs apps/tests/r4-audio-fidelity.test.cjs
python apps/tests/thread3-browser.py
python tests/round4/audio/browser.py
python apps/tests/iframe_smoke.py --chromium /usr/bin/chromium soundstudio audacity
```

**Results on the test machine:**

- Node tests: **28/28 passing** across the three files. Tests run actual production PCM decode, stretch, sample splice, WAV encode, peak envelope, paste, and LatchFS song writer function bodies.
- Earlier Chromium regression (`thread3-browser.py`): passed Audacity edit/save/export; Sound Studio import/edit/export, repeated 1-second loop scheduling and metronome stop/reset, and keyboard/pointer chord cases. Existing Solitaire/Minesweeper DOM smoke also passed without modifications.
- Round 4 Chromium browser tests (`tests/round4/audio/browser.py`): passed 48,000 Hz stereo import, selecting and removing `[4801,10937)` (exactly **6136 source frames**), undo/redo, save/reopen/save/export, frame-by-frame reverse/fade/undo/redo assertions, and 53,864-frame 16-bit stereo WAV output. At splice boundaries output PCM matches the source's expected frames to **within 1 integer LSB** (necessary from 16-bit float conversion). Neither channel was silent and both were distinct.
- Sound Studio Chromium: exact source frame fields, two independent crop edits with two undo/two redo actions, saved project reload, and decoded 22,050-Hz mono WAV exports with exactly 44,100 frames at **0.5× stretch** and 14,700 at **1.5× stretch**. Generated 440 Hz sine was measured at **440.0 Hz** and **438.0 Hz** after stretching, respectively, and about **660 Hz** after 1.5× tape speed. Mid-clip RMS after stretch: **0.3017** and **0.3016** (normalized). These figures describe the synthetic test tone, not general speech/music transparency.
- 1.9-million-frame waveform one-sample impulse test: peak preserved; ~**0.006 seconds** for one peak-cache/query operation on this Chromium host (not a full-page benchmark). The Node regression also exercised 882,000-frame waveforms.
- Embedded `srcdoc` iframe smoke of both standalone editors: **2/2 passed**; no script exceptions or third-party network requests.
- Mobile Chromium context (390 × 844, touch enabled): Audacity exact-frame dialog, Sound Studio source-frame input, independent simulated pen pointer contacts passed. This is **not** physical Android/stylus hardware certification.
- Invalid `.mov` file: meaningful codec/container error, previous Sound Studio audio remains in memory. **No valid AAC/H.264 MOV or MP4 decoder matrix was verified**; real codec support depends on browser, OS and permissions.

## Known trade-offs and nonclaims

- **Pitch preservation is approximate**: existing WSOLA can smear transients/phase on complex audio, and very short selections fall back to ordinary resampling (therefore pitch can shift). The test verified time/pitch distinction at 0.5×, 1.5× and prior 2× across sample rates/mono/stereo, not perceptual transparency or very long real-time jobs.
- Sound Studio's clip editing undo/redo is **session-only**. Project JSON stores the selected source waveform and speed/reverse settings, not multi-generation source-edit history, because embedding repeated multi-minute audio in each save would exceed typical LatchFS quota. Audacity `.l98aud` keeps its existing bounded project history and can reopen it.
- Audacity mixdown WAV exports **16-bit stereo at the project rate**; original mono/stereo source identity and sample rates are preserved inside the project. Sound Studio sampler currently mixes input to **mono 22,050 Hz** by design. Thus arbitrary imported stereo is not preserved as stereo in the sampler.
- Standard PCM RIFF, not RIFX/RF64/WAVE_FORMAT_EXTENSIBLE or ADPCM, is handled directly in Audacity; unsupported WAV encodings raise errors rather than claiming to be supported. Browser-decoded compressed and video formats may be resampled or unavailable.
- WAV sample quantization, Sound Studio boundary fades, and resampling may introduce expected small differences. Imported float samples are checked for NaN/Infinity. Unsupported codecs should be converted to conventional WAV first.
- No physical microphone permission dialog was automated. No full Latch OS integration test was made by this worker, only standalone and Latch-like embedded-frame playback. The integrator owns final full-shell release checks.

## Integration

The patch is additive to the frozen Round 4 baseline; no shell/desktop API changes are required. Do **not** replace other branches' files or mix in historical source snapshots. Extract the patch to project-relative paths after `python tools/parallel_merge.py check --thread apps --zip ...` succeeds on a pristine Round 4 checkout.
