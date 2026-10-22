"""
Zombiehaus Person Inpaint & Interaction Director Node

Allows adding a second person to an existing picture with complete freedom of interaction
(holding hands, kissing, sexual contact, masturbation, oral, intercourse, or custom freeform interactions):
- Supports manual brush mask from LoadImage OR automated targeted YOLO-assisted staging.
- Auto-detects specific anatomical regions (penis, female breasts, vagina/vulva, lips, hands, feet)
  from the ultralytics detailer model suite to stage interactions with pinpoint anatomical accuracy.
- Supports flexible multi-posture handjobs (sitting beside, lying beside, kneeling, standing over).
- Supports multi-action combos (e.g. kissing while fingering, kissing while stroking, embrace with intimate touch).
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
    """Scan ComfyUI ultralytics folders for all available detection and segmentation models."""
    models = ["Auto (Targeted by Preset)"]
    seen = set()
    for d in _get_ultralytics_dirs():
        if not os.path.isdir(d):
            continue
        for fname in os.listdir(d):
            fl = fname.lower()
            if fl.endswith((".pt", ".pth")) and fname not in seen:
                seen.add(fname)
                models.append(fname)

    return models if len(models) > 1 else ["Auto (Targeted by Preset)", "yolov8x-seg.pt", "person_yolov8n-seg.pt"]


def _find_detector_model_path(target_keywords: list) -> str:
    """Find the best matching detector model file across all ultralytics dirs based on keywords."""
    dirs = _get_ultralytics_dirs()
    for kw in target_keywords:
        kw_l = kw.lower()
        for d in dirs:
            if not os.path.isdir(d):
                continue
            for fname in os.listdir(d):
                if fname.lower().endswith((".pt", ".pth")) and kw_l in fname.lower():
                    return os.path.join(d, fname)
    return None


def _resolve_model_path(model_name: str) -> str:
    """Resolve full path for a given model filename."""
    if not model_name or model_name == "Auto (Targeted by Preset)":
        return None
    try:
        p = folder_paths.get_full_path("ultralytics", model_name)
        if p and os.path.exists(p):
            return p
    except Exception:
        pass
    for d in _get_ultralytics_dirs():
        p = os.path.join(d, model_name)
        if os.path.exists(p):
            return p
    return None


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
        # Flexible Handjob / Masturbation
        "Auto Masturbation / Handjob - Versatile (Sitting / Kneeling / Beside)",
        "Auto Masturbation / Handjob (Sitting Beside / Lateral Contact)",
        "Auto Masturbation / Handjob (Kneeling / Below)",
        "Auto Masturbation / Handjob (Lying Beside)",
        # Multi-Action Combos (Dual-Contact)
        "Auto Combo: Kiss & Finger / Caress (Face + Groin Contact)",
        "Auto Combo: Kiss & Stroke / Handjob (Face + Penis Contact)",
        "Auto Combo: Kiss & Breast Fondle (Face + Chest Contact)",
        "Auto Combo: Paizuri & Kiss (Chest + Lips Contact)",
        "Auto Combo: Embrace & Intimate Touch (Torso + Groin Contact)",
        "Auto Full Frontal Overlap (Face down to Pelvis)",
        # Intimate Actions
        "Auto Oral / Fellatio / Blowjob (Pelvis / Mouth Contact)",
        "Auto Cunnilingus / Pussy Licking (Groin / Pelvis Contact)",
        "Auto Paizuri / Titjob / Breast Play (Chest / Breast Contact)",
        "Auto Female Masturbation / Fingering (Groin / Vulva Contact)",
        "Auto Intercourse - Straddling / Cowgirl (Pelvis Mounted)",
        "Auto Intercourse - Missionary / Face-to-Face (Hip Overlap)",
        "Auto Intercourse - From Behind / Doggy (Rear / Hip Contact)",
        "Auto Footjob / Soles Contact (Feet / Groin)",
        "Auto Sensual Body Massage / Oil Rub (Back / Body Contact)",
        # Romantic & Social
        "Auto Kissing / Lips & Face Contact (Face / Lips Overlap)",
        "Auto Holding Hands (Hand Overlap)",
        "Auto Spooning / Back Hug (Behind Body Overlap)",
        "Auto Lap Sitting / Straddling Lap",
        "Auto Head on Lap / Resting (Lap / Torso Overlap)",
        "Auto Beside (Left)",
        "Auto Beside (Right)",
        "Auto Standing Beside (Left)",
        "Auto Standing Beside (Right)",
        "Auto Embrace / Shoulder Contact (Left)",
        "Auto Embrace / Shoulder Contact (Right)",
    ]

    INTERACTION_PRESETS = [
        "Custom (100% Freeform Prompt Driven)",
        # Handjob / Masturbation
        "Partner Masturbation / Handjob - Sitting Beside (Denoise 0.88)",
        "Partner Masturbation / Handjob - Kneeling (Denoise 0.88)",
        "Partner Masturbation / Handjob - Lying Beside (Denoise 0.88)",
        # Combos
        "Combo: Kiss & Finger / Caress (Denoise 0.85)",
        "Combo: Kiss & Stroke / Handjob (Denoise 0.85)",
        "Combo: Kiss & Breast Fondle (Denoise 0.85)",
        "Combo: Paizuri & Kiss (Denoise 0.86)",
        "Combo: Embrace & Intimate Touch (Denoise 0.88)",
        "Full Frontal Contact / Dual Action (Denoise 0.86)",
        # Intimate
        "Oral / Fellatio / Blowjob (Denoise 0.85)",
        "Cunnilingus / Pussy Licking (Denoise 0.85)",
        "Paizuri / Titjob / Breast Play (Denoise 0.87)",
        "Female Masturbation / Fingering (Denoise 0.88)",
        "Intercourse - Straddling / Cowgirl (Denoise 0.86)",
        "Intercourse - Missionary / Face-to-Face (Denoise 0.86)",
        "Intercourse - From Behind / Doggy (Denoise 0.86)",
        "Footjob / Soles Contact (Denoise 0.88)",
        "Sensual Body Massage / Oil Rub (Denoise 0.89)",
        # Romantic & Social
        "Kissing / Intimate (Lips & Face - Denoise 0.85)",
        "Holding Hands (Gentle Contact - Denoise 0.90)",
        "Spooning / Back Hug (Denoise 0.88)",
        "Lap Sitting / Embracing (Denoise 0.88)",
        "Head on Lap / Caressing Hair (Denoise 0.88)",
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
                "interaction_preset": (cls.INTERACTION_PRESETS, {"default": "Partner Masturbation / Handjob - Sitting Beside (Denoise 0.88)"}),
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
                "detector_model": (detector_models, {"default": "Auto (Targeted by Preset)"}),
                "detection_confidence": ("FLOAT", {"default": 0.35, "min": 0.1, "max": 0.95, "step": 0.05}),
                "positive_override": ("CONDITIONING",),
                "negative_override": ("CONDITIONING",),
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK", "PIPE", "STRING")
    RETURN_NAMES = ("image", "mask", "pipe", "prompt_hint")
    FUNCTION = "inpaint_person"
    CATEGORY = "Zombiehaus/Image"

    @staticmethod
    def _get_target_detector_keywords(mode: str, preset: str) -> tuple:
        """Resolve primary and optional secondary anatomical detector keywords."""
        combined = f"{mode} {preset}".lower()

        # Combos (Dual-Target)
        if "kiss" in combined and ("finger" in combined or "vulva" in combined or "caress" in combined):
            return (["lips", "face"], ["vagina", "person"])
        elif "kiss" in combined and ("stroke" in combined or "handjob" in combined or "penis" in combined):
            return (["lips", "face"], ["penis", "person"])
        elif "kiss" in combined and ("breast" in combined or "fondle" in combined or "tit" in combined):
            return (["lips", "face"], ["female_breast", "nipples", "breast", "person"])
        elif "paizuri" in combined and "kiss" in combined:
            return (["female_breast", "nipples", "breast"], ["lips", "face", "person"])
        elif "embrace" in combined and ("touch" in combined or "groin" in combined):
            return (["person", "face"], ["vagina", "penis"])
        elif "full frontal" in combined:
            return (["face", "lips"], ["vagina", "penis", "person"])

        # Single targets
        if "oral" in combined or "fellatio" in combined or "blowjob" in combined:
            return (["penis", "lips", "face", "person"], None)
        elif "cunnilingus" in combined or "pussy licking" in combined:
            return (["vagina", "person"], None)
        elif "masturbation" in combined or "handjob" in combined:
            return (["penis", "hand", "person"], None)
        elif "fingering" in combined or "female masturbation" in combined:
            return (["vagina", "hand", "person"], None)
        elif "paizuri" in combined or "titjob" in combined or "breast" in combined:
            return (["female_breast", "nipples", "breast", "person"], None)
        elif "footjob" in combined or "soles" in combined:
            return (["adetailerfoot", "foot", "feet", "person"], None)
        elif "kissing" in combined or "lips" in combined:
            return (["lips", "face", "person"], None)
        elif "holding hands" in combined or "hand" in combined:
            return (["hand", "person"], None)
        elif "intercourse" in combined:
            return (["vagina", "penis", "person"], None)
        elif "rest" in combined or "lap" in combined or "spooning" in combined or "massage" in combined:
            return (["person", "face"], None)
        return (["person", "yolo8n-seg", "yolov8x-seg"], None)

    def _detect_box(self, pil_img: Image.Image, model_path: str, confidence: float):
        """Run YOLO inference and return the highest confidence bounding box [x1, y1, x2, y2]."""
        if not ULTRALYTICS_AVAILABLE or not model_path or not os.path.exists(model_path):
            return None
        try:
            yolo = YOLO(model_path)
            results = yolo.predict(pil_img, conf=confidence, verbose=False)
            if not results or len(results) == 0:
                return None
            boxes = results[0].boxes
            if boxes is None or len(boxes) == 0:
                return None
            best_box = None
            best_conf = 0.0
            for box in boxes:
                c = float(box.conf[0].cpu().numpy())
                if c > best_conf:
                    best_conf = c
                    best_box = box.xyxy[0].cpu().numpy()
            return best_box
        except Exception as e:
            print(f"[ZombiehausPersonInpaint] YOLO detection ({os.path.basename(model_path)}): {e}")
            return None

    def _generate_auto_mask(self, img_w: int, img_h: int, anat_box, person_box, mode: str, anat_box_2=None) -> Image.Image:
        """
        Generate staging mask based on targeted anatomical detector boxes,
        person bounding box, and the selected interaction mode.
        """
        mask = Image.new("L", (img_w, img_h), 0)
        draw = ImageDraw.Draw(mask)

        # Unpack person box if available
        px1, py1, px2, py2 = (0, 0, img_w, img_h)
        p_w = img_w
        p_h = img_h
        p_center_x = img_w / 2.0
        p_center_y = img_h / 2.0
        has_person = False
        if person_box is not None:
            px1, py1, px2, py2 = person_box
            p_w = px2 - px1
            p_h = py2 - py1
            p_center_x = (px1 + px2) / 2.0
            p_center_y = (py1 + py2) / 2.0
            has_person = True

        # Unpack primary anatomical box
        ax1, ay1, ax2, ay2 = (0, 0, 0, 0)
        a_w = 0
        a_h = 0
        a_center_x = p_center_x
        a_center_y = p_center_y
        has_anat = False
        if anat_box is not None:
            ax1, ay1, ax2, ay2 = anat_box
            a_w = ax2 - ax1
            a_h = ay2 - ay1
            a_center_x = (ax1 + ax2) / 2.0
            a_center_y = (ay1 + ay2) / 2.0
            has_anat = True

        # Unpack secondary anatomical box (for combos)
        gx1, gy1, gx2, gy2 = (0, 0, 0, 0)
        g_w = 0
        g_h = 0
        g_center_x = p_center_x
        g_center_y = p_center_y
        has_anat_2 = False
        if anat_box_2 is not None:
            gx1, gy1, gx2, gy2 = anat_box_2
            g_w = gx2 - gx1
            g_h = gy2 - gy1
            g_center_x = (gx1 + gx2) / 2.0
            g_center_y = (gy1 + gy2) / 2.0
            has_anat_2 = True

        # Determine side with more space relative to Person 1
        contact_on_right = (p_center_x < img_w / 2)

        # -----------------------------------------------------------------
        # 1. Multi-Action Combos (e.g. Kiss & Finger, Kiss & Stroke, Full Frontal)
        # -----------------------------------------------------------------
        if "Combo" in mode or "Full Frontal" in mode:
            # Upper Zone: Face / Lips
            if has_anat:
                face_top = max(0, int(ay1 - a_h * 2.0))
                face_bot = min(img_h, int(ay2 + a_h * 2.0))
                if contact_on_right:
                    face_left = max(0, int(ax1 - a_w * 0.4))
                    face_right = min(img_w, int(ax2 + max(a_w * 3.5, img_w * 0.30)))
                else:
                    face_left = max(0, int(ax1 - max(a_w * 3.5, img_w * 0.30)))
                    face_right = min(img_w, int(ax2 + a_w * 0.4))
                draw.rectangle([face_left, face_top, face_right, face_bot], fill=255)
            else:
                face_top = max(0, int(py1))
                face_bot = int(py1 + p_h * 0.35)
                if contact_on_right:
                    draw.rectangle([int(px1 + p_w * 0.25), face_top, min(img_w, int(px2 + p_w * 0.75)), face_bot], fill=255)
                else:
                    draw.rectangle([max(0, int(px1 - p_w * 0.75)), face_top, int(px2 - p_w * 0.25), face_bot], fill=255)

            # Lower Zone: Pelvis / Groin
            if has_anat_2:
                pel_top = max(0, int(gy1 - g_h * 0.6))
                pel_bot = min(img_h, int(gy2 + g_h * 0.8))
                if contact_on_right:
                    pel_left = max(0, int(gx1 - g_w * 0.3))
                    pel_right = min(img_w, int(gx2 + max(g_w * 3.5, img_w * 0.32)))
                else:
                    pel_left = max(0, int(gx1 - max(g_w * 3.5, img_w * 0.32)))
                    pel_right = min(img_w, int(gx2 + g_w * 0.3))
                draw.rectangle([pel_left, pel_top, pel_right, pel_bot], fill=255)
            else:
                pel_top = max(0, int(py1 + p_h * 0.45))
                pel_bot = min(img_h, int(py1 + p_h * 0.88))
                if contact_on_right:
                    draw.rectangle([int(px1 + p_w * 0.2), pel_top, min(img_w, int(px2 + p_w * 0.8)), pel_bot], fill=255)
                else:
                    draw.rectangle([max(0, int(px1 - p_w * 0.8)), pel_top, int(px2 - p_w * 0.2), pel_bot], fill=255)

            # Bridge: Torso & reaching arm connecting Face down to Groin
            bridge_top = max(0, int(py1 + p_h * 0.15)) if has_person else int(img_h * 0.15)
            bridge_bot = min(img_h, int(py1 + p_h * 0.80)) if has_person else int(img_h * 0.80)
            if contact_on_right:
                draw.rectangle([int(px1 + p_w * 0.25), bridge_top, min(img_w, int(px2 + p_w * 0.75)), bridge_bot], fill=255)
            else:
                draw.rectangle([max(0, int(px1 - p_w * 0.75)), bridge_top, int(px2 - p_w * 0.25), bridge_bot], fill=255)

        # -----------------------------------------------------------------
        # 2. Handjob / Masturbation (Sitting beside, kneeling, lying, versatile)
        # -----------------------------------------------------------------
        elif "Masturbation" in mode or "Handjob" in mode:
            # 1. Crotch / penis contact zone
            if has_anat:
                shaft_left = max(0, int(ax1 - a_w * 0.4))
                shaft_top = max(0, int(ay1 - a_h * 0.3))
                shaft_right = min(img_w, int(ax2 + a_w * 0.4))
                shaft_bot = min(img_h, int(ay2 + a_h * 0.3))
                draw.rectangle([shaft_left, shaft_top, shaft_right, shaft_bot], fill=255)
                ref_cx = a_center_x
                ref_y1 = ay1
                ref_y2 = ay2
            elif has_person:
                crotch_left = max(0, int(p_center_x - p_w * 0.35))
                crotch_top = max(0, int(py1 + p_h * 0.45))
                crotch_right = min(img_w, int(p_center_x + p_w * 0.35))
                crotch_bot = min(img_h, int(py1 + p_h * 0.85))
                draw.rectangle([crotch_left, crotch_top, crotch_right, crotch_bot], fill=255)
                ref_cx = p_center_x
                ref_y1 = crotch_top
                ref_y2 = crotch_bot
            else:
                draw.rectangle([int(img_w * 0.25), int(img_h * 0.45), int(img_w * 0.75), int(img_h * 0.85)], fill=255)
                ref_cx = img_w / 2.0
                ref_y1 = int(img_h * 0.45)
                ref_y2 = int(img_h * 0.85)

            # 2. Partner body space according to posture
            if "Sitting" in mode:
                # Seated beside: generous lateral width from waist down through thighs
                seat_top = max(0, int(py1 + p_h * 0.25)) if has_person else int(img_h * 0.25)
                seat_bot = min(img_h, int(py2 + p_h * 0.05)) if has_person else img_h
                if contact_on_right:
                    draw.rectangle([int(ref_cx - p_w * 0.1), seat_top, min(img_w, int(px2 + p_w * 0.90)), seat_bot], fill=255)
                else:
                    draw.rectangle([max(0, int(px1 - p_w * 0.90)), seat_top, int(ref_cx + p_w * 0.1), seat_bot], fill=255)

            elif "Lying" in mode:
                # Reclining / lying beside: horizontal breadth along pelvis and legs
                lie_top = max(0, int(py1 + p_h * 0.35)) if has_person else int(img_h * 0.35)
                lie_bot = min(img_h, int(py2 + p_h * 0.10)) if has_person else img_h
                if contact_on_right:
                    draw.rectangle([int(ref_cx - p_w * 0.1), lie_top, min(img_w, int(px2 + p_w * 0.95)), lie_bot], fill=255)
                else:
                    draw.rectangle([max(0, int(px1 - p_w * 0.95)), lie_top, int(ref_cx + p_w * 0.1), lie_bot], fill=255)

            elif "Kneeling" in mode:
                # Kneeling in front / between legs: downward and forward space
                kneel_top = max(0, int(ref_y1 - (a_h * 0.8 if has_anat else p_h * 0.15)))
                kneel_bot = min(img_h, int(ref_y2 + (a_h * 3.5 if has_anat else p_h * 0.35)))
                draw.rectangle([max(0, int(ref_cx - p_w * 0.45)), kneel_top, min(img_w, int(ref_cx + p_w * 0.45)), kneel_bot], fill=255)

            else:
                # Versatile default: encompasses both lateral sitting room AND lower kneeling room
                v_top = max(0, int(py1 + p_h * 0.22)) if has_person else int(img_h * 0.25)
                v_bot = min(img_h, int(py2 + p_h * 0.08)) if has_person else img_h
                if contact_on_right:
                    draw.rectangle([int(ref_cx - p_w * 0.15), v_top, min(img_w, int(px2 + p_w * 0.90)), v_bot], fill=255)
                else:
                    draw.rectangle([max(0, int(px1 - p_w * 0.90)), v_top, int(ref_cx + p_w * 0.15), v_bot], fill=255)

        # -----------------------------------------------------------------
        # 3. Oral / Fellatio / Blowjob
        # -----------------------------------------------------------------
        elif "Oral" in mode or "Fellatio" in mode or "Blowjob" in mode:
            if has_anat:
                draw.rectangle([max(0, int(a_center_x - max(a_w * 2.5, img_w * 0.22))),
                                max(0, int(ay1 - a_h * 0.6)),
                                min(img_w, int(a_center_x + max(a_w * 2.5, img_w * 0.22))),
                                min(img_h, int(ay2 + max(a_h * 3.5, img_h * 0.40)))], fill=255)
            elif has_person:
                pelvis_y1 = max(0, int(py1 + p_h * 0.45))
                pelvis_y2 = min(img_h, int(py1 + p_h * 0.90))
                draw.rectangle([max(0, int(p_center_x - p_w * 0.45)), pelvis_y1, min(img_w, int(p_center_x + p_w * 0.45)), pelvis_y2], fill=255)
                draw.rectangle([max(0, int(p_center_x - p_w * 0.55)), int(pelvis_y1 + p_h * 0.15), min(img_w, int(p_center_x + p_w * 0.55)), min(img_h, int(py2 + p_h * 0.15))], fill=255)
            else:
                draw.rectangle([int(img_w * 0.2), int(img_h * 0.45), int(img_w * 0.8), img_h], fill=255)

        # -----------------------------------------------------------------
        # 4. Cunnilingus / Pussy Licking
        # -----------------------------------------------------------------
        elif "Cunnilingus" in mode or "Pussy Licking" in mode or "Fingering" in mode:
            if has_anat:
                draw.rectangle([max(0, int(a_center_x - max(a_w * 2.5, img_w * 0.22))),
                                max(0, int(ay1 - a_h * 0.6)),
                                min(img_w, int(a_center_x + max(a_w * 2.5, img_w * 0.22))),
                                min(img_h, int(ay2 + max(a_h * 3.5, img_h * 0.40)))], fill=255)
            elif has_person:
                pelvis_y1 = max(0, int(py1 + p_h * 0.50))
                pelvis_y2 = min(img_h, int(py1 + p_h * 0.92))
                draw.rectangle([max(0, int(p_center_x - p_w * 0.45)), pelvis_y1, min(img_w, int(p_center_x + p_w * 0.45)), pelvis_y2], fill=255)
            else:
                draw.rectangle([int(img_w * 0.2), int(img_h * 0.5), int(img_w * 0.8), img_h], fill=255)

        # -----------------------------------------------------------------
        # 5. Paizuri / Titjob / Breast Play
        # -----------------------------------------------------------------
        elif "Paizuri" in mode or "Titjob" in mode or "Breast Play" in mode:
            if has_anat:
                draw.rectangle([max(0, int(ax1 - max(a_w * 0.5, img_w * 0.12))),
                                max(0, int(ay1 - max(a_h * 1.5, img_h * 0.22))),
                                min(img_w, int(ax2 + max(a_w * 0.5, img_w * 0.12))),
                                min(img_h, int(ay2 + max(a_h * 1.2, img_h * 0.18)))], fill=255)
            elif has_person:
                chest_y1 = max(0, int(py1 + p_h * 0.20))
                chest_y2 = min(img_h, int(py1 + p_h * 0.55))
                draw.rectangle([max(0, int(p_center_x - p_w * 0.45)), chest_y1, min(img_w, int(p_center_x + p_w * 0.45)), chest_y2], fill=255)
            else:
                draw.rectangle([int(img_w * 0.2), int(img_h * 0.2), int(img_w * 0.8), int(img_h * 0.65)], fill=255)

        # -----------------------------------------------------------------
        # 6. Intercourse (Straddling / Missionary / Doggy)
        # -----------------------------------------------------------------
        elif "Straddling" in mode or "Cowgirl" in mode:
            ref_x = a_center_x if has_anat else p_center_x
            ref_y = a_center_y if has_anat else (py1 + p_h * 0.55)
            draw.rectangle([max(0, int(ref_x - max(p_w * 0.55, img_w * 0.32))),
                            max(0, int(ref_y - max(p_h * 0.35, img_h * 0.30))),
                            min(img_w, int(ref_x + max(p_w * 0.55, img_w * 0.32))),
                            min(img_h, int(ref_y + max(p_h * 0.30, img_h * 0.25)))], fill=255)

        elif "Missionary" in mode or "Face-to-Face" in mode:
            ref_x = a_center_x if has_anat else p_center_x
            pelvis_y1 = max(0, int(py1 + p_h * 0.30)) if has_person else int(img_h * 0.25)
            pelvis_y2 = min(img_h, int(py1 + p_h * 0.90)) if has_person else int(img_h * 0.90)
            if ref_x < img_w / 2:
                draw.rectangle([int(ref_x - p_w * 0.2), pelvis_y1, min(img_w, int(px2 + p_w * 0.85)), pelvis_y2], fill=255)
            else:
                draw.rectangle([max(0, int(px1 - p_w * 0.85)), pelvis_y1, int(ref_x + p_w * 0.2), pelvis_y2], fill=255)

        elif "Doggy" in mode or "From Behind" in mode:
            pelvis_y1 = max(0, int(py1 + p_h * 0.35)) if has_person else int(img_h * 0.3)
            pelvis_y2 = min(img_h, int(py1 + p_h * 0.88)) if has_person else int(img_h * 0.85)
            if p_center_x < img_w / 2:
                draw.rectangle([max(0, int(px1 - p_w * 0.8)), pelvis_y1, int(px2), pelvis_y2], fill=255)
            else:
                draw.rectangle([int(px1), pelvis_y1, min(img_w, int(px2 + p_w * 0.8)), pelvis_y2], fill=255)

        # -----------------------------------------------------------------
        # 7. Footjob / Soles
        # -----------------------------------------------------------------
        elif "Footjob" in mode or "Soles" in mode:
            if has_anat:
                draw.rectangle([max(0, int(ax1 - a_w * 1.5)), max(0, int(ay1 - a_h * 1.5)),
                                min(img_w, int(ax2 + a_w * 1.5)), min(img_h, int(ay2 + a_h * 1.5))], fill=255)
            elif has_person:
                draw.rectangle([max(0, int(px1 - p_w * 0.2)), max(0, int(py1 + p_h * 0.65)),
                                min(img_w, int(px2 + p_w * 0.2)), min(img_h, int(py2 + p_h * 0.1))], fill=255)
            else:
                draw.rectangle([int(img_w * 0.15), int(img_h * 0.6), int(img_w * 0.85), img_h], fill=255)

        # -----------------------------------------------------------------
        # 8. Kissing / Lips & Face
        # -----------------------------------------------------------------
        elif "Kissing" in mode or "Lips" in mode:
            if has_anat:
                if a_center_x < img_w / 2:
                    draw.rectangle([max(0, int(ax1 - a_w * 0.5)), max(0, int(ay1 - a_h * 2.5)),
                                    min(img_w, int(ax2 + max(a_w * 3.5, img_w * 0.28))),
                                    min(img_h, int(ay2 + a_h * 2.5))], fill=255)
                else:
                    draw.rectangle([max(0, int(ax1 - max(a_w * 3.5, img_w * 0.28))),
                                    max(0, int(ay1 - a_h * 2.5)),
                                    min(img_w, int(ax2 + a_w * 0.5)),
                                    min(img_h, int(ay2 + a_h * 2.5))], fill=255)
            elif has_person:
                head_h = p_h * 0.35
                face_y1 = max(0, int(py1))
                face_y2 = min(img_h, int(py1 + head_h * 1.2))
                if p_center_x < img_w / 2:
                    draw.rectangle([int(px1 + p_w * 0.25), face_y1, min(img_w, int(px2 + p_w * 0.85)), face_y2], fill=255)
                else:
                    draw.rectangle([max(0, int(px1 - p_w * 0.85)), face_y1, int(px2 - p_w * 0.25), face_y2], fill=255)
            else:
                draw.rectangle([int(img_w * 0.25), 0, int(img_w * 0.75), int(img_h * 0.5)], fill=255)

        # -----------------------------------------------------------------
        # 9. Holding Hands
        # -----------------------------------------------------------------
        elif "Holding Hands" in mode:
            if has_anat:
                draw.rectangle([max(0, int(ax1 - max(a_w * 2.0, img_w * 0.2))),
                                max(0, int(ay1 - a_h * 1.5)),
                                min(img_w, int(ax2 + max(a_w * 2.0, img_w * 0.2))),
                                min(img_h, int(ay2 + a_h * 1.5))], fill=255)
            elif has_person:
                hand_y1 = max(0, int(py1 + p_h * 0.45))
                hand_y2 = min(img_h, int(py1 + p_h * 0.75))
                if p_center_x < img_w / 2:
                    draw.rectangle([int(px2 - p_w * 0.25), hand_y1, min(img_w, int(px2 + p_w * 0.8)), hand_y2], fill=255)
                else:
                    draw.rectangle([max(0, int(px1 - p_w * 0.8)), hand_y1, int(px1 + p_w * 0.25), hand_y2], fill=255)
            else:
                draw.rectangle([0, int(img_h * 0.4), int(img_w * 0.5), int(img_h * 0.8)], fill=255)

        # -----------------------------------------------------------------
        # 10. Spooning / Back Hug
        # -----------------------------------------------------------------
        elif "Spooning" in mode or "Back Hug" in mode:
            top = max(0, int(py1 - p_h * 0.05)) if has_person else 0
            bottom = min(img_h, int(py2 + p_h * 0.05)) if has_person else img_h
            if p_center_x < img_w / 2:
                draw.rectangle([max(0, int(px1 - p_w * 0.8)), top, int(px2 - p_w * 0.15), bottom], fill=255)
            else:
                draw.rectangle([int(px1 + p_w * 0.15), top, min(img_w, int(px2 + p_w * 0.8)), bottom], fill=255)

        elif "Lap Sitting" in mode or "Straddling Lap" in mode:
            draw.rectangle([max(0, int(p_center_x - p_w * 0.5)), max(0, int(py1 + p_h * 0.25)),
                            min(img_w, int(p_center_x + p_w * 0.5)), min(img_h, int(py1 + p_h * 0.85))], fill=255)

        elif "Head on Lap" in mode or "Resting" in mode:
            lap_y1 = max(0, int(py1 + p_h * 0.45)) if has_person else int(img_h * 0.4)
            lap_y2 = min(img_h, int(py1 + p_h * 0.85)) if has_person else int(img_h * 0.85)
            draw.rectangle([max(0, int(p_center_x - p_w * 0.65)), lap_y1, min(img_w, int(p_center_x + p_w * 0.65)), lap_y2], fill=255)

        elif "Left" in mode:
            mw = int(min(px2, max(p_w * 0.9, img_w * 0.48))) if has_person else int(img_w * 0.52)
            left = max(0, int(px1 - mw * 0.8)) if has_person else 0
            right = int(px1 + p_w * 0.25) if has_person else int(img_w * 0.55)
            top = max(0, int(py1 - p_h * 0.05)) if has_person else 0
            bottom = min(img_h, int(py2 + p_h * 0.05)) if has_person else img_h
            draw.rectangle([left, top, right, bottom], fill=255)

        elif "Right" in mode:
            mw = int(min(img_w - px1, max(p_w * 0.9, img_w * 0.48))) if has_person else int(img_w * 0.52)
            left = int(px2 - p_w * 0.25) if has_person else int(img_w * 0.45)
            right = min(img_w, int(px2 + mw * 0.8)) if has_person else img_w
            top = max(0, int(py1 - p_h * 0.05)) if has_person else 0
            bottom = min(img_h, int(py2 + p_h * 0.05)) if has_person else img_h
            draw.rectangle([left, top, right, bottom], fill=255)

        elif "Massage" in mode or "Oil Rub" in mode:
            top = max(0, int(py1 + p_h * 0.15)) if has_person else int(img_h * 0.2)
            bottom = min(img_h, int(py1 + p_h * 0.75)) if has_person else int(img_h * 0.75)
            draw.rectangle([max(0, int(p_center_x - p_w * 0.55)), top, min(img_w, int(p_center_x + p_w * 0.55)), bottom], fill=255)

        else:
            # Default half screen fallback
            draw.rectangle([0, 0, int(img_w * 0.5), img_h], fill=255)

        return mask

    def _get_prompt_hint(self, preset: str) -> str:
        """Return recommended interaction prompt phrasing for the active preset."""
        # Multi-Action Combos
        if "Kiss & Finger" in preset or "Kiss & Caress" in preset:
            return (
                "Two women locked in an intimate embrace, their lips pressed together in a passionate, deep kiss "
                "with tilted heads, while one woman's slender hand reaches down between her partner's parted thighs, "
                "fingers delicately caressing and fingering the glistening wet folds, bodies pressed flush against each other, "
                "soft sensual lighting, authentic skin texture, cinematic warmth."
            )
        elif "Kiss & Stroke" in preset or ("Kiss" in preset and "Handjob" in preset):
            return (
                "Two women kissing passionately, heads tilted and lips softly locked together, while one woman "
                "reaches down with her hand wrapped firmly around her partner's erect shaft, stroking in rhythm with the kiss, "
                "fingers with polished nails gripping tightly, pre-cum, bodies pressed close together, warm romantic bedroom atmosphere."
            )
        elif "Kiss & Breast Fondle" in preset:
            return (
                "Two women kissing tenderly with parted lips, eyes closed in pleasure, while one woman's warm hand "
                "cups and gently fondles her partner's soft breast, thumb grazing across the sensitive erect nipple, "
                "chest to chest intimacy, warm natural lighting, sensual mood."
            )
        elif "Paizuri & Kiss" in preset:
            return (
                "Passionate paizuri breast play combined with tender kissing, breasts pressed tightly around the erect shaft "
                "while leaning up to press lips against her partner's mouth, passionate eye contact, wet cleavage, flushed skin."
            )
        elif "Embrace & Intimate Touch" in preset:
            return (
                "An intimate embrace with arms wrapped around each other, one woman sliding a hand down over the other's hip "
                "and between her thighs in tender sensual caresses, lips whispering against her neck, goosebumps, warm romantic lighting."
            )
        elif "Full Frontal" in preset:
            return (
                "Two women intimately entangled along their entire bodies, faces close in a tender kiss, hands exploring "
                "each other's waist, hips, and groin, bodies pressed together with natural warmth, authentic candid photography."
            )

        # Masturbation / Handjob (Multiple Postures)
        elif "Sitting Beside" in preset and ("Masturbation" in preset or "Handjob" in preset):
            return (
                "A woman sitting closely beside her on the bed, leaning in with one hand firmly wrapped around "
                "her erect penis, stroking the shaft with slender manicured fingers, pre-cum, glistening wetness, "
                "looking into her eyes with an open-mouthed sensual smile, relaxed intimate bedroom setting."
            )
        elif "Lying Beside" in preset and ("Masturbation" in preset or "Handjob" in preset):
            return (
                "A woman lying comfortably on her side beside her, propped on one elbow, reaching over with her hand "
                "wrapped around her partner's erect shaft, gently stroking, soft bed sheets, relaxed tender expression, natural window light."
            )
        elif "Kneeling" in preset and ("Masturbation" in preset or "Handjob" in preset):
            return (
                "A woman kneeling closely between her knees, reaching out with both hands firmly wrapped around "
                "her erect penis, stroking the shaft, fingers with polished nails gripping tightly, pre-cum, "
                "veiny texture, looking up into her eyes with an open-mouthed sensual expression, glistening wetness."
            )
        elif "Masturbation" in preset or "Handjob" in preset:
            return (
                "A woman positioned closely beside her, reaching out with a hand firmly wrapped around "
                "her erect penis, stroking the shaft, fingers with polished nails gripping tightly, pre-cum, "
                "veiny texture, looking up into her eyes with an open-mouthed sensual expression, glistening wetness."
            )

        # Intimate Actions
        elif "Oral" in preset or "Fellatio" in preset or "Blowjob" in preset:
            return (
                "A woman positioned between her parted legs, head tilted down, performing deep oral fellatio, "
                "warm lips wrapped tightly around the shaft, tongue licking the sensitive tip, looking up with "
                "lustful eyes, messy hair, wet glistening skin, saliva strings, sensual natural lighting."
            )
        elif "Cunnilingus" in preset or "Pussy Licking" in preset:
            return (
                "A woman positioned between her spread legs, face buried between her thighs, performing intimate cunnilingus, "
                "tongue licking the glistening wet vulva and clitoris, fingers gently parting the labia, eyes closed in ecstasy, "
                "arousal, glistening wet juices, authentic skin pores."
            )
        elif "Paizuri" in preset or "Titjob" in preset or "Breast Play" in preset:
            return (
                "A woman pressing her generous soft breasts tightly together around an erect shaft in passionate paizuri, "
                "hands cupping her cleavage, cleavage pressed firmly, glistening baby oil, looking up sensually, flush cheeks."
            )
        elif "Female Masturbation" in preset or "Fingering" in preset:
            return (
                "A woman positioned closely beside her, reaching down between her thighs, gentle caressing and fingering, "
                "slender fingers glistening with natural arousal, touching the wet sensitive folds, tender moan, intimate bedroom atmosphere."
            )
        elif "Straddling" in preset or "Cowgirl" in preset:
            return (
                "Two women engaged in passionate intercourse, one mounted and straddling astride the other's hips, "
                "arching her back in pleasure, breasts swaying, hands planted on partner's chest, deep penetration, intense gaze, authentic sweat beads."
            )
        elif "Missionary" in preset or "Face-to-Face" in preset:
            return (
                "Two women engaged in intimate face-to-face missionary intercourse, bodies pressed together from chest to thighs, "
                "interlocking fingers, legs wrapped around hips, tender yet intense passion, parted lips, glistening skin, soft warm shadows."
            )
        elif "Doggy" in preset or "From Behind" in preset:
            return (
                "Passionate intercourse from behind, hands gripping hips tightly, arched lower back, round buttocks, "
                "deep intimate connection, flushed skin, breathless expression, dynamic authentic perspective."
            )
        elif "Footjob" in preset or "Soles" in preset:
            return (
                "A woman skillfully stroking with the soft soles and arched instep of her bare feet, delicate pedicured toes, "
                "gentle pressure, sensual teasing, reclining playfully on silky sheets, warm bedroom lighting."
            )
        elif "Massage" in preset or "Oil Rub" in preset:
            return (
                "A woman positioned over her, hands glistening with warm aromatic massage oil, gently rubbing shoulders and back, "
                "smooth soothing touch, glowing warm candlelight, relaxed blissful expression."
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
        elif "Spooning" in preset or "Back Hug" in preset:
            return (
                "A woman embracing her from behind in an intimate back hug, arms wrapped around her waist, "
                "chin resting on her shoulder, soft gentle smile, cozy atmosphere, warm golden hour glow."
            )
        elif "Lap Sitting" in preset:
            return (
                "A woman sitting playfully on her lap, arms loosely draped around her neck, smiling into each other's eyes, "
                "bodies pressed together, casual intimate pose, natural lighting."
            )
        elif "Head on Lap" in preset:
            return (
                "A woman resting her head gently on her partner's lap, looking up with loving eyes, "
                "gentle hand caressing and brushing through her soft hair, peaceful tender moment, soft window light."
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
                       optional_mask=None, detector_model="Auto (Targeted by Preset)",
                       detection_confidence=0.35, positive_override=None, negative_override=None):

        # 1. Resolve pipe components
        model = pipe[0]
        clip = pipe[1]
        vae = pipe[2]
        positive = positive_override if positive_override is not None else pipe[3]
        negative = negative_override if negative_override is not None else pipe[4]

        # 2. Preset denoise resolution if not custom
        effective_denoise = denoise
        if "Kiss" in interaction_preset or "Oral" in interaction_preset or "Fellatio" in interaction_preset or "Cunnilingus" in interaction_preset:
            effective_denoise = min(denoise, 0.85)
        elif "Intercourse" in interaction_preset or "Full Frontal" in interaction_preset:
            effective_denoise = min(denoise, 0.86)
        elif "Paizuri" in interaction_preset or "Breast Play" in interaction_preset:
            effective_denoise = min(denoise, 0.87)
        elif "Masturbation" in interaction_preset or "Handjob" in interaction_preset or "Fingering" in interaction_preset:
            effective_denoise = min(denoise, 0.88)
        elif "Massage" in interaction_preset or "Spooning" in interaction_preset or "Lap" in interaction_preset or "Embrace" in interaction_preset:
            effective_denoise = min(denoise, 0.88)
        elif "Holding Hands" in interaction_preset or "Footjob" in interaction_preset:
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
            # Auto staging mode via targeted YOLO detectors
            anat_box = None
            anat_box_2 = None
            person_box = None

            if ULTRALYTICS_AVAILABLE:
                target_kws, secondary_kws = self._get_target_detector_keywords(staging_mode, interaction_preset)

                if detector_model != "Auto (Targeted by Preset)":
                    custom_path = _resolve_model_path(detector_model)
                    if custom_path:
                        anat_box = self._detect_box(pil_img, custom_path, detection_confidence)
                else:
                    target_model_path = _find_detector_model_path(target_kws)
                    if target_model_path:
                        anat_box = self._detect_box(pil_img, target_model_path, detection_confidence)
                    if secondary_kws:
                        sec_model_path = _find_detector_model_path(secondary_kws)
                        if sec_model_path:
                            anat_box_2 = self._detect_box(pil_img, sec_model_path, detection_confidence)

                # Also detect full person boundary as spatial reference
                person_model_path = _find_detector_model_path(["person_yolov8n-seg", "yolov8x-seg", "person"])
                if person_model_path:
                    person_box = self._detect_box(pil_img, person_model_path, detection_confidence)

            mask_pil = self._generate_auto_mask(w, h, anat_box, person_box, staging_mode, anat_box_2=anat_box_2)

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
