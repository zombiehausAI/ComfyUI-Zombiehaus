# Zombiehaus Deck Studio

**Zombiehaus Deck Studio** is a modular, column-and-card workstation interface for ComfyUI. It reimagines workflow navigation by organizing complex 2D node graphs into clean, structured **Stage Columns** with tactile, interactive **Cards**.

Instead of panning across infinite wiring planes or untangling overlapping cables, Deck Studio turns ComfyUI into an elegant creative production desk (similar to an audio DAW rack or a streamlined production pipeline).

---

## Key Features

### 1. The 5 Stage Bays & Multi-Column Lanes
Active workflow nodes are automatically organized into 5 production bays with horizontal workspace scrolling:

| Stage | Bay Name | Typical Nodes & Capabilities |
|---|---|---|
| **Stage 1** | **Assets & Loaders** | Checkpoint Loaders, UNets, LoRA Loaders, VAE, CLIP, Image/Audio Loaders, Latent Presets, Model Scryer. |
| **Stage 2** | **Prompt & Conditioning** | Text Studios, Prompt Refiners, ControlNet, Style Pickers, Song Writers, Conditioning Concat, Function Editors. |
| **Stage 3** | **Generation Core** | KSampler, KSampler Advanced, Empty Latents, Dynamic Guidance, Batch KSampler, ACE Step Audio. |
| **Stage 4** | **Refinement & FX** | All-in-One Detailers, Detailer Slots, Upscalers, Restormer, De-Wax Texture Restore, FaceSwap, Glamour Sculptor. |
| **Stage 5** | **Output & Gallery** | Save Image, Preview Image, Image Compare, Image Gallery, Save Audio, Save Video, Audio Mixer, Export Card. |

- **Horizontal Scrolling Workspace**: Seamlessly scroll across all 5 bays while keeping large workflows spacious and legible.
- **Multi-Column Lanes**: Each stage bay dynamically subdivides into parallel columns/lanes (up to 3 cards per lane) to prevent infinite vertical stacking. Lanes are horizontally resizable (320px–720px) to suit your monitor.
- **Deterministic Run Priority Flow**: Run steps (`▶ 1`, `▶ 2`, `▶ 3`...) are deterministically numbered starting at the top-left, flowing down the lane, advancing to the top of the next lane, and proceeding through the stage bays.
- *Cards can be freely dragged and dropped between lanes and bays to tailor your layout and execution sequence.*

---

### 2. Tactile, Resizable Cards & Subtitles
Each card represents a live node in your active workflow:
- **Card Resizability**:
  - Drag the bottom corner of any card to resize its height vertically.
  - Custom card heights automatically persist across browser refreshes via `localStorage`.
- **Card Header**:
  - Drag handle (`⋮⋮`) for reordering.
  - **Run Step Badge (`▶ #`)**: Indicates the exact priority step order in the generation pipeline.
  - Node ID badge (`#5`) and editable node title (syncs directly to `node.title`).
  - **Role Subtitle**: Human-readable node role classification (e.g. `Core Base Model Loader`, `Diffusion Denoising Engine`, `Conditioning Semantic Director`, `Latent to Pixel Reconstructor`).
  - **Connections Summary Pill (`◀ In • Out ▶`)**: Displays live upstream and downstream connection counts; clicking toggles a detailed connection drawer.
  - **Prompt Popout (`🗖`)**: Available on text, prompt, function, and song nodes to open the full Pop Out Studio cockpit.
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

### 3. Full-Featured Native Pop Out Studio Integration
Clicking `🗖 Prompt Studio` on the Deck toolbar or `🗖` on any card header seamlessly launches the full-fledged **Zombiehaus Pop Out Studio**:
- **Complete Suite Features**:
  - **Category-Filtered Prompt Selection**: Browse, filter, load, and save prompt presets directly from your library.
  - **Prompt Style Converter**: Instant one-click conversion between Tags (SDXL/Pony), Expressions (Flux/SD3), and Song Lyrics.
  - **Studio Tools Menu**: Access Function Editor, Song Lyrics Studio, Tag Studio matrix, Aesthetic Ribbon (optics, films, rigs), Color Spectrum Studio, and Active LoRA Deck.
  - **AI Prompt Enhancement**: Seamless local Ollama LLM integration for automated refinement.
  - **Negative Pedalboard Guards**: Dedicated one-click negative prompt guards.
  - **Full Customization**: Typography font selection, font size zoom (Ctrl+Wheel), syntax themes, undo/redo history, and full-screen maximization.
  - **Two-Way Live Sync**: All adjustments mirror instantly back to the active ComfyUI node and canvas.

---

### 4. Interactive Connection Tracing & Smart Port Chips
Easily decipher how nodes connect without spaghetti cables:
- **Interactive Trace on Hover**:
  - Hovering over any card immediately highlights the active card (`zds-card-focused`).
  - **Upstream Feeders**: Glows in vibrant electric cyan with a `◀ FEEDS ACTIVE` badge.
  - **Downstream Consumers**: Glows in bright neon magenta with a `▶ RECEIVES FROM ACTIVE` badge.
  - **Focus Isolation**: Unrelated nodes subtly dim so the active data stream stands out instantly.
- **Dynamic Curved Connection Cables**:
  - Live animated SVG bezier cables trace data paths from feeder output ports to active input ports, and active output ports to consumer input ports across bays.
- **Collapsible Connection Drawer**:
  - Click the header links pill (`◀ In • Out ▶`) to expand a dedicated links panel.
  - Clickable chips (`◀ #1 CheckpointLoader`, `▶ #5 KSampler`) let you jump and smoothly scroll directly to connected cards across the bays.
- **Smart Port Chips**:
  - Compact pills showing connected node IDs (`positive • #3`).
  - Rich hover tooltips detailing upstream and downstream connections.
  - Interactive click-to-connect and click-to-disconnect support without dragging wires.

---

### 5. Real-Time Execution Feedback
- **Live Glowing Borders**: The currently executing node illuminates with an electric cyan/purple pulse border and animated status.
- **Sampler Progress Bar**: Displays real-time step counter and percentage (`Step 15/25 (60%)`) directly under active KSampler cards.
- **Live Output Previews**: Generated images render immediately on output cards upon completion.

---

### 6. Deck Studio Ribbon Toolbar
- `[ ⊞ Canvas View ]  ⟷  [ ▥ Deck Studio ]`: Instant toggle between standard canvas and Deck Studio.
- `▶ Queue Prompt`: Primary execution button with live queuing feedback.
- `⏹ Cancel`: Immediate execution interrupt.
- `🗖 Prompt Studio`: Instant access to the popout prompt editor.
- `⭐ Quick View`: Switch to the focused Quick View cockpit to monitor only pinned nodes live without wire clutter.
- `🖼️ Image Tray`: Fast toggle for the dockable bottom generation gallery.
- `Batch Stepper`: Fast single-click batch generation count control.
- `🔍 Filter`: Real-time fuzzy search across node titles, IDs, and parameters.
- `➕ Add Card`: Search and drop any registered ComfyUI node directly into the active workflow.

---

### 7. Focus Dashboard (Quick View) & Flexible Workspace Cockpit
Cut out all extraneous noise and focus exclusively on the cards you need (e.g. Prompt Editor, List Curator, KSampler, Hi-Res Fix, All-in-One Detailer):

- **Pin Any Card (`☆` / `★`)**: Click the star icon on any card header to pin it to your Focus Dashboard. You can also click `➕ Pin Cards ▾` in the dashboard sub-header to search and toggle nodes without leaving the view.
- **Custom Card Ordering & 2D Column Stacking (Row Flow)**:
  - **Stack Under / Above**: Drag any card by its header onto the bottom edge of another card to stack directly under it in the same column, or drag onto the top edge to stack above. A glowing orange bottom/top bar indicates the stack location.
  - **Column Left / Right**: Drag toward the left or right side of a card/column to create or move into a separate column.
  - **Header Nudge Buttons**:
    - `◀` Move Column Left (or unstack into the column to the left)
    - `▲` Move Up in Column (or pop out into its own column)
    - `▼` Stack Under (or move down in column)
    - `▶` Move Column Right (or unstack into the column to the right)
  - Custom 2D column layouts and card sequences automatically persist in `localStorage`.
- **All Resize Options**:
  - **Free 2D Resizing with Zero Caps**: Drag the tactile glowing orange corner handle at the bottom-right of any card to freely resize width and height with zero artificial caps or ceilings. The workspace scrolls smoothly in both directions if cards exceed the viewport.
  - **Native Resizing**: CSS `resize: both` corner is fully supported without conflicting with dragging or card controls.
  - **Global Width Presets**: One-click preset buttons in the dashboard toolbar: `[ 380 ]`, `[ 520 ]`, `[ 720 ]`, `[ 960 ]`, or `[ ↺ Reset ]` to restore custom individual sizing.
  - **Header Quick Cycle (`↔`)**: Click the width icon on any card header to quickly step its width between `380px`, `540px`, `760px`, and `1000px`.
  - **Height Modes**: Toggle between `↕ Full Height` (cards expand to fill vertical studio height) and `↕ Auto Height` (cards hug their content naturally).
- **Layout Flow Modes**:
  - **`⇥ Row Flow`**: Horizontal scrollable board for side-by-side workflow stages.
  - **`⊞ Grid Wrap`**: Responsive multi-card dashboard grid that wraps tiles into neat columns.
- **Full Live Feedback**: Sampler progress bars, glowing execution borders, image previews, and two-way widget sync remain fully active.
- **Instant Toggle**: Use `Alt + Q` or click `[ ⭐ Focus Dashboard ]` / `[ ▥ All Cards ]` to toggle seamlessly between your focused cockpit and the full 5-bay pipeline grid.

---

### 8. Live Syntax Highlighting on All Grid Textareas
- All multiline prompt and text editors across the grid (Text Editor, CLIPTextEncode, List Curator, Prompt Refiner, etc.) feature real-time color syntax highlighting:
  - **Weights**: `(word:1.2)`, `(word)`
  - **LoRAs**: `<lora:model:1.0>`
  - **Wildcards**: `__wildcard__`
  - **Curator Tags**: `{curator}`, `{curator2}`
  - **Variables**: `$variable`
  - **Comments**: `/* ... */`, `// ...`, `# ...`
  - **Section Banners**: `[Section]`

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + D` | Toggle Deck Studio Workstation / Canvas View |
| `F9` | Toggle Deck Studio Workstation |
| `Alt + Q` | Toggle Quick View Cockpit Mode |
| `Alt + P` | Pop out Fullscreen Prompt Studio |
| `Alt + T` / `F10` | Toggle Dockable Image Tray |
| `Esc` | Return to Canvas View (or close active modal) |
