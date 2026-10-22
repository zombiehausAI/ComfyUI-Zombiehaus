# Zombiehaus Person Inpaint & Interaction Director

The **Zombiehaus Person Inpaint & Interaction Director** (`ZombiehausPersonInpaint`) is an All-in-One node designed to take an existing image containing one person, insert a second person (with their own LoRA and prompt), and give you complete freedom over how they interact (holding hands, kissing, sexual contact, masturbation, oral, intercourse, or multi-action combos like kissing while fingering/stroking).

---

## Key Features

1. **All-in-One Architecture**: Combines mask refinement, contact overlap expansion, Gaussian feathering, 16px DiT-aligned VAE encoding, inpaint diffusion sampling, and pixel-level alpha compositing in a single node.
2. **Targeted Anatomical YOLO Integration & Dual-Target Combos**:
   - Leverages the repository's ultralytics detailer model suite (`penis.pt`, `female_breast-v4.2.pt`, `vagina-v3.2.pt`, `lips_v1.pt`, `hand_yolov8n.pt`, `adetailerFootYolov8x_v20.pt`, `person_yolov8n-seg.pt`).
   - Supports **Dual-Target Detection** for simultaneous actions: for example, in `Kiss & Finger` or `Kiss & Stroke`, it detects both the upper target (`lips_v1.pt`) and the lower target (`vagina-v3.2.pt` or `penis.pt`), generating a unified contact mask that joins the face, the groin, and the connecting torso bridge for Person 2's reaching arm!
3. **Flexible Multi-Posture Staging**:
   - Handjob/masturbation is not restricted to kneeling: choose from `Versatile (Sitting / Kneeling / Beside)`, `Sitting Beside (Lateral Contact)`, `Kneeling (Below)`, or `Lying Beside`.
4. **Comprehensive Presets & Dynamic Prompt Hints**:
   - Covers both intimate/sexual interactions, romantic/social interactions, and multi-action combos.
   - Dynamically outputs rich, evocative prompt suggestions through the `prompt_hint` output (viewable in `ZombiehausShowText`).
5. **Contact Overlap Control (`contact_overlap_px`)**:
   - Expands the mask specifically across the boundary into Person 1 by *N* pixels.
   - Allows hands, lips, arms, and hair to wrap physically over Person 1 without requiring tedious manual overlap painting.
6. **Pixel-Perfect Base Preservation**:
   - Uses pixel-level alpha compositing with Gaussian feathering.
   - Unmasked pixels belonging to Person 1 are 100% mathematically identical to the original image—zero color shifts, zero blur, zero LoRA identity contamination.

---

## Inputs and Outputs

### Inputs

| Parameter | Type | Default | Description |
|---|---|---|---|
| **`image`** | `IMAGE` | Required | Base image containing Person 1. |
| **`pipe`** | `PIPE` | Required | Zombiehaus PIPE containing Model, CLIP, VAE, Positive, and Negative. |
| **`staging_mode`** | Combo | `Auto (Match Interaction Preset)` | `Auto (Match Interaction Preset)`, `Manual Mask (From Painted Image)`, or specific Auto modes for Masturbation (Versatile, Sitting Beside, Kneeling, Lying Beside), Multi-Action Combos (Kiss & Finger, Kiss & Stroke, Kiss & Breast Fondle, Paizuri & Kiss, Full Frontal), Oral, Cunnilingus, Paizuri, Intercourse, Kissing, Holding Hands, Spooning, Lap Sitting, Beside, etc. |
| **`interaction_preset`**| Combo | `Partner Masturbation / Handjob - Sitting Beside (Denoise 1.0)` | Interaction style preset mapping to rich prompt suggestions. |
| **`contact_overlap_px`**| `INT` | `24` (-64 to 128) | Pixels to expand the mask into Person 1 to enable physical touch/contact (knuckles, palms, hands wrapping). |
| **`edge_feather_px`** | `INT` | `14` (0 to 64) | Gaussian blur feathering radius for seamless boundary blending. |
| **`denoise`** | `FLOAT` | `1.0` (0.1 to 1.0) | Inpainting denoise strength. Set to `1.0` for full generation of Person 2 from scratch. Lower (e.g. 0.85-0.90) for subtle blending. |
| **`steps`** | `INT` | `30` (5 to 100) | Diffusion sampling steps. |
| **`cfg`** | `FLOAT` | `4.5` (1.0 to 20.0) | CFG guidance scale (4.0–4.5 recommended for ChromaHD / Flux). |
| **`sampler_name`** | Combo | `euler` | KSampler sampler algorithm. |
| **`scheduler`** | Combo | `simple` | KSampler noise scheduler. |
| **`seed`** | `INT` | `0` | Random generation seed. |
| **`optional_mask`** | `MASK` | Optional | User-painted mask from `ZombiehausLoadImage`. |
| **`detector_model`** | Combo | `Auto (Targeted by Preset)` | Automatically picks the right detector from the detailer suite (`penis.pt`, `female_breast-v4.2.pt`, `vagina-v3.2.pt`, etc.), or allows manually selecting any installed detector. |
| **`detection_confidence`** | `FLOAT` | `0.35` (0.1 to 0.95) | Confidence threshold for YOLO detection. |
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

## Targeted Detector Suite & Combo Mapping

When `detector_model` is set to `Auto (Targeted by Preset)`:

| Staging Mode / Preset | Upper Target Detector | Lower Target Detector | Spatial Coverage |
|---|---|---|---|
| **Combo: Kiss & Finger / Caress** | `lips_v1.pt` (face) | `vagina-v3.2.pt` (groin) | Lips + Vulva + Lateral Torso & Arm Bridge |
| **Combo: Kiss & Stroke / Handjob** | `lips_v1.pt` (face) | `penis.pt` (pelvis) | Lips + Shaft + Lateral Torso & Arm Bridge |
| **Combo: Kiss & Breast Fondle** | `lips_v1.pt` (face) | `female_breast-v4.2.pt` (chest) | Lips + Breasts + Chest Contact |
| **Combo: Paizuri & Kiss** | `female_breast-v4.2.pt` | `lips_v1.pt` | Breasts + Lips meeting |
| **Combo: Embrace & Intimate Touch** | `face-yolo8n.pt` / `person` | `vagina-v3.2.pt` / `penis.pt` | Torso + Groin Contact |
| **Full Frontal Contact** | `lips_v1.pt` / `face` | `vagina-v3.2.pt` / `penis.pt` | Full longitudinal contact plane (Head to Thighs) |
| **Masturbation (Sitting Beside)** | `penis.pt` | None | Penis + Lateral seated torso & reaching arm |
| **Masturbation (Lying Beside)** | `penis.pt` | None | Penis + Lateral reclining bed breadth |
| **Masturbation (Kneeling)** | `penis.pt` | None | Penis + Forward/downward inter-leg space |
| **Masturbation (Versatile)** | `penis.pt` | None | Penis + Combined lateral & downward space |
| **Oral / Fellatio / Blowjob** | `penis.pt` | None | Penis + Inter-leg kneeling space |
| **Cunnilingus / Pussy Licking** | `vagina-v3.2.pt` | None | Vulva + Inter-leg space |
| **Paizuri / Breast Play** | `female_breast-v4.2.pt` | None | Cleavage + partner torso space |
| **Intercourse (Cowgirl, Missionary, Doggy)**| `vagina-v3.2.pt` / `penis.pt` | None | Pelvis & hip overlap |
| **Kissing / Intimate** | `lips_v1.pt` / `face-yolo8n.pt` | None | Lips + Forward tilt space |
| **Holding Hands** | `hand_yolov8n.pt` | None | Hand + Arm space |
| **Footjob / Soles Contact** | `adetailerFootYolov8x_v20.pt` | None | Feet + Body space |

---

## Usage Guide

### 1. Multi-Action Combos (e.g. Kiss & Finger or Kiss & Stroke)
1. Load your base picture.
2. Select `staging_mode`: `Auto Combo: Kiss & Finger / Caress (Face + Groin Contact)` (or `Kiss & Stroke`).
3. Leave `detector_model` on `Auto (Targeted by Preset)`. The node will locate both the lips/face and the pelvic region, and generate an integrated contact mask spanning both regions and the reaching arm.
4. Copy or adapt the suggested text in the `ZombiehausShowText` display into your Prompt 2 / LoRA 2 box.

### 2. Flexible Handjobs (Sitting, Kneeling, Lying)
- If Person 1 is on a bed or couch and you want Person 2 sitting beside them, choose **`Auto Masturbation / Handjob (Sitting Beside / Lateral Contact)`** or **`Auto Masturbation / Handjob - Versatile`**.
- The mask provides full lateral width from waist to knees, allowing Person 2 to sit upright or lean over with an arm reaching across.

### 3. Manual Mask Painting (Maximum Precision)
1. In `ZombiehausLoadImage`, right-click and open **MaskEditor**.
2. Brush over the desired regions on Person 1 (e.g. lips and groin) and the adjacent space where Person 2 should appear.
3. Set `staging_mode` to `Manual Mask (From Painted Image)`.

---

## Troubleshooting

- **Person 2 doesn't touch Person 1**: Increase `contact_overlap_px` (e.g. from `16` to `24` or `32`) to give the diffusion model room to draw interlaced fingers or wrapping arms.
- **Harsh border seam visible**: Increase `edge_feather_px` (e.g. to `16` or `20`) for a softer Gaussian blend.
- **Person 1's face gets distorted during a kiss**: Lower `denoise` to `0.82`–`0.85` so the model retains Person 1's underlying facial proportions while redrawing the lips.
- **Detector doesn't trigger on stylized art**: The node automatically falls back to person-level geometry, but you can also lower `detection_confidence` to `0.20` or switch to `Manual Mask (From Painted Image)`.
