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
- **`random_pick_count`**: Specifies how many LoRAs to randomly sample from the pool on each generation (default: 1).

## Dynamic Step Scheduling & Dropoffs

Click the **`⏱`** button on any LoRA row to expand its dynamic scheduling drawer:

- **Dynamic Dropoff Checkbox**: Enable or disable time-scheduled dropoff for this specific LoRA.
- **Steps (`start_percent` ➔ `end_percent`)**: Sampling step window (e.g. `0.0 ➔ 0.5` applies the LoRA only during the first 50% of generation).
- **End Wt (`end_strength`)**: What the LoRA weight decays down to (e.g. `1.0 ➔ 0.0` or `1.0 ➔ 0.2`).
- **Curve (`decay_profile`)**: Interpolation decay profile (`cosine`, `linear`, `exponential`, or `step`).
- **Integration with Random Range**: If both Random Range and Dynamic Dropoff are active, the rolled random weight becomes the starting weight, decaying down to the target end weight.

### Connecting to Show Text

Connect the `loaded_loras` output to the `text` input of a **Show Text** node (`ZombiehausShowText`). It displays exactly what was loaded for that run:
```text
[Fixed] detailer_v2.safetensors (strength: 1)
[Random] cyberpunk_girl_v1.safetensors (rolled: 0.74 [0.4~0.9])
[Random+Dynamic] heavy_lighting.safetensors (rolled: 0.85 [0.5~1] ➔ 0 @ 0-0.5 [cosine])
[Prompt+Dynamic] cinematic_grain (strength: 1 ➔ 0.2 @ 0-0.6 [cosine])
```

## Dynamic Prompt LoRA Tagging (`<lora:...>`)

Instead of configuring every LoRA in the UI panel, you can "tag" LoRAs directly in your prompt (e.g. inside dynamic choices, variables, or CASE statements in `ZombiehausTextEditor`).

### Supported Prompt Syntax

- **Standard**: `<lora:name>` &rarr; Strength `1.0`
- **Specified Strength**: `<lora:name:0.8>` &rarr; Strength `0.8`
- **Model vs CLIP Strength**: `<lora:name:0.8:0.6>` &rarr; Model `0.8`, CLIP `0.6`
- **Random Variation Range**: `<lora:name:0.4~0.85>` &rarr; Randomly rolls between `0.4` and `0.85` based on seed
- **Step Windowing**: `<lora:name:1.0@0.0-0.5>` &rarr; Active from 0% to 50% of steps
- **Dynamic Dropoff**: `<lora:name:1.0>0.2:cosine>` &rarr; Fades from 1.0 to 0.2 with cosine decay
- **Full Scheduled Schedule**: `<lora:name:0.4~0.9>0.1@0.0-0.6:cosine>` &rarr; Rolls random start weight between 0.4 and 0.9, fades down to 0.1 by 60% of steps using cosine curve
- **Muted**: `/* <lora:name:1.0> */` &rarr; Ignored completely

### Conditional & Choice Examples

```text
// Dynamic choice with randomized ranges
{<lora:cyberpunk_v1:0.6~0.9> | <lora:fantasy_v2:0.5~0.8>}

// Dynamic dropoff on style LoRA
<lora:gothic_art:1.0>0.0@0.0-0.5:cosine>, masterpiece, portrait of a warrior

// Variable & CASE statement
$character = {futanari | man | woman}
{case $character:
    futanari => <lora:futanari_v2:0.7~0.9>
    | man    => <lora:male_enhancer:0.6~0.8>
    | woman  => <lora:female_details:0.7~0.85>
}
```
The Text Editor evaluates the variable/case/choice first, and the winning branch's tag is loaded by the LoRA Loader.

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
