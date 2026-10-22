"""
Zombiehaus Latent & Mask Tools

Provides:
- ZombiehausLatentUpscale: Latent upscaling for 2-pass hires-fix with PIPE support.
- ZombiehausMaskTools: Mask feathering, dilation/erosion, and inversion for inpainting.
"""

import torch
import torch.nn.functional as F
import numpy as np


class ZombiehausLatentUpscale:
    """
    Upscale latent tensors by multiplier (e.g. 1.25x, 1.5x, 2.0x) for 2-pass Hires Fix.
    """
    @classmethod
    def INPUT_TYPES(cls):
        methods = ["nearest-exact", "bilinear", "area", "bicubic", "bislerp"]
        return {
            "required": {
                "upscale_method": (methods, {"default": "bicubic"}),
                "scale_by": ("FLOAT", {"default": 1.5, "min": 0.1, "max": 8.0, "step": 0.05}),
            },
            "optional": {
                "samples": ("LATENT",),
                "pipe": ("PIPE",),
            }
        }

    RETURN_TYPES = ("LATENT", "INT", "INT", "PIPE")
    RETURN_NAMES = ("latent", "width", "height", "pipe")
    FUNCTION = "upscale"
    CATEGORY = "Zombiehaus/Latent"

    def upscale(self, upscale_method, scale_by, samples=None, pipe=None):
        if samples is None and pipe is not None:
            samples = pipe.get("latent") if isinstance(pipe, dict) else (pipe[6] if len(pipe) > 6 else None)
        if samples is None:
            raise ValueError("[ZombiehausLatentUpscale] SAMPLES is required (provide via samples input or pipe)")

        s = samples["samples"].clone()
        _, _, h, w = s.shape

        target_h = int(round(h * scale_by))
        target_w = int(round(w * scale_by))

        # Ensure spatial dimensions align to 2 for DiT / Flux patchify
        target_h = (target_h // 2) * 2
        target_w = (target_w // 2) * 2

        if upscale_method == "bislerp":
            try:
                import comfy.utils
                s = comfy.utils.bislerp(s, target_w, target_h)
            except Exception:
                s = F.interpolate(s, size=(target_h, target_w), mode="bicubic", align_corners=False)
        elif upscale_method in ("bilinear", "bicubic"):
            s = F.interpolate(s, size=(target_h, target_w), mode=upscale_method, align_corners=False)
        else:
            s = F.interpolate(s, size=(target_h, target_w), mode=upscale_method)

        pixel_w = target_w * 8
        pixel_h = target_h * 8

        out_latent = {"samples": s, "width": pixel_w, "height": pixel_h}

        out_pipe = pipe
        if out_pipe is not None:
            from .pipe_bus_node import ZombiehausPipe
            if isinstance(out_pipe, dict):
                d = dict(out_pipe)
                d["latent"] = out_latent
                out_pipe = d
            elif isinstance(out_pipe, (tuple, list)):
                out_pipe = ZombiehausPipe((
                    out_pipe[0] if len(out_pipe) > 0 else None,
                    out_pipe[1] if len(out_pipe) > 1 else None,
                    out_pipe[2] if len(out_pipe) > 2 else None,
                    out_pipe[3] if len(out_pipe) > 3 else None,
                    out_pipe[4] if len(out_pipe) > 4 else None,
                    out_pipe[5] if len(out_pipe) > 5 else None,
                    out_latent,
                    out_pipe[7] if len(out_pipe) > 7 else None,
                    out_pipe[8] if len(out_pipe) > 8 else None,
                    out_pipe[9] if len(out_pipe) > 9 else "",
                    out_pipe[10] if len(out_pipe) > 10 else "",
                ))

        return (out_latent, pixel_w, pixel_h, out_pipe)


class ZombiehausMaskTools:
    """
    Refine inpainting masks with grow/shrink, blur/feathering, and inversion.
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "grow_shrink": ("INT", {"default": 0, "min": -256, "max": 256, "step": 1}),
                "blur_radius": ("INT", {"default": 8, "min": 0, "max": 128, "step": 1}),
                "invert": ("BOOLEAN", {"default": False}),
            },
            "optional": {
                "mask": ("MASK",),
                "pipe": ("PIPE",),
            }
        }

    RETURN_TYPES = ("MASK", "IMAGE", "PIPE")
    RETURN_NAMES = ("mask", "preview_image", "pipe")
    FUNCTION = "process"
    CATEGORY = "Zombiehaus/Image"

    def process(self, grow_shrink, blur_radius, invert, mask=None, pipe=None):
        if mask is None and pipe is not None:
            mask = pipe.get("mask") if isinstance(pipe, dict) else (pipe[8] if len(pipe) > 8 else None)
        if mask is None:
            raise ValueError("[ZombiehausMaskTools] MASK is required (provide via mask input or pipe)")

        # mask shape: [B, H, W]
        m = mask.clone()

        if invert:
            m = 1.0 - m

        # Apply dilation / erosion (grow / shrink)
        if grow_shrink != 0:
            kernel_size = abs(grow_shrink) * 2 + 1
            pad = abs(grow_shrink)
            m_expanded = m.unsqueeze(1) # [B, 1, H, W]

            if grow_shrink > 0:
                # Dilation via max pooling
                m = F.max_pool2d(m_expanded, kernel_size=kernel_size, stride=1, padding=pad).squeeze(1)
            else:
                # Erosion via negated max pooling
                m = -F.max_pool2d(-m_expanded, kernel_size=kernel_size, stride=1, padding=pad).squeeze(1)

        # Apply Gaussian blur / feather
        if blur_radius > 0:
            k_size = blur_radius * 2 + 1
            sigma = max(0.1, blur_radius * 0.5)
            x = torch.arange(-blur_radius, blur_radius + 1, dtype=torch.float32, device=m.device)
            gauss_1d = torch.exp(-0.5 * (x / sigma) ** 2)
            gauss_1d = gauss_1d / gauss_1d.sum()
            kernel_2d = (gauss_1d[:, None] * gauss_1d[None, :]).unsqueeze(0).unsqueeze(0)

            m_in = m.unsqueeze(1)
            m = F.conv2d(m_in, kernel_2d, padding=blur_radius).squeeze(1)

        m = torch.clamp(m, 0.0, 1.0)
        # Create preview image [B, H, W, 3]
        preview = m.unsqueeze(-1).repeat(1, 1, 1, 3)

        out_pipe = pipe
        if out_pipe is not None:
            from .pipe_bus_node import ZombiehausPipe
            if isinstance(out_pipe, dict):
                d = dict(out_pipe)
                d["mask"] = m
                out_pipe = d
            elif isinstance(out_pipe, (tuple, list)):
                out_pipe = ZombiehausPipe((
                    out_pipe[0] if len(out_pipe) > 0 else None,
                    out_pipe[1] if len(out_pipe) > 1 else None,
                    out_pipe[2] if len(out_pipe) > 2 else None,
                    out_pipe[3] if len(out_pipe) > 3 else None,
                    out_pipe[4] if len(out_pipe) > 4 else None,
                    out_pipe[5] if len(out_pipe) > 5 else None,
                    out_pipe[6] if len(out_pipe) > 6 else None,
                    out_pipe[7] if len(out_pipe) > 7 else None,
                    m,
                    out_pipe[9] if len(out_pipe) > 9 else "",
                    out_pipe[10] if len(out_pipe) > 10 else "",
                ))

        return (m, preview, out_pipe)
