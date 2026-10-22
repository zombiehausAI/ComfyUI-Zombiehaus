# Zombiehaus Person Inpaint & Interaction Director

The **Zombiehaus Person Inpaint & Interaction Director** (`ZombiehausPersonInpaint`) is an All-in-One node designed to take an existing image containing one person, insert a second person (with their own LoRA and prompt), and give you complete freedom over how they interact (holding hands, kissing, embracing, sitting beside, or custom freeform interactions).

---

## Key Features

1. **All-in-One Architecture**: Combines mask refinement, contact overlap expansion, Gaussian feathering, 16px DiT-aligned VAE encoding, inpaint diffusion sampling, and pixel-level alpha compositing in a single node.
2. **Freedom of Interaction**:
   - Supports **100% freeform prompt-driven interactions** (touching, whispering, dancing, leaning, cuddling, holding hands, kissing, etc.).
   - Pre-tuned interaction presets configure optimal denoise levels and contact boundaries automatically.
3. **Dual Staging Options**:
   - **Manual Mask Mode**: Paint freely using ComfyUI's MaskEditor in `ZombiehausLoadImage`.
   - **YOLO Auto-Staging**: Automatically detects Person 1 via YOLO and generates an anatomically proportioned interaction mask (Beside Left/Right, Holding Hands, Kissing, Embrace) without manual brush painting.
4. **Contact Overlap Control (`contact_overlap_px`)**:
   - Expands the mask specifically across the boundary into Person 1 by *N* pixels.
   - Allows hands, lips, arms, and hair to wrap physically over Person 1 without requiring tedious manual overlap painting.
5. **Pixel-Perfect Base Preservation**:
   - Uses pixel-level alpha compositing with Gaussian feathering.
   - Unmasked pixels belonging to Person 1 are 100% mathematically identical to the original image—zero color shifts, zero blur, zero LoRA identity contamination.

---

## Inputs and Outputs

### Inputs

| Parameter | Type | Default | Description |
|---|---|---|---|
| **`image`** | `IMAGE` | Required | Base image containing Person 1. |
| **`pipe`** | `PIPE` | Required | Zombiehaus PIPE containing Model, CLIP, VAE, Positive, and Negative. |
| **`staging_mode`** | Combo | `Manual Mask (From Painted Image)` | `Manual Mask`, `Auto Masturbation / Handjob`, `Auto Oral / Fellatio`, `Auto Intercourse (Mounted/Side)`, `Auto Beside (Left/Right)`, `Auto Holding Hands`, `Auto Embrace`, `Auto Kissing`. |
| **`interaction_preset`**| Combo | `Partner Masturbation / Handjob (Denoise 0.88)` | Interaction style preset mapping to recommended denoise levels. |
| **`contact_overlap_px`**| `INT` | `24` (-64 to 128) | Pixels to expand the mask into Person 1 to enable physical touch/contact (knuckles, palms, hands wrapping). |
| **`edge_feather_px`** | `INT` | `14` (0 to 64) | Gaussian blur feathering radius for seamless boundary blending. |
| **`denoise`** | `FLOAT` | `0.88` (0.1 to 1.0) | Inpainting denoise strength. (Kissing/Oral ~0.85; Intercourse ~0.86; Masturbation/Handjob ~0.88; Holding hands ~0.90; Standing beside 1.0). |
| **`steps`** | `INT` | `30` (5 to 100) | Diffusion sampling steps. |
| **`cfg`** | `FLOAT` | `4.5` (1.0 to 20.0) | CFG guidance scale (4.0–4.5 recommended for ChromaHD / Flux). |
| **`sampler_name`** | Combo | `euler` | KSampler sampler algorithm. |
| **`scheduler`** | Combo | `simple` | KSampler noise scheduler. |
| **`seed`** | `INT` | `0` | Random generation seed. |
| **`optional_mask`** | `MASK` | Optional | User-painted mask from `ZombiehausLoadImage`. |
| **`positive_override`**| `CONDITIONING`| Optional | Explicit positive conditioning override. |
| **`negative_override`**| `CONDITIONING`| Optional | Explicit negative conditioning override. |

### Outputs

| Output | Type | Description |
|---|---|---|
| **`image`** | `IMAGE` | The finalized composited image with both people interacting naturally. |
| **`mask`** | `MASK` | The exact feathered mask used for the inpainting pass. |
| **`pipe`** | `PIPE` | Passthrough pipe for downstream detailing or upscaling. |
| **`prompt_hint`** | `STRING` | Tailored prompt suggestions, action keywords, and relational phrasing for the active preset. |


---

## Usage Guide

### 1. Manual Mask Painting (Maximum Precision)
1. In `ZombiehausLoadImage`, right-click and open **MaskEditor**.
2. Brush over where you want Person 2 to appear.
3. If they touch (e.g. holding hands or kissing), brush slightly over Person 1's hand or mouth.
4. Set `staging_mode` to `Manual Mask (From Painted Image)`.
5. Connect `image` and `mask` from `ZombiehausLoadImage` into `ZombiehausPersonInpaint`.

### 2. Auto-Staging Mode (Zero Painting)
1. Load your base picture.
2. Set `staging_mode` to `Auto Holding Hands (Right)` or `Auto Kissing / Face Contact`.
3. YOLO will locate Person 1, generate the contact mask, and inpaint Person 2 automatically!

---

## Troubleshooting

- **Person 2 doesn't touch Person 1**: Increase `contact_overlap_px` (e.g. from `16` to `24` or `32`) to give the diffusion model room to draw interlaced fingers or wrapping arms.
- **Harsh border seam visible**: Increase `edge_feather_px` (e.g. to `16` or `20`) for a softer Gaussian blend.
- **Person 1's face gets distorted during a kiss**: Lower `denoise` to `0.82`–`0.85` so the model retains Person 1's underlying facial proportions while redrawing the lips.
