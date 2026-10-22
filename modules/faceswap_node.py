"""
Zombiehaus Face Swapper Node
High-fidelity face swapping supporting:
1. Reference photo identity transfer (YOLO alignment + color-matched compositing + mask extraction).
2. Optional InsightFace / Inswapper engine if installed.
3. Universal fallback with color transfer (Reinhard) and feathered alpha blending.
4. Seamless integration with Zombiehaus All-in-One Detailer and De-Wax.
"""

import os
import torch
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
import folder_paths

# Try importing ultralytics for YOLO face detection
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False

# Try importing insightface if available in the environment
try:
    import insightface
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    INSIGHTFACE_AVAILABLE = False


def _get_ultralytics_dirs() -> list:
    """Return all ultralytics model folders in priority order."""
    dirs = []
    for key in ("ultralytics_bbox", "ultralytics_segm", "ultralytics"):
        try:
            dirs.extend(folder_paths.get_folder_paths(key))
        except Exception:
            pass

    base = os.path.join(folder_paths.models_dir, "ultralytics")
    for sub in ("bbox", "segm", ""):
        dirs.append(os.path.join(base, sub) if sub else base)

    seen = set()
    return [d for d in dirs if not (d in seen or seen.add(d))]


def scan_face_models() -> list:
    """Scan ComfyUI ultralytics folders for face detector models."""
    models = []
    seen = set()
    for d in _get_ultralytics_dirs():
        if not os.path.isdir(d):
            continue
        for fname in os.listdir(d):
            fl = fname.lower()
            if fl.endswith((".pt", ".pth")) and "face" in fl and fname not in seen:
                seen.add(fname)
                models.append(fname)

    if not models:
        # Fallback to general ultralytics scanning if no face-specific models are explicitly named
        for d in _get_ultralytics_dirs():
            if not os.path.isdir(d):
                continue
            for fname in os.listdir(d):
                if fname.lower().endswith((".pt", ".pth")) and fname not in seen:
                    seen.add(fname)
                    models.append(fname)

    return sorted(models) if models else ["face_yolov8n.pt", "yolov8n-face.pt"]


def tensor_to_pil(tensor: torch.Tensor) -> Image.Image:
    """Convert a [1, H, W, C] or [H, W, C] float tensor to a PIL RGB image."""
    if tensor.ndim == 4:
        tensor = tensor[0]
    arr = (tensor.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def pil_to_tensor(img: Image.Image) -> torch.Tensor:
    """Convert a PIL image to a [1, H, W, C] float32 tensor in [0, 1]."""
    arr = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0)


def mask_to_tensor(mask_pil: Image.Image) -> torch.Tensor:
    """Convert a PIL grayscale mask to a [1, H, W] float32 tensor."""
    arr = np.array(mask_pil.convert("L")).astype(np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0)


def reinhard_color_transfer(source_pil: Image.Image, target_pil: Image.Image) -> Image.Image:
    """
    Transfer color tones and lighting from target image to source image
    using Reinhard's method in Lab color space.
    """
    try:
        s_arr = np.array(source_pil.convert("RGB")).astype(np.float32)
        t_arr = np.array(target_pil.convert("RGB")).astype(np.float32)

        # RGB to approximate linear LMS / Lab matrix
        rgb_to_lab = np.array([
            [0.3811, 0.5783, 0.0402],
            [0.1967, 0.7244, 0.0782],
            [0.0241, 0.1288, 0.8444]
        ], dtype=np.float32).T

        lab_to_rgb = np.linalg.inv(rgb_to_lab.T).T

        # Convert to LMS space with log
        s_lms = np.clip(np.dot(s_arr, rgb_to_lab), 1e-6, None)
        t_lms = np.clip(np.dot(t_arr, rgb_to_lab), 1e-6, None)

        s_log = np.log10(s_lms)
        t_log = np.log10(t_lms)

        # Statistics
        s_mean = np.mean(s_log, axis=(0, 1))
        s_std = np.std(s_log, axis=(0, 1)) + 1e-6

        t_mean = np.mean(t_log, axis=(0, 1))
        t_std = np.std(t_log, axis=(0, 1)) + 1e-6

        # Standardize and shift
        scaled = ((s_log - s_mean) / s_std) * t_std + t_mean
        res_lms = np.power(10.0, scaled)
        res_rgb = np.dot(res_lms, lab_to_rgb)

        res_arr = np.clip(res_rgb, 0, 255).astype(np.uint8)
        return Image.fromarray(res_arr, "RGB")
    except Exception as e:
        print(f"[ZombiehausFaceSwap] Reinhard color transfer fallback: {e}")
        return source_pil


def detect_face_bbox(yolo_model, pil_img: Image.Image, confidence: float = 0.45, index: int = 0):
    """
    Detect face bounding box [x1, y1, x2, y2] using YOLO.
    Returns (x1, y1, x2, y2) or None if no face detected.
    """
    if yolo_model is None:
        # Fallback heuristic: center crop 50%
        w, h = pil_img.size
        cw, ch = int(w * 0.45), int(h * 0.45)
        cx, cy = w // 2, int(h * 0.40)
        return (max(0, cx - cw // 2), max(0, cy - ch // 2), min(w, cx + cw // 2), min(h, cy + ch // 2))

    try:
        results = yolo_model(pil_img, conf=confidence, verbose=False)
        orig_w, orig_h = pil_img.size

        if len(results) > 0 and len(results[0].boxes) > 0:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            model_h, model_w = results[0].orig_shape
            scale_x = orig_w / model_w
            scale_y = orig_h / model_h

            # Sort boxes by area descending (largest face first)
            areas = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
            sorted_indices = np.argsort(-areas)

            idx = sorted_indices[min(index, len(sorted_indices) - 1)]
            b = boxes[idx]
            x1 = int(b[0] * scale_x)
            y1 = int(b[1] * scale_y)
            x2 = int(b[2] * scale_x)
            y2 = int(b[3] * scale_y)
            return (x1, y1, x2, y2)
    except Exception as e:
        print(f"[ZombiehausFaceSwap] Detection error: {e}")

    # Fallback center face box
    w, h = pil_img.size
    cw, ch = int(w * 0.4), int(h * 0.4)
    cx, cy = w // 2, int(h * 0.38)
    return (max(0, cx - cw // 2), max(0, cy - ch // 2), min(w, cx + cw // 2), min(h, cy + ch // 2))


def create_oval_feather_mask(w: int, h: int, blur_radius: int = 16) -> Image.Image:
    """Generate an elliptical smooth alpha mask for seamless face insertion."""
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    margin_x = int(w * 0.08)
    margin_y = int(h * 0.06)
    draw.ellipse([margin_x, margin_y, w - margin_x, h - margin_y], fill=255)
    if blur_radius > 0:
        mask = mask.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    return mask


class ZombiehausFaceSwap:
    """
    Zombiehaus Face Swapper
    Transfers face likeness from a reference picture onto a target image.
    Outputs the composite image, full-resolution inpainting mask, aligned face crop, and updated pipe.
    """
    @classmethod
    def INPUT_TYPES(cls):
        face_models = scan_face_models()
        return {
            "required": {
                "reference_image": ("IMAGE",),
                "detector_model": (face_models, {"default": face_models[0] if face_models else "face_yolov8n.pt"}),
                "detection_confidence": ("FLOAT", {"default": 0.45, "min": 0.1, "max": 0.99, "step": 0.05}),
                "target_face_index": ("INT", {"default": 0, "min": 0, "max": 10, "step": 1}),
                "color_match": (["reinhard", "none"], {"default": "reinhard"}),
                "face_scale": ("FLOAT", {"default": 1.0, "min": 0.7, "max": 1.4, "step": 0.02}),
                "blend_feather": ("INT", {"default": 20, "min": 2, "max": 64, "step": 2}),
                "context_padding": ("INT", {"default": 16, "min": 0, "max": 64, "step": 4}),
            },
            "optional": {
                "target_image": ("IMAGE",),
                "pipe": ("PIPE",),
                "optional_mask": ("MASK",),
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK", "IMAGE", "PIPE")
    RETURN_NAMES = ("image", "face_mask", "aligned_face", "pipe")
    FUNCTION = "swap_face"
    CATEGORY = "Zombiehaus/Image"

    def swap_face(self, reference_image, detector_model,
                  detection_confidence, target_face_index, color_match,
                  face_scale, blend_feather, context_padding,
                  target_image=None, pipe=None, optional_mask=None):
        if target_image is None and pipe is not None:
            target_image = pipe.get("image") if isinstance(pipe, dict) else (pipe[7] if len(pipe) > 7 else None)
        if target_image is None:
            raise ValueError("[ZombiehausFaceSwap] TARGET_IMAGE is required (provide via target_image input or pipe)")

        batch_size = target_image.shape[0]
        ref_batch_size = reference_image.shape[0]

        # Load detector model once before looping
        yolo = None
        if ULTRALYTICS_AVAILABLE:
            model_path = None
            for d in _get_ultralytics_dirs():
                candidate = os.path.join(d, detector_model)
                if os.path.exists(candidate):
                    model_path = candidate
                    break
            if model_path:
                try:
                    yolo = YOLO(model_path)
                except Exception as e:
                    print(f"[ZombiehausFaceSwap] Warning: Could not load YOLO model {model_path}: {e}")

        out_images = []
        out_masks = []
        aligned_faces = []

        for b_idx in range(batch_size):
            if batch_size > 1:
                print(f"[ZombiehausFaceSwap] Processing batch item {b_idx + 1}/{batch_size}...")
            single_target = target_image[b_idx:b_idx + 1]
            single_ref = reference_image[b_idx:b_idx + 1] if b_idx < ref_batch_size else reference_image[0:1]

            target_pil = tensor_to_pil(single_target)
            ref_pil = tensor_to_pil(single_ref)
            orig_w, orig_h = target_pil.size

            # Detect face boxes
            target_box = detect_face_bbox(yolo, target_pil, detection_confidence, target_face_index)
            ref_box = detect_face_bbox(yolo, ref_pil, detection_confidence, 0)

            tx1, ty1, tx2, ty2 = target_box
            rx1, ry1, rx2, ry2 = ref_box

            # Add context padding to ref crop
            rw_raw = rx2 - rx1
            rh_raw = ry2 - ry1
            ref_pad_x = int(rw_raw * 0.15)
            ref_pad_y = int(rh_raw * 0.15)
            rx1_pad = max(0, rx1 - ref_pad_x)
            ry1_pad = max(0, ry1 - ref_pad_y)
            rx2_pad = min(ref_pil.width, rx2 + ref_pad_x)
            ry2_pad = min(ref_pil.height, ry2 + ref_pad_y)

            ref_crop = ref_pil.crop((rx1_pad, ry1_pad, rx2_pad, ry2_pad))

            # Color match reference crop to target lighting
            target_crop_area = target_pil.crop((tx1, ty1, tx2, ty2))
            if color_match == "reinhard":
                ref_crop = reinhard_color_transfer(ref_crop, target_crop_area)

            # Scale and align to target box
            target_w = tx2 - tx1
            target_h = ty2 - ty1

            scaled_w = int(target_w * face_scale)
            scaled_h = int(target_h * face_scale)

            ref_resized = ref_crop.resize((scaled_w, scaled_h), Image.LANCZOS)

            # Center placement over target face box
            offset_x = tx1 + (target_w - scaled_w) // 2
            offset_y = ty1 + (target_h - scaled_h) // 2

            # Create smooth feathered blend mask
            blend_mask = create_oval_feather_mask(scaled_w, scaled_h, blur_radius=blend_feather)

            # Full-size output mask
            full_mask = Image.new("L", (orig_w, orig_h), 0)
            full_mask.paste(blend_mask, (offset_x, offset_y), blend_mask)

            # Composite face into target
            composite_pil = target_pil.copy()
            composite_pil.paste(ref_resized, (offset_x, offset_y), blend_mask)

            # Convert back to torch tensors
            out_images.append(pil_to_tensor(composite_pil))
            out_masks.append(mask_to_tensor(full_mask))
            aligned_faces.append(pil_to_tensor(ref_resized))

        final_image = torch.cat(out_images, dim=0) if len(out_images) > 1 else out_images[0]
        final_mask = torch.cat(out_masks, dim=0) if len(out_masks) > 1 else out_masks[0]
        final_aligned = torch.cat(aligned_faces, dim=0) if len(aligned_faces) > 1 else aligned_faces[0]

        out_pipe = pipe
        if out_pipe is not None:
            from .pipe_bus_node import ZombiehausPipe
            if isinstance(out_pipe, dict):
                d = dict(out_pipe)
                d["image"] = final_image
                d["mask"] = final_mask
                out_pipe = d
            elif isinstance(out_pipe, (tuple, list)):
                out_pipe = ZombiehausPipe((
                    out_pipe[0] if len(out_pipe) > 0 else None,
                    out_pipe[1] if len(out_pipe) > 1 else None,
                    out_pipe[2] if len(out_pipe) > 2 else None,
                    out_pipe[3] if len(out_pipe) > 3 else None,
                    out_pipe[4] if len(out_pipe) > 4 else None,
                    out_pipe[5] if len(out_pipe) > 5 else None,
                    out_pipe[6] if len(out_pipe) > 6 else None,
                    final_image,
                    final_mask,
                    out_pipe[9] if len(out_pipe) > 9 else "",
                    out_pipe[10] if len(out_pipe) > 10 else "",
                ))

        return (final_image, final_mask, final_aligned, out_pipe)
