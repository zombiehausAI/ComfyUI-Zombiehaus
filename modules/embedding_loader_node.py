"""
Zombiehaus Embedding Loader Node

Loads and formats positive and negative textual inversion embeddings from models/embeddings/
with configurable strength weighting and clean token formatting for direct connection
into the Zombiehaus Text Editor (or any CLIP encoding workflow).
"""

import os
import re

def get_embedding_list() -> list[str]:
    """Retrieve list of available embeddings from folder_paths."""
    try:
        import folder_paths
        files = folder_paths.get_filename_list("embeddings")
        if files:
            # Sort case-insensitively and prefix with "none"
            return ["none"] + sorted(files, key=lambda s: s.lower())
    except Exception:
        pass
    return ["none"]


def format_embedding_token(embed_name: str, weight: float = 1.0, strip_ext: bool = False) -> str:
    """
    Format embedding filename into ComfyUI prompt token syntax.
    - weight == 1.0: embedding:name
    - weight != 1.0: (embedding:name:weight)
    - weight <= 0.0: omitted (empty string)
    """
    if not embed_name or embed_name == "none":
        return ""
    
    clean_name = str(embed_name).replace("\\", "/").strip()
    if not clean_name or clean_name == "none":
        return ""
    
    if strip_ext:
        for ext in (".safetensors", ".pt", ".bin", ".ckpt"):
            if clean_name.lower().endswith(ext):
                clean_name = clean_name[:-len(ext)]
                break
    
    if weight <= 0.0:
        return ""
    
    if abs(weight - 1.0) < 1e-4:
        return f"embedding:{clean_name}"
    else:
        weight_str = f"{weight:.2f}".rstrip("0").rstrip(".")
        return f"(embedding:{clean_name}:{weight_str})"


class ZombiehausEmbeddingLoader:
    """
    Loads positive and negative textual inversion embeddings from models/embeddings/,
    formats them into ComfyUI-compliant tokens with adjustable weights, and outputs
    strings ready to wire directly into ZombiehausTextEditor's positive_embedding
    and negative_embedding sockets.
    """

    @classmethod
    def INPUT_TYPES(cls):
        embeddings = get_embedding_list()
        return {
            "required": {
                "positive_embedding": (embeddings, {"default": "none"}),
                "positive_weight": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 2.0, "step": 0.05, "display": "slider"}),
                "negative_embedding": (embeddings, {"default": "none"}),
                "negative_weight": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 2.0, "step": 0.05, "display": "slider"}),
                "strip_extension": ("BOOLEAN", {"default": False}),
            },
            "optional": {
                "positive_embedding_2": (embeddings, {"default": "none"}),
                "positive_weight_2": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 2.0, "step": 0.05, "display": "slider"}),
                "negative_embedding_2": (embeddings, {"default": "none"}),
                "negative_weight_2": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 2.0, "step": 0.05, "display": "slider"}),
                "negative_embedding_3": (embeddings, {"default": "none"}),
                "negative_weight_3": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 2.0, "step": 0.05, "display": "slider"}),
                "positive_in": ("STRING", {"forceInput": True}),
                "negative_in": ("STRING", {"forceInput": True}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("positive_embedding", "negative_embedding")
    FUNCTION = "load_embeddings"
    CATEGORY = "Zombiehaus/Loaders"

    def load_embeddings(
        self,
        positive_embedding: str,
        positive_weight: float,
        negative_embedding: str,
        negative_weight: float,
        strip_extension: bool = False,
        positive_embedding_2: str = "none",
        positive_weight_2: float = 1.0,
        negative_embedding_2: str = "none",
        negative_weight_2: float = 1.0,
        negative_embedding_3: str = "none",
        negative_weight_3: float = 1.0,
        positive_in: str = None,
        negative_in: str = None,
    ):
        # 1. Assemble positive embedding tokens
        pos_tokens = []
        if positive_in is not None and str(positive_in).strip():
            pos_tokens.append(str(positive_in).strip())

        t_pos1 = format_embedding_token(positive_embedding, positive_weight, strip_extension)
        if t_pos1:
            pos_tokens.append(t_pos1)

        t_pos2 = format_embedding_token(positive_embedding_2, positive_weight_2, strip_extension)
        if t_pos2:
            pos_tokens.append(t_pos2)

        # 2. Assemble negative embedding tokens
        neg_tokens = []
        if negative_in is not None and str(negative_in).strip():
            neg_tokens.append(str(negative_in).strip())

        t_neg1 = format_embedding_token(negative_embedding, negative_weight, strip_extension)
        if t_neg1:
            neg_tokens.append(t_neg1)

        t_neg2 = format_embedding_token(negative_embedding_2, negative_weight_2, strip_extension)
        if t_neg2:
            neg_tokens.append(t_neg2)

        t_neg3 = format_embedding_token(negative_embedding_3, negative_weight_3, strip_extension)
        if t_neg3:
            neg_tokens.append(t_neg3)

        positive_out = ", ".join(pos_tokens)
        negative_out = ", ".join(neg_tokens)

        return (positive_out, negative_out)
