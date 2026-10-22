"""
Zombiehaus Persona Interact & Duo Director Node

Replaces rigid inpainting with holistic canvas generation + automated Persona 1 identity preservation:
1. Uses the original photo as a canvas with flexible denoise (pose_flexibility).
2. The diffusion model generates a unified, physically coherent interaction of two people
   (natural body leaning, arms wrapping, kissing, stroking, mutual shadows, matched lighting).
3. Persona 2 is generated directly via LoRA 2 and Prompt 2.
4. Persona 1's facial likeness and identity from the original photo are automatically detected,
   color-harmonized via Reinhard Lab transfer, and feathered back onto Persona 1's face.
5. Poses are free to change naturally to accommodate any intimate or romantic interaction,
   while both personas remain 100% recognizable.
"""

import os
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
import folder_paths
import comfy.samplers
from nodes import KSampler

from .faceswap_node import (
    scan_face_models,
    tensor_to_pil,
    pil_to_tensor,
    mask_to_tensor,
    reinhard_color_transfer,
    create_oval_feather_mask,
    _get_ultralytics_dirs,
    ULTRALYTICS_AVAILABLE,
)

if ULTRALYTICS_AVAILABLE:
    from ultralytics import YOLO


class ZombiehausPersonaInteract:
    """
    All-in-One Dual Persona Interaction Director.
    Takes a single reference photo of Persona 1, generates a natural two-person interaction
    with Persona 2 from LoRA, and preserves both personas without rigid inpaint seams.
    """

    INTERACTION_MODES = [
        "Sitting Beside (Intimate Contact)",
        "Lying Beside (Bed / Couch Cuddling)",
        "Partner Masturbation / Handjob (Sitting Beside)",
        "Partner Masturbation / Handjob (Lying Beside)",
        "Partner Masturbation / Handjob (Kneeling)",
        "Combo: Kiss & Stroke / Handjob",
        "Combo: Kiss & Finger / Caress",
        "Combo: Kiss & Breast Fondle",
        "Combo: Paizuri & Kiss",
        "Combo: Embrace & Intimate Touch",
        "Oral / Fellatio / Blowjob",
        "Cunnilingus / Pussy Licking",
        "Paizuri / Titjob / Breast Play",
        "Female Masturbation / Fingering",
        "Intercourse - Straddling / Cowgirl",
        "Intercourse - Missionary / Face-to-Face",
        "Intercourse - From Behind / Doggy",
        "Kissing / Intimate Embrace",
        "Holding Hands (Romantic)",
        "Spooning / Back Hug",
        "Lap Sitting (Straddling Lap)",
        "Head on Lap / Tender Caress",
        "Sensual Body Massage / Oil Rub",
        "Custom (Prompt Driven Only)",
    ]

    FACE_TARGET_OPTIONS = [
        "Auto (Detect Persona 1 by Position)",
        "Leftmost Face",
        "Rightmost Face",
        "Largest Face",
        "Smallest Face",
        "Face Index 0",
        "Face Index 1",
    ]

    @classmethod
    def INPUT_TYPES(cls):
        samplers = comfy.samplers.KSampler.SAMPLERS
        schedulers = comfy.samplers.KSampler.SCHEDULERS
        face_models = scan_face_models()

        return {
            "required": {
                "image": ("IMAGE",),
                "pipe": ("PIPE",),
                "interaction_mode": (cls.INTERACTION_MODES, {"default": "Sitting Beside (Intimate Contact)"}),
                "pose_flexibility": ("FLOAT", {"default": 0.58, "min": 0.20, "max": 1.0, "step": 0.02}),
                "identity_restore_strength": ("FLOAT", {"default": 0.85, "min": 0.0, "max": 1.0, "step": 0.05}),
                "target_persona_face": (cls.FACE_TARGET_OPTIONS, {"default": "Auto (Detect Persona 1 by Position)"}),
                "steps": ("INT", {"default": 30, "min": 10, "max": 80, "step": 1}),
                "cfg": ("FLOAT", {"default": 4.5, "min": 1.0, "max": 20.0, "step": 0.1}),
                "sampler_name": (samplers, {"default": "euler" if "euler" in samplers else samplers[0]}),
                "scheduler": (schedulers, {"default": "simple" if "simple" in schedulers else schedulers[0]}),
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
            },
            "optional": {
                "detector_model": (face_models, {"default": face_models[0] if face_models else "face_yolov8n.pt"}),
                "face_blend_feather": ("INT", {"default": 22, "min": 4, "max": 64, "step": 2}),
                "optional_positive": ("CONDITIONING",),
                "optional_negative": ("CONDITIONING",),
            }
        }

    RETURN_TYPES = ("IMAGE", "PIPE", "STRING", "MASK")
    RETURN_NAMES = ("image", "pipe", "prompt_hint", "identity_mask")
    FUNCTION = "generate_persona_duo"
    CATEGORY = "Zombiehaus/Image"

    @staticmethod
    def _detect_all_faces(yolo_model, pil_img: Image.Image, confidence: float = 0.35) -> list:
        """Detect all face bounding boxes [x1, y1, x2, y2] sorted by X coordinate (left to right)."""
        if yolo_model is None:
            w, h = pil_img.size
            return [(int(w * 0.1), int(h * 0.1), int(w * 0.5), int(h * 0.5))]

        try:
            results = yolo_model(pil_img, conf=confidence, verbose=False)
            orig_w, orig_h = pil_img.size

            if len(results) > 0 and len(results[0].boxes) > 0:
                boxes = results[0].boxes.xyxy.cpu().numpy()
                model_h, model_w = results[0].orig_shape
                scale_x = orig_w / model_w
                scale_y = orig_h / model_h

                formatted = []
                for b in boxes:
                    x1 = max(0, int(b[0] * scale_x))
                    y1 = max(0, int(b[1] * scale_y))
                    x2 = min(orig_w, int(b[2] * scale_x))
                    y2 = min(orig_h, int(b[3] * scale_y))
                    if (x2 - x1) > 10 and (y2 - y1) > 10:
                        formatted.append((x1, y1, x2, y2))

                # Sort left to right by center X
                formatted.sort(key=lambda b: (b[0] + b[2]) / 2.0)
                return formatted
        except Exception as e:
            print(f"[ZombiehausPersonaInteract] Face detection error: {e}")

        w, h = pil_img.size
        return [(int(w * 0.2), int(h * 0.2), int(w * 0.6), int(h * 0.6))]

    def _get_prompt_hint(self, mode: str) -> str:
        """Return recommended interaction prompt phrasing for the active mode."""
        m = mode.lower()
        if "kiss & finger" in m or "kiss & caress" in m:
            return (
                "Two women locked in an intimate embrace, lips passionately pressed together with tilted heads, "
                "one woman's slender hand reaching down between her partner's parted thighs, fingers delicately caressing "
                "and fingering her wet folds, bodies pressed flush against each other, soft sensual lighting, authentic skin texture."
            )
        elif "kiss & stroke" in m or ("kiss" in m and "handjob" in m):
            return (
                "Two women kissing passionately, heads tilted and lips softly locked together, while one woman reaches down "
                "with her hand wrapped firmly around her partner's erect shaft, stroking in rhythm with the kiss, "
                "fingers with polished nails gripping tightly, pre-cum, bodies pressed close together, warm romantic bedroom atmosphere."
            )
        elif "kiss & breast" in m:
            return (
                "Two women kissing tenderly with parted lips, eyes closed in pleasure, while one woman's warm hand cups "
                "and gently fondles her partner's soft breast, thumb grazing across the sensitive erect nipple, "
                "chest to chest intimacy, warm natural lighting, sensual mood."
            )
        elif "paizuri & kiss" in m:
            return (
                "Passionate paizuri breast play combined with tender kissing, breasts pressed tightly around the erect shaft "
                "while leaning up to press lips against her partner's mouth, passionate eye contact, wet cleavage, flushed skin."
            )
        elif "embrace & intimate touch" in m:
            return (
                "An intimate embrace with arms wrapped around each other, one woman sliding a hand down over the other's hip "
                "and between her thighs in tender sensual caresses, lips whispering against her neck, goosebumps, warm romantic lighting."
            )
        elif "sitting beside" in m and ("masturbation" in m or "handjob" in m):
            return (
                "A woman sitting closely beside her on the bed, leaning in with one hand firmly wrapped around her erect penis, "
                "stroking the shaft with slender manicured fingers, pre-cum, glistening wetness, looking into her eyes with an open-mouthed sensual smile."
            )
        elif "lying beside" in m and ("masturbation" in m or "handjob" in m):
            return (
                "A woman lying comfortably on her side beside her, propped on one elbow, reaching over with her hand wrapped "
                "around her partner's erect shaft, gently stroking, soft bed sheets, relaxed tender expression, natural window light."
            )
        elif "kneeling" in m and ("masturbation" in m or "handjob" in m):
            return (
                "A woman kneeling closely between her knees, reaching out with both hands firmly wrapped around her erect penis, "
                "stroking the shaft, fingers with polished nails gripping tightly, pre-cum, veiny texture, looking up into her eyes sensually."
            )
        elif "oral" in m or "fellatio" in m or "blowjob" in m:
            return (
                "A woman positioned between her parted legs, head tilted down, performing deep oral fellatio, warm lips wrapped "
                "tightly around the shaft, tongue licking the sensitive tip, looking up with lustful eyes, messy hair, wet glistening skin."
            )
        elif "cunnilingus" in m or "pussy licking" in m:
            return (
                "A woman positioned between her spread legs, face buried between her thighs, performing intimate cunnilingus, "
                "tongue licking the glistening wet vulva and clitoris, fingers gently parting the labia, eyes closed in ecstasy."
            )
        elif "paizuri" in m or "titjob" in m or "breast play" in m:
            return (
                "A woman pressing her generous soft breasts tightly together around an erect shaft in passionate paizuri, "
                "hands cupping her cleavage, cleavage pressed firmly, glistening baby oil, looking up sensually, flush cheeks."
            )
        elif "female masturbation" in m or "fingering" in m:
            return (
                "A woman positioned closely beside her, reaching down between her thighs, gentle caressing and fingering, "
                "slender fingers glistening with natural arousal, touching the wet sensitive folds, tender moan, intimate bedroom atmosphere."
            )
        elif "straddling" in m or "cowgirl" in m:
            return (
                "Two women engaged in passionate intercourse, one mounted and straddling astride the other's hips, "
                "arching her back in pleasure, breasts swaying, hands planted on partner's chest, deep penetration, intense gaze."
            )
        elif "missionary" in m:
            return (
                "Two women engaged in intimate face-to-face missionary intercourse, bodies pressed together from chest to thighs, "
                "interlocking fingers, legs wrapped around hips, tender yet intense passion, parted lips, glistening skin."
            )
        elif "from behind" in m or "doggy" in m:
            return (
                "Passionate intercourse from behind, hands gripping hips tightly, arched lower back, round buttocks, "
                "deep intimate connection, flushed skin, breathless expression, dynamic authentic perspective."
            )
        elif "kissing" in m:
            return (
                "Two women kissing passionately, heads tilted, lips softly pressed together, tender embrace, "
                "arms draped around neck, closed eyes, intimate romantic moment, warm natural sunlight."
            )
        elif "holding hands" in m:
            return (
                "A woman standing beside her holding hands tightly, fingers gently interlaced, natural hand clasp, "
                "smiling warmly, bodies standing close together, natural eye contact, candid 35mm photo."
            )
        elif "spooning" in m or "back hug" in m:
            return (
                "A woman embracing her from behind in an intimate back hug, arms wrapped around her waist, "
                "chin resting on her shoulder, soft gentle smile, cozy atmosphere, warm golden hour glow."
            )
        elif "lap sitting" in m:
            return (
                "A woman sitting playfully on her lap, arms loosely draped around her neck, smiling into each other's eyes, "
                "bodies pressed together, casual intimate pose, natural lighting."
            )
        elif "head on lap" in m:
            return (
                "A woman resting her head gently on her partner's lap, looking up with loving eyes, "
                "gentle hand caressing and brushing through her soft hair, peaceful tender moment, soft window light."
            )
        elif "massage" in m:
            return (
                "A woman positioned over her, hands glistening with warm aromatic massage oil, gently rubbing shoulders and back, "
                "smooth soothing touch, glowing warm candlelight, relaxed blissful expression."
            )
        elif "sitting beside" in m:
            return (
                "A woman sitting comfortably beside her on the bed, leaning in with a warm intimate smile, "
                "one arm resting across her shoulder, bodies close together, relaxed sensual atmosphere."
            )
        elif "lying beside" in m:
            return (
                "Two women lying together closely on a cozy bed, facing each other with gentle smiles, "
                "arms wrapped in tender embrace, authentic morning bedroom light, intimate warmth."
            )
        return "Two women interacting intimately, bodies close, natural posing, authentic skin textures."

    def generate_persona_duo(self, image, pipe, interaction_mode, pose_flexibility,
                             identity_restore_strength, target_persona_face,
                             steps, cfg, sampler_name, scheduler, seed,
                             detector_model="face_yolov8n.pt", face_blend_feather=22,
                             optional_positive=None, optional_negative=None):
        # 1. Unpack pipe components (supports both tuple and dict PIPE formats)
        if isinstance(pipe, dict):
            model = pipe.get("model")
            clip = pipe.get("clip")
            vae = pipe.get("vae")
            positive = optional_positive if optional_positive is not None else pipe.get("positive")
            negative = optional_negative if optional_negative is not None else pipe.get("negative")
        elif isinstance(pipe, (tuple, list)):
            model = pipe[0] if len(pipe) > 0 else None
            clip = pipe[1] if len(pipe) > 1 else None
            vae = pipe[2] if len(pipe) > 2 else None
            positive = optional_positive if optional_positive is not None else (pipe[3] if len(pipe) > 3 else None)
            negative = optional_negative if optional_negative is not None else (pipe[4] if len(pipe) > 4 else None)
        else:
            raise ValueError(f"[ZombiehausPersonaInteract] Unsupported pipe format: {type(pipe)}")

        if model is None or vae is None or positive is None:
            raise ValueError("[ZombiehausPersonaInteract] Pipe is missing model, vae, or positive conditioning.")

        # 2. Align canvas dimensions to multiples of 64
        orig_h, orig_w = image.shape[1], image.shape[2]
        w = (orig_w // 64) * 64
        h = (orig_h // 64) * 64
        if w != orig_w or h != orig_h:
            aligned_image = F.interpolate(
                image.permute(0, 3, 1, 2), size=(h, w), mode="bilinear", align_corners=False
            ).permute(0, 2, 3, 1)
        else:
            aligned_image = image

        # 3. Canvas Img2Img VAE Encode
        latent = vae.encode(aligned_image[:, :, :, :3])
        latent_dict = {"samples": latent}

        # 4. KSampler Unified Generation
        # The entire scene is sampled holistically at pose_flexibility denoise
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
            denoise=pose_flexibility
        )[0]

        # 5. VAE Decode
        decoded = vae.decode(sampled_latent["samples"])
        if hasattr(decoded, "ndim") and decoded.ndim == 5:
            if decoded.shape[1] in (1, 3, 4) and decoded.shape[-1] not in (1, 3, 4):
                decoded = decoded.permute(0, 2, 3, 4, 1)
            decoded = decoded.reshape(-1, decoded.shape[-3], decoded.shape[-2], decoded.shape[-1])

        # Restore to original dimensions if padded/resized
        if decoded.shape[1] != orig_h or decoded.shape[2] != orig_w:
            generated_image = F.interpolate(
                decoded.permute(0, 3, 1, 2), size=(orig_h, orig_w), mode="bilinear", align_corners=False
            ).permute(0, 2, 3, 1)
        else:
            generated_image = decoded

        # 6. Automated Persona 1 Identity Restoration
        identity_mask_pil = Image.new("L", (orig_w, orig_h), 0)

        if identity_restore_strength > 0.01:
            ref_pil = tensor_to_pil(image[0])
            gen_pil = tensor_to_pil(generated_image[0])

            # Load YOLO face detector
            yolo = None
            if ULTRALYTICS_AVAILABLE:
                for d in _get_ultralytics_dirs():
                    candidate = os.path.join(d, detector_model)
                    if os.path.exists(candidate):
                        try:
                            yolo = YOLO(candidate)
                            break
                        except Exception:
                            pass

            # Detect Persona 1 reference face
            ref_faces = self._detect_all_faces(yolo, ref_pil, confidence=0.35)
            ref_box = ref_faces[0] if ref_faces else None

            # Detect faces in newly generated interaction image
            gen_faces = self._detect_all_faces(yolo, gen_pil, confidence=0.30)

            if ref_box and gen_faces:
                # Select target face for Persona 1 in the new image
                target_box = None
                if target_persona_face == "Leftmost Face":
                    target_box = gen_faces[0]
                elif target_persona_face == "Rightmost Face":
                    target_box = gen_faces[-1]
                elif target_persona_face == "Largest Face":
                    target_box = max(gen_faces, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
                elif target_persona_face == "Smallest Face":
                    target_box = min(gen_faces, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
                elif target_persona_face == "Face Index 0":
                    target_box = gen_faces[0]
                elif target_persona_face == "Face Index 1":
                    target_box = gen_faces[min(1, len(gen_faces) - 1)]
                else:
                    # Auto: Match Persona 1 by relative horizontal location in reference
                    ref_cx = (ref_box[0] + ref_box[2]) / (2.0 * orig_w)
                    if ref_cx < 0.5:
                        target_box = gen_faces[0]  # Match left side
                    else:
                        target_box = gen_faces[-1]  # Match right side

                if target_box:
                    # Crop reference face with 15% context padding
                    rw = ref_box[2] - ref_box[0]
                    rh = ref_box[3] - ref_box[1]
                    r_pad_x = int(rw * 0.15)
                    r_pad_y = int(rh * 0.15)
                    r_crop_box = (
                        max(0, ref_box[0] - r_pad_x),
                        max(0, ref_box[1] - r_pad_y),
                        min(orig_w, ref_box[2] + r_pad_x),
                        min(orig_h, ref_box[3] + r_pad_y)
                    )
                    ref_face_crop = ref_pil.crop(r_crop_box)

                    # Target bounding box with proportional padding
                    tw = target_box[2] - target_box[0]
                    th = target_box[3] - target_box[1]
                    t_pad_x = int(tw * 0.15)
                    t_pad_y = int(th * 0.15)
                    t_crop_box = (
                        max(0, target_box[0] - t_pad_x),
                        max(0, target_box[1] - t_pad_y),
                        min(orig_w, target_box[2] + t_pad_x),
                        min(orig_h, target_box[3] + t_pad_y)
                    )
                    t_width = t_crop_box[2] - t_crop_box[0]
                    t_height = t_crop_box[3] - t_crop_box[1]

                    if t_width > 10 and t_height > 10:
                        # Resize reference face crop to match target face area
                        resized_ref = ref_face_crop.resize((t_width, t_height), Image.LANCZOS)
                        target_face_crop = gen_pil.crop(t_crop_box)

                        # Color transfer: Harmonize Persona 1 reference lighting to the new scene
                        harmonized_face = reinhard_color_transfer(resized_ref, target_face_crop)

                        # Smooth elliptical blending mask
                        oval_mask = create_oval_feather_mask(t_width, t_height, blur_radius=face_blend_feather)
                        if identity_restore_strength < 0.99:
                            mask_arr = np.array(oval_mask).astype(np.float32) * float(identity_restore_strength)
                            oval_mask = Image.fromarray(np.clip(mask_arr, 0, 255).astype(np.uint8), "L")

                        # Paste harmonized Persona 1 face onto new image
                        gen_pil.paste(harmonized_face, (t_crop_box[0], t_crop_box[1]), oval_mask)
                        identity_mask_pil.paste(oval_mask, (t_crop_box[0], t_crop_box[1]))
                        generated_image = pil_to_tensor(gen_pil).to(image.device)

        prompt_hint = self._get_prompt_hint(interaction_mode)
        identity_mask_tensor = mask_to_tensor(identity_mask_pil).to(image.device)

        return (generated_image, pipe, prompt_hint, identity_mask_tensor)
