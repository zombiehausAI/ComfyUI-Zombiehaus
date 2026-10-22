import torch
from nodes import KSampler

class ZombiehausBatchKSampler:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                "steps": ("INT", {"default": 20, "min": 1, "max": 100}),
                "cfg": ("FLOAT", {"default": 7.0, "min": 0.0, "max": 20.0}),
                "sampler_name": (["euler", "euler_a", "dpm_2", "dpm_2_a", "dpm_fast", "dpm_adaptive", "dpmpp_2s_a", "dpmpp_2m", "dpmpp_sde", "dpmpp_2m_sde", "dpmpp_2m_sde_gpu", "dpmpp_2m_sde_karras"], {"default": "euler"}),
                "scheduler": (["normal", "karras", "exponential", "polyexponential"], {"default": "normal"}),
            },
            "optional": {
                "model": ("MODEL",),
                "latent_image": ("LATENT",),
                "positive_conditioning": ("CONDITIONING",),
                "negative_conditioning": ("CONDITIONING",),
                "pipe": ("PIPE",),
            }
        }

    RETURN_TYPES = ("LATENT", "PIPE")
    RETURN_NAMES = ("latent", "pipe")
    FUNCTION = "sample"
    CATEGORY = "Zombiehaus/Batching"

    def sample(self, seed, steps, cfg, sampler_name, scheduler,
               model=None, latent_image=None, positive_conditioning=None,
               negative_conditioning=None, pipe=None):
        # Extract components from pipe if not provided
        if model is None and pipe is not None:
            model = pipe.get("model") if isinstance(pipe, dict) else (pipe[0] if len(pipe) > 0 else None)
        if latent_image is None and pipe is not None:
            latent_image = pipe.get("latent") if isinstance(pipe, dict) else (pipe[6] if len(pipe) > 6 else None)
        if positive_conditioning is None and pipe is not None:
            positive_conditioning = pipe.get("positive") if isinstance(pipe, dict) else (pipe[3] if len(pipe) > 3 else None)
        if negative_conditioning is None and pipe is not None:
            negative_conditioning = pipe.get("negative") if isinstance(pipe, dict) else (pipe[4] if len(pipe) > 4 else None)

        if model is None:
            raise ValueError("[ZombiehausBatchKSampler] MODEL is required (provide via model input or pipe)")
        if latent_image is None:
            raise ValueError("[ZombiehausBatchKSampler] LATENT is required (provide via latent_image input or pipe)")
        if positive_conditioning is None:
            raise ValueError("[ZombiehausBatchKSampler] POSITIVE conditioning is required (provide via input or pipe)")
        if negative_conditioning is None:
            raise ValueError("[ZombiehausBatchKSampler] NEGATIVE conditioning is required (provide via input or pipe)")

        # Hybrid seed fallback: if seed == 0 and pipe contains seed, use pipe seed
        active_seed = seed
        if active_seed == 0 and pipe is not None:
            pipe_seed = pipe.get("seed") if isinstance(pipe, dict) else (pipe[5] if len(pipe) > 5 else None)
            if pipe_seed is not None and int(pipe_seed) > 0:
                active_seed = int(pipe_seed)

        ksampler = KSampler()
        result = ksampler.sample(model, active_seed, steps, cfg, sampler_name, scheduler, positive_conditioning, negative_conditioning, latent_image)
        out_latent = result[0]

        out_pipe = pipe
        if out_pipe is not None:
            from .pipe_bus_node import ZombiehausPipe
            if isinstance(out_pipe, dict):
                d = dict(out_pipe)
                d["latent"] = out_latent
                d["seed"] = active_seed
                out_pipe = d
            elif isinstance(out_pipe, (tuple, list)):
                out_pipe = ZombiehausPipe((
                    out_pipe[0] if len(out_pipe) > 0 else model,
                    out_pipe[1] if len(out_pipe) > 1 else None,
                    out_pipe[2] if len(out_pipe) > 2 else None,
                    out_pipe[3] if len(out_pipe) > 3 else positive_conditioning,
                    out_pipe[4] if len(out_pipe) > 4 else negative_conditioning,
                    active_seed,
                    out_latent,
                    out_pipe[7] if len(out_pipe) > 7 else None,
                    out_pipe[8] if len(out_pipe) > 8 else None,
                    out_pipe[9] if len(out_pipe) > 9 else "",
                    out_pipe[10] if len(out_pipe) > 10 else "",
                ))

        return (out_latent, out_pipe)

NODE_CLASS_MAPPINGS = {
    "ZombiehausBatchKSampler": ZombiehausBatchKSampler,
    "ZombiehausBatchKSampler": ZombiehausBatchKSampler
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ZombiehausBatchKSampler": "Zombiehaus Batch KSampler",
    "ZombiehausBatchKSampler": "Zombiehaus Batch KSampler"
}
