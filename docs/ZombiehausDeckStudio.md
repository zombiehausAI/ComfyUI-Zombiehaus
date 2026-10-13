# Zombiehaus Deck Studio

**Zombiehaus Deck Studio** is a modular, column-and-card workstation interface for ComfyUI. It reimagines workflow navigation by organizing complex 2D node graphs into clean, structured **Stage Columns** with tactile, interactive **Cards**.

Instead of panning across infinite wiring planes or untangling overlapping cables, Deck Studio turns ComfyUI into an elegant creative production desk (similar to an audio DAW rack or a streamlined production pipeline).

---

## Key Features

### 1. The 5 Stage Columns
Active workflow nodes are automatically classified into 5 logical production stages:

| Stage | Column Name | Typical Nodes & Capabilities |
|---|---|---|
| **Stage 1** | **Assets & Loaders** | Checkpoint Loaders, UNets, LoRA Loaders, VAE, CLIP, Image/Audio Loaders, Latent Presets, Model Scryer. |
| **Stage 2** | **Prompt & Conditioning** | Text Studios, Prompt Refiners, ControlNet, Style Pickers, Song Writers, Conditioning Concat, Function Editors. |
| **Stage 3** | **Generation Core** | KSampler, KSampler Advanced, Empty Latents, Dynamic Guidance, Batch KSampler, ACE Step Audio. |
| **Stage 4** | **Refinement & FX** | All-in-One Detailers, Detailer Slots, Upscalers, Restormer, De-Wax Texture Restore, FaceSwap, Glamour Sculptor. |
| **Stage 5** | **Output & Gallery** | Save Image, Preview Image, Image Compare, Image Gallery, Save Audio, Save Video, Audio Mixer, Export Card. |

*Cards can also be freely dragged and dropped between or within columns to customize your studio layout.*

---

### 2. Tactile, Interactive Cards
Each card represents a live node in your active workflow:
- **Card Header**:
  - Drag handle (`⋮⋮`) for reordering.
  - Node ID badge (`#5`) and editable node title (syncs directly to `node.title`).
  - **Bypass Toggle (`⊘`)**: One-click bypass mode.
  - **Mute Toggle (`🔇`)**: One-click mute mode.
  - **Locate on Canvas (`🎯`)**: Zooms and selects the node on the 2D canvas plane.
  - **Collapse/Expand (`▾`)**: Condenses the card to a compact header view.
- **Direct HTML Widgets (Two-Way Sync)**:
  - **Sliders & Steppers**: Tactile sliders with numerical text inputs for integers and floating-point parameters (CFG, steps, denoise, dimensions).
  - **Seed Controls**: Seed number display with dedicated `🎲 Randomize`, `➕ Increment`, and fixed seed buttons.
  - **Dropdown Selectors**: Clean selects for checkpoints, LoRAs, samplers, and schedulers.
  - **Multi-line Textareas**: Direct prompt and negative prompt editing with real-time graph synchronization.
  - **Toggle Switches**: Modern switch toggles for boolean options.

---

### 3. Smart Port Chips & Connections (No Spaghetti)
- Inputs are rendered as left-aligned chips; outputs as right-aligned chips.
- Color-coded by data type:
  - `MODEL` (Purple)
  - `CLIP` (Yellow)
  - `VAE` (Red)
  - `IMAGE` (Sky Blue)
  - `LATENT` (Pink)
  - `CONDITIONING` (Orange)
  - `MASK` (Cyan)
- **Connecting Mode**:
  1. Click any output chip.
  2. Compatible downstream input chips automatically illuminate with a pulsing beacon highlight.
  3. Click any highlighted input chip to link the nodes instantly—no cable dragging across the screen.
- **Connection Badges**: Connected inputs display the source node name and slot (`MODEL ← #3 ModelLoader`). Clicking a connected chip provides a one-click disconnect option.

---

### 4. Real-Time Execution Feedback
- **Live Glowing Borders**: The currently executing node illuminates with an electric cyan/purple pulse border and animated status.
- **Sampler Progress Bar**: Displays real-time step counter and percentage (`Step 15/25 (60%)`) directly under active KSampler cards.
- **Live Output Previews**: Generated images render immediately on output cards upon completion.

---

### 5. Deck Studio Ribbon Toolbar
- `[ ⊞ Canvas View ]  ⟷  [ ▥ Deck Studio ]`: Instant toggle between standard canvas and Deck Studio.
- `▶ Queue Prompt`: Primary execution button with live queuing feedback.
- `⏹ Cancel`: Immediate execution interrupt.
- `Batch Stepper`: Fast single-click batch generation count control.
- `🔍 Filter`: Real-time fuzzy search across node titles, IDs, and parameters.
- `➕ Add Card`: Search and drop any registered ComfyUI node directly into the active workflow.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + D` | Toggle Deck Studio Workstation / Canvas View |
| `F9` | Toggle Deck Studio Workstation |
| `Esc` | Return to Canvas View (or close active modal) |
