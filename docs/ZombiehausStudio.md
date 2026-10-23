# Zombiehaus Studio — Unified Creative Workstation

The **Zombiehaus Studio** is a standalone, full-screen creative suite served directly by ComfyUI, providing a professional workstation environment for screenplay direction, high-definition image generation, video DiT synthesis, and Suno-grade vocal songwriting & music production.

---

## Accessing the Studio

You can launch Zombiehaus Studio through any of the following convenient entry points:

1. **Top Action Bar Button**: Click the **`⚡ Zombiehaus Studio`** button on ComfyUI's top navigation bar right next to the Queue / Execution controls.
2. **Top Menu Bar**: Click **Zombiehaus ➔ Open Zombiehaus Studio** in the native application menu bar.
3. **Canvas Context Menu**: Right-click anywhere on the empty ComfyUI canvas and select **`🧟 Open Zombiehaus Studio`**.
4. **Direct Browser URL**: Navigate to `http://127.0.0.1:8188/zombiehaus/studio` in any browser or second monitor.
5. **Standalone PWA (Desktop & Mobile App)**: In Chrome, Edge, Brave, or Safari, click the **Install App** icon in the URL bar (or *Add to Home Screen / Install Zombiehaus Studio*) to run it as a borderless, native desktop window with custom icon.
6. **On-Node Button**: Click the `[ 🧟 Open Studio Workstation ]` button widget on any creative Zombiehaus node.

---

## The 6 Creative Modes

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

### 3. 🖼️ Image Edit (i2i / Wardrobe) Studio Mode
Dedicated workstation mode for high-fidelity image-to-image editing, restyling, and targeted outfit replacement:
- **Instant Drag-and-Drop Uploader**: Drop or browse source images with instant thumbnail preview, resolution badge, and automatic alignment.
- **👗 Virtual Try-On / Clothes Change**:
  - Leverages HuggingFace SegFormer clothing segmentation (`ZombiehausWardrobeInpaint`) across ATR classes.
  - Target presets: `All Garments`, `Torso / Upper`, `Lower / Pants / Skirt`, `Lower & Legs` (for converting shorts to gowns), `Full Outfit`, and `Shoes`.
  - Mask grow & blur feathering sliders for seamless garment transitions.
  - Clean latent inpainting that replaces old fabric patterns completely without ghost textures or gray wash.
- **✨ Make Realistic / Photoreal Polish**:
  - Automatically configures fidelity curve (~75%) to retain subject pose, lighting, and composition while re-rendering hyperrealistic skin textures, pores, and photoreal reflections.
- **🎨 Style Transfer & Divergence**:
  - Smooth S-curve fidelity mapping from 0% to 100% with quick presets (`90% Replica`, `75% Photoreal Polish`, `50% Re-imagine`, `25% Diverge`).
- **One-Click Suggestion Tags**: Quick chips for silk evening gowns, black tuxedos, leather biker jackets, 8K raw photography, and cyberpunk synthwave.
- **Negative Fit & Realism Guards**: Toggleable guards against CGI/3D look, deformed clothing, and low resolution.

### 4. 🎥 Video Studio Mode
- **Video DiT Architecture Support**: Generate dynamic videos using **Wan 2.1**, **LTX-Video**, **CogVideoX-5B**, **HunyuanVideo**, or **SVD-XT**.
- **Camera Trajectory Chips**: One-click camera dynamics (`Static Smooth`, `Dolly In`, `Pan Left`, `Pan Right`, `Orbit 360`).
- **Temporal Controls**: Duration slider (2s–10s), FPS selector (24, 30, 60 FPS), Codec selection (H.264 MP4, HEVC H.265, VP9 WebM), and motion flow sliders.
- **Looping Video Viewport**: Embedded HTML5 looping video player with real-time frame scrubber.

### 5. 🎵 Suno-Grade Music & Songwriting Studio Mode
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

### 6. 📚 List & Wildcard Curator Mode
Integrated directly into the workstation for managing wildcard files and variable dictionaries:
- **Browse & Load**: Instant switching across all wildcard files stored in `saved_prompts/wildcards/`.
- **Live Search & Filter**: Real-time line search with live match counters.
- **Inline Editing & Creation**: Add, edit, or create new wildcard lists directly in the browser.
- **Disk Persistence**: Save and delete operations persist directly via ComfyUI endpoints.

---

## Workstation Features

### 🔍 UI Scaling & Font Size
- Choose from 90%, 100%, 110%, 120%, or 130% scaling in the top bar.
- Changes are applied instantly and saved to `localStorage` across browser reloads.

### ⌨️ Precise Numeric Manual Inputs
- Every slider is paired with an interactive numeric input box.
- Drag the slider or click the number to type exact values (e.g. `3.25`, `0.05`, `28`).

### 🎨 Syntax Highlighting & Variable Autocomplete
- **Real-Time Token Coloring**: Highlights section headers (`[SCENE]`), variables (`$women.Amanda`), wildcards (`__colors__`), LoRAs (`<lora:...>`), dynamic weights (`(word:1.2)`), choices (`{a|b}`), and comments.
- **Dynamic Autocomplete**: Type `$` to trigger variable suggestions; type `__` to trigger wildcard lists.
- **Toolbar Pickers**: Click `$ Variables` or `__ Wildcards` above any editor for quick 1-click insertion.

---

## Studio Workflows & Presets

Zombiehaus Studio treats your entire workstation configuration as a **Studio Workflow** — preserving everything you configure across any creative mode:
- **Models & Architecture**: Architecture selection, Checkpoint, UNet, weight dtype, CLIP type/name, VAE, Chroma flow shift, and Dynamic Guidance.
- **LoRA Stack**: Full stack of active LoRAs and their individual model/clip strengths.
- **Resolution & KSampler**: Width, height, batch size, seed, steps, CFG scale, sampler, and scheduler (with aspect ratio button active state).
- **Multi-Pass Detailers**: Detailer master toggle, global sensitivity confidence, and every individual detailer pass (YOLO detector model, denoise, steps, CFG, padding, context pad, mask blur, blend feather, sampler, scheduler, enabled state, and inpaint focus prompt).
- **Modular Post-Processing**: Toggle states and parameters for Hi-Res Fix (scale, denoise), De-Wax & Texture Restore (film grain intensity), Restormer (restoration task), and Neural Model Upscale (upscaler model).
- **Prompts & Scripts**: Positive prompt, negative prompt, negative guard pedalboard chips, mute state, prompt style, and screenplay script.
- **Style Harmonizer**: Selected visual style movement, color palette, and strength.
- **Glamour & Body Sculptor**: Age, smile, skin radiance, ethnicity, hair, eyes, bust, waist, hips, and muscle sculpting values.
- **Image Edit (i2i / Wardrobe)**: Selected task, garment preset, mask grow/blur, fidelity curve, and prompts.
- **Video & Music Engines**: Wan / LTX video parameters and DiffRhythm / MMAudio music song structures, BPM, key, and lyrics.
- **Active Mode**: Restores your exact working view (`screenplay`, `prompt`, `i2i`, `video`, `music`, `lists`).

### Workflow Actions:
- **`💾 Save`**: Save the current setup to disk under a custom workflow name.
- **`⬇️ Export`**: Download the current Studio Workflow as a standalone `.json` file (`zombiehaus_workflow_<name>.json`).
- **`⬆️ Import`**: Load any saved Studio Workflow `.json` file via file picker.
- **`📄 New`**: Reset the Studio to a clean, fresh default workflow state.
- **`🗑️ Delete`**: Delete custom saved workflows.
- **Drag-and-Drop Workflow Loading**: Drag any `.json` Studio Workflow file or generated PNG image directly onto the Studio window to load the entire setup instantly.
- **Automatic PNG Metadata Persistence**: Every image generated by Zombiehaus Studio embeds the entire Studio Workflow JSON inside `extra_pnginfo` metadata. Loading or dragging the generated image back into the Studio restores the complete workstation setup used to create it.

---

## Headless Modular Execution

Zombiehaus Studio operates via ComfyUI's REST and WebSocket API (`/prompt`, `/ws`, `/history`, `/view`). It constructs clean, modular graphs using the registered modular pipeline nodes:
- `ZombiehausModelLoader`
- `ZombiehausLoraLoader`
- `ZombiehausLatentPreset`
- `ZombiehausTextEditor` / `ZombiehausSceneScriptDirector`
- `ZombiehausKSampler`
- `ZombiehausSaveImage` / `ZombiehausSaveVideo` / `ZombiehausSaveAudio`

---

## Complete Node Parity in the Unified UI

Zombiehaus Studio provides complete feature parity with the standalone canvas nodes:

### 📂 Prompt Presets & Text Utilities
- **Category Filter & Preset Dropdown**: Filter and load prompt presets saved in `saved_prompts/prompts/`, `saved_prompts/songs/`, or custom categories.
- **💾 Save Preset**: Save the current positive and negative prompt with a category.
- **Text Refinement Tools**:
  - `🧹 Dedupe`: Removes duplicate comma-separated keyword tags.
  - `✍️ Prosify`: Converts comma-separated tags into fluent cinematic prose.
  - `🏷️ Tagify`: Converts descriptive sentences into clean comma-separated keyword tags.
  - `⇄ Swap`: Swaps the contents of the positive and negative prompt editors.
  - `🧼 Clean`: Strips parentheses, attention weights (`(word:1.2)`), and bracket syntax.

### 🎨 Visual Style & Color Harmonizer (from `ZombiehausStylePicker`)
- **15 Signature Art Movements**: Vogue Fashion Editorial, Cyberpunk Synthwave, Dark Fantasy Oil, 90s Retro Anime, Shinkai Cinematic, Watercolor & Ink Wash, Ukiyo-e Woodblock, Art Nouveau Mucha, Comic Book Noir, Pixar 3D Stylized, Claymation Stop-Motion, Sci-Fi Concept Art, National Geographic, and Surrealist Dreamscape.
- **7 Harmonized Color Palettes**: Natural Balance, Warm Golden Amber, Cool Cyber Cyan, Monochrome High Contrast, Pastel Dreamy, Moody Desaturated, and Vibrant Saturated.
- **Strength Slider**: Adjust style weighting between `0.0` and `2.0`.
- **Inject Style Button**: Injects the styled and weighted tokens directly into the active prompt editor.

### 🎛️ Interactive Negative Pedalboard Guards
- **Toggleable Pedal Chips**: Instant toggles for `✦ Quality`, `🚫 Anatomy`, `🎨 Anti-3D`, `💧 Watermark`, and `🔞 NSFW`.
- **Two-Way Text Sync**: Chips glow when their guard string is present in the negative prompt textarea; clicking adds or strips the guard phrase cleanly.
- **Mute Negative Toggle**: Temporarily bypasses negative prompt conditioning during generation without erasing your text.

### ✨ Character Glamour & Anatomy Sculptor (from `ZombiehausGlamourController`)
Collapsible control panel in Column 1 (Engine Rack) for character transformation:
- **Facial & Identity**: Age Shift slider (`-5.0` to `+5.0`), Smile Intensity (`0.0` to `1.0`), Skin Glow (`0.0` to `1.0`), and Ethnicity selection.
- **Cosmetics**: Hair color and eye color selection.
- **Body & Silhouette Sculpting**: Breasts scale (`-5.0` to `+5.0`), Waist cinch (`-5.0` to `+5.0`), Hips & butt (`-5.0` to `+5.0`), and Muscle tone (`0.0` to `5.0`).
- **Pipeline Injection**: When enabled, automatically formats and injects weighted anatomical directives into the prompt pipeline.
- `DiffRhythmRun` / `MMAudioSampler`

No cumbersome monolithic "mega nodes" are needed on the LiteGraph canvas, leaving your ComfyUI workspace clean and lightweight.
