"""
Zombiehaus Scene Script Director Node

Allows directing multi-character scenes for 2 to N personas using a screenplay-style
script format with section headers [SCENE], [PERSONA 1], [PERSONA 2] ... [INTERACTION].

Features:
- N-Persona Scalability: Supports 2, 3, 4, 5, or more personas in a single scene.
- Independent LoRA Loading: Each persona can specify their own LoRA and strength.
- Spatial Cross-Attention Masking:
  - Supports automatic column staging (left, center, right, or auto-divided N columns).
  - Supports freeform 2D bounding boxes (box: x1, y1, x2, y2) with cosine feathering.
- Shared Global Interaction & Environment:
  - [SCENE] and [INTERACTION] sections apply global context across all bodies,
    guaranteeing unified lighting, mutual shadows, and natural physical touch.
- Outputs a standard Zombiehaus PIPE ready for any KSampler or Img2Img workflow.
"""

import os
import re
import torch
import numpy as np
from PIL import Image
import folder_paths
from nodes import LoraLoader as CoreLoraLoader, CLIPTextEncode
from .lora_loader_node import ZombiehausLoraLoader


DEFAULT_SCRIPT_TEMPLATE = """[SCENE]
location: a sunlit luxury bedroom, white linen sheets, warm morning sunlight, authentic 35mm film photography, 8k
negative: deformed, distorted, extra limbs, bad anatomy, bad hands, plastic skin, blur, watermark, lowres

[PERSONA 1]
lora: None
position: left
appearance: 1woman, athletic toned body, natural skin texture, blonde wavy hair, blue eyes
clothing: lace bralette
pose: sitting on the bed, leaning forward with an open sensual smile

[PERSONA 2]
lora: None
position: right
appearance: 1woman, curvy feminine physique, soft waist, pale skin, brunette hair, brown eyes
clothing: silk robe slipping off shoulder
pose: lying comfortably on her side beside her, looking up into her eyes

[INTERACTION]
action: two women interacting intimately, one leaning in with hand resting on the other's hip, bodies close, natural skin contact, warm ambient lighting
contact_blend: 0.25
"""


class ZombiehausSceneScriptDirector:
    """
    Screenplay-Style Multi-Persona Scene Director.
    Parses [SCENE], [PERSONA N], and [INTERACTION] sections into a unified regional diffusion pipe.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "pipe": ("PIPE",),
                "script": ("STRING", {
                    "default": DEFAULT_SCRIPT_TEMPLATE,
                    "multiline": True
                }),
                "default_lora_strength": ("FLOAT", {"default": 0.85, "min": 0.0, "max": 2.0, "step": 0.05}),
                "default_overlap_blend": ("FLOAT", {"default": 0.25, "min": 0.05, "max": 0.60, "step": 0.05}),
            },
            "optional": {
                "mask_width": ("INT", {"default": 128, "min": 64, "max": 256, "step": 8}),
                "mask_height": ("INT", {"default": 128, "min": 64, "max": 256, "step": 8}),
            }
        }

    RETURN_TYPES = ("PIPE", "CONDITIONING", "CONDITIONING", "MODEL", "MASK", "STRING")
    RETURN_NAMES = ("pipe", "positive", "negative", "model", "persona_masks", "script_summary")
    FUNCTION = "direct_scene_script"
    CATEGORY = "Zombiehaus/Conditioning"

    @staticmethod
    def _parse_script(text: str) -> dict:
        """Parse structured INI/markdown section script into python dictionaries."""
        sections = {}
        current_section = "SCENE"
        sections[current_section] = []

        lines = text.strip().splitlines()
        for line in lines:
            line_str = line.strip()
            if not line_str or line_str.startswith("#") or line_str.startswith(";"):
                continue

            sec_match = re.match(r"^\[(.*?)\]$", line_str)
            if sec_match:
                current_section = sec_match.group(1).strip().upper()
                if current_section not in sections:
                    sections[current_section] = []
            else:
                sections[current_section].append(line_str)

        # Parse key-values in each section
        parsed = {
            "scene": {},
            "interaction": {},
            "personas": []
        }

        for sec_name, raw_lines in sections.items():
            kv = {}
            freeform = []
            for l in raw_lines:
                if ":" in l:
                    k, v = l.split(":", 1)
                    kv[k.strip().lower()] = v.strip()
                else:
                    freeform.append(l)

            if "SCENE" in sec_name or "GLOBAL" in sec_name:
                parsed["scene"].update(kv)
                if freeform:
                    parsed["scene"]["description"] = ", ".join(freeform)
            elif "INTERACTION" in sec_name:
                parsed["interaction"].update(kv)
                if freeform:
                    parsed["interaction"]["description"] = ", ".join(freeform)
            elif "PERSONA" in sec_name or "CHARACTER" in sec_name:
                p_data = {"name": sec_name}
                p_data.update(kv)
                if freeform:
                    p_data["freeform"] = ", ".join(freeform)
                parsed["personas"].append(p_data)

        return parsed

    @staticmethod
    def _create_persona_mask(idx: int, total: int, p_data: dict, overlap: float, w: int, h: int) -> torch.Tensor:
        """
        Generate smooth spatial attention mask for a persona.
        Supports explicit 'box: x1, y1, x2, y2' or automatic overlapping column staging.
        """
        mask = np.zeros((h, w), dtype=np.float32)

        # Check for explicit bounding box: "box: x1, y1, x2, y2"
        if "box" in p_data:
            try:
                coords = [float(c.strip()) for c in p_data["box"].split(",")]
                if len(coords) == 4:
                    bx1 = max(0, min(w, int(coords[0] * w)))
                    by1 = max(0, min(h, int(coords[1] * h)))
                    bx2 = max(0, min(w, int(coords[2] * w)))
                    by2 = max(0, min(h, int(coords[3] * h)))

                    pad_x = max(2, int((bx2 - bx1) * overlap))
                    pad_y = max(2, int((by2 - by1) * overlap))

                    img = Image.new("L", (w, h), 0)
                    draw = Image.new("L", (bx2 - bx1, by2 - by1), 255)
                    img.paste(draw, (bx1, by1))
                    from PIL import ImageFilter
                    img = img.filter(ImageFilter.GaussianBlur(radius=max(pad_x, pad_y)))
                    arr = np.array(img).astype(np.float32) / 255.0
                    return torch.from_numpy(arr).unsqueeze(0)
            except Exception as e:
                print(f"[ZombiehausSceneScriptDirector] Box parse fallback: {e}")

        # Automatic Column Staging based on position or index
        pos_str = p_data.get("position", "").lower()
        if "left" in pos_str:
            c_idx = 0
            n_cols = max(2, total)
        elif "right" in pos_str:
            c_idx = max(1, total - 1)
            n_cols = max(2, total)
        elif "center" in pos_str or "middle" in pos_str:
            c_idx = total // 2
            n_cols = max(3, total)
        else:
            c_idx = idx
            n_cols = total

        col_w = w / float(n_cols)
        cx = (c_idx + 0.5) * col_w
        reach = (col_w * (1.0 + overlap)) / 2.0

        x_indices = np.arange(w, dtype=np.float32)
        dist = np.abs(x_indices - cx)

        # Smooth cosine bell curve
        inside = dist <= reach
        val = np.zeros(w, dtype=np.float32)
        val[inside] = 0.5 * (1.0 + np.cos((dist[inside] / reach) * np.pi))

        mask[:, :] = val[np.newaxis, :]
        return torch.from_numpy(mask).unsqueeze(0)

    def direct_scene_script(self, pipe, script, default_lora_strength=0.85,
                            default_overlap_blend=0.25, mask_width=128, mask_height=128):
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
            raise ValueError(f"[ZombiehausSceneScriptDirector] Unsupported pipe format: {type(pipe)}")

        if model is None or clip is None:
            raise ValueError("[ZombiehausSceneScriptDirector] Pipe is missing model or clip.")

        # 2. Parse script
        parsed = self._parse_script(script)
        personas = parsed.get("personas", [])
        scene = parsed.get("scene", {})
        interaction = parsed.get("interaction", {})

        if not personas:
            raise ValueError("[ZombiehausSceneScriptDirector] No [PERSONA] sections found in script.")

        # Resolve overlap blend
        overlap = default_overlap_blend
        if "contact_blend" in interaction:
            try:
                overlap = float(interaction["contact_blend"])
            except ValueError:
                pass

        active_model = model
        active_clip = clip
        core_loader = CoreLoraLoader()
        loras_in_models = folder_paths.get_filename_list("loras")
        loaded_lora_logs = []

        # 3. Dynamic LoRA Stacking for N Personas
        for i, p_data in enumerate(personas):
            lora_spec = p_data.get("lora", "")
            if lora_spec and lora_spec.lower() not in ("none", "null", ""):
                lora_name = lora_spec
                lora_str = default_lora_strength
                if ":" in lora_spec:
                    parts = lora_spec.split(":")
                    lora_name = parts[0].strip()
                    try:
                        lora_str = float(parts[1].strip())
                    except ValueError:
                        pass

                found_path = ZombiehausLoraLoader.find_lora_path(lora_name, loras_in_models)
                if found_path:
                    try:
                        active_model, active_clip = core_loader.load_lora(
                            active_model, active_clip, found_path, lora_str, lora_str
                        )
                        loaded_lora_logs.append(f"{p_data['name']}: {found_path} ({lora_str})")
                    except Exception as e:
                        print(f"[ZombiehausSceneScriptDirector] Error loading LoRA ({found_path}): {e}")
                else:
                    print(f"[ZombiehausSceneScriptDirector] LoRA not found: {lora_name}")

        # 4. Compile Spatial Conditioning for N Personas
        encoder = CLIPTextEncode()
        regional_conditionings = []
        mask_tensors = []

        total_personas = len(personas)
        for idx, p_data in enumerate(personas):
            # Assemble Persona Text
            parts = []
            for k in ("appearance", "clothing", "pose", "action", "freeform"):
                if k in p_data and p_data[k]:
                    parts.append(p_data[k])
            p_text = ", ".join(parts) if parts else "1person, authentic photo, high quality"

            # Create Spatial Mask
            p_mask = self._create_persona_mask(idx, total_personas, p_data, overlap, mask_width, mask_height)
            mask_tensors.append(p_mask)

            # Encode and attach mask
            raw_cond = encoder.encode(active_clip, p_text)[0]
            for t in raw_cond:
                n = [t[0], t[1].copy()]
                n[1]["mask"] = p_mask
                n[1]["set_area_to_bounds"] = False
                n[1]["mask_strength"] = 1.0
                regional_conditionings.append(n)

        # 5. Global Scene & Interaction Conditioning (Applies across all characters)
        scene_parts = []
        for k in ("location", "camera", "style", "description"):
            if k in scene and scene[k]:
                scene_parts.append(scene[k])

        inter_parts = []
        for k in ("action", "description"):
            if k in interaction and interaction[k]:
                inter_parts.append(interaction[k])

        global_prompt_elements = []
        if scene_parts:
            global_prompt_elements.append(", ".join(scene_parts))
        if inter_parts:
            global_prompt_elements.append(", ".join(inter_parts))

        global_prompt = " | ".join(global_prompt_elements) if global_prompt_elements else "natural cinematic lighting, 8k photography"
        raw_global_cond = encoder.encode(active_clip, global_prompt)[0]

        # Combine Regional Personas + Global Scene Context
        positive = regional_conditionings + raw_global_cond

        # Negative Conditioning
        neg_text = scene.get("negative", "deformed, distorted, extra limbs, bad anatomy, bad hands, plastic skin, blur, watermark")
        negative = encoder.encode(active_clip, neg_text)[0]

        # 6. Build Output Pipe
        output_pipe = (active_model, active_clip, vae, positive, negative, seed)

        # Combined batch mask [N, H, W]
        combined_masks = torch.cat(mask_tensors, dim=0)

        # Build readable summary for ShowText
        summary_lines = [
            f"🎬 Scene Script Compiled: {total_personas} Personas",
            f"Overarching Scene: {global_prompt[:90]}...",
            "Personas Loaded:"
        ]
        for idx, p in enumerate(personas):
            summary_lines.append(f"  • {p['name']} ({p.get('position', f'col {idx}')}): {p.get('appearance', 'standard')[:50]}")
        if loaded_lora_logs:
            summary_lines.append("LoRAs Injected: " + "; ".join(loaded_lora_logs))

        summary_text = "\n".join(summary_lines)

        return (output_pipe, positive, negative, active_model, combined_masks, summary_text)
