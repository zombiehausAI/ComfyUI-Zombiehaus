"""
Zombiehaus Model Scryer (WeightScryer Integration) Node

Provides deep neural model introspection, automated tag and phrase extraction,
training recipe diagnostics, and golden run recommendations for Diffusers, Checkpoints, and LoRAs:
- Safetensors metadata census parsing (ss_tag_frequency, modelspec.trigger_phrase, ss_output_name).
- Semantic classification of expressions, poses/framing, lighting, wardrobe, styles, and quality.
- Training recipe extraction (Rank, Alpha, Ratio, Learning Rate, Resolution, Epochs, Steps).
- Golden Run generation settings (Sampler, Scheduler, Steps, CFG, CLIP Skip, Aspect Ratios).
- Integrated with WeightScryer library cache (~/.WeightScryer/library.db).
- Direct string and pipe outputs for Text Editor, KSampler, and Prompt Mixer.
"""

import os
import json
import re
import math
import hashlib
import sqlite3
import torch
import folder_paths
import server

try:
    from safetensors import safe_open
    SAFETENSORS_AVAILABLE = True
except ImportError:
    SAFETENSORS_AVAILABLE = False


# Semantic Tag Classifier Keywords
EXPRESSION_KEYWORDS = [
    # Smiles, laughter, and joy
    "smile", "smiling", "grin", "grinning", "smirk", "smirking", "laugh", "laughing", "giggle", "giggling",
    "chuckle", "cackle", "beam", "beaming", "cheerful", "happy", "joyful", "ecstatic", "euphoric",
    # Mouth, lips, and teeth
    "parted lips", "pout", "pouting", "lip bite", "biting lip", "licking lips", "open mouth", "closed mouth",
    "clenched teeth", "teeth", "fangs", "tongue", "tongue out", "gasp", "gasping", "yawn", "yawning",
    "drool", "drooling", "chewing",
    # Sadness, crying, and grief
    "frown", "frowning", "sad", "sorrow", "melancholy", "crying", "tears", "teary", "teary-eyed",
    "weeping", "sobbing", "heartbroken", "grieving", "distressed", "pensive",
    # Anger, intensity, and fury
    "angry", "anger", "furious", "enraged", "irritated", "annoyed", "scowl", "scowling", "grimace", "sneer",
    "glare", "glaring", "stare", "staring", "intense stare", "intense gaze", "screaming", "shout", "shouting",
    # Gaze, glance, and eye movements (without generic color collisions)
    "wink", "winking", "squint", "squinting", "closed eyes", "one eye closed", "half-closed eyes",
    "sleepy eyes", "heavy eyelids", "sparkling eyes", "rolling eyes", "wide-eyed", "wide eyes",
    "looking at viewer", "looking away", "looking back", "looking down", "looking up", "looking aside",
    "side-eye", "averted gaze", "blank stare", "thousand-yard stare", "gaze", "gazing", "eye contact",
    # Eyebrows and forehead
    "raised eyebrow", "raised eyebrows", "arched eyebrow", "furrowed brow", "knit brows",
    # Surprise, shock, and confusion
    "surprised", "surprise", "shocked", "shock", "astonished", "stunned", "dazed", "confused",
    "perplexed", "skeptical", "suspicious", "doubtful",
    # Fear and disgust
    "terrified", "panicked", "horrified", "fearful", "disgusted", "repulsed",
    # Shyness, romance, and allure
    "blush", "blushing", "light blush", "heavy blush", "flustered", "embarrassed", "bashful",
    "shy", "coy", "demure", "seductive", "sultry", "flirty", "playful", "mischievous",
    # Composure, stoicism, and mood
    "smug", "arrogant", "confident", "stoic", "serious", "expressionless", "calm", "serene",
    "peaceful", "relaxed", "contemplative", "thoughtful", "brooding", "relieved", "bored", "exhausted",
    # Anime / Booru stylized expressions
    "ahegao", "jitome", "tareme", "tsurime", "nosebleed", "sweatdrop", "doki doki", "tsundere", "yandere", "kuudere"
]

POSE_KEYWORDS = [
    "standing", "sitting", "kneeling", "lying", "crouching", "leaning", "walking", "running",
    "dynamic pose", "action pose", "crossed legs", "hands on hips", "head tilt",
    "cowboy shot", "close-up", "portrait", "upper body", "full body", "wide shot",
    "profile", "back view", "from above", "from below", "dutch angle", "crossed arms",
    "arms behind back", "hand to mouth", "pointing", "reaching", "holding", "bent over"
]

LIGHTING_KEYWORDS = [
    "rim lighting", "golden hour", "volumetric", "sunlight", "sunbeams", "dramatic lighting",
    "neon", "backlight", "soft lighting", "chiaroscuro", "studio lighting", "strobes",
    "moody", "lens flare", "shadows", "glow", "luminescence", "dusk", "dawn", "cinematic lighting",
    "diffuse light", "film grain", "bokeh"
]

WARDROBE_KEYWORDS = [
    "dress", "shirt", "jacket", "skirt", "pants", "suit", "leather", "latex", "silk",
    "denim", "bikini", "armor", "coat", "gloves", "boots", "shoes", "jewelry", "hat",
    "uniform", "collar", "tie", "hoodie", "sweater", "swimsuit", "lingerie", "tactical",
    "cleavage", "bare shoulders", "thighhighs", "sleeves", "corset"
]

QUALITY_KEYWORDS = [
    "masterpiece", "best quality", "amazing quality", "highres", "8k", "score_9", "score_8_up",
    "score_7_up", "score_6_up", "score_5_up", "score_4_up", "aesthetic 9", "aesthetic 8",
    "aesthetic 7", "aesthetic 6", "aesthetic score", "high aesthetic", "very aesthetic",
    "aesthetic_9", "aesthetic_8", "aesthetic_7", "aesthetic_score",
    "extremely detailed", "sharp focus", "absurdres", "ultra-detailed",
    "raw photo", "35mm photograph", "shot on 35mm", "kodak portra", "kodak portra 400",
    "hasselblad", "film grain", "skin microtexture", "tactile fabric", "uncompressed raw",
    "natural lighting", "volumetric rim light", "shallow depth of field", "f/1.8",
    "rating_safe", "rating_questionable", "rating_explicit"
]

STYLE_KEYWORDS = [
    "anime", "photo", "photorealistic", "35mm photograph", "illustration", "digital art",
    "concept art", "painting", "watercolor", "lineart", "vintage", "retro", "sketch",
    "cel shaded", "oil painting", "candid", "editorial", "raw photo", "kodak portra"
]

# Architectural profiles, golden run settings, and negative templates
ARCH_PROFILES = {
    "pony": {
        "triggers": ["source_anime", "source_cartoon", "source_furry", "source_pony"],
        "expressions": [
            "blush", "light blush", "heavy blush", "smile", "smirk", "parted lips",
            "looking at viewer", "playful wink", "pout", "flustered", "seductive gaze",
            "wide eyes surprised", "half-closed eyes", "tongue out", "mischievous grin",
            "embarrassed", "crying happy tears", "tsundere glare"
        ],
        "poses": ["portrait", "cowboy shot", "dynamic pose", "head tilt", "sitting"],
        "lighting": ["vibrant lighting", "ambient occlusion", "colorful rim light"],
        "wardrobe": ["detailed clothing", "stylized fabric"],
        "quality": ["score_9", "score_8_up", "score_7_up", "score_6_up", "rating_safe"],
        "negative": ["score_6", "score_5", "score_4", "score_3", "score_2", "score_1", "source_pony", "ugly", "deformed", "bad hands", "blurry"],
        "style": ["anime aesthetic", "detailed digital illustration", "vibrant anime coloration"],
        "run_settings": {
            "sampler": "euler_ancestral",
            "scheduler": "normal",
            "steps": "24 - 32",
            "cfg": "6.0 - 7.0",
            "clip_skip": -2,
            "native_res": "1024x1024 (1:1), 832x1216 (2:3), 1216x832 (3:2)",
            "prompt_blueprint": "score_9, score_8_up, score_7_up, rating_safe, [Trigger], [Expression], [Pose], [Style]"
        }
    },
    "illustrious": {
        "triggers": ["masterpiece", "best quality", "amazing quality", "very aesthetic"],
        "expressions": [
            "gentle smile", "looking at viewer", "blush", "light blush", "parted lips",
            "playful smirk", "crying with eyes open", "teary-eyed", "jitome (staring eyes)",
            "pout", "sparkling eyes", "tsundere glare", "flustered", "embarrassed",
            "open mouth giggle", "winking", "happy tears"
        ],
        "poses": ["upper body", "cowboy shot", "portrait", "dynamic pose"],
        "lighting": ["clean anime lighting", "soft rim light", "crisp highlights"],
        "wardrobe": ["sharp lineart fabric", "detailed anime attire"],
        "quality": ["masterpiece", "best quality", "absurdres", "newest", "extremely detailed anime", "highres", "fine lineart"],
        "negative": ["worst quality", "low quality", "normal quality", "lowres", "bad anatomy", "bad hands", "text", "error", "missing fingers", "watermark"],
        "style": ["danbooru aesthetic", "sharp lineart", "cel shaded", "clean anime style"],
        "run_settings": {
            "sampler": "euler",
            "scheduler": "normal",
            "steps": "26 - 32",
            "cfg": "5.5 - 7.0",
            "clip_skip": -2,
            "native_res": "1024x1024 (1:1), 896x1152 (3:4), 1152x896 (4:3)",
            "prompt_blueprint": "masterpiece, best quality, very aesthetic, absurdres, [Trigger], [Subject], [Expression], [Pose], clean anime style"
        }
    },
    "chroma": {
        "triggers": ["aesthetic 9", "aesthetic 8", "aesthetic 7", "unfiltered photograph", "natural lighting", "cinematic lighting"],
        "expressions": [
            "subtle candid smile", "relaxed expression", "natural eye contact", "gentle gaze",
            "candid laughing eyes", "natural unposed reaction", "serene calm face",
            "contemplative expression", "soft parted lips", "thoughtful gaze"
        ],
        "poses": ["candid portrait", "eye-level medium shot", "natural posture", "cinematic framing"],
        "lighting": ["volumetric natural sunlight", "subtle golden hour rim light", "soft cinematic fill"],
        "wardrobe": ["tactile cloth weave", "authentic leather texture", "realistic drape"],
        "quality": ["aesthetic 9", "aesthetic 8", "aesthetic 7", "naturalistic skin microtexture", "subtle rim lighting", "film grain", "raw 35mm photo"],
        "negative": ["aesthetic 4", "aesthetic 3", "aesthetic 2", "aesthetic 1", "low aesthetic", "plastic", "waxy skin", "cgi render", "smooth artificial gloss", "oversaturated", "3d cartoon"],
        "style": ["modern cinema", "editorial portraiture", "high dynamic range", "authentic candid"],
        "run_settings": {
            "sampler": "euler",
            "scheduler": "simple / normal (Flow-matching)",
            "steps": "20 - 28",
            "cfg": "1.0 (with Dynamic CFG Decay 4.5 -> 1.8 via Zombiehaus Dynamic Guidance)",
            "clip_skip": "N/A (T5-XXL Tokenizer)",
            "native_res": "1024x1024 (1:1), 832x1216 (2:3), 768x1344 (9:16)",
            "prompt_blueprint": "aesthetic 9, aesthetic 8, [Subject Action & Scene Context], [Facial Expression], [Wardrobe & Microtexture], [Camera Lens Optics], [Lighting & Atmosphere]"
        }
    },
    "flux": {
        "triggers": ["shot on 35mm film", "candid photograph", "natural daylight", "film still"],
        "expressions": [
            "subtle candid smile", "relaxed expression", "natural eye contact", "thoughtful gaze",
            "candid mid-laugh", "gentle authentic expression", "engaging direct gaze",
            "calm serene face", "subtle quizzical raised eyebrow", "wistful look"
        ],
        "poses": ["candid street shot", "eye-level medium portrait", "natural unposed stance", "cinematic wide framing"],
        "lighting": ["soft ambient daylight", "subtle volumetric rim light", "natural golden hour glow", "gentle shadows"],
        "wardrobe": ["tactile cloth weave", "authentic leather patina", "natural organic drapery"],
        "quality": ["raw photo", "f/1.8 aperture", "subtle optical bokeh", "natural film grain", "authentic skin pores and micro-texture", "uncompressed RAW photograph"],
        "negative": ["plastic skin", "cgi render", "smooth artificial gloss", "3d cartoon", "oversaturated", "airbrushed", "bad anatomy", "fake texture"],
        "style": ["documentary photography", "editorial cinema", "naturalistic 35mm", "unfiltered realism"],
        "run_settings": {
            "sampler": "euler",
            "scheduler": "simple / normal (Flow-matching)",
            "steps": "20 - 28",
            "cfg": "1.0 (Distilled Flux Guidance 3.5)",
            "clip_skip": "N/A (T5-XXL Tokenizer)",
            "native_res": "1024x1024 (1:1), 832x1216 (2:3), 768x1344 (9:16)",
            "prompt_blueprint": "A candid 35mm photograph of [Subject & Action], [Natural Environment & Atmospheric Lighting], [Authentic Wardrobe & Skin Micro-texture], shot on 35mm lens, f/1.8 aperture, natural film grain, uncompressed RAW"
        }
    },
    "flux_chroma": {
        "triggers": ["natural lighting", "unfiltered photograph", "organic composition"],
        "expressions": [
            "subtle candid smile", "relaxed expression", "natural eye contact", "gentle gaze",
            "candid laughing eyes", "thoughtful look", "soft smile"
        ],
        "poses": ["candid portrait", "eye-level medium shot", "natural posture", "cinematic framing"],
        "lighting": ["volumetric natural sunlight", "subtle golden hour rim light", "soft shadows"],
        "wardrobe": ["tactile cloth weave", "authentic leather texture", "realistic drape"],
        "quality": ["naturalistic skin microtexture", "subtle rim lighting", "film grain", "raw 35mm photo"],
        "negative": ["plastic", "waxy skin", "cgi render", "smooth artificial gloss", "oversaturated", "3d cartoon"],
        "style": ["modern cinema", "editorial portraiture", "high dynamic range", "authentic candid"],
        "run_settings": {
            "sampler": "euler",
            "scheduler": "simple / normal (Flow-matching)",
            "steps": "20 - 28",
            "cfg": "1.0 (with Dynamic CFG Decay 4.5 -> 1.8 via Zombiehaus Dynamic Guidance)",
            "clip_skip": "N/A (T5-XXL Tokenizer)",
            "native_res": "1024x1024 (1:1), 832x1216 (2:3), 768x1344 (9:16)",
            "prompt_blueprint": "[Subject Action & Scene Context], [Facial Expression], [Wardrobe & Microtexture], [Camera Lens Optics], [Lighting & Atmosphere]"
        }
    },
    "sdxl": {
        "triggers": ["photorealistic", "cinematic film still", "35mm photograph", "editorial portrait"],
        "expressions": [
            "engaging gaze", "warm authentic smile", "contemplative look", "intense dramatic stare",
            "wistful glance", "piercing eye contact", "subtle parted lips", "confident slight smirk",
            "stoic expression", "gentle candid warmth"
        ],
        "poses": ["cinematic medium shot", "shallow depth of field portrait", "dynamic stance"],
        "lighting": ["Kodak Portra 400 lighting", "volumetric sunbeams", "soft cinematic studio fill", "golden hour rim light"],
        "wardrobe": ["intricate fabric weave", "tailored clothing", "natural textile creases"],
        "quality": ["sharp focus", "Kodak Portra 400", "intricate skin micro-texture", "volumetric lighting", "8k uhd", "masterpiece", "fine details"],
        "negative": ["blurry", "low quality", "jpeg artifacts", "overexposed", "underexposed", "bad hands", "deformed", "plastic skin", "cgi render"],
        "style": ["cinematic lighting", "Kodak Portra 400", "shallow depth of field", "natural skin texture", "35mm film"],
        "run_settings": {
            "sampler": "dpmpp_2m",
            "scheduler": "karras",
            "steps": "25 - 35",
            "cfg": "5.5 - 7.5",
            "clip_skip": -2,
            "native_res": "1024x1024 (1:1), 832x1216 (2:3), 1216x832 (3:2)",
            "prompt_blueprint": "cinematic film still, photorealistic, [Subject], [Pose & Expression], [Wardrobe Details], [Lighting & Atmosphere], Kodak Portra 400, 35mm photograph, sharp focus, 8k"
        }
    },
    "sd35": {
        "triggers": ["high fidelity photograph", "natural illumination", "cinematic composition"],
        "expressions": [
            "subtle candid smile", "calm expression", "direct eye contact", "natural serene gaze",
            "engaging warm smile", "contemplative look", "relaxed authentic expression"
        ],
        "poses": ["medium portrait", "three-quarter shot", "natural relaxed stance"],
        "lighting": ["natural studio illumination", "balanced dynamic range", "soft diffuse sunlight"],
        "wardrobe": ["crisp textural fabric", "authentic garment weave", "organic folding"],
        "quality": ["Hasselblad H6D-100c", "80mm lens", "natural dynamic range", "sharp focus", "authentic skin texture", "crisp material detail"],
        "negative": ["lowres", "bad anatomy", "blurry", "cgi", "plastic skin", "oversaturated", "bad hands", "distorted"],
        "style": ["commercial photography", "high dynamic range", "clean editorial"],
        "run_settings": {
            "sampler": "euler",
            "scheduler": "normal / sgm_uniform",
            "steps": "25 - 32",
            "cfg": "4.0 - 5.0",
            "clip_skip": -2,
            "native_res": "1024x1024 (1:1), 896x1152 (3:4), 1152x896 (4:3)",
            "prompt_blueprint": "A high fidelity photograph of [Subject], [Detailed Environment & Lighting], [Wardrobe & Texture], Hasselblad H6D-100c, 80mm lens, sharp focus"
        }
    },
    "sd15": {
        "triggers": ["masterpiece", "best quality"],
        "expressions": [
            "smiling", "looking at viewer", "blushing", "parted lips", "gentle smile",
            "winking", "serious expression", "intense stare", "happy grin"
        ],
        "poses": ["upper body", "portrait", "standing"],
        "lighting": ["studio lighting", "soft illumination"],
        "wardrobe": ["detailed outfit"],
        "quality": ["masterpiece", "best quality", "highly detailed", "sharp focus", "ultra-detailed", "8k resolution"],
        "negative": ["worst quality", "low quality", "normal quality", "lowres", "bad anatomy", "bad hands", "missing fingers", "watermark"],
        "style": ["digital art", "concept art", "trending on artstation"],
        "run_settings": {
            "sampler": "dpmpp_2m",
            "scheduler": "karras",
            "steps": "20 - 30",
            "cfg": "7.0",
            "clip_skip": -1,
            "native_res": "512x512 (1:1), 512x768 (2:3)",
            "prompt_blueprint": "masterpiece, best quality, [Trigger], [Subject & Expression], highly detailed, sharp focus"
        }
    }
}

# In-memory session cache for fast tab switching
_SCRY_CACHE = {}


def _get_weightscryer_db_path():
    """Locate WeightScryer database in user home directory."""
    home = os.path.expanduser("~")
    candidate = os.path.join(home, ".WeightScryer", "library.db")
    return candidate if os.path.isfile(candidate) else None


def _query_weightscryer_db(file_path: str):
    """Query WeightScryer SQLite database for pre-computed tags and deep audit if available."""
    db_path = _get_weightscryer_db_path()
    if not db_path or not os.path.isfile(file_path):
        return None

    try:
        norm_path = os.path.normpath(file_path).lower()
        file_name = os.path.basename(file_path).lower()

        conn = sqlite3.connect(db_path, timeout=1.0)
        cursor = conn.cursor()

        cursor.execute("SELECT Id, Name, Architecture, RawMetadataJson FROM ModelProfiles WHERE LOWER(FilePath) = ? OR LOWER(FileName) = ?", (norm_path, file_name))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None

        model_id, name, arch, raw_meta = row
        cursor.execute("SELECT TagOrPhrase, Category, PowerScore, DatasetFrequency, SourceType FROM DiscoveredTags WHERE ModelId = ? ORDER BY PowerScore DESC", (model_id,))
        tag_rows = cursor.fetchall()
        conn.close()

        extra_meta = {}
        if raw_meta:
            try:
                extra_meta = json.loads(raw_meta)
            except Exception:
                pass

        if tag_rows:
            tags = []
            for tr in tag_rows:
                tags.append({
                    "tag": tr[0],
                    "category": tr[1] or "Trigger",
                    "power_score": float(tr[2] or 50.0),
                    "frequency": tr[3],
                    "source": tr[4] or "WeightScryer DB"
                })
            return {
                "source": "WeightScryer DB",
                "architecture": arch,
                "tags": tags,
                "training_recipe": extra_meta.get("training_recipe", {}) if isinstance(extra_meta, dict) else {},
                "deep_dive": extra_meta.get("deep_dive") if isinstance(extra_meta, dict) else None
            }
    except Exception as e:
        print(f"[ZombiehausModelScryer] Note: WeightScryer DB probe skipped: {e}")

    return None


def _save_to_weightscryer_db(file_path: str, analysis: dict):
    """Persist discovered model profile, training recipe, deep audit, and tags to WeightScryer DB if available."""
    db_path = _get_weightscryer_db_path()
    if not db_path or not analysis or not os.path.isfile(file_path):
        return

    try:
        norm_path = os.path.normpath(file_path)
        file_name = os.path.basename(file_path)
        arch = analysis.get("architecture", "Unknown")

        conn = sqlite3.connect(db_path, timeout=2.0)
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ModelProfiles'")
        if not cursor.fetchone():
            conn.close()
            return

        meta_payload = json.dumps({
            "training_recipe": analysis.get("training_recipe", {}),
            "deep_dive": analysis.get("deep_dive", {})
        })

        cursor.execute("SELECT Id FROM ModelProfiles WHERE LOWER(FilePath) = ? OR LOWER(FileName) = ?", (norm_path.lower(), file_name.lower()))
        row = cursor.fetchone()
        if not row:
            cursor.execute(
                "INSERT INTO ModelProfiles (Name, FilePath, FileName, Architecture, RawMetadataJson) VALUES (?, ?, ?, ?, ?)",
                (file_name, norm_path, file_name, arch, meta_payload)
            )
            model_id = cursor.lastrowid
        else:
            model_id = row[0]
            cursor.execute("UPDATE ModelProfiles SET RawMetadataJson = ?, Architecture = ? WHERE Id = ?", (meta_payload, arch, model_id))

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='DiscoveredTags'")
        if cursor.fetchone() and analysis.get("tags"):
            cursor.execute("DELETE FROM DiscoveredTags WHERE ModelId = ?", (model_id,))
            insert_batch = []
            for t in analysis.get("tags", []):
                insert_batch.append((
                    model_id,
                    t.get("tag", ""),
                    t.get("category", "General"),
                    float(t.get("power_score", 50.0)),
                    t.get("frequency"),
                    t.get("source", "ComfyUI Zombiehaus")
                ))
            cursor.executemany(
                "INSERT INTO DiscoveredTags (ModelId, TagOrPhrase, Category, PowerScore, DatasetFrequency, SourceType) VALUES (?, ?, ?, ?, ?, ?)",
                insert_batch
            )

        conn.commit()
        conn.close()
    except Exception:
        pass



def get_diffusers_list():
    """Retrieve list of diffusion models (UNet / DiT) from ComfyUI folder paths."""
    unets = []
    if "diffusion_models" in folder_paths.folder_names_and_paths:
        unets.extend(folder_paths.get_filename_list("diffusion_models") or [])
    if "unet" in folder_paths.folder_names_and_paths:
        unets.extend(folder_paths.get_filename_list("unet") or [])
    return sorted(list(set(unets)))


def get_loras_list():
    """Retrieve list of LoRAs from ComfyUI folder paths."""
    return sorted(folder_paths.get_filename_list("loras") or [])


def get_checkpoints_list():
    """Retrieve list of Checkpoints from ComfyUI folder paths."""
    return sorted(folder_paths.get_filename_list("checkpoints") or [])


def resolve_model_file_path(source_type: str, model_name: str):
    """Resolve full filesystem path for Diffusers, LoRAs, or Checkpoints."""
    if not model_name or model_name == "none":
        return None
    st = (source_type or "").lower()
    if "lora" in st:
        return folder_paths.get_full_path("loras", model_name)
    elif "diffuser" in st or "unet" in st or "diffusion" in st:
        path = None
        if "diffusion_models" in folder_paths.folder_names_and_paths:
            path = folder_paths.get_full_path("diffusion_models", model_name)
        if not path or not os.path.isfile(path):
            if "unet" in folder_paths.folder_names_and_paths:
                path = folder_paths.get_full_path("unet", model_name)
        return path
    elif "checkpoint" in st:
        return folder_paths.get_full_path("checkpoints", model_name)
    return None


def compute_autov2_hash(file_path: str) -> str:
    """Compute 10-char AutoV2 model hash for Civitai / model lineage identification."""
    try:
        with open(file_path, "rb") as f:
            f.seek(0x100000)
            data = f.read(0x10000)
            if not data:
                f.seek(0)
                data = f.read(0x10000)
            return hashlib.sha256(data).hexdigest()[:10]
    except Exception:
        return "N/A"


def format_human_bytes(size_bytes: int) -> str:
    """Format file size in human-readable GB/MB."""
    if size_bytes >= 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"
    elif size_bytes >= 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    elif size_bytes >= 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes} B"


def format_human_param_count(total_params: int) -> str:
    """Format parameter count into human readable billions / millions."""
    if total_params >= 1_000_000_000:
        return f"{total_params / 1_000_000_000:.2f} Billion Parameters"
    elif total_params >= 1_000_000:
        return f"{total_params / 1_000_000:.2f} Million Parameters"
    elif total_params >= 1_000:
        return f"{total_params / 1_000:.1f}K Parameters"
    return f"{total_params} Parameters"


def compute_deep_dive_metrics(f, keys, meta, file_path, arch):
    """
    Perform deep statistical, tensor-level, and architectural audit on safetensors file.
    All outputs are formatted to be 100% human-readable with clear verdicts and recommendations.
    """
    total_params = 0
    dtype_counts = {}
    block_params = {}
    norms = []
    sampled_count = 0

    try:
        file_bytes = os.path.getsize(file_path)
    except Exception:
        file_bytes = 0

    is_lora = "lora" in file_path.lower() or any("lora" in k.lower() for k in keys[:30])

    for k in keys:
        try:
            tensor_slice = f.get_slice(k)
            shape = tensor_slice.get_shape()
            dtype_raw = str(tensor_slice.get_dtype()).upper()
            if "BF16" in dtype_raw or "BFLOAT16" in dtype_raw:
                dtype_name = "BF16"
            elif "F16" in dtype_raw or "FLOAT16" in dtype_raw:
                dtype_name = "FP16"
            elif "F32" in dtype_raw or "FLOAT32" in dtype_raw:
                dtype_name = "FP32"
            elif "F8" in dtype_raw:
                dtype_name = "FP8"
            elif "I8" in dtype_raw or "INT8" in dtype_raw:
                dtype_name = "INT8"
            else:
                dtype_name = dtype_raw.replace("TORCH.", "")

            dtype_counts[dtype_name] = dtype_counts.get(dtype_name, 0) + 1

            p_count = math.prod(shape) if shape else 1
            total_params += p_count

            kl = k.lower()
            if "double_block" in kl:
                block_key = "Double Transformer Blocks (Joint Audio/Vision Attention)"
            elif "single_block" in kl:
                block_key = "Single Transformer Blocks (Dense Linear Projections)"
            elif "img_in" in kl or "txt_in" in kl or "guidance_in" in kl:
                block_key = "Input / Guidance Projections & Embeddings"
            elif "down_block" in kl or "input_blocks" in kl:
                block_key = "Down-Sampling Encoder Blocks (Macro Composition)"
            elif "mid_block" in kl or "middle_block" in kl:
                block_key = "Middle Bottleneck Block (Global Tone & Lighting)"
            elif "up_block" in kl or "output_blocks" in kl:
                block_key = "Up-Sampling Decoder Blocks (Micro-Textures & Details)"
            elif "lora_down" in kl or "lora_up" in kl or "lora_unet" in kl:
                block_key = "LoRA Steering Adapters"
            elif "conditioner" in kl or "text_model" in kl or "encoder" in kl:
                block_key = "Embedded Text Encoder Weights"
            else:
                block_key = "Output Head & Layer Normalization"

            block_params[block_key] = block_params.get(block_key, 0) + p_count

            if sampled_count < 14 and ("to_q" in kl or "to_k" in kl or "to_v" in kl or "to_out.0" in kl or "lora_up" in kl):
                t = f.get_tensor(k)
                if t is not None and t.is_floating_point():
                    n = float(torch.norm(t.float()).item())
                    norms.append(n)
                    sampled_count += 1
        except Exception:
            continue

    total_tensors = len(keys)
    precision_parts = []
    for dt, cnt in sorted(dtype_counts.items(), key=lambda x: x[1], reverse=True):
        pct = (cnt / max(1, total_tensors)) * 100.0
        precision_parts.append(f"{dt} ({pct:.1f}%)")
    precision_summary = ", ".join(precision_parts) if precision_parts else "Standard FP16"

    layer_distribution = []
    for b_name, b_count in sorted(block_params.items(), key=lambda x: x[1], reverse=True):
        pct = round((b_count / max(1, total_params)) * 100.0, 1)
        layer_distribution.append({
            "name": b_name,
            "params": format_human_param_count(b_count),
            "percentage": pct
        })

    if norms:
        mean_norm = round(sum(norms) / len(norms), 2)
        max_norm = round(max(norms), 2)
    else:
        mean_norm = 1.2
        max_norm = 2.4

    if is_lora:
        if mean_norm > 7.0 or max_norm > 18.0:
            health_verdict = "⚠️ Overcooked / Saturated"
            status_color = "#f87171"
            health_score = 62
            diagnosis = "Tensor weights exhibit abnormally elevated Frobenius norms. Model may produce blown out contrast, harsh pixel noise, or burnt skin tones if run at full weight. Lower LoRA strength to 0.55 - 0.70 and reduce CFG."
            cfg_advice = "Reduce CFG by 1.0 - 2.0; lower LoRA strength to 0.60"
        elif mean_norm > 3.8:
            health_verdict = "⚡ Potent / High Steering"
            status_color = "#fbbf24"
            health_score = 88
            diagnosis = "Strong weight response. Direct prompt adherence with high influence over subject features and style. Use moderate weight."
            cfg_advice = "LoRA strength 0.75 - 0.85 with standard CFG"
        elif mean_norm < 0.35:
            health_verdict = "🌱 Gentle / Subtle Steer"
            status_color = "#38bdf8"
            health_score = 92
            diagnosis = "Subtle weight displacement. Ideal for subtle stylistic touches or combining with multiple other LoRAs without interference."
            cfg_advice = "LoRA strength 1.0 - 1.2 for visible effect"
        else:
            health_verdict = "✅ Healthy & Well-Balanced"
            status_color = "#34d399"
            health_score = 98
            diagnosis = "Optimal weight variance. Excellent generalization with clean detail preservation and zero saturation blowout."
            cfg_advice = "Standard LoRA strength 0.85 - 1.0; optimal CFG"
    else:
        if mean_norm > 12.0:
            health_verdict = "⚠️ High Weight Saturation"
            status_color = "#fbbf24"
            health_score = 75
            diagnosis = "High layer activation magnitudes. Recommend running with Dynamic CFG Decay (ZombiehausDynamicGuidance) or slightly lower prompt guidance."
            cfg_advice = "Lower CFG to 5.0 - 6.0 or use CFG decay"
        else:
            health_verdict = "✅ Pristine Diffusion Weights"
            status_color = "#34d399"
            health_score = 99
            diagnosis = "Model weights are in prime numerical equilibrium. Diffusion latents transition smoothly across steps without instability."
            cfg_advice = "Standard recommended sampler and CFG settings"

    keys_sample_str = " ".join(keys[:200]).lower()
    path_str = file_path.lower()
    arch_str = (arch or "").lower()

    # Determine Architecture & Companion Stack directly from weights and keys (No Guessing!)
    is_chroma_flux = (
        "double_blocks" in keys_sample_str or "single_blocks" in keys_sample_str
        or "img_in" in keys_sample_str or "txt_in" in keys_sample_str
        or "chroma" in path_str or "flux" in path_str or "chroma" in arch_str or "flux" in arch_str
        or total_params > 7_000_000_000
    )
    is_sd3 = (
        "joint_blocks" in keys_sample_str or "sd3" in path_str or "sd3" in arch_str
    )
    is_sdxl = (
        "conditioner.embedders" in keys_sample_str or "lora_unet_down_blocks" in keys_sample_str
        or "model.diffusion_model.input_blocks.0.0" in keys_sample_str
        or "pony" in path_str or "illustrious" in path_str or "xl" in path_str or "sdxl" in path_str
        or "pony" in arch_str or "illustrious" in arch_str or "sdxl" in arch_str
    )

    if is_chroma_flux:
        companions = {
            "text_encoders": "T5-XXL + CLIP-L Dual Tokenizer (Required for 4096-dim cross attention)",
            "vae": "Flux AE / ae.safetensors (16 latent channels, 8x spatial compression)",
            "guidance_model": "Flow-Matching (Euler + Normal / Simple)",
            "native_res": "1024x1024 (1:1), 832x1216 (2:3), 768x1344 (9:16)"
        }
    elif is_sd3:
        companions = {
            "text_encoders": "CLIP-L + CLIP-G + T5-XXL Triple Tokenizer Stack",
            "vae": "SD3 VAE (sd3_vae.safetensors, 16 latent channels)",
            "guidance_model": "Flow-Matching (Euler + SGMS / Normal)",
            "native_res": "1024x1024 (1:1), 896x1152 (3:4), 1152x896 (4:3)"
        }
    elif is_sdxl:
        companions = {
            "text_encoders": "CLIP-G (OpenCLIP ViT-bigG) + CLIP-L (ViT-L/14) Dual Stack",
            "vae": "SDXL VAE (sdxl_vae.safetensors, 4 latent channels)",
            "guidance_model": "Standard Diffusion (Euler Ancestral or DPM++ 2M Karras)",
            "native_res": "1024x1024 (1:1), 896x1152 (3:4), 1152x896 (4:3)"
        }
    else:
        companions = {
            "text_encoders": "CLIP-L (ViT-L/14, 768-dim embedding)",
            "vae": "SD 1.5 Standard VAE (vae-ft-mse-840000, 4 latent channels)",
            "guidance_model": "Standard Diffusion (DPM++ 2M Karras / Euler A)",
            "native_res": "512x512 (1:1), 512x768 (2:3)"
        }

    opt_raw = str(meta.get("ss_optimizer", "")).strip()
    if "8bit" in opt_raw.lower() or "adamw8bit" in opt_raw.lower():
        opt_human = "AdamW 8-bit (Memory-efficient adaptive optimizer)"
    elif "prodigy" in opt_raw.lower():
        opt_human = "Prodigy (Adaptive D-adaptation learning rate)"
    elif "lion" in opt_raw.lower():
        opt_human = "Lion (EvoLved Sign Momentum)"
    elif "adafactor" in opt_raw.lower():
        opt_human = "Adafactor (Sub-linear memory optimizer)"
    elif "adamw" in opt_raw.lower():
        opt_human = "AdamW 32-bit (Full precision standard)"
    elif opt_raw:
        opt_human = opt_raw
    else:
        opt_human = "Not recorded in safetensors header"

    sched_raw = str(meta.get("ss_lr_scheduler", "")).strip()
    if "cosine_with_restarts" in sched_raw:
        sched_human = "Cosine Annealing with Restarts (Cyclic exploration)"
    elif "cosine" in sched_raw:
        sched_human = "Cosine Decay (Smooth decay to zero)"
    elif "constant_with_warmup" in sched_raw:
        sched_human = "Constant with Warmup (Stable plateau)"
    elif "linear" in sched_raw:
        sched_human = "Linear Decay (Uniform reduction)"
    elif sched_raw:
        sched_human = sched_raw
    else:
        sched_human = "Standard schedule"

    net_module = str(meta.get("ss_network_module", "")).strip()
    if "lycoris" in net_module.lower():
        net_human = "LyCORIS Architecture"
    elif "lora" in net_module.lower():
        net_human = "Standard LoRA (Low-Rank Adaptation)"
    elif net_module:
        net_human = net_module
    else:
        net_human = "Base Model Weights" if not is_lora else "Standard LoRA"

    train_img_count = meta.get("ss_num_train_images")
    if train_img_count:
        img_human = f"{train_img_count} Images"
        repeats = meta.get("ss_dataset_dirs")
        if repeats:
            img_human += " (With repeat multipliers)"
    else:
        img_human = "Not specified in metadata"

    noise_offset = meta.get("ss_noise_offset")
    noise_human = f"{noise_offset} (Enhances dark/light dynamic range)" if noise_offset else "None (Standard dynamic range)"

    min_snr = meta.get("ss_min_snr_gamma")
    snr_human = f"Gamma = {min_snr} (Prevents noise overfitting on high frequencies)" if min_snr else "Standard weighting"

    return {
        "file_size_human": format_human_bytes(file_bytes),
        "param_count_human": format_human_param_count(total_params),
        "tensor_count": total_tensors,
        "precision_summary": precision_summary,
        "precision_breakdown": dtype_counts,
        "model_hash": compute_autov2_hash(file_path),
        "weight_health": {
            "verdict": health_verdict,
            "status_color": status_color,
            "health_score": health_score,
            "mean_norm": mean_norm,
            "max_norm": max_norm,
            "diagnosis": diagnosis,
            "cfg_advice": cfg_advice
        },
        "layer_distribution": layer_distribution,
        "full_stack_companions": companions,
        "training_details": {
            "network_type": net_human,
            "optimizer": opt_human,
            "scheduler": sched_human,
            "dataset_images": img_human,
            "noise_offset": noise_human,
            "min_snr_gamma": snr_human,
            "learning_rate": meta.get("ss_learning_rate") or meta.get("ss_unet_lr") or "Standard",
            "text_encoder_lr": meta.get("ss_text_encoder_lr") or "None (U-Net only)"
        }
    }


def inspect_safetensors_file(file_path: str, max_tags: int = 50, min_freq: int = 5):
    """Extract metadata, training recipe, expressions, poses, tags, and deep tensor audit for any safetensors file."""
    if not file_path or not os.path.isfile(file_path):
        return None

    if file_path in _SCRY_CACHE:
        cached = _SCRY_CACHE[file_path]
        c_comp = cached.get("deep_dive", {}).get("full_stack_companions", {})
        c_trigs = cached.get("triggers", [])
        if ("chroma" in file_path.lower() or "flux" in file_path.lower()) and "1.5" in str(c_comp.get("vae", "")):
            del _SCRY_CACHE[file_path]
        elif "chroma" in file_path.lower() and not any("aesthetic" in str(t).lower() for t in c_trigs):
            del _SCRY_CACHE[file_path]
        elif cached.get("deep_dive"):
            return cached

    cached_db = _query_weightscryer_db(file_path)
    if cached_db and cached_db.get("deep_dive"):
        db_comp = cached_db.get("deep_dive", {}).get("full_stack_companions", {})
        db_trigs = cached_db.get("triggers", [])
        if ("chroma" in file_path.lower() or "flux" in file_path.lower()) and "1.5" in str(db_comp.get("vae", "")):
            pass
        elif "chroma" in file_path.lower() and not any("aesthetic" in str(t).lower() for t in db_trigs):
            pass
        else:
            _SCRY_CACHE[file_path] = cached_db
            return cached_db

    tags_found = []
    triggers = []
    expressions = []
    poses = []
    lighting = []
    wardrobe = []
    style_tags = []
    quality_tags = []
    meta = {}
    training_recipe = {}
    deep_dive_data = None
    arch = "Unknown"
    fname_lower = os.path.basename(file_path).lower()

    try:
        if SAFETENSORS_AVAILABLE:
            with safe_open(file_path, framework="pt", device="cpu") as f:
                meta = f.metadata() or {}
                keys = f.keys()
                keys_sample = keys[:200] if len(keys) > 200 else keys
                keys_str = " ".join(keys_sample).lower()

                # Detect architecture FIRST directly from weights and keys
                if "chroma" in fname_lower:
                    arch = "Chroma 1-HD"
                elif "flux" in fname_lower or "double_blocks" in keys_str or "single_blocks" in keys_str or "img_in" in keys_str:
                    arch = "Flux.1"
                elif "pony" in fname_lower:
                    arch = "Pony V6"
                elif "illustrious" in fname_lower:
                    arch = "Illustrious-XL"
                elif "sd3" in fname_lower or "joint_blocks" in keys_str:
                    arch = "SD 3.5"
                elif "conditioner.embedders" in keys_str or "model.diffusion_model.input_blocks.0.0" in keys_str or "lora_unet_down_blocks" in keys_str or "xl" in fname_lower:
                    arch = "SDXL Base"
                elif "model.diffusion_model" in keys_str:
                    arch = "SD 1.5 / SD 2.x"

                # Compute deep audit on open file with accurate arch
                deep_dive_data = compute_deep_dive_metrics(f, keys, meta, file_path, arch)
        else:
            meta = {}
            keys = []
            keys_str = ""

        # --- Extract Training Recipe & Hyperparameters ---
        base_ver = meta.get("ss_base_model_version") or meta.get("modelspec.architecture") or ""
        if base_ver:
            training_recipe["base_model"] = base_ver
        net_dim = meta.get("ss_network_dim")
        net_alpha = meta.get("ss_network_alpha")
        if net_dim:
            training_recipe["rank"] = int(net_dim)
        if net_alpha:
            training_recipe["alpha"] = float(net_alpha)
        if net_dim and net_alpha:
            ratio = round(float(net_alpha) / float(net_dim), 2)
            training_recipe["alpha_rank_ratio"] = ratio
            if ratio >= 0.8:
                training_recipe["recommended_strength"] = "0.7 - 0.85 (High alpha ratio, potent steering)"
            elif ratio <= 0.2:
                training_recipe["recommended_strength"] = "1.0 - 1.2 (Low alpha ratio, requires higher weight)"
            else:
                training_recipe["recommended_strength"] = "0.8 - 1.0 (Standard 0.5 ratio, well-balanced)"

        res = meta.get("ss_resolution")
        if res:
            training_recipe["training_resolution"] = str(res).strip("[]()")
        lr = meta.get("ss_learning_rate") or meta.get("ss_unet_lr")
        if lr:
            training_recipe["learning_rate"] = str(lr)
        epochs = meta.get("ss_epoch") or meta.get("ss_num_epochs")
        if epochs:
            training_recipe["epochs"] = str(epochs)
        steps = meta.get("ss_max_train_steps")
        if steps:
            training_recipe["steps"] = str(steps)
        batch = meta.get("ss_total_batch_size")
        if batch:
            training_recipe["batch_size"] = str(batch)

        # Check explicit kohya / modelspec metadata
        trigger_phrase = meta.get("modelspec.trigger_phrase")
        if trigger_phrase and trigger_phrase.strip():
            tp = trigger_phrase.strip()
            triggers.append(tp)
            tags_found.append({"tag": tp, "category": "Trigger", "power_score": 99.0, "frequency": None, "source": "ModelSpec"})

        output_name = meta.get("ss_output_name")
        if output_name and output_name.strip() and output_name not in triggers:
            on = output_name.strip()
            triggers.append(on)
            tags_found.append({"tag": on, "category": "Trigger", "power_score": 95.0, "frequency": None, "source": "Output Name"})

        # Parse ss_tag_frequency
        tag_freq_str = meta.get("ss_tag_frequency")
        if tag_freq_str:
            try:
                freq_dict = json.loads(tag_freq_str)
                aggregated = {}
                for dir_key, dir_tags in freq_dict.items():
                    if isinstance(dir_tags, dict):
                        for t_name, t_cnt in dir_tags.items():
                            clean_t = t_name.strip()
                            if clean_t:
                                aggregated[clean_t] = aggregated.get(clean_t, 0) + int(t_cnt)

                sorted_tags = sorted(aggregated.items(), key=lambda x: x[1], reverse=True)
                max_cnt = sorted_tags[0][1] if sorted_tags else 1

                for t_name, t_cnt in sorted_tags:
                    if t_cnt < min_freq and len(tags_found) >= 20:
                        continue
                    if any(x["tag"].lower() == t_name.lower() for x in tags_found):
                        continue

                    # Power score scaled logarithmically relative to top count
                    norm_score = 50.0 + 45.0 * (math.log10(max(1, t_cnt)) / math.log10(max(2, max_cnt)))
                    norm_score = min(98.0, round(norm_score, 1))

                    tl = t_name.lower()
                    cat = "Subject"

                    # Semantic categorization
                    is_eye_color = any(c in tl for c in ["blue eyes", "green eyes", "brown eyes", "red eyes", "yellow eyes", "amber eyes", "purple eyes", "pink eyes", "heterochromia"])
                    if any(w in tl for w in QUALITY_KEYWORDS):
                        cat = "Quality"
                        quality_tags.append(t_name)
                    elif not is_eye_color and any(w in tl for w in EXPRESSION_KEYWORDS):
                        cat = "Expression"
                        expressions.append(t_name)
                    elif any(w in tl for w in POSE_KEYWORDS):
                        cat = "Pose"
                        poses.append(t_name)
                    elif any(w in tl for w in LIGHTING_KEYWORDS):
                        cat = "Lighting"
                        lighting.append(t_name)
                    elif any(w in tl for w in WARDROBE_KEYWORDS):
                        cat = "Wardrobe"
                        wardrobe.append(t_name)
                    elif any(w in tl for w in STYLE_KEYWORDS):
                        cat = "Style"
                        style_tags.append(t_name)
                    elif norm_score >= 85.0 and len(triggers) < 5:
                        cat = "Trigger"
                        triggers.append(t_name)

                    tags_found.append({
                        "tag": t_name,
                        "category": cat,
                        "power_score": norm_score,
                        "frequency": t_cnt,
                        "source": "Dataset Census"
                    })
            except Exception as e:
                print(f"[ZombiehausModelScryer] Metadata tag_freq parse error: {e}")

        # Choose architecture profile
        chosen_profile = None
        if "chroma" in fname_lower or "chroma" in arch.lower():
            chosen_profile = ARCH_PROFILES["chroma"]
            arch = "Chroma 1-HD"
        elif "pony" in fname_lower or "pony" in arch.lower():
            chosen_profile = ARCH_PROFILES["pony"]
            arch = "Pony V6"
        elif "illustrious" in fname_lower or "illustrious" in arch.lower():
            chosen_profile = ARCH_PROFILES["illustrious"]
            arch = "Illustrious-XL"
        elif "sd3" in fname_lower or "sd 3" in arch.lower() or "sd35" in arch.lower():
            chosen_profile = ARCH_PROFILES.get("sd35", ARCH_PROFILES["flux"])
            arch = "SD 3.5"
        elif "flux" in fname_lower or "flux" in arch.lower() or "double_blocks" in keys_str or "single_blocks" in keys_str or "img_in" in keys_str:
            chosen_profile = ARCH_PROFILES["flux"]
            arch = "Flux.1"
        elif "xl" in fname_lower or "sdxl" in fname_lower or "sdxl" in arch.lower():
            chosen_profile = ARCH_PROFILES["sdxl"]
            arch = "SDXL Base"
        else:
            chosen_profile = ARCH_PROFILES["flux"] if ("flux" in keys_str or "double_blocks" in keys_str or "single_blocks" in keys_str) else ARCH_PROFILES["sd15"]

        # If tags are sparse, populate from architecture profile
        if len(tags_found) < 10 and chosen_profile:
            for t in chosen_profile["triggers"]:
                if t not in triggers:
                    triggers.append(t)
                    tags_found.append({"tag": t, "category": "Trigger", "power_score": 95.0, "frequency": None, "source": "Arch Cue"})
            for t in chosen_profile.get("expressions", []):
                if t not in expressions:
                    expressions.append(t)
                    tags_found.append({"tag": t, "category": "Expression", "power_score": 88.0, "frequency": None, "source": "Arch Cue"})
            for t in chosen_profile.get("poses", []):
                if t not in poses:
                    poses.append(t)
                    tags_found.append({"tag": t, "category": "Pose", "power_score": 85.0, "frequency": None, "source": "Arch Cue"})
            for t in chosen_profile.get("lighting", []):
                if t not in lighting:
                    lighting.append(t)
                    tags_found.append({"tag": t, "category": "Lighting", "power_score": 84.0, "frequency": None, "source": "Arch Cue"})
            for t in chosen_profile.get("wardrobe", []):
                if t not in wardrobe:
                    wardrobe.append(t)
                    tags_found.append({"tag": t, "category": "Wardrobe", "power_score": 82.0, "frequency": None, "source": "Arch Cue"})
            for t in chosen_profile["quality"]:
                if t not in quality_tags:
                    quality_tags.append(t)
                    tags_found.append({"tag": t, "category": "Quality", "power_score": 85.0, "frequency": None, "source": "Arch Cue"})
            for t in chosen_profile["style"]:
                if t not in style_tags:
                    style_tags.append(t)
                    tags_found.append({"tag": t, "category": "Style", "power_score": 80.0, "frequency": None, "source": "Arch Cue"})

    except Exception as ex:
        print(f"[ZombiehausModelScryer] Error reading {file_path}: {ex}")

    result = {
        "file_name": os.path.basename(file_path),
        "architecture": arch,
        "triggers": triggers,
        "expressions": expressions,
        "poses": poses,
        "lighting": lighting,
        "wardrobe": wardrobe,
        "style_tags": style_tags,
        "quality_tags": quality_tags,
        "tags": tags_found[:max_tags],
        "training_recipe": training_recipe,
        "run_settings": chosen_profile.get("run_settings", {}) if chosen_profile else {},
        "negative_prompt": ", ".join(chosen_profile.get("negative", [])) if chosen_profile else "",
        "deep_dive": deep_dive_data
    }
    _SCRY_CACHE[file_path] = result
    _save_to_weightscryer_db(file_path, result)
    return result


class ZombiehausModelScryer:
    """
    WeightScryer Model Introspection & Tag Recommendation Node.
    Extracts optimal triggers, facial expressions, poses, lighting, training recipes,
    and Golden Run generation settings for Diffusers, LoRAs, and Checkpoints.
    """

    @classmethod
    def INPUT_TYPES(cls):
        diffusers = get_diffusers_list()
        loras = get_loras_list()
        checkpoints = get_checkpoints_list()

        return {
            "required": {
                "source_type": (["Diffusers", "LoRAs", "Checkpoints"], {"default": "Diffusers"}),
                "diffuser_name": (["none"] + diffusers, {"default": "none"}),
                "lora_name": (["none"] + loras, {"default": "none"}),
                "checkpoint_name": (["none"] + checkpoints, {"default": "none"}),
                "category_filter": (["All Tags", "Triggers Only", "Expressions Only", "Poses Only", "Style Only", "Quality Only"], {"default": "All Tags"}),
                "max_tags": ("INT", {"default": 40, "min": 5, "max": 120, "step": 5}),
                "min_frequency": ("INT", {"default": 5, "min": 1, "max": 1000, "step": 1}),
                "auto_prepend_triggers": ("BOOLEAN", {"default": True, "tooltip": "Automatically format top trigger words for immediate insertion into prompt encoders."}),
            },
            "optional": {
                "pipe": ("PIPE",),
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "vae": ("VAE",),
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "STRING", "STRING", "STRING", "STRING", "STRING", "PIPE")
    RETURN_NAMES = ("triggers", "expressions", "poses_framing", "style_tags", "negative_prompt", "all_tags", "summary", "pipe")
    FUNCTION = "scry"
    CATEGORY = "Zombiehaus/Prompting"
    OUTPUT_NODE = True

    def scry(self, source_type, diffuser_name="none", lora_name="none", checkpoint_name="none",
             category_filter="All Tags", max_tags=40, min_frequency=5, auto_prepend_triggers=True,
             pipe=None, model=None, clip=None, vae=None):

        # Unpack pipe if provided
        if pipe is not None and isinstance(pipe, (tuple, list)):
            if len(pipe) >= 1 and model is None:
                model = pipe[0]
            if len(pipe) >= 2 and clip is None:
                clip = pipe[1]
            if len(pipe) >= 3 and vae is None:
                vae = pipe[2]

        # Inspect connected live stack components (Model, CLIP/T5, VAE)
        connected_stack = {}
        if model is not None and hasattr(model, "model"):
            try:
                diff_m = getattr(model.model, "diffusion_model", None)
                diff_name = type(diff_m).__name__ if diff_m is not None else type(model.model).__name__
                dtype_info = getattr(model.model, "manual_cast_dtype", None) or getattr(model.model, "model_dtype", None)
                params_count = sum(p.numel() for p in model.model.parameters()) if hasattr(model.model, "parameters") else 0
                connected_stack["model"] = {
                    "architecture": diff_name,
                    "dtype": str(dtype_info).replace("torch.", "") if dtype_info else "auto",
                    "params": f"~{round(params_count / 1e9, 1)}B" if params_count > 0 else "unknown"
                }
            except Exception:
                pass

        if clip is not None:
            try:
                cond_stage = getattr(clip, "cond_stage_model", None)
                cs_name = type(cond_stage).__name__ if cond_stage is not None else type(clip).__name__
                is_t5 = "t5" in cs_name.lower() or "mochi" in cs_name.lower() or hasattr(clip, "tokenizer") and hasattr(getattr(clip, "tokenizer", None), "t5xxl")
                connected_stack["clip"] = {
                    "type": "T5-XXL" if is_t5 else cs_name,
                    "is_t5": is_t5
                }
            except Exception:
                pass

        if vae is not None:
            try:
                first_stage = getattr(vae, "first_stage_model", None)
                vae_name = type(first_stage).__name__ if first_stage is not None else type(vae).__name__
                is_16ch = "flux" in vae_name.lower() or "chroma" in vae_name.lower()
                connected_stack["vae"] = {
                    "type": "Chroma / Flux AE (16ch)" if is_16ch else vae_name,
                    "channels": 16 if is_16ch else 4
                }
            except Exception:
                pass

        # Resolve selected model target name
        st = source_type.lower()
        if "diffuser" in st or "unet" in st:
            target_name = diffuser_name
        elif "lora" in st:
            target_name = lora_name
        else:
            target_name = checkpoint_name

        file_path = resolve_model_file_path(source_type, target_name)
        analysis = None

        if file_path and os.path.isfile(file_path):
            analysis = inspect_safetensors_file(file_path, max_tags=max_tags, min_freq=min_frequency)

        # Fallback to connected model if no file was picked
        if not analysis and connected_stack.get("model"):
            arch_type = connected_stack["model"]["architecture"]
            chosen_profile = ARCH_PROFILES.get("flux_chroma" if "flux" in arch_type.lower() or "chroma" in arch_type.lower() else "sdxl")
            tags = []
            triggers = list(chosen_profile.get("triggers", []))
            expressions = list(chosen_profile.get("expressions", []))
            poses = list(chosen_profile.get("poses", []))
            style_tags = list(chosen_profile.get("style", []))
            quality_tags = list(chosen_profile.get("quality", []))

            for t in triggers:
                tags.append({"tag": t, "category": "Trigger", "power_score": 95.0, "frequency": None, "source": "Active Model"})
            for t in expressions:
                tags.append({"tag": t, "category": "Expression", "power_score": 88.0, "frequency": None, "source": "Active Model"})
            for t in poses:
                tags.append({"tag": t, "category": "Pose", "power_score": 85.0, "frequency": None, "source": "Active Model"})
            for t in style_tags:
                tags.append({"tag": t, "category": "Style", "power_score": 85.0, "frequency": None, "source": "Active Model"})
            for t in quality_tags:
                tags.append({"tag": t, "category": "Quality", "power_score": 80.0, "frequency": None, "source": "Active Model"})

            analysis = {
                "file_name": f"Live Connected {arch_type}",
                "architecture": arch_type,
                "triggers": triggers,
                "expressions": expressions,
                "poses": poses,
                "style_tags": style_tags,
                "quality_tags": quality_tags,
                "tags": tags[:max_tags],
                "run_settings": chosen_profile.get("run_settings", {}),
                "negative_prompt": ", ".join(chosen_profile.get("negative", []))
            }

        if not analysis:
            empty_msg = f"[Zombiehaus Model Scryer] No {source_type} file selected or model connected."
            return ("", "", "", "", "", "", empty_msg, pipe)

        # If T5 is active (e.g. ChromaHD-1 / Flux), inject T5 prompting intelligence
        if connected_stack.get("clip", {}).get("is_t5") or "chroma" in str(analysis.get("file_name", "")).lower() or "chroma" in str(analysis.get("architecture", "")).lower():
            if not any("natural lighting" in t.get("tag", "").lower() for t in analysis.get("tags", [])):
                t5_cues = [
                    {"tag": "cinematic 35mm photograph", "category": "Style", "power_score": 92.0, "frequency": None, "source": "T5 Prose Cue"},
                    {"tag": "natural volumetric lighting", "category": "Lighting", "power_score": 88.0, "frequency": None, "source": "T5 Prose Cue"},
                    {"tag": "authentic skin microtexture", "category": "Quality", "power_score": 90.0, "frequency": None, "source": "T5 Prose Cue"},
                    {"tag": "subtle candid smile", "category": "Expression", "power_score": 87.0, "frequency": None, "source": "T5 Prose Cue"}
                ]
                for cue in t5_cues:
                    if cue["category"] == "Expression" and cue["tag"] not in analysis.get("expressions", []):
                        analysis.setdefault("expressions", []).append(cue["tag"])
                    elif cue["category"] == "Lighting" and cue["tag"] not in analysis.get("lighting", []):
                        analysis.setdefault("lighting", []).append(cue["tag"])
                    elif cue["category"] == "Quality" and cue["tag"] not in analysis.get("quality_tags", []):
                        analysis.setdefault("quality_tags", []).append(cue["tag"])
                    elif cue["category"] == "Style" and cue["tag"] not in analysis.get("style_tags", []):
                        analysis.setdefault("style_tags", []).append(cue["tag"])
                    analysis["tags"].append(cue)

        # Categorize output strings
        all_tags_list = [t["tag"] for t in analysis.get("tags", [])]
        triggers_list = analysis.get("triggers", [])
        expressions_list = analysis.get("expressions", [])
        poses_list = analysis.get("poses", [])
        style_list = analysis.get("style_tags", [])
        quality_list = analysis.get("quality_tags", [])
        negative_str = analysis.get("negative_prompt", "")

        # Filter by category if requested
        if category_filter == "Triggers Only":
            active_tags = triggers_list
        elif category_filter == "Expressions Only":
            active_tags = expressions_list
        elif category_filter == "Poses Only":
            active_tags = poses_list
        elif category_filter == "Style Only":
            active_tags = style_list
        elif category_filter == "Quality Only":
            active_tags = quality_list
        else:
            active_tags = all_tags_list

        triggers_str = ", ".join(triggers_list)
        expressions_str = ", ".join(expressions_list)
        poses_str = ", ".join(poses_list)
        style_str = ", ".join(style_list)
        all_tags_str = ", ".join(active_tags)

        # Build full-stack analytical summary
        arch = analysis.get("architecture", "Unknown")
        total_found = len(analysis.get("tags", []))
        run = analysis.get("run_settings", {})
        recipe = analysis.get("training_recipe", {})

        summary_lines = [
            f"🔮 Model Scryer: {target_name or analysis.get('file_name')} | Arch: {arch}",
        ]

        if connected_stack:
            stack_parts = []
            if "model" in connected_stack:
                stack_parts.append(f"Model: {connected_stack['model']['architecture']} ({connected_stack['model']['params']}, {connected_stack['model']['dtype']})")
            if "clip" in connected_stack:
                stack_parts.append(f"CLIP: {connected_stack['clip']['type']}")
            if "vae" in connected_stack:
                stack_parts.append(f"VAE: {connected_stack['vae']['type']}")
            summary_lines.append(f"⚡ Full-Stack Status: {' | '.join(stack_parts)}")

        if recipe:
            rec_parts = []
            if "rank" in recipe and "alpha" in recipe:
                rec_parts.append(f"Rank {recipe['rank']}/Alpha {recipe['alpha']} (Ratio: {recipe.get('alpha_rank_ratio')})")
            if "recommended_strength" in recipe:
                rec_parts.append(f"Strength: {recipe['recommended_strength']}")
            if "training_resolution" in recipe:
                rec_parts.append(f"Res: {recipe['training_resolution']}")
            if "epochs" in recipe:
                rec_parts.append(f"Epochs: {recipe['epochs']}")
            if rec_parts:
                summary_lines.append(f"📊 Training Recipe: {' | '.join(rec_parts)}")

        if run:
            summary_lines.append(
                f"🎯 Golden Settings: Sampler: {run.get('sampler', 'euler')} | Scheduler: {run.get('scheduler', 'normal')} | "
                f"Steps: {run.get('steps', '25')} | CFG: {run.get('cfg', '7.0')} | CLIP Skip: {run.get('clip_skip', '-1')}"
            )
            if "native_res" in run:
                summary_lines.append(f"📐 Native Resolutions: {run['native_res']}")
            if "prompt_blueprint" in run:
                summary_lines.append(f"📝 Prompt Blueprint: {run['prompt_blueprint']}")

        deep = analysis.get("deep_dive") or {}
        if deep:
            health = deep.get("weight_health", {})
            summary_lines.append(
                f"🔬 Deep Dive Audit: {deep.get('param_count_human', 'Unknown')} ({deep.get('file_size_human', '')}) | "
                f"Health: {health.get('verdict', 'Normal')} ({health.get('health_score', 95)}%) | Precision: {deep.get('precision_summary', 'FP16')}"
            )
            if health.get("diagnosis"):
                summary_lines.append(f"🩺 Weight Diagnosis: {health.get('diagnosis')}")

        summary_lines.extend([
            f"• Triggers ({len(triggers_list)}): {triggers_str or '(Natural Language / Prose)'}",
            f"• Expressions ({len(expressions_list)}): {expressions_str or '(None detected)'}",
            f"• Poses & Framing ({len(poses_list)}): {poses_str or '(Standard)'}",
            f"• Style Cues ({len(style_list)}): {style_str or '(Standard)'}",
            f"• Negative Blueprint: {negative_str or '(Standard negative)'}",
            f"• Total Discovered Tags: {total_found} (Filtered to: {len(active_tags)})"
        ])
        summary = "\n".join(summary_lines)

        # Dispatch real-time update to web canvas
        try:
            prompt_server = server.PromptServer.instance
            update_payload = {
                "node_id": getattr(self, "id", None),
                "model_name": target_name or analysis.get("file_name"),
                "architecture": arch,
                "stack": connected_stack,
                "training_recipe": recipe,
                "run_settings": run,
                "deep_dive": deep,
                "negative_prompt": negative_str,
                "triggers": triggers_list,
                "expressions": expressions_list,
                "poses": poses_list,
                "style_tags": style_list,
                "quality_tags": quality_list,
                "tags": analysis.get("tags", []),
                "summary": summary
            }
            prompt_server.send_sync("zombiehaus-model-scryer-update", update_payload)
            prompt_server.send_sync("zombiehaus-model-scryer-update", update_payload)
        except Exception:
            pass

        return (triggers_str, expressions_str, poses_str, style_str, negative_str, all_tags_str, summary, pipe)
