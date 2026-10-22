# Zombiehaus Pipe Bus (Distribution)

The **Zombiehaus Pipe Bus** (`ZombiehausPipeBus`) is a centralized master pipeline distribution and bus node for ComfyUI. It consolidates disparate connections into a clean single distribution hub, completely eliminating wire clutter and spaghetti across complex workflows.

---

## Overview

In advanced workflows, passing individual connections (`MODEL`, `CLIP`, `VAE`, `CONDITIONING`, `LATENT`, `IMAGE`, `SEED`) across dozens of distant nodes leads to tangled, unreadable spaghetti wires. 

`ZombiehausPipeBus` solves this with a versatile two-in-one architecture:
1. **Pipeline Aggregator / Override**: Takes an incoming `pipe` and/or any individual components. If you connect an individual input (e.g. a patched `MODEL` or a new `LATENT`), it automatically updates the pipe with that component.
2. **Distribution Tap / Fan-Out**: Unpacks and exposes dedicated, clean outputs for every single pipeline element (`pipe`, `model`, `clip`, `vae`, `positive`, `negative`, `latent`, `image`, `seed`), allowing you to fan them out locally to any downstream node.

---

## Universal Compatibility

The outgoing `pipe` is wrapped in a dual-access `ZombiehausPipe` object that supports both:
- **Tuple Indexing**: `pipe[0]` (MODEL), `pipe[1]` (CLIP), `pipe[2]` (VAE), `pipe[3]` (POSITIVE), `pipe[4]` (NEGATIVE), `pipe[5]` (SEED), `pipe[6]` (LATENT), `pipe[7]` (IMAGE).
- **Dictionary Access**: `pipe.get("model")`, `pipe.get("vae")`, `pipe.get("positive")`, etc.

This guarantees 100% interoperability with all Zombiehaus nodes as well as standard ComfyUI ecosystem nodes.

---

## Architecture Diagram

```
[MODEL] ──┐
[CLIP]  ──┼──> [ Zombiehaus Pipe Bus ] ──> [pipe] (Unified Master Pipe)
[VAE]   ──┤                 │          ──> [model]
[POS]   ──┤                 │          ──> [clip]
[NEG]   ──┤                 │          ──> [vae]
[LATENT]──┤                 │          ──> [positive]
[IMAGE] ──┤                 │          ──> [negative]
[SEED]  ──┘                 │          ──> [latent]
[pipe]  ────────────────────┘          ──> [image]
                                       ──> [seed]
```

---

## Inputs

All inputs are optional, giving you complete freedom to use the bus as a packager, an unpacker, or a modifier:

| Input | Type | Description |
|---|---|---|
| **`pipe`** | `PIPE` | Master upstream PIPE containing bundled components. |
| **`model`** | `MODEL` | Individual MODEL input. Overrides the model in `pipe` if connected. |
| **`clip`** | `CLIP` | Individual CLIP input. Overrides the clip in `pipe` if connected. |
| **`vae`** | `VAE` | Individual VAE input. Overrides the vae in `pipe` if connected. |
| **`positive`** | `CONDITIONING` | Positive conditioning input. Overrides `positive` in `pipe` if connected. |
| **`negative`** | `CONDITIONING` | Negative conditioning input. Overrides `negative` in `pipe` if connected. |
| **`latent`** | `LATENT` | Latent tensor input. Overrides `latent` in `pipe` if connected. |
| **`image`** | `IMAGE` | Pixel image input. Overrides `image` in `pipe` if connected. |
| **`seed`** | `INT` | Master seed input. Overrides `seed` in `pipe` if connected. |

---

## Outputs

| Output | Type | Description |
|---|---|---|
| **`pipe`** | `PIPE` | The consolidated, updated master PIPE carrying all active components. |
| **`model`** | `MODEL` | Extracted MODEL ready to connect to any sampler or model patcher. |
| **`clip`** | `CLIP` | Extracted CLIP ready to connect to text encoders. |
| **`vae`** | `VAE` | Extracted VAE ready to connect to encoders or decoders. |
| **`positive`** | `CONDITIONING` | Extracted positive conditioning vector. |
| **`negative`** | `CONDITIONING` | Extracted negative conditioning vector. |
| **`latent`** | `LATENT` | Extracted latent tensor. |
| **`image`** | `IMAGE` | Extracted pixel image tensor. |
| **`seed`** | `INT` | Extracted master seed integer. |

---

## Common Use Cases

### 1. Centralized Workflow Backbone
Place a `ZombiehausPipeBus` immediately after your Model Loader and Text Studio. Bundle the model, clip, vae, positive, negative, and seed into a single master pipe, then route that single pipe across your canvas.

### 2. Clean Local Fan-Out
In complex multi-stage workflows (e.g. Img2Img, HiRes Fix, FaceSwap, Detailing), place a `ZombiehausPipeBus` near the destination group. Feed the master `pipe` into it, and tap out individual wires locally without dragging 7 wires across the entire graph.

### 3. Pipeline Component Overriding
Suppose you apply a LoRA or ControlNet mid-pipeline. Simply connect your original `pipe` into the bus, connect the new patched `model` into the bus's `model` input, and the bus will emit an updated `pipe` carrying the patched model while preserving the original VAE, CLIP, and conditioning.

---

## Tips & Troubleshooting

- **Empty Components**: If an input is not supplied in either `pipe` or individual sockets, its corresponding individual output emits `None` without error.
- **Priority**: Individual input connections always take precedence over the elements inside `pipe`.
