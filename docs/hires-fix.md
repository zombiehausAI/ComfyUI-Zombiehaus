# All-in-One Hires Fix & Auto-Enhance

One-click resolution upscaling, 2nd-pass latent re-sampling, and skin texture restoration.

## Overview

In vanilla ComfyUI, setting up a high-resolution fix requires wiring 6 to 8 separate nodes: spatial upscalers, latent encoders, samplers, decoders, and post-processors. 

The **Zombiehaus All-in-One Hires Fix** (`ZombiehausHiresFix`) consolidates this entire pipeline into a single block with automated 16-pixel alignment for universal compatibility across SDXL, SD1.5, Chroma, and Flux.

## Pipeline Under the Hood

```
[Input Image] ──► [16px Spatial Upscale] ──► [VAE Encode] ──► [KSampler (Low Denoise)] ──► [VAE Decode] ──► [De-Wax Pores] ──► [Enhanced Image]
```

## Inputs

| Parameter | Type | Default | Description |
|---|---|---|---|
| `image` | IMAGE | Required | Image tensor to upscale and refine (supports single image or batches `[B, H, W, 3]`). |
| `pipe` | PIPE | Required | Zombiehaus pipe (model, clip, vae, positive, negative). |
| `scale_by` | FLOAT | `1.5` | Upscaling multiplier (1.1x to 4.0x). |
| `upscale_method`| COMBO | `bicubic` | Interpolation mode (`bicubic`, `bilinear`, `area`, `nearest-exact`). |
| `denoise` | FLOAT | `0.35` | 2nd-pass diffusion denoise (0.25 to 0.45 recommended). |
| `steps` | INT | `20` | Sampling steps for the refinement pass. |
| `cfg` | FLOAT | `5.0` | Guidance scale (use `1.0` for Flux.1-dev). |
| `sampler_name` | COMBO | `euler` | KSampler algorithm. |
| `scheduler` | COMBO | `karras` | Step scheduler. |
| `dewax_texture` | BOOLEAN | `True` | Injects natural skin pores and sensor grain to prevent plastic AI smoothing. |

## Batch Processing
`ZombiehausHiresFix` natively detects batches of images (`B > 1`). When a batch is supplied, the node iterates sequentially through each image one at a time, upscaling, re-sampling, and de-waxing each image individually before assembling the final tensor. This ensures peak VRAM usage remains identical to batch size 1, while preserving deterministic seeds (`seed + index`) across the batch.

## Outputs
- `enhanced_image`: High-resolution, sharp, refined output image (or image batch).
- `pipe`: Pass-through pipe for downstream saving or comparison.
