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
                "text": ("STRING", {"multiline": True, "default": ""}),
            },
            "optional": {
                "clip": ("CLIP",),
                "conditioning": ("CONDITIONING",),
                "pipe": ("PIPE",),
            }
        }

    RETURN_TYPES = ("CONDITIONING", "PIPE")
    RETURN_NAMES = ("conditioning", "pipe")
    FUNCTION = "concat"
    CATEGORY = "Zombiehaus/Conditioning"

    def concat(self, text, clip=None, conditioning=None, pipe=None):
        if clip is None and pipe is not None:
            clip = pipe.get("clip") if isinstance(pipe, dict) else (pipe[1] if len(pipe) > 1 else None)
        if conditioning is None and pipe is not None:
            conditioning = pipe.get("positive") if isinstance(pipe, dict) else (pipe[3] if len(pipe) > 3 else None)

        if clip is None:
            raise ValueError("[ZombiehausConditioningConcat] CLIP is required (provide via clip input or pipe)")
        if conditioning is None:
            raise ValueError("[ZombiehausConditioningConcat] CONDITIONING is required (provide via input or pipe)")

        new_cond = CLIPTextEncode().encode(clip, text)[0]
        out_cond = conditioning + new_cond

        out_pipe = pipe
        if out_pipe is not None:
            from .pipe_bus_node import ZombiehausPipe
            if isinstance(out_pipe, dict):
                d = dict(out_pipe)
                d["positive"] = out_cond
                out_pipe = d
            elif isinstance(out_pipe, (tuple, list)):
                out_pipe = ZombiehausPipe((
                    out_pipe[0] if len(out_pipe) > 0 else None,
                    clip,
                    out_pipe[2] if len(out_pipe) > 2 else None,
                    out_cond,
                    out_pipe[4] if len(out_pipe) > 4 else None,
                    out_pipe[5] if len(out_pipe) > 5 else None,
                    out_pipe[6] if len(out_pipe) > 6 else None,
                    out_pipe[7] if len(out_pipe) > 7 else None,
                    out_pipe[8] if len(out_pipe) > 8 else None,
                    out_pipe[9] if len(out_pipe) > 9 else "",
                    out_pipe[10] if len(out_pipe) > 10 else "",
                ))

        return (out_cond, out_pipe)
