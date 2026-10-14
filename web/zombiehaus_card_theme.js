import { app } from "../../scripts/app.js";

/**
 * Zombiehaus Universal Card Node Theme & Custom Theme Studio
 * 
 * Re-skins ComfyUI workflow nodes with tactile Zombiehaus Card aesthetics:
 * - Rounded tactile card surfaces with subtle glassmorphic/matte backgrounds
 * - Polished card headers with node ID, drag grip, and role subtitles
 * - Dynamic execution glowing accent pulse on the active node
 * - 100% NATIVE input/output connectors, terminal pins, and wire routing preserved
 * - Built-in presets (Catppuccin Mocha, Zombiehaus Neon, Cyberpunk, Dracula, Tokyo Night, Obsidian Minimal)
 * - In-app Theme Studio for creating, exporting, and importing custom user palettes
 */

// ── Theme Presets ─────────────────────────────────────────────────────────────
const CARD_THEME_PRESETS = {
    "Zombiehaus Neon (Default)": {
        card_bg: "rgba(22, 22, 34, 0.95)",
        header_bg: "rgba(30, 30, 46, 0.98)",
        border_color: "rgba(137, 180, 250, 0.22)",
        border_glow: "#89b4fa",
        accent_color: "#89b4fa",
        title_color: "#cdd6f4",
        subtitle_color: "#89dceb",
        widget_bg: "rgba(17, 17, 27, 0.7)",
        corner_radius: 12
    },
    "Catppuccin Mocha": {
        card_bg: "rgba(30, 30, 46, 0.95)",
        header_bg: "rgba(37, 37, 56, 0.98)",
        border_color: "rgba(203, 166, 247, 0.22)",
        border_glow: "#cba6f7",
        accent_color: "#cba6f7",
        title_color: "#cdd6f4",
        subtitle_color: "#f5c2e7",
        widget_bg: "rgba(24, 24, 37, 0.75)",
        corner_radius: 12
    },
    "Cyberpunk 2077": {
        card_bg: "rgba(18, 19, 26, 0.96)",
        header_bg: "rgba(27, 29, 40, 0.98)",
        border_color: "rgba(254, 222, 0, 0.28)",
        border_glow: "#fede00",
        accent_color: "#00f0ff",
        title_color: "#00f0ff",
        subtitle_color: "#fede00",
        widget_bg: "rgba(10, 10, 15, 0.8)",
        corner_radius: 10
    },
    "Dracula Noir": {
        card_bg: "rgba(25, 24, 36, 0.95)",
        header_bg: "rgba(34, 33, 49, 0.98)",
        border_color: "rgba(189, 147, 249, 0.24)",
        border_glow: "#bd93f9",
        accent_color: "#ff79c6",
        title_color: "#f8f8f2",
        subtitle_color: "#50fa7b",
        widget_bg: "rgba(19, 18, 28, 0.75)",
        corner_radius: 12
    },
    "Tokyo Night": {
        card_bg: "rgba(19, 20, 31, 0.95)",
        header_bg: "rgba(26, 27, 38, 0.98)",
        border_color: "rgba(122, 162, 247, 0.24)",
        border_glow: "#7aa2f7",
        accent_color: "#bb9af7",
        title_color: "#c0caf5",
        subtitle_color: "#7dcfff",
        widget_bg: "rgba(15, 15, 23, 0.8)",
        corner_radius: 12
    },
    "Obsidian Minimal": {
        card_bg: "rgba(17, 17, 20, 0.96)",
        header_bg: "rgba(24, 24, 28, 0.98)",
        border_color: "rgba(255, 255, 255, 0.12)",
        border_glow: "#38bdf8",
        accent_color: "#38bdf8",
        title_color: "#ffffff",
        subtitle_color: "#94a3b8",
        widget_bg: "rgba(10, 10, 12, 0.85)",
        corner_radius: 10
    }
};

// ── State Management ──────────────────────────────────────────────────────────
let _activeThemeName = "Zombiehaus Neon (Default)";
let _customThemes = {};
let _themeEnabled = true;

try {
    const savedName = localStorage.getItem("zombiehaus_card_theme_name");
    if (savedName) _activeThemeName = savedName;

    const savedCustom = localStorage.getItem("zombiehaus_card_theme_custom");
    if (savedCustom) _customThemes = JSON.parse(savedCustom);

    const savedEnabled = localStorage.getItem("zombiehaus_card_theme_enabled");
    if (savedEnabled !== null) _themeEnabled = savedEnabled === "true";
} catch (_) {}

function getActiveTheme() {
    if (_customThemes[_activeThemeName]) {
        return _customThemes[_activeThemeName];
    }
    return CARD_THEME_PRESETS[_activeThemeName] || CARD_THEME_PRESETS["Zombiehaus Neon (Default)"];
}

// ── Role Subtitle Resolver ───────────────────────────────────────────────────
function getNodeRoleSubtitle(nodeType, nodeTitle) {
    const t = (nodeType || "").toLowerCase();
    const title = (nodeTitle || "").toLowerCase();

    if (t.includes("loader") || title.includes("loader") || t.includes("checkpoint") || t.includes("lora") || t.includes("model")) {
        return "Core Model & Asset Loader";
    }
    if (t.includes("text_editor") || t.includes("prompt") || t.includes("cliptext") || title.includes("prompt")) {
        return "Conditioning & Semantic Director";
    }
    if (t.includes("ksampler") || t.includes("sample") || title.includes("sampler")) {
        return "Diffusion Denoising Engine";
    }
    if (t.includes("vae") || title.includes("vae")) {
        return "Latent Pixel Reconstructor";
    }
    if (t.includes("controlnet") || title.includes("controlnet")) {
        return "Structural Guidance Controller";
    }
    if (t.includes("detailer") || t.includes("upscale") || t.includes("dewax") || title.includes("detailer")) {
        return "Refinement & Neural Sculptor";
    }
    if (t.includes("audio") || t.includes("song") || title.includes("audio")) {
        return "Acoustic Synthesizer Core";
    }
    if (t.includes("save") || t.includes("preview") || t.includes("gallery") || title.includes("preview")) {
        return "Output & Exhibition Port";
    }
    if (t.includes("compare") || t.includes("scryer") || t.includes("curator")) {
        return "Inspection & Diagnostics Deck";
    }
    return "Workflow Processing Unit";
}

// ── Dynamic CSS Injection ─────────────────────────────────────────────────────
function applyCardThemeCSS() {
    let styleEl = document.getElementById("zombiehaus-card-theme-style");
    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "zombiehaus-card-theme-style";
        document.head.appendChild(styleEl);
    }

    if (!_themeEnabled) {
        styleEl.textContent = "";
        return;
    }

    const th = getActiveTheme();

    styleEl.textContent = `
        /* ── Zombiehaus Card Theme CSS Variables ── */
        :root {
            --zh-card-bg: ${th.card_bg};
            --zh-card-header-bg: ${th.header_bg};
            --zh-card-border: ${th.border_color};
            --zh-card-glow: ${th.border_glow};
            --zh-card-accent: ${th.accent_color};
            --zh-card-title: ${th.title_color};
            --zh-card-subtitle: ${th.subtitle_color};
            --zh-card-widget-bg: ${th.widget_bg};
            --zh-card-radius: ${th.corner_radius || 12}px;
        }

        /* ── Modern Nodes 2.0 DOM Card Skinning ── */
        [data-node-id] {
            border-radius: var(--zh-card-radius) !important;
            box-shadow: 0 10px 32px -4px rgba(0, 0, 0, 0.55), 0 4px 12px rgba(0, 0, 0, 0.35) !important;
            transition: box-shadow 0.2s ease, border-color 0.2s ease !important;
        }

        /* Card Inner Wrapper */
        [data-node-id] [data-testid="node-inner-wrapper"] {
            background: var(--zh-card-bg) !important;
            border: 1px solid var(--zh-card-border) !important;
            border-radius: var(--zh-card-radius) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            overflow: hidden !important;
        }

        /* Card Header */
        [data-node-id] [data-testid="node-inner-wrapper"] > div:first-child {
            background: var(--zh-card-header-bg) !important;
            border-bottom: 1px solid var(--zh-card-border) !important;
            padding: 2px 4px !important;
        }

        /* Node Title Typography */
        [data-node-id] .node-title,
        [data-node-id] input[aria-label="Node title"],
        [data-node-id] span[data-testid="node-title"] {
            color: var(--zh-card-title) !important;
            font-weight: 600 !important;
            letter-spacing: 0.3px !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6) !important;
        }

        /* Active Execution Glow Pulse */
        [data-node-id].outline-node-stroke-executing,
        [data-node-id] [data-testid="node-state-outline-overlay"] {
            border-color: var(--zh-card-glow) !important;
            box-shadow: 0 0 24px -2px var(--zh-card-glow), inset 0 0 12px -2px var(--zh-card-glow) !important;
            animation: zh-card-executing-pulse 1.8s infinite ease-in-out !important;
        }

        @keyframes zh-card-executing-pulse {
            0%, 100% {
                opacity: 0.85;
                filter: drop-shadow(0 0 8px var(--zh-card-glow));
            }
            50% {
                opacity: 1;
                filter: drop-shadow(0 0 18px var(--zh-card-glow));
            }
        }

        /* Card Widgets Surface */
        [data-node-id] [data-testid^="node-body"] {
            background: transparent !important;
        }

        [data-node-id] .bg-component-node-widget-background,
        [data-node-id] .bg-secondary-background {
            background: var(--zh-card-widget-bg) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            border-radius: 8px !important;
        }

        /* ── Old Style / Classic LiteGraph Canvas Widgets & Textareas ── */
        .comfy-multiline-input,
        .litegraph .comfy-multiline-input,
        .litegraph textarea,
        .litegraph input[type="text"],
        .litegraph select {
            background: var(--zh-card-widget-bg) !important;
            border: 1px solid var(--zh-card-border) !important;
            border-radius: 6px !important;
            color: var(--zh-card-title) !important;
        }

        /* Subtle Card Role Subtitle Badge */
        .zh-card-role-badge {
            font-size: 9.5px;
            font-weight: 500;
            color: var(--zh-card-subtitle);
            opacity: 0.85;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            margin-left: 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            pointer-events: none;
        }

        /* ── ComfyUI Native Slots & Terminal Pins: 100% Untouched & Aligned ── */
        /* Native slot connectors retain exact geometry, positioning, and wire docking */
        [data-node-id] .comfy-node-slot,
        [data-node-id] [data-testid="slot-container"],
        [data-node-id] svg circle {
            /* Keep native styling, zero layout displacement */
        }
    `;
}

// ── Modern Node Subtitle Injector ──
function injectModernNodeRoleBadges() {
    if (!_themeEnabled) return;
    const nodeEls = document.querySelectorAll("[data-node-id]");
    nodeEls.forEach((el) => {
        const nodeId = el.dataset.nodeId;
        if (!nodeId) return;

        const node = app.graph?.getNodeById ? app.graph.getNodeById(nodeId) : null;
        if (!node) return;

        let badge = el.querySelector(".zh-card-role-badge");
        if (!badge) {
            const header = el.querySelector("[data-testid='node-inner-wrapper'] > div:first-child");
            if (header) {
                badge = document.createElement("div");
                badge.className = "zh-card-role-badge";
                header.appendChild(badge);
            }
        }
        if (badge) {
            badge.textContent = getNodeRoleSubtitle(node.type, node.title);
        }
    });
}

// ── Classic LiteGraph Canvas Card Decorator ───────────────────────────────────
function setupClassicCanvasDecorator() {
    if (typeof LGraphCanvas === "undefined") return;

    // Set canvas title color if supported
    const origDrawNode = LGraphCanvas.prototype.drawNode;
    LGraphCanvas.prototype.drawNode = function (node, ctx) {
        if (_themeEnabled && node && !node.flags?.collapsed) {
            const th = getActiveTheme();
            const origColor = node.color;
            const origBgColor = node.bgcolor;
            if (!node._hasOriginalColors) {
                node._hasOriginalColors = true;
                node._savedColor = origColor;
                node._savedBgColor = origBgColor;
            }
            node.bgcolor = th.card_bg;
            if (!origColor || origColor === "#222" || origColor === "#333") {
                node.color = th.header_bg;
            }
        } else if (!_themeEnabled && node && node._hasOriginalColors) {
            node.bgcolor = node._savedBgColor;
            node.color = node._savedColor;
            node._hasOriginalColors = false;
        }

        const res = origDrawNode.apply(this, arguments);

        // Tactile Card Polish on Classic Canvas (after native slots & elements draw)
        if (_themeEnabled && node && !node.flags?.collapsed && ctx && node.size) {
            const th = getActiveTheme();
            const w = node.size[0];
            const h = node.size[1];
            const radius = Math.min(th.corner_radius || 12, 14);

            ctx.save();

            // 1. Crisp Card Outer Border
            ctx.strokeStyle = th.border_color || "rgba(137, 180, 250, 0.25)";
            ctx.lineWidth = 1.5;
            if (typeof ctx.roundRect === "function") {
                ctx.beginPath();
                ctx.roundRect(0, 0, w, h, radius);
                ctx.stroke();
            } else {
                ctx.strokeRect(0, 0, w, h);
            }

            // 2. Active Execution Breathing Glow Pulse on Classic Canvas
            const isExecuting = (
                (app.runningNodeId != null && String(app.runningNodeId) === String(node.id)) ||
                (app.graph?._current_node && String(app.graph._current_node.id) === String(node.id)) ||
                node.executing === true
            );

            if (isExecuting) {
                const now = (typeof performance !== "undefined") ? performance.now() : Date.now();
                const pulse = 0.5 + 0.5 * Math.sin(now / 220);
                ctx.shadowColor = th.border_glow || "#89b4fa";
                ctx.shadowBlur = 12 + 10 * pulse;
                ctx.strokeStyle = th.border_glow || "#89b4fa";
                ctx.lineWidth = 2.5 + pulse;
                if (typeof ctx.roundRect === "function") {
                    ctx.beginPath();
                    ctx.roundRect(-1, -1, w + 2, h + 2, radius);
                    ctx.stroke();
                } else {
                    ctx.strokeRect(-1, -1, w + 2, h + 2);
                }
            }

            // 3. Subtle Role Subtitle on Header (Classic Canvas)
            const role = getNodeRoleSubtitle(node.type, node.title);
            if (role && w > 180) {
                ctx.font = "bold 9px sans-serif";
                ctx.fillStyle = th.subtitle_color || "#89dceb";
                ctx.globalAlpha = 0.75;
                const titleH = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) ? LiteGraph.NODE_TITLE_HEIGHT : 30;
                ctx.fillText(role.toUpperCase(), 12, titleH - 5);
            }

            ctx.restore();
        }

        return res;
    };

    const origGetCanvasMenuOptions = LGraphCanvas.prototype.getCanvasMenuOptions;
    LGraphCanvas.prototype.getCanvasMenuOptions = function () {
        const options = origGetCanvasMenuOptions ? origGetCanvasMenuOptions.apply(this, arguments) : [];
        options.push(null);
        options.push({
            content: "🎨 Zombiehaus Theme Studio...",
            callback: () => {
                openThemeStudioModal();
            }
        });
        return options;
    };
}

// ── In-App Zombiehaus Theme Studio Modal ───────────────────────────────────────
function openThemeStudioModal() {
    const existing = document.getElementById("zombiehaus-theme-studio-modal");
    if (existing) existing.remove();

    const current = { ...getActiveTheme() };
    let tempTheme = { ...current };

    const overlay = document.createElement("div");
    overlay.id = "zombiehaus-theme-studio-modal";
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0, 0, 0, 0.82);
        display: flex; align-items: center; justify-content: center;
        z-index: 10010; backdrop-filter: blur(6px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
        background: #181825; border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px; width: 760px; max-width: 95vw; max-height: 90vh;
        display: flex; flex-direction: column; overflow: hidden;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85); color: #cdd6f4;
    `;

    // Header
    const head = document.createElement("div");
    head.style.cssText = `
        padding: 14px 18px; border-bottom: 1px solid #313244;
        display: flex; justify-content: space-between; align-items: center;
        background: #1e1e2e;
    `;
    head.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🎨</span>
            <span style="font-size: 15px; font-weight: 700; color: #89b4fa;">Zombiehaus Card Theme Studio</span>
        </div>
    `;

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = "background: none; border: none; color: #6c7086; font-size: 18px; cursor: pointer; padding: 2px 8px;";
    closeBtn.onclick = () => overlay.remove();
    head.appendChild(closeBtn);
    dialog.appendChild(head);

    // Body
    const body = document.createElement("div");
    body.style.cssText = "display: flex; flex: 1; min-height: 380px; overflow-y: auto;";

    // Left Column: Controls & Pickers
    const leftCol = document.createElement("div");
    leftCol.style.cssText = "flex: 1.1; padding: 18px; border-right: 1px solid #313244; display: flex; flex-direction: column; gap: 14px;";

    // Theme selector
    const selRow = document.createElement("div");
    selRow.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
    selRow.innerHTML = '<label style="font-size: 11px; font-weight: 700; color: #89b4fa; text-transform: uppercase;">Active Theme Preset</label>';

    const select = document.createElement("select");
    select.style.cssText = "background: #11111b; border: 1px solid #45475a; color: #cdd6f4; padding: 6px 10px; border-radius: 6px; font-size: 13px;";

    const allPresets = { ...CARD_THEME_PRESETS, ..._customThemes };
    Object.keys(allPresets).forEach((k) => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = k;
        if (k === _activeThemeName) opt.selected = true;
        select.appendChild(opt);
    });

    select.onchange = () => {
        _activeThemeName = select.value;
        const th = getActiveTheme();
        tempTheme = { ...th };
        updatePickers();
        updatePreview();
        applyCardThemeCSS();
        localStorage.setItem("zombiehaus_card_theme_name", _activeThemeName);
    };
    selRow.appendChild(select);
    leftCol.appendChild(selRow);

    // Color Pickers
    const pickersContainer = document.createElement("div");
    pickersContainer.style.cssText = "display: flex; flex-direction: column; gap: 10px;";

    const pickers = [
        { key: "card_bg", label: "Card Surface Color" },
        { key: "header_bg", label: "Header Surface Color" },
        { key: "border_color", label: "Card Border Color" },
        { key: "border_glow", label: "Execution Glow Color" },
        { key: "accent_color", label: "Accent Color" },
        { key: "title_color", label: "Title Text Color" },
        { key: "subtitle_color", label: "Subtitle Text Color" },
        { key: "widget_bg", label: "Widget Surface Color" }
    ];

    const pickerInputs = {};

    pickers.forEach((p) => {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; justify-content: space-between; align-items: center;";

        const lbl = document.createElement("span");
        lbl.style.cssText = "font-size: 12px; color: #a6adc8;";
        lbl.textContent = p.label;

        const inputWrap = document.createElement("div");
        inputWrap.style.cssText = "display: flex; align-items: center; gap: 8px;";

        const hexInput = document.createElement("input");
        hexInput.type = "text";
        hexInput.value = tempTheme[p.key] || "#181825";
        hexInput.style.cssText = "width: 130px; background: #11111b; border: 1px solid #45475a; color: #cdd6f4; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-family: monospace;";

        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.style.cssText = "width: 28px; height: 26px; border: none; background: transparent; cursor: pointer; padding: 0;";

        // Extract hex approximation for <input type=color>
        colorPicker.value = (tempTheme[p.key] && tempTheme[p.key].startsWith("#"))
            ? tempTheme[p.key].slice(0, 7)
            : "#89b4fa";

        colorPicker.oninput = () => {
            hexInput.value = colorPicker.value;
            tempTheme[p.key] = colorPicker.value;
            updatePreview();
        };

        hexInput.onchange = () => {
            tempTheme[p.key] = hexInput.value;
            if (hexInput.value.startsWith("#") && hexInput.value.length >= 7) {
                colorPicker.value = hexInput.value.slice(0, 7);
            }
            updatePreview();
        };

        pickerInputs[p.key] = { hexInput, colorPicker };
        inputWrap.appendChild(hexInput);
        inputWrap.appendChild(colorPicker);
        row.appendChild(lbl);
        row.appendChild(inputWrap);
        pickersContainer.appendChild(row);
    });

    leftCol.appendChild(pickersContainer);

    // Corner radius slider
    const radiusRow = document.createElement("div");
    radiusRow.style.cssText = "display: flex; flex-direction: column; gap: 4px; margin-top: 4px;";
    radiusRow.innerHTML = '<div style="display:flex; justify-content:space-between; font-size:12px; color:#a6adc8;"><span>Corner Radius</span><span id="zh-radius-val">12px</span></div>';

    const radiusSlider = document.createElement("input");
    radiusSlider.type = "range";
    radiusSlider.min = "4";
    radiusSlider.max = "24";
    radiusSlider.value = String(tempTheme.corner_radius || 12);
    radiusSlider.style.cssText = "accent-color: #89b4fa; cursor: pointer;";
    radiusSlider.oninput = () => {
        dialog.querySelector("#zh-radius-val").textContent = `${radiusSlider.value}px`;
        tempTheme.corner_radius = parseInt(radiusSlider.value, 10);
        updatePreview();
    };
    radiusRow.appendChild(radiusSlider);
    leftCol.appendChild(radiusRow);

    body.appendChild(leftCol);

    // Right Column: Live Card Preview
    const rightCol = document.createElement("div");
    rightCol.style.cssText = "flex: 1; padding: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #11111b;";

    const previewLabel = document.createElement("div");
    previewLabel.style.cssText = "font-size: 11px; font-weight: 700; color: #6c7086; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;";
    previewLabel.textContent = "Live Node Card Preview";
    rightCol.appendChild(previewLabel);

    const previewCard = document.createElement("div");
    previewCard.style.cssText = `
        width: 290px; border-radius: 12px; overflow: hidden;
        border: 1px solid rgba(137, 180, 250, 0.25);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
        transition: all 0.2s ease;
    `;

    function updatePreview() {
        previewCard.style.background = tempTheme.card_bg;
        previewCard.style.borderColor = tempTheme.border_color;
        previewCard.style.borderRadius = `${tempTheme.corner_radius || 12}px`;

        const headEl = previewCard.querySelector(".zh-preview-head");
        if (headEl) headEl.style.background = tempTheme.header_bg;

        const titleEl = previewCard.querySelector(".zh-preview-title");
        if (titleEl) titleEl.style.color = tempTheme.title_color;

        const subEl = previewCard.querySelector(".zh-preview-sub");
        if (subEl) subEl.style.color = tempTheme.subtitle_color;

        const widgetEls = previewCard.querySelectorAll(".zh-preview-widget");
        widgetEls.forEach((w) => {
            w.style.background = tempTheme.widget_bg;
        });

        const accentEls = previewCard.querySelectorAll(".zh-preview-accent");
        accentEls.forEach((a) => {
            a.style.color = tempTheme.accent_color;
        });
    }

    function updatePickers() {
        pickers.forEach((p) => {
            if (pickerInputs[p.key]) {
                pickerInputs[p.key].hexInput.value = tempTheme[p.key] || "#181825";
                if (tempTheme[p.key] && tempTheme[p.key].startsWith("#")) {
                    pickerInputs[p.key].colorPicker.value = tempTheme[p.key].slice(0, 7);
                }
            }
        });
        radiusSlider.value = String(tempTheme.corner_radius || 12);
        dialog.querySelector("#zh-radius-val").textContent = `${radiusSlider.value}px`;
    }

    previewCard.innerHTML = `
        <div class="zh-preview-head" style="padding: 8px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="opacity: 0.5; font-size: 11px;">⋮⋮</span>
                <span style="font-size: 9px; padding: 1px 5px; border-radius: 4px; background: rgba(255,255,255,0.08); color: #a6adc8;">#12</span>
                <span class="zh-preview-title" style="font-size: 12px; font-weight: 600;">KSampler Advanced</span>
            </div>
            <div class="zh-preview-sub" style="font-size: 9px; font-weight: 500; text-transform: uppercase;">Sampling Core</div>
        </div>
        <div style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div class="zh-preview-widget" style="padding: 6px 10px; border-radius: 6px; font-size: 11px; display: flex; justify-content: space-between;">
                <span style="color: #6c7086;">Steps</span>
                <span class="zh-preview-accent" style="font-weight: 600;">28</span>
            </div>
            <div class="zh-preview-widget" style="padding: 6px 10px; border-radius: 6px; font-size: 11px; display: flex; justify-content: space-between;">
                <span style="color: #6c7086;">CFG Scale</span>
                <span class="zh-preview-accent" style="font-weight: 600;">6.5</span>
            </div>
            <div class="zh-preview-widget" style="padding: 6px 10px; border-radius: 6px; font-size: 11px; display: flex; justify-content: space-between;">
                <span style="color: #6c7086;">Sampler</span>
                <span style="color: #cdd6f4;">euler_ancestral</span>
            </div>
        </div>
    `;

    rightCol.appendChild(previewCard);
    body.appendChild(rightCol);
    dialog.appendChild(body);

    // Footer Actions
    const footer = document.createElement("div");
    footer.style.cssText = `
        padding: 12px 18px; border-top: 1px solid #313244;
        display: flex; justify-content: space-between; align-items: center;
        background: #1e1e2e;
    `;

    const leftBtns = document.createElement("div");
    leftBtns.style.cssText = "display: flex; gap: 8px;";

    const exportBtn = document.createElement("button");
    exportBtn.textContent = "📥 Export JSON";
    exportBtn.style.cssText = "background: #313244; border: 1px solid #45475a; color: #cdd6f4; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;";
    exportBtn.onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tempTheme, null, 2));
        const a = document.createElement("a");
        a.setAttribute("href", dataStr);
        a.setAttribute("download", `${_activeThemeName.replace(/[^a-z0-9]/gi, "_")}_card_theme.json`);
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const importBtn = document.createElement("button");
    importBtn.textContent = "📤 Import JSON";
    importBtn.style.cssText = "background: #313244; border: 1px solid #45475a; color: #cdd6f4; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;";
    importBtn.onclick = () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json";
        fileInput.onchange = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    const name = prompt("Enter a name for this imported theme:", file.name.replace(".json", "")) || "Imported Theme";
                    _customThemes[name] = imported;
                    localStorage.setItem("zombiehaus_card_theme_custom", JSON.stringify(_customThemes));
                    _activeThemeName = name;
                    tempTheme = { ...imported };
                    updatePickers();
                    updatePreview();
                    applyCardThemeCSS();
                    overlay.remove();
                    openThemeStudioModal();
                } catch (err) {
                    alert("Failed to parse theme JSON: " + err.message);
                }
            };
            reader.readAsText(file);
        };
        fileInput.click();
    };

    leftBtns.appendChild(exportBtn);
    leftBtns.appendChild(importBtn);
    footer.appendChild(leftBtns);

    const rightBtns = document.createElement("div");
    rightBtns.style.cssText = "display: flex; gap: 8px;";

    const saveCustomBtn = document.createElement("button");
    saveCustomBtn.textContent = "💾 Save as New Theme";
    saveCustomBtn.style.cssText = "background: #313244; border: 1px solid #89b4fa; color: #89b4fa; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;";
    saveCustomBtn.onclick = () => {
        const newName = prompt("Name your custom theme:", "My Custom Theme");
        if (!newName || !newName.trim()) return;
        _customThemes[newName.trim()] = { ...tempTheme };
        _activeThemeName = newName.trim();
        localStorage.setItem("zombiehaus_card_theme_custom", JSON.stringify(_customThemes));
        localStorage.setItem("zombiehaus_card_theme_name", _activeThemeName);
        applyCardThemeCSS();
        overlay.remove();
        openThemeStudioModal();
    };

    const applyBtn = document.createElement("button");
    applyBtn.textContent = "✓ Apply & Close";
    applyBtn.style.cssText = "background: #89b4fa; border: none; color: #11111b; padding: 6px 16px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;";
    applyBtn.onclick = () => {
        if (_customThemes[_activeThemeName]) {
            _customThemes[_activeThemeName] = { ...tempTheme };
            localStorage.setItem("zombiehaus_card_theme_custom", JSON.stringify(_customThemes));
        }
        applyCardThemeCSS();
        overlay.remove();
    };

    rightBtns.appendChild(saveCustomBtn);
    rightBtns.appendChild(applyBtn);
    footer.appendChild(rightBtns);

    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    updatePreview();
}

window.zombiehausShowThemeStudio = openThemeStudioModal;

// ── ComfyUI Extension Registration ───────────────────────────────────────────
app.registerExtension({
    name: "zombiehaus.CardTheme",

    async setup() {
        applyCardThemeCSS();
        setupClassicCanvasDecorator();

        // Observe DOM for newly mounted Modern Nodes to inject role badges
        if (window.MutationObserver) {
            const mo = new MutationObserver(() => {
                injectModernNodeRoleBadges();
            });
            mo.observe(document.body, { childList: true, subtree: true });
        }
        injectModernNodeRoleBadges();

        // Persistent Menu Button Injection for Theme Studio
        const attachThemeStudioBtn = () => {
            if (document.getElementById("zombiehaus-card-theme-btn")) return;

            const btn = document.createElement("button");
            btn.id = "zombiehaus-card-theme-btn";
            btn.type = "button";
            btn.innerHTML = "<span>🎨</span> Themes";
            btn.title = "Zombiehaus Card Theme & Theme Studio (Customize Colors, Borders, Presets)";
            btn.style.cssText = "display: inline-flex; align-items: center; gap: 5px; background: rgba(22, 22, 34, 0.85); border: 1px solid rgba(137, 180, 250, 0.4); border-radius: 6px; padding: 4px 10px; color: #cdd6f4; font-size: 11px; font-weight: 700; cursor: pointer; margin: 2px 4px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5); z-index: 99990;";
            btn.onclick = (e) => {
                e.preventDefault();
                openThemeStudioModal();
            };

            const menuBar = (
                document.querySelector(".comfyui-menu") ||
                document.querySelector(".comfy-menu") ||
                document.querySelector("#comfy-menu") ||
                document.querySelector(".side-bar-button-selected")?.parentElement ||
                document.querySelector(".comfyui-action-bar") ||
                document.querySelector(".comfyui-body-top") ||
                document.querySelector("header.comfyui-menu") ||
                document.querySelector(".comfyui-nav")
            );

            if (menuBar) {
                menuBar.appendChild(btn);
            } else {
                btn.style.position = "fixed";
                btn.style.top = "10px";
                btn.style.right = "140px";
                document.body.appendChild(btn);
            }
        };

        attachThemeStudioBtn();
        const themeBtnTimer = setInterval(() => {
            attachThemeStudioBtn();
            if (document.getElementById("zombiehaus-card-theme-btn")) {
                clearInterval(themeBtnTimer);
            }
        }, 1000);
        setTimeout(() => clearInterval(themeBtnTimer), 8000);

        // Register ComfyUI Settings
        if (app.ui?.settings) {
            app.ui.settings.addSetting({
                id: "Zombiehaus.CardThemeEnabled",
                name: "Zombiehaus Card Node Theme",
                type: "boolean",
                defaultValue: true,
                onChange: (val) => {
                    _themeEnabled = !!val;
                    try {
                        localStorage.setItem("zombiehaus_card_theme_enabled", String(_themeEnabled));
                    } catch (_) {}
                    applyCardThemeCSS();
                }
            });

            app.ui.settings.addSetting({
                id: "Zombiehaus.CardThemePreset",
                name: "Zombiehaus Card Theme Preset",
                type: "combo",
                defaultValue: _activeThemeName,
                options: Object.keys({ ...CARD_THEME_PRESETS, ..._customThemes }),
                onChange: (val) => {
                    if (val) {
                        _activeThemeName = val;
                        try {
                            localStorage.setItem("zombiehaus_card_theme_name", val);
                        } catch (_) {}
                        applyCardThemeCSS();
                    }
                }
            });
        }
    }
});
