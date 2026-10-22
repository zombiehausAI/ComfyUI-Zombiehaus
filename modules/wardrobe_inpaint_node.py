"""
Zombiehaus Wardrobe Inpaint Node

Provides targeted garment segmentation and virtual try-on / outfit replacement:
- Semantic clothing segmentation using HuggingFace 'mattmdjaga/segformer_b2_clothes' (ATR 18 classes).
- Presets: all_garments, torso, lower, full_outfit, shoes.
- Mask dilation (grow) and Gaussian feathering (blur) for seamless boundary blending.
- Clean latent inpainting using VAEEncodeForInpaint + KSampler (neutralizes old fabric textures,
  unlike VAEEncode / detail_region which retain underlying patterns).
- Supports direct MODEL / VAE / CONDITIONING inputs or Zombiehaus PIPE.
"""

import math
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image, ImageFilter
import comfy.samplers
from nodes import VAEEncodeForInpaint, KSampler, VAEDecode

try:
    from transformers import AutoImageProcessor, AutoModelForSemanticSegmentation
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


# ATR Dataset 18 class taxonomy
ATR_CLASSES = {
    0: "Background",
    1: "Hat",
    2: "Hair",
    3: "Sunglasses",
    4: "Upper-clothes",
    5: "Skirt",
    6: "Pants",
    7: "Dress",
    8: "Belt",
    9: "Left-shoe",
    10: "Right-shoe",
    11: "Face",
    12: "Left-leg",
    13: "Right-leg",
    14: "Left-arm",
    15: "Right-arm",
    16: "Bag",
    17: "Scarf",
}

# Presets mapping to ATR class indices
CLOTHING_PRESETS = {
    "all_garments": [1, 4, 5, 6, 7, 8, 9, 10, 16, 17],
    "torso": [4, 7, 17],
    "lower": [5, 6, 8],
    "lower_and_legs": [5, 6, 8, 12, 13],  # Required when transforming shorts to skirt or dress
    "full_outfit": [4, 5, 6, 7, 8, 17],
    "full_outfit_and_limbs": [4, 5, 6, 7, 8, 12, 13, 14, 15, 17],
    "shoes": [9, 10],
}

# Global SegFormer model cache
_SEGFORMER_CACHE = {
    "processor": None,
    "model": None,
    "device": None,
}


def load_segformer():
    """Load or retrieve cached SegFormer clothing segmentation model."""
    if not TRANSFORMERS_AVAILABLE:
        raise RuntimeError(
            "[ZombiehausWardrobeInpaint] The 'transformers' library is required. "
            "Please install it with: pip install transformers"
        )

    global _SEGFORMER_CACHE
    device = "cuda" if torch.cuda.is_available() else "cpu"
    try:
        import comfy.model_management
        device = comfy.model_management.get_torch_device()
    except Exception:
        pass

    device_str = str(device)
    if _SEGFORMER_CACHE["model"] is None or _SEGFORMER_CACHE["device"] != device_str:
        model_name = "mattmdjaga/segformer_b2_clothes"
        processor = AutoImageProcessor.from_pretrained(model_name)
        model = AutoModelForSemanticSegmentation.from_pretrained(model_name)
        model.to(device)
        model.eval()
        _SEGFORMER_CACHE["processor"] = processor
        _SEGFORMER_CACHE["model"] = model
        _SEGFORMER_CACHE["device"] = device_str

    return _SEGFORMER_CACHE["processor"], _SEGFORMER_CACHE["model"], _SEGFORMER_CACHE["device"]


def tensor_to_pil(tensor: torch.Tensor) -> Image.Image:
    """Convert a [1, H, W, C] or [H, W, C] float tensor to PIL RGB."""
    if tensor.ndim == 4:
        tensor = tensor[0]
    arr = (tensor.detach().cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def pil_to_tensor(img: Image.Image) -> torch.Tensor:
    """Convert PIL RGB image to a [1, H, W, C] float32 tensor in [0, 1]."""
    arr = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0)


def mask_to_tensor(mask_pil: Image.Image) -> torch.Tensor:
    """Convert PIL grayscale mask to a [1, H, W] float32 tensor in [0, 1]."""
    arr = np.array(mask_pil.convert("L")).astype(np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0)


def grow_mask_pil(mask_pil: Image.Image, grow_pixels: int) -> Image.Image:
    """Dilation/erosion of mask using PIL MaxFilter/MinFilter."""
    if grow_pixels > 0:
        k_size = grow_pixels * 2 + 1
        return mask_pil.filter(ImageFilter.MaxFilter(k_size))
    elif grow_pixels < 0:
        k_size = abs(grow_pixels) * 2 + 1
        return mask_pil.filter(ImageFilter.MinFilter(k_size))
    return mask_pil


def blur_mask_pil(mask_pil: Image.Image, blur_radius: int) -> Image.Image:
    """Gaussian feathering of mask edges."""
    if blur_radius > 0:
        return mask_pil.filter(ImageFilter.GaussianBlur(blur_radius))
    return mask_pil


@torch.inference_mode()
def segment_garments(pil_img: Image.Image, target_classes: list) -> Image.Image:
    """Run SegFormer cloth segmentation on a PIL image and return a binary PIL mask."""
    processor, model, device = load_segformer()
    inputs = processor(images=pil_img, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}
    outputs = model(**inputs)
    logits = outputs.logits  # [1, 18, H_f, W_f]

    orig_w, orig_h = pil_img.size
    upsampled_logits = F.interpolate(
        logits,
        size=(orig_h, orig_w),
        mode="bilinear",
        align_corners=False,
    )
    pred_seg = upsampled_logits.argmax(dim=1)[0].cpu().numpy()

    mask_np = np.isin(pred_seg, target_classes).astype(np.uint8) * 255
    return Image.fromarray(mask_np, mode="L")


class ZombiehausWardrobeInpaint:
    """
    Virtual Try-On and Outfit Replacement Node.
    Segments clothing via SegFormer (ATR classes) and cleanly inpaints new garments
    using VAEEncodeForInpaint + KSampler.
    """

    @classmethod
    def INPUT_TYPES(cls):
        samplers = comfy.samplers.KSampler.SAMPLERS
        schedulers = comfy.samplers.KSampler.SCHEDULERS
        default_sampler = "euler" if "euler" in samplers else samplers[0]
        default_scheduler = "normal" if "normal" in schedulers else schedulers[0]

        return {
            "required": {
                "image": ("IMAGE",),
                "preset": (
                    [
                        "all_garments",
                        "torso",
                        "lower",
                        "lower_and_legs",
                        "full_outfit",
                        "full_outfit_and_limbs",
                        "shoes",
                    ],
                    {"default": "all_garments"},
                ),
                "grow_mask": ("INT", {"default": 16, "min": -64, "max": 128, "step": 1}),
                "blur_mask": ("INT", {"default": 8, "min": 0, "max": 64, "step": 1}),
                "do_inpaint": ("BOOLEAN", {"default": True}),
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                "steps": ("INT", {"default": 20, "min": 1, "max": 100, "step": 1}),
                "cfg": ("FLOAT", {"default": 7.0, "min": 1.0, "max": 30.0, "step": 0.5}),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                "sampler": (samplers, {"default": default_sampler}),
                "scheduler": (schedulers, {"default": default_scheduler}),
            },
            "optional": {
                "pipe": ("PIPE",),
                "model": ("MODEL",),
                "vae": ("VAE",),
                "positive": ("CONDITIONING",),
                "negative": ("CONDITIONING",),
            },
        }

    RETURN_TYPES = ("IMAGE", "MASK", "PIPE")
    RETURN_NAMES = ("image", "garment_mask", "pipe")
    FUNCTION = "inpaint"
    CATEGORY = "Zombiehaus/Image"

    def inpaint(self, image, preset, grow_mask, blur_mask, do_inpaint,
                seed, steps, cfg, denoise, sampler, scheduler,
                pipe=None, model=None, vae=None, positive=None, negative=None,
                **kwargs):

        target_classes = CLOTHING_PRESETS.get(preset, CLOTHING_PRESETS["all_garments"])
        sampler_name = kwargs.get("sampler_name", sampler)

        # 1. Segment garments and generate mask for each image in batch
        batch_size = image.shape[0]
        masks_binary = []
        masks_feathered = []

        for i in range(batch_size):
            pil_img = tensor_to_pil(image[i:i + 1])
            mask_pil = segment_garments(pil_img, target_classes)

            # Grow mask
            if grow_mask != 0:
                mask_pil = grow_mask_pil(mask_pil, grow_mask)

            masks_binary.append(mask_to_tensor(mask_pil))

            # Blur mask for smooth edge compositing
            if blur_mask > 0:
                mask_feathered = blur_mask_pil(mask_pil, blur_mask)
            else:
                mask_feathered = mask_pil

            masks_feathered.append(mask_to_tensor(mask_feathered))

        garment_mask_binary = torch.cat(masks_binary, dim=0)
        garment_mask = torch.cat(masks_feathered, dim=0)

        # If inpainting is disabled or no garment mask detected, return early
        if not do_inpaint or garment_mask_binary.max().item() == 0.0:
            if do_inpaint and garment_mask_binary.max().item() == 0.0:
                print(f"[ZombiehausWardrobeInpaint] No garment detected for preset '{preset}', skipping inpaint.")
            return (image, garment_mask, pipe)

        # 2. Resolve diffusion parameters from PIPE if not provided directly
        if pipe is not None:
            if isinstance(pipe, dict):
                model = model if model is not None else pipe.get("model")
                vae = vae if vae is not None else pipe.get("vae")
                positive = positive if positive is not None else pipe.get("positive")
                negative = negative if negative is not None else pipe.get("negative")
            else:
                model = model if model is not None else (pipe[0] if len(pipe) > 0 else None)
                vae = vae if vae is not None else (pipe[2] if len(pipe) > 2 else None)
                positive = positive if positive is not None else (pipe[3] if len(pipe) > 3 else None)
                negative = negative if negative is not None else (pipe[4] if len(pipe) > 4 else None)

        # Intelligent hybrid seed fallback: if seed == 0, adopt pipe seed
        from .pipe_bus_node import resolve_pipe_seed
        seed = resolve_pipe_seed(pipe, local_seed=seed)

        if model is None:
            raise ValueError(
                "[ZombiehausWardrobeInpaint] MODEL is required when do_inpaint is True. "
                "Provide via MODEL or PIPE input."
            )
        if vae is None:
            raise ValueError(
                "[ZombiehausWardrobeInpaint] VAE is required when do_inpaint is True. "
                "Provide via VAE or PIPE input."
            )
        if positive is None:
            raise ValueError(
                "[ZombiehausWardrobeInpaint] POSITIVE conditioning is required when do_inpaint is True. "
                "Provide via positive or PIPE input."
            )
        if negative is None:
            try:
                negative = [[torch.zeros_like(positive[0][0]), positive[0][1].copy()]]
            except Exception:
                raise ValueError(
                    "[ZombiehausWardrobeInpaint] NEGATIVE conditioning is required when do_inpaint is True."
                )

        if denoise < 0.85:
            print(
                f"[ZombiehausWardrobeInpaint] Note: denoise is set to {denoise:.2f}. "
                "For clothing type transformations (e.g. shorts -> skirt), denoise should normally "
                "be 1.00 (or >= 0.95) to prevent neutral gray wash / blurring."
            )

        # 3. Clean latent inpainting via VAEEncodeForInpaint + KSampler
        # Pass the crisp binary mask to VAEEncodeForInpaint so neutral gray fill and noise mask
        # are sharp and clean (feathered masks cause rounded noise_mask mismatches leaving gray smudges).
        latent_dict = VAEEncodeForInpaint().encode(vae, image, garment_mask_binary, grow_mask_by=0)[0]

        sampled_latent = KSampler().sample(
            model, seed, steps, cfg, sampler_name, scheduler,
            positive, negative, latent_dict, denoise=denoise
        )[0]

        decoded = VAEDecode().decode(vae, sampled_latent)[0]

        # 4. Composite decoded result back onto original image using the feathered mask for smooth edges
        if decoded.shape[1:] == image.shape[1:]:
            blend_m = garment_mask.unsqueeze(-1).to(image.device)
            final_image = image * (1.0 - blend_m) + decoded.to(image.device) * blend_m
        else:
            h_dec, w_dec = decoded.shape[1], decoded.shape[2]
            h_orig, w_orig = image.shape[1], image.shape[2]
            y_off = (h_orig - h_dec) // 2
            x_off = (w_orig - w_dec) // 2
            final_image = image.clone()
            sub_orig = image[:, y_off:y_off + h_dec, x_off:x_off + w_dec, :]
            sub_mask = garment_mask[:, y_off:y_off + h_dec, x_off:x_off + w_dec].unsqueeze(-1).to(image.device)
            blended_sub = sub_orig * (1.0 - sub_mask) + decoded.to(image.device) * sub_mask
            final_image[:, y_off:y_off + h_dec, x_off:x_off + w_dec, :] = blended_sub

        out_pipe = pipe
        if out_pipe is not None:
            from .pipe_bus_node import ZombiehausPipe
            if isinstance(out_pipe, dict):
                d = dict(out_pipe)
                d["image"] = final_image
                d["mask"] = garment_mask
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
                    final_image,
                    garment_mask,
                    out_pipe[9] if len(out_pipe) > 9 else "",
                    out_pipe[10] if len(out_pipe) > 10 else "",
                ))

        return (final_image, garment_mask, out_pipe)
