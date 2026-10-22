# Zombiehaus Studio Nodes

The **Zombiehaus Studio** family delivers all-in-one, zero-wiring flagship studio nodes designed to eliminate canvas spaghetti in ComfyUI while providing a tactile, tabbed modern UI and modular stage toggles across every generation and refinement step.

---

## The Studio Nodes

1. **`Zombiehaus Studio`** (`ZombiehausStudio`):
   - Universal all-in-one generation and refinement studio for **any** model architecture (Chroma, Flux, SDXL, Pony, SD 1.5, SD3.5).
   - Features in-node Model Profiles to instantly switch between model setups with a single click.
2. **`Zombiehaus Script Studio`** (`ZombiehausScriptStudio`):
   - Consolidates the complete multi-character screenplay director workflow into a single node.
   - Features in-node screenplay editing (`[SCENE]`, `[PERSONA 1..N]`, `[INTERACTION]`), regional spatial attention masks, and character-specific LoRA management with zero concept bleeding.

---

## Key Features

### 1. In-Node Model Profiles & Selection
- **Model Profiles**: Save and load complete model configurations (Checkpoint/UNet, CLIP, VAE, LoRAs, flow shift, and default sampler settings) stored in the user's ComfyUI profile directory (`user/default/zombiehaus/profiles/`).
- **One-Click Presets**: Instantly switch between setups like `Chroma 1-HD Photoreal`, `Flux.1 Dev Standard`, and `SDXL / Pony Anime`.
- **Universal Architecture**: Load monolithic checkpoints directly or configure standalone UNet diffusion models with precision `weight_dtype` (e.g. `fp8_e4m3fn`, `bf16`), dedicated CLIP text encoders (`t5xxl`, `clip_l`), and custom VAEs.
- **Dual LoRA Slots**: Dedicated dropdown slots for model LoRAs with independent strength sliders.
- **Inline `<lora:...>` Support**: Directly type `<lora:name:strength>` tags anywhere in your prompt or screenplay. They are parsed dynamically with automatic trigger-word injection.
- **External Overrides**: Optional `pipe`, `model`, `clip`, `vae`, and `latent_image` input connections allow seamless integration with existing upstream nodes whenever desired.

### 2. Dedicated Web Workstation & Canvas Integration
- **Standalone Studio Web Cockpit (`/zombiehaus/studio`)**:
  - Full-screen responsive 3-column creative workstation built for single-screen or dual-monitor setups.
  - Access via `http://127.0.0.1:8188/zombiehaus/studio`, the ComfyUI top menu bar (`🧟 Studio`), or the desktop launcher `Zombiehaus Studio.bat`.
  - **Unified Mode Switcher**:
    - **`🎬 Screenplay Director`**: Multi-character story script editor with `[SCENE]`, `[PERSONA 1..N]`, `[INTERACTION]`, variable autocomplete, persona LoRA isolation, and visual regional layout split preview.
    - **`✍️ Prompt Studio`**: Standard single-prompt generation with style tags, positive/negative editors, AI enhancement (`✨ Enhance` via Ollama), and one-click quality/anatomy guards.
- **Shared Model Engine & Modular Stages**:
  - Model Rack: Profiles, Checkpoint/UNet, VAE, CLIP, dual LoRAs, flow shift.
  - Modular Stages: Hi-Res Fix, Face/Eye Detailer, De-Wax, Restormer, and Upscale.
  - Real-time ComfyUI WebSocket connection with progress bars and live preview gallery.
- **Sleek On-Canvas Node Card**:
  - Raw LiteGraph canvas widgets are suppressed to eliminate 2,500px tall vertical widget towers on the graph.
  - Renders as a compact 440×240px card with active profile selector, status badges, quick `Queue Generation` button, and a prominent `🗖 OPEN STUDIO WORKSTATION` launcher.

### 3. Native 16-Channel Chroma Latents & Flow Matching
- **16-Channel Latent Creation**: Native support for 16-channel Chroma / Flux latents and 4-channel SDXL / Pony latents across all standard aspect ratios.
- **Resolution Timestep Shift**: Resolution-dependent flow-matching timestep scheduling for crisp convergence and fine micro-texture.
- **Dynamic Guidance**: Adaptive CFG scale decay curve across diffusion timesteps to eliminate plastic skin tones and oversaturation.

### 4. Modular Stage Toggles (Zero Overhead When Disabled)
Every post-generation stage features a dedicated boolean switch. When toggled off, that stage is completely bypassed with zero memory or compute penalty:
- **`enable_hires_fix`**: 2nd-pass latent upscale and resample with configurable scale, denoise, and steps.
- **`enable_detailer`**: Automatic multi-pass YOLO detection and regional inpainting for face, eyes, and hands.
- **`enable_dewax`**: High-pass frequency separation texture recovery and sensor grain injection to combat synthetic plastic look.
- **`enable_restormer`**: Neural restoration pass for real-world denoising and deblurring.
- **`enable_upscale`**: High-resolution model-based super-resolution upscale.

---

## Inputs & Outputs

### `Zombiehaus Studio`

#### Inputs
| Input | Type | Description |
|---|---|---|
| `profile` | COMBO | Saved model profile preset (`Chroma`, `Flux`, `Pony`, or custom) |
| `checkpoint_name` | COMBO | Monolithic checkpoint loader (or `"None"`) |
| `unet_name` | COMBO | Standalone diffusion model UNet (or `"None"`) |
| `weight_dtype` | COMBO | UNet precision (`default`, `fp8_e4m3fn`, `bf16`, etc.) |
| `clip_name` | COMBO | Standalone text encoder (or `"disabled"`) |
| `vae_name` | COMBO | Standalone VAE model (or `"None"`) |
| `lora_1_name` / `lora_2_name` | COMBO | LoRA models from your `models/loras/` directory |
| `positive` / `negative` | STRING | Multiline prompt inputs with full Text Studio syntax |
| `resolution` | COMBO | Aspect ratio preset (`Square`, `Portrait`, `Landscape`, etc.) |
| `steps` / `cfg` / `sampler_name` / `scheduler` | INT/FLOAT/COMBO | Core KSampler parameters |
| `chroma_shift` | FLOAT | Flow-matching timestep shift factor |
| `dynamic_guidance` | BOOLEAN | Enable adaptive CFG decay curve |
| `enable_hires_fix` | BOOLEAN | Toggle 2nd-pass hires latent upscale |
| `enable_detailer` | BOOLEAN | Toggle YOLO face/eyes/hands refinement |
| `enable_dewax` | BOOLEAN | Toggle De-Wax skin micro-texture & film grain |
| `enable_restormer` | BOOLEAN | Toggle Restormer restoration pass |
| `enable_upscale` | BOOLEAN | Toggle final model super-resolution |

#### Outputs
| Output | Type | Description |
|---|---|---|
| `image` | IMAGE | Final decoded, detailed, and post-processed image tensor |
| `latent` | LATENT | Generated diffusion latent |
| `pipe` | PIPE | Standard Zombiehaus / ComfyUI distribution pipe tuple |
| `resolved_prompt` | STRING | Fully expanded prompt string with all variables and wildcards |
| `summary` | STRING | Step-by-step console summary of all executed studio stages |

---

### `Zombiehaus Script Studio`

#### Screenplay Inputs
In addition to the model, sampler, and stage toggles above:
- **`positive`**: Contains the full screenplay script:
  ```ini
  [SCENE]
  location: a sunlit luxury bedroom, warm morning sunlight, 35mm film photography, 8k
  lora: <lora:Chroma/sultry-chroma:1.0>
  negative: low quality, blurry, deformed

  [PERSONA 1]
  lora: $amanda.lora
  position: left
  A caucasian woman with blue eyes and brunette hair.

  [PERSONA 2]
  lora: $amber.lora
  position: right
  A caucasian woman with brown eyes and jet black hair.

  [INTERACTION]
  action: two women interacting intimately, bodies close, natural skin contact
  contact_blend: 0.25
  ```
- **`default_lora_strength`**: Fallback strength for persona LoRAs when not specified in script.
- **`default_overlap_blend`**: Spatial blend feathering between adjacent character attention masks.

#### Outputs
- `image`: Final rendered multi-character scene.
- `persona_masks`: Spatial attention masks generated for each persona.
- `pipe`: Full distribution pipe.
- `resolved_script`: Expanded screenplay with all dynamic prompts resolved.
- `summary`: Screenplay parsing breakdown and stage logs.

---

## Troubleshooting

- **No image rendered / Model error**: Ensure either `checkpoint_name` or `unet_name` + `clip_name` + `vae_name` is selected (or provided via an external `pipe` connection).
- **LoRA not applying**: Verify that the LoRA filename matches the file in `models/loras/`. If using `$persona.lora`, ensure the persona wildcard file includes the LoRA path (e.g. `lora: "<lora:Chroma/Amanda_Chroma_V6:1.0>"`).
- **YOLO detailer skipped**: If `enable_detailer` is active but YOLO models are not downloaded, the detailer logs a warning in the `summary` output and safely passes the image through to the next stage without aborting the run.
