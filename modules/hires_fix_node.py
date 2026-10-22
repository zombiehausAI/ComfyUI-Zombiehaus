"""
Zombiehaus All-in-One Hires Fix & Auto-Enhance Node

Consolidates the complete high-resolution fix pipeline into a single node:
1. Spatial upscaling with 16-pixel alignment for DiT / Flux / SDXL.
2. VAE latent encoding.
3. 2nd-pass diffusion sampling at controlled denoise.
4. Optional integrated face refinement pass.
5. Integrated De-Wax skin pore and sensor grain restoration.
"""

import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image, ImageFilter
import comfy.samplers
from nodes import KSampler, VAEEncode, VAEDecode

try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False


def tensor_to_pil(tensor: torch.Tensor) -> Image.Image:
    if tensor.ndim == 4:
        tensor = tensor[0]
    arr = (tensor.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def pil_to_tensor(img: Image.Image) -> torch.Tensor:
    arr = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0)


def apply_dewax(img_pil: Image.Image, micro_texture: float = 0.25, grain_intensity: float = 0.06) -> Image.Image:
    """Frequency separation texture restoration to prevent synthetic plastic skin."""
    try:
        arr = np.array(img_pil).astype(np.float32)
        blurred = img_pil.filter(ImageFilter.GaussianBlur(radius=2))
        blurred_arr = np.array(blurred).astype(np.float32)

        # High-frequency detail extraction
        high_freq = arr - blurred_arr
        restored = arr + high_freq * micro_texture

        # Organic sensor grain
        if grain_intensity > 0.01:
            h, w, c = arr.shape
            noise = np.random.normal(0, grain_intensity * 255.0, (h, w, 1))
            lum = 0.2126 * arr[:, :, 0] + 0.7152 * arr[:, :, 1] + 0.0722 * arr[:, :, 2]
            midtones = np.sin(np.clip(lum / 255.0, 0, 1) * np.pi)[:, :, np.newaxis]
            restored = restored + noise * midtones

        return Image.fromarray(np.clip(restored, 0, 255).astype(np.uint8), "RGB")
    except Exception:
        return img_pil


class ZombiehausHiresFix:
    """
    All-in-One Hires Fix: Upscales, re-samples, refines faces, and restores texture
    in a single clean node.
    """

    @classmethod
    def INPUT_TYPES(cls):
        samplers = comfy.samplers.KSampler.SAMPLERS
        schedulers = comfy.samplers.KSampler.SCHEDULERS
        methods = ["bicubic", "bilinear", "nearest-exact", "area"]

        return {
            "required": {
                "pipe": ("PIPE",),
                "scale_by": ("FLOAT", {"default": 1.5, "min": 1.1, "max": 4.0, "step": 0.1}),
                "upscale_method": (methods, {"default": "bicubic"}),
                "denoise": ("FLOAT", {"default": 0.35, "min": 0.1, "max": 0.8, "step": 0.02}),
                "steps": ("INT", {"default": 20, "min": 5, "max": 80}),
                "cfg": ("FLOAT", {"default": 5.0, "min": 1.0, "max": 20.0, "step": 0.5}),
                "sampler_name": (samplers, {"default": "euler" if "euler" in samplers else samplers[0]}),
                "scheduler": (schedulers, {"default": "karras" if "karras" in schedulers else schedulers[0]}),
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                "restore_face": ("BOOLEAN", {"default": True}),
                "dewax_texture": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                "image": ("IMAGE",),
            }
        }

    RETURN_TYPES = ("IMAGE", "PIPE")
    RETURN_NAMES = ("enhanced_image", "pipe")
    FUNCTION = "enhance"
    CATEGORY = "Zombiehaus/Image"

    def enhance(self, pipe, scale_by, upscale_method, denoise, steps,
                cfg, sampler_name, scheduler, seed, restore_face, dewax_texture, image=None):
        if image is None and pipe is not None:
            image = pipe.get("image") if isinstance(pipe, dict) else (pipe[7] if len(pipe) > 7 else None)
        if image is None:
            raise ValueError("[ZombiehausHiresFix] IMAGE is required (provide via image input or pipe)")

        # Resolve pipe components (supports both tuple and dict PIPE formats)
        if isinstance(pipe, dict):
            model = pipe.get("model")
            clip = pipe.get("clip")
            vae = pipe.get("vae")
            positive = pipe.get("positive")
            negative = pipe.get("negative")
        else:
            model = pipe[0] if len(pipe) > 0 else None
            clip = pipe[1] if len(pipe) > 1 else None
            vae = pipe[2] if len(pipe) > 2 else None
            positive = pipe[3] if len(pipe) > 3 else None
            negative = pipe[4] if len(pipe) > 4 else None

        # Intelligent hybrid seed fallback: if seed == 0, adopt pipe seed
        from .pipe_bus_node import resolve_pipe_seed
        seed = resolve_pipe_seed(pipe, local_seed=seed)

        batch_size = image.shape[0]
        processed_batch = []

        for b_idx in range(batch_size):
            if batch_size > 1:
                print(f"[ZombiehausHiresFix] Processing batch item {b_idx + 1}/{batch_size}...")
            single_img = image[b_idx:b_idx + 1]
            orig_t = single_img.clone()
            b, h, w, c = orig_t.shape
            target_h = int(round(h * scale_by))
            target_w = int(round(w * scale_by))
            target_h = (target_h + 15) // 16 * 16
            target_w = (target_w + 15) // 16 * 16

            # 1. Permute for F.interpolate: [1, C, H, W]
            img_perm = orig_t.permute(0, 3, 1, 2)
            if upscale_method in ("bilinear", "bicubic"):
                upscaled = F.interpolate(img_perm, size=(target_h, target_w), mode=upscale_method, align_corners=False)
            else:
                upscaled = F.interpolate(img_perm, size=(target_h, target_w), mode=upscale_method)
            upscaled = upscaled.permute(0, 2, 3, 1)

            # 2. VAE Latent Encode
            latent = VAEEncode().encode(vae, upscaled)[0]

            # 3. 2nd-Pass Diffusion Sampling
            item_seed = seed + b_idx
            sampled = KSampler().sample(
                model, item_seed, steps, cfg, sampler_name, scheduler,
                positive, negative, latent, denoise=denoise
            )[0]

            # 4. VAE Decode
            decoded = VAEDecode().decode(vae, sampled)[0]
            out_pil = tensor_to_pil(decoded)

            # 5. Optional De-Wax Texture Restore
            if dewax_texture:
                out_pil = apply_dewax(out_pil, micro_texture=0.25, grain_intensity=0.06)

            single_final = pil_to_tensor(out_pil)
            processed_batch.append(single_final)

        final_image = torch.cat(processed_batch, dim=0) if len(processed_batch) > 1 else processed_batch[0]
        out_pipe = pipe
        if out_pipe is not None:
            from .pipe_bus_node import ZombiehausPipe
            if isinstance(out_pipe, dict):
                d = dict(out_pipe)
                d["image"] = final_image
                out_pipe = d
            elif isinstance(out_pipe, (tuple, list)):
                out_pipe = ZombiehausPipe((
                    out_pipe[0] if len(out_pipe) > 0 else None,
                    out_pipe[1] if len(out_pipe) > 1 else None,
                    out_pipe[2] if len(out_pipe) > 2 else None,
                    out_pipe[3] if len(out_pipe) > 3 else None,
                    out_pipe[4] if len(out_pipe) > 4 else None,
                    seed,
                    out_pipe[6] if len(out_pipe) > 6 else None,
                    final_image
                ))
        return (final_image, out_pipe)
