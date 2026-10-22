# Zombiehaus Studio — Unified Creative Workstation

The **Zombiehaus Studio** is a standalone, full-screen creative suite served directly by ComfyUI, providing a professional workstation environment for screenplay direction, high-definition image generation, video DiT synthesis, and Suno-grade vocal songwriting & music production.

---

## Accessing the Studio

You can launch Zombiehaus Studio through any of the following convenient entry points:

1. **Top Action Bar Button**: Click the **`🧟 Zombiehaus Studio`** button on ComfyUI's top navigation bar right next to the "Queue" / "Run" button (exactly like Plenio Player).
2. **Persistent Floating Launcher**: A glowing pill (`🧟 Zombiehaus Studio`) fixed at the top-right of your screen, always accessible across all UI themes.
3. **Canvas Context Menu**: Right-click anywhere on the empty ComfyUI canvas and select **`🧟 Open Zombiehaus Studio`**.
4. **Desktop Launcher**: Double-click [`Zombiehaus Studio.bat`](file:///d:/repos/ComfyUI-Zombiehaus/Zombiehaus%20Studio.bat) in the repository root.
5. **Direct Browser URL**: Navigate to `http://127.0.0.1:8188/zombiehaus/studio` in any browser or second monitor.
6. **On-Node Button**: Click the `[ 🧟 Open Studio Workstation ]` button widget on any creative Zombiehaus node.

---

## The 4 Creative Modes

Zombiehaus Studio features a seamless mode switcher in the top header bar:

### 1. 🎬 Screenplay Director Mode
- **Multi-Persona Scripting**: Write screenplays with explicit blocks: `[SCENE]`, `[PERSONA 1: Left]`, `[PERSONA 2: Right]`, and `[INTERACTION]`.
- **Regional Spatial Masks**: Live visual preview of Left / Center / Right split regions ensuring zero concept leakage across characters.
- **Variable Autocomplete**: Live resolution of persona tags (`$women.Amanda`, `$amanda.lora`, `$men.John`).
- **LoRA Isolation**: Persona LoRAs apply strictly to their regional masks without polluting the global background.

### 2. ✍️ Image Prompt Studio Mode
- **Natural Prose & Tag Modes**: Instant switching between natural conversational descriptions (for FLUX / SD3) and structured Danbooru tags (for SDXL / Pony).
- **One-Click Guards**: Quality, Anatomy, Anti-3D CGI, and Clean Background guards.
- **Ollama AI Enhancement**: Click `✨ Enhance` to enrich prompts with sensory and atmospheric nuance via your local LLM.
- **Aspect Ratio Buttons**: Instant 1-click presets for `1:1 Square`, `16:9 Cinema`, `9:16 Portrait/Shorts`, and `2:3 Classic`.
- **Modular Refinement Stages**: Toggleable Hi-Res Fix, Face/Eye Detailer, De-Wax Film Grain, Restormer, and Model Upscaler.

### 3. 🎥 Video Studio Mode
- **Video DiT Architecture Support**: Generate dynamic videos using **Wan 2.1**, **LTX-Video**, **CogVideoX-5B**, **HunyuanVideo**, or **SVD-XT**.
- **Camera Trajectory Chips**: One-click camera dynamics (`Static Smooth`, `Dolly In`, `Pan Left`, `Pan Right`, `Orbit 360`).
- **Temporal Controls**: Duration slider (2s–10s), FPS selector (24, 30, 60 FPS), Codec selection (H.264 MP4, HEVC H.265, VP9 WebM), and motion flow sliders.
- **Looping Video Viewport**: Embedded HTML5 looping video player with real-time frame scrubber.

### 4. 🎵 Suno-Grade Music & Songwriting Studio Mode
Built for radio-ready, high-fidelity vocal songs and complete musical accompaniment:
- **Multiple Model Engines**:
  - **`DiffRhythm`**: State-of-the-art diffusion-based singing voice synthesis with full multi-instrument accompaniment aligned to verse and chorus lyrics.
  - **`MMAudio`**: Tencent's high-definition 44.1kHz stereo audio model for ultra-crisp film scoring, sound design, and rich audio generation.
  - **`ACE-Step Audio 1.5`**: Fast multi-track audio generation engine.
  - **`AudioCraft / MusicGen`**: Meta's stereo music foundation models.
- **Vocal Production & Delivery**: Choose between *Female Belter (Powerful Pop)*, *Male Raspy Rock Lead*, *Female Breathy Intimate*, *Male Smooth R&B*, *Choir & Harmonies*, or *Instrumental Only*.
- **Musical Attributes**: Key & scale selectors (*A minor*, *C major*, *D minor*, etc.), Time Signatures (*4/4*, *3/4*, *6/8*), and live BPM slider (60–200 BPM).
- **Structured Section Chips**: Quick-insert buttons for `[Intro]`, `[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, `[Verse 2]`, `[Bridge]`, `[Solo]`, and `[Outro]`.
- **`✨ Write Hit Lyrics (AI Ollama)`**: Generates complete, radio-ready lyrics formatted with musical structure tags tailored to your chosen genre and vibe.
- **Interactive Waveform Player**: Instant playback with dynamic audio waveform canvas visualization.

---

## Model Profiles

- Complete setups (Checkpoint/UNet, VAE, CLIP, LoRAs, flow shift, sampler settings) can be saved as named profiles (`💾 Save Profile`).
- Saved profiles persist in `ComfyUI/user/default/zombiehaus/profiles/` as clean JSON files.
- Built-in presets include:
  - `Chroma 1-HD Photoreal`
  - `Flux.1 Dev Standard`
  - `SDXL / Pony Anime`

---

## Headless Modular Execution

Zombiehaus Studio operates via ComfyUI's REST and WebSocket API (`/prompt`, `/ws`, `/history`, `/view`). It constructs clean, modular graphs using the registered modular pipeline nodes:
- `ZombiehausModelLoader`
- `ZombiehausLoraLoader`
- `ZombiehausLatentPreset`
- `ZombiehausTextEditor` / `ZombiehausSceneScriptDirector`
- `ZombiehausKSampler`
- `ZombiehausSaveImage` / `ZombiehausSaveVideo` / `ZombiehausSaveAudio`
- `DiffRhythmRun` / `MMAudioSampler`

No cumbersome monolithic "mega nodes" are needed on the LiteGraph canvas, leaving your ComfyUI workspace clean and lightweight.
