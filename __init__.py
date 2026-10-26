from .modules.ollama_prompt_refiner_node import OllamaPromptRefinerNode
from .modules.ollama_text_refiner_node import OllamaTextRefinerNode
from .modules.image_for_prompting_node import ZombiehausImageForPromptingNode
from .modules.zombiehaus_utils import get_ollama_models
from .modules.batch_ksampler_node import ZombiehausBatchKSampler
from .modules.lora_loader_node import ZombiehausLoraLoader
from .modules.upscaler_node import ZombiehausUpscaler
from .modules.ksampler_node import ZombiehausKSampler
from .modules.model_loader_node import ZombiehausModelLoader
from .modules.multi_clip_text_encode_node import ZombiehausMultiCLIPTextEncode
from .modules.show_text_node import ZombiehausShowText
from .modules.text_editor_node import ZombiehausTextEditor
from .modules.image_gallery_node import ZombiehausImageGallery
from .modules.latent_preset_node import ZombiehausLatentPreset
from .modules.save_audio_node import ZombiehausSaveAudio
from .modules.save_image_node import ZombiehausSaveImage
from .modules.ace_step_audio_node import ZombiehausAceStepAudio
from .modules.allinone_detailer_node import ZombiehausDetailerSlot, ZombiehausAllInOneDetailer
from .modules.conditioning_concat_node import ZombiehausConditioningConcat
from .modules.restormer_node import ZombiehausRestormer
from .modules.dynamic_guidance_node import ZombiehausDynamicGuidance
from .modules.dewax_texture_restore_node import ZombiehausDeWaxTextureRestore
from .modules.video_latent_node import ZombiehausVideoLatent
from .modules.save_video_node import ZombiehausSaveVideo
from .modules.song_writer_node import ZombiehausSongWriter
from .modules.audio_mixer_node import ZombiehausAudioMixer
from .modules.vae_encode_node import (
    ZombiehausLoadImage,
    ZombiehausVAEEncode,
    ZombiehausVAEDecode,
    ZombiehausFidelityController,
    ZombiehausImg2ImgVAEEncode,
)
from .modules.controlnet_node import ZombiehausControlNetLoader, ZombiehausControlNetApply, ZombiehausControlNetAllInOne
from .modules.latent_tools_node import ZombiehausLatentUpscale, ZombiehausMaskTools
from .modules.image_compare_node import ZombiehausCompareImages
from .modules.list_curator_node import ZombiehausListCurator
from .modules.function_editor_node import ZombiehausFunctionEditor
from .modules.model_upscale_node import ZombiehausModelUpscale
from .modules.chroma_shift_node import ZombiehausChromaShift
from .modules.prompt_mixer_node import ZombiehausPromptMixer
from .modules.seed_controller_node import ZombiehausSeedController
from .modules.controlnet_preprocessor_node import ZombiehausImagePreprocessor
from .modules.smart_resizer_node import ZombiehausSmartResizer, ZombiehausImageScaleDownBy
from .modules.faceswap_node import ZombiehausFaceSwap
from .modules.glamour_controller_node import ZombiehausGlamourController
from .modules.studio_director_node import ZombiehausStudioDirector
from .modules.background_replacer_node import ZombiehausBackgroundReplacer
from .modules.style_picker_node import ZombiehausStylePicker
from .modules.hires_fix_node import ZombiehausHiresFix
from .modules.export_card_node import ZombiehausExportCard
from .modules.wardrobe_inpaint_node import ZombiehausWardrobeInpaint
from .modules.person_inpaint_node import ZombiehausPersonInpaint
from .modules.persona_interact_node import ZombiehausPersonaInteract
from .modules.dual_persona_director_node import ZombiehausDualPersonaDirector
from .modules.scene_script_director_node import ZombiehausSceneScriptDirector
from .modules.pipe_bus_node import ZombiehausPipeBus
from .modules.studio_node import list_studio_profiles, load_profile_data, get_studio_profiles_dir
from .modules.model_scryer_node import (
    ZombiehausModelScryer,
    inspect_safetensors_file,
    resolve_model_file_path,
    get_diffusers_list,
    get_loras_list,
    get_checkpoints_list,
)
import server
from aiohttp import web
import folder_paths
from urllib.parse import quote
from .config import settings, save_config
import safetensors.torch
import hashlib
import requests
import json
import os
import asyncio
import re
from PIL import Image
from PIL.PngImagePlugin import PngInfo

def sanitize_ollama_url(url: str) -> str:
    """Sanitizes Ollama URL: strips whitespace, trailing slashes, and fixes trailing dots in IP/host."""
    if not url or not isinstance(url, str):
        return "http://127.0.0.1:11434"
    clean = url.strip().rstrip("/")
    clean = re.sub(r'(\d+\.\d+\.\d+\.\d+)\.(?=:|/|$)', r'\1', clean)
    clean = re.sub(r'([a-zA-Z0-9_-]+)\.(?=:)', r'\1', clean)
    if not clean.startswith("http://") and not clean.startswith("https://"):
        clean = f"http://{clean}"
    return clean

@server.PromptServer.instance.routes.get("/zombiehaus/refresh_ollama_models")
async def refresh_ollama_models(request):
    """API endpoint to force a refresh of the Ollama models list."""
    ollama_url = sanitize_ollama_url(settings.get('ollama_url'))
    try:
        models = get_ollama_models(ollama_url, force_refresh=True)
        if models == ["ollama-not-running"] and "127.0.0.1" not in ollama_url:
            fb_models = get_ollama_models("http://127.0.0.1:11434", force_refresh=True)
            if fb_models != ["ollama-not-running"]:
                models = fb_models
        return web.json_response({"success": True, "data": models})
    except Exception as e:
        msg = f"API Error refreshing Ollama models: {e}"
        print(f"[Zombiehaus] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.get("/zombiehaus/ollama_status")
async def ollama_status(request):
    """Check to see if Ollama is accessible with URL sanitization and fallback."""
    raw_url = settings.get('ollama_url', 'http://127.0.0.1:11434')
    ollama_url = sanitize_ollama_url(raw_url)
    timeout_val = 3.5

    urls_to_try = [ollama_url]
    if "127.0.0.1" not in ollama_url and "localhost" not in ollama_url:
        urls_to_try.append("http://127.0.0.1:11434")

    last_error = None
    for target_url in urls_to_try:
        try:
            response = requests.get(f"{target_url}/api/tags", timeout=timeout_val)
            if response.status_code == 200:
                data = response.json()
                raw_models = data.get("models", [])
                models = sorted([m["name"] for m in raw_models if "name" in m])
                return web.json_response({
                    "success": True,
                    "available": True,
                    "models": models,
                    "url": target_url
                })
        except Exception as e:
            last_error = str(e)
            print(f"[Zombiehaus Ollama Status] Connection to {target_url} failed: {e}")

    return web.json_response({
        "success": True,
        "available": False,
        "models": [],
        "tested_url": ollama_url,
        "error": last_error
    })

@server.PromptServer.instance.routes.get("/zombiehaus/studio/profiles")
async def get_studio_profiles_api(request):
    """API endpoint to list all available studio model profiles."""
    try:
        from .modules.studio_node import list_studio_profiles, load_profile_data
        names = list_studio_profiles()
        profiles = []
        for name in names:
            profiles.append({
                "name": name,
                "data": load_profile_data(name)
            })
        return web.json_response({"success": True, "profiles": profiles})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/studio/profiles/save")
async def save_studio_profile_api(request):
    """API endpoint to save a studio model profile."""
    try:
        from .modules.studio_node import get_studio_profiles_dir
        body = await request.json()
        name = body.get("name", "").strip()
        data = body.get("data", {})
        if not name:
            return web.json_response({"success": False, "message": "Profile name is required"})

        clean_name = re.sub(r'[\\/*?:"<>|]', "", name)
        p_dir = get_studio_profiles_dir()
        p_file = os.path.join(p_dir, f"{clean_name}.json")
        with open(p_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return web.json_response({"success": True, "name": clean_name})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/studio/profiles/delete")
async def delete_studio_profile_api(request):
    """API endpoint to delete a studio model profile."""
    try:
        from .modules.studio_node import get_studio_profiles_dir
        body = await request.json()
        name = body.get("name", "").strip()
        if not name:
            return web.json_response({"success": False, "message": "Profile name is required"})

        clean_name = re.sub(r'[\\/*?:"<>|]', "", name)
        p_dir = get_studio_profiles_dir()
        p_file = os.path.join(p_dir, f"{clean_name}.json")
        if os.path.isfile(p_file):
            os.remove(p_file)
            return web.json_response({"success": True, "deleted": clean_name})
        return web.json_response({"success": False, "message": "Profile not found or is built-in"})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.get("/zombiehaus/studio")
@server.PromptServer.instance.routes.get("/zombiehaus/studio/")
async def serve_studio_page(request):
    """Serve the standalone Zombiehaus Studio web interface."""
    html_path = os.path.join(os.path.dirname(__file__), "web", "studio", "index.html")
    if os.path.isfile(html_path):
        return web.FileResponse(html_path)
    return web.Response(text="Zombiehaus Studio index.html not found", status=404)

@server.PromptServer.instance.routes.get("/zombiehaus/studio/{filename:.*}")
async def serve_studio_static(request):
    """Serve static assets directly under /zombiehaus/studio/."""
    filename = request.match_info.get("filename", "")
    base_dir = os.path.join(os.path.dirname(__file__), "web", "studio")
    file_path = os.path.abspath(os.path.join(base_dir, filename))
    if file_path.startswith(base_dir) and os.path.isfile(file_path):
        return web.FileResponse(file_path)
    return web.Response(status=404)

@server.PromptServer.instance.routes.post("/zombiehaus/studio/open")
async def open_studio_in_browser(request):
    """Open the Zombiehaus Studio in the system's default browser."""
    try:
        import webbrowser
        webbrowser.open("http://127.0.0.1:8188/zombiehaus/studio")
        return web.json_response({"success": True})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.get("/zombiehaus/studio/models")
async def get_studio_models_api(request):
    """Return all installed checkpoints, diffusion models, vaes, clips, loras, upscalers, samplers, and schedulers."""
    try:
        import folder_paths
        import comfy.samplers

        def safe_list(folder_type):
            try:
                return folder_paths.get_filename_list(folder_type) or []
            except Exception:
                return []

        checkpoints = ["None"] + safe_list("checkpoints")
        unets = ["None"] + safe_list("diffusion_models")
        vaes = ["None"] + safe_list("vae")
        clips = ["disabled"] + safe_list("clip")
        loras = ["None"] + safe_list("loras")
        upscalers = ["None"] + safe_list("upscale_models")
        detectors = []
        try:
            from .modules.allinone_detailer_node import scan_detector_models
            detectors = [m for m in scan_detector_models() if m not in ("disabled", "(no models found)")]
        except Exception:
            pass

        samplers = []
        schedulers = []
        try:
            samplers = list(comfy.samplers.KSampler.SAMPLERS)
        except Exception:
            pass
        try:
            schedulers = list(comfy.samplers.KSampler.SCHEDULERS)
        except Exception:
            pass

        return web.json_response({
            "success": True,
            "checkpoints": checkpoints,
            "unets": unets,
            "vaes": vaes,
            "clips": clips,
            "loras": loras,
            "upscalers": upscalers,
            "detectors": detectors,
            "samplers": samplers,
            "schedulers": schedulers
        })
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/enhance_prompt")
async def enhance_prompt(request):
    """Enhance a prompt with sensory, lighting, and atmospheric details using Ollama."""
    try:
        body = await request.json()
        prompt_text = body.get("prompt", "").strip()
        model = body.get("model", "").strip()
        style = body.get("style", "tags").strip().lower()

        if not prompt_text:
            return web.json_response({"success": False, "message": "Prompt is empty"})

        ollama_url = sanitize_ollama_url(settings.get('ollama_url', 'http://127.0.0.1:11434'))
        timeout_val = settings.get('ollama_timeout', 60)

        # Fallback to first available model if none provided
        if not model:
            for test_url in [ollama_url, "http://127.0.0.1:11434"]:
                try:
                    tags_resp = requests.get(f"{test_url}/api/tags", timeout=3.0)
                    if tags_resp.status_code == 200:
                        models_list = tags_resp.json().get("models", [])
                        if models_list:
                            model = models_list[0].get("name", "")
                            ollama_url = test_url
                            break
                except Exception:
                    pass

        if not model:
            return web.json_response({"success": False, "message": "No Ollama model specified or available"})

        # Resolve variables, comments, wildcards, and dynamic syntax before enhancement
        try:
            loras, clean_for_eval = ZombiehausTextEditor.extract_prompt_loras(prompt_text)
            uncommented = ZombiehausTextEditor.filter_comments(clean_for_eval)
            resolved_text = ZombiehausTextEditor.resolve_dynamic_prompts(uncommented)
            resolved_text = re.sub(r'\{!neg:[^{}]*\}', '', resolved_text, flags=re.IGNORECASE)
            resolved_text = re.sub(r'\s*,\s*,+', ', ', resolved_text)
            resolved_text = re.sub(r'^[,\s]+|[,\s]+$', '', resolved_text).strip()
            if resolved_text:
                prompt_text = resolved_text
        except Exception as e:
            print(f"[Zombiehaus Ollama Enhance] Warning resolving variables: {e}")

        from .config import get_config
        live_cfg = get_config()
        custom_expr_prompt = live_cfg.get("ollama_sys_prompt_expressions", "").strip()
        custom_tag_prompt = live_cfg.get("ollama_sys_prompt_tags", "").strip()

        if "expression" in style:
            if custom_expr_prompt:
                system_prompt = custom_expr_prompt
            else:
                system_prompt = (
                    "You are an expert AI prompt engineer specializing in modern natural language diffusion models (FLUX.1, SD3, Midjourney). "
                    "Your task is to enrich and enhance the user's prompt into a vivid, descriptive natural English paragraph (fluent sentences). "
                    "Describe the subject, environment, lighting, camera angle, textures, and sensory nuances in rich natural prose without using comma tag soup or attention weights like (word:1.2). "
                    "Maintain the core subject and intent of the original prompt. "
                    "Return ONLY the enhanced prompt as natural descriptive sentences. "
                    "Do NOT include explanations, quotes, preambles, or markdown formatting."
                )
        else:
            if custom_tag_prompt:
                system_prompt = custom_tag_prompt
            else:
                system_prompt = (
                    "You are an expert AI prompt engineer specializing in tag-based visual image models (SDXL, Pony Diffusion, Illustrious, Anime/Danbooru). "
                    "Your task is to enrich and enhance the user's prompt by adding vivid, high-quality visual keyword tags. "
                    "Maintain the core subject and intent of the original prompt. "
                    "Return ONLY the enhanced prompt as a clean comma-separated list of descriptive visual tags (e.g. 1girl, solo, masterpiece, cinematic lighting, detailed background). "
                    "Do NOT include explanations, quotes, preambles, or markdown formatting."
                )

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Enrich this prompt: {prompt_text}"}
            ],
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 300
            }
        }

        response = requests.post(f"{ollama_url}/api/chat", json=payload, timeout=timeout_val)
        response.raise_for_status()
        data = response.json()
        raw_content = data.get("message", {}).get("content", "").strip()

        # Clean markdown wrappers or quotes
        cleaned = re.sub(r"^```(?:markdown|text)?\n?", "", raw_content, flags=re.IGNORECASE)
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()
        cleaned = cleaned.strip('"\'')

        return web.json_response({"success": True, "enhanced": cleaned, "model": model})
    except requests.exceptions.Timeout:
        return web.json_response({"success": False, "message": "Ollama request timed out"})
    except requests.exceptions.ConnectionError:
        return web.json_response({"success": False, "message": "Could not connect to Ollama server"})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/refine_selection")
async def refine_selection(request):
    """Refine a selected phrase or word using Ollama with targeted actions."""
    try:
        body = await request.json()
        selected_text = body.get("text", "").strip()
        action = body.get("action", "expand").strip().lower()
        context = body.get("context", "").strip()
        model = body.get("model", "").strip()
        style = body.get("style", "tags").strip().lower()

        if not selected_text:
            return web.json_response({"success": False, "message": "No text selected"})

        ollama_url = sanitize_ollama_url(settings.get('ollama_url', 'http://127.0.0.1:11434'))
        timeout_val = settings.get('ollama_timeout', 60)

        # Fallback to first available model if none provided
        if not model:
            for test_url in [ollama_url, "http://127.0.0.1:11434"]:
                try:
                    tags_resp = requests.get(f"{test_url}/api/tags", timeout=3.0)
                    if tags_resp.status_code == 200:
                        models_list = tags_resp.json().get("models", [])
                        if models_list:
                            model = models_list[0].get("name", "")
                            ollama_url = test_url
                            break
                except Exception:
                    pass

        if not model:
            return web.json_response({"success": False, "message": "No Ollama model specified or available"})

        context_hint = f" Surrounding prompt context: \"{context}\"." if context else ""

        if action == "expand":
            if "expression" in style:
                system_prompt = (
                    "You are an expert AI prompt engineer. "
                    "Enrich and expand the user's selected word or phrase with evocative sensory, lighting, material, and visual details in natural descriptive English prose suitable for FLUX.1/SD3. "
                    "Do NOT use comma tag lists or numerical attention weights. "
                    "Maintain the core subject and intent. Output ONLY the replacement text without quotes or explanations."
                )
            else:
                system_prompt = (
                    "You are an expert AI prompt engineer for SDXL/Pony image generation. "
                    "Enrich the user's selected word or phrase by adding high-impact visual modifier tags. "
                    "Output ONLY the replacement text as a clean comma-separated sequence of visual keyword tags without quotes or explanations."
                )
            user_prompt = f"Expand this phrase:{context_hint} \"{selected_text}\""

        elif action in ("synonyms", "wrap_choice"):
            system_prompt = (
                "You are a creative visual vocabulary assistant for image generation prompts. "
                "Provide 4 to 5 evocative visual synonyms or alternative phrasing for the given concept. "
                "Output ONLY a clean comma-separated list of alternatives (e.g. option1, option2, option3, option4) without numbering, quotes, or conversational filler."
            )
            user_prompt = f"Provide 4-5 visual alternatives for:{context_hint} \"{selected_text}\""

        elif action == "intensify":
            system_prompt = (
                "You are an expert prompt crafter. "
                "Rephrase the user's selected text to be dramatically more intense, striking, majestic, and visually powerful. "
                "Output ONLY the intensified replacement text without quotes or explanations."
            )
            user_prompt = f"Intensify this phrase:{context_hint} \"{selected_text}\""

        elif action == "simplify":
            system_prompt = (
                "You are an expert prompt editor. "
                "Boil down the user's selected text into its most concise, essential, high-impact core visual keywords, removing redundant filler words. "
                "Output ONLY the simplified replacement text without quotes or explanations."
            )
            user_prompt = f"Simplify this phrase:{context_hint} \"{selected_text}\""

        elif action == "prosify":
            system_prompt = (
                "You are an expert prompt engineer for FLUX.1 and SD3. "
                "Rewrite the user's selected tags into a fluent, cohesive, natural English description without parentheses or weights. "
                "Output ONLY the fluent prose replacement without quotes or explanations."
            )
            user_prompt = f"Convert to natural prose:{context_hint} \"{selected_text}\""

        elif action == "tagify":
            system_prompt = (
                "You are an expert prompt engineer for SDXL and Pony Diffusion. "
                "Convert the user's selected prose into clean, comma-separated visual keyword tags. "
                "Output ONLY the comma-separated tags without quotes or explanations."
            )
            user_prompt = f"Convert to keyword tags:{context_hint} \"{selected_text}\""

        else:
            system_prompt = "Refine the user's selected image prompt phrase. Output ONLY the refined text."
            user_prompt = f"Refine this:{context_hint} \"{selected_text}\""

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 180
            }
        }

        response = requests.post(f"{ollama_url}/api/chat", json=payload, timeout=timeout_val)
        response.raise_for_status()
        data = response.json()
        raw_content = data.get("message", {}).get("content", "").strip()

        cleaned = re.sub(r"^```(?:markdown|text)?\n?", "", raw_content, flags=re.IGNORECASE)
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()
        cleaned = cleaned.strip('"\'')

        # For synonyms/wrap_choice, parse into list
        options = []
        if action in ("synonyms", "wrap_choice"):
            raw_opts = re.split(r"[\n,]+", cleaned)
            for opt in raw_opts:
                t = re.sub(r"^\d+[\.\)]\s*", "", opt).strip().strip('"\'')
                if t and t.lower() != selected_text.lower():
                    options.append(t)
            if not options and cleaned:
                options = [cleaned]

        return web.json_response({
            "success": True,
            "result": cleaned,
            "options": options,
            "action": action,
            "model": model
        })
    except requests.exceptions.Timeout:
        return web.json_response({"success": False, "message": "Ollama request timed out"})
    except requests.exceptions.ConnectionError:
        return web.json_response({"success": False, "message": "Could not connect to Ollama server"})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.get("/zombiehaus/gallery/list")
async def gallery_list(request):
    """API endpoint to list folders and images in the output directory."""
    try:
        subpath = request.query.get("path", "").strip()
        sort_by = request.query.get("sort", "name").strip()
        limit_param = request.query.get("limit", "").strip()
        limit = int(limit_param) if limit_param.isdigit() else None
        output_dir = folder_paths.get_output_directory()
        
        # Build the full path
        if subpath:
            full_path = os.path.join(output_dir, subpath)
        else:
            full_path = output_dir
            
        # Security check: ensure we're still within output directory
        full_path = os.path.normpath(full_path)
        output_dir_norm = os.path.normpath(output_dir)
        if not full_path.startswith(output_dir_norm):
            return web.json_response({"success": False, "message": "Invalid path"})
        
        if not os.path.isdir(full_path):
            return web.json_response({"success": False, "message": "Directory not found"})
        
        def _scan_directory():
            folders = []
            images = []
            folder_stats = {}
            image_stats = {}
            img_exts = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')

            try:
                with os.scandir(full_path) as it:
                    for entry in it:
                        try:
                            stat = entry.stat()
                            name = entry.name
                            if entry.is_dir():
                                folders.append(name)
                                folder_stats[name] = {
                                    'modified': stat.st_mtime,
                                    'created': stat.st_ctime
                                }
                            elif entry.is_file():
                                if name.lower().endswith(img_exts):
                                    images.append(name)
                                    image_stats[name] = {
                                        'modified': stat.st_mtime,
                                        'created': stat.st_ctime,
                                        'size': stat.st_size
                                    }
                        except (OSError, PermissionError):
                            continue
            except PermissionError:
                return None, "Permission denied"

            # If limit requested and sorting by date, sort and trim on server
            if limit and limit > 0 and len(images) > limit:
                if sort_by == "date":
                    images.sort(key=lambda x: image_stats.get(x, {}).get('modified', 0), reverse=True)
                else:
                    images.sort()
                images = images[:limit]
                image_stats = {k: image_stats[k] for k in images if k in image_stats}

            return {
                "folders": folders,
                "images": images,
                "folderStats": folder_stats,
                "imageStats": image_stats
            }, None

        # Offload file scanning to background thread so main asyncio event loop is never blocked
        scan_data, err_msg = await asyncio.to_thread(_scan_directory)
        if err_msg:
            return web.json_response({"success": False, "message": err_msg})

        return web.json_response({
            "success": True, 
            "data": scan_data
        })
    except Exception as e:
        msg = f"API Error listing gallery: {e}"
        print(f"[Zombiehaus Gallery] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.get("/zombiehaus/gallery/metadata")
async def gallery_metadata(request):
    """API endpoint to get metadata from an image file."""
    try:
        filename = request.query.get("filename", "").strip()
        subpath = request.query.get("path", "").strip()
        
        if not filename:
            return web.json_response({"success": False, "message": "No filename provided"})
        
        output_dir = folder_paths.get_output_directory()
        
        # Build the full path
        if subpath:
            full_path = os.path.join(output_dir, subpath, filename)
        else:
            full_path = os.path.join(output_dir, filename)
        
        # Security check: ensure we're still within output directory
        full_path = os.path.normpath(full_path)
        output_dir_norm = os.path.normpath(output_dir)
        if not full_path.startswith(output_dir_norm):
            return web.json_response({"success": False, "message": "Invalid path"})
        
        if not os.path.isfile(full_path):
            return web.json_response({"success": False, "message": "File not found"})
        
        metadata = {}
        
        try:
            # Try to read PNG metadata
            if full_path.lower().endswith('.png'):
                with Image.open(full_path) as img:
                    # Get PNG text chunks
                    png_info = img.info
                    
                    # Common ComfyUI metadata fields
                    if 'prompt' in png_info:
                        try:
                            metadata['prompt'] = json.loads(png_info['prompt'])
                        except:
                            metadata['prompt'] = png_info['prompt']
                    
                    if 'workflow' in png_info:
                        try:
                            metadata['workflow'] = json.loads(png_info['workflow'])
                        except:
                            metadata['workflow'] = png_info['workflow']
                    
                    # Include other text chunks
                    for key, value in png_info.items():
                        if key not in ['prompt', 'workflow'] and isinstance(value, str):
                            try:
                                # Try to parse as JSON
                                metadata[key] = json.loads(value)
                            except:
                                metadata[key] = value
                    
                    # Add basic image info
                    metadata['_image_info'] = {
                        'format': img.format,
                        'mode': img.mode,
                        'size': img.size,
                        'width': img.width,
                        'height': img.height
                    }
            else:
                # For non-PNG images, just get basic info
                with Image.open(full_path) as img:
                    metadata['_image_info'] = {
                        'format': img.format,
                        'mode': img.mode,
                        'size': img.size,
                        'width': img.width,
                        'height': img.height
                    }
                    
                    # Try to get EXIF data
                    if hasattr(img, '_getexif') and img._getexif():
                        metadata['exif'] = img._getexif()
        
        except Exception as e:
            print(f"[Zombiehaus Gallery] Error reading metadata from {filename}: {e}")
            return web.json_response({"success": False, "message": f"Error reading metadata: {str(e)}"})
        
        # Add file info
        file_stat = os.stat(full_path)
        metadata['_file_info'] = {
            'filename': filename,
            'size_bytes': file_stat.st_size,
            'size_mb': round(file_stat.st_size / (1024 * 1024), 2),
            'modified': file_stat.st_mtime,
            'created': file_stat.st_ctime
        }
        
        return web.json_response({"success": True, "metadata": metadata})
    except Exception as e:
        msg = f"API Error getting metadata: {e}"
        print(f"[Zombiehaus Gallery] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.get("/zombiehaus/gallery/thumbnail")
async def gallery_thumbnail(request):
    """API endpoint to get a fast, cached thumbnail of an image for filmstrip and gallery views."""
    try:
        filename = request.query.get("filename", "").strip()
        subpath = request.query.get("path", request.query.get("subfolder", "")).strip()
        image_type = request.query.get("type", "output").strip()
        
        if not filename:
            return web.json_response({"success": False, "message": "No filename provided"}, status=400)
            
        try:
            size = max(64, min(int(request.query.get("size", 256)), 512))
        except (ValueError, TypeError):
            size = 256
            
        if image_type == "input":
            base_dir = folder_paths.get_input_directory()
        elif image_type == "temp":
            base_dir = folder_paths.get_temp_directory()
        else:
            base_dir = folder_paths.get_output_directory()
            
        if subpath:
            full_path = os.path.join(base_dir, subpath, filename)
        else:
            full_path = os.path.join(base_dir, filename)
            
        full_path = os.path.normpath(full_path)
        base_dir_norm = os.path.normpath(base_dir)
        if not full_path.startswith(base_dir_norm):
            return web.json_response({"success": False, "message": "Invalid path"}, status=403)
            
        if not os.path.isfile(full_path):
            return web.json_response({"success": False, "message": "File not found"}, status=404)
            
        # Check thumbnail cache in temp directory
        file_stat = os.stat(full_path)
        thumb_dir = os.path.join(folder_paths.get_temp_directory(), "zombiehaus_thumbnails")
        os.makedirs(thumb_dir, exist_ok=True)
        
        cache_key = f"{full_path}_{file_stat.st_mtime}_{file_stat.st_size}_{size}"
        hash_name = hashlib.sha256(cache_key.encode("utf-8")).hexdigest()[:24]
        cached_path = os.path.join(thumb_dir, f"thumb_{hash_name}.webp")
        
        if os.path.isfile(cached_path):
            return web.FileResponse(cached_path, headers={
                "Cache-Control": "public, max-age=86400",
                "Content-Type": "image/webp"
            })
            
        def _make_thumbnail():
            try:
                with Image.open(full_path) as img:
                    # Select frame 0 for animated formats
                    if hasattr(img, "seek"):
                        try:
                            img.seek(0)
                        except Exception:
                            pass
                    
                    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                        thumb = img.convert("RGBA")
                    else:
                        thumb = img.convert("RGB")
                    
                    # Pillow thumbnail preserves aspect ratio fitting within size x size
                    thumb.thumbnail((size, size), Image.Resampling.BILINEAR)
                    thumb.save(cached_path, "WEBP", quality=82, method=2)
                    return True
            except Exception as ex:
                print(f"[Zombiehaus Gallery] Thumbnail generation error for {filename}: {ex}")
                return False
                
        success = await asyncio.to_thread(_make_thumbnail)
        if success and os.path.isfile(cached_path):
            return web.FileResponse(cached_path, headers={
                "Cache-Control": "public, max-age=86400",
                "Content-Type": "image/webp"
            })
        else:
            # Fallback to serving original file directly
            return web.FileResponse(full_path)
    except Exception as e:
        msg = f"API Error generating thumbnail: {e}"
        print(f"[Zombiehaus Gallery] {msg}")
        return web.json_response({"success": False, "message": msg}, status=500)

@server.PromptServer.instance.routes.get("/zombiehaus/refresh_input_files")
async def refresh_input_files(request):
    """API endpoint to get an updated list of images and folders from the input directory."""
    try:
        input_dir = folder_paths.get_input_directory()
        all_items = []
        if os.path.isdir(input_dir):
            folder_items = []
            file_items = []
            for dirpath, dirnames, filenames in os.walk(input_dir, topdown=True):
                dirnames.sort()
                filenames.sort()
                for dirname in dirnames:
                    relative_path = os.path.relpath(os.path.join(dirpath, dirname), input_dir)
                    folder_items.append(f"[FOLDER] {relative_path.replace(os.sep, '/')}")
                for filename in filenames:
                    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')):
                        relative_path = os.path.relpath(os.path.join(dirpath, filename), input_dir)
                        file_items.append(relative_path.replace(os.sep, '/'))
            all_items = folder_items + file_items

        if not all_items:
            all_items.append("--no items found--")
        return web.json_response({"success": True, "data": all_items})
    except Exception as e:
        msg = f"API Error refreshing input file list: {e}"
        print(f"[Zombiehaus] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.get("/zombiehaus/get_loras")
async def get_loras(request):
    """API endpoint to get a list of all available LoRA models."""
    try:
        lora_list = sorted(folder_paths.get_filename_list("loras"))
        return web.json_response({"success": True, "data": lora_list})
    except Exception as e:
        msg = f"API Error getting LoRA list: {e}"
        print(f"[Zombiehaus LoRA Deck] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.post("/zombiehaus/save_civitai_key")
async def save_civitai_key_endpoint(request):
    """API endpoint to save the Civitai API key to the config file."""
    try:
        data = await request.json()
        api_key = data.get("api_key", "")

        current_config = settings.copy()
        current_config["civitai_api_key"] = api_key

        if save_config(current_config):
            return web.json_response({"success": True, "message": "API key saved successfully."})
        else:
            msg = "Failed to write to config file. Check permissions."
            print(f"[Zombiehaus] {msg}")
            return web.json_response({"success": False, "message": msg})
    except Exception as e:
        msg = f"Error saving Civitai API key: {e}"
        print(f"[Zombiehaus] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.get("/zombiehaus/get_config")
async def get_config_endpoint(request):
    """API endpoint to get the current Zombiehaus configuration."""
    try:
        from .config import get_config, DEFAULT_CONFIG
        cfg = get_config()
        config_data = {
            "ollama_url": cfg.get("ollama_url", DEFAULT_CONFIG.get("ollama_url", "http://127.0.0.1:11434")),
            "ollama_model": cfg.get("ollama_model", ""),
            "ollama_timeout": cfg.get("ollama_timeout", DEFAULT_CONFIG.get("ollama_timeout", 120)),
            "ollama_cloud_url": cfg.get("ollama_cloud_url", ""),
            "ollama_cloud_api_key": cfg.get("ollama_cloud_api_key", ""),
            "cloud_api_url": cfg.get("cloud_api_url", DEFAULT_CONFIG.get("cloud_api_url", "https://openrouter.ai/api/v1")),
            "cloud_api_key": cfg.get("cloud_api_key", ""),
            "cloud_model": cfg.get("cloud_model", DEFAULT_CONFIG.get("cloud_model", "deepseek/deepseek-chat")),
            "civitai_api_key": cfg.get("civitai_api_key", ""),
            "ollama_sys_prompt_expressions": cfg.get("ollama_sys_prompt_expressions", ""),
            "ollama_sys_prompt_tags": cfg.get("ollama_sys_prompt_tags", ""),
            "prompts_save_directory": cfg.get("prompts_save_directory", ""),
            "prompt_style": cfg.get("prompt_style", "Tags (SDXL / Pony)"),
            "syntax_theme": cfg.get("syntax_theme", "Zombiehaus Neon (Default)"),
            "popout_font_family": cfg.get("popout_font_family", "Monospace"),
            "popout_font_size": cfg.get("popout_font_size", 14),
        }
        return web.json_response({"success": True, "data": config_data})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/save_config")
async def save_config_endpoint(request):
    """API endpoint to update Zombiehaus configuration fields."""
    try:
        data = await request.json()
        from .config import get_config, save_config

        current_config = get_config()
        for key in (
            "ollama_url", "ollama_model", "ollama_timeout", "ollama_cloud_url", "ollama_cloud_api_key",
            "cloud_api_url", "cloud_api_key", "cloud_model", "civitai_api_key", "prompts_save_directory",
            "prompt_style", "syntax_theme", "popout_font_family", "popout_font_size",
            "ollama_sys_prompt_expressions", "ollama_sys_prompt_tags"
        ):
            if key in data:
                val = data[key]
                if key in ("ollama_timeout", "popout_font_size"):
                    try:
                        val = int(val)
                    except (ValueError, TypeError):
                        val = 120 if key == "ollama_timeout" else 14
                elif isinstance(val, str):
                    val = val.strip()
                current_config[key] = val

        if save_config(current_config):
            return web.json_response({"success": True, "message": "Configuration saved successfully."})
        else:
            return web.json_response({"success": False, "message": "Failed to write configuration file."})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

# ── Canvas Live Bridge routes (for IDE / external integration) ───────────────

import time

_active_canvas_node = None
_canvas_nodes_cache = {}

@server.PromptServer.instance.routes.get("/zombiehaus/canvas/active_node")
async def get_active_canvas_node_endpoint(request):
    """API endpoint to get the currently active / selected ZombiehausTextEditor canvas node."""
    try:
        nodes_list = list(_canvas_nodes_cache.values())
        return web.json_response({
            "success": True,
            "data": _active_canvas_node,
            "nodes": nodes_list
        })
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/canvas/set_active_node")
async def set_active_canvas_node_endpoint(request):
    """API endpoint for ComfyUI web frontend to report active / selected canvas node(s)."""
    global _active_canvas_node
    try:
        data = await request.json()
        node_id = str(data.get("id", ""))
        if node_id:
            node_info = {
                "id": node_id,
                "title": data.get("title", f"Text Editor #{node_id}"),
                "positive": data.get("positive", ""),
                "negative": data.get("negative", ""),
                "prompt_style": data.get("prompt_style", "Tags (SDXL / Pony)"),
                "is_selected": data.get("is_selected", True),
                "timestamp": time.time()
            }
            _canvas_nodes_cache[node_id] = node_info
            _active_canvas_node = node_info
        return web.json_response({"success": True, "active": _active_canvas_node})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/canvas/push_prompt")
async def push_prompt_to_canvas_endpoint(request):
    """API endpoint to push prompt text from IDE to active canvas node in ComfyUI."""
    try:
        data = await request.json()
        node_id = data.get("node_id")
        positive = data.get("positive", "")
        negative = data.get("negative")
        prompt_style = data.get("prompt_style")

        payload = {
            "node_id": str(node_id) if node_id else None,
            "positive": positive,
            "negative": negative,
            "prompt_style": prompt_style
        }

        # Broadcast event to ComfyUI web client via WebSocket
        server.PromptServer.instance.send_sync("zombiehaus_canvas_push", payload)
        server.PromptServer.instance.send_sync("zombiehaus_canvas_push", payload)

        # Update cache if node is known
        if _active_canvas_node:
            _active_canvas_node["positive"] = positive
            if negative is not None:
                _active_canvas_node["negative"] = negative
            if prompt_style:
                _active_canvas_node["prompt_style"] = prompt_style

        return web.json_response({"success": True, "message": "Prompt pushed to canvas node via WebSocket"})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

import shutil

_auto_migration_done = False

def _auto_migrate_saved_directories():
    """
    Automatically creates subdirectories:
      saved_prompts/prompts/
      saved_prompts/songs/
      saved_prompts/songs/tags/
      saved_prompts/songs/lyrics/
    And migrates any existing files from root saved_prompts/ and legacy saved_songs/
    into their dedicated subdirectories.
    """
    global _auto_migration_done
    if _auto_migration_done:
        return
    _auto_migration_done = True

    try:
        from .config import settings, BASE_DIR
        prompts_dir = settings.get('prompts_save_directory', '').strip()
        if not prompts_dir:
            prompts_dir = os.path.join(BASE_DIR, 'saved_prompts')

        prompts_subdir = os.path.join(prompts_dir, 'prompts')
        songs_subdir = os.path.join(prompts_dir, 'songs')
        tags_subdir = os.path.join(songs_subdir, 'tags')
        lyrics_subdir = os.path.join(songs_subdir, 'lyrics')
        functions_subdir = os.path.join(prompts_dir, 'functions')

        # Ensure all subdirectories exist
        os.makedirs(prompts_subdir, exist_ok=True)
        os.makedirs(songs_subdir, exist_ok=True)
        os.makedirs(tags_subdir, exist_ok=True)
        os.makedirs(lyrics_subdir, exist_ok=True)
        os.makedirs(functions_subdir, exist_ok=True)

        # 1. Migrate loose files directly in saved_prompts/
        if os.path.isdir(prompts_dir):
            for item in os.listdir(prompts_dir):
                item_path = os.path.join(prompts_dir, item)
                if not os.path.isfile(item_path):
                    continue

                if item.endswith('.json'):
                    is_song = False
                    try:
                        with open(item_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        if data.get('type') in ('song', 'ace_song') or 'lyrics' in data:
                            is_song = True
                    except Exception:
                        pass

                    dest_dir = songs_subdir if is_song else prompts_subdir
                    dest_file = os.path.join(dest_dir, item)
                    if not os.path.exists(dest_file):
                        shutil.move(item_path, dest_file)
                        print(f"[Zombiehaus] Auto-migrated {item} -> {os.path.basename(dest_dir)}/")

        # 2. Migrate legacy saved_songs/ if present
        legacy_songs_dir = os.path.join(BASE_DIR, 'saved_songs')
        if os.path.isdir(legacy_songs_dir):
            # Songs JSONs
            for item in os.listdir(legacy_songs_dir):
                item_path = os.path.join(legacy_songs_dir, item)
                if os.path.isfile(item_path) and item.endswith('.json'):
                    dest_file = os.path.join(songs_subdir, item)
                    if not os.path.exists(dest_file):
                        shutil.move(item_path, dest_file)
                        print(f"[Zombiehaus] Auto-migrated legacy song {item} -> songs/")

            # Legacy tags
            legacy_tags = os.path.join(legacy_songs_dir, 'tags')
            if os.path.isdir(legacy_tags):
                for item in os.listdir(legacy_tags):
                    item_path = os.path.join(legacy_tags, item)
                    if os.path.isfile(item_path) and item.endswith('.txt'):
                        dest_file = os.path.join(tags_subdir, item)
                        if not os.path.exists(dest_file):
                            shutil.move(item_path, dest_file)
                            print(f"[Zombiehaus] Auto-migrated legacy tag {item} -> songs/tags/")

            # Legacy lyrics
            legacy_lyrics = os.path.join(legacy_songs_dir, 'lyrics')
            if os.path.isdir(legacy_lyrics):
                for item in os.listdir(legacy_lyrics):
                    item_path = os.path.join(legacy_lyrics, item)
                    if os.path.isfile(item_path) and item.endswith('.txt'):
                        dest_file = os.path.join(lyrics_subdir, item)
                        if not os.path.exists(dest_file):
                            shutil.move(item_path, dest_file)
                            print(f"[Zombiehaus] Auto-migrated legacy lyric {item} -> songs/lyrics/")

    except Exception as e:
        print(f"[Zombiehaus] Error during auto-migration: {e}")

def _get_base_prompts_dir():
    """Return the root prompts save directory, running auto-migration first."""
    _auto_migrate_saved_directories()
    from .config import settings, BASE_DIR
    prompts_dir = settings.get('prompts_save_directory', '').strip()
    if not prompts_dir:
        prompts_dir = os.path.join(BASE_DIR, 'saved_prompts')
    os.makedirs(prompts_dir, exist_ok=True)
    return prompts_dir

def _get_prompts_dir():
    """Return the prompts subdirectory under saved_prompts (e.g. saved_prompts/prompts)."""
    prompts_subdir = os.path.join(_get_base_prompts_dir(), 'prompts')
    os.makedirs(prompts_subdir, exist_ok=True)
    return prompts_subdir

def _get_songs_dir():
    """Return the songs subdirectory under saved_prompts (e.g. saved_prompts/songs)."""
    from .config import settings, BASE_DIR
    songs_dir = settings.get("songs_save_directory", "").strip()
    if not songs_dir:
        songs_dir = os.path.join(_get_base_prompts_dir(), "songs")
    os.makedirs(songs_dir, exist_ok=True)
    return songs_dir

@server.PromptServer.instance.routes.post("/zombiehaus/save_prompt")
async def save_prompt_endpoint(request):
    """API endpoint to save a text prompt to a JSON file in saved_prompts/prompts/."""
    try:
        data = await request.json()
        filename = data.get("filename", "").strip()
        category = data.get("category", "").strip()
        positive = data.get("positive", "")
        negative = data.get("negative", "")

        if not filename:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})

        # Sanitize filename to prevent directory traversal
        filename = os.path.basename(filename)
        # Strip legacy .txt extension and ensure .json
        if filename.endswith('.txt'):
            filename = filename[:-4]
        if not filename.endswith('.json'):
            filename += '.json'

        prompts_dir = _get_prompts_dir()
        file_path = os.path.join(prompts_dir, filename)
        prompt_data = {"type": data.get("type", "prompt") or "prompt", "category": category, "positive": positive, "negative": negative}
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(prompt_data, f, ensure_ascii=False, indent=2)

        print(f"[Zombiehaus TextEditor] Saved prompt to: {file_path}")
        return web.json_response({"success": True, "message": f"Prompt saved as {filename}"})
    except Exception as e:
        msg = f"Error saving prompt: {e}"
        print(f"[Zombiehaus TextEditor] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.post("/zombiehaus/load_prompt")
async def load_prompt_endpoint(request):
    """API endpoint to load a text prompt from JSON (checks prompts/, root saved_prompts/, and songs/)."""
    try:
        data = await request.json()
        filename = data.get("filename", "").strip()

        if not filename:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})

        filename = os.path.basename(filename)

        # Check in prompts/ subdirectory first, then root saved_prompts/, then songs/
        candidate_paths = [
            os.path.join(_get_prompts_dir(), filename),
            os.path.join(_get_base_prompts_dir(), filename),
            os.path.join(_get_songs_dir(), filename)
        ]
        file_path = next((p for p in candidate_paths if os.path.exists(p)), None)

        if not file_path:
            return web.json_response({"success": False, "message": f"File '{filename}' not found."})

        with open(file_path, 'r', encoding='utf-8') as f:
            prompt_data = json.load(f)

        # Seamlessly support all text node JSON formats
        positive_val = prompt_data.get("positive", "")
        if not positive_val:
            if "lyrics" in prompt_data and "tags" in prompt_data:
                positive_val = f"{prompt_data.get('tags', '')}\n\n{prompt_data.get('lyrics', '')}".strip()
            elif "lyrics" in prompt_data:
                positive_val = prompt_data.get("lyrics", "")
            elif "text" in prompt_data:
                positive_val = prompt_data.get("text", "")

        negative_val = prompt_data.get("negative", "")
        if not negative_val and "negative_style" in prompt_data:
            negative_val = prompt_data.get("negative_style", "")

        print(f"[Zombiehaus TextEditor] Loaded prompt from: {file_path}")
        return web.json_response({
            "success": True,
            "data": {
                "category": prompt_data.get("category", ""),
                "positive": positive_val,
                "negative": negative_val,
                "type": prompt_data.get("type", "prompt"),
                **prompt_data
            }
        })
    except Exception as e:
        msg = f"Error loading prompt: {e}"
        print(f"[Zombiehaus TextEditor] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.get("/zombiehaus/list_prompts")
async def list_prompts_endpoint(request):
    """API endpoint to list all saved prompts across prompts/, root saved_prompts/, and songs/."""
    try:
        seen = set()
        prompts = []

        # Check directories in order of priority: prompts/ subdir, root saved_prompts/, songs/
        scan_dirs = [_get_prompts_dir(), _get_base_prompts_dir(), _get_songs_dir()]
        for d in scan_dirs:
            if os.path.isdir(d):
                for filename in sorted(f for f in os.listdir(d) if f.endswith('.json')):
                    if filename in seen:
                        continue
                    seen.add(filename)
                    category = ""
                    file_type = "prompt"
                    try:
                        file_path = os.path.join(d, filename)
                        with open(file_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        category = data.get('category', '') or ''
                        file_type = data.get('type', 'prompt') or 'prompt'
                    except Exception:
                        pass
                    prompts.append({"filename": filename, "category": category, "type": file_type})

        return web.json_response({"success": True, "data": prompts})
    except Exception as e:
        msg = f"Error listing prompts: {e}"
        print(f"[Zombiehaus TextEditor] {msg}")
        return web.json_response({"success": False, "message": msg})

# ── Wildcard / List Curator routes ──────────────────────────────────────────

def _get_wildcards_dir():
    """Return the wildcards directory under saved_prompts (strictly isolated)."""
    wc_dir = os.path.join(_get_base_prompts_dir(), 'wildcards')
    os.makedirs(wc_dir, exist_ok=True)
    return wc_dir

@server.PromptServer.instance.routes.get("/zombiehaus/wildcards/list")
async def list_wildcards_endpoint(request):
    """API endpoint to list all wildcard .txt files in saved_prompts/wildcards/."""
    try:
        wc_dir = _get_wildcards_dir()
        files = []
        if os.path.isdir(wc_dir):
            for f in sorted(os.listdir(wc_dir)):
                if f.lower().endswith('.txt') and os.path.isfile(os.path.join(wc_dir, f)):
                    files.append(os.path.splitext(f)[0])
        return web.json_response({"success": True, "data": files})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/wildcards/load")
async def load_wildcard_endpoint(request):
    """API endpoint to load the text lines of a wildcard file."""
    try:
        data = await request.json()
        raw_name = data.get("filename", "").strip()
        if raw_name.startswith("__") and raw_name.endswith("__") and len(raw_name) > 4:
            raw_name = raw_name[2:-2].strip()
        name = os.path.basename(raw_name)
        if not name:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})
        if not name.endswith(".txt"):
            name += ".txt"
        file_path = os.path.join(_get_wildcards_dir(), name)
        if not os.path.isfile(file_path):
            return web.json_response({"success": False, "message": f"File '{name}' not found."})
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return web.json_response({"success": True, "data": content, "filename": os.path.splitext(name)[0]})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/wildcards/save")
async def save_wildcard_endpoint(request):
    """API endpoint to save or update a wildcard .txt file in saved_prompts/wildcards/."""
    try:
        data = await request.json()
        raw_name = data.get("filename", "").strip()
        if raw_name.startswith("__") and raw_name.endswith("__") and len(raw_name) > 4:
            raw_name = raw_name[2:-2].strip()
        name = os.path.basename(raw_name)
        content = data.get("content", "")
        if not name:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})
        if not name.endswith(".txt"):
            name += ".txt"
        file_path = os.path.join(_get_wildcards_dir(), name)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[Zombiehaus ListCurator] Saved wildcard file: {file_path}")
        return web.json_response({"success": True, "message": f"Saved {name}", "filename": os.path.splitext(name)[0]})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/wildcards/delete")
async def delete_wildcard_endpoint(request):
    """API endpoint to delete a wildcard .txt file from saved_prompts/wildcards/."""
    try:
        data = await request.json()
        raw_name = data.get("filename", "").strip()
        if raw_name.startswith("__") and raw_name.endswith("__") and len(raw_name) > 4:
            raw_name = raw_name[2:-2].strip()
        name = os.path.basename(raw_name)
        if not name:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})
        if not name.endswith(".txt"):
            name += ".txt"
        file_path = os.path.join(_get_wildcards_dir(), name)
        if os.path.isfile(file_path):
            os.remove(file_path)
            print(f"[Zombiehaus ListCurator] Deleted wildcard file: {file_path}")
            return web.json_response({"success": True, "message": f"Deleted {name}"})
        return web.json_response({"success": False, "message": f"File '{name}' not found."})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

# ── Function Library routes ─────────────────────────────────────────────────

def _get_functions_dir():
    fn_dir = os.path.join(_get_base_prompts_dir(), 'functions')
    os.makedirs(fn_dir, exist_ok=True)
    return fn_dir

@server.PromptServer.instance.routes.get("/zombiehaus/functions/list")
async def list_functions_endpoint(request):
    """API endpoint to list all .mf and .txt function files in saved_prompts/functions/."""
    try:
        fn_dir = _get_functions_dir()
        files = []
        if os.path.isdir(fn_dir):
            for f in sorted(os.listdir(fn_dir)):
                if (f.lower().endswith('.mf') or f.lower().endswith('.txt')) and os.path.isfile(os.path.join(fn_dir, f)):
                    files.append(os.path.splitext(f)[0])
        return web.json_response({"success": True, "data": files})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/functions/load")
async def load_function_endpoint(request):
    """API endpoint to load the code of a function file."""
    try:
        data = await request.json()
        raw_name = data.get("filename", "").strip()
        name = os.path.basename(raw_name)
        if not name:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})
        fn_dir = _get_functions_dir()
        file_path = None
        for ext in (".mf", ".txt"):
            cand = os.path.join(fn_dir, f"{os.path.splitext(name)[0]}{ext}")
            if os.path.isfile(cand):
                file_path = cand
                break
        if not file_path:
            return web.json_response({"success": False, "message": f"Function file '{name}' not found."})
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return web.json_response({"success": True, "data": content, "filename": os.path.splitext(os.path.basename(file_path))[0]})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/functions/save")
async def save_function_endpoint(request):
    """API endpoint to save or update a function file in saved_prompts/functions/."""
    try:
        data = await request.json()
        raw_name = data.get("filename", "").strip()
        name = os.path.basename(raw_name)
        content = data.get("content", "")
        if not name:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})
        base_name = os.path.splitext(name)[0]
        ext = os.path.splitext(name)[1]
        if ext.lower() not in (".mf", ".txt"):
            ext = ".mf"
        file_path = os.path.join(_get_functions_dir(), f"{base_name}{ext}")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[Zombiehaus FunctionEditor] Saved function file: {file_path}")
        return web.json_response({"success": True, "message": f"Saved {base_name}{ext}", "filename": base_name})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/functions/delete")
async def delete_function_endpoint(request):
    """API endpoint to delete a function file from saved_prompts/functions/."""
    try:
        data = await request.json()
        raw_name = data.get("filename", "").strip()
        name = os.path.basename(raw_name)
        if not name:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})
        fn_dir = _get_functions_dir()
        deleted = False
        for ext in (".mf", ".txt"):
            cand = os.path.join(fn_dir, f"{os.path.splitext(name)[0]}{ext}")
            if os.path.isfile(cand):
                os.remove(cand)
                deleted = True
                print(f"[Zombiehaus FunctionEditor] Deleted function file: {cand}")
        if deleted:
            return web.json_response({"success": True, "message": f"Deleted {name}"})
        return web.json_response({"success": False, "message": f"File '{name}' not found."})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

# ── Syntax Highlighting Themes routes ───────────────────────────────────────

def _get_syntax_themes_path():
    """Return path to syntax_themes.json (checking saved_prompts, then root, auto-creating from example if missing)."""
    from .config import BASE_DIR
    custom_path = os.path.join(_get_base_prompts_dir(), 'syntax_themes.json')
    if os.path.isfile(custom_path):
        return custom_path
    root_path = os.path.join(BASE_DIR, 'syntax_themes.json')
    if os.path.isfile(root_path):
        return root_path

    # Auto-create syntax_themes.json from syntax_themes.json.example
    example_path = os.path.join(BASE_DIR, 'syntax_themes.json.example')
    if os.path.isfile(example_path):
        try:
            shutil.copyfile(example_path, root_path)
            return root_path
        except Exception:
            return example_path
    return root_path

@server.PromptServer.instance.routes.get("/zombiehaus/syntax_themes")
async def get_syntax_themes_endpoint(request):
    """API endpoint to get syntax highlighting color themes."""
    try:
        path = _get_syntax_themes_path()
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return web.json_response({"success": True, "data": data})
        return web.json_response({"success": False, "message": "Theme file not found"})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.post("/zombiehaus/syntax_themes/save")
async def save_syntax_themes_endpoint(request):
    """API endpoint to save or update syntax highlighting themes."""
    try:
        data = await request.json()
        path = _get_syntax_themes_path()
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return web.json_response({"success": True, "message": "Themes updated"})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

# ── Song Writer routes ─────────────────────────────────────────────────────────

@server.PromptServer.instance.routes.get("/zombiehaus/song/list")
async def song_writer_list(request):
    """API endpoint to list all saved songs across songs/, root saved_prompts/, and legacy saved_songs/."""
    try:
        from .config import BASE_DIR
        legacy_dir = os.path.join(BASE_DIR, "saved_songs")
        scan_dirs = [_get_songs_dir(), _get_base_prompts_dir(), legacy_dir]

        seen = set()
        songs = []
        for d in scan_dirs:
            if os.path.isdir(d):
                for filename in sorted(f for f in os.listdir(d) if f.endswith(".json")):
                    if filename in seen:
                        continue
                    category = "Song"
                    title = ""
                    try:
                        file_path = os.path.join(d, filename)
                        with open(file_path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        category = data.get("category", "") or "Song"
                        title = data.get("title", "")
                        is_song = data.get("type") in ("song", "ace_song") or "lyrics" in data
                        if not is_song:
                            continue
                    except Exception:
                        pass
                    seen.add(filename)
                    songs.append({"filename": filename, "category": category, "title": title})
        return web.json_response({"success": True, "data": songs})
    except Exception as e:
        msg = f"Error listing songs: {e}"
        print(f"[Zombiehaus SongWriter] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.post("/zombiehaus/song/save")
async def song_writer_save(request):
    """API endpoint to save a song JSON file into saved_prompts/songs/."""
    try:
        data = await request.json()
        filename = data.get("filename", "").strip()
        if not filename:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})

        filename = os.path.basename(filename)
        if not filename.endswith(".json"):
            filename += ".json"

        songs_dir = _get_songs_dir()
        file_path = os.path.join(songs_dir, filename)

        song_payload = {
            "type": "song",
            "category": data.get("category", "Song") or "Song",
            "title": data.get("title", ""),
            "genre": data.get("genre", ""),
            "vocal_style": data.get("vocal_style", ""),
            "mood": data.get("mood", ""),
            "template": data.get("template", ""),
            "lyrics": data.get("lyrics", ""),
            "additional_style": data.get("additional_style", ""),
            "negative_style": data.get("negative_style", "")
        }

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(song_payload, f, ensure_ascii=False, indent=2)

        print(f"[Zombiehaus SongWriter] Saved song to: {file_path}")
        return web.json_response({"success": True, "message": f"Song saved as {filename}"})
    except Exception as e:
        msg = f"Error saving song: {e}"
        print(f"[Zombiehaus SongWriter] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.post("/zombiehaus/song/load")
async def song_writer_load(request):
    """API endpoint to load a song JSON file from songs/, root saved_prompts/, or legacy saved_songs/."""
    try:
        data = await request.json()
        filename = data.get("filename", "").strip()
        if not filename:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})

        filename = os.path.basename(filename)
        from .config import BASE_DIR
        candidate_paths = [
            os.path.join(_get_songs_dir(), filename),
            os.path.join(_get_base_prompts_dir(), filename),
            os.path.join(BASE_DIR, "saved_songs", filename)
        ]
        file_path = next((p for p in candidate_paths if os.path.exists(p)), None)

        if not file_path:
            return web.json_response({"success": False, "message": f"Song file '{filename}' not found."})

        with open(file_path, "r", encoding="utf-8") as f:
            song_data = json.load(f)

        return web.json_response({"success": True, "data": song_data})
    except Exception as e:
        msg = f"Error loading song: {e}"
        print(f"[Zombiehaus SongWriter] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.get("/zombiehaus/ace_audio/list")
async def ace_audio_list(request):
    """API endpoint to list all saved song files."""
    try:
        from .config import BASE_DIR
        scan_dirs = [_get_songs_dir(), _get_base_prompts_dir(), os.path.join(BASE_DIR, "saved_songs")]
        seen = set()
        files = []
        for d in scan_dirs:
            if os.path.isdir(d):
                for f in sorted(os.listdir(d)):
                    if f.endswith(".json") and f not in seen:
                        seen.add(f)
                        files.append(f)
        return web.json_response({"success": True, "data": files})
    except Exception as e:
        msg = f"Error listing songs: {e}"
        print(f"[Zombiehaus AceStepAudio] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.post("/zombiehaus/ace_audio/save")
async def ace_audio_save(request):
    """API endpoint to save tags and lyrics as a JSON song file in saved_prompts/songs/."""
    try:
        data = await request.json()
        filename = data.get("filename", "").strip()
        title = data.get("title", "")
        tags = data.get("tags", "")
        lyrics = data.get("lyrics", "")
        category = data.get("category", "Song") or "Song"

        if not filename:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})

        filename = os.path.basename(filename)
        if not filename.endswith(".json"):
            filename += ".json"

        songs_dir = _get_songs_dir()
        file_path = os.path.join(songs_dir, filename)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"type": "ace_song", "category": category, "title": title, "tags": tags, "lyrics": lyrics}, f, ensure_ascii=False, indent=2)

        print(f"[Zombiehaus AceStepAudio] Saved song to: {file_path}")
        return web.json_response({"success": True, "message": f"Song saved as {filename}"})
    except Exception as e:
        msg = f"Error saving song: {e}"
        print(f"[Zombiehaus AceStepAudio] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.post("/zombiehaus/ace_audio/load")
async def ace_audio_load(request):
    """API endpoint to load tags and lyrics from a JSON song file."""
    try:
        data = await request.json()
        filename = data.get("filename", "").strip()

        if not filename:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})

        filename = os.path.basename(filename)
        from .config import BASE_DIR
        candidate_paths = [
            os.path.join(_get_songs_dir(), filename),
            os.path.join(_get_base_prompts_dir(), filename),
            os.path.join(BASE_DIR, "saved_songs", filename)
        ]
        file_path = next((p for p in candidate_paths if os.path.exists(p)), None)

        if not file_path:
            return web.json_response({"success": False, "message": f"Song file '{filename}' not found."})

        with open(file_path, "r", encoding="utf-8") as f:
            song_data = json.load(f)

        return web.json_response({"success": True, "data": song_data})
    except Exception as e:
        msg = f"Error loading song: {e}"
        print(f"[Zombiehaus AceStepAudio] {msg}")
        return web.json_response({"success": False, "message": msg})

# ── Individual tags routes ────────────────────────────────────────────────────

@server.PromptServer.instance.routes.get("/zombiehaus/ace_audio/list_tags")
async def ace_audio_list_tags(request):
    """API endpoint to list all saved tags files."""
    try:
        tags_dir = os.path.join(_get_songs_dir(), "tags")
        os.makedirs(tags_dir, exist_ok=True)
        files = sorted(f for f in os.listdir(tags_dir) if f.endswith(".txt"))
        return web.json_response({"success": True, "data": files})
    except Exception as e:
        msg = f"Error listing tags: {e}"
        print(f"[Zombiehaus AceStepAudio] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.post("/zombiehaus/ace_audio/save_tags")
async def ace_audio_save_tags(request):
    """API endpoint to save tags as a .txt file."""
    try:
        data = await request.json()
        filename = data.get("filename", "").strip()
        tags = data.get("tags", "")
        if not filename:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})
        filename = os.path.basename(filename)
        if not filename.endswith(".txt"):
            filename += ".txt"
        tags_dir = os.path.join(_get_songs_dir(), "tags")
        os.makedirs(tags_dir, exist_ok=True)
        with open(os.path.join(tags_dir, filename), "w", encoding="utf-8") as f:
            f.write(tags)
        print(f"[Zombiehaus AceStepAudio] Saved tags: {filename}")
        return web.json_response({"success": True, "message": f"Tags saved as {filename}"})
    except Exception as e:
        msg = f"Error saving tags: {e}"
        print(f"[Zombiehaus AceStepAudio] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.post("/zombiehaus/ace_audio/load_tags")
async def ace_audio_load_tags(request):
    """API endpoint to load tags from a .txt file."""
    try:
        data = await request.json()
        filename = os.path.basename(data.get("filename", "").strip())
        if not filename:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})
        tags_dir = os.path.join(_get_songs_dir(), "tags")
        file_path = os.path.join(tags_dir, filename)
        if not os.path.exists(file_path):
            return web.json_response({"success": False, "message": f"Tags file '{filename}' not found."})
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return web.json_response({"success": True, "data": content})
    except Exception as e:
        msg = f"Error loading tags: {e}"
        print(f"[Zombiehaus AceStepAudio] {msg}")
        return web.json_response({"success": False, "message": msg})

# ── Individual lyrics routes ──────────────────────────────────────────────────

@server.PromptServer.instance.routes.get("/zombiehaus/ace_audio/list_lyrics")
async def ace_audio_list_lyrics(request):
    """API endpoint to list all saved lyrics files."""
    try:
        lyrics_dir = os.path.join(_get_songs_dir(), "lyrics")
        os.makedirs(lyrics_dir, exist_ok=True)
        files = sorted(f for f in os.listdir(lyrics_dir) if f.endswith(".txt"))
        return web.json_response({"success": True, "data": files})
    except Exception as e:
        msg = f"Error listing lyrics: {e}"
        print(f"[Zombiehaus AceStepAudio] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.post("/zombiehaus/ace_audio/save_lyrics")
async def ace_audio_save_lyrics(request):
    """API endpoint to save lyrics as a .txt file."""
    try:
        data = await request.json()
        filename = data.get("filename", "").strip()
        lyrics = data.get("lyrics", "")
        if not filename:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})
        filename = os.path.basename(filename)
        if not filename.endswith(".txt"):
            filename += ".txt"
        lyrics_dir = os.path.join(_get_songs_dir(), "lyrics")
        os.makedirs(lyrics_dir, exist_ok=True)
        with open(os.path.join(lyrics_dir, filename), "w", encoding="utf-8") as f:
            f.write(lyrics)
        print(f"[Zombiehaus AceStepAudio] Saved lyrics: {filename}")
        return web.json_response({"success": True, "message": f"Lyrics saved as {filename}"})
    except Exception as e:
        msg = f"Error saving lyrics: {e}"
        print(f"[Zombiehaus AceStepAudio] {msg}")
        return web.json_response({"success": False, "message": msg})

@server.PromptServer.instance.routes.post("/zombiehaus/ace_audio/load_lyrics")
async def ace_audio_load_lyrics(request):
    """API endpoint to load lyrics from a .txt file."""
    try:
        data = await request.json()
        filename = os.path.basename(data.get("filename", "").strip())
        if not filename:
            return web.json_response({"success": False, "message": "Filename cannot be empty."})
        lyrics_dir = os.path.join(_get_songs_dir(), "lyrics")
        file_path = os.path.join(lyrics_dir, filename)
        if not os.path.exists(file_path):
            return web.json_response({"success": False, "message": f"Lyrics file '{filename}' not found."})
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return web.json_response({"success": True, "data": content})
    except Exception as e:
        msg = f"Error loading lyrics: {e}"
        print(f"[Zombiehaus AceStepAudio] {msg}")
        return web.json_response({"success": False, "message": msg})

def calculate_sha256(file_path, chunk_size=1024*1024):
    """Calculates the SHA256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while True:
            data = f.read(chunk_size)
            if not data:
                break
            sha256.update(data)
    return sha256.hexdigest().upper()

def _get_model_type(name: str, definitions: list) -> str:
    """A simple heuristic to determine the general type of a model file or metadata string based on definitions."""
    if not name or not isinstance(name, str):
        return 'unknown'
    
    lower_name = name.lower()
    
    for definition in definitions:
        model_type = definition.get("type")
        if not model_type:
            continue
        for keyword in definition.get("keywords", []):
            if keyword.lower() in lower_name:
                return model_type
    
    return re.split(r'[\s._-]', lower_name)[0] or 'unknown'

@server.PromptServer.instance.routes.get("/zombiehaus/get_lora_civitai_info")
async def get_lora_civitai_info(request):
    """API endpoint to get LoRA info from Civitai by file hash."""
    lora_name = request.query.get("name")
    api_key_from_request = request.query.get("api_key")
    if not lora_name:
        return web.json_response({"success": False, "message": "LoRA name not provided"})

    try:
        # Use ComfyUI's built-in file resolver which is more reliable.
        # Use the same logic as the node itself to find the LoRA file path.
        lora_paths_list = folder_paths.get_filename_list("loras")
        lora_file_relative = ZombiehausLoraLoader.find_lora_path(lora_name, lora_paths_list)

        if not lora_file_relative:
            msg = f"LoRA file not found for: {lora_name}"
            print(f"[Zombiehaus LoRA Deck] Civitai Info: {msg}")
            return web.json_response({"success": False, "message": msg})

        lora_path = folder_paths.get_full_path("loras", lora_file_relative)
        if not lora_path or not os.path.exists(lora_path):
            msg = f"LoRA file path could not be resolved for: {lora_file_relative}"
            print(f"[Zombiehaus LoRA Deck] Civitai Info: {msg}")
            return web.json_response({"success": False, "message": msg})

        file_hash = calculate_sha256(lora_path)
        civitai_api_url = f"https://civitai.com/api/v1/model-versions/by-hash/{file_hash}"

        headers = {}
        # Prioritize API key from the request, fall back to config file.
        api_key = api_key_from_request or settings.get("civitai_api_key")
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        response = requests.get(civitai_api_url, timeout=15, headers=headers)

        if response.status_code == 404:
            return web.json_response({"success": False, "message": "Model not found on Civitai with this hash."})

        response.raise_for_status()
        data = response.json()

        if not isinstance(data, dict):
            print(f"[Zombiehaus LoRA Deck] Civitai API did not return a JSON object for hash: {file_hash}")
            return web.json_response({"success": False, "message": "Invalid response from Civitai API (not a JSON object)."})

        model_data = data.get("model", {})
        # Ensure model_data is a dictionary, default to empty if it's None or something else
        if not isinstance(model_data, dict):
            print(f"[Zombiehaus LoRA Deck] Civitai API returned a non-dict 'model' field for hash: {file_hash}. Response: {data}")
            model_data = {} # Default to empty dict to prevent errors
        
        # More robustly check for model_id, preferring the top-level one.
        # This avoids issues with falsy values like 0.
        model_id = data.get("modelId")
        if model_id is None:
            model_id = model_data.get("id")

        if model_id is None:
            print(f"[Zombiehaus LoRA Deck] Civitai API returned a response without a model ID for hash: {file_hash}")
            return web.json_response({"success": False, "message": "Model found, but the Civitai API response was missing a model ID. Check console for details."})

        info = {
            "modelId": model_id,
            "modelName": model_data.get("name"),
            "creator": model_data.get("creator", {}).get("username"),
            "trainedWords": data.get("trainedWords", []),
            "description": model_data.get("description"),
            "images": [img.get("url") for img in data.get("images", []) if img.get("url")]
        }
        return web.json_response({"success": True, "data": info})
    except requests.exceptions.RequestException as e:
        return web.json_response({"success": False, "message": f"Failed to connect to Civitai: {e}"})
    except Exception as e:
        return web.json_response({"success": False, "message": f"An unexpected error occurred: {e}"})

@server.PromptServer.instance.routes.get("/zombiehaus/get_lora_metadata")
async def get_lora_metadata(request):
    """API endpoint to get metadata and a preview image from a specific LoRA file."""
    lora_name = request.query.get("name")
    base_model_name = request.query.get("base_model_name")
    if not lora_name:
        return web.json_response({"success": False, "message": "LoRA name not provided"})

    try:
        # Use the same logic as the node itself to find the LoRA file path.
        lora_paths_list = folder_paths.get_filename_list("loras")
        lora_file_relative = ZombiehausLoraLoader.find_lora_path(lora_name, lora_paths_list)

        if not lora_file_relative:
            msg = f"LoRA file not found for: {lora_name}"
            print(f"[Zombiehaus LoRA Deck] Local Metadata: {msg}")
            return web.json_response({"success": False, "message": msg})

        lora_path = folder_paths.get_full_path("loras", lora_file_relative)
        if not lora_path or not os.path.exists(lora_path):
            msg = f"LoRA file path could not be resolved for: {lora_file_relative}"
            print(f"[Zombiehaus LoRA Deck] Local Metadata: {msg}")
            return web.json_response({"success": False, "message": msg})

        # --- Extract Safetensors Metadata ---
        metadata = {}
        if lora_path.lower().endswith(".safetensors"):
            with safetensors.safe_open(lora_path, framework="pt", device="cpu") as f:
                metadata = f.metadata() or {}
        else:
            print(f"[Zombiehaus LoRA Deck] Skipped metadata check for non-safetensors file: {lora_name}")

        parsed_metadata = {}
        for key, value in metadata.items():
            try:
                parsed_metadata[key] = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                parsed_metadata[key] = value

        if not parsed_metadata:
            print(f"[Zombiehaus LoRA Deck] No metadata found in LoRA file: {lora_name}")

        # --- Find Preview Image ---
        preview_image_url = None

        # Priority 1: Check for embedded preview image in metadata (case-insensitive)
        if metadata:
            found_key = None
            # Search for standard preview keys, case-insensitively
            for key in metadata.keys():
                if key.lower() in ["ss_preview_image", "ss_preview"]:
                    found_key = key
                    break
            
            if found_key:
                base64_image = metadata[found_key]
                # Ensure we have a non-empty string before processing
                if base64_image and isinstance(base64_image, str):
                    if not base64_image.startswith('data:image'):
                        preview_image_url = f"data:image/png;base64,{base64_image}"
                    else:
                        preview_image_url = base64_image

        # Priority 2: Fallback to finding an external file if no embedded one was found
        if not preview_image_url:
            lora_file_relative_no_ext, _ = os.path.splitext(lora_file_relative)
            for ext in ['.png', '.jpg', '.jpeg', '.webp']:
                potential_preview_relative = lora_file_relative_no_ext + ext
                full_preview_path = folder_paths.get_full_path("loras", potential_preview_relative)
                if full_preview_path and os.path.exists(full_preview_path):
                    # Correctly split the path into subfolder and filename for the /view endpoint
                    subfolder, filename = os.path.split(potential_preview_relative)
                    preview_image_url = f"/view?filename={quote(filename)}&type=loras&subfolder={quote(subfolder)}"
                    break

        # --- Perform Validation ---
        validation = {"status": "unknown", "message": "Validation not performed."}
        if base_model_name and base_model_name != "None":
            lora_base_model_str = parsed_metadata.get("ss_base_model_version") or parsed_metadata.get("modelspec.architecture") or ""
            if not lora_base_model_str:
                validation = {"status": "unknown", "message": "No base model specified in LoRA metadata."}
            else:
                definitions = settings.get("base_model_definitions", [])
                lora_type = _get_model_type(lora_base_model_str, definitions)
                base_model_type = _get_model_type(base_model_name, definitions)

                if lora_type != 'unknown' and base_model_type != 'unknown' and lora_type != base_model_type:
                    validation = {
                        "status": "incompatible",
                        "message": f"Warning: LoRA base model ('{lora_type}') may not match selected base model ('{base_model_type}')."
                    }
                else:
                    validation = {
                        "status": "compatible",
                        "message": f"LoRA base model ('{lora_type}') appears compatible with selected base model ('{base_model_type}')."
                    }

        # --- Combine and Return ---
        final_data = {
            "local_metadata": parsed_metadata,
            "preview_image_url": preview_image_url,
            "validation": validation
        }
        return web.json_response({"success": True, "data": final_data})
    except Exception as e:
        print(f"[Zombiehaus LoRA Deck] Error reading metadata for '{lora_name}': {e}")
        return web.json_response({"success": False, "message": f"Could not read metadata. File may be corrupted or not a valid safetensors file. Error: {e}"})

@server.PromptServer.instance.routes.get("/zombiehaus/scry_model")
async def scry_model_endpoint(request):
    """API endpoint to scry model metadata, discovered training tags, and architecture heuristics."""
    try:
        source_type = request.query.get("source_type", "Diffusers")
        model_name = request.query.get("model_name", "")
        max_tags = int(request.query.get("max_tags", 40))
        min_freq = int(request.query.get("min_frequency", 5))

        file_path = resolve_model_file_path(source_type, model_name)
        if not file_path or not os.path.isfile(file_path):
            return web.json_response({"success": False, "message": f"Model file not found: {model_name} (Category: {source_type})"})

        data = inspect_safetensors_file(file_path, max_tags=max_tags, min_freq=min_freq)
        return web.json_response({"success": True, "data": data})
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.get("/zombiehaus/list_models")
async def list_models_endpoint(request):
    """API endpoint to list available models by category (diffusers, loras, checkpoints)."""
    try:
        return web.json_response({
            "success": True,
            "data": {
                "diffusers": get_diffusers_list(),
                "loras": get_loras_list(),
                "checkpoints": get_checkpoints_list()
            }
        })
    except Exception as e:
        return web.json_response({"success": False, "message": str(e)})

@server.PromptServer.instance.routes.get("/zombiehaus/web/{filename}")
async def serve_zombiehaus_web_file(request):
    filename = request.match_info.get("filename", "")
    web_dir = os.path.join(os.path.dirname(__file__), "web")
    filepath = os.path.normpath(os.path.join(web_dir, filename))
    if filepath.startswith(web_dir) and os.path.isfile(filepath):
        return web.FileResponse(filepath)
    return web.Response(status=404)

NODE_CLASS_MAPPINGS = {
    # Zombiehaus nodes
    "ZombiehausPromptRefiner": OllamaPromptRefinerNode,
    "ZombiehausImageForPrompting": ZombiehausImageForPromptingNode,
    "ZombiehausBatchKSampler": ZombiehausBatchKSampler,
    "ZombiehausLoraLoader": ZombiehausLoraLoader,
    "ZombiehausUpscaler": ZombiehausUpscaler,
    "ZombiehausKSampler": ZombiehausKSampler,
    "ZombiehausModelLoader": ZombiehausModelLoader,
    "ZombiehausMultiCLIPTextEncode": ZombiehausMultiCLIPTextEncode,
    "ZombiehausShowText": ZombiehausShowText,
    "ZombiehausTextEditor": ZombiehausTextEditor,
    "ZombiehausImageGallery": ZombiehausImageGallery,
    "ZombiehausLatentPreset": ZombiehausLatentPreset,
    "ZombiehausSaveAudio": ZombiehausSaveAudio,
    "ZombiehausAceStepAudio": ZombiehausAceStepAudio,
    "ZombiehausTextRefiner": OllamaTextRefinerNode,
    "ZombiehausSaveImage": ZombiehausSaveImage,
    "ZombiehausDetailerSlot": ZombiehausDetailerSlot,
    "ZombiehausAllInOneDetailer": ZombiehausAllInOneDetailer,
    "ZombiehausConditioningConcat": ZombiehausConditioningConcat,
    "ZombiehausRestormer": ZombiehausRestormer,
    "ZombiehausDynamicGuidance": ZombiehausDynamicGuidance,
    "ZombiehausDeWaxTextureRestore": ZombiehausDeWaxTextureRestore,
    "ZombiehausVideoLatent": ZombiehausVideoLatent,
    "ZombiehausSaveVideo": ZombiehausSaveVideo,
    "ZombiehausSongWriter": ZombiehausSongWriter,
    "ZombiehausAudioMixer": ZombiehausAudioMixer,
    "ZombiehausLoadImage": ZombiehausLoadImage,
    "ZombiehausVAEEncode": ZombiehausVAEEncode,
    "ZombiehausVAEDecode": ZombiehausVAEDecode,
    "ZombiehausFidelityController": ZombiehausFidelityController,
    "ZombiehausImg2ImgVAEEncode": ZombiehausImg2ImgVAEEncode,
    "ZombiehausControlNetLoader": ZombiehausControlNetLoader,
    "ZombiehausControlNetApply": ZombiehausControlNetApply,
    "ZombiehausControlNetAllInOne": ZombiehausControlNetAllInOne,
    "ZombiehausLatentUpscale": ZombiehausLatentUpscale,
    "ZombiehausMaskTools": ZombiehausMaskTools,
    "ZombiehausCompareImages": ZombiehausCompareImages,
    "ZombiehausListCurator": ZombiehausListCurator,
    "ZombiehausFunctionEditor": ZombiehausFunctionEditor,
    "ZombiehausModelUpscale": ZombiehausModelUpscale,
    "ZombiehausChromaShift": ZombiehausChromaShift,
    "ZombiehausPromptMixer": ZombiehausPromptMixer,
    "ZombiehausSeedController": ZombiehausSeedController,
    "ZombiehausImagePreprocessor": ZombiehausImagePreprocessor,
    "ZombiehausSmartResizer": ZombiehausSmartResizer,
    "ZombiehausImageScaleDownBy": ZombiehausImageScaleDownBy,
    "easy imageScaleDownBy": ZombiehausImageScaleDownBy,
    "ZombiehausFaceSwap": ZombiehausFaceSwap,
    "ZombiehausGlamourController": ZombiehausGlamourController,
    "ZombiehausStudioDirector": ZombiehausStudioDirector,
    "ZombiehausBackgroundReplacer": ZombiehausBackgroundReplacer,
    "ZombiehausStylePicker": ZombiehausStylePicker,
    "ZombiehausHiresFix": ZombiehausHiresFix,
    "ZombiehausExportCard": ZombiehausExportCard,
    "ZombiehausWardrobeInpaint": ZombiehausWardrobeInpaint,
    "ZombiehausPersonInpaint": ZombiehausPersonInpaint,
    "ZombiehausPersonaInteract": ZombiehausPersonaInteract,
    "ZombiehausDualPersonaDirector": ZombiehausDualPersonaDirector,
    "ZombiehausSceneScriptDirector": ZombiehausSceneScriptDirector,
    "ZombiehausPipeBus": ZombiehausPipeBus,
    "ZombiehausModelScryer": ZombiehausModelScryer,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    # Zombiehaus nodes
    "ZombiehausPromptRefiner": "Zombiehaus Ollama Prompt Refiner",
    "ZombiehausImageForPrompting": "Zombiehaus Image For Prompting",
    "ZombiehausBatchKSampler": "Zombiehaus Batch KSampler",
    "ZombiehausLoraLoader": "Zombiehaus LoRA Deck",
    "ZombiehausUpscaler": "Zombiehaus Upscaler",
    "ZombiehausKSampler": "Zombiehaus KSampler",
    "ZombiehausModelLoader": "Zombiehaus Model Loader",
    "ZombiehausMultiCLIPTextEncode": "Zombiehaus Multi-CLIP Text Encode",
    "ZombiehausShowText": "Zombiehaus ShowText",
    "ZombiehausTextEditor": "Zombiehaus Text Studio",
    "ZombiehausImageGallery": "Zombiehaus Image Gallery",
    "ZombiehausLatentPreset": "Zombiehaus Latent Preset",
    "ZombiehausSaveAudio": "Zombiehaus Save Audio",
    "ZombiehausAceStepAudio": "Zombiehaus ACE Step Audio 1.5",
    "ZombiehausTextRefiner": "Zombiehaus Ollama Text Refiner",
    "ZombiehausSaveImage": "Zombiehaus Save Image",
    "ZombiehausDetailerSlot": "Zombiehaus Detailer Slot",
    "ZombiehausAllInOneDetailer": "Zombiehaus All-in-One Detailer",
    "ZombiehausConditioningConcat": "Zombiehaus Conditioning Concat",
    "ZombiehausRestormer": "Zombiehaus Restormer",
    "ZombiehausDynamicGuidance": "Zombiehaus Dynamic Guidance",
    "ZombiehausDeWaxTextureRestore": "Zombiehaus De-Wax Texture Restore",
    "ZombiehausVideoLatent": "Zombiehaus Video Latent Preset",
    "ZombiehausSaveVideo": "Zombiehaus Save Video",
    "ZombiehausSongWriter": "Zombiehaus Song Writer & Lyric Studio",
    "ZombiehausAudioMixer": "Zombiehaus Audio Mixer & Video Sync",
    "ZombiehausLoadImage": "Zombiehaus Load Image",
    "ZombiehausVAEEncode": "Zombiehaus VAE Encode",
    "ZombiehausVAEDecode": "Zombiehaus VAE Decode",
    "ZombiehausFidelityController": "Zombiehaus Fidelity Controller",
    "ZombiehausImg2ImgVAEEncode": "Zombiehaus Img2Img VAE Encode",
    "ZombiehausControlNetLoader": "Zombiehaus ControlNet Loader",
    "ZombiehausControlNetApply": "Zombiehaus Apply ControlNet",
    "ZombiehausControlNetAllInOne": "Zombiehaus ControlNet All-in-One",
    "ZombiehausLatentUpscale": "Zombiehaus Latent Upscale",
    "ZombiehausMaskTools": "Zombiehaus Mask Tools",
    "ZombiehausCompareImages": "Zombiehaus Compare Images",
    "ZombiehausListCurator": "Zombiehaus List Curator",
    "ZombiehausFunctionEditor": "Zombiehaus Function Editor",
    "ZombiehausModelUpscale": "Zombiehaus Model Upscale",
    "ZombiehausChromaShift": "Zombiehaus Chroma Shift",
    "ZombiehausPromptMixer": "Zombiehaus Prompt Mixer",
    "ZombiehausSeedController": "Zombiehaus Master Seed",
    "ZombiehausImagePreprocessor": "Zombiehaus Image Preprocessor",
    "ZombiehausSmartResizer": "Zombiehaus Smart Resizer",
    "ZombiehausImageScaleDownBy": "Zombiehaus Image Scale Down By",
    "easy imageScaleDownBy": "Image Scale Down By (Zombiehaus)",
    "ZombiehausFaceSwap": "Zombiehaus Face Swapper",
    "ZombiehausGlamourController": "Zombiehaus Glamour & Body Sculptor",
    "ZombiehausStudioDirector": "Zombiehaus Virtual Studio Director",
    "ZombiehausBackgroundReplacer": "Zombiehaus Background Replacer",
    "ZombiehausStylePicker": "Zombiehaus Style & Aesthetic Picker",
    "ZombiehausHiresFix": "Zombiehaus All-in-One Hires Fix",
    "ZombiehausExportCard": "Zombiehaus Social Export Card",
    "ZombiehausWardrobeInpaint": "Zombiehaus Wardrobe Inpaint",
    "ZombiehausPersonInpaint": "Zombiehaus Person Inpaint & Interaction Director",
    "ZombiehausPersonaInteract": "Zombiehaus Persona Interact & Duo Director",
    "ZombiehausDualPersonaDirector": "Zombiehaus Dual Persona Director (Regional LoRA)",
    "ZombiehausSceneScriptDirector": "Zombiehaus Scene Script Director (N-Persona)",
    "ZombiehausPipeBus": "Zombiehaus Pipe Bus (Distribution)",
    "ZombiehausModelScryer": "Zombiehaus Model Scryer (WeightScryer)",
}

WEB_DIRECTORY = "./web"

# Initialize and auto-migrate saved directory structure
_auto_migrate_saved_directories()

print("✅ Zombiehaus Studio: Custom nodes loaded successfully.")