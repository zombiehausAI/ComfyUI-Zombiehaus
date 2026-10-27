"""
Zombiehaus Pipe Bus Node

Centralized master pipeline distribution and bus node for Zombiehaus workflows.
Allows packing, updating, tapping, and fanning out workflow components:
- Receives any combination of master PIPE and individual components (MODEL, CLIP, VAE, etc.)
- Packs or overrides components into a unified master PIPE
- Fans out individual clean taps for every component to eliminate wire spaghetti across canvases
"""

class ZombiehausPipe(tuple):
    """
    Unified Zombiehaus PIPE object.
    Supports both tuple indexing:
      0: model, 1: clip, 2: vae, 3: positive, 4: negative, 5: seed,
      6: latent, 7: image, 8: mask, 9: positive_text, 10: negative_text
    and dictionary access: pipe.get("model"), pipe.get("mask"), pipe.get("positive_text"), etc.
    """
    _KEYS = (
        "model", "clip", "vae", "positive", "negative",
        "seed", "latent", "image", "mask",
        "positive_text", "negative_text",
        "variables"
    )
    _ALIASES = {
        "prompt": 9,
        "positive_prompt": 9,
        "negative_prompt": 10,
        "text": 9,
        "vars": 11,
        "variables": 11,
    }

    def get(self, key, default=None):
        idx = self._ALIASES.get(key)
        if idx is None:
            mapping = {k: i for i, k in enumerate(self._KEYS)}
            idx = mapping.get(key)
        if idx is not None and idx < len(self):
            val = self[idx]
            return val if val is not None else default
        return default


def resolve_pipe_seed(pipe, local_seed=0, seed_action=None) -> int:
    """
    Intelligent seed fallback for Zombiehaus nodes:
    - If local_seed != 0 (or seed_action is active: 'randomize', 'increment', 'decrement'), local takes precedence.
    - If local_seed == 0 (and seed_action is 'fixed' or None), falls back to seed in pipe if > 0.
    """
    if seed_action in ("randomize", "increment", "decrement"):
        return local_seed if local_seed is not None else 0
    if local_seed is not None and local_seed != 0:
        return local_seed
    if pipe is not None:
        p_seed = pipe.get("seed") if isinstance(pipe, dict) else (pipe[5] if len(pipe) > 5 else None)
        if isinstance(p_seed, int) and p_seed > 0:
            return p_seed
    return local_seed or 0


class ZombiehausPipeBus:
    """
    Centralized Pipeline Distribution / Bus Node.
    Consolidates disparate connections into a single clean distribution hub.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                # Master Pipe input (consolidates all upstream components)
                "pipe": ("PIPE",),
                # Individual component inputs (override or populate the pipe)
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "vae": ("VAE",),
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
                "latent": ("LATENT",),
                "image": ("IMAGE",),
                "mask": ("MASK",),
                "seed": ("INT", {"forceInput": True}),
                "positive_text": ("STRING", {"forceInput": True}),
                "negative_text": ("STRING", {"forceInput": True}),
            }
        }

    RETURN_TYPES = (
        "PIPE",
        "MODEL",
        "CLIP",
        "VAE",
        "CONDITIONING",
        "CONDITIONING",
        "LATENT",
        "IMAGE",
        "MASK",
        "INT",
        "STRING",
        "STRING",
    )
    RETURN_NAMES = (
        "pipe",
        "model",
        "clip",
        "vae",
        "positive",
        "negative",
        "latent",
        "image",
        "mask",
        "seed",
        "positive_text",
        "negative_text",
    )
    FUNCTION = "distribute_pipe"
    CATEGORY = "Zombiehaus/Pipes"

    def distribute_pipe(self, pipe=None, model=None, clip=None, vae=None,
                        positive=None, negative=None, latent=None, image=None, mask=None,
                        seed=None, positive_text=None, negative_text=None):
        # 1. Unpack incoming master pipe if connected
        p_model = None
        p_clip = None
        p_vae = None
        p_positive = None
        p_negative = None
        p_seed = 0
        p_latent = None
        p_image = None
        p_mask = None
        p_positive_text = ""
        p_negative_text = ""
        p_variables = {}

        if pipe is not None:
            if isinstance(pipe, dict):
                p_model = pipe.get("model")
                p_clip = pipe.get("clip")
                p_vae = pipe.get("vae")
                p_positive = pipe.get("positive")
                p_negative = pipe.get("negative")
                p_seed = pipe.get("seed", 0)
                p_latent = pipe.get("latent")
                p_image = pipe.get("image")
                p_mask = pipe.get("mask")
                p_positive_text = pipe.get("positive_text", "")
                p_negative_text = pipe.get("negative_text", "")
                p_variables = pipe.get("variables") or {}
            elif isinstance(pipe, (tuple, list)):
                p_model = pipe[0] if len(pipe) > 0 else None
                p_clip = pipe[1] if len(pipe) > 1 else None
                p_vae = pipe[2] if len(pipe) > 2 else None
                p_positive = pipe[3] if len(pipe) > 3 else None
                p_negative = pipe[4] if len(pipe) > 4 else None
                p_seed = pipe[5] if len(pipe) > 5 else 0
                p_latent = pipe[6] if len(pipe) > 6 else None
                p_image = pipe[7] if len(pipe) > 7 else None
                p_mask = pipe[8] if len(pipe) > 8 else None
                p_positive_text = pipe[9] if len(pipe) > 9 else ""
                p_negative_text = pipe[10] if len(pipe) > 10 else ""
                p_variables = pipe[11] if len(pipe) > 11 and isinstance(pipe[11], dict) else {}

        # Extract prompt text from positive conditioning metadata if not explicitly provided
        if not p_positive_text and p_positive and isinstance(p_positive, (list, tuple)):
            for chunk in p_positive:
                if len(chunk) > 1 and isinstance(chunk[1], dict) and "clean_prompt" in chunk[1]:
                    p_positive_text = chunk[1]["clean_prompt"]
                    break

        if not p_variables and p_positive and isinstance(p_positive, (list, tuple)):
            for chunk in p_positive:
                if len(chunk) > 1 and isinstance(chunk[1], dict) and "zombiehaus_variables" in chunk[1]:
                    p_variables = chunk[1]["zombiehaus_variables"]
                    break

        # 2. Individual inputs take priority over pipe values
        out_model = model if model is not None else p_model
        out_clip = clip if clip is not None else p_clip
        out_vae = vae if vae is not None else p_vae
        out_positive = positive if positive is not None else p_positive
        out_negative = negative if negative is not None else p_negative
        out_seed = seed if seed is not None else p_seed
        out_latent = latent if latent is not None else p_latent
        out_image = image if image is not None else p_image
        out_mask = mask if mask is not None else p_mask
        out_pos_text = positive_text if positive_text is not None else p_positive_text
        out_neg_text = negative_text if negative_text is not None else p_negative_text

        # 3. Construct unified master PIPE
        output_pipe = ZombiehausPipe((
            out_model,
            out_clip,
            out_vae,
            out_positive,
            out_negative,
            out_seed,
            out_latent,
            out_image,
            out_mask,
            out_pos_text,
            out_neg_text,
            p_variables,
        ))

        return (
            output_pipe,
            out_model,
            out_clip,
            out_vae,
            out_positive,
            out_negative,
            out_latent,
            out_image,
            out_mask,
            int(out_seed) if out_seed is not None else 0,
            str(out_pos_text) if out_pos_text is not None else "",
            str(out_neg_text) if out_neg_text is not None else "",
        )
