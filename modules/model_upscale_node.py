import os
import json
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
from PIL.PngImagePlugin import PngInfo
import folder_paths


class ZombiehausModelUpscale:
    """
    All-in-one Model Upscaler with tiled memory-safe inference and targeted resolution controls.
    Combines model loading (e.g. 4x-UltraSharp, Remacri), tiled neural inference to prevent
    VRAM exhaustion, and precision resizing (target longest side or scaling multiplier)
    with seamless pipe pass-through and pre-downscale disk saving.
    """

    @classmethod
    def INPUT_TYPES(cls):
        try:
            upscale_models = folder_paths.get_filename_list("upscale_models")
            upscale_models = ["None"] + sorted(upscale_models)
        except Exception:
            upscale_models = ["None"]

        methods = ["lanczos", "bicubic", "bilinear", "area", "nearest-exact"]
        modes = ["target", "tiled", "standard", "disabled"]

        return {
            "required": {
                "upscale_model_name": (upscale_models, {"default": upscale_models[0] if upscale_models else "None"}),
                "upscale_mode": (modes, {"default": "target"}),
                "target_size": ("INT", {"default": 2560, "min": 256, "max": 8192, "step": 64}),
                "downscale_enabled": ("BOOLEAN", {"default": True}),
                "scale_down_by": ("FLOAT", {"default": 0.5, "min": 0.05, "max": 2.0, "step": 0.05}),
                "rescale_method": (methods, {"default": "lanczos"}),
                "tile_size": ("INT", {"default": 512, "min": 256, "max": 2048, "step": 64}),
                "tile_overlap": ("INT", {"default": 32, "min": 16, "max": 256, "step": 16}),
            },
            "optional": {
                "image": ("IMAGE",),
                "pipe": ("PIPE",),
                "target_width": ("INT", {"default": 0, "min": 0, "max": 8192, "step": 64}),
                "target_height": ("INT", {"default": 0, "min": 0, "max": 8192, "step": 64}),
                "save_upscale": ("BOOLEAN", {"default": False, "label_on": "Save Upscale", "label_off": "Don't Save"}),
                "upscale_save_prefix": ("STRING", {"default": "Zombiehaus_Upscale"}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    RETURN_TYPES = ("IMAGE", "PIPE", "IMAGE",)
    RETURN_NAMES = ("image", "pipe", "upscaled_image",)
    FUNCTION = "upscale_and_rescale"
    CATEGORY = "Zombiehaus/Image"

    @staticmethod
    def _rescale_to_size(image: torch.Tensor, target_w: int, target_h: int, method: str) -> torch.Tensor:
        """Rescale tensor (B, H, W, C) to specific target_w, target_h using specified method."""
        B, H, W, C = image.shape
        new_h = max(1, int(round(target_h)))
        new_w = max(1, int(round(target_w)))

        if H == new_h and W == new_w:
            return image

        try:
            import comfy.utils
            img_ch = image.movedim(-1, 1)
            rescaled = comfy.utils.common_upscale(img_ch, new_w, new_h, method, "disabled")
            return rescaled.movedim(1, -1)
        except Exception:
            img_ch = image.permute(0, 3, 1, 2)
            torch_mode = "bicubic" if method in ("bicubic", "lanczos") else ("bilinear" if method == "bilinear" else ("area" if method == "area" else "nearest"))
            align_corners = torch_mode in ("bilinear", "bicubic")
            kwargs = {}
            if align_corners:
                kwargs["align_corners"] = False
            if torch_mode in ("bilinear", "bicubic"):
                kwargs["antialias"] = True
            rescaled = F.interpolate(img_ch, size=(new_h, new_w), mode=torch_mode, **kwargs)
            return rescaled.permute(0, 2, 3, 1).clamp(0.0, 1.0)

    @classmethod
    def _rescale_tensor(cls, image: torch.Tensor, scale: float, method: str) -> torch.Tensor:
        """Rescale tensor (B, H, W, C) by a multiplier using specified interpolation method."""
        if abs(scale - 1.0) < 1e-4 or scale <= 0.0:
            return image

        B, H, W, C = image.shape
        new_h = max(1, int(round(H * scale)))
        new_w = max(1, int(round(W * scale)))
        return cls._rescale_to_size(image, new_w, new_h, method)

    @classmethod
    def _upscale_tiled(cls, upscaler, model, image: torch.Tensor, tile_size: int = 512, tile_overlap: int = 32) -> torch.Tensor:
        """
        Runs neural model upscale in memory-safe overlapping tiles to prevent VRAM exhaustion.
        Blends overlapping boundaries smoothly with 2D linear ramps.
        """
        B, H, W, C = image.shape
        if H <= tile_size and W <= tile_size:
            return upscaler.upscale(model, image)[0]

        stride_y = max(16, tile_size - tile_overlap)
        stride_x = max(16, tile_size - tile_overlap)

        y_coords = []
        y = 0
        while y < H:
            actual_y = min(y, H - tile_size) if H >= tile_size else 0
            actual_h = min(tile_size, H)
            y_coords.append((actual_y, actual_h))
            if y + tile_size >= H:
                break
            y += stride_y

        x_coords = []
        x = 0
        while x < W:
            actual_x = min(x, W - tile_size) if W >= tile_size else 0
            actual_w = min(tile_size, W)
            x_coords.append((actual_x, actual_w))
            if x + tile_size >= W:
                break
            x += stride_x

        # First tile to measure model scale factor
        first_y, first_h = y_coords[0]
        first_x, first_w = x_coords[0]
        first_tile = image[:, first_y:first_y + first_h, first_x:first_x + first_w, :]
        first_up = upscaler.upscale(model, first_tile)[0]

        scale = first_up.shape[1] / float(first_h)
        out_h = int(round(H * scale))
        out_w = int(round(W * scale))

        output = torch.zeros((B, out_h, out_w, C), dtype=image.dtype, device=image.device)
        weights = torch.zeros((1, out_h, out_w, 1), dtype=torch.float32, device=image.device)

        ov_y = int(round(tile_overlap * scale))
        ov_x = int(round(tile_overlap * scale))

        for y_pos, h_t in y_coords:
            for x_pos, w_t in x_coords:
                if y_pos == first_y and x_pos == first_x:
                    up_tile = first_up
                else:
                    tile = image[:, y_pos:y_pos + h_t, x_pos:x_pos + w_t, :]
                    up_tile = upscaler.upscale(model, tile)[0]

                H_to = up_tile.shape[1]
                W_to = up_tile.shape[2]
                out_y = int(round(y_pos * scale))
                out_x = int(round(x_pos * scale))

                # Compute 2D linear feathering mask
                mask_y = torch.ones(H_to, dtype=torch.float32, device=image.device)
                if y_pos > 0 and ov_y > 0:
                    ramp_len = min(ov_y, H_to)
                    mask_y[:ramp_len] = torch.linspace(0.0, 1.0, ramp_len, device=image.device)
                if (y_pos + h_t) < H and ov_y > 0:
                    ramp_len = min(ov_y, H_to)
                    ramp = torch.linspace(1.0, 0.0, ramp_len, device=image.device)
                    mask_y[-ramp_len:] = torch.minimum(mask_y[-ramp_len:], ramp)

                mask_x = torch.ones(W_to, dtype=torch.float32, device=image.device)
                if x_pos > 0 and ov_x > 0:
                    ramp_len = min(ov_x, W_to)
                    mask_x[:ramp_len] = torch.linspace(0.0, 1.0, ramp_len, device=image.device)
                if (x_pos + w_t) < W and ov_x > 0:
                    ramp_len = min(ov_x, W_to)
                    ramp = torch.linspace(1.0, 0.0, ramp_len, device=image.device)
                    mask_x[-ramp_len:] = torch.minimum(mask_x[-ramp_len:], ramp)

                mask_2d = (mask_y.unsqueeze(1) * mask_x.unsqueeze(0)).unsqueeze(0).unsqueeze(-1)

                output[:, out_y:out_y + H_to, out_x:out_x + W_to, :] += (up_tile * mask_2d).to(output.dtype)
                weights[:, out_y:out_y + H_to, out_x:out_x + W_to, :] += mask_2d

        output = output / (weights + 1e-8)
        return output.clamp(0.0, 1.0)

    @staticmethod
    def _save_image_tensor(image_tensor: torch.Tensor, filename_prefix: str, prompt=None, extra_pnginfo=None):
        """Saves image tensor to output directory with metadata before downscaling."""
        output_dir = folder_paths.get_output_directory()
        prefix = filename_prefix if filename_prefix and filename_prefix.strip() else "Zombiehaus_Upscale"
        width = int(image_tensor.shape[2])
        height = int(image_tensor.shape[1])
        full_output_folder, filename, counter, subfolder, _ = folder_paths.get_save_image_path(prefix, output_dir, width, height)

        metadata = PngInfo()
        if prompt is not None:
            metadata.add_text("prompt", json.dumps(prompt))
        if extra_pnginfo is not None:
            for k, v in extra_pnginfo.items():
                metadata.add_text(k, json.dumps(v))

        for batch_number, img in enumerate(image_tensor):
            i = 255.0 * img.cpu().numpy()
            pil_img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            file = f"{filename}_{counter:05}_.png"
            file_path = os.path.join(full_output_folder, file)
            pil_img.save(file_path, pnginfo=metadata, compress_level=4)
            print(f"[ZombiehausModelUpscale] Saved pre-downscale upscale: {file_path}")
            counter += 1

    def upscale_and_rescale(self, upscale_model_name, upscale_mode="target",
                            target_size=2560, downscale_enabled=True, scale_down_by=0.5,
                            rescale_method="lanczos", tile_size=512, tile_overlap=32,
                            image=None, pipe=None, target_width=0, target_height=0,
                            save_upscale=False, upscale_save_prefix="Zombiehaus_Upscale",
                            upscale_enabled=None, prompt=None, extra_pnginfo=None, **kwargs):
        # Extract image from pipe if not provided directly
        if image is None and pipe is not None:
            image = pipe.get("image") if isinstance(pipe, dict) else (pipe[7] if len(pipe) > 7 else None)
        if image is None:
            raise ValueError("[ZombiehausModelUpscale] IMAGE is required (provide via image input or pipe)")

        current_img = image

        # Backward compatibility for workflows passing boolean upscale_enabled
        if upscale_enabled is not None:
            if not upscale_enabled:
                upscale_mode = "disabled"
            elif upscale_mode == "disabled":
                upscale_mode = "target"
        elif isinstance(upscale_mode, bool):
            upscale_mode = "target" if upscale_mode else "disabled"

        upscale_mode = str(upscale_mode).lower().strip()
        if upscale_mode not in ("target", "tiled", "standard", "disabled"):
            upscale_mode = "target"

        # 1. Model Upscale Preparation
        model = None
        upscaler = None
        if upscale_mode != "disabled" and upscale_model_name and upscale_model_name != "None":
            try:
                from comfy_extras.nodes_upscale_model import UpscaleModelLoader, ImageUpscaleWithModel
                loader = UpscaleModelLoader()
                model = loader.load_model(upscale_model_name)[0]
                upscaler = ImageUpscaleWithModel()
            except Exception as e:
                print(f"[ZombiehausModelUpscale] Upscale model warning: {e}. Falling back to input image.")

        batch_size = image.shape[0]
        out_current = []
        out_upscaled = []

        for b_idx in range(batch_size):
            if batch_size > 1:
                print(f"[ZombiehausModelUpscale] Processing batch item {b_idx + 1}/{batch_size}...")
            single_img = image[b_idx:b_idx + 1]
            cur_img = single_img

            if model is not None and upscaler is not None:
                try:
                    if upscale_mode == "standard":
                        cur_img = upscaler.upscale(model, single_img)[0]
                    else:
                        cur_img = self._upscale_tiled(upscaler, model, single_img, tile_size, tile_overlap)
                except Exception as e:
                    print(f"[ZombiehausModelUpscale] Item {b_idx + 1} upscale warning: {e}")
                    cur_img = single_img

            up_img = cur_img

            # Optional: Save raw upscale directly to disk before downscaling
            if save_upscale:
                try:
                    self._save_image_tensor(up_img, upscale_save_prefix, prompt, extra_pnginfo)
                except Exception as e:
                    print(f"[ZombiehausModelUpscale] Warning: Failed to save upscale: {e}")

            # 2. Rescale / Targeted Sizing Pass
            if downscale_enabled:
                if upscale_mode == "target":
                    if target_width > 0 and target_height > 0:
                        cur_img = self._rescale_to_size(cur_img, target_width, target_height, rescale_method)
                    else:
                        max_side = max(cur_img.shape[1], cur_img.shape[2])
                        if max_side > 0 and target_size > 0:
                            scale = target_size / float(max_side)
                            cur_img = self._rescale_tensor(cur_img, scale, rescale_method)
                elif upscale_mode in ("tiled", "standard"):
                    if scale_down_by > 0.0 and abs(scale_down_by - 1.0) > 1e-4:
                        cur_img = self._rescale_tensor(cur_img, scale_down_by, rescale_method)
                elif upscale_mode == "disabled":
                    if scale_down_by > 0.0 and abs(scale_down_by - 1.0) > 1e-4:
                        cur_img = self._rescale_tensor(cur_img, scale_down_by, rescale_method)

            out_current.append(cur_img)
            out_upscaled.append(up_img)

        final_current = torch.cat(out_current, dim=0) if len(out_current) > 1 else out_current[0]
        final_upscaled = torch.cat(out_upscaled, dim=0) if len(out_upscaled) > 1 else out_upscaled[0]

        out_pipe = pipe
        if out_pipe is not None:
            from .pipe_bus_node import ZombiehausPipe
            if isinstance(out_pipe, dict):
                d = dict(out_pipe)
                d["image"] = final_current
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
                    final_current
                ))

        return (final_current, out_pipe, final_upscaled)
