# LoRA Loader

Stack-based LoRA management with base model validation, Civitai integration, and pipe support.

## Overview

The Zombiehaus LoRA Loader manages a JSON-based stack of LoRAs through an interactive UI. Multiple LoRAs can be enabled, reordered, and strength-adjusted in the node panel without rewiring. The node applies all enabled LoRAs in order to the model and CLIP, and passes everything through via pipe.

## Features

- **LoRA Stack UI**: Add, remove, reorder, and toggle individual LoRAs in the node's panel — all state is stored in a hidden `lora_stack` JSON field
- **Hybrid Fixed & Random Pool**: Mark individual LoRAs as either Fixed (`📌` always applied) or Random Pool (`🎲` randomly chosen per generation)
- **Toggleable Random Variation Range**: When in the Random Pool, toggle between fixed weight (`=`) and a randomized variation range (`~` rolls between `Min` and `Max` per generation seed)
- **Dynamic Step Dropoff & Scheduling**: Apply step-wise decay curves (`cosine`, `linear`, `exponential`, `step`) and windowing (`start_percent` to `end_percent`) per LoRA via the drawer (`⏱`) or prompt tags
- **Master Dynamic Switch**: Master `enable_dynamic_lora` widget toggle to activate or bypass all timing schedules
- **Show Text Integration**: Outputs a formatted string (`loaded_loras`) listing exactly which LoRAs were applied (including rolled strengths and dynamic fade intervals), ready to connect to `ZombiehausShowText`
- **Deterministic Randomization**: Connect a `seed` to ensure the exact same random LoRA is picked and the exact same random strength is rolled for a given seed, or leave unconnected for dynamic generation
- **Case-Insensitive Path Matching**: Finds LoRA files using three fallback strategies (exact, basename, basename without extension) — handles subdirectories and mixed-case filenames
- **Per-LoRA Strength**: Each entry in the stack has its own strength value; strength 0 skips the LoRA
- **Base Model Validation**: The `base_model_name` dropdown (populated from `config.json` definitions) lets the UI warn when a LoRA's metadata doesn't match the selected base model
- **Civitai Integration**: Preview images, training keywords, and model info are fetched from Civitai via the built-in API routes
- **Pipe Support**: Accepts and emits a `(model, clip, vae, positive, negative)` pipe — individual inputs override pipe values

## Inputs

### Required
- **lora_stack** (STRING, hidden): JSON array of LoRA entries managed by the node UI — do not wire manually
- **base_model_name** (COMBO): Base model type for validation (populated from `base_model_definitions` in `config.json`); does not affect execution

### Optional
- **pipe** (PIPE): Carries `(model, clip, vae, positive, negative)` — individual inputs override pipe
- **model** (MODEL): Model to apply LoRAs to
- **clip** (CLIP): CLIP to apply LoRAs to
- **positive** (CONDITIONING): Positive conditioning passthrough
- **negative** (CONDITIONING): Negative conditioning passthrough
- **seed** (INT): Seed passthrough and random pool seed (forceInput — must be wired, not typed)
- **enable_dynamic_lora** (BOOLEAN, default: True): Master switch for dynamic step scheduling and dropoffs
- **prompt** (STRING): Optional prompt text input (e.g. from **Text Editor**). Automatically scans for `<lora:...>` tags and loads them on the fly
- **random_pick_count** (INT, default: 1): How many LoRAs to randomly pick from the `🎲 Random Pool`
- **lora_filter** (STRING): Text filter for the LoRA list in the UI panel; persists automatically across browser sessions via `localStorage` and within saved workflows
- **civitai_api_key** (STRING, hidden): Civitai API key stored in the workflow; overrides `config.json` key
- **auto_keyword_discovery** (BOOLEAN, default: True): Automatically extract trained trigger words / keywords from active LoRAs to emit via `trigger_words`; toggle off to disable keyword discovery
- **keyword_blacklist** (STRING, default: ""): Comma-separated list of keywords/tags to ignore and exclude from `trigger_words` (can also be configured globally via `lora_keyword_blacklist` in `config.json`)

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| model | MODEL | Model with all enabled and selected LoRAs applied |
| clip | CLIP | CLIP with all enabled and selected LoRAs applied |
| positive | CONDITIONING | Positive conditioning passthrough (hooks attached and auto-encoded with modified CLIP if needed) |
| negative | CONDITIONING | Negative conditioning passthrough |
| seed | INT | Seed passthrough |
| pipe | PIPE | `(model, clip, vae, positive, negative)` passthrough |
| loaded_loras | STRING | Formatted list of applied LoRAs with rolled weights and step dropoff details (connect to **Show Text**) |
| trigger_words | STRING | Comma-separated trained trigger words extracted from active LoRAs (connect to **Text Editor** / **CLIP Encode**) |
| prompt | STRING | Clean prompt text with all `<lora:...>` tags cleanly stripped and punctuation normalized |

## Random Pool & Variation Ranges

The LoRA Loader allows combining **Fixed** LoRAs that always load alongside a **Random Pool** of variations:

- **📌 Fixed (Default)**: Any LoRA marked with the pin icon is applied on every run.
- **🎲 Random Pool**: Click the mode button to toggle a LoRA into the Random Pool (indicated with a dice icon and purple glow).
- **Toggleable Weight Range (`~` vs `=`)**:
  - When in the Random Pool, a secondary button appears:
    - **`=` (Fixed Weight)**: When sampled, uses the exact fixed `Strength` input.
    - **`~` (Random Weight Range)**: Switches the input to `[Min] ~ [Max]`. When sampled, generates a deterministic pseudo-random weight between `Min` and `Max` based on the seed.
    - **Reversed Ranges Supported**: Ranges can be specified in either direction (e.g. `0.5 ~ 1.0` or `1.0 ~ 0.5`). The engine automatically normalizes `min` and `max` so you never encounter invalid bounds.
- **`random_pick_count`**: Specifies how many LoRAs to randomly sample from the pool on each generation (default: 1).

## Dynamic Step Scheduling & Dropoffs

Dynamic step scheduling applies model hooks during sampling steps, allowing LoRA weights to gradually fade in, fade out, or apply only during specific generation phases (e.g. applying a face likeness or anatomy LoRA early to lock in structure, then fading it out so fine texture detail comes purely from the base model).

Click the **`⏱`** button on any LoRA row in the node to expand its dynamic scheduling drawer:

| Setting | UI Control | Description |
|---|---|---|
| **Dynamic Toggle** | Checkbox | Activates time-scheduled step decay and hook keyframes for this LoRA. |
| **Step Window** | `start_percent` ➔ `end_percent` | Percentage range of generation steps (`0.0` to `1.0`) during which the LoRA is active (e.g., `0.0 ➔ 0.5` is active during the first 50% of sampling). |
| **End Strength** | `end_strength` | The target weight the LoRA decays down to at `end_percent` (e.g., `0.0` for full fade out, or `0.2` for partial retention). |
| **Decay Curve** | `decay_profile` | Mathematical interpolation curve between the starting weight and `end_strength`. Options: `cosine`, `linear`, `exponential`, or `step`. |

### Decay Profile Curves

- **`cosine` (Recommended)**: Smooth S-curve transition ($0.5 \times (1 + \cos(\pi \cdot t))$). Yields the most natural, artifact-free transitions because weight changes ease in and ease out smoothly.
- **`linear`**: Constant linear interpolation ($1 - t$). Weight drops at a steady, fixed rate across the active step window.
- **`exponential`**: Rapid initial drop that asymptotically tapers off. Useful for aggressive early structural guidance that quickly yields to base model denoising.
- **`step`**: Hard threshold cutoff. Maintains full starting strength throughout the window, then abruptly drops to `end_strength` at `end_percent`.

### Master Dynamic Switch

The node includes an **`enable_dynamic_lora`** widget (default: `True`). When toggled to `False`, all dynamic step scheduling and timing windows (both from the UI drawer and from prompt tags) are bypassed, and all LoRAs load at their static base strengths.

### Connecting to Show Text

Connect the `loaded_loras` output to the `text` input of a **Show Text** node (`ZombiehausShowText`). It displays exactly what was loaded for that run:
```text
[Fixed] detailer_v2.safetensors (strength: 1)
[Random] cyberpunk_girl_v1.safetensors (rolled: 0.74 [0.4~0.9])
[Random+Dynamic] heavy_lighting.safetensors (rolled: 0.85 [0.5~1] ➔ 0 @ 0-0.5 [cosine])
[Prompt+Dynamic] Chroma/Melissa_Benoist_Chroma_V1 (strength: 0.92 [0.8~1] ➔ 0 @ 0-0.6 [cosine])
```

---

## Dynamic Prompt LoRA Tagging (`<lora:...>`)

Instead of manually adding every LoRA to the node UI, you can embed LoRA tags directly into prompt text (e.g., inside dynamic choices, variables, wildcards, or CASE statements in `ZombiehausTextEditor`). When the prompt string is wired to the LoRA Loader's `prompt` input, the loader parses all tags, resolves paths, schedules weights, and strips the tags cleanly before emitting the cleaned prompt.

### Syntax Grammar

Prompt tags use colon-separated arguments inside angle brackets:

```text
<lora:model_path:strength_and_timing:decay_profile>
```

- **Arguments are flexible and order-independent**:
  - The first argument is always the **Model Name or Path** (e.g. `Chroma/Melissa_Benoist_Chroma_V1` or `flat2DAnimerge`).
  - Decay profiles (`cosine`, `linear`, `exponential`, `step`) can be placed as any colon-separated token (e.g. `:cosine` at the end).
  - Timing windows (`@start-end` or `@end`) and target dropoffs (`>end_strength`) can be attached directly to the strength token.

### Quick Reference & Examples

| Syntax Pattern | What It Does |
|---|---|
| `<lora:name>` | Default strength `1.0` for both Model and CLIP. |
| `<lora:name:0.8>` | Fixed strength `0.8` for both Model and CLIP. |
| `<lora:name:0.8:0.6>` | Independent strengths: Model `0.8`, CLIP `0.6`. |
| `<lora:name:0.8~1.0>` | **Random variation range**: rolls a random strength between `0.8` and `1.0` per generation seed. |
| `<lora:name:1.0~0.5>` | **Reversed random range**: automatically normalized so minimum is `0.5` and maximum is `1.0`. |
| `<lora:name:1.0:cosine>` | **Decay curve**: Cosine fade starting at `1.0` and decaying to `0.0` over the generation. |
| `<lora:name:1.0@0.0-0.6>` | **Step timing window**: Active from `0%` to `60%` of sampling steps (fades to `0.0` at 60%). |
| `<lora:name:1.0@0.6>` | **Step timing shortcut**: Identical to `@0.0-0.6` (active from start through 60%). |
| `<lora:name:1.0@0.2-0.8>` | **Mid-generation window**: LoRA activates at 20% of steps and ends at 80%. |
| `<lora:name:1.0>0.2>` | **Target dropoff**: Starts at `1.0` and decays down to `0.2` (retaining 20% strength) instead of `0.0`. |
| `<lora:name:1.0>0.2:cosine>` | **Dropoff with profile**: Starts at `1.0`, cosine fades to `0.2` over generation steps. |
| `<lora:name:0.8~1.0:cosine>` | **Random range + profile**: Rolls start strength between `0.8` and `1.0`, then cosine fades to `0.0`. |
| `<lora:name:0.8~1.0@0.0-0.6:cosine>` | **Random range + timing + profile**: Rolls between `0.8` and `1.0`, cosine fades to `0.0` by step 60%. |
| `<lora:name:0.8~1.0>0.2@0.0-0.5:cosine>` | **Full combination**: Rolls random start weight (`0.8~1.0`), cosine fades to `0.2` by 50% of steps. |
| `/* <lora:name:1.0> */` | **Muted LoRA**: Wrapped in comments; completely ignored by the loader. |

### Component Breakdown

#### 1. Model Identifier
- **Subdirectories**: Supported via forward slashes or backslashes (e.g. `Chroma/Melissa_Benoist_Chroma_V1` or `SDXL\Characters\Gwen`).
- **Extensions**: Optional; `.safetensors`, `.ckpt`, or `.pt` can be included or omitted.
- **Fuzzy Matching**: Matches exact relative paths first, then falls back to case-insensitive basename matching.

#### 2. Strength & Random Ranges (`~`)
- **Fixed Value**: Single float (e.g. `:0.85` or `:1.2`).
- **Random Range (`Min~Max` or `Max~Min`)**:
  - Example: `0.8~1.0` rolls a uniform random float between `0.8` and `1.0` (rounded to 3 decimal places).
  - Example: `1.0~0.5` works identically; the loader automatically ensures `min <= max` during evaluation.
  - **Deterministic**: When a `seed` is wired into the LoRA Loader, the rolled strength is 100% reproducible for that seed.

#### 3. Step Timing Windows (`@`)
- Formatted as `@start_percent-end_percent` or `@end_percent`.
- Values are floating-point numbers between `0.0` (0% of sampling steps) and `1.0` (100% of sampling steps).
  - `@0.0-0.5`: Active for the first half of sampling.
  - `@0.3-0.7`: Active only during the middle 40% of sampling.
  - `@0.6`: Shortcut for `@0.0-0.6` (active from step 0 to step 60%).

#### 4. Target End Dropoff (`>`)
- Formatted as `start_strength>end_strength`.
- By default, dynamic timing drops the LoRA strength to `0.0` at `end_percent`.
- Specifying `>end_strength` allows setting a non-zero residual weight:
  - Example: `1.0>0.2` begins at strength `1.0` and tapers down to `0.2`.
  - Example: `0.8~1.0>0.15` rolls a starting strength between `0.8` and `1.0`, tapering down to `0.15`.

#### 5. Decay Profiles (`:cosine`, `:linear`, `:exponential`, `:step`)
- Specify the curve profile name anywhere as a colon-separated argument:
  ```text
  <lora:Chroma/Melissa_Benoist_Chroma_V1:0.8~1.0:cosine>
  <lora:Chroma/Melissa_Benoist_Chroma_V1:0.8~1.0@0.0-0.6:cosine>
  <lora:Chroma/Melissa_Benoist_Chroma_V1:1.0>0.2@0.0-0.5:linear>
  ```
- If a timing window `@` or dropoff `>` is specified without an explicit profile token, **`cosine`** is used by default.

### Dynamic Prompting & Text Editor Integration

Because prompt tags are evaluated at runtime, you can combine them seamlessly with `ZombiehausTextEditor` features:

```text
// 1. Dynamic choice between characters with randomized strengths and cosine decay:
{<lora:Chroma/Melissa_Benoist_Chroma_V1:0.8~1.0@0.0-0.6:cosine> | <lora:Chroma/Gal_Gadot_V2:0.75~0.95@0.0-0.5:cosine>}

// 2. Style LoRA applied only during initial composition steps:
<lora:gothic_art_style:1.0>0.1@0.0-0.4:cosine>, 1girl, castle interior, cinematic lighting

// 3. Conditional character loading via variables and CASE statements:
$role = {hero | villain | rogue};
{case $role:
    hero    => <lora:Paladin_Armor_V3:0.9@0.0-0.7:cosine> shining silver armor, glowing sword
    | villain => <lora:Dark_Overlord_V1:0.85~1.0:cosine> obsidian plate, dark aura
    | rogue   => <lora:Leather_Thief_V2:0.7~0.95> hooded cloak, dual daggers
}
```

When evaluated, the winning branch's tag is fed into the LoRA Loader, the dynamic schedule is applied to the model, and all `<lora:...>` syntax is cleanly stripped from the prompt output.

## LoRA Stack

Each entry in the stack contains:
- **name**: LoRA filename (relative path from `models/loras/`)
- **strength**: Applied to both model and CLIP weights (can be negative)
- **enabled**: When false, the LoRA is skipped without removing it from the stack

LoRAs are applied in stack order. The output model/CLIP reflects the cumulative effect of all enabled LoRAs.

## Base Model Validation

Set `base_model_definitions` in `config.json` to enable validation:

```json
{
  "base_model_definitions": [
    {"type": "sdxl", "keywords": ["sdxl", "xl"]},
    {"type": "sd15", "keywords": ["sd15", "sd1.5", "v1-5"]},
    {"type": "flux", "keywords": ["flux"]}
  ]
}
```

The UI compares the LoRA's `ss_base_model_version` or `modelspec.architecture` metadata field against the selected base model type and shows a compatibility indicator. This is UI-only and does not block execution.

## Civitai Integration

- **Preview images**: Fetched from the LoRA file's embedded metadata or a sidecar image file
- **Civitai lookup**: Triggered by the UI using the LoRA's SHA-256 hash via the `/zombiehaus/get_lora_civitai_info` API route
- **API key**: Add to `config.json` or wire the `civitai_api_key` input for access to NSFW models

```json
{
  "civitai_api_key": "your_api_key_here"
}
```

## Usage Patterns

### Basic LoRA Application
```
Model Loader → model, clip → LoRA Loader → model, clip → KSampler
```

### Via Pipe
```
Model Loader → pipe → LoRA Loader → pipe → KSampler
```

### Seed Passthrough
```
KSampler seed → LoRA Loader seed input → seed output → Save Image %seed%
```

## Tips

- **Multiple LoRAs**: Add all LoRAs to one node's stack — no need to chain multiple nodes
- **Disable without removing**: Toggle `enabled` on a stack entry to temporarily skip a LoRA
- **Strength 0**: Automatically skipped; same effect as disabling
- **Negative strength**: Inverts the LoRA effect
- **Trigger words**: Copy training keywords shown in the Civitai panel into your prompt

## Troubleshooting

- **LoRA not found**: Verify the file exists in `models/loras/`. Path matching is case-insensitive but the file must be present
- **No validation indicators**: Add `base_model_definitions` to `config.json` and select a base model type in the dropdown
- **Civitai errors**: Check internet connection and API key; some models require authentication
- **Empty positive/negative outputs**: If no conditioning is wired (and no pipe), outputs are empty lists — wire conditioning before this node or pass via pipe
