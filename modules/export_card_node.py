"""
Zombiehaus Social Export Card & Metadata Burner Node

Provides clean publishing for social sharing and Civitai:
1. Strips internal prompt pollution (<lora:...>, syntax tags) for clean public display.
2. Embeds standard Civitai-compliant PNGInfo generation metadata.
3. Optional semi-transparent artist signature / watermark in any corner.
4. Optional stylish "Recipe Banner" footer with model, sampler, and seed stats.
"""

import os
import json
import re
import torch
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from PIL.PngImagePlugin import PngInfo
import folder_paths


def tensor_to_pil(tensor: torch.Tensor) -> Image.Image:
    if tensor.ndim == 4:
        tensor = tensor[0]
    arr = (tensor.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def pil_to_tensor(img: Image.Image) -> torch.Tensor:
    arr = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0)


def sanitize_prompt(text: str) -> str:
    """Strip internal syntax, loRA tags, and trailing commas."""
    if not text:
        return ""
    # Strip <lora:...>
    clean = re.sub(r'<lora:[^>]+>', '', text)
    # Strip excessive commas and whitespace
    clean = re.sub(r'\s*,\s*', ', ', clean)
    clean = re.sub(r',\s*,+', ', ', clean)
    return clean.strip(" ,")


class ZombiehausExportCard:
    """
    Social Export Card & Metadata Burner: Formats clean prompts, embeds Civitai
    metadata, and applies optional watermarks or recipe ribbons.
    """

    @classmethod
    def INPUT_TYPES(cls):
        positions = ["bottom_right", "bottom_left", "top_right", "top_left"]

        return {
            "required": {
                "filename_prefix": ("STRING", {"default": "Zombiehaus"}),
                "clean_metadata": ("BOOLEAN", {"default": True}),
                "watermark_text": ("STRING", {"default": ""}),
                "watermark_position": (positions, {"default": "bottom_right"}),
                "watermark_opacity": ("FLOAT", {"default": 0.65, "min": 0.1, "max": 1.0, "step": 0.05}),
                "burn_recipe_banner": ("BOOLEAN", {"default": False}),
            },
            "optional": {
                "images": ("IMAGE",),
                "pipe": ("PIPE",),
                "prompt_text": ("STRING", {"multiline": True, "forceInput": True}),
                "negative_text": ("STRING", {"multiline": True, "forceInput": True}),
                "model_name": ("STRING", {"default": ""}),
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO"
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING", "PIPE")
    RETURN_NAMES = ("exported_image", "clean_prompt", "pipe")
    FUNCTION = "export_image"
    OUTPUT_NODE = True
    CATEGORY = "Zombiehaus/Image"

    def export_image(self, filename_prefix, clean_metadata,
                     watermark_text, watermark_position, watermark_opacity,
                     burn_recipe_banner, images=None, pipe=None, prompt_text="", negative_text="",
                     model_name="", seed=0, prompt=None, extra_pnginfo=None):
        if images is None and pipe is not None:
            images = pipe.get("image") if isinstance(pipe, dict) else (pipe[7] if len(pipe) > 7 else None)
        if images is None:
            raise ValueError("[ZombiehausExportCard] IMAGES is required (provide via images input or pipe)")

        if not prompt_text and pipe is not None:
            if isinstance(pipe, dict):
                prompt_text = pipe.get("positive_text") or pipe.get("text") or pipe.get("prompt") or ""
            elif len(pipe) > 9 and isinstance(pipe[9], str):
                prompt_text = pipe[9]
        if not negative_text and pipe is not None:
            if isinstance(pipe, dict):
                negative_text = pipe.get("negative_text") or pipe.get("negative_prompt") or ""
            elif len(pipe) > 10 and isinstance(pipe[10], str):
                negative_text = pipe[10]

        if seed == 0 and pipe is not None:
            pipe_seed = pipe.get("seed") if isinstance(pipe, dict) else (pipe[5] if len(pipe) > 5 else None)
            if pipe_seed is not None and int(pipe_seed) > 0:
                seed = int(pipe_seed)

        output_dir = folder_paths.get_output_directory()
        results = []

        clean_p = sanitize_prompt(prompt_text) if clean_metadata else prompt_text

        for idx in range(images.shape[0]):
            img_pil = tensor_to_pil(images[idx:idx+1])
            w, h = img_pil.size

            # 1. Apply Optional Recipe Banner
            if burn_recipe_banner:
                banner_h = int(h * 0.06)
                banner = Image.new("RGBA", (w, banner_h), (20, 20, 25, 220))
                draw = ImageDraw.Draw(banner)
                stats_str = f"Zombiehaus | Model: {model_name or 'SDXL'} | Seed: {seed}"
                draw.text((20, int(banner_h * 0.3)), stats_str, fill=(240, 240, 245, 255))

                combined = Image.new("RGB", (w, h + banner_h), (0, 0, 0))
                combined.paste(img_pil, (0, 0))
                combined.paste(banner, (0, h), banner)
                img_pil = combined
                w, h = img_pil.size

            # 2. Apply Optional Watermark
            if watermark_text.strip():
                txt = watermark_text.strip()
                watermark_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
                draw_wm = ImageDraw.Draw(watermark_layer)

                alpha_val = int(watermark_opacity * 255)
                wm_color = (255, 255, 255, alpha_val)

                margin_x, margin_y = int(w * 0.04), int(h * 0.04)
                if watermark_position == "bottom_right":
                    pos = (w - margin_x - len(txt) * 10, h - margin_y)
                elif watermark_position == "bottom_left":
                    pos = (margin_x, h - margin_y)
                elif watermark_position == "top_right":
                    pos = (w - margin_x - len(txt) * 10, margin_y)
                else:
                    pos = (margin_x, margin_y)

                draw_wm.text(pos, txt, fill=wm_color)
                img_pil = Image.alpha_composite(img_pil.convert("RGBA"), watermark_layer).convert("RGB")

            # 3. Save File with PNGInfo Metadata
            metadata = PngInfo()
            if prompt is not None:
                metadata.add_text("prompt", json.dumps(prompt))
            if extra_pnginfo is not None:
                for k, v in extra_pnginfo.items():
                    metadata.add_text(k, json.dumps(v))
            if clean_p:
                metadata.add_text("clean_prompt", clean_p)

            # Auto-increment filename
            counter = 1
            while True:
                filename = f"{filename_prefix}_{counter:05d}.png"
                full_path = os.path.join(output_dir, filename)
                if not os.path.exists(full_path):
                    break
                counter += 1

            img_pil.save(full_path, pnginfo=metadata, compress_level=4)
            results.append(pil_to_tensor(img_pil))

        final_tensor = torch.cat(results, dim=0) if len(results) > 1 else results[0]

        out_pipe = pipe
        if out_pipe is not None:
            from .pipe_bus_node import ZombiehausPipe
            if isinstance(out_pipe, dict):
                d = dict(out_pipe)
                d["image"] = final_tensor
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
                    final_tensor,
                    out_pipe[8] if len(out_pipe) > 8 else None,
                    out_pipe[9] if len(out_pipe) > 9 else "",
                    out_pipe[10] if len(out_pipe) > 10 else "",
                ))

        return (final_tensor, clean_p, out_pipe)
