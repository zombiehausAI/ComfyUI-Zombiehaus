import torch
import numpy as np
from PIL import Image, ImageFilter

class ZombiehausSmartResizer:
    """
    Aspect Ratio and Smart Resizer for diffusion models (ChromaHD, Flux, SDXL, SD1.5, Wan).
    Ensures optimal dimensions, multiples of 16/64, with center, top, or padded fitting.
    """

    ASPECT_RATIOS = [
        "1:1 Square (1024x1024)",
        "16:9 Landscape (1344x768)",
        "9:16 Portrait / Story (768x1344)",
        "4:5 Social Portrait (896x1152)",
        "3:4 Classic Portrait (864x1152)",
        "4:3 Classic Landscape (1152x864)",
        "21:9 Cinema UltraWide (1536x640)",
        "Original Aspect Ratio",
        "Custom Resolution",
    ]

    FIT_MODES = [
        "Center Crop",
        "Top / Focus Crop",
        "Bottom Crop",
        "Pad (Black)",
        "Pad (Edge Replicate)",
        "Stretch",
    ]

    RES_PRESETS = [
        "1024 (Flux / ChromaHD / SDXL)",
        "768 (Mid-Res / SD2)",
        "512 (SD 1.5)",
    ]

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "aspect_ratio": (cls.ASPECT_RATIOS, {"default": "1:1 Square (1024x1024)"}),
                "fit_mode": (cls.FIT_MODES, {"default": "Center Crop"}),
                "target_base": (cls.RES_PRESETS, {"default": "1024 (Flux / ChromaHD / SDXL)"}),
                "multiple_of": ([16, 64, 8], {"default": 16}),
            },
            "optional": {
                "image": ("IMAGE",),
                "pipe": ("PIPE",),
                "custom_width": ("INT", {"default": 1024, "min": 64, "max": 8192, "step": 16}),
                "custom_height": ("INT", {"default": 1024, "min": 64, "max": 8192, "step": 16}),
            }
        }

    RETURN_TYPES = ("IMAGE", "PIPE", "INT", "INT", "STRING")
    RETURN_NAMES = ("image", "pipe", "width", "height", "aspect_ratio_str")
    FUNCTION = "resize_image"
    CATEGORY = "Zombiehaus/Utilities"

    def _get_target_dims(self, orig_w: int, orig_h: int, aspect_ratio: str, target_base_str: str, mult: int, custom_w: int, custom_h: int):
        base = 1024
        if "768" in target_base_str:
            base = 768
        elif "512" in target_base_str:
            base = 512

        ratio_map = {
            "1:1 Square (1024x1024)": (1, 1),
            "16:9 Landscape (1344x768)": (16, 9),
            "9:16 Portrait / Story (768x1344)": (9, 16),
            "4:5 Social Portrait (896x1152)": (4, 5),
            "3:4 Classic Portrait (864x1152)": (3, 4),
            "4:3 Classic Landscape (1152x864)": (4, 3),
            "21:9 Cinema UltraWide (1536x640)": (21, 9),
        }

        if aspect_ratio == "Custom Resolution":
            w = max(64, (custom_w // mult) * mult)
            h = max(64, (custom_h // mult) * mult)
            return w, h, f"{w}:{h}"

        if aspect_ratio == "Original Aspect Ratio":
            ar = orig_w / float(orig_h)
            # scale based on base total pixels ~ base * base
            total_px = base * base
            h = int(np.sqrt(total_px / ar))
            w = int(h * ar)
            w = max(64, (w // mult) * mult)
            h = max(64, (h // mult) * mult)
            return w, h, f"{orig_w}:{orig_h}"

        rw, rh = ratio_map.get(aspect_ratio, (1, 1))
        ar = rw / float(rh)
        total_px = base * base
        h = int(np.sqrt(total_px / ar))
        w = int(h * ar)
        w = max(64, (w // mult) * mult)
        h = max(64, (h // mult) * mult)
        return w, h, f"{rw}:{rh}"

    def resize_image(self, aspect_ratio: str, fit_mode: str, target_base: str, multiple_of: int,
                     image: torch.Tensor = None, pipe=None, custom_width: int = 1024, custom_height: int = 1024):
        if image is None and pipe is not None:
            image = pipe.get("image") if isinstance(pipe, dict) else (pipe[7] if len(pipe) > 7 else None)
        if image is None:
            raise ValueError("[ZombiehausSmartResizer] IMAGE is required (provide via image input or pipe)")

        # image is [B, H, W, C]
        b_size, in_h, in_w, in_c = image.shape
        out_w, out_h, ar_str = self._get_target_dims(in_w, in_h, aspect_ratio, target_base, multiple_of, custom_width, custom_height)

        out_tensors = []
        for b in range(b_size):
            img_np = (image[b].cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
            pil_img = Image.fromarray(img_np)

            if fit_mode == "Stretch":
                res = pil_img.resize((out_w, out_h), Image.Resampling.LANCZOS)

            elif fit_mode.startswith("Pad"):
                # Fit within out_w, out_h preserving aspect ratio
                in_ar = in_w / float(in_h)
                target_ar = out_w / float(out_h)

                if in_ar > target_ar:
                    # Width bound
                    scale_w = out_w
                    scale_h = max(1, int(out_w / in_ar))
                else:
                    scale_h = out_h
                    scale_w = max(1, int(out_h * in_ar))

                scaled = pil_img.resize((scale_w, scale_h), Image.Resampling.LANCZOS)
                canvas = Image.new("RGB", (out_w, out_h), (0, 0, 0))

                if fit_mode == "Pad (Edge Replicate)":
                    bg = pil_img.resize((out_w, out_h), Image.Resampling.BILINEAR)
                    bg = bg.filter(ImageFilter.GaussianBlur(16))
                    canvas.paste(bg, (0, 0))

                offset_x = (out_w - scale_w) // 2
                offset_y = (out_h - scale_h) // 2
                canvas.paste(scaled, (offset_x, offset_y))
                res = canvas

            else: # Crops
                # Scale so image covers out_w, out_h
                in_ar = in_w / float(in_h)
                target_ar = out_w / float(out_h)

                if in_ar > target_ar:
                    # Height bound
                    scale_h = out_h
                    scale_w = max(1, int(out_h * in_ar))
                else:
                    scale_w = out_w
                    scale_h = max(1, int(out_w / in_ar))

                scaled = pil_img.resize((scale_w, scale_h), Image.Resampling.LANCZOS)

                if fit_mode == "Top / Focus Crop":
                    crop_x = (scale_w - out_w) // 2
                    crop_y = 0
                elif fit_mode == "Bottom Crop":
                    crop_x = (scale_w - out_w) // 2
                    crop_y = scale_h - out_h
                else: # Center Crop
                    crop_x = (scale_w - out_w) // 2
                    crop_y = (scale_h - out_h) // 2

                res = scaled.crop((crop_x, crop_y, crop_x + out_w, crop_y + out_h))

            out_np = np.array(res).astype(np.float32) / 255.0
            out_tensors.append(torch.from_numpy(out_np))

        final_tensor = torch.stack(out_tensors, dim=0)

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

        return (final_tensor, out_pipe, out_w, out_h, ar_str)


class ZombiehausImageScaleDownBy:
    """
    Downscales image batch by a factor using high-quality Lanczos antialiasing.
    Direct drop-in replacement for easy imageScaleDownBy with full pipe support.
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "scale_by": (
                    "FLOAT",
                    {"default": 0.5, "min": 0.01, "max": 1.0, "step": 0.01},
                ),
            },
            "optional": {
                "images": ("IMAGE",),
                "pipe": ("PIPE",),
            }
        }

    RETURN_TYPES = ("IMAGE", "PIPE")
    RETURN_NAMES = ("images", "pipe")
    FUNCTION = "image_scale_down_by"
    CATEGORY = "Zombiehaus/Image"

    def image_scale_down_by(self, scale_by: float, images: torch.Tensor = None, pipe=None):
        if images is None and pipe is not None:
            images = pipe.get("image") if isinstance(pipe, dict) else (pipe[7] if len(pipe) > 7 else None)
        if images is None:
            raise ValueError("[ZombiehausImageScaleDownBy] IMAGES is required (provide via images input or pipe)")

        b_size, in_h, in_w, in_c = images.shape
        new_width = max(1, int(round(in_w * scale_by)))
        new_height = max(1, int(round(in_h * scale_by)))

        results = []
        for i in range(b_size):
            img_np = (images[i].cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
            pil_img = Image.fromarray(img_np)
            pil_img = pil_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            out_np = np.array(pil_img).astype(np.float32) / 255.0
            results.append(torch.from_numpy(out_np))

        final_images = torch.stack(results, dim=0)

        out_pipe = pipe
        if out_pipe is not None:
            from .pipe_bus_node import ZombiehausPipe
            if isinstance(out_pipe, dict):
                d = dict(out_pipe)
                d["image"] = final_images
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
                    final_images,
                    out_pipe[8] if len(out_pipe) > 8 else None,
                    out_pipe[9] if len(out_pipe) > 9 else "",
                    out_pipe[10] if len(out_pipe) > 10 else "",
                ))

        return (final_images, out_pipe)


NODE_CLASS_MAPPINGS = {
    "ZombiehausSmartResizer": ZombiehausSmartResizer,
    "ZombiehausImageScaleDownBy": ZombiehausImageScaleDownBy,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ZombiehausSmartResizer": "Zombiehaus Smart Resizer",
    "ZombiehausImageScaleDownBy": "Zombiehaus Image Scale Down By",
}

