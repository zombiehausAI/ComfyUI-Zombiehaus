# Zombiehaus Prompt Variable

Extract dynamic variables and object properties evaluated within the **Zombiehaus Text Editor** (e.g., `$listitem`, `$listitem.name`, `$name`, `$character`) and format them into strings or custom filename prefixes for downstream nodes like standard ComfyUI `SaveImage` or custom pipelines.

---

## Overview

When using dynamic prompts, lists, or wildcards in the Zombiehaus Text Editor, variables are generated or selected randomly at runtime (e.g., choosing a character from a list of objects). 

The **Zombiehaus Prompt Variable** node inspects the evaluated variables either directly from the `PIPE` or from the most recent Text Editor execution, allowing you to:
1. Extract any variable value or property (such as `name`, `listitem`, `listitem.name`, or `character`).
2. Format a dynamic filename prefix using tokens like `%var%`, `%date%`, `%seed%`, etc.
3. Pass the extracted data into downstream nodes or forward the pipe.

---

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `variable_name` | `STRING` | `"name"` | Variable or property to extract (e.g., `"name"`, `"listitem"`, `"listitem.name"`, `"listitem.hair"`, `"character"`). |
| `prefix_template` | `STRING` | `"images/%date%/%var%_%seed%"` | Filename prefix template. `%var%` is replaced with the extracted variable value. Also supports `%date%`, `%time%`, and `%seed%`. |
| `fallback` | `STRING` | `""` | Fallback text to use if the variable is not found in the prompt context. |
| `pipe` | `PIPE` *(optional)* | `None` | Optional pipe connection containing the prompt variables bus. |

---

## Outputs

| Output | Type | Description |
|---|---|---|
| `value` | `STRING` | The extracted string value of the variable or object property. |
| `filename` | `STRING` | The expanded filename prefix ready to connect to any Save Image node. |
| `pipe` | `PIPE` | The passthrough pipe carrying all workflow state and variables. |

---

## Usage Example

### 1. In Text Editor:
```text
$list = all(__listofobjects__).Where(hair == "jet black");
$listitem = $list.random;
1girl, portrait of $listitem.name, $listitem.eyes eyes, $listitem.hair hair, $listitem.lora
```

### 2. Connect Zombiehaus Prompt Variable:
- **`variable_name`**: `listitem.name` (or simply `name`)
- **`prefix_template`**: `output/%date%/%var%_%seed%`
- Connect `filename` to ComfyUI's standard `SaveImage` node's `filename_prefix` input.
- If your object has `Emiru: { ... }`, the filename will automatically be `output/2026-10-27/Emiru_12345`!

---

## Tips & Troubleshooting

- **Direct Save Image Node Support**: If you are using the **Zombiehaus Save Image** node, you don't even need this extraction node! Zombiehaus Save Image automatically inspects the prompt variables and supports `%name%`, `%listitem%`, `%listitem.prop%`, and `%var%` directly in its `filename_prefix`.
- **Case Insensitivity**: Variable name and property lookups are case-insensitive.
- **Dict Name Extraction**: If a variable holds an entire dictionary (like `$listitem`), querying `name` or using `%listitem%` automatically extracts the object's key or `name` property.
