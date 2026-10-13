# Zombiehaus Model Scryer (WeightScryer Integration)

Deep neural model introspection, semantic tag & expression extraction, training recipe diagnostics, and Golden Run generation recommendations across Diffusers, Checkpoints, and LoRAs.

---

## Overview

The **Zombiehaus Model Scryer** (`ZombiehausModelScryer`) transforms model inspection into an omnipresent creative cockpit across ComfyUI. 

Available as a **Global Floating Cockpit**, a **Top Menu & Sidebar Launcher**, a **Universal Right-Click Node Action**, and a **Dedicated Canvas Node**, the Model Scryer unlocks the internal weights, headers, and metadata of any model on your system:

1. **Expressions, Poses & Semantic Categories**:
   - Automatically parses training dataset frequencies and classifies terms into distinct functional groups: **Triggers** 🎯, **Facial Expressions & Emotions** 😊, **Poses & Camera Framing** 💃, **Lighting & Atmosphere** 💡, **Clothing & Textures** 👗, **Aesthetic Styles** 🎨, and **Quality Enhancers** ✨.
2. **Golden Run Generation Settings**:
   - Recommends the exact sampling parameters tuned for the model's architecture: optimal **Sampler**, **Scheduler**, **Step Range**, **CFG / Guidance Scale**, **CLIP Skip**, and **Native Aspect Ratios** (e.g. 1024x1024, 832x1216, 768x1344).
3. **Model-Specific Negative Prompt Blueprint**:
   - Supplies a ready-to-copy negative prompt specifically constructed for the detected architecture (e.g. anti-waxing cues for Chroma/Flux; score-based negative brackets for Pony V6; bad hands/anatomy tokens for SDXL and Illustrious).
4. **Training Recipe & Hyperparameter Diagnosis**:
   - For LoRAs and fine-tunes, reveals the underlying training configuration: **Network Rank & Alpha**, **Alpha/Rank Scaling Ratio**, **Recommended LoRA Strength**, **Training Resolution**, **Total Epochs**, **Training Steps**, and **Learning Rate**.
5. **Universal Accessibility (Not Just a Node!)**:
   - Launchable from the **Top Menu Bar** (`🔮 Model Scryer`), the **Floating Bottom-Left Button** (`🔮 Model Oracle`), or via **Right-Click** on any Model/LoRA loader node on canvas.
6. **Bi-Directional WeightScryer Desktop Synergy**:
   - Automatically syncs with `~/.WeightScryer/library.db`. Any model analyzed in ComfyUI is cached into your local WeightScryer database for instant cross-tool availability.

---

## How to Access Model Scryer Anywhere

You never need to disrupt or rewire your active workflow to use the Model Scryer:

1. **Top Menu Bar & Floating Cockpit Launcher**:
   - Click **`🔮 Model Scryer`** in the ComfyUI top menu (or click **`🔮 Model Oracle`** on the bottom-left floating badge).
   - A floating glassmorphic cockpit opens over your canvas. You can inspect any model, copy tags or negative blueprints, and close it when done.
2. **Universal Right-Click on Loaders**:
   - Right-click on *any* loader node on your canvas (`Zombiehaus LoRA Loader`, standard `LoraLoader`, `Zombiehaus Model Loader`, `UNETLoader`, or `CheckpointLoaderSimple`).
   - Select **`🔮 Scry Model with WeightScryer`** from the context menu.
   - The Cockpit immediately pops up, pre-loaded and auto-scrying the model currently selected in that node!
3. **On-Canvas Node (`ZombiehausModelScryer`)**:
   - For automated prompt chaining, place the node on canvas and wire `triggers`, `expressions`, `poses_framing`, or `negative_prompt` directly into `ZombiehausTextEditor` or `ZombiehausKSampler`.
   - Click **`⛶ Pop-Out Cockpit`** on the node to expand it into the full floating window.

---

## Do You Need T5 & VAE to Read Diffusers (e.g., ChromaHD-1)?

- **To inspect the diffuser file alone**: **No**. The Model Scryer directly inspects `Chroma1-HD.safetensors` header tables, key structures, and weights energy from disk with zero external dependencies.
- **To perform Full-Stack Prompt Intelligence**: **Optional & Recommended**. If you pass `clip` (e.g. `t5xxl_fp8_e4m3fn.safetensors`) and `vae` (e.g. `ae.sft`)—or pass a Zombiehaus `pipe`:
  - The node recognizes that a **T5-XXL** text encoder is driving your Chroma/Flux DiT.
  - It automatically adapts its advice to **Natural Language Prose** prompt engineering (focusing on continuous scene descriptions, camera lenses, lighting, and tactile textures rather than rigid comma-separated Danbooru tag soup).
  - It validates your VAE (e.g. 16-channel Chroma/Flux AE) and displays a live **Full-Stack Status Banner** on canvas.

---

## Cockpit Views & Features

### 🏷️ Tags & Vocabulary View
- **Category Filter Pills**: Quick-filter by `All`, `🎯 Triggers`, `😊 Expressions`, `💃 Poses`, `💡 Lighting`, `🎨 Style`, and `✨ Quality`.
- **Live Search**: Rapidly find tags in real-time.
- **Color-Coded Chips**: Single-click any tag badge to copy it directly to your system clipboard with instant green checkmark confirmation.
- **Batch Copy Toolbar**: `🎯 Copy Triggers`, `😊 Copy Expressions`, and `📋 Copy Visible`.

### 🎯 Golden Recipe & Cheatsheet View
- **Generation Settings**: Recommended Sampler, Scheduler, Steps, CFG scale, CLIP Skip, and Native Resolutions.
- **Negative Prompt Blueprint**: Exact tuned negative prompt with a 1-click `📋 Copy Negative` button.
- **Training Recipe**: Rank, Alpha, Alpha/Rank ratio, recommended LoRA strength, and epoch details.
- **Optimal Prompt Blueprint**: Visual sequence breakdown showing how to assemble prompts for this specific model architecture.

### 🔬 Deep Dive & Specs View (Human-Readable Diagnostic Engine)
- **Top Specs Badge Bar**: Total Parameters (e.g. `11.92 Billion Parameters` or `24.18 Million Parameters`), Disk Footprint (e.g. `11.89 GB`), Tensor Precision breakdown (e.g. `BF16 (98.6%)`), and AutoV2 Model Hash.
- **Weight Health & Saturation Score**: Calculates Frobenius norm statistics across attention layers with clear human verdicts (`✅ Healthy & Well-Balanced`, `⚡ Potent / High Steering`, or `⚠️ Overcooked / Saturated`) and practical CFG/strength guidance.
- **Zero-Guesswork Companion Stack**: Identifies exact required Text Encoders (e.g. T5-XXL + CLIP-L Dual Tokenizer), VAE (e.g. Flux AE 16-channel), Guidance Type, and Native Resolutions.
- **Layer Weight Mass & Distribution**: Visual progress bars showing parameter mass distribution across Transformer Double/Single blocks or UNet Down/Mid/Up stages.
- **Training Architecture & Optimization**: Details Optimizer (e.g. `AdamW 8-bit`), Scheduler (`Cosine Annealing with Restarts`), Dataset image counts, step repeats, learning rate, and noise offset.

### 🪟 Non-Blocking Floating Window
- **Resizable**: Drag any corner or edge (`resize: both`) to expand from compact inspector to full screen.
- **Non-Blocking Canvas**: Click, pan, zoom, connect wires, and run workflows while keeping the cockpit open.
- **Draggable Header**: Click and drag the top title bar to move the cockpit across monitors or canvas corners.
- **Minimize Toggle**: Collapse to a thin floating title strip with `—` and restore anytime with `□`.

---

## Inputs & Outputs (Canvas Node)

### Inputs

| Name | Type | Default | Description |
|---|---|---|---|
| `source_type` | COMBO | `Diffusers` | Select model category: `Diffusers`, `LoRAs`, or `Checkpoints`. |
| `diffuser_name` | COMBO | `none` | Name of the diffusion model (UNet / DiT) from `diffusion_models` or `unet`. |
| `lora_name` | COMBO | `none` | Name of the LoRA file from `models/loras/`. |
| `checkpoint_name` | COMBO | `none` | Name of the checkpoint file from `models/checkpoints/`. |
| `category_filter` | COMBO | `All Tags` | Filter output string: `All Tags`, `Triggers Only`, `Expressions Only`, `Poses Only`, `Style Only`, `Quality Only`. |
| `max_tags` | INT | `40` | Maximum number of discovered tags to return (5 to 120). |
| `min_frequency` | INT | `5` | Minimum training dataset frequency required to include a tag (1 to 1000). |
| `auto_prepend_triggers` | BOOLEAN | `True` | Formats triggers with priority weighting for immediate prompt insertion. |
| `pipe` | PIPE (optional) | — | Optional Zombiehaus execution pipe containing `(model, clip, vae, positive, negative)`. |
| `model` | MODEL (optional) | — | Connected diffusion model instance for live parameter and dtype inspection. |
| `clip` | CLIP (optional) | — | Connected CLIP / T5 text encoder for vocabulary and prompting strategy analysis. |
| `vae` | VAE (optional) | — | Connected VAE autoencoder for latent format and channel verification. |

### Outputs

| Name | Type | Description |
|---|---|---|
| `triggers` | STRING | Comma-separated list of primary invocation keywords and activation tokens. |
| `expressions` | STRING | Comma-separated list of facial emotions and expressions discovered in the model. |
| `poses_framing` | STRING | Comma-separated list of poses, angles, and camera framing tokens. |
| `style_tags` | STRING | Comma-separated list of aesthetic, lighting, and artistic style modifiers. |
| `negative_prompt` | STRING | Tailored negative prompt blueprint ready to plug into KSampler or Text Editor. |
| `all_tags` | STRING | Complete list of all discovered tags filtered by `category_filter`. |
| `summary` | STRING | Comprehensive diagnostic report detailing architecture, stack status, recipe, and run settings. |
| `pipe` | PIPE | Pass-through Zombiehaus execution pipe. |
