"""
Zombiehaus Prompt Variable Node

Extracts prompt variables (e.g. $listitem, $list, $name, or object properties like $listitem.name)
evaluated in Zombiehaus Text Editor and formats them for downstream nodes, such as Save Image filename prefixes.
"""

import re
import folder_paths


class ZombiehausPromptVariable:
    """
    Extract prompt variables (e.g. from $listitem, $list, $name, or objects in TextEditor)
    and format them for downstream nodes like Save Image filename prefixes.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "variable_name": ("STRING", {
                    "default": "name",
                    "tooltip": "Variable name to extract (e.g. 'name', 'listitem', 'character', 'listitem.hair', etc.)"
                }),
                "prefix_template": ("STRING", {
                    "default": "images/%date%/%var%_%seed%",
                    "tooltip": "Filename prefix template. %var% is replaced by the extracted variable."
                }),
                "fallback": ("STRING", {
                    "default": "",
                    "tooltip": "Fallback text if the variable is not found"
                }),
            },
            "optional": {
                "pipe": ("PIPE",),
            },
        }

    RETURN_TYPES = ("STRING", "STRING", "PIPE")
    RETURN_NAMES = ("value", "filename", "pipe")
    FUNCTION = "get_variable"
    CATEGORY = "Zombiehaus/Utilities"

    def get_variable(self, variable_name: str, prefix_template: str, fallback: str = "", pipe=None):
        from .text_editor_node import ZombiehausTextEditor
        from .save_audio_node import _expand_shorthand_vars

        vars_dict = {}
        if pipe is not None:
            if isinstance(pipe, dict):
                vars_dict.update(pipe.get("variables") or {})
            elif len(pipe) > 11 and isinstance(pipe[11], dict):
                vars_dict.update(pipe[11])
            pos_c = pipe.get("positive") if isinstance(pipe, dict) else (pipe[3] if len(pipe) > 3 else None)
            if pos_c and isinstance(pos_c, (list, tuple)):
                for chunk in pos_c:
                    if len(chunk) > 1 and isinstance(chunk[1], dict) and "zombiehaus_variables" in chunk[1]:
                        vars_dict.update(chunk[1]["zombiehaus_variables"])
                        break

        if not vars_dict:
            vars_dict = ZombiehausTextEditor.get_last_variables()

        seed = 0
        if pipe is not None:
            from .pipe_bus_node import resolve_pipe_seed
            seed = resolve_pipe_seed(pipe, local_seed=0)

        # Extract value
        var_key = variable_name.strip().lstrip('$')
        val = ""
        if "." in var_key:
            parts = var_key.split(".", 1)
            b = parts[0]
            prop = parts[1]
            if b in vars_dict:
                b_val = vars_dict[b]
                if isinstance(b_val, dict):
                    val = b_val.get(prop, "")
                    if not val and prop.lower() in ("name", "key"):
                        val = b_val.get("name") or b_val.get("key") or ""
        elif var_key in vars_dict:
            raw_v = vars_dict[var_key]
            if isinstance(raw_v, dict):
                val = raw_v.get("name") or raw_v.get("key") or ""
                if not val and len(raw_v) == 1:
                    val = next(iter(raw_v.keys()))
            else:
                val = str(raw_v)
        elif var_key.lower() in ("name", "character", "object"):
            for v in vars_dict.values():
                if isinstance(v, dict):
                    cand = v.get("name") or v.get("key")
                    if cand:
                        val = str(cand)
                        break

        if not val:
            val = fallback

        val_str = str(val).strip()
        safe_val = re.sub(r'[<>:"/\\|?*]', '_', val_str).strip()

        # Format filename prefix
        vars_for_filename = dict(vars_dict)
        vars_for_filename["var"] = safe_val
        vars_for_filename["name"] = safe_val
        vars_for_filename[var_key] = safe_val

        formatted_prefix = _expand_shorthand_vars(prefix_template, seed=seed, variables=vars_for_filename)
        formatted_prefix = formatted_prefix.replace("%var%", safe_val)

        return (val_str, formatted_prefix, pipe)
