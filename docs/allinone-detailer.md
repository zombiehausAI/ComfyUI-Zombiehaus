# Zombiehaus All-in-One Detailer

Two nodes for modular, slot-based image detailing using YOLO detection and VAE inpainting.

---

## Nodes

### Zombiehaus Detailer Slot

A config bundle node. One per subject to detail (face, hands, body, etc.). Outputs a `DETAILER_SLOT` dict containing all settings for one detection + inpaint pass.

**Inputs**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| model | dropdown | disabled | YOLO detector model (.pt / .pth) from `models/ultralytics/` |
| steps | INT | 20 | Inpainting sampler steps |
| cfg | FLOAT | 7.0 | CFG scale |
| denoise | FLOAT | 0.5 | Denoising strength |
| padding | INT | 32 | Mask expansion in pixels |
| mask_blur | INT | 4 | Gaussian blur radius on the detection mask (affects inpaint boundary) |
| blend_feather | INT | 16 | Additional blur on the compositing mask for a wider, softer transition |
| context_pad | INT | 32 | Extra pixels of surrounding image the model sees during diffusion (not pasted back) |
| sampler | dropdown | euler_ancestral | Sampler name |
| scheduler | dropdown | karras | Noise scheduler |
| enabled | BOOLEAN | True | Skip this slot when False |
| positive | CONDITIONING (optional) | — | Per-slot positive prompt override |
| negative | CONDITIONING (optional) | — | Per-slot negative prompt override |

**Output:** `DETAILER_SLOT`

---

### Zombiehaus All-in-One Detailer

The main processing node. Accepts a pipe carrying model/clip/vae/conditioning plus any number of `DETAILER_SLOT` inputs added dynamically by the frontend. Runs each enabled slot sequentially, feeding the output of slot N as input to slot N+1.

**Inputs**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| confidence | FLOAT | 0.3 | YOLO detection confidence threshold |
| pipe | PIPE (optional) | — | Carries model, clip, vae, positive, negative |
| image | IMAGE (optional) | — | Source image to detail |
| model | MODEL (optional) | — | Overrides pipe model |
| clip | CLIP (optional) | — | Overrides pipe clip |
| vae | VAE (optional) | — | Overrides pipe vae |
| positive | CONDITIONING (optional) | — | Overrides pipe positive |
| negative | CONDITIONING (optional) | — | Overrides pipe negative |
| seed | INT (optional) | 0 | Sampling seed |
| slot_1 … slot_N | DETAILER_SLOT (optional) | — | Any number of detailing passes (slots added dynamically via the node UI) |

**Outputs**

| Name | Type | Description |
|------|------|-------------|
| image | IMAGE | Fully detailed image (or image batch) after all slots |
| pipe | PIPE | Input pipe passed through unchanged |

---

### Dynamic Slot Management & Reordering

`ZombiehausAllInOneDetailer` provides interactive tools to organize, reorder, and identify detailer passes directly on the node without manual rewiring:

* **Auto-Recognition of Slot Names**: When a `Detailer Slot` is connected, the slot label automatically displays the pass number and model/title (e.g. `1: face_yolov8m` or `1: Face Detailer`). If the connected node is disabled, it reflects `[off]`.
* **Insert Slot at #1 (Shift Down)**: Available via node context menu (`Detailer Slots` → `➕ Insert Slot at #1`) or by right-clicking on `slot_1`. All existing wire connections and labels automatically shift down by one slot (`slot_1` → `slot_2`, `slot_2` → `slot_3`), immediately freeing up `slot_1` for a new pass.
* **Drag-and-Drop Slot Reordering**: Click and drag the subtle `≡` grip handle next to any slot to move it up or down. A green indicator bar highlights the target position, and wires automatically re-route when dropped.
* **Slot Context Menu**: Right-click any slot socket to access:
  * `➕ Insert Empty Slot Here (Shift Down)`
  * `▲ Move Slot Up` / `▼ Move Slot Down`
  * `✏️ Rename Display Label...` (set a custom alias that persists with workflow saves)
  * `Reset to Auto-Detected Name`
  * `❌ Remove & Shift Up`
* **Node Context Menu**: Right-click the node body → `Detailer Slots` to access bulk management options (Insert above any slot, Move Up/Down submenus, and Refresh Auto-Detected Names).

---

### Batch Processing

`ZombiehausAllInOneDetailer` supports batched input tensors (`[B, H, W, 3]`). When a batch is supplied, the node iterates sequentially through each image in the batch:

1. **Picture 1** runs through all connected slots (e.g. face detection, cropping, inpainting, and blending) until Picture 1 is completely finished.
2. **Picture 2** runs through all connected slots with seed offset (`seed + 1`).
3. This sequence repeats for every image in the batch before concatenating them back into a single tensor `[B, H, W, 3]`.

This keeps peak VRAM consumption minimal (identical to processing a single image) while fully detailing every image in your batch.

---

## Usage

### Typical workflow

```
Model Loader → pipe ──────────────────────────────┐
KSampler → image ─────────────────────────────────┤
                                                   ▼
Detailer Slot (face model) → slot_1    All-in-One Detailer → image → Save Image
Detailer Slot (hand model) → slot_2           │
                                               └── pipe → (next node)
```

### Pipe-based chaining

Wire a `PIPE` from any Zombiehaus node (Model Loader, KSampler, etc.) into the `pipe` input. The node resolves model/clip/vae/conditioning from the pipe automatically. Individual inputs override the pipe when both are connected.

### Per-slot conditioning

Connect a different positive/negative to a `DetailerSlot` to use a subject-specific prompt for that pass (e.g. "detailed face, skin texture" for the face slot). Slots without conditioning wired will fall back to the global conditioning.

---

## Model Setup

Place Ultralytics YOLO models (`.pt` or `.pth`) in any of:
- `ComfyUI/models/ultralytics/segm/` — segmentation models (preferred for masks)
- `ComfyUI/models/ultralytics/bbox/` — bounding box models
- `ComfyUI/models/ultralytics/` — root

The dropdown is populated at startup. Restart ComfyUI after adding new models.

---

## Tips

- Start with `denoise` around 0.4–0.6 for subtle refinement; higher values change anatomy.
- Increase `padding` for faces (32–64) to give the inpainter room to blend edges.
- `mask_blur` softens the inpaint boundary; `blend_feather` controls the compositing transition width; `context_pad` expands how much surrounding image the model sees. They are all independent — use all three to tune blending.
- `context_pad` is the most effective fix for visible seams: by giving the diffusion model surrounding pixels to look at, its output naturally matches the neighborhood in color and texture. The context border is never pasted back.
- If the pasted region is still visible as a box, raise `context_pad` (try 64–96) and `blend_feather` (try 24–48). A color correction step also automatically corrects for diffusion-induced tone drift at the seam.
- Set `enabled = False` on slots you want to temporarily skip without rewiring.
- Slots are processed in ascending order; later slots see the output of earlier ones.
- The `image` output is always available directly — no pipe unpacking needed.

---

## Troubleshooting

**No detections / slot skipped**
- Check the confidence threshold (lower it for harder-to-detect subjects).
- Confirm the model file exists in one of the ultralytics directories.
- Check the ComfyUI console for `[AllInOneDetailer]` log lines.

**ultralytics not installed**
```bash
pip install ultralytics
```

**Inpaint looks wrong / artifacts**
- Reduce `denoise` to preserve more of the original.
- Increase `mask_blur` to soften the inpaint boundary.
- Try a different sampler/scheduler (dpmpp_2m / karras works well).

**Visible box / seam around the detailed region**
- Raise `context_pad` (default 32 — try 64–96). This is the primary fix: the model generates output that matches the surrounding pixels because it can see them.
- Raise `blend_feather` (default 16 — try 24–48) for a wider compositing fade.
- Increase `padding` so the mask boundary has room to feather into neutral background.
- A built-in color correction step handles residual tone drift automatically.
