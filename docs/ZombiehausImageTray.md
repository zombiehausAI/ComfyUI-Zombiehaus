# Zombiehaus Image Tray

**Zombiehaus Image Tray** is a dockable, real-time bottom filmstrip and workflow inspector for ComfyUI. Inspired by the popular `rgthree image tray`, it provides a continuous horizontal stream of recently generated images, one-click embedded workflow restoration, direct node routing, and an interactive high-resolution lightbox.

---

## Key Capabilities

### 1. Real-Time Generation Filmstrip
- **WebSocket Streaming**: Listens directly to ComfyUI's `executed` event. Whenever an image is decoded or saved, it automatically glides into the tray with an illuminated cyan pulse animation.
- **Persistent Output History**: On startup, queries the output directory via `/zombiehaus/gallery/list` to populate previous outputs without needing to regenerate.
- **Adjustable Thumbnail Sizes**: Toggle between **Small**, **Medium**, and **Large** cards directly from the header.
- **Dockable & Collapsible**: Click the slim top header bar or press `Alt + T` / `F10` to collapse the tray into a low-profile dock that never obstructs your workspace.

---

### 2. Card Quick Actions (Hover Ribbon)
Hovering over any card reveals one-click actions:

| Action | Icon | Description |
|---|---|---|
| **Inspect / Lightbox** | 🔍 | Opens full-screen high-resolution lightbox with zoom and metadata inspector. |
| **Load Workflow** | 📥 | Extracts embedded graph metadata from the PNG and loads it directly into `app.graph`. |
| **Send to Node** | ➡️ | Routes this image file directly to an existing `LoadImage` node (or creates one on the canvas). |
| **Copy Image** | 📋 | Copies the image file directly to the operating system clipboard. |
| **Download** | ⬇️ | Downloads the original image file. |

---

### 3. Click-to-Zoom & Pan Navigation (Full Image Detail Inspection)
Unlike basic modal viewers, the Zombiehaus Image Tray features an interactive pan-and-zoom inspection engine:
- **Click to Zoom In**: Clicking anywhere on the fitted image immediately zooms into high-resolution magnification ($2.5\times$ or 1:1 pixel scale) centered right on the clicked point.
- **Drag to Pan**: While zoomed in, click-and-drag to smoothly explore fine micro-details across the full image (e.g. skin pores, eyes, hair strands, fabric textures, background sharpness).
- **Mouse Wheel Zoom**: Scroll the mouse wheel to continuously zoom anywhere between $0.5\times$ and $8.0\times$ magnification.
- **Click to Zoom Out**: Clicking the image again instantly zooms back out to the full-fit view.
- **Dedicated Zoom Toolbar**: Includes `[-]`, `[+]`, `[1:1]` native resolution, and `[⊡ Fit]` reset buttons alongside a live magnification badge (`Fit`, `100%`, `250%`).

---

### 4. High-Resolution Lightbox & Metadata Inspector
Clicking an image or the `🔍` button opens the interactive workstation lightbox:
- **Metadata Sidebar**: Parses and displays:
  - Positive prompt and negative prompt.
  - Sampler, scheduler, steps, CFG scale, and seed.
  - Model checkpoint and active LoRA stack.
  - Formatted workflow graph data.
- **Direct Actions**:
  - `[ 📥 Load This Workflow ]`: Restores the complete graph that generated this exact image.
  - `[ ➡️ Send to LoadImage Node ]`: Bridges the output directly into downstream img2img or refinement pipelines.
  - `[ 🔗 Open in New Tab ]`: Displays raw image output in browser.

---

### 5. Cross-Workstation Integration (Deck Studio & Canvas)
- **Deck Studio UI**: Directly accessible inside the **Zombiehaus Deck Studio** workstation via the `[ 🖼️ Image Tray ]` top ribbon button, docking smoothly across the bottom of your production stage columns.
- **2D Canvas View**: Fully usable on the standard ComfyUI canvas plane with persistent menu bar and cockpit buttons.

---

### 6. Enable / Disable Flexibility
The Image Tray can be effortlessly enabled or disabled to suit your personal workflow preference:
- **One-Click Disable Button**: Click the `✕ Disable` button directly on the right side of the Image Tray header to hide and deactivate it.
- **ComfyUI Settings Panel**: Toggle **"Zombiehaus: Enable Bottom Image Tray"** under `Settings` $\rightarrow$ `Zombiehaus` $\rightarrow$ `Workspaces`.
- **Instant Keyboard Toggle**: Press `Alt + T` or `F10` at any time to instantly re-enable and display the tray.
- **Persistent State**: Your preference is saved in `localStorage` and remembered across sessions and browser refreshes.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + T` | Toggle Image Tray collapse/expand |
| `F10` | Toggle Image Tray collapse/expand |
| `Esc` | Close active Lightbox modal |
