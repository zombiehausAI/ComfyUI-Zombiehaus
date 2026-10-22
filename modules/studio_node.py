"""
Zombiehaus Studio Profile Manager & Helper Module

Provides storage, listing, loading, and saving of model profiles
used by the standalone Zombiehaus Studio web application.
"""

import os
import json
import folder_paths


def get_studio_profiles_dir() -> str:
    """Resolve and ensure the directory where studio model profiles are stored."""
    # 1. ComfyUI user directory: ComfyUI/user/default/zombiehaus/profiles/
    try:
        user_dir = folder_paths.get_user_directory()
        if user_dir:
            p = os.path.join(user_dir, "default", "zombiehaus", "profiles")
            os.makedirs(p, exist_ok=True)
            return p
    except Exception:
        pass

    # 2. Prompts save directory fallback: saved_prompts/studio_profiles/
    try:
        from ..config import settings
        save_dir = settings.get("prompts_save_directory")
        if save_dir:
            p = os.path.join(save_dir, "studio_profiles")
            os.makedirs(p, exist_ok=True)
            return p
    except Exception:
        pass

    # 3. Local workspace fallback: ComfyUI-Zombiehaus/profiles/
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    p = os.path.join(base, "profiles")
    os.makedirs(p, exist_ok=True)
    return p


def list_studio_profiles() -> list[str]:
    """List available profile preset names."""
    profiles_dir = get_studio_profiles_dir()
    profiles = ["None (Manual)"]

    # Built-in defaults
    builtins = ["Chroma 1-HD Photoreal", "Flux.1 Dev Standard", "SDXL / Pony Anime"]
    for b in builtins:
        if b not in profiles:
            profiles.append(b)

    # User saved profiles from disk
    if os.path.isdir(profiles_dir):
        for f in sorted(os.listdir(profiles_dir)):
            if f.endswith(".json"):
                name = os.path.splitext(f)[0]
                if name not in profiles:
                    profiles.append(name)

    return profiles


def load_profile_data(name: str) -> dict:
    """Load profile JSON dictionary by name."""
    if not name or name == "None (Manual)":
        return {}

    # Check disk first
    p_dir = get_studio_profiles_dir()
    p_file = os.path.join(p_dir, f"{name}.json")
    if os.path.isfile(p_file):
        try:
            with open(p_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[ZombiehausStudio] Error reading profile {p_file}: {e}")

    # Built-in fallback definitions
    if name == "Chroma 1-HD Photoreal":
        return {
            "unet_name": "Chroma/Chroma1-HD.safetensors",
            "weight_dtype": "fp8_e4m3fn",
            "clip_name": "t5xxl_fp8_e4m3fn.safetensors",
            "clip_type": "flux2",
            "vae_name": "Chroma/ae.sft",
            "architecture": "Chroma / Flux (16ch)",
            "chroma_shift": 3.0,
            "steps": 25,
            "cfg": 3.5,
            "sampler_name": "euler",
            "scheduler": "simple"
        }
    elif name == "Flux.1 Dev Standard":
        return {
            "unet_name": "flux1-dev.safetensors",
            "weight_dtype": "fp8_e4m3fn",
            "clip_name": "t5xxl_fp8_e4m3fn.safetensors",
            "clip_type": "flux2",
            "vae_name": "ae.safetensors",
            "architecture": "Chroma / Flux (16ch)",
            "chroma_shift": 1.15,
            "steps": 25,
            "cfg": 3.5,
            "sampler_name": "euler",
            "scheduler": "simple"
        }
    elif name == "SDXL / Pony Anime":
        return {
            "checkpoint_name": "ponyDiffusionV6XL_v6StartWithThisOne.safetensors",
            "architecture": "SDXL / Pony (4ch)",
            "chroma_shift": 0.0,
            "steps": 30,
            "cfg": 7.0,
            "sampler_name": "euler_ancestral",
            "scheduler": "normal"
        }

    return {}
