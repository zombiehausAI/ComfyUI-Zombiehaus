# Zombiehaus Dual Persona Director (Regional LoRA)

The **Zombiehaus Dual Persona Director** (`ZombiehausDualPersonaDirector`) is an advanced multi-character director node engineered to generate two distinct characters from two separate LoRAs interacting in a single scene with **complete full-body realism, independent character physiques, and zero concept bleed**.

---

## Why Regional LoRA Solves the "Actor Casting" Problem

A common workaround for multi-character generation is "Actor Casting" (face swapping / detailing faces only). However, this leaves both characters with identical or generic bodies. A LoRA trained on a character encodes not just their face, but their **entire body**:
- Bust size, waist, curves, and muscle tone
- Skin tone, freckles, and tattoos
- Signature clothing, fabrics, and aesthetics

If you load both LoRAs into the model simultaneously without spatial conditioning, the diffusion model blends both physiques and faces across both people ("concept bleeding").

**`ZombiehausDualPersonaDirector`** solves this through **Spatial Cross-Attention Masking**:
1. **Dual LoRA Weight Injection**: Dynamically patches both LoRA weights into the model and CLIP.
2. **Independent Regional Prompts**: 
   - Persona 1's prompt (body type, bust, curves, hair, face) is spatially bound to Region 1 (e.g. Left side).
   - Persona 2's prompt (body type, bust, curves, hair, face) is spatially bound to Region 2 (e.g. Right side).
3. **Physical Interaction Overlap Zone (`overlap_blend`)**:
   - A central cosine gradient zone allows arms to wrap, hands to touch or stroke, lips to press together, and reciprocal shadows to fall naturally.
   - The shared interaction prompt (*"two women sitting intimately together, bodies touching, authentic skin textures"*) governs the contact zone so the physical connection is 100% natural.

---

## Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| **`pipe`** | `PIPE` | Required | Incoming Zombiehaus PIPE from `ZombiehausModelLoader`. |
| **`persona1_lora`** | Combo | LoRA list | LoRA file for Persona 1. |
| **`persona1_strength`** | `FLOAT` | `0.85` (0.0 to 2.0) | Weight for Persona 1's LoRA. |
| **`persona1_prompt`** | `STRING` | Multiline | Trigger words, face details, bust, waist, physique, and clothing for Persona 1. |
| **`persona2_lora`** | Combo | LoRA list | LoRA file for Persona 2. |
| **`persona2_strength`** | `FLOAT` | `0.85` (0.0 to 2.0) | Weight for Persona 2's LoRA. |
| **`persona2_prompt`** | `STRING` | Multiline | Trigger words, face details, bust, waist, physique, and clothing for Persona 2. |
| **`layout`** | Combo | `Persona 1 Left \| Persona 2 Right` | Spatial arrangement: Left/Right or Top/Bottom. |
| **`overlap_blend`** | `FLOAT` | `0.25` (0.05 to 0.60) | Width of the central cosine blending zone where both characters physically touch and interact. |
| **`interaction_preset`** | Combo | `Sitting Beside (Intimate Contact)` | Presets for Sitting Beside, Lying Beside, Handjob (Sitting, Lying, Kneeling), Kiss & Stroke, Kiss & Finger, Oral, Cunnilingus, Paizuri, Intercourse, Spooning, etc. |
| **`interaction_prompt`** | `STRING` | Multiline | Shared physical action, posture, touch points, lighting, and ambient environment. |
| **`negative_prompt`** | `STRING` | Multiline | Negative quality prompt. |

### Outputs

| Output | Type | Description |
|---|---|---|
| **`pipe`** | `PIPE` | Complete unified PIPE containing patched Model, CLIP, VAE, spatially-masked positive conditioning, and negative conditioning. Ready to feed directly into `ZombiehausKSampler` or `ZombiehausImg2ImgVAEEncode`. |
| **`positive`** | `CONDITIONING` | Spatially conditioned regional positive conditioning vector. |
| **`negative`** | `CONDITIONING` | Negative conditioning vector. |
| **`model`** | `MODEL` | Model patched with both LoRA weights. |
| **`persona1_mask`** | `MASK` | Visual mask representation of Persona 1's spatial region. |
| **`persona2_mask`** | `MASK` | Visual mask representation of Persona 2's spatial region. |
| **`prompt_hint`** | `STRING` | Tailored phrasing suggestions for the active interaction preset. |

---

## Recommended Pipeline

```
[Model Loader] ──> [pipe] ──> [ZombiehausDualPersonaDirector] ──> [pipe] ──> [KSampler] ──> [DeWax] ──> [Restormer] ──> [ModelUpscale] ──> [SaveImage]
                                        |                                        ^
                                        └─────── [prompt_hint] ──> [ShowText]   [Latent Preset]
```
