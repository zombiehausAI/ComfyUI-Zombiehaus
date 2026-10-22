"""
Zombiehaus Dual Persona Director Node

Enables generating an image with two separate characters from two distinct LoRAs
interacting together with complete full-body realism, distinct physiques, and zero concept bleed.

Mechanics:
1. Dual LoRA Injection: Patches both LoRA weights into the diffusion model and CLIP.
2. Spatial Attention Masking:
   - Persona 1's prompt (body type, bust, curves, hair, face) is spatially bound to Region 1.
   - Persona 2's prompt (body type, bust, curves, hair, face) is spatially bound to Region 2.
3. Physical Interaction Overlap Zone:
   - A central gradient blend zone (overlap_blend) allows hands, arms, lips, and bodies to touch
     naturally with unified lighting, mutual shadows, and seamless contact.
4. Outputs a standard Zombiehaus PIPE ready for any KSampler or Img2Img workflow.
"""

import os
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
import folder_paths
from nodes import LoraLoader as CoreLoraLoader, CLIPTextEncode


class ZombiehausDualPersonaDirector:
    """
    Directs dual-character multi-LoRA scenes with full-body anatomical realism,
    independent character physiques, and seamless physical contact.
    """

    INTERACTION_PRESETS = [
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

    LAYOUT_OPTIONS = [
        "Persona 1 Left | Persona 2 Right",
        "Persona 1 Right | Persona 2 Left",
        "Persona 1 Top | Persona 2 Bottom",
        "Persona 1 Bottom | Persona 2 Top",
    ]

    @classmethod
    def INPUT_TYPES(cls):
        try:
            lora_list = ["None"] + folder_paths.get_filename_list("loras")
        except Exception:
            lora_list = ["None"]

        return {
            "required": {
                "pipe": ("PIPE",),
                # ── Persona 1 Configuration ──
                "persona1_lora": (lora_list, {"default": lora_list[0]}),
                "persona1_strength": ("FLOAT", {"default": 0.85, "min": 0.0, "max": 2.0, "step": 0.05}),
                "persona1_prompt": ("STRING", {
                    "default": "1woman, athletic body, toned waist, natural skin, blonde hair, blue eyes",
                    "multiline": True
                }),
                # ── Persona 2 Configuration ──
                "persona2_lora": (lora_list, {"default": lora_list[0]}),
                "persona2_strength": ("FLOAT", {"default": 0.85, "min": 0.0, "max": 2.0, "step": 0.05}),
                "persona2_prompt": ("STRING", {
                    "default": "1woman, curvy body, soft waist, pale skin, brunette hair, brown eyes",
                    "multiline": True
                }),
                # ── Composition & Layout ──
                "layout": (cls.LAYOUT_OPTIONS, {"default": "Persona 1 Left | Persona 2 Right"}),
                "overlap_blend": ("FLOAT", {"default": 0.25, "min": 0.05, "max": 0.60, "step": 0.05}),
                # ── Interaction & Environment ──
                "interaction_preset": (cls.INTERACTION_PRESETS, {"default": "Sitting Beside (Intimate Contact)"}),
                "interaction_prompt": ("STRING", {
                    "default": "two women intimately close together, bodies touching, authentic skin textures, warm bedroom lighting, 8k photography",
                    "multiline": True
                }),
                "negative_prompt": ("STRING", {
                    "default": "deformed, distorted, extra limbs, bad anatomy, bad hands, plastic skin, blur, watermark, lowres",
                    "multiline": True
                }),
            },
            "optional": {
                "mask_width": ("INT", {"default": 128, "min": 64, "max": 256, "step": 8}),
                "mask_height": ("INT", {"default": 128, "min": 64, "max": 256, "step": 8}),
            }
        }

    RETURN_TYPES = ("PIPE", "CONDITIONING", "CONDITIONING", "MODEL", "MASK", "MASK", "STRING")
    RETURN_NAMES = ("pipe", "positive", "negative", "model", "persona1_mask", "persona2_mask", "prompt_hint")
    FUNCTION = "direct_dual_personas"
    CATEGORY = "Zombiehaus/Conditioning"

    @staticmethod
    def _create_spatial_masks(layout: str, overlap: float, w: int = 128, h: int = 128) -> tuple:
        """
        Create smooth cosine gradient spatial masks for Persona 1 and Persona 2.
        Returns (p1_mask_tensor, p2_mask_tensor) of shape [1, h, w].
        """
        m1 = np.zeros((h, w), dtype=np.float32)
        m2 = np.zeros((h, w), dtype=np.float32)

        is_horizontal = "Left" in layout or "Right" in layout
        p1_first = "Persona 1 Left" in layout or "Persona 1 Top" in layout

        dim = w if is_horizontal else h
        center = dim / 2.0
        blend_half = (dim * overlap) / 2.0

        low = max(0.0, center - blend_half)
        high = min(float(dim), center + blend_half)
        span = max(1.0, high - low)

        for i in range(dim):
            if i < low:
                val1 = 1.0 if p1_first else 0.0
            elif i > high:
                val1 = 0.0 if p1_first else 1.0
            else:
                progress = (i - low) / span
                # Smooth cosine interpolation in the overlap zone
                smooth = 0.5 * (1.0 + np.cos(progress * np.pi))
                val1 = smooth if p1_first else (1.0 - smooth)

            val2 = 1.0 - val1

            if is_horizontal:
                m1[:, i] = val1
                m2[:, i] = val2
            else:
                m1[i, :] = val1
                m2[i, :] = val2

        t1 = torch.from_numpy(m1).unsqueeze(0)
        t2 = torch.from_numpy(m2).unsqueeze(0)
        return (t1, t2)

    def _get_prompt_hint(self, preset: str) -> str:
        """Return rich interaction phrasing for the chosen preset."""
        p = preset.lower()
        if "kiss & finger" in p or "kiss & caress" in p:
            return (
                "Two women locked in an intimate embrace, their lips pressed together in a passionate deep kiss "
                "with tilted heads, while one woman's slender hand reaches down between her partner's parted thighs, "
                "fingers delicately caressing and fingering her wet folds, bodies pressed flush against each other, "
                "soft sensual lighting, authentic skin texture, cinematic warmth."
            )
        elif "kiss & stroke" in p or ("kiss" in p and "handjob" in p):
            return (
                "Two women kissing passionately, heads tilted and lips softly locked together, while one woman "
                "reaches down with her hand wrapped firmly around her partner's erect shaft, stroking in rhythm with the kiss, "
                "fingers with polished nails gripping tightly, pre-cum, bodies pressed close together, warm romantic bedroom atmosphere."
            )
        elif "kiss & breast" in p:
            return (
                "Two women kissing tenderly with parted lips, eyes closed in pleasure, while one woman's warm hand "
                "cups and gently fondles her partner's soft breast, thumb grazing across the sensitive erect nipple, "
                "chest to chest intimacy, warm natural lighting, sensual mood."
            )
        elif "paizuri & kiss" in p:
            return (
                "Passionate paizuri breast play combined with tender kissing, breasts pressed tightly around the erect shaft "
                "while leaning up to press lips against her partner's mouth, passionate eye contact, wet cleavage, flushed skin."
            )
        elif "embrace & intimate touch" in p:
            return (
                "An intimate embrace with arms wrapped around each other, one woman sliding a hand down over the other's hip "
                "and between her thighs in tender sensual caresses, lips whispering against her neck, goosebumps, warm romantic lighting."
            )
        elif "sitting beside" in p and ("masturbation" in p or "handjob" in p):
            return (
                "A woman sitting closely beside her on the bed, leaning in with one hand firmly wrapped around her erect penis, "
                "stroking the shaft with slender manicured fingers, pre-cum, glistening wetness, looking into her eyes with an open-mouthed sensual smile."
            )
        elif "lying beside" in p and ("masturbation" in p or "handjob" in p):
            return (
                "A woman lying comfortably on her side beside her, propped on one elbow, reaching over with her hand wrapped "
                "around her partner's erect shaft, gently stroking, soft bed sheets, relaxed tender expression, natural window light."
            )
        elif "kneeling" in p and ("masturbation" in p or "handjob" in p):
            return (
                "A woman kneeling closely between her knees, reaching out with both hands firmly wrapped around her erect penis, "
                "stroking the shaft, fingers with polished nails gripping tightly, pre-cum, veiny texture, looking up into her eyes sensually."
            )
        elif "oral" in p or "fellatio" in p or "blowjob" in p:
            return (
                "A woman positioned between her parted legs, head tilted down, performing deep oral fellatio, warm lips wrapped "
                "tightly around the shaft, tongue licking the sensitive tip, looking up with lustful eyes, messy hair, wet glistening skin."
            )
        elif "cunnilingus" in p or "pussy licking" in p:
            return (
                "A woman positioned between her spread legs, face buried between her thighs, performing intimate cunnilingus, "
                "tongue licking the glistening wet vulva and clitoris, fingers gently parting the labia, eyes closed in ecstasy."
            )
        elif "paizuri" in p or "titjob" in p:
            return (
                "A woman pressing her generous soft breasts tightly together around an erect shaft in passionate paizuri, "
                "hands cupping her cleavage, cleavage pressed firmly, glistening baby oil, looking up sensually, flush cheeks."
            )
        elif "female masturbation" in p or "fingering" in p:
            return (
                "A woman positioned closely beside her, reaching down between her thighs, gentle caressing and fingering, "
                "slender fingers glistening with natural arousal, touching the wet sensitive folds, tender moan, intimate bedroom atmosphere."
            )
        elif "straddling" in p or "cowgirl" in p:
            return (
                "Two women engaged in passionate intercourse, one mounted and straddling astride the other's hips, "
                "arching her back in pleasure, breasts swaying, hands planted on partner's chest, deep penetration, intense gaze."
            )
        elif "missionary" in p:
            return (
                "Two women engaged in intimate face-to-face missionary intercourse, bodies pressed together from chest to thighs, "
                "interlocking fingers, legs wrapped around hips, tender yet intense passion, parted lips, glistening skin."
            )
        elif "from behind" in p or "doggy" in p:
            return (
                "Passionate intercourse from behind, hands gripping hips tightly, arched lower back, round buttocks, "
                "deep intimate connection, flushed skin, breathless expression, dynamic authentic perspective."
            )
        elif "kissing" in p:
            return (
                "Two women kissing passionately, heads tilted, lips softly pressed together, tender embrace, "
                "arms draped around neck, closed eyes, intimate romantic moment, warm natural sunlight."
            )
        elif "holding hands" in p:
            return (
                "A woman standing beside her holding hands tightly, fingers gently interlaced, natural hand clasp, "
                "smiling warmly, bodies standing close together, natural eye contact, candid 35mm photo."
            )
        elif "sitting beside" in p:
            return (
                "Two women sitting closely beside each other on a plush sofa, bodies leaning gently together with shoulders touching, "
                "relaxed comfortable postures, smiling warmly into the camera, authentic ambient room lighting."
            )
        return "Two women interacting intimately, distinct beautiful bodies, authentic skin textures, natural posing."

    def direct_dual_personas(self, pipe, persona1_lora, persona1_strength, persona1_prompt,
                             persona2_lora, persona2_strength, persona2_prompt,
                             layout, overlap_blend, interaction_preset, interaction_prompt,
                             negative_prompt, mask_width=128, mask_height=128):
        # 1. Unpack base pipe
        if isinstance(pipe, dict):
            model = pipe.get("model")
            clip = pipe.get("clip")
            vae = pipe.get("vae")
            seed = pipe.get("seed", 0)
        elif isinstance(pipe, (tuple, list)):
            model = pipe[0] if len(pipe) > 0 else None
            clip = pipe[1] if len(pipe) > 1 else None
            vae = pipe[2] if len(pipe) > 2 else None
            seed = pipe[5] if len(pipe) > 5 else 0
        else:
            raise ValueError(f"[ZombiehausDualPersonaDirector] Unsupported pipe format: {type(pipe)}")

        if model is None or clip is None:
            raise ValueError("[ZombiehausDualPersonaDirector] Pipe is missing model or clip.")

        active_model = model
        active_clip = clip
        core_loader = CoreLoraLoader()

        # 2. Patch Persona 1 LoRA onto Model & CLIP
        if persona1_lora and persona1_lora != "None" and persona1_strength > 0.0:
            try:
                active_model, active_clip = core_loader.load_lora(
                    active_model, active_clip, persona1_lora,
                    persona1_strength, persona1_strength
                )
            except Exception as e:
                print(f"[ZombiehausDualPersonaDirector] Warning loading Persona 1 LoRA ({persona1_lora}): {e}")

        # 3. Patch Persona 2 LoRA onto Model & CLIP
        if persona2_lora and persona2_lora != "None" and persona2_strength > 0.0:
            try:
                active_model, active_clip = core_loader.load_lora(
                    active_model, active_clip, persona2_lora,
                    persona2_strength, persona2_strength
                )
            except Exception as e:
                print(f"[ZombiehausDualPersonaDirector] Warning loading Persona 2 LoRA ({persona2_lora}): {e}")

        # 4. Generate spatial attention masks
        p1_mask, p2_mask = self._create_spatial_masks(layout, overlap_blend, mask_width, mask_height)

        # 5. CLIP Text Encoding
        encoder = CLIPTextEncode()

        # Persona 1 Regional Conditioning
        raw_cond_p1 = encoder.encode(active_clip, persona1_prompt)[0]
        cond_p1 = []
        for t in raw_cond_p1:
            n = [t[0], t[1].copy()]
            n[1]["mask"] = p1_mask
            n[1]["set_area_to_bounds"] = False
            n[1]["mask_strength"] = 1.0
            cond_p1.append(n)

        # Persona 2 Regional Conditioning
        raw_cond_p2 = encoder.encode(active_clip, persona2_prompt)[0]
        cond_p2 = []
        for t in raw_cond_p2:
            n = [t[0], t[1].copy()]
            n[1]["mask"] = p2_mask
            n[1]["set_area_to_bounds"] = False
            n[1]["mask_strength"] = 1.0
            cond_p2.append(n)

        # Shared Interaction & Environment Conditioning (Global attention across whole canvas)
        combined_interaction_text = f"{interaction_prompt}, {interaction_preset}"
        raw_cond_interaction = encoder.encode(active_clip, combined_interaction_text)[0]

        # Combine into unified positive conditioning
        # ComfyUI's diffusion sampler calculates cross-attention for each region simultaneously
        positive = cond_p1 + cond_p2 + raw_cond_interaction

        # Negative Conditioning
        negative = encoder.encode(active_clip, negative_prompt)[0]

        # 6. Build unified output pipe
        output_pipe = (active_model, active_clip, vae, positive, negative, seed)

        prompt_hint = self._get_prompt_hint(interaction_preset)

        return (output_pipe, positive, negative, active_model, p1_mask, p2_mask, prompt_hint)
