# Zombiehaus Persona Interact & Duo Director

The **Zombiehaus Persona Interact & Duo Director** (`ZombiehausPersonaInteract`) is an All-in-One node designed to take an existing image containing one person (Persona 1), generate a natural two-person interaction scene featuring a new character from a LoRA (Persona 2), and preserve both personas' identities without rigid inpainting masks.

---

## Why Canvas Interaction Replaces Inpainting

Inpainting into a cutout mask forces the diffusion model to generate into a rigid hole without global context, frequently resulting in severed limbs, distorted hands, and mismatched lighting. 

**`ZombiehausPersonaInteract`** solves this by using a holistic canvas architecture:
1. **Unified Multi-Person Generation**: The entire scene is sampled holistically at an adjustable `pose_flexibility` (denoise). The model naturally renders both figures leaning together, arms wrapping around shoulders/waists, hands gripping, and matching mutual shadows.
2. **LoRA-Driven Persona 2**: Persona 2 is generated directly using LoRA 2 and Prompt 2 loaded into the pipe.
3. **Automated Persona 1 Identity Restoration**: Persona 1's facial features and identity are detected from the original image, harmonized to the new lighting via Reinhard Lab color transfer, and feathered back onto Persona 1's body.
4. **Natural Pose Evolution**: Poses can change naturally (sitting beside, lying down, embracing, kissing, intimate stroking) while both characters remain completely recognizable.

---

## Key Features

1. **All-in-One Pipeline**: Combines canvas VAE encoding, unified KSampler generation, VAE decoding, YOLO face detection, Reinhard color harmonization, and feathered identity restoration in a single node.
2. **Pose Flexibility Slider (`pose_flexibility`)**:
   - `0.40–0.50`: Strictly retains the original room, bed/setting, and general posture of Persona 1 while introducing Persona 2 beside them.
   - `0.55–0.65` *(Recommended)*: Allows bodies to naturally lean in, wrap arms, kiss, and interact with perfect anatomical coherence.
   - `0.75+`: Complete creative freedom for dynamic new poses and camera perspectives.
3. **Identity Restore Strength (`identity_restore_strength`)**:
   - Seamlessly blends Persona 1's authentic face from the reference photo onto Persona 1's newly posed body.
   - Reinhard color transfer ensures that skin tones and lighting match the new scene's ambient lighting.
4. **Target Face Selection**:
   - `Auto (Detect Persona 1 by Position)`: Automatically tracks Persona 1's relative side in the image.
   - Also supports `Leftmost Face`, `Rightmost Face`, `Largest Face`, and explicit index overrides.
5. **Real-Time Dynamic Prompt Hints**:
   - Selecting any interaction mode instantly updates the connected `ZombiehausShowText` display with rich prompt phrasing.

---

## Inputs and Outputs

### Inputs

| Parameter | Type | Default | Description |
|---|---|---|---|
| **`image`** | `IMAGE` | Required | Reference/canvas photo containing Persona 1. |
| **`pipe`** | `PIPE` | Required | Pipeline containing Model, LoRA 2, CLIP, VAE, Positive, and Negative. |
| **`interaction_mode`** | Combo | `Sitting Beside (Intimate Contact)` | Interaction preset: Sitting Beside, Lying Beside, Handjob (Sitting, Lying, Kneeling), Kiss & Stroke, Kiss & Finger, Kiss & Breast Fondle, Oral, Cunnilingus, Paizuri, Intercourse (Straddling, Missionary, Doggy), Kissing, Holding Hands, Spooning, Lap Sitting, etc. |
| **`pose_flexibility`** | `FLOAT` | `0.58` (0.20 to 1.0) | How much poses can adapt. 0.50-0.65 provides the optimal balance of room fidelity and natural interaction posing. |
| **`identity_restore_strength`** | `FLOAT` | `0.85` (0.0 to 1.0) | Strength of Persona 1 face restoration. Uses Reinhard color transfer for seamless blending. |
| **`target_persona_face`** | Combo | `Auto (Detect Persona 1 by Position)` | Method used to identify Persona 1's face in the newly generated interaction image. |
| **`steps`** | `INT` | `30` (10 to 80) | Diffusion sampling steps. |
| **`cfg`** | `FLOAT` | `4.5` (1.0 to 20.0) | CFG guidance scale. |
| **`sampler_name`** | Combo | `euler` | KSampler sampling algorithm. |
| **`scheduler`** | Combo | `simple` | Noise scheduler. |
| **`seed`** | `INT` | `0` | Generation seed. |
| **`detector_model`** | Combo | `face_yolov8n.pt` | Face detection model from the ultralytics suite. |
| **`face_blend_feather`** | `INT` | `22` (4 to 64) | Feathering radius for the identity restoration mask. |

### Outputs

| Output | Type | Description |
|---|---|---|
| **`image`** | `IMAGE` | The finalized dual-persona interaction image with unified anatomy and lighting. |
| **`pipe`** | `PIPE` | Passthrough pipe for downstream texture restoration, detailing, or upscaling. |
| **`prompt_hint`** | `STRING` | Tailored prompt phrasing for the chosen interaction mode. |
| **`identity_mask`** | `MASK` | Mask indicating where Persona 1's identity restoration was applied. |

---

## Recommended Workflow Connection

```
[Load Image (Persona 1)] ──> [image]
                                    \
[LoRA Loader (Persona 2)] ──> [pipe] ──> [ZombiehausPersonaInteract] ──> [DeWax] ──> [Restormer] ──> [ModelUpscale] ──> [SaveImage]
                                                    |
                                            [prompt_hint] ──> [ZombiehausShowText]
```
