# BuzzGuard

**An offline phone app that detects disease-carrying mosquitoes by the sound of their wingbeats, maps where they are active, and tells a health worker which ward to act on first.**

Runs entirely on-device, works with no internet, and needs no hardware beyond a phone.

> **Live demo:** https://AnjaliiD.github.io/buzzguard/app/buzzguard_app.html
> *(Open on a phone. Allow microphone and location. Works offline once loaded.)*

---

## The problem

India records hundreds of thousands of dengue, malaria, and chikungunya cases every year. Controlling them depends on knowing *where* the dangerous mosquitoes are breeding, yet surveillance still relies on trained entomologists setting physical traps and identifying specimens under a microscope. It is slow, costly, and rarely reaches rural or aspirational districts. By the time patients reach a clinic, the outbreak is already spreading.

## The idea

A female *Aedes aegypti* (the dengue vector) beats its wings at a frequency measurably different from *Anopheles* or *Culex*, mostly in the 300–1000 Hz range that any phone microphone can capture. BuzzGuard listens, names the species with a small on-device neural network, geotags the detection, and rolls detections up into a **ward-level risk score** that fuses three signals a health worker can act on:

```
risk(ward) = detections of Aedes this week
           + reported stagnant-water sites
           x recent rainfall (standing water is where breeding happens)
```

Each ward then produces a task, not just a number: *"Act now — send a team for source reduction,"* *"Watch — inspect within 48 hours,"* or *"Routine."*

## How it works

```
  LISTEN            CLASSIFY              LOG + MAP            SCORE                ACT
  phone mic   ->    on-device CNN    ->   geotag, offline  -> fuse detections  -> ward task list
  (Web Audio)       (TensorFlow.js)       (IndexedDB)          + water + rain      for a worker
```

Everything runs in the browser. The mel-spectrogram is computed *inside* the model graph, so the phone and the training pipeline use identical audio processing — no train/serve mismatch. Nothing is uploaded.

---

## Results

The classifier was trained on the public [Wingbeats dataset](https://www.kaggle.com/datasets/potamitis/wingbeats) (~279k lab recordings) plus a "background / no mosquito" class built from [ESC-50](https://github.com/karolpiczak/ESC-50).

| Metric | Value | Notes |
|---|---|---|
| Test accuracy | **75.6%** | Held-out split, **grouped by recording session** (not a random split) |
| Aedes recall | 58.2% | The number I most want to improve — missing a vector is the expensive error |
| Background recall | 100% | The app does not fire alerts at silence |
| Model size | ~0.3 MB | Small enough to ship to a phone and run offline |

Two things I want to be upfront about, because they matter more than the headline number:

1. **These are lab numbers.** Wingbeats is clean, controlled audio. A real phone in a real room with a fan running will do worse — possibly much worse. I verified the app classifies a real Wingbeats *Aedes* clip correctly on-device at 73.7% confidence, but I have **not yet** validated it on mosquitoes I recorded myself. That field test is the next step, and the honest field number is the one that actually matters.

2. **The split is grouped by recording session on purpose.** A random split lets clips recorded seconds apart — same mosquito, same room tone — land in both training and test, which inflates accuracy to a meaningless 95%+. Grouping gives a lower, honest number that is actually about telling species apart.

---

## Prior work, and how this differs

Acoustic mosquito identification is **not** a new research idea, and it would be dishonest to claim otherwise:

- **Stanford Abuzz** (Mukundarajan et al., *eLife* 2017) recorded mosquito wingbeats on cheap phones, classified ~20 species, and built distribution maps for targeted control.
- **Oxford HumBug** (with the HumBugDB dataset) detects and identifies species from flight tones on budget smartphones and builds real-time occurrence maps.
- Multiple peer-reviewed CNN studies classify *Aedes aegypti* from smartphone audio at 94–98% accuracy on lab data.

What I have not found anywhere is the layer *after* detection: an **offline, health-worker-facing tool that fuses acoustic detections with citizen water reports and rainfall into a ward-level risk score and a concrete task list**, designed for low-connectivity districts. That decision layer — turning "there is an Aedes here" into "inspect Ward 12 within 48 hours" — is the contribution of this project. The classifier is a means to it, built on the shoulders of the work above.

---

## Repository layout

```
buzzguard/
├── README.md                        this file
├── LICENSE                          MIT
├── app/
│   ├── buzzguard_app.html           the full app: detect + log + map + risk (Phases 1-3)
│   ├── buzzguard_phase1.html        minimal listener (kept as a fallback demo)
│   ├── sw.js                        service worker (offline app shell + map tiles)
│   └── manifest.json                PWA manifest (installs to a phone home screen)
├── model/
│   └── BuzzGuard_Phase0_train.ipynb Colab notebook: train the CNN, export to TF.js
│       (place model.json + the .bin shard here after you run it)
└── docs/
    └── (screenshots, demo.gif, field-test writeup go here)
```

## Running it locally

The microphone needs a secure context, so open it through a local server, not by double-clicking the file:

```bash
cd app
python3 -m http.server 8000
# then open http://localhost:8000/buzzguard_app.html
```

Load the model files (`model.json`, the `.bin` shard, `model_meta.json`) once with the file picker; the app caches them on the device and loads itself on later visits, offline.

## Training the model

Open `model/BuzzGuard_Phase0_train.ipynb` in [Google Colab](https://colab.research.google.com), set Runtime → T4 GPU, and run top to bottom. It downloads the data, trains the CNN, prints a confusion matrix, and exports a TensorFlow.js bundle you drop into `app/`. A Kaggle account token is needed for the dataset.

---

## Tech

Vanilla JavaScript (no framework, no build step) · TensorFlow.js · Web Audio API · Leaflet + OpenStreetMap · IndexedDB · Service Worker / PWA · Python, TensorFlow/Keras for training.

## Limitations

This is a screening and early-warning aid for health workers, **not a medical diagnosis**. Reported accuracy is on lab audio; real-world performance is unvalidated. Ward cells are a ~700 m grid standing in for real municipal boundaries. Risk weights are a reasoned first guess, not calibrated against outbreak data. All of these are stated so they can be tested, not hidden.

## Acknowledgements

Wingbeats dataset (Fanioudakis, Geismar & Potamitis, 2018); HumBugDB (Kiskin et al., 2021); ESC-50 (Piczak, 2015). Prior art: Stanford Abuzz and Oxford HumBug, cited above.

## License

MIT — see [LICENSE](LICENSE).

---

*Built by Anjali Desai.*
