import torch
import folder_paths
import os
import json
import random
import re
import math
from nodes import LoraLoader as CoreLoraLoader
from ..config import settings

class ZombiehausLoraLoader:
    @staticmethod
    def find_lora_path(lora_name: str, lora_paths: list[str]) -> str | None:
        """Finds a LoRA path from a given name, trying multiple case-insensitive strategies for robustness."""
        lora_name_norm = lora_name.strip().replace('\\', '/')
        lora_name_lower = lora_name_norm.lower()

        # Strategy 1: Case-insensitive exact match
        for p in lora_paths:
            if p.lower().replace('\\', '/') == lora_name_lower:
                return p

        # Strategy 2: Case-insensitive basename match
        lora_basename_lower = os.path.basename(lora_name_lower)
        for p in lora_paths:
            if os.path.basename(p.lower().replace('\\', '/')) == lora_basename_lower:
                return p

        # Strategy 3: Case-insensitive basename match without extension
        lora_basename_no_ext_lower = os.path.splitext(lora_basename_lower)[0]
        for p in lora_paths:
            p_basename_no_ext_lower = os.path.splitext(os.path.basename(p.lower().replace('\\', '/')))[0]
            if p_basename_no_ext_lower == lora_basename_no_ext_lower:
                return p

        return None

    @classmethod
    def INPUT_TYPES(cls):
        # Get base model types from config for the validation dropdown.
        try:
            # Add a "None" option for no validation
            base_model_types = ["None"] 
            definitions = settings.get("base_model_definitions", [])
            # Extract the 'type' from each definition dictionary
            base_model_types.extend([d.get("type") for d in definitions if d.get("type")])
            if len(base_model_types) == 1: # Only "None" is present
                 base_model_types.append("<no definitions in config>")
        except Exception as e:
            base_model_types = ["None", "<error loading definitions>"]

        return {
            "required": {
                # This hidden widget stores the state of the advanced list, managed by JS
                "lora_stack": ("STRING", {"default": "[]", "multiline": True, "hidden": True}),
                # This widget is for the UI to help validate LoRAs against a base model.
                "base_model_name": (base_model_types,),
            },
            "optional": {
                "pipe": ("PIPE",),
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                # Seed is a passthrough and provides deterministic random selection.
                "seed": ("INT", {"forceInput": True}),
                # Master toggle for dynamic scheduling / dropoffs
                "enable_dynamic_lora": ("BOOLEAN", {"default": True}),
                # Optional prompt text to dynamically detect and load <lora:name:strength> tags
                "prompt": ("STRING", {"forceInput": True, "multiline": True}),
                # This widget is for the UI only, to filter the LoRA list.
                "lora_filter": ("STRING", {"default": "", "multiline": False}),
                # This widget holds the API key, making it part of the workflow.
                "civitai_api_key": ("STRING", {"default": "", "multiline": False, "hidden": True}),
                "random_pick_count": ("INT", {"default": 1, "min": 1, "max": 10, "step": 1}),
                "auto_keyword_discovery": ("BOOLEAN", {"default": True}),
                "keyword_blacklist": ("STRING", {"default": "", "multiline": False}),
            }
        }

    @staticmethod
    def extract_lora_trigger_words(lora_file_path: str, blacklist: set[str] | None = None) -> list[str]:
        """Extracts trained trigger words from sidecar json/civitai.info or safetensors header."""
        if not lora_file_path or not os.path.isfile(lora_file_path):
            return []

        base_no_ext, _ = os.path.splitext(lora_file_path)
        blacklist_set = {b.lower().strip() for b in blacklist if b and b.strip()} if blacklist else set()

        # 1. Check sidecar files: .civitai.info or .json
        for ext in ('.civitai.info', '.json', '.info'):
            sidecar = base_no_ext + ext
            if os.path.isfile(sidecar):
                try:
                    with open(sidecar, 'r', encoding='utf-8') as f:
                        meta = json.load(f)
                        tw = meta.get("trainedWords")
                        if isinstance(tw, list) and tw:
                            words = [str(w).strip() for w in tw if str(w).strip()]
                            if blacklist_set:
                                words = [w for w in words if w.lower() not in blacklist_set]
                            return words
                except Exception:
                    pass

        # 2. Check safetensors header metadata directly (fast, zero torch overhead)
        if lora_file_path.lower().endswith(".safetensors"):
            try:
                with open(lora_file_path, 'rb') as f:
                    header_size_bytes = f.read(8)
                    if len(header_size_bytes) == 8:
                        import struct
                        header_len = struct.unpack('<Q', header_size_bytes)[0]
                        if 0 < header_len < 50 * 1024 * 1024:
                            header_json = f.read(header_len).decode('utf-8', errors='ignore')
                            meta = json.loads(header_json).get("__metadata__", {})

                            # Direct trained words or modelspec tags
                            tw = meta.get("trained_words") or meta.get("modelspec.tags")
                            if isinstance(tw, str) and tw:
                                words = [t.strip() for t in tw.split(",") if t.strip()]
                                if blacklist_set:
                                    words = [w for w in words if w.lower() not in blacklist_set]
                                return words

                            # Dataset tag frequency: extract top tags
                            tag_freq = meta.get("ss_tag_frequency")
                            if tag_freq:
                                if isinstance(tag_freq, str):
                                    try:
                                        tag_freq = json.loads(tag_freq)
                                    except Exception:
                                        pass
                                if isinstance(tag_freq, dict):
                                    all_tags = {}
                                    for ds, tags in tag_freq.items():
                                        if isinstance(tags, dict):
                                            for t, cnt in tags.items():
                                                all_tags[t] = all_tags.get(t, 0) + (cnt if isinstance(cnt, (int, float)) else 1)
                                    if all_tags:
                                        sorted_tags = sorted(all_tags.keys(), key=lambda x: all_tags[x], reverse=True)
                                        if blacklist_set:
                                            sorted_tags = [t for t in sorted_tags if t.strip().lower() not in blacklist_set]
                                        return sorted_tags[:8]
            except Exception:
                pass

        return []

    @staticmethod
    def _create_hook_keyframes(start_percent=0.0, end_percent=1.0, start_strength=1.0, end_strength=0.0, decay_profile="cosine", steps=4):
        """Builds a HookKeyframeGroup for time-scheduled LoRA dropoff."""
        try:
            import comfy.hooks
        except ImportError:
            return None

        kfg = comfy.hooks.HookKeyframeGroup()
        start_percent = max(0.0, min(1.0, float(start_percent)))
        end_percent = max(0.0, min(1.0, float(end_percent)))
        if end_percent < start_percent:
            end_percent = start_percent

        end_ratio = (end_strength / start_strength) if start_strength != 0 else 0.0

        if start_percent > 0.0:
            kfg.add(comfy.hooks.HookKeyframe(strength=0.0, start_percent=0.0))
            kfg.add(comfy.hooks.HookKeyframe(strength=1.0, start_percent=start_percent))
        else:
            kfg.add(comfy.hooks.HookKeyframe(strength=1.0, start_percent=0.0))

        if decay_profile == "step":
            if end_percent < 1.0:
                kfg.add(comfy.hooks.HookKeyframe(strength=end_ratio, start_percent=end_percent))
        else:
            num_pts = max(2, min(steps, 4))
            for i in range(1, num_pts):
                fraction = i / (num_pts - 1)
                pct = start_percent + (end_percent - start_percent) * fraction
                if decay_profile == "cosine":
                    factor = 0.5 * (1.0 + math.cos(math.pi * fraction))
                elif decay_profile == "exponential":
                    factor = math.exp(-3.0 * fraction)
                else:  # linear
                    factor = 1.0 - fraction
                curr_ratio = end_ratio + (1.0 - end_ratio) * factor
                kfg.add(comfy.hooks.HookKeyframe(strength=round(curr_ratio, 4), start_percent=round(pct, 4)))

        if end_percent < 1.0 and decay_profile != "step":
            kfg.add(comfy.hooks.HookKeyframe(strength=end_ratio, start_percent=end_percent))

        return kfg

    @staticmethod
    def parse_lora_tag_content(content: str) -> dict | None:
        """
        Parses extended prompt LoRA syntax:
          - <lora:name>
          - <lora:name:strength>
          - <lora:name:model:clip>
          - <lora:name:min~max> (random range)
          - <lora:name:1.0>0.2> (dropoff)
          - <lora:name:1.0@0.0-0.5> (step window)
          - <lora:name:1.0>0.2@0.0-0.6:cosine> (scheduled curve)
        """
        parts = [p.strip() for p in content.split(':') if p.strip()]
        if not parts:
            return None

        name = parts[0].strip().replace('\\', '/')
        result = {
            "name": name,
            "model_strength": 1.0,
            "clip_strength": 1.0,
            "is_range": False,
            "min_strength": 1.0,
            "max_strength": 1.0,
            "dynamic": False,
            "start_percent": 0.0,
            "end_percent": 1.0,
            "end_strength": 0.0,
            "decay_profile": "cosine",
        }

        if len(parts) == 1:
            return result

        raw_args = parts[1:]
        known_profiles = {"linear", "cosine", "exponential", "step"}
        if raw_args and raw_args[-1].lower() in known_profiles:
            result["decay_profile"] = raw_args.pop(-1).lower()
            result["dynamic"] = True

        for idx, arg in enumerate(raw_args):
            # Check for timing window @start-end or @end
            if '@' in arg:
                weight_part, time_part = arg.split('@', 1)
                arg = weight_part.strip()
                time_part = time_part.strip()
                result["dynamic"] = True
                if '-' in time_part:
                    t1, t2 = time_part.split('-', 1)
                    try:
                        result["start_percent"] = max(0.0, min(1.0, float(t1)))
                        result["end_percent"] = max(0.0, min(1.0, float(t2)))
                    except ValueError:
                        pass
                else:
                    try:
                        result["end_percent"] = max(0.0, min(1.0, float(time_part)))
                    except ValueError:
                        pass

            # Check for dropoff > e.g. 1.0>0.2
            if '>' in arg:
                w_start, w_end = arg.split('>', 1)
                arg = w_start.strip()
                result["dynamic"] = True
                try:
                    result["end_strength"] = float(w_end.strip())
                except ValueError:
                    pass

            # Check for random range ~ e.g. 0.4~0.8
            if '~' in arg:
                min_s, max_s = arg.split('~', 1)
                try:
                    result["is_range"] = True
                    result["min_strength"] = float(min_s.strip())
                    result["max_strength"] = float(max_s.strip())
                    result["model_strength"] = result["max_strength"]
                    result["clip_strength"] = result["max_strength"]
                except ValueError:
                    pass
            elif arg:
                try:
                    val = float(arg)
                    if idx == 0:
                        result["model_strength"] = val
                        result["clip_strength"] = val
                    elif idx == 1:
                        result["clip_strength"] = val
                except ValueError:
                    pass

        return result

    @staticmethod
    def extract_prompt_loras(prompt: str) -> tuple[list[dict], str]:
        """
        Parses <lora:...> tags from prompt text, supporting standard, random range (~), and dynamic dropoff (> / @).
        Ignores tags wrapped in /* ... */ comments.
        Returns:
            (lora_entries: list of dict, clean_prompt: str)
        """
        if not prompt or not isinstance(prompt, str):
            return [], ""

        uncommented = re.sub(r'/\*.*?\*/', '', prompt, flags=re.DOTALL)
        tag_pattern = r'<lora:([^>]+)>'

        loras = []
        for m in re.finditer(tag_pattern, uncommented, flags=re.IGNORECASE):
            content = m.group(1).strip()
            parsed = ZombiehausLoraLoader.parse_lora_tag_content(content)
            if parsed:
                loras.append(parsed)

        clean = re.sub(r'/\*\s*<lora:[^>]+>\s*\*/|<lora:[^>]+>', '', prompt)
        clean = re.sub(r'[ \t]+', ' ', clean)
        clean = re.sub(r'\s*,\s*,+', ', ', clean)
        clean = re.sub(r'\s+,', ',', clean)
        clean = re.sub(r'^[,\s]+|[,\s]+$', '', clean)

        return loras, clean

    RETURN_TYPES = ("MODEL", "CLIP", "CONDITIONING", "CONDITIONING", "INT", "PIPE", "STRING", "STRING", "STRING")
    RETURN_NAMES = ("model", "clip", "positive", "negative", "seed", "pipe", "loaded_loras", "trigger_words", "prompt")
    FUNCTION = "load_loras"
    CATEGORY = "Zombiehaus/Loaders"

    @classmethod
    def IS_CHANGED(cls, lora_stack, **kwargs):
        try:
            items = json.loads(lora_stack)
            random_pool = [i for i in items if i.get("enabled", False) and (i.get("random", False) or i.get("random_strength", False))]
            seed_val = kwargs.get("seed")
            if len(random_pool) > 0 and (seed_val is None or seed_val == 0):
                import time
                return time.time()
        except Exception:
            pass
        return False

    def load_loras(self, lora_stack, base_model_name, pipe=None, model=None, clip=None, positive=None, negative=None, lora_filter="", seed=0, civitai_api_key="", random_pick_count=1, auto_keyword_discovery=True, keyword_blacklist="", prompt=None, enable_dynamic_lora=True, **kwargs):
        # Extract from pipe if provided (individual inputs override pipe)
        if pipe is not None:
            model = model if model is not None else (pipe[0] if len(pipe) > 0 else None)
            clip = clip if clip is not None else (pipe[1] if len(pipe) > 1 else None)
            vae = pipe[2] if len(pipe) > 2 else None
            positive = positive if positive is not None else (pipe[3] if len(pipe) > 3 else positive)
            negative = negative if negative is not None else (pipe[4] if len(pipe) > 4 else negative)
            if (seed is None or seed == 0) and len(pipe) > 5 and isinstance(pipe[5], int):
                seed = pipe[5]
        else:
            vae = None

        if model is None or clip is None:
            raise ValueError("MODEL and CLIP are required (provide via pipe or individual inputs)")

        lora_loader = CoreLoraLoader()
        lora_paths = folder_paths.get_filename_list("loras")

        # Parse prompt-tagged LoRAs (<lora:name:...>)
        prompt_loras, clean_prompt = self.extract_prompt_loras(prompt) if prompt else ([], prompt or "")

        if not prompt_loras:
            cond_to_check = positive if (positive and isinstance(positive, (list, tuple))) else (pipe[3] if (pipe is not None and len(pipe) > 3 and pipe[3]) else None)
            if cond_to_check and isinstance(cond_to_check, (list, tuple)):
                for chunk in cond_to_check:
                    if isinstance(chunk, (list, tuple)) and len(chunk) > 1 and isinstance(chunk[1], dict):
                        meta_loras = chunk[1].get("zombiehaus_prompt_loras")
                        if meta_loras:
                            prompt_loras = list(meta_loras)
                            if not clean_prompt:
                                clean_prompt = chunk[1].get("clean_prompt", "")
                            break

        try:
            lora_items = json.loads(lora_stack)
            if not isinstance(lora_items, list):
                lora_items = []
        except (json.JSONDecodeError, TypeError):
            lora_items = []

        try:
            random_pick_count = int(random_pick_count)
        except (ValueError, TypeError):
            random_pick_count = 1
        if random_pick_count < 1:
            random_pick_count = 1

        enabled_loras = [item for item in lora_items if item.get("enabled", False)]

        if not enabled_loras and not prompt_loras:
            if (positive is None or len(positive) == 0) and clean_prompt and clip is not None:
                try:
                    from nodes import CLIPTextEncode
                    encoder = CLIPTextEncode()
                    positive = encoder.encode(clip, clean_prompt)[0]
                except Exception:
                    pass
            if positive is None: positive = []
            if negative is None: negative = []
            output_pipe = (model, clip, vae, positive, negative)
            return (model, clip, positive, negative, seed, output_pipe, "No LoRAs loaded", "", clean_prompt)

        # Deterministic RNG based on seed
        rng = random.Random(seed if seed is not None and seed != 0 else None)

        fixed_loras = [item for item in enabled_loras if not item.get("random", False)]
        random_pool = [item for item in enabled_loras if item.get("random", False)]

        chosen_random = []
        if random_pool:
            k = min(random_pick_count, len(random_pool))
            chosen_random = rng.sample(random_pool, k)

        if not keyword_blacklist and "key_blacklist" in kwargs:
            keyword_blacklist = kwargs["key_blacklist"]

        blacklist_set = set()
        config_bl = settings.get("lora_keyword_blacklist", [])
        if isinstance(config_bl, list):
            blacklist_set.update(k.strip().lower() for k in config_bl if isinstance(k, str) and k.strip())
        elif isinstance(config_bl, str) and config_bl.strip():
            blacklist_set.update(k.strip().lower() for k in config_bl.split(",") if k.strip())

        if keyword_blacklist and isinstance(keyword_blacklist, str):
            blacklist_set.update(k.strip().strip("\"'").lower() for k in keyword_blacklist.split(",") if k.strip())

        active_loras = [(item, "Fixed") for item in fixed_loras] + [(item, "Random") for item in chosen_random]
        loaded_summaries = []
        all_trigger_words = []
        applied_lora_files = set()
        accumulated_hooks = []

        for item, tag in active_loras:
            lora_name = item.get("name")
            if not lora_name:
                continue

            lora_file = self.find_lora_path(lora_name, lora_paths)
            if lora_file:
                applied_lora_files.add(lora_file.lower().replace('\\', '/'))
                if auto_keyword_discovery:
                    full_lora_path = folder_paths.get_full_path("loras", lora_file)
                    if full_lora_path:
                        triggers = self.extract_lora_trigger_words(full_lora_path, blacklist=blacklist_set)
                        for t in triggers:
                            if (not blacklist_set or t.strip().lower() not in blacklist_set) and t not in all_trigger_words:
                                all_trigger_words.append(t)

                # Determine effective strength (fixed vs randomized range)
                is_random_str = item.get("random_strength", False)
                if is_random_str:
                    min_s = float(item.get("min_strength", 0.5))
                    max_s = float(item.get("max_strength", 1.0))
                    if min_s > max_s:
                        min_s, max_s = max_s, min_s
                    strength = round(rng.uniform(min_s, max_s), 3)
                    weight_desc = f"rolled: {strength:g} [{min_s:g}~{max_s:g}]"
                else:
                    strength = float(item.get("strength", 1.0))
                    weight_desc = f"strength: {strength:g}"

                if strength == 0:
                    continue

                is_dynamic = enable_dynamic_lora and item.get("dynamic", False)
                if is_dynamic:
                    start_pct = float(item.get("start_percent", 0.0))
                    end_pct = float(item.get("end_percent", 1.0))
                    end_str = float(item.get("end_strength", 0.0))
                    decay_prof = str(item.get("decay_profile", "cosine")).lower()

                    # If timing is flat across the whole range, skip dynamic hooks to retain native full speed
                    if start_pct <= 0.0 and end_pct >= 1.0 and abs(end_str - strength) < 1e-4:
                        is_dynamic = False

                if is_dynamic:
                    applied_via_hook = False
                    try:
                        import comfy.hooks
                        import comfy.utils
                        full_path = folder_paths.get_full_path("loras", lora_file)
                        if full_path and os.path.isfile(full_path):
                            lora_sd = comfy.utils.load_torch_file(full_path, safe_load=True)
                            m_model, m_clip, hook_group = comfy.hooks.load_hook_lora_for_models(
                                model, clip, lora_sd, strength_model=strength, strength_clip=strength
                            )
                            if hasattr(m_model, "set_hook_mode"):
                                m_model.set_hook_mode(comfy.hooks.EnumHookMode.MaxSpeed)
                            kfg = self._create_hook_keyframes(start_pct, end_pct, strength, end_str, decay_prof)
                            if kfg:
                                for h in hook_group.hooks:
                                    h.hook_keyframe = kfg
                                    h.hook_scope = comfy.hooks.EnumHookScope.AllConditioning
                                model = m_model
                                clip = m_clip
                                accumulated_hooks.append(hook_group)
                                applied_via_hook = True
                                loaded_summaries.append(f"[{tag}+Dynamic] {lora_name} ({weight_desc} ➔ {end_str:g} @ {start_pct:g}-{end_pct:g} [{decay_prof}])")
                    except Exception:
                        pass

                    if not applied_via_hook:
                        try:
                            model, clip = lora_loader.load_lora(model, clip, lora_file, strength, strength)
                            loaded_summaries.append(f"[{tag}] {lora_name} ({weight_desc})")
                        except Exception:
                            pass
                else:
                    try:
                        model, clip = lora_loader.load_lora(model, clip, lora_file, strength, strength)
                        loaded_summaries.append(f"[{tag}] {lora_name} ({weight_desc})")
                    except Exception:
                        pass

        # Apply prompt-tagged LoRAs (<lora:name:...>)
        for p_item in prompt_loras:
            lora_name = p_item.get("name")
            if not lora_name:
                continue

            lora_file = self.find_lora_path(lora_name, lora_paths)
            if lora_file:
                lora_key = lora_file.lower().replace('\\', '/')
                if lora_key in applied_lora_files:
                    continue
                applied_lora_files.add(lora_key)

                if auto_keyword_discovery:
                    full_lora_path = folder_paths.get_full_path("loras", lora_file)
                    if full_lora_path:
                        triggers = self.extract_lora_trigger_words(full_lora_path, blacklist=blacklist_set)
                        for t in triggers:
                            if (not blacklist_set or t.strip().lower() not in blacklist_set) and t not in all_trigger_words:
                                all_trigger_words.append(t)

                if p_item.get("is_range", False):
                    min_s = float(p_item.get("min_strength", 0.5))
                    max_s = float(p_item.get("max_strength", 1.0))
                    if min_s > max_s:
                        min_s, max_s = max_s, min_s
                    rolled_val = round(rng.uniform(min_s, max_s), 3)
                    m_strength = rolled_val
                    c_strength = rolled_val
                    weight_desc = f"rolled: {rolled_val:g} [{min_s:g}~{max_s:g}]"
                else:
                    m_strength = float(p_item.get("model_strength", 1.0))
                    c_strength = float(p_item.get("clip_strength", m_strength))
                    weight_desc = f"strength: {m_strength:g}" if m_strength == c_strength else f"model: {m_strength:g}, clip: {c_strength:g}"

                if m_strength == 0 and c_strength == 0:
                    continue

                is_dynamic = enable_dynamic_lora and p_item.get("dynamic", False)
                if is_dynamic:
                    start_pct = float(p_item.get("start_percent", 0.0))
                    end_pct = float(p_item.get("end_percent", 1.0))
                    end_str = float(p_item.get("end_strength", 0.0))
                    decay_prof = str(p_item.get("decay_profile", "cosine")).lower()

                    # If timing is flat across the whole range, skip dynamic hooks to retain native full speed
                    if start_pct <= 0.0 and end_pct >= 1.0 and abs(end_str - m_strength) < 1e-4:
                        is_dynamic = False

                if is_dynamic:
                    applied_via_hook = False
                    try:
                        import comfy.hooks
                        import comfy.utils
                        full_path = folder_paths.get_full_path("loras", lora_file)
                        if full_path and os.path.isfile(full_path):
                            lora_sd = comfy.utils.load_torch_file(full_path, safe_load=True)
                            m_model, m_clip, hook_group = comfy.hooks.load_hook_lora_for_models(
                                model, clip, lora_sd, strength_model=m_strength, strength_clip=c_strength
                            )
                            if hasattr(m_model, "set_hook_mode"):
                                m_model.set_hook_mode(comfy.hooks.EnumHookMode.MaxSpeed)
                            kfg = self._create_hook_keyframes(start_pct, end_pct, m_strength, end_str, decay_prof)
                            if kfg:
                                for h in hook_group.hooks:
                                    h.hook_keyframe = kfg
                                    h.hook_scope = comfy.hooks.EnumHookScope.AllConditioning
                                model = m_model
                                clip = m_clip
                                accumulated_hooks.append(hook_group)
                                applied_via_hook = True
                                loaded_summaries.append(f"[Prompt+Dynamic] {lora_name} ({weight_desc} ➔ {end_str:g} @ {start_pct:g}-{end_pct:g} [{decay_prof}])")
                    except Exception:
                        pass

                    if not applied_via_hook:
                        try:
                            model, clip = lora_loader.load_lora(model, clip, lora_file, m_strength, c_strength)
                            loaded_summaries.append(f"[Prompt] {lora_name} ({weight_desc})")
                        except Exception:
                            pass
                else:
                    try:
                        model, clip = lora_loader.load_lora(model, clip, lora_file, m_strength, c_strength)
                        loaded_summaries.append(f"[Prompt] {lora_name} ({weight_desc})")
                    except Exception:
                        pass
            else:
                loaded_summaries.append(f"[Prompt] {lora_name} (NOT FOUND on disk)")

        # Encode clean prompt if needed
        if (bool(prompt_loras) or positive is None or len(positive) == 0) and clean_prompt and clip is not None:
            try:
                from nodes import CLIPTextEncode
                encoder = CLIPTextEncode()
                positive = encoder.encode(clip, clean_prompt)[0]
            except Exception:
                pass

        # Attach accumulated hooks to BOTH positive and negative conditioning.
        # If hooks are only on positive conditioning, ComfyUI unpatches and re-patches
        # the entire model weights between positive and negative CFG passes on EVERY step (causing 100s+ per it slowdowns)!
        if accumulated_hooks:
            try:
                import comfy.hooks
                for hg in accumulated_hooks:
                    if positive is not None and isinstance(positive, (list, tuple)):
                        positive = comfy.hooks.set_hooks_for_conditioning(positive, hg)
                    if negative is not None and isinstance(negative, (list, tuple)):
                        negative = comfy.hooks.set_hooks_for_conditioning(negative, hg)
            except Exception:
                pass

        if positive is None: positive = []
        if negative is None: negative = []

        output_pipe = (model, clip, vae, positive, negative)
        lora_summary_text = "\n".join(loaded_summaries) if loaded_summaries else "No LoRAs loaded"
        trigger_words_str = ", ".join(all_trigger_words)
        return (model, clip, positive, negative, seed, output_pipe, lora_summary_text, trigger_words_str, clean_prompt)

NODE_CLASS_MAPPINGS = {
    "ZombiehausLoraLoader": ZombiehausLoraLoader,
    "ZombiehausLoraLoader": ZombiehausLoraLoader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ZombiehausLoraLoader": "Zombiehaus LoRA Deck",
    "ZombiehausLoraLoader": "Zombiehaus LoRA Deck"
}
