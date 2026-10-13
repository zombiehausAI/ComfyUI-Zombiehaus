# Zombiehaus Wardrobe Inpaint

Virtual try-on, outfit replacement, and targeted garment segmentation.

---

## Overview

The **Zombiehaus Wardrobe Inpaint** (`ZombiehausWardrobeInpaint`) node enables automated clothing replacement, fabric redesign, and virtual try-on workflows directly in ComfyUI.

Unlike general detailers that preserve underlying pixel content in the latent space (causing ghosting or fabric bleed through), `ZombiehausWardrobeInpaint` combines semantic garment segmentation using Hugging Face's `mattmdjaga/segformer_b2_clothes` (fine-tuned on the ATR dataset) with ComfyUI's native **VAEEncodeForInpaint** and **KSampler**. This zeroes out the masked garment region to neutral gray before encoding, allowing the diffusion model to synthesize completely new outfits, textures, cuts, and colors strictly from your positive prompt.

---

## Features

- **Semantic Clothing Segmentation**: Employs `mattmdjaga/segformer_b2_clothes` SegFormer architecture for robust pixel-accurate clothing and accessory recognition.
- **Categorical Presets**: Instant selection across major garment categories:
  - `all_garments`: Segments all wearable clothing and accessories (tops, bottoms, dresses, hats, belts, shoes, scarves, bags).
  - `torso`: Isolates upper-body clothing (shirts, tops, dresses, scarves).
  - `lower`: Isolates bottom-wear (pants, jeans, skirts, belts).
  - `full_outfit`: Targets the complete main outfit (upper clothes, skirts, pants, dresses, belts, scarves), preserving shoes and headwear.
  - `shoes`: Isolates footwear (left shoe, right shoe).
- **Mask Dilation & Gaussian Feathering**:
  - `grow_mask`: Expands or shrinks the mask boundary to cover seams and prevent old garment halos.
  - `blur_mask`: Applies soft Gaussian blur to feather edges for a natural blend into skin and backdrops.
- **Clean Inpaint Architecture**: Uses `VAEEncodeForInpaint` + `KSampler` + `VAEDecode` rather than standard `VAEEncode`, ensuring original garment patterns and colors do not bleed into the new outfit.
- **Flexible Pipeline Routing**: Accepts direct `MODEL`, `VAE`, `CONDITIONING` inputs or a single Zombiehaus `PIPE`.
- **Batch Processing**: Supports batched image tensors (`[B, H, W, C]`), segmenting and inpainting each image seamlessly.

---

## Presets & ATR Class Taxonomy

The node maps Hugging Face `mattmdjaga/segformer_b2_clothes` 18 ATR categories to high-level presets:

| Preset | Included ATR Classes | Description |
|---|---|---|
| `all_garments` | Hat (1), Upper-clothes (4), Skirt (5), Pants (6), Dress (7), Belt (8), Left-shoe (9), Right-shoe (10), Bag (16), Scarf (17) | Complete clothing and accessory coverage. |
| `torso` | Upper-clothes (4), Dress (7), Scarf (17) | Tops, shirts, jackets, sweaters, dresses, and neckwear. |
| `lower` | Skirt (5), Pants (6), Belt (8) | Pants, jeans, shorts, skirts, and waistbands. |
| `full_outfit` | Upper-clothes (4), Skirt (5), Pants (6), Dress (7), Belt (8), Scarf (17) | Complete primary wardrobe replacement excluding footwear and hats. |
| `shoes` | Left-shoe (9), Right-shoe (10) | Shoes, boots, heels, and sneakers. |

---

## Inputs & Outputs

### Inputs

| Name | Type | Default | Description |
|---|---|---|---|
| `image` | IMAGE | — | Input image containing the person/subject. |
| `preset` | COMBO | `all_garments` | Segmentation preset (`all_garments`, `torso`, `lower`, `full_outfit`, `shoes`). |
| `grow_mask` | INT | `16` | Pixels to dilate (grow) or erode (shrink) the garment mask. |
| `blur_mask` | INT | `8` | Gaussian blur radius in pixels for feathered edge blending. |
| `do_inpaint` | BOOLEAN | `True` | When `True`, performs diffusion inpainting. When `False`, outputs segmented `garment_mask` only. |
| `seed` | INT | `0` | Random seed for sampling. |
| `steps` | INT | `20` | Sampling steps for inpainting. |
| `cfg` | FLOAT | `7.0` | Classifier-Free Guidance scale. |
| `denoise` | FLOAT | `1.0` | Denoising strength (`1.0` replaces the garment completely; `< 1.0` retains partial structure). |
| `sampler` | COMBO | `euler` | KSampler sampling algorithm. |
| `scheduler` | COMBO | `normal` | Noise scheduler. |
| `pipe` | PIPE (optional) | — | Zombiehaus pipe carrying `(model, clip, vae, positive, negative)`. |
| `model` | MODEL (optional) | — | Diffusion model (overrides pipe). |
| `vae` | VAE (optional) | — | VAE encoder/decoder (overrides pipe). |
| `positive` | CONDITIONING (optional) | — | Positive prompt conditioning describing the new garment/outfit. |
| `negative` | CONDITIONING (optional) | — | Negative prompt conditioning. |

### Outputs

| Name | Type | Description |
|---|---|---|
| `image` | IMAGE | Final image with new garment inpainted (or original image if `do_inpaint` is `False`). |
| `garment_mask` | MASK | Generated binary/feathered garment mask (`[B, H, W]`). |

---

## Usage Guide

### 1. Outfit Replacement with Zombiehaus Pipe

Connect a loaded pipe from your model and text encoder directly into `ZombiehausWardrobeInpaint`:

```
[Zombiehaus Model Loader]
       │ (pipe)
       ▼
[Zombiehaus Multi-CLIP Text Encode] (Positive: "wearing an elegant emerald green silk evening gown")
       │ (pipe)
       ▼
[Zombiehaus Wardrobe Inpaint] ◄── [Load Image / Previous Node] (image)
       │
       ├─► image ────────► [Save Image / Image Preview]
       └─► garment_mask ─► [Mask Preview / Tools]
```

### 2. Standalone Inpainting (Individual Sockets)

You can connect individual `MODEL`, `VAE`, `positive`, and `negative` conditioning links without using a pipe:

- Connect your base `MODEL` and `VAE`.
- Connect a `CLIP Text Encode` node with your desired new garment description (e.g., `"distressed black leather biker jacket with silver zippers, white cotton t-shirt"`) to `positive`.
- Set `preset` to `torso`.
- Run generation to replace only the upper clothing.

### 3. Segmentation Only (Mask Generation)

To generate clothing masks for downstream workflows without running an inpainting pass:
- Set `do_inpaint` to `False`.
- The node performs SegFormer segmentation, grows/blurs the mask, and outputs the resulting `garment_mask` while passing `image` through untouched.

---

## Tips & Best Practices

1. **Full Replacement vs. Restyling (`denoise`)**:
   - For complete outfit changes (new style, color, fabric, cut), keep `denoise` at `1.0`.
   - For recoloring or subtle texture adjustments (e.g. turning blue jeans into black denim), set `denoise` between `0.65` and `0.85`.
2. **Grow Mask (`grow_mask`)**:
   - Clothing boundaries often have slight sub-pixel anti-aliasing or thin outlines against skin and background. Setting `grow_mask` between `12` and `20` px ensures the boundary of the old garment is fully engulfed.
3. **Feathering (`blur_mask`)**:
   - A `blur_mask` radius of `6` to `12` px creates a smooth gradient across skin boundaries (necklines, wrists, waistlines), preventing visible seams.
4. **Prompting the New Garment**:
   - Focus your positive prompt on the clothing items matching your preset. For example, if `preset` is `torso`, describe `"a tailored burgundy velvet blazer, crisp collared shirt"`.
   - Adding fit and fabric descriptors (e.g., `"silk"`, `"matte cotton"`, `"ribbed knit"`, `"oversized silhouette"`) significantly improves realism.

---

## Troubleshooting

- **Error: `transformers is required for ZombiehausWardrobeInpaint`**:
  - Run `pip install transformers` in your ComfyUI Python environment.
- **Model downloading on first run**:
  - On the first execution, `mattmdjaga/segformer_b2_clothes` is automatically downloaded from Hugging Face and cached locally. Subsequent runs will load instantly from cache.
- **Old fabric colors still visible at edges**:
  - Increase `grow_mask` (e.g., from `16` to `24`) and `blur_mask` (e.g., from `8` to `12`) to expand the inpaint region slightly past the boundary of the original clothing.
- **Missing Inputs Error**:
  - When `do_inpaint` is `True`, ensure either a `pipe` or individual `model`, `vae`, and `positive` conditioning inputs are connected.
