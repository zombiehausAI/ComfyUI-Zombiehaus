"""
Zombiehaus Person Inpaint & Interaction Director Node

Allows adding a second person to an existing picture with complete freedom of interaction
(holding hands, kissing, embracing, sitting beside, or custom freeform interactions):
- Supports manual brush mask from LoadImage OR automated YOLO-assisted staging.
- Contact Overlap (dilation) specifically expands into Person 1 to allow physical contact.
- Gaussian feathering eliminates hard seams.
- VAE encodes with 16px Chroma/Flux alignment and latent noise_mask injection.
- Denoise tuning for both fresh additions (1.0) and delicate contact blending (0.80 - 0.92).
- Pixel-level alpha compositing guarantees unmasked pixels of Person 1 are 100% preserved.
"""

import os
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
import folder_paths
import comfy.samplers
from nodes import KSampler, VAEDecode

try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False


def _get_ultralytics_dirs() -> list:
    """Return all ultralytics model folders in priority order."""
    dirs = []
    for key in ("ultralytics_segm", "ultralytics_bbox", "ultralytics"):
        try:
            dirs.extend(folder_paths.get_folder_paths(key))
        except Exception:
            pass

    base = os.path.join(folder_paths.models_dir, "ultralytics")
    for sub in ("segm", "bbox", ""):
        dirs.append(os.path.join(base, sub) if sub else base)

    seen = set()
    return [d for d in dirs if not (d in seen or seen.add(d))]


def scan_segm_models() -> list:
    """Scan ComfyUI ultralytics folders for segmentation or detection models."""
    models = []
    seen = set()
    for d in _get_ultralytics_dirs():
        if not os.path.isdir(d):
            continue
        for fname in os.listdir(d):
            fl = fname.lower()
            if fl.endswith((".pt", ".pth")) and ("seg" in fl or "person" in fl or "yolo" in fl) and fname not in seen:
                seen.add(fname)
                models.append(fname)

    return sorted(models) if models else ["yolov8x-seg.pt", "person_yolov8n-seg.pt"]


def tensor_to_pil(tensor: torch.Tensor) -> Image.Image:
    """Convert [1, H, W, C] or [H, W, C] float tensor to PIL Image."""
    if tensor.ndim == 4:
        tensor = tensor[0]
    arr = (tensor.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def pil_to_tensor(img: Image.Image) -> torch.Tensor:
    """Convert PIL Image to [1, H, W, C] float tensor."""
    arr = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0)


def mask_to_tensor(mask_pil: Image.Image) -> torch.Tensor:
    """Convert PIL grayscale mask to [1, H, W] float tensor."""
    arr = np.array(mask_pil.convert("L")).astype(np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0)


def align_tensor_dim(tensor: torch.Tensor, div: int = 16) -> torch.Tensor:
    """Ensure tensor H and W are multiples of div (16 for Chroma/Flux)."""
    _, h, w, _ = tensor.shape
    tw = (w // div) * div
    th = (h // div) * div
    if tw == w and th == h:
        return tensor
    crop_x = (w - tw) // 2
    crop_y = (h - th) // 2
    return tensor[:, crop_y:crop_y + th, crop_x:crop_x + tw, :]


class ZombiehausPersonInpaint:
    """
    All-in-One Person Inpainter and Interaction Director for ChromaHD, Flux, and SDXL.
    Adds a new person and lets them interact freely with the existing person.
    """

    STAGING_MODES = [
        "Manual Mask (From Painted Image)",
        "Auto Masturbation / Handjob (Kneeling at Pelvis)",
        "Auto Oral / Fellatio (Between Legs / Pelvis)",
        "Auto Intercourse (Mounted / Straddling)",
        "Auto Intercourse (Side / Mission Position)",
        "Auto Beside (Left)",
        "Auto Beside (Right)",
        "Auto Holding Hands (Left)",
        "Auto Holding Hands (Right)",
        "Auto Embrace / Shoulder Contact",
        "Auto Kissing / Face Contact",
    ]

    INTERACTION_PRESETS = [
        "Custom (100% Freeform Prompt Driven)",
        "Partner Masturbation / Handjob (Denoise 0.88)",
        "Oral / Fellatio / Cunnilingus (Denoise 0.85)",
        "Intercourse / Penetration (Denoise 0.86)",
        "Intimate Fondling / Caressing (Denoise 0.88)",
        "Kissing / Intimate (Lips & Face - Denoise 0.85)",
        "Holding Hands (Gentle Contact - Denoise 0.90)",
        "Embrace / Arm Around Shoulder (Denoise 0.88)",
        "Sitting Beside (Denoise 1.0)",
        "Standing Beside (Denoise 1.0)",
    ]

    @classmethod
    def INPUT_TYPES(cls):
        samplers = comfy.samplers.KSampler.SAMPLERS
        schedulers = comfy.samplers.KSampler.SCHEDULERS
        detector_models = scan_segm_models()

        return {
            "required": {
                "image": ("IMAGE",),
                "pipe": ("PIPE",),
                "staging_mode": (cls.STAGING_MODES, {"default": "Manual Mask (From Painted Image)"}),
                "interaction_preset": (cls.INTERACTION_PRESETS, {"default": "Partner Masturbation / Handjob (Denoise 0.88)"}),
                "contact_overlap_px": ("INT", {"default": 24, "min": -64, "max": 128, "step": 2}),
                "edge_feather_px": ("INT", {"default": 14, "min": 0, "max": 64, "step": 2}),
                "denoise": ("FLOAT", {"default": 0.88, "min": 0.1, "max": 1.0, "step": 0.01}),
                "steps": ("INT", {"default": 30, "min": 5, "max": 100, "step": 1}),
                "cfg": ("FLOAT", {"default": 4.5, "min": 1.0, "max": 20.0, "step": 0.1}),
                "sampler_name": (samplers, {"default": "euler" if "euler" in samplers else samplers[0]}),
                "scheduler": (schedulers, {"default": "simple" if "simple" in schedulers else schedulers[0]}),
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
            },
            "optional": {
                "optional_mask": ("MASK",),
                "detector_model": (detector_models, {"default": detector_models[0] if detector_models else "yolov8x-seg.pt"}),
                "detection_confidence": ("FLOAT", {"default": 0.35, "min": 0.1, "max": 0.95, "step": 0.05}),
                "positive_override": ("CONDITIONING",),
                "negative_override": ("CONDITIONING",),
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK", "PIPE", "STRING")
    RETURN_NAMES = ("image", "mask", "pipe", "prompt_hint")
    FUNCTION = "inpaint_person"
    CATEGORY = "Zombiehaus/Image"

    def _detect_person_bbox(self, pil_img: Image.Image, detector_model_name: str, confidence: float):
        """Use YOLO to detect bounding box of Person 1."""
        if not ULTRALYTICS_AVAILABLE:
            return None

        try:
            model_path = folder_paths.get_full_path("ultralytics", detector_model_name)
            if not model_path or not os.path.exists(model_path):
                # Search across all ultralytics dirs
                for d in _get_ultralytics_dirs():
                    candidate = os.path.join(d, detector_model_name)
                    if os.path.exists(candidate):
                        model_path = candidate
                        break

            if not model_path or not os.path.exists(model_path):
                return None

            yolo = YOLO(model_path)
            results = yolo.predict(pil_img, conf=confidence, verbose=False)
            if not results or len(results) == 0:
                return None

            boxes = results[0].boxes
            if boxes is None or len(boxes) == 0:
                return None

            # Get largest person box by area
            best_box = None
            max_area = 0
            for box in boxes:
                xyxy = box.xyxy[0].cpu().numpy()
                w = xyxy[2] - xyxy[0]
                h = xyxy[3] - xyxy[1]
                area = w * h
                if area > max_area:
                    max_area = area
                    best_box = xyxy

            return best_box
        except Exception as e:
            print(f"[ZombiehausPersonInpaint] YOLO detection notice: {e}")
            return None

    def _generate_auto_mask(self, img_w: int, img_h: int, bbox, mode: str) -> Image.Image:
        """Generate staging mask based on Person 1 bounding box and interaction mode."""
        mask = Image.new("L", (img_w, img_h), 0)
        draw = ImageDraw.Draw(mask)

        if bbox is not None:
            x1, y1, x2, y2 = bbox
            p_w = x2 - x1
            p_h = y2 - y1
            center_x = (x1 + x2) / 2.0

            if "Masturbation" in mode or "Handjob" in mode:
                # Groin / pelvic contact zone + kneeling space
                pelvis_y1 = max(0, int(y1 + p_h * 0.45))
                pelvis_y2 = min(img_h, int(y1 + p_h * 0.85))
                # Cover crotch with generous width
                crotch_left = max(0, int(center_x - p_w * 0.40))
                crotch_right = min(img_w, int(center_x + p_w * 0.40))
                draw.rectangle([crotch_left, pelvis_y1, crotch_right, pelvis_y2], fill=255)
                # Extend into adjacent kneeling space (towards side with more room)
                if center_x < img_w / 2:
                    draw.rectangle([int(center_x - p_w * 0.1), pelvis_y1, min(img_w, int(x2 + p_w * 0.85)), min(img_h, int(y2 + p_h * 0.1))], fill=255)
                else:
                    draw.rectangle([max(0, int(x1 - p_w * 0.85)), pelvis_y1, int(center_x + p_w * 0.1), min(img_h, int(y2 + p_h * 0.1))], fill=255)

            elif "Oral" in mode or "Fellatio" in mode:
                # Pelvis + lower torso + head kneeling between/adjacent to legs
                pelvis_y1 = max(0, int(y1 + p_h * 0.45))
                pelvis_y2 = min(img_h, int(y1 + p_h * 0.90))
                draw.rectangle([max(0, int(center_x - p_w * 0.45)), pelvis_y1, min(img_w, int(center_x + p_w * 0.45)), pelvis_y2], fill=255)
                # Extra room downwards/outwards for kneeling head and upper torso
                draw.rectangle([max(0, int(center_x - p_w * 0.55)), int(pelvis_y1 + p_h * 0.15), min(img_w, int(center_x + p_w * 0.55)), min(img_h, int(y2 + p_h * 0.15))], fill=255)

            elif "Intercourse" in mode:
                # Pelvic and torso junction for straddling / missionary
                pelvis_y1 = max(0, int(y1 + p_h * 0.35))
                pelvis_y2 = min(img_h, int(y1 + p_h * 0.88))
                if "Mounted" in mode or "Straddling" in mode:
                    # Straddling: on top of Person 1's pelvis and lower torso
                    draw.rectangle([max(0, int(center_x - p_w * 0.50)), pelvis_y1, min(img_w, int(center_x + p_w * 0.50)), pelvis_y2], fill=255)
                else:
                    # Side / missionary: adjacent with hip overlap
                    if center_x < img_w / 2:
                        draw.rectangle([int(center_x - p_w * 0.2), pelvis_y1, min(img_w, int(x2 + p_w * 0.8)), pelvis_y2], fill=255)
                    else:
                        draw.rectangle([max(0, int(x1 - p_w * 0.8)), pelvis_y1, int(center_x + p_w * 0.2), pelvis_y2], fill=255)

            elif "Left" in mode:
                # Stage to the left of Person 1
                mw = int(min(x2, max(p_w * 0.9, img_w * 0.45)))
                left = max(0, int(x1 - mw * 0.8))
                right = int(x1 + p_w * 0.25)
                top = max(0, int(y1 - p_h * 0.05))
                bottom = min(img_h, int(y2 + p_h * 0.05))
                draw.rectangle([left, top, right, bottom], fill=255)

            elif "Right" in mode:
                # Stage to the right of Person 1
                mw = int(min(img_w - x1, max(p_w * 0.9, img_w * 0.45)))
                left = int(x2 - p_w * 0.25)
                right = min(img_w, int(x2 + mw * 0.8))
                top = max(0, int(y1 - p_h * 0.05))
                bottom = min(img_h, int(y2 + p_h * 0.05))
                draw.rectangle([left, top, right, bottom], fill=255)

            elif "Kissing" in mode:
                # Head/face contact: mask Person 1's lower face + area in front of face
                head_h = p_h * 0.35
                face_y1 = y1 + head_h * 0.3
                face_y2 = y1 + head_h * 1.1
                if center_x < img_w / 2:
                    draw.rectangle([int(x1 + p_w * 0.3), int(y1), min(img_w, int(x2 + p_w * 0.8)), int(y2)], fill=255)
                else:
                    draw.rectangle([max(0, int(x1 - p_w * 0.8)), int(y1), int(x2 - p_w * 0.3), int(y2)], fill=255)

            elif "Embrace" in mode:
                # Upper body overlap
                top = max(0, int(y1 + p_h * 0.1))
                bottom = min(img_h, int(y2))
                if center_x < img_w / 2:
                    draw.rectangle([int(x1 + p_w * 0.15), top, min(img_w, int(x2 + p_w * 0.9)), bottom], fill=255)
                else:
                    draw.rectangle([max(0, int(x1 - p_w * 0.9)), top, int(x2 - p_w * 0.15), bottom], fill=255)
            else:
                # Default half screen
                draw.rectangle([0, 0, int(img_w * 0.5), img_h], fill=255)
        else:
            # Fallback if no person detected: split canvas
            if "Left" in mode:
                draw.rectangle([0, 0, int(img_w * 0.55), img_h], fill=255)
            elif "Right" in mode:
                draw.rectangle([int(img_w * 0.45), 0, img_w, img_h], fill=255)
            elif "Masturbation" in mode or "Oral" in mode or "Intercourse" in mode:
                # Lower half center
                draw.rectangle([int(img_w * 0.15), int(img_h * 0.35), int(img_w * 0.85), img_h], fill=255)
            else:
                draw.rectangle([0, 0, int(img_w * 0.5), img_h], fill=255)

        return mask

    def _get_prompt_hint(self, preset: str) -> str:
        """Return recommended interaction prompt phrasing for the active preset."""
        if "Masturbation" in preset or "Handjob" in preset:
            return (
                "A woman kneeling closely beside her, reaching out with both hands firmly wrapped around "
                "her erect penis, stroking the shaft, fingers with polished nails gripping tightly, pre-cum, "
                "veiny texture, looking up into her eyes with an open-mouthed sensual expression, glistening wetness."
            )
        elif "Oral" in preset or "Fellatio" in preset:
            return (
                "A woman kneeling between her legs, head tilted down, performing oral fellatio, lips parted, "
                "tongue licking the tip and shaft, deep intimacy, looking up with lustful eyes, saliva, wet glistening skin."
            )
        elif "Intercourse" in preset or "Penetration" in preset:
            return (
                "Two women engaged in passionate intercourse, bodies pressed tightly together, straddling hips, "
                "intimate penetration, arching back, breasts pressed together, hands gripping hips, intense pleasure, sweat, authentic lighting."
            )
        elif "Kissing" in preset:
            return (
                "Two women kissing passionately, heads tilted, lips softly pressed together, tender embrace, "
                "arms draped around neck, closed eyes, intimate romantic moment, warm natural sunlight."
            )
        elif "Holding Hands" in preset:
            return (
                "A woman standing beside her holding hands tightly, fingers gently interlaced, natural hand clasp, "
                "smiling warmly, bodies standing close together, natural eye contact, candid 35mm photo."
            )
        elif "Embrace" in preset:
            return (
                "A woman standing beside her with an arm warmly draped over her shoulder, fingers resting on her clavicle, "
                "laughing together, close intimate camaraderie, natural posture, candid portrait."
            )
        return "Describe the second person, their pose, action, and physical contact with the existing person."

    def inpaint_person(self, image, pipe, staging_mode, interaction_preset,
                       contact_overlap_px, edge_feather_px, denoise, steps, cfg,
                       sampler_name, scheduler, seed,
                       optional_mask=None, detector_model="yolov8x-seg.pt",
                       detection_confidence=0.35, positive_override=None, negative_override=None):

        # 1. Resolve pipe components
        model = pipe[0]
        clip = pipe[1]
        vae = pipe[2]
        positive = positive_override if positive_override is not None else pipe[3]
        negative = negative_override if negative_override is not None else pipe[4]

        # 2. Preset denoise resolution if not custom
        effective_denoise = denoise
        if "Kissing" in interaction_preset or "Oral" in interaction_preset:
            effective_denoise = min(denoise, 0.85)
        elif "Intercourse" in interaction_preset:
            effective_denoise = min(denoise, 0.86)
        elif "Masturbation" in interaction_preset or "Handjob" in interaction_preset or "Fondling" in interaction_preset:
            effective_denoise = min(denoise, 0.88)
        elif "Embrace" in interaction_preset:
            effective_denoise = min(denoise, 0.88)
        elif "Holding Hands" in interaction_preset:
            effective_denoise = min(denoise, 0.90)

        # 3. Align image dimensions to 16px multiples for Chroma / Flux DiT
        aligned_image = align_tensor_dim(image, div=16)
        b_size, h, w, c = aligned_image.shape

        pil_img = tensor_to_pil(aligned_image)

        # 4. Resolve Base Mask
        if staging_mode.startswith("Manual") and optional_mask is not None and optional_mask.max() > 0.01:
            # Use user painted mask
            m_np = (optional_mask[0].cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
            mask_pil = Image.fromarray(m_np, "L")
            if mask_pil.size != (w, h):
                mask_pil = mask_pil.resize((w, h), Image.Resampling.BILINEAR)
        else:
            # Auto staging mode via YOLO
            bbox = self._detect_person_bbox(pil_img, detector_model, detection_confidence)
            mask_pil = self._generate_auto_mask(w, h, bbox, staging_mode)

        # 5. Apply Contact Overlap (Dilation) and Edge Feathering (Gaussian Blur)
        mask_tensor_raw = mask_to_tensor(mask_pil).to(image.device)  # [1, H, W]

        # Dilation via Max Pooling
        if contact_overlap_px != 0:
            k = abs(contact_overlap_px) * 2 + 1
            p = abs(contact_overlap_px)
            m_exp = mask_tensor_raw.unsqueeze(1)
            if contact_overlap_px > 0:
                m_dilated = F.max_pool2d(m_exp, kernel_size=k, stride=1, padding=p).squeeze(1)
            else:
                m_dilated = -F.max_pool2d(-m_exp, kernel_size=k, stride=1, padding=p).squeeze(1)
        else:
            m_dilated = mask_tensor_raw

        # Crisp binary mask for VAE latent noise_mask
        binary_mask = torch.clamp(m_dilated, 0.0, 1.0)

        # Feathered mask for smooth pixel-level boundary compositing
        if edge_feather_px > 0:
            rad = edge_feather_px
            sigma = max(0.1, rad * 0.5)
            x_range = torch.arange(-rad, rad + 1, dtype=torch.float32, device=image.device)
            gauss_1d = torch.exp(-0.5 * (x_range / sigma) ** 2)
            gauss_1d = gauss_1d / gauss_1d.sum()
            kernel_2d = (gauss_1d[:, None] * gauss_1d[None, :]).unsqueeze(0).unsqueeze(0)
            m_in = binary_mask.unsqueeze(1)
            feathered_mask = F.conv2d(m_in, kernel_2d, padding=rad).squeeze(1)
            feathered_mask = torch.clamp(feathered_mask, 0.0, 1.0)
        else:
            feathered_mask = binary_mask

        # 6. Encode Latent with noise_mask for inpainting
        latent_tensor = vae.encode(aligned_image[:, :, :, :3])
        lat_h = latent_tensor.shape[-2]
        lat_w = latent_tensor.shape[-1]

        # Interpolate binary mask to latent spatial resolution
        m_latent = F.interpolate(binary_mask.unsqueeze(1), size=(lat_h, lat_w), mode="bilinear", align_corners=False)
        latent_dict = {
            "samples": latent_tensor,
            "noise_mask": m_latent.squeeze(1),
            "width": w,
            "height": h
        }

        # 7. Sample with KSampler
        ksampler = KSampler()
        sampled_latent = ksampler.sample(
            model=model,
            seed=seed,
            steps=steps,
            cfg=cfg,
            sampler_name=sampler_name,
            scheduler=scheduler,
            positive=positive,
            negative=negative,
            latent_image=latent_dict,
            denoise=effective_denoise
        )[0]

        # 8. Decode with VAE
        decoded = vae.decode(sampled_latent["samples"])
        if hasattr(decoded, "ndim") and decoded.ndim == 5:
            if decoded.shape[1] in (1, 3, 4) and decoded.shape[-1] not in (1, 3, 4):
                decoded = decoded.permute(0, 2, 3, 4, 1)
            decoded = decoded.reshape(-1, decoded.shape[-3], decoded.shape[-2], decoded.shape[-1])

        # 9. Pixel-Level Seamless Compositing
        # Unmasked pixels of Person 1 are 100% frozen and mathematically preserved from original image
        blend_mask = feathered_mask.unsqueeze(-1).to(aligned_image.device)
        final_image = aligned_image * (1.0 - blend_mask) + decoded.to(aligned_image.device) * blend_mask

        prompt_hint = self._get_prompt_hint(interaction_preset)
        return (final_image, feathered_mask, pipe, prompt_hint)

