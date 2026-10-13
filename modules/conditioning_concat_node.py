"""
Zombiehaus Conditioning Concat Node
Encodes a text string and concatenates it onto an existing conditioning.
"""

from nodes import CLIPTextEncode


class ZombiehausConditioningConcat:
    """Encode text and append it to an existing conditioning."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "clip": ("CLIP",),
                "conditioning": ("CONDITIONING",),
                "text": ("STRING", {"multiline": True, "default": ""}),
            }
        }

    RETURN_TYPES = ("CONDITIONING",)
    RETURN_NAMES = ("conditioning",)
    FUNCTION = "concat"
    CATEGORY = "Zombiehaus/Conditioning"

    def concat(self, clip, conditioning, text):
        new_cond = CLIPTextEncode().encode(clip, text)[0]
        return (conditioning + new_cond,)
