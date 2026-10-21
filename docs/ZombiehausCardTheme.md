# Zombiehaus Card Node Theme & Theme Studio

A polished, tactile UI theme extension for ComfyUI that elevates the visual experience while preserving full workflow freedom and native wiring.

---

## Overview

The **Zombiehaus Card Theme** transforms ComfyUI's standard nodes into tactile, modern cards with subtle glassmorphic surfaces, refined borders, readable typography, and execution glows. It respects ComfyUI's core design philosophy by leaving slot connectors, wire links, and terminal docking 100% native.

---

## Key Features

1. **Tactile Node Card Aesthetics**
   - Rounded corners (configurable from 4px to 20px).
   - Subtle dark matte/glass backdrop with soft ambient drop-shadow.
   - Clean micro-borders with gentle accent glow.
   - Distinctive role subtitle badges auto-categorized by node function (e.g., *Conditioning & Semantic Director*, *Diffusion Denoising Engine*, *Output & Exhibition Port*).

2. **100% Native Connectors & Wire Routing**
   - Input and output terminal pins, slot geometry, link curvature, and wire interactions remain completely untouched and pixel-perfect.

3. **Active Execution Pulse**
   - Running nodes gently pulse with a breathing glow accent, giving immediate visual feedback during workflow execution.

4. **Curated Built-in Presets**
   - **Zombiehaus Neon (Default)**: Deep midnight obsidian base with cyan/ice-blue accents.
   - **Catppuccin Mocha**: Calming pastel violet and soft rosewater highlights.
   - **Cyberpunk 2077**: Electric yellow borders with vivid cyan accents.
   - **Dracula Noir**: Classic vampiric purple with emerald and pink highlights.
   - **Tokyo Night**: Sleek indigo-slate glass with neon blue accents.
   - **Obsidian Minimal**: Pure understated monochrome with sky-blue accents.

5. **In-App Theme Studio**
   - Accessible via:
     - The top menu bar / floating menu **🎨 Themes** button.
     - Canvas right-click context menu: **🎨 Zombiehaus Theme Studio...**.
     - ComfyUI Settings under *Zombiehaus Card Node Theme*.
     - Console command: `window.zombiehausShowThemeStudio()`.
   - Features:
     - Real-time live node preview as you adjust colors.
     - Color pickers for card background, header background, border color, glow color, accent color, title text, subtitle text, and widget backgrounds.
     - Corner radius slider (4px – 20px).
     - Save as named custom themes.
     - JSON Export & Import to share themes with the community.

6. **Proportional Dynamic Text Editor Resizing**
   - Integrated with the Zombiehaus Text Editor: positive prompt receives ~80% of vertical space, while negative prompt occupies ~20% (1/4 size).
   - Resizes dynamically when dragging the node boundaries horizontally or vertically.

7. **Dual-Mode Compatibility: Modern Nodes 2.0 & Old Style (Classic LiteGraph) Nodes**
   - **Modern Nodes 2.0 (Vue)**: Styled via clean DOM overrides with backdrop blur, rounded borders, and dynamic ResizeObserver tracking.
   - **Old Style Nodes (Classic Canvas)**: Directly decorated in LiteGraph's 2D canvas pipeline (`LGraphCanvas.prototype.drawNode`), rendering crisp outer card borders, matching header and body palette fills, live execution breathing glow pulse, role badges, and widget overlays (`.comfy-multiline-input`).

8. **19" Equipment Rack for Minimized Nodes**
   - **Tactile Server Chassis Aesthetics**: Beautiful on-canvas 19" studio equipment rack frame featuring brushed rails, rack unit mounting screws/rivets, status LEDs, unit count badges (`[ NU • N MODULES ]`), and dark matte chassis styling.
   - **Drag-and-Snap Organization**: Dragging any collapsed/minimized node over an Equipment Rack projects a cyan glowing slot indicator and snaps it flush into the nearest 1U slot.
   - **Auto-Formatting & Vertical Spacing**: Slotted nodes automatically conform to uniform width (`rack.size[0] - 32`), align with a 38px 1U slot pitch, and expand the rack chassis height smoothly.
   - **One-Click Gathering**: Use the **[🗄️ Rack Nodes]** top-bar button, press `Shift + R`, or right-click the canvas and select **🗄️ Rack Minimized Nodes** to automatically collect all collapsed nodes on the canvas into a neat rack.
   - **Quick Extraction & Context Menus**: Dragging a node out detaches it and auto-compacts remaining nodes. Right-clicking collapsed nodes offers **🗄️ Send to Equipment Rack** or **🗄️ Detach from Equipment Rack**.
   - **Workflow JSON Persistence**: Built on top of native `LiteGraph.LGraphGroup`, ensuring all racks and slotted nodes persist seamlessly in ComfyUI workflow files without extra plugins.

9. **Direct GPU Memory Reclamation**
   - Canvas right-click context menu and node right-click context menu both feature **🧹 Clear GPU Memory** for instant PyTorch cache and model unloading.

---

## Configuration & Usage

### Opening the Theme Studio
Click the **🎨 Themes** button in the ComfyUI menu bar, or right-click any empty canvas area and select **🎨 Zombiehaus Theme Studio...**.

### Using the Equipment Rack
- **Rack All Minimized Nodes**: Click **[🗄️ Rack Nodes]** in the top bar or press `Shift + R`.
- **Create an Empty Rack**: Right-click canvas -> **🗄️ Add Equipment Rack**.
- **Dock / Detach Nodes**: Drag minimized nodes into or out of the rack, or right-click any collapsed node to send/detach.

### Saving Custom Themes
1. Adjust any color or corner radius slider.
2. Click **💾 Save as New Theme**.
3. Enter a custom name. Your theme will be persisted to local storage and added to the preset dropdown.

### Exporting & Importing
- Click **📤 Export JSON** to copy or download your theme palette.
- Click **📥 Import JSON** to paste and load palettes created by others.

---

## Troubleshooting

- **Theme doesn't appear after update**: Refresh ComfyUI with `Ctrl + F5` to reload browser cache.
- **Temporarily disable the theme**: In ComfyUI Settings, toggle off `Zombiehaus Card Node Theme`, or open Theme Studio and choose your preferred preset.
