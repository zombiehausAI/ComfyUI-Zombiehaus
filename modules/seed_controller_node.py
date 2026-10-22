import random
import time

class ZombiehausSeedController:
    """
    A centralized master seed controller for ComfyUI-Zombiehaus.
    Distributes a synchronized seed across KSampler, Text Editor dynamic choices,
    and LoRA Random Pools with multiple workflow modes (randomize, fixed, increment, decrement).
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                "action": (["randomize", "fixed", "increment", "decrement"], {"default": "randomize"}),
            },
            "optional": {
                "pipe": ("PIPE",),
            }
        }

    RETURN_TYPES = ("INT", "STRING", "PIPE")
    RETURN_NAMES = ("seed", "seed_text", "pipe")
    FUNCTION = "get_seed"
    CATEGORY = "Zombiehaus/Utilities"

    @classmethod
    def IS_CHANGED(cls, seed, action, **kwargs):
        if action in ("randomize", "increment", "decrement"):
            return time.time()
        return seed

    def get_seed(self, seed: int, action: str, pipe=None):
        if seed == 0 and action == "fixed" and pipe is not None:
            pipe_seed = pipe.get("seed") if isinstance(pipe, dict) else (pipe[5] if len(pipe) > 5 else None)
            if pipe_seed is not None and int(pipe_seed) > 0:
                seed = int(pipe_seed)

        if action == "randomize":
            actual_seed = random.randint(0, 0xffffffffffffffff)
        elif action == "increment":
            actual_seed = (seed + 1) & 0xffffffffffffffff
        elif action == "decrement":
            actual_seed = (seed - 1) & 0xffffffffffffffff if seed > 0 else 0
        else:
            actual_seed = seed

        out_pipe = pipe
        if out_pipe is not None:
            from .pipe_bus_node import ZombiehausPipe
            if isinstance(out_pipe, dict):
                d = dict(out_pipe)
                d["seed"] = actual_seed
                out_pipe = d
            elif isinstance(out_pipe, (tuple, list)):
                out_pipe = ZombiehausPipe((
                    out_pipe[0] if len(out_pipe) > 0 else None,
                    out_pipe[1] if len(out_pipe) > 1 else None,
                    out_pipe[2] if len(out_pipe) > 2 else None,
                    out_pipe[3] if len(out_pipe) > 3 else None,
                    out_pipe[4] if len(out_pipe) > 4 else None,
                    actual_seed,
                    out_pipe[6] if len(out_pipe) > 6 else None,
                    out_pipe[7] if len(out_pipe) > 7 else None,
                    out_pipe[8] if len(out_pipe) > 8 else None,
                    out_pipe[9] if len(out_pipe) > 9 else "",
                    out_pipe[10] if len(out_pipe) > 10 else "",
                ))

        return (actual_seed, str(actual_seed), out_pipe)

NODE_CLASS_MAPPINGS = {
    "ZombiehausSeedController": ZombiehausSeedController,
    "ZombiehausSeedController": ZombiehausSeedController
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ZombiehausSeedController": "Zombiehaus Master Seed",
    "ZombiehausSeedController": "Zombiehaus Master Seed"
}
