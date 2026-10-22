"""
Zombiehaus Script Studio Node

Consolidates the complete Multi-Persona Screenplay Director pipeline into a single, zero-wire studio node:
1. Model & LoRA Loader (Checkpoint or UNet/CLIP/VAE + scene & global LoRA slots)
2. Integrated Screenplay Director:
   - Direct screenplay script parsing: [SCENE], [PERSONA 1..N], [INTERACTION]
   - Spatial regional conditioning & overlapping attention masks
   - Dynamic per-persona LoRA application (e.g. $amanda.lora, $amber.lora)
   - Dynamic prompt expansion (wildcards, variables, styles)
3. 16-channel Chroma Latent generator with resolution presets
4. Timestep Shift (Flow-matching linear / cosine shift schedule)
5. Dynamic Guidance (Adaptive CFG scale curve)
6. Latent Sampling (KSampler diffusion loop + VAE decode)
7. Modular Feature Toggles:
   - Hires Fix (2nd-pass spatial upscale & re-sampling)
   - All-In-One Detailer (YOLO face, eyes, hands, body refinement)
   - De-Wax Texture Restore (Skin pore frequency separation & sensor grain)
   - Restormer (Neural image restoration / denoising)
   - Model Upscale (Spatial super-resolution)
"""

import os
import re
import math
import torch
import numpy as np
from PIL import Image, ImageFilter

import folder_paths
import comfy.samplers
from nodes import KSampler, VAEDecode, VAEEncode, CheckpointLoaderSimple, UNETLoader, CLIPLoader, VAELoader, LoraLoader

from .text_editor_node import ZombiehausTextEditor
from .scene_script_director_node import ZombiehausSceneScriptDirector
from .latent_preset_node import ZombiehausLatentPreset
from .chroma_shift_node import ZombiehausChromaShift
from .dynamic_guidance_node import ZombiehausDynamicGuidance
from .lora_loader_node import ZombiehausLoraLoader
from .studio_node import list_studio_profiles, load_profile_data


class ZombiehausScriptStudio:
    """
    All-In-One Screenplay Director Studio Node for multi-persona diffusion pipelines.
    Combines script editing, regional masks, persona LoRAs, and the complete generation stack into one node.
    """

    @classmethod
    def INPUT_TYPES(cls):
        checkpoints = ["None"] + folder_paths.get_filename_list("checkpoints")
        unets = ["None"] + folder_paths.get_filename_list("unet")
        clips = ["disabled"] + folder_paths.get_filename_list("text_encoders")
        vaes = ["None"] + folder_paths.get_filename_list("vae")
        loras = ["None"] + folder_paths.get_filename_list("loras")
        upscalers = ["None"] + folder_paths.get_filename_list("upscale_models")

        saved_prompts = ZombiehausTextEditor.get_saved_prompts()
        weight_modes = [
            "Translate for Chroma / Flux (Linguistic Emphasis)",
            "Pass-Through (SDXL / Pony)",
            "Front-Load Priority (Chroma / Flux)",
            "Strip Weights (Clean Tags)",
        ]

        resolution_presets = [
            "1024x1024 (Square)",
            "832x1216 (Portrait)",
            "1216x832 (Landscape)",
            "960x1280 (Portrait)",
            "1280x960 (Landscape)",
            "768x1152 (Portrait)",
            "1152x768 (Landscape)",
            "Manual",
        ]

        samplers = comfy.samplers.KSampler.SAMPLERS
        schedulers = comfy.samplers.KSampler.SCHEDULERS
        default_scheduler = "simple" if "simple" in schedulers else schedulers[0]
        profiles = list_studio_profiles()

        default_script = (
            "[SCENE]\n"
            "location: a sunlit luxury bedroom, white linen sheets, warm morning sunlight, authentic 35mm film photography, 8k\n"
            "negative: low quality, blurry, deformed, bad anatomy\n\n"
            "[PERSONA 1]\n"
            "position: left\n"
            "A beautiful woman with natural skin and soft lighting.\n\n"
            "[PERSONA 2]\n"
            "position: right\n"
            "A second beautiful woman standing close by.\n\n"
            "[INTERACTION]\n"
            "action: two women interacting intimately, bodies close, natural skin contact, warm ambient lighting\n"
            "contact_blend: 0.25"
        )

        return {
            "required": {
                # --- Model Profile Preset ---
                "profile": (profiles, {"default": profiles[0]}),

                # --- Model & Base LoRA Selection ---
                "checkpoint_name": (checkpoints, {"default": "None"}),
                "unet_name": (unets, {"default": "None"}),
                "weight_dtype": (["default", "fp8_e4m3fn", "fp8_e5m2", "fp16", "fp32", "bf16"], {"default": "default"}),
                "clip_name": (clips, {"default": "disabled"}),
                "clip_type": (["flux2", "chroma", "stable_diffusion", "sd3", "flux"], {"default": "flux2"}),
                "vae_name": (vaes, {"default": "None"}),
                "global_lora_name": (loras, {"default": "None"}),
                "global_lora_strength": ("FLOAT", {"default": 1.0, "min": -2.0, "max": 2.0, "step": 0.05}),

                # --- Screenplay Script & Presets ---
                "positive": ("STRING", {"default": default_script, "multiline": True}),
                "negative": ("STRING", {"default": "", "multiline": True}),
                "saved_prompt": (saved_prompts, {"default": saved_prompts[0] if saved_prompts else ""}),
                "weight_mode": (weight_modes, {"default": "Translate for Chroma / Flux (Linguistic Emphasis)"}),

                # --- Screenplay Director Tuning ---
                "default_lora_strength": ("FLOAT", {"default": 0.85, "min": 0.0, "max": 2.0, "step": 0.05}),
                "default_overlap_blend": ("FLOAT", {"default": 0.25, "min": 0.05, "max": 0.60, "step": 0.05}),

                # --- Latent & Dimensions ---
                "resolution": (resolution_presets, {"default": "1024x1024 (Square)"}),
                "width": ("INT", {"default": 1024, "min": 64, "max": 4096, "step": 16}),
                "height": ("INT", {"default": 1024, "min": 64, "max": 4096, "step": 16}),
                "batch_size": ("INT", {"default": 1, "min": 1, "max": 16, "step": 1}),
                "architecture": (["Chroma / Flux (16ch)", "SDXL / Pony (4ch)", "SD 1.5 (4ch)"], {"default": "Chroma / Flux (16ch)"}),

                # --- Sampler Settings ---
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff}),
                "steps": ("INT", {"default": 25, "min": 1, "max": 100, "step": 1}),
                "cfg": ("FLOAT", {"default": 3.5, "min": 0.0, "max": 30.0, "step": 0.1}),
                "sampler_name": (samplers, {"default": "euler"}),
                "scheduler": (schedulers, {"default": default_scheduler}),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                "chroma_shift": ("FLOAT", {"default": 3.0, "min": 0.0, "max": 10.0, "step": 0.05}),
                "dynamic_guidance": ("BOOLEAN", {"default": True}),

                # --- Modular Feature Toggles ---
                "enable_hires_fix": ("BOOLEAN", {"default": False}),
                "hires_scale": ("FLOAT", {"default": 1.5, "min": 1.0, "max": 4.0, "step": 0.1}),
                "hires_denoise": ("FLOAT", {"default": 0.45, "min": 0.05, "max": 1.0, "step": 0.05}),
                "hires_steps": ("INT", {"default": 15, "min": 1, "max": 50, "step": 1}),

                "enable_detailer": ("BOOLEAN", {"default": True}),
                "detailer_confidence": ("FLOAT", {"default": 0.35, "min": 0.1, "max": 0.9, "step": 0.05}),
                "detail_face": ("BOOLEAN", {"default": True}),
                "detail_eyes": ("BOOLEAN", {"default": True}),
                "detail_hands": ("BOOLEAN", {"default": False}),

                "enable_dewax": ("BOOLEAN", {"default": True}),
                "dewax_grain": ("FLOAT", {"default": 0.06, "min": 0.0, "max": 0.3, "step": 0.01}),
                "dewax_micro_texture": ("FLOAT", {"default": 0.25, "min": 0.0, "max": 1.0, "step": 0.05}),

                "enable_restormer": ("BOOLEAN", {"default": False}),
                "restormer_task": (["Real-World Image Denoising", "Defocus Deblurring", "Motion Deblurring"], {"default": "Real-World Image Denoising"}),

                "enable_upscale": ("BOOLEAN", {"default": False}),
                "upscale_model": (upscalers, {"default": "None"}),
                "upscale_factor": ("FLOAT", {"default": 2.0, "min": 1.0, "max": 4.0, "step": 0.25}),
            },
            "optional": {
                "pipe": ("PIPE",),
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "vae": ("VAE",),
                "latent_image": ("LATENT",),
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK", "LATENT", "PIPE", "STRING", "STRING")
    RETURN_NAMES = ("image", "persona_masks", "latent", "pipe", "resolved_script", "summary")
    FUNCTION = "generate_screenplay_image"
    CATEGORY = "Zombiehaus/Studio"
    OUTPUT_NODE = True

    def generate_screenplay_image(self,
                                  profile,
                                  checkpoint_name, unet_name, weight_dtype, clip_name, clip_type, vae_name,
                                  global_lora_name, global_lora_strength,
                                  positive, negative, saved_prompt, weight_mode,
                                  default_lora_strength, default_overlap_blend,
                                  resolution, width, height, batch_size, architecture,
                                  seed, steps, cfg, sampler_name, scheduler, denoise, chroma_shift, dynamic_guidance,
                                  enable_hires_fix, hires_scale, hires_denoise, hires_steps,
                                  enable_detailer, detailer_confidence, detail_face, detail_eyes, detail_hands,
                                  enable_dewax, dewax_grain, dewax_micro_texture,
                                  enable_restormer, restormer_task,
                                  enable_upscale, upscale_model, upscale_factor,
                                  pipe=None, model=None, clip=None, vae=None, latent_image=None):

        summary_logs = []
        summary_logs.append("=== Zombiehaus Script Studio Execution ===")

        # -------------------------------------------------------------
        # 0. Apply Profile Preset Overrides if Selected
        # -------------------------------------------------------------
        if profile and profile != "None (Manual)":
            p_data = load_profile_data(profile)
            if p_data:
                summary_logs.append(f"Profile: Loaded '{profile}' settings.")
                checkpoint_name = p_data.get("checkpoint_name", checkpoint_name)
                unet_name = p_data.get("unet_name", unet_name)
                weight_dtype = p_data.get("weight_dtype", weight_dtype)
                clip_name = p_data.get("clip_name", clip_name)
                clip_type = p_data.get("clip_type", clip_type)
                vae_name = p_data.get("vae_name", vae_name)
                architecture = p_data.get("architecture", architecture)
                chroma_shift = float(p_data.get("chroma_shift", chroma_shift))
                if "steps" in p_data and steps == 25:
                    steps = int(p_data["steps"])
                if "cfg" in p_data and abs(cfg - 3.5) < 1e-4:
                    cfg = float(p_data["cfg"])
                if "sampler_name" in p_data:
                    sampler_name = p_data["sampler_name"]
                if "scheduler" in p_data:
                    scheduler = p_data["scheduler"]

        # -------------------------------------------------------------
        # 1. Resolve Base Model, CLIP, and VAE (Overrides > Pipe > Loaders)
        # -------------------------------------------------------------
        if pipe is not None:
            if isinstance(pipe, dict):
                model = model or pipe.get("model")
                clip = clip or pipe.get("clip")
                vae = vae or pipe.get("vae")
            elif isinstance(pipe, (tuple, list)):
                model = model or (pipe[0] if len(pipe) > 0 else None)
                clip = clip or (pipe[1] if len(pipe) > 1 else None)
                vae = vae or (pipe[2] if len(pipe) > 2 else None)

        # Checkpoint Loader
        if model is None and checkpoint_name != "None":
            try:
                ckpt_loader = CheckpointLoaderSimple()
                c_model, c_clip, c_vae = ckpt_loader.load_checkpoint(checkpoint_name)
                model = c_model
                if clip is None:
                    clip = c_clip
                if vae is None:
                    vae = c_vae
                summary_logs.append(f"Model: Checkpoint '{checkpoint_name}' loaded.")
            except Exception as e:
                summary_logs.append(f"Model: Error loading checkpoint '{checkpoint_name}': {e}")

        # UNet Loader
        if model is None and unet_name != "None":
            try:
                u_loader = UNETLoader()
                u_model = u_loader.load_unet(unet_name, weight_dtype)[0]
                model = u_model
                summary_logs.append(f"Model: UNet '{unet_name}' ({weight_dtype}) loaded.")
            except Exception as e:
                summary_logs.append(f"Model: Error loading UNet '{unet_name}': {e}")

        # CLIP Loader
        if clip is None and clip_name != "disabled":
            try:
                cl_loader = CLIPLoader()
                clip = cl_loader.load_clip(clip_name, clip_type)[0]
                summary_logs.append(f"CLIP: '{clip_name}' ({clip_type}) loaded.")
            except Exception as e:
                summary_logs.append(f"CLIP: Error loading CLIP '{clip_name}': {e}")

        # VAE Loader
        if vae is None and vae_name != "None":
            try:
                v_loader = VAELoader()
                vae = v_loader.load_vae(vae_name)[0]
                summary_logs.append(f"VAE: '{vae_name}' loaded.")
            except Exception as e:
                summary_logs.append(f"VAE: Error loading VAE '{vae_name}': {e}")

        if model is None:
            raise ValueError("[ZombiehausScriptStudio] No MODEL provided! Select a Checkpoint/UNet or connect an input.")
        if clip is None:
            raise ValueError("[ZombiehausScriptStudio] No CLIP provided! Select a CLIP loader or connect an input.")
        if vae is None:
            raise ValueError("[ZombiehausScriptStudio] No VAE provided! Select a VAE loader or connect an input.")

        # Apply Global LoRA if specified
        if global_lora_name and global_lora_name != "None" and abs(global_lora_strength) > 0.001:
            loras_in_models = folder_paths.get_filename_list("loras")
            resolved_path = ZombiehausLoraLoader.find_lora_path(global_lora_name, loras_in_models)
            if resolved_path:
                try:
                    lora_loader = LoraLoader()
                    model, clip = lora_loader.load_lora(model, clip, resolved_path, global_lora_strength, global_lora_strength)
                    summary_logs.append(f"Global LoRA: '{os.path.basename(resolved_path)}' ({global_lora_strength}) applied.")
                except Exception as e:
                    summary_logs.append(f"Global LoRA: Error loading '{global_lora_name}': {e}")

        # -------------------------------------------------------------
        # 2. Dynamic Script Expansion via ZombiehausTextEditor
        # -------------------------------------------------------------
        editor = ZombiehausTextEditor()
        editor_res = editor.process_text(
            positive=positive,
            negative=negative,
            saved_prompt=saved_prompt,
            weight_mode=weight_mode,
            seed=seed,
            clip=clip,
            pipe=(model, clip, vae, [], [], seed)
        )
        resolved_script = editor_res[0]
        summary_logs.append(f"Screenplay: Script expanded ({len(resolved_script)} chars)")

        # -------------------------------------------------------------
        # 3. Screenplay Regional Conditioning & Persona LoRAs
        # -------------------------------------------------------------
        director = ZombiehausSceneScriptDirector()
        director_pipe = (model, clip, vae, [], [], seed)
        dir_res = director.direct_scene_script(
            pipe=director_pipe,
            script=resolved_script,
            default_lora_strength=default_lora_strength,
            default_overlap_blend=default_overlap_blend,
            mask_width=128,
            mask_height=128
        )
        out_pipe = dir_res[0]
        pos_cond = dir_res[1]
        neg_cond = dir_res[2]
        model = dir_res[3]
        persona_masks = dir_res[4]
        script_summary = dir_res[5]

        summary_logs.append(f"Director: Regional conditioning generated.")
        if script_summary:
            summary_logs.append(f"Director Breakdown:\n{script_summary}")

        # -------------------------------------------------------------
        # 4. Latent Creation (16-channel Chroma or 4-channel SDXL)
        # -------------------------------------------------------------
        if latent_image is not None:
            latent = latent_image
            summary_logs.append("Latent: Using external latent input.")
        else:
            latent_preset_node = ZombiehausLatentPreset()
            channels = 16 if "16ch" in architecture else 4
            latent, _ = latent_preset_node.create_latent(
                resolution=resolution,
                width=width,
                height=height,
                batch_size=batch_size,
                latent_channels=channels,
                downscale=8,
                architecture=architecture
            )
            lat_shape = latent["samples"].shape
            summary_logs.append(f"Latent: Created {lat_shape[2]*8}x{lat_shape[3]*8} ({channels} channels, batch {batch_size})")

        # -------------------------------------------------------------
        # 5. Chroma Timestep Shift & Dynamic Guidance
        # -------------------------------------------------------------
        if chroma_shift > 0.01:
            try:
                shift_node = ZombiehausChromaShift()
                model, _ = shift_node.apply_shift(
                    max_shift=1.15,
                    base_shift=0.5,
                    width=width,
                    height=height,
                    mode="Auto (from Latent / Image)",
                    fixed_shift=chroma_shift,
                    model=model,
                    latent=latent
                )
                summary_logs.append(f"Chroma Shift: Applied flow shift (factor {chroma_shift})")
            except Exception as e:
                summary_logs.append(f"Chroma Shift: Skipped ({e})")

        if dynamic_guidance:
            try:
                dg_node = ZombiehausDynamicGuidance()
                model, _ = dg_node.apply_dynamic_guidance(
                    scale_start=cfg,
                    scale_end=max(1.0, cfg * 0.5),
                    decay_power=1.0,
                    decay_profile="linear",
                    guidance_mode="CFG Scale (Chroma / SDXL / SD1.5)",
                    model=model
                )
                summary_logs.append("Dynamic Guidance: Active (adaptive CFG curve enabled)")
            except Exception as e:
                summary_logs.append(f"Dynamic Guidance: Skipped ({e})")

        # -------------------------------------------------------------
        # 6. Core Latent Sampling (KSampler)
        # -------------------------------------------------------------
        ksampler = KSampler()
        summary_logs.append(f"Sampler: Running {steps} steps ({sampler_name}/{scheduler}, CFG {cfg})...")
        sampled_latent = ksampler.sample(
            model=model,
            seed=seed,
            steps=steps,
            cfg=cfg,
            sampler_name=sampler_name,
            scheduler=scheduler,
            positive=pos_cond,
            negative=neg_cond,
            latent_image=latent,
            denoise=denoise
        )[0]

        # Decode base latent to pixel image
        vae_decode = VAEDecode()
        active_image = vae_decode.decode(samples=sampled_latent, vae=vae)[0]
        summary_logs.append("VAE: Decoded base latent to pixel image.")

        # -------------------------------------------------------------
        # 7. Modular Stage: Hires Fix
        # -------------------------------------------------------------
        if enable_hires_fix and hires_scale > 1.01:
            try:
                summary_logs.append(f"Hires Fix: Scaling x{hires_scale} ({hires_steps} steps, denoise {hires_denoise})...")
                b, h, w, c = active_image.shape
                new_h = int(round(h * hires_scale / 16.0)) * 16
                new_w = int(round(w * hires_scale / 16.0)) * 16

                # Bilinear upscale
                img_perm = active_image.permute(0, 3, 1, 2)
                upscaled_t = torch.nn.functional.interpolate(img_perm, size=(new_h, new_w), mode="bilinear", align_corners=False)
                active_image = upscaled_t.permute(0, 2, 3, 1)

                # Re-encode and sample 2nd pass
                vae_enc = VAEEncode()
                hires_latent = vae_enc.encode(pixels=active_image, vae=vae)[0]
                hires_sampled = ksampler.sample(
                    model=model,
                    seed=seed + 1,
                    steps=hires_steps,
                    cfg=max(1.5, cfg * 0.8),
                    sampler_name=sampler_name,
                    scheduler=scheduler,
                    positive=pos_cond,
                    negative=neg_cond,
                    latent_image=hires_latent,
                    denoise=hires_denoise
                )[0]
                active_image = vae_decode.decode(samples=hires_sampled, vae=vae)[0]
                sampled_latent = hires_sampled
                summary_logs.append("Hires Fix: Completed successfully.")
            except Exception as e:
                summary_logs.append(f"Hires Fix: Failed with error: {e}")

        # -------------------------------------------------------------
        # 8. Modular Stage: All-In-One Detailer (YOLO face/eyes/hands)
        # -------------------------------------------------------------
        if enable_detailer:
            try:
                from .allinone_detailer_node import ZombiehausAllInOneDetailer
                detailer = ZombiehausAllInOneDetailer()

                # Build automatic slots based on toggles
                slots_kwargs = {}
                slot_idx = 1
                if detail_face:
                    slots_kwargs[f"slot_{slot_idx}"] = {
                        "enabled": True, "label": "face", "detector_model": "face_yolov8m.pt",
                        "denoise": 0.35, "steps": 15, "feather": 16, "drop_size": 10, "guide_size": 512
                    }
                    slot_idx += 1
                if detail_eyes:
                    slots_kwargs[f"slot_{slot_idx}"] = {
                        "enabled": True, "label": "eyes", "detector_model": "eyes_yolov8n.pt",
                        "denoise": 0.25, "steps": 12, "feather": 12, "drop_size": 10, "guide_size": 512
                    }
                    slot_idx += 1
                if detail_hands:
                    slots_kwargs[f"slot_{slot_idx}"] = {
                        "enabled": True, "label": "hands", "detector_model": "hand_yolov8s.pt",
                        "denoise": 0.35, "steps": 15, "feather": 16, "drop_size": 10, "guide_size": 512
                    }
                    slot_idx += 1

                if slots_kwargs:
                    summary_logs.append(f"Detailer: Running YOLO passes ({list(slots_kwargs.keys())})...")
                    det_res = detailer.detail(
                        confidence=detailer_confidence,
                        image=active_image,
                        model=model,
                        clip=clip,
                        vae=vae,
                        positive=pos_cond,
                        negative=neg_cond,
                        seed=seed,
                        **slots_kwargs
                    )
                    active_image = det_res[0]
                    summary_logs.append("Detailer: Completed successfully.")
            except Exception as e:
                summary_logs.append(f"Detailer: Skipped ({e})")

        # -------------------------------------------------------------
        # 9. Modular Stage: De-Wax Texture Restore
        # -------------------------------------------------------------
        if enable_dewax:
            try:
                summary_logs.append(f"De-Wax: Restoring skin microtexture ({dewax_micro_texture}) and film grain ({dewax_grain})...")
                batch_arr = (active_image.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
                processed_tensors = []

                for b in range(batch_arr.shape[0]):
                    pil_img = Image.fromarray(batch_arr[b], "RGB")
                    arr = np.array(pil_img).astype(np.float32)
                    blurred = pil_img.filter(ImageFilter.GaussianBlur(radius=2))
                    blurred_arr = np.array(blurred).astype(np.float32)

                    # Frequency separation high-pass
                    high_freq = arr - blurred_arr
                    restored = arr + high_freq * dewax_micro_texture

                    # Sensor grain in midtones
                    if dewax_grain > 0.005:
                        h_p, w_p, _ = arr.shape
                        noise = np.random.normal(0, dewax_grain * 255.0, (h_p, w_p, 1))
                        lum = 0.2126 * arr[:, :, 0] + 0.7152 * arr[:, :, 1] + 0.0722 * arr[:, :, 2]
                        midtones = np.sin(np.clip(lum / 255.0, 0, 1) * np.pi)[:, :, np.newaxis]
                        restored = restored + noise * midtones

                    out_pil = Image.fromarray(np.clip(restored, 0, 255).astype(np.uint8), "RGB")
                    processed_tensors.append(torch.from_numpy(np.array(out_pil).astype(np.float32) / 255.0))

                active_image = torch.stack(processed_tensors, dim=0)
                summary_logs.append("De-Wax: Completed successfully.")
            except Exception as e:
                summary_logs.append(f"De-Wax: Skipped ({e})")

        # -------------------------------------------------------------
        # 10. Modular Stage: Restormer Restoration Pass
        # -------------------------------------------------------------
        if enable_restormer:
            try:
                from .restormer_node import ZombiehausRestormer
                summary_logs.append(f"Restormer: Running '{restormer_task}' neural restoration...")
                restormer_node = ZombiehausRestormer()
                res_out = restormer_node.restore(image=active_image, task=restormer_task, blend=1.0)
                active_image = res_out[0]
                summary_logs.append("Restormer: Completed successfully.")
            except Exception as e:
                summary_logs.append(f"Restormer: Skipped ({e})")

        # -------------------------------------------------------------
        # 11. Modular Stage: Model Super-Resolution Upscale
        # -------------------------------------------------------------
        if enable_upscale and upscale_model != "None":
            try:
                from .model_upscale_node import ZombiehausModelUpscale
                summary_logs.append(f"Model Upscale: Applying '{upscale_model}' (scale {upscale_factor})...")
                upscaler_node = ZombiehausModelUpscale()
                up_res = upscaler_node.upscale_and_rescale(
                    image=active_image,
                    upscale_model=upscale_model,
                    scale_factor=upscale_factor,
                    tile_size=512,
                    tile_overlap=32,
                    rescale_method="lanczos",
                    save_upscaled=False
                )
                active_image = up_res[0]
                summary_logs.append("Model Upscale: Completed successfully.")
            except Exception as e:
                summary_logs.append(f"Model Upscale: Skipped ({e})")

        # -------------------------------------------------------------
        # 12. Final Pipe & Summary Compilation
        # -------------------------------------------------------------
        final_pipe = (model, clip, vae, pos_cond, neg_cond, seed, sampled_latent, active_image)
        final_summary = "\n".join(summary_logs)

        return (active_image, persona_masks, sampled_latent, final_pipe, resolved_script, final_summary)
