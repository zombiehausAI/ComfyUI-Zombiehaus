# Zombiehaus Embedding Loader

Load, format, and weight positive and negative textual inversion embeddings for direct connection into **Zombiehaus Text Editor** and ComfyUI CLIP encoding workflows.

---

## Overview

The **Zombiehaus Embedding Loader** dynamically discovers textual inversion embeddings in your ComfyUI `models/embeddings/` folder (including nested subfolders) and formats them into ComfyUI-compliant prompt tokens (e.g. `embedding:easynegative.safetensors` or `(embedding:badhandv4:1.25)`).

It features dedicated positive and negative slots with strength sliders, secondary slots, optional string chaining, and file extension stripping. The outputs wire directly into the `positive_embedding` and `negative_embedding` input sockets of the **Zombiehaus Text Editor**.

---

## Features

- **Automated Directory Scanning**: Automatically lists all `.safetensors`, `.pt`, `.bin`, and `.ckpt` files in `models/embeddings/` and subdirectories with case-insensitive alphabetical sorting.
- **Dedicated Positive & Negative Outputs**: Emits formatted tokens via `positive_embedding` and `negative_embedding` strings, matching the input socket names on the **Text Editor**.
- **Adjustable Weight Sliders**: Each slot provides a continuous weight slider (`0.0` to `2.0`, step `0.05`):
  - Weight `1.0`: formats cleanly as `embedding:<name>`.
  - Weight $\ne$ `1.0`: formats with standard ComfyUI token weighting syntax `(embedding:<name>:<weight>)`.
  - Weight $\le$ `0.0`: automatically skips and disables that embedding without requiring you to switch the dropdown.
- **Secondary & Multi-Slot Stacking**: Includes secondary positive and secondary/tertiary negative slots (ideal for stacking multiple negative embeddings such as `easynegative`, `bad-hands-5`, and `fastnegative`).
- **Chainable String Inputs**: Optional `positive_in` and `negative_in` sockets allow prepending or chaining existing prompt fragments or prior embedding loader nodes.
- **Extension Stripping Option**: Toggle `strip_extension` to clean up token names (e.g. `embedding:easynegative` instead of `embedding:easynegative.safetensors`).

---

## Inputs

### Required

| Name | Type | Default | Description |
|---|---|---|---|
| `positive_embedding` | COMBO | `none` | Primary positive textual inversion embedding from `models/embeddings/`. |
| `positive_weight` | FLOAT (slider) | `1.0` | Strength weight for primary positive embedding (`0.0` to `2.0`, step `0.05`). |
| `negative_embedding` | COMBO | `none` | Primary negative textual inversion embedding from `models/embeddings/`. |
| `negative_weight` | FLOAT (slider) | `1.0` | Strength weight for primary negative embedding (`0.0` to `2.0`, step `0.05`). |
| `strip_extension` | BOOLEAN | `False` | When enabled, removes file extensions (`.safetensors`, `.pt`, etc.) from token names. |

### Optional

| Name | Type | Default | Description |
|---|---|---|---|
| `positive_embedding_2` | COMBO | `none` | Secondary positive embedding slot. |
| `positive_weight_2` | FLOAT (slider) | `1.0` | Strength weight for secondary positive embedding. |
| `negative_embedding_2` | COMBO | `none` | Secondary negative embedding slot. |
| `negative_weight_2` | FLOAT (slider) | `1.0` | Strength weight for secondary negative embedding. |
| `negative_embedding_3` | COMBO | `none` | Tertiary negative embedding slot. |
| `negative_weight_3` | FLOAT (slider) | `1.0` | Strength weight for tertiary negative embedding. |
| `positive_in` | STRING | `None` | (forceInput) Optional incoming positive string to prepend or chain. |
| `negative_in` | STRING | `None` | (forceInput) Optional incoming negative string to prepend or chain. |

---

## Outputs

| Name | Type | Description |
|---|---|---|
| `positive_embedding` | STRING | Comma-delimited formatted positive embedding tokens ready to connect to **Zombiehaus Text Editor**. |
| `negative_embedding` | STRING | Comma-delimited formatted negative embedding tokens ready to connect to **Zombiehaus Text Editor**. |

---

## Wiring & Usage Guide

### Direct Connection to Zombiehaus Text Editor

```
┌─────────────────────────────────┐
│   Zombiehaus Embedding Loader   │
├─────────────────────────────────┤
│ positive_embedding ─────────────┼──► positive_embedding ┐
│ negative_embedding ─────────────┼──► negative_embedding │
└─────────────────────────────────┘                       ▼
                                      ┌────────────────────────────────┐
                                      │    Zombiehaus Text Editor      │
                                      ├────────────────────────────────┤
                                      │ Appends tokens cleanly to      │
                                      │ positive & negative prompts!   │
                                      └────────────────────────────────┘
```

1. Add the **Zombiehaus Embedding Loader** node (`Add Node` $\rightarrow$ `Zombiehaus` $\rightarrow$ `Loaders` $\rightarrow$ `Zombiehaus Embedding Loader`).
2. Select your desired positive embedding (e.g. style or character embedding) and negative embedding (e.g. `easynegative` or `bad-hands-5`).
3. Connect `positive_embedding` output into the `positive_embedding` input on **Zombiehaus Text Editor**.
4. Connect `negative_embedding` output into the `negative_embedding` input on **Zombiehaus Text Editor**.
5. During execution, **Zombiehaus Text Editor** automatically appends the formatted tokens to your prompts before CLIP encoding.

---

## Tips & Best Practices

1. **Quick Bypass via Weight**: Setting any weight slider to `0.0` automatically disables that embedding from emitting without needing to change your dropdown selection.
2. **Subfolder Support**: Embeddings located in subfolders (e.g. `models/embeddings/SDXL/my_embed.safetensors`) are displayed with forward-slash paths and formatted properly for ComfyUI.
3. **Inspect with Show Text**: You can connect either output directly into a **Zombiehaus Show Text** node to view the exact token strings generated.
4. **ComfyUI Model Compatibility**: Ensure your selected textual inversion matches your active diffusion checkpoint (e.g. SD 1.5 embeddings for SD 1.5 models, SDXL embeddings for SDXL / Pony models).

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Dropdown only shows `none` | No embedding files found in `models/embeddings/` | Place `.safetensors` or `.pt` embedding files in your ComfyUI `models/embeddings/` directory and refresh or restart ComfyUI. |
| Embedding has no effect in generation | Model architecture mismatch | Verify that the embedding was trained for the architecture of your base model (SD 1.5 vs SDXL vs Flux). |
| Weight values appear wrapped in parentheses | Normal ComfyUI syntax | Whenever weight $\ne$ 1.0, ComfyUI requires `(embedding:name:weight)` syntax so the CLIP text encoder applies the attention multiplier. |
