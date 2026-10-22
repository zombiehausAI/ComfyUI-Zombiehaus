# Zombiehaus Scene Script Director (N-Persona)

The **Zombiehaus Scene Script Director** (`ZombiehausSceneScriptDirector`) is an advanced screenplay-style multi-character director node engineered to direct **2 to N personas** in a single image, each with their own independent LoRA, appearance, physique, and pose, with zero concept bleeding and natural physical interaction.

---

## Text Editor Integration & Syntax Highlighting

The Scene Script Director is designed to pair directly with **Zombiehaus Text Studio** (`ZombiehausTextEditor`):

- **Live Syntax Highlighting**: Section dividers like `[SCENE]`, `[PERSONA 1]`, `[PERSONA 2]`, and `[INTERACTION]` are automatically recognized with highest token priority (`Priority 0`) and rendered as glowing section banners (`.zombiehaus-section-banner`).
- **Prompt Preset Saving & Loading**: Full multi-character screenplays can be saved as JSON presets in your `saved_prompts/` directory, categorized, and loaded on demand.
- **LoRA Recognition**: The Director seamlessly resolves LoRAs however you pass them:
  1. **Prompt LoRA Tags**: `<lora:Jane_v1:1.0>` written anywhere inside a `[PERSONA]` block or using `$woman.lora` variable expansions.
  2. **Upstream LoRA Metadata**: Extracted `<lora:...>` tags passed via `pipe` or conditioning from `ZombiehausTextEditor` automatically map in sequence to Personas (Persona 1 receives LoRA 0, Persona 2 receives LoRA 1, etc.).
  3. **Explicit Key-Value**: `lora: Jane_v1:1.0` or `lora: <lora:Jane_v1:1.0>`.
  4. **Global Scene LoRAs**: Scene/style LoRAs defined under `[SCENE]` (e.g. `lora: <lora:chromafidelity:1.0>`) are automatically loaded globally across the entire model prior to regional conditioning.
  5. **Auto Trigger Word Discovery**: Automatically discovers trained trigger words from `.civitai.info` or safetensors headers and injects them into the persona's regional attention vector.

---

## Screenplay Script Format: Mode Selection

At the top of `[SCENE]`, specify `mode: Expressions` or `mode: Tags` to guide how prompts are compiled across different model architectures:

### 1. `mode: Expressions` (ChromaHD-1, Flux, SD3.5)
Ideal for modern diffusion models that excel at continuous descriptive prose, emotional nuances, and natural interactions:

```ini
[SCENE]
mode: Expressions
A sunlit luxury master bedroom with soft white linen sheets, warm morning sunlight streaming in through floor-to-ceiling windows, authentic 35mm film photography, 8k, intimate cinematic lighting.
all(__chromafidelity__)

[PERSONA 1]
lora: <lora:Jane_v1:1.0>
position: left   ; or box: 0.0, 0.2, 0.45, 1.0
Jane is an athletic toned woman with glowing natural skin texture, blue eyes, and loose wavy blonde hair. She is wearing a delicate lace bralette, sitting comfortably on the bed and leaning forward with an open sensual smile and warm relaxed expression.

[PERSONA 2]
lora: <lora:Jill_v1:1.0>
position: right  ; or box: 0.55, 0.15, 1.0, 1.0
Jill is resting comfortably on her side beside Jane with a curvy feminine physique, soft waist, brunette hair, and smiling eyes. Her silk robe is slipping off her shoulder as she gazes up affectionately into Jane's eyes.

[INTERACTION]
Two women sharing an intimate, tender moment on the bed. Jane is leaning in with one hand resting softly on Jill's hip, close skin-to-skin contact, bodies touching under the warm ambient morning light.
contact_blend: 0.25
```

### 2. `mode: Tags` (Pony V6, SDXL, SD1.5, Illustrious)
Ideal for tag-based models that thrive on comma-separated Danbooru tokens. Prompts are automatically cleaned, tokenized, and deduplicated into clean comma-separated lists:

```ini
[SCENE]
mode: Tags
masterpiece, best quality, ultra-detailed, 8k, luxury bedroom, morning sunlight, white bedsheets, window, indoor, cinematic lighting

[PERSONA 1]
lora: <lora:Jane_v1:1.0>
position: left
1girl, blonde hair, wavy hair, blue eyes, athletic body, toned, lace bralette, sitting, smiling, leaning forward, open mouth, blush

[PERSONA 2]
lora: <lora:Jill_v1:1.0>
position: right
1girl, brunette hair, brown eyes, curvy, soft waist, silk robe, off-shoulder, lying on side, looking at another, affectionate smile

[INTERACTION]
2girls, yuri, intimate, hand on hip, skin contact, touching, close together, romantic atmosphere
contact_blend: 0.25
```

### Global Negative Menu Integration
You no longer need to write `negative:` inside the script text! The Director automatically uses the negative prompt and preset library configured in **Zombiehaus Text Studio's** dedicated negative prompt menu (e.g. `all(__negative__)`).

---

## Key Features

1. **Scalable to N Personas**: Works with 2, 3, 4, 5, or more personas. Simply add more `[PERSONA 3]`, `[PERSONA 4]` blocks.
2. **Dual Prompt Modes**: Switch between `mode: Expressions` (natural prose for Chroma/Flux) and `mode: Tags` (comma-separated Danbooru tokens for Pony/SDXL) with a single header line.
3. **No Redundant Textarea**: The Director node is compact and clean—it accepts the screenplay via an input socket directly from `ZombiehausTextEditor`.
4. **Flexible Multi-LoRA Recognition**: Recognizes LoRAs whether passed via `ZombiehausTextEditor` prompt tags, upstream conditioning metadata, or direct script lines.
5. **Dual Positioning Engines**:
   - **Auto-Column Staging**: Uses `position: left`, `center`, `right`, or automatically divides the canvas into $N$ equal overlapping columns with smooth cosine bell curves.
   - **Freeform 2D Bounding Boxes**: Power users can specify `box: x1, y1, x2, y2` (normalized 0.0 to 1.0) with automatic Gaussian feathering for complex foreground/background formations.
6. **Global Scene & Interaction Coherence**:
   - `[SCENE]` and `[INTERACTION]` sections apply global cross-attention across the whole canvas, ensuring that shadows, lighting, reflections, and physical touch points match across all figures.
7. **Real-Time Script Summary**:
   - Outputs a readable summary of parsed personas, positions, and active LoRAs to connect to `ZombiehausShowText`.

---

## Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| **`pipe`** | `PIPE` | Required | Incoming Zombiehaus PIPE from `ZombiehausTextEditor` (containing model, clip, vae, and global negative conditioning). |
| **`script`** | `STRING` | Required (ForceInput) | Screenplay script input connected from `ZombiehausTextEditor.positive`. No redundant textarea on the node! |
| **`default_lora_strength`** | `FLOAT` | `0.85` | Default strength used when a persona specifies a LoRA without an explicit `:strength` suffix. |
| **`default_overlap_blend`** | `FLOAT` | `0.25` | Overlap percentage between adjacent personas allowing arms to wrap and bodies to touch naturally. |

### Outputs

| Output | Type | Description |
|---|---|---|
| **`pipe`** | `PIPE` | Unified PIPE with patched Model, CLIP, VAE, spatial regional conditionings, and upstream negative conditioning. |
| **`positive`** | `CONDITIONING` | Spatially conditioned regional positive conditioning vector. |
| **`negative`** | `CONDITIONING` | Upstream negative conditioning vector from Text Studio. |
| **`model`** | `MODEL` | Patched model containing all active persona LoRAs. |
| **`persona_masks`** | `MASK` | Batch of all generated spatial attention masks `[N, H, W]`. |
| **`script_summary`** | `STRING` | Formatted summary of parsed personas, positions, and loaded LoRAs for display in `ZombiehausShowText`. |

---

## Recommended Pipeline

```
[Pipeline Loader] ──> [pipe] ──> [ZombiehausTextEditor] ──> [pipe] ─────────> [ZombiehausSceneScriptDirector] ──> [pipe] ──> [KSampler] ──> [SaveImage]
                                        |                   [positive] ───> [script_input]                    |
                                        |                                                                      └──> [ShowText]
                                  (Screenplay Script + Syntax Highlighting)
```
