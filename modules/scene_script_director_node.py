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
mode: Expressions
A sunlit luxury master bedroom with soft white linen sheets, warm morning sunlight streaming in through floor-to-ceiling windows, authentic 35mm film photography, 8k, intimate cinematic lighting.
all(__chromafidelity__)

[PERSONA 1]
lora: <lora:Jane_v1:1.0>
position: left
Jane is an athletic toned woman with glowing natural skin texture, blue eyes, and loose wavy blonde hair. She is wearing a delicate lace bralette, sitting comfortably on the bed and leaning forward with an open sensual smile and warm relaxed expression.

[PERSONA 2]
lora: <lora:Jill_v1:1.0>
position: right
Jill is resting comfortably on her side beside Jane with a curvy feminine physique, soft waist, brunette hair, and smiling eyes. Her silk robe is slipping off her shoulder as she gazes up affectionately into Jane's eyes.

[INTERACTION]
Two women sharing an intimate, tender moment on the bed. Jane is leaning in with one hand resting softly on Jill's hip, close skin-to-skin contact, bodies touching under the warm ambient morning light.
contact_blend: 0.25
"""


class ZombiehausSceneScriptDirector:
    """
    Screenplay-Style Multi-Persona Scene Director.
    Parses [SCENE], [PERSONA N], and [INTERACTION] sections into a unified regional diffusion pipe.
    Fully integrated with ZombiehausTextEditor for syntax-highlighted screenplay editing,
    preset saving/loading, natural language expressions (ChromaHD-1), tags mode (Pony/SDXL),
    and automatic LoRA parsing.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "pipe": ("PIPE",),
                "default_lora_strength": ("FLOAT", {"default": 0.85, "min": 0.0, "max": 2.0, "step": 0.05}),
                "default_overlap_blend": ("FLOAT", {"default": 0.25, "min": 0.0, "max": 2.0, "step": 0.05}),
            },
            "optional": {
                "script": ("STRING", {"forceInput": True}),
                "script_input": ("STRING", {"forceInput": True}),
                "mask_width": ("INT", {"default": 128, "min": 0, "max": 4096, "step": 8}),
                "mask_height": ("INT", {"default": 128, "min": 0, "max": 4096, "step": 8}),
            }
        }

    RETURN_TYPES = ("PIPE", "CONDITIONING", "CONDITIONING", "MODEL", "MASK", "STRING")
    RETURN_NAMES = ("pipe", "positive", "negative", "model", "persona_masks", "script_summary")
    FUNCTION = "direct_scene_script"
    CATEGORY = "Zombiehaus/Conditioning"

    @staticmethod
    def _parse_script(text: str) -> dict:
        """
        Parse structured screenplay script into python dictionaries.
        Supports both:
          - mode: Expressions (natural language descriptive prose & emotions for ChromaHD-1 / Flux)
          - mode: Tags (comma-separated Danbooru tag style for Pony V6 / SDXL / SD1.5)
        and config directives (position:, box:, lora:, contact_blend:).
        """
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

        # Detect script mode (Expressions vs Tags)
        script_mode = "Expressions"
        for l_raw in lines:
            m_mode = re.match(r"^(?:mode|format|type)\s*:\s*(expressions|tags)\b", l_raw.strip(), re.IGNORECASE)
            if m_mode:
                script_mode = "Tags" if m_mode.group(1).lower() == "tags" else "Expressions"
                break

        parsed = {
            "mode": script_mode,
            "scene": {},
            "interaction": {},
            "personas": []
        }

        # Known directives that configure node settings rather than prompt descriptions
        CONFIG_DIRECTIVES = {"position", "box", "lora", "contact_blend", "name", "blend", "negative", "mode", "format", "type"}

        for sec_name, raw_lines in sections.items():
            directives = {}
            prose_parts = []

            for l in raw_lines:
                # 1. Check for embedded <lora:name:strength> tags
                lora_tag_match = re.search(r'<lora:([^>]+)>', l, flags=re.IGNORECASE)
                if lora_tag_match:
                    directives["lora"] = lora_tag_match.group(1).strip()
                    # Remove the tag from the line so it doesn't pollute prompts
                    l = re.sub(r'<lora:[^>]+>', '', l).strip()

                if not l:
                    continue

                # 2. Check for key: value syntax vs natural language prose
                if ":" in l:
                    k, v = l.split(":", 1)
                    k_clean = k.strip().lower()
                    v_clean = v.strip()

                    if k_clean in CONFIG_DIRECTIVES:
                        if k_clean == "lora":
                            v_clean = re.sub(r'^<lora:|>|\'$|"$|^[\'"]', '', v_clean).strip()
                            if v_clean:
                                directives["lora"] = v_clean
                        else:
                            directives[k_clean] = v_clean
                    else:
                        # Descriptive line (e.g. appearance:, clothing:, or prose with colons)
                        if v_clean:
                            prose_parts.append(v_clean)
                else:
                    # Natural language expression or tag line
                    prose_parts.append(l)

            if script_mode == "Tags":
                # For Pony / SDXL / Danbooru: comma-separated tag deduplication and formatting
                raw_tags = []
                for part in prose_parts:
                    for t in part.split(","):
                        t_str = t.strip()
                        if t_str and t_str not in raw_tags:
                            raw_tags.append(t_str)
                prompt_text = ", ".join(raw_tags)
            else:
                # For ChromaHD-1 / Flux: continuous natural language prose & expressions
                prompt_text = " ".join(prose_parts).strip()

            if "SCENE" in sec_name or "GLOBAL" in sec_name:
                parsed["scene"].update(directives)
                parsed["scene"]["prompt"] = prompt_text
            elif "INTERACTION" in sec_name:
                parsed["interaction"].update(directives)
                parsed["interaction"]["prompt"] = prompt_text
            elif "PERSONA" in sec_name or "CHARACTER" in sec_name:
                p_data = {"name": sec_name}
                p_data.update(directives)
                p_data["prompt"] = prompt_text
                parsed["personas"].append(p_data)

        return parsed

    @staticmethod
    def _create_persona_mask(idx: int, total: int, p_data: dict, overlap: float, w: int, h: int) -> torch.Tensor:
        """
        Generate smooth spatial attention mask for a persona.
        Supports explicit 'box: x1, y1, x2, y2' or automatic overlapping column staging.
        """
        w = 128 if not w or w <= 0 else int(w)
        h = 128 if not h or h <= 0 else int(h)
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

    def direct_scene_script(self, pipe, script=None, default_lora_strength=0.85,
                            default_overlap_blend=0.25, mask_width=128, mask_height=128,
                            script_input=None, **kwargs):
        # 1. Unpack base pipe
        base_negative = None
        if isinstance(pipe, dict):
            model = pipe.get("model")
            clip = pipe.get("clip")
            vae = pipe.get("vae")
            seed = pipe.get("seed", 0)
            base_negative = pipe.get("negative")
        elif isinstance(pipe, (tuple, list)):
            model = pipe[0] if len(pipe) > 0 else None
            clip = pipe[1] if len(pipe) > 1 else None
            vae = pipe[2] if len(pipe) > 2 else None
            base_negative = pipe[4] if len(pipe) > 4 else None
            seed = pipe[5] if len(pipe) > 5 else 0
        else:
            raise ValueError(f"[ZombiehausSceneScriptDirector] Unsupported pipe format: {type(pipe)}")

        if model is None or clip is None:
            raise ValueError("[ZombiehausSceneScriptDirector] Pipe is missing model or clip.")

        # 2. Extract upstream LoRA metadata and clean prompt from pipe conditioning if available
        upstream_prompt_loras = []
        upstream_clean_prompt = ""
        cond_source = []
        if isinstance(pipe, dict) and "positive" in pipe:
            cond_source = pipe["positive"]
        elif isinstance(pipe, (tuple, list)) and len(pipe) > 3 and isinstance(pipe[3], list):
            cond_source = pipe[3]

        if cond_source and isinstance(cond_source, list):
            for chunk in cond_source:
                if len(chunk) > 1 and isinstance(chunk[1], dict):
                    if not upstream_prompt_loras:
                        pl = chunk[1].get("zombiehaus_prompt_loras")
                        if pl and isinstance(pl, list):
                            upstream_prompt_loras = list(pl)
                    if not upstream_clean_prompt:
                        cp = chunk[1].get("clean_prompt")
                        if cp and isinstance(cp, str):
                            upstream_clean_prompt = cp

        # Determine effective screenplay script (priority: script input > script_input > clean_prompt from pipe)
        effective_script = ""
        if script and isinstance(script, str) and script.strip():
            effective_script = script.strip()
        elif script_input and isinstance(script_input, str) and script_input.strip():
            effective_script = script_input.strip()
        elif upstream_clean_prompt and ("[" in upstream_clean_prompt and "]" in upstream_clean_prompt):
            effective_script = upstream_clean_prompt.strip()
        else:
            effective_script = DEFAULT_SCRIPT_TEMPLATE.strip()

        # 3. Parse script
        parsed = self._parse_script(effective_script)
        personas = parsed.get("personas", [])
        scene = parsed.get("scene", {})
        interaction = parsed.get("interaction", {})

        if not personas:
            raise ValueError("[ZombiehausSceneScriptDirector] No [PERSONA] sections found in screenplay script.")

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

        # 4. Dynamic LoRA Stacking for N Personas & Global Scene
        # Check scene-wide LoRA first if specified
        scene_lora_spec = scene.get("lora", "")
        if scene_lora_spec and scene_lora_spec.lower() not in ("none", "null", ""):
            s_name = scene_lora_spec
            s_str = default_lora_strength
            if ":" in scene_lora_spec:
                sparts = scene_lora_spec.split(":")
                s_name = sparts[0].strip()
                try:
                    s_str = float(sparts[1].strip())
                except ValueError:
                    pass
            s_path = ZombiehausLoraLoader.find_lora_path(s_name, loras_in_models)
            if s_path:
                try:
                    active_model, active_clip = core_loader.load_lora(
                        active_model, active_clip, s_path, s_str, s_str
                    )
                    loaded_lora_logs.append(f"Scene (Global): {os.path.basename(s_path)} ({s_str})")
                except Exception as e:
                    print(f"[ZombiehausSceneScriptDirector] Error loading Scene LoRA ({s_path}): {e}")

        # Resolve LoRAs for each persona (explicit tag > upstream_prompt_loras by index)
        for i, p_data in enumerate(personas):
            lora_name = ""
            lora_str = default_lora_strength

            lora_spec = p_data.get("lora", "")
            if lora_spec and lora_spec.lower() not in ("none", "null", ""):
                lora_name = lora_spec
                if ":" in lora_spec:
                    parts = lora_spec.split(":")
                    lora_name = parts[0].strip()
                    try:
                        lora_str = float(parts[1].strip())
                    except ValueError:
                        pass
            elif i < len(upstream_prompt_loras):
                # Auto-matched from ZombiehausTextEditor prompt LoRAs
                u_item = upstream_prompt_loras[i]
                lora_name = u_item.get("name", "")
                lora_str = float(u_item.get("model_strength", default_lora_strength))
                p_data["lora"] = f"{lora_name}:{lora_str}"

            if lora_name and lora_name.lower() not in ("none", "null", ""):
                found_path = ZombiehausLoraLoader.find_lora_path(lora_name, loras_in_models)
                if found_path:
                    try:
                        active_model, active_clip = core_loader.load_lora(
                            active_model, active_clip, found_path, lora_str, lora_str
                        )
                        loaded_lora_logs.append(f"{p_data['name']}: {os.path.basename(found_path)} ({lora_str})")
                        # Auto-discover trigger words and inject into persona description if missing
                        try:
                            tw_list = ZombiehausLoraLoader.extract_lora_trigger_words(found_path)
                            if tw_list:
                                p_data["trigger_words"] = ", ".join(tw_list[:3])
                        except Exception:
                            pass
                    except Exception as e:
                        print(f"[ZombiehausSceneScriptDirector] Error loading LoRA ({found_path}): {e}")
                else:
                    print(f"[ZombiehausSceneScriptDirector] LoRA not found: {lora_name}")

        # 5. Compile Spatial Conditioning for N Personas using Natural Language Prose
        encoder = CLIPTextEncode()
        regional_conditionings = []
        mask_tensors = []

        total_personas = len(personas)
        for idx, p_data in enumerate(personas):
            # Assemble Persona Text (Chroma natural prose + expressions)
            p_prompt = p_data.get("prompt", "")
            parts = []
            if "trigger_words" in p_data and p_data["trigger_words"]:
                if p_data["trigger_words"].lower() not in p_prompt.lower():
                    parts.append(p_data["trigger_words"])
            if p_prompt:
                clean_p = re.sub(r'<lora:[^>]+>', '', p_prompt).strip()
                if clean_p:
                    parts.append(clean_p)

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

        # 6. Global Scene & Interaction Conditioning (Natural Language Ambient Context)
        global_parts = []
        scene_prompt = scene.get("prompt", "")
        if scene_prompt:
            clean_s = re.sub(r'<lora:[^>]+>', '', scene_prompt).strip()
            if clean_s:
                global_parts.append(clean_s)

        inter_prompt = interaction.get("prompt", "")
        if inter_prompt:
            clean_i = re.sub(r'<lora:[^>]+>', '', inter_prompt).strip()
            if clean_i:
                global_parts.append(clean_i)

        global_prompt = " | ".join(global_parts) if global_parts else "natural cinematic lighting, 8k photography"
        raw_global_cond = encoder.encode(active_clip, global_prompt)[0]

        # Combine Regional Personas + Global Scene Context
        positive = regional_conditionings + raw_global_cond

        # 7. Resolve Negative Conditioning
        # Prioritize the global negative menu / conditioning passed from ZombiehausTextEditor via pipe
        if base_negative is not None and isinstance(base_negative, list) and len(base_negative) > 0:
            negative = base_negative
        elif "negative" in scene and scene["negative"]:
            clean_neg = re.sub(r'<lora:[^>]+>', '', scene["negative"]).strip()
            negative = encoder.encode(active_clip, clean_neg)[0]
        else:
            default_neg = "deformed, distorted, extra limbs, bad anatomy, bad hands, plastic skin, blur, watermark"
            negative = encoder.encode(active_clip, default_neg)[0]

        # 8. Build Output Pipe
        output_pipe = (active_model, active_clip, vae, positive, negative, seed)

        # Combined batch mask [N, H, W]
        combined_masks = torch.cat(mask_tensors, dim=0)

        # Build readable summary for ShowText
        summary_lines = [
            f"🎬 Scene Script Compiled: {total_personas} Personas [Mode: {parsed.get('mode', 'Expressions')}]",
            f"Overarching Scene: {global_prompt[:90]}...",
            "Personas Loaded:"
        ]
        for idx, p in enumerate(personas):
            summary_lines.append(f"  • {p['name']} ({p.get('position', f'col {idx}')}): {p.get('prompt', 'standard')[:60]}")
        if loaded_lora_logs:
            summary_lines.append("LoRAs Injected: " + "; ".join(loaded_lora_logs))

        summary_text = "\n".join(summary_lines)

        return (output_pipe, positive, negative, active_model, combined_masks, summary_text)
