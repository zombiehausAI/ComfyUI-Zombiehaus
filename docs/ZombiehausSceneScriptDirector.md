# Zombiehaus Scene Script Director (N-Persona)

The **Zombiehaus Scene Script Director** (`ZombiehausSceneScriptDirector`) is an advanced screenplay-style multi-character director node engineered to direct **2 to N personas** in a single image, each with their own independent LoRA, appearance, physique, and pose, with zero concept bleeding and natural physical interaction.

---

## Text Editor Integration & Syntax Highlighting

The Scene Script Director is designed to pair directly with **Zombiehaus Text Studio** (`ZombiehausTextEditor`):

- **Live Syntax Highlighting**: Section dividers like `[SCENE]`, `[PERSONA 1]`, `[PERSONA 2]`, and `[INTERACTION]` are automatically recognized with highest token priority (`Priority 0`) and rendered as glowing section banners (`.zombiehaus-section-banner`).
- **Prompt Preset Saving & Loading**: Full multi-character screenplays can be saved as JSON presets in your `saved_prompts/` directory, categorized, and loaded on demand.
- **LoRA Recognition**: The Director seamlessly resolves LoRAs however you pass them:
  1. **Prompt LoRA Tags**: `<lora:AudraMiller:0.85>` written anywhere inside a `[PERSONA]` block or using `$woman.lora` variable expansions.
  2. **Upstream LoRA Metadata**: Extracted `<lora:...>` tags passed via `pipe` or conditioning from `ZombiehausTextEditor` automatically map in sequence to Personas (Persona 1 receives LoRA 0, Persona 2 receives LoRA 1, etc.).
  3. **Explicit Key-Value**: `lora: AudraMiller:0.85` or `lora: <lora:AudraMiller:0.85>`.
  4. **Global Scene LoRAs**: Scene/style LoRAs defined under `[SCENE]` (e.g. `lora: <lora:chromafidelity:1.0>`) are automatically loaded globally across the entire model prior to regional conditioning.
  5. **Auto Trigger Word Discovery**: Automatically discovers trained trigger words from `.civitai.info` or safetensors headers and injects them into the persona's regional attention vector.

---

## Screenplay Script Format

Write the scene cleanly in a single text block inside `ZombiehausTextEditor`:

```ini
[SCENE]
location: a sunlit luxury bedroom, white linen sheets, warm morning sunlight, authentic 35mm film photography, 8k
lora: <lora:chromafidelity:1.0>
negative: deformed, distorted, extra limbs, bad anatomy, bad hands, plastic skin, blur, watermark, lowres

[PERSONA 1]
<lora:AudraMiller:0.85>
position: left   ; or box: 0.0, 0.2, 0.45, 1.0
appearance: 1woman, athletic toned body, natural skin texture, blonde wavy hair, blue eyes
clothing: lace bralette
pose: sitting on the bed, leaning forward with an open sensual smile

[PERSONA 2]
lora: Chloe_v2:0.85
position: right  ; or box: 0.55, 0.15, 1.0, 1.0
appearance: 1woman, curvy feminine physique, soft waist, pale skin, brunette hair, brown eyes
clothing: silk robe slipping off shoulder
pose: lying comfortably on her side beside her, looking up into her eyes

[INTERACTION]
action: two women interacting intimately, one leaning in with hand resting on the other's hip, bodies close, natural skin contact, warm ambient lighting
contact_blend: 0.25
```

---

## Key Features

1. **Scalable to N Personas**: Works with 2, 3, 4, 5, or more personas. Simply add more `[PERSONA 3]`, `[PERSONA 4]` blocks.
2. **Flexible Multi-LoRA Recognition**: Recognizes LoRAs whether passed via `ZombiehausTextEditor` prompt tags, upstream conditioning metadata, or direct script lines.
3. **Dual Positioning Engines**:
   - **Auto-Column Staging**: Uses `position: left`, `center`, `right`, or automatically divides the canvas into $N$ equal overlapping columns with smooth cosine bell curves.
   - **Freeform 2D Bounding Boxes**: Power users can specify `box: x1, y1, x2, y2` (normalized 0.0 to 1.0) with automatic Gaussian feathering for complex foreground/background formations.
4. **Global Scene & Interaction Coherence**:
   - `[SCENE]` and `[INTERACTION]` sections apply global cross-attention across the whole canvas, ensuring that shadows, lighting, reflections, and physical touch points match across all figures.
5. **Real-Time Script Summary**:
   - Outputs a readable summary of parsed personas, positions, and active LoRAs to connect to `ZombiehausShowText`.

---

## Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| **`pipe`** | `PIPE` | Required | Incoming Zombiehaus PIPE (from `ZombiehausModelLoader` or `ZombiehausTextEditor`). |
| **`script`** | `STRING` | Multiline | Internal screenplay script fallback if no upstream editor is connected. |
| **`script_input`** | `STRING` | Optional (ForceInput) | Screenplay script input connected from `ZombiehausTextEditor.positive`. |
| **`default_lora_strength`** | `FLOAT` | `0.85` | Default strength used when a persona specifies a LoRA without an explicit `:strength` suffix. |
| **`default_overlap_blend`** | `FLOAT` | `0.25` | Overlap percentage between adjacent personas allowing arms to wrap and bodies to touch naturally. |

### Outputs

| Output | Type | Description |
|---|---|---|
| **`pipe`** | `PIPE` | Unified PIPE with patched Model, CLIP, VAE, spatial regional conditionings, and negative conditioning. |
| **`positive`** | `CONDITIONING` | Spatially conditioned regional positive conditioning vector. |
| **`negative`** | `CONDITIONING` | Negative conditioning vector. |
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
