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
    Supports both tuple indexing: pipe[0]=model, pipe[1]=clip, pipe[2]=vae, pipe[3]=pos, pipe[4]=neg...
    and dictionary access: pipe.get("model"), pipe.get("vae"), etc.
    """
    _KEYS = ("model", "clip", "vae", "positive", "negative", "seed", "latent", "image")

    def get(self, key, default=None):
        mapping = {k: idx for idx, k in enumerate(self._KEYS)}
        idx = mapping.get(key)
        if idx is not None and idx < len(self):
            val = self[idx]
            return val if val is not None else default
        return default


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
                "seed": ("INT", {"forceInput": True}),
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
        "INT",
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
        "seed",
    )
    FUNCTION = "distribute_pipe"
    CATEGORY = "Zombiehaus/Pipes"

    def distribute_pipe(self, pipe=None, model=None, clip=None, vae=None,
                        positive=None, negative=None, latent=None, image=None, seed=None):
        # 1. Unpack incoming master pipe if connected
        p_model = None
        p_clip = None
        p_vae = None
        p_positive = None
        p_negative = None
        p_seed = 0
        p_latent = None
        p_image = None

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
            elif isinstance(pipe, (tuple, list)):
                p_model = pipe[0] if len(pipe) > 0 else None
                p_clip = pipe[1] if len(pipe) > 1 else None
                p_vae = pipe[2] if len(pipe) > 2 else None
                p_positive = pipe[3] if len(pipe) > 3 else None
                p_negative = pipe[4] if len(pipe) > 4 else None
                p_seed = pipe[5] if len(pipe) > 5 else 0
                p_latent = pipe[6] if len(pipe) > 6 else None
                p_image = pipe[7] if len(pipe) > 7 else None

        # 2. Individual inputs take priority over pipe values
        out_model = model if model is not None else p_model
        out_clip = clip if clip is not None else p_clip
        out_vae = vae if vae is not None else p_vae
        out_positive = positive if positive is not None else p_positive
        out_negative = negative if negative is not None else p_negative
        out_seed = seed if seed is not None else p_seed
        out_latent = latent if latent is not None else p_latent
        out_image = image if image is not None else p_image

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
            int(out_seed) if out_seed is not None else 0,
        )
