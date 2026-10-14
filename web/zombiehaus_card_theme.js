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
        dock_highlight_color: "#89b4fa",
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
        dock_highlight_color: "#cba6f7",
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
        dock_highlight_color: "#00f0ff",
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
        dock_highlight_color: "#ff79c6",
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
        dock_highlight_color: "#bb9af7",
        title_color: "#c0caf5",
        subtitle_color: "#7dcfff",
        widget_bg: "rgba(15, 15, 23, 0.8)",
        corner_radius: 12
    },
    "Obsidian Minimal": {
        card_bg: "rgba(17, 17, 20, 0.96)",
        header_bg: "rgba(24, 24, 28, 0.98)",
        border_color: "rgba(255, 255, 255, 0.12)",
        border_glow: "rgba(255, 255, 255, 0.22)",
        accent_color: "#94a3b8",
        dock_highlight_color: "#94a3b8",
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

// ── Node Docking & Magnetic Snapping State ─────────────────────────────────────
let _dockingMode = "sticky"; // "sticky" | "snap" | "off"
let _dockingGap = 0; // 0 = flush, 8 = card gutter, 16 = spaced
let _snapThreshold = 32; // trigger distance in canvas coordinates (doubled for effortless magnetic lock)
let _activeSnapGuides = [];
let _lastDragPrimary = null;
let _lastPrimaryPos = null;
let _dragCluster = new Set();
let _clusterOffsets = new Map();

try {
    const savedName = localStorage.getItem("zombiehaus_card_theme_name");
    if (savedName) _activeThemeName = savedName;

    const savedCustom = localStorage.getItem("zombiehaus_card_theme_custom");
    if (savedCustom) _customThemes = JSON.parse(savedCustom);

    const savedEnabled = localStorage.getItem("zombiehaus_card_theme_enabled");
    if (savedEnabled !== null) _themeEnabled = savedEnabled === "true";

    const savedDockMode = localStorage.getItem("zombiehaus_node_docking_mode");
    if (savedDockMode && ["sticky", "snap", "off"].includes(savedDockMode)) {
        _dockingMode = savedDockMode;
    }

    const savedGap = localStorage.getItem("zombiehaus_node_docking_gap");
    if (savedGap !== null) {
        _dockingGap = parseInt(savedGap, 10) || 0;
    }

    const savedSnapThreshold = localStorage.getItem("zombiehaus_node_docking_snap_threshold");
    if (savedSnapThreshold !== null) {
        _snapThreshold = parseInt(savedSnapThreshold, 10) || 32;
    }
} catch (_) {}

function getActiveTheme() {
    if (_customThemes[_activeThemeName]) {
        return _customThemes[_activeThemeName];
    }
    return CARD_THEME_PRESETS[_activeThemeName] || CARD_THEME_PRESETS["Zombiehaus Neon (Default)"];
}

// ── Docking & Magnetized Link Highlight Color Resolver ────────────────────────
function getDockingHighlightColors(theme) {
    const th = theme || getActiveTheme();

    if (th && th.dock_highlight_color) {
        return {
            laserColor: th.dock_highlight_color,
            glowColor: th.border_glow || th.dock_highlight_color,
            seamColor: th.dock_highlight_color,
            seamGlow: th.border_glow || th.dock_highlight_color
        };
    }

    const themeName = (_activeThemeName || "").toLowerCase();
    const isDarkMinimal = (
        themeName.includes("obsidian") ||
        themeName.includes("minimal") ||
        themeName.includes("dark") ||
        themeName.includes("stealth") ||
        themeName.includes("mono")
    );

    if (isDarkMinimal) {
        return {
            laserColor: "rgba(203, 213, 225, 0.85)",
            glowColor: "rgba(255, 255, 255, 0.22)",
            seamColor: "rgba(203, 213, 225, 0.75)",
            seamGlow: "rgba(255, 255, 255, 0.15)"
        };
    }

    const laserColor = (th && (th.accent_color || th.title_color)) || "#cdd6f4";
    const glowColor = (th && th.border_glow) || laserColor;
    return {
        laserColor,
        glowColor,
        seamColor: laserColor,
        seamGlow: glowColor
    };
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
    const dockColors = getDockingHighlightColors(th);

    if (typeof LiteGraph !== "undefined") {
        LiteGraph.CONNECTING_LINK_COLOR = dockColors.laserColor;
    }
    if (app.canvas) {
        app.canvas.connecting_color = dockColors.laserColor;
        app.canvas.highlight_render_link_color = dockColors.laserColor;
    }

    styleEl.textContent = `
        /* ── Zombiehaus Card Theme CSS Variables ── */
        :root {
            --zh-card-bg: ${th.card_bg};
            --zh-card-header-bg: ${th.header_bg};
            --zh-card-border: ${th.border_color};
            --zh-card-glow: ${th.border_glow};
            --zh-card-accent: ${th.accent_color};
            --zh-card-dock-highlight: ${dockColors.laserColor};
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
        .comfy-multiline-input:not(.zombiehaus-syntax-ta),
        .litegraph .comfy-multiline-input:not(.zombiehaus-syntax-ta),
        .litegraph textarea:not(.zombiehaus-syntax-ta),
        .litegraph input[type="text"],
        .litegraph select {
            background: var(--zh-card-widget-bg) !important;
            border: 1px solid var(--zh-card-border) !important;
            border-radius: 6px !important;
            color: var(--zh-card-title) !important;
        }

        /* ── ComfyUI Native Slots & Terminal Pins: 100% Untouched & Aligned ── */
        /* Native slot connectors retain exact geometry, positioning, and wire docking */
        [data-node-id] .comfy-node-slot,
        [data-node-id] [data-testid="slot-container"],
        [data-node-id] svg circle {
            /* Keep native styling, zero layout displacement */
        }
    `;

    // ── Synchronize LiteGraph Classic Canvas Defaults & Node Fills ──
    if (typeof LiteGraph !== "undefined") {
        LiteGraph.NODE_DEFAULT_COLOR = th.header_bg;
        LiteGraph.NODE_DEFAULT_BGCOLOR = th.card_bg;
        LiteGraph.NODE_TEXT_COLOR = th.title_color;
    }
    if (typeof LGraphCanvas !== "undefined") {
        LGraphCanvas.node_title_color = th.title_color;
    }

    if (app.graph && app.graph._nodes) {
        for (const n of app.graph._nodes) {
            if (_themeEnabled) {
                if (!n._hasOriginalColors) {
                    n._hasOriginalColors = true;
                    n._savedColor = n.color;
                    n._savedBgColor = n.bgcolor;
                }
                n.bgcolor = th.card_bg;
                n.color = th.header_bg;
            } else if (n._hasOriginalColors) {
                n.bgcolor = n._savedBgColor;
                n.color = n._savedColor;
                n._hasOriginalColors = false;
            }
        }
    }
    if (app.canvas) {
        app.canvas.setDirty(true, true);
    }
}

// ── Classic LiteGraph Canvas Card Decorator ───────────────────────────────────
function setupClassicCanvasDecorator() {
    if (typeof LGraphCanvas === "undefined") return;

    const origDrawNode = LGraphCanvas.prototype.drawNode;
    LGraphCanvas.prototype.drawNode = function (node, ctx) {
        if (_themeEnabled && node && !node.flags?.collapsed) {
            const th = getActiveTheme();
            if (!node._hasOriginalColors) {
                node._hasOriginalColors = true;
                node._savedColor = node.color;
                node._savedBgColor = node.bgcolor;
            }
            node.bgcolor = th.card_bg;
            node.color = th.header_bg;
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

            // Note: Role subtitles are intentionally omitted from canvas to keep
            // input/output slot labels 100% clean with zero text overlap.

            // 3. Tactile Docked Edge Seams on Connected Cards
            if (_dockingMode !== "off" && app.graph?._nodes) {
                const nBounds = getNodeVisualBounds(node);
                const dockColors = getDockingHighlightColors(th);
                for (const other of app.graph._nodes) {
                    if (other === node || !other.pos || !other.size || other.flags?.collapsed) continue;
                    const oBounds = getNodeVisualBounds(other);
                    if (!nBounds || !oBounds) continue;

                    // Right edge docked flush to other left edge
                    if (Math.abs((nBounds.right + _dockingGap) - oBounds.x) <= 4 &&
                        nBounds.bottom > oBounds.y + 4 && nBounds.y < oBounds.bottom - 4) {
                        ctx.save();
                        ctx.strokeStyle = dockColors.seamColor;
                        ctx.lineWidth = 1.5;
                        ctx.shadowColor = dockColors.seamGlow;
                        ctx.shadowBlur = 4;
                        ctx.beginPath();
                        ctx.moveTo(w, Math.max(0, oBounds.y - node.pos[1]) + 8);
                        ctx.lineTo(w, Math.min(h, oBounds.bottom - node.pos[1]) - 8);
                        ctx.stroke();
                        ctx.restore();
                    }
                    // Bottom edge docked flush to other top edge
                    if (Math.abs((nBounds.bottom + _dockingGap) - oBounds.y) <= 4 &&
                        nBounds.right > oBounds.x + 4 && nBounds.x < oBounds.right - 4) {
                        ctx.save();
                        ctx.strokeStyle = dockColors.seamColor;
                        ctx.lineWidth = 1.5;
                        ctx.shadowColor = dockColors.seamGlow;
                        ctx.shadowBlur = 4;
                        ctx.beginPath();
                        ctx.moveTo(Math.max(0, oBounds.x - node.pos[0]) + 8, h);
                        ctx.lineTo(Math.min(w, oBounds.right - node.pos[0]) - 8, h);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
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

        const dockLabel = _dockingMode === "sticky" ? "Sticky Clusters" : (_dockingMode === "snap" ? "Edge Snap" : "Off");
        options.push({
            content: `🧲 Node Docking: ${dockLabel}...`,
            has_submenu: true,
            callback: () => {},
            submenu: {
                options: [
                    {
                        content: "🧲 Sticky Magnetic Docking" + (_dockingMode === "sticky" ? "  ✓" : ""),
                        callback: () => setDockingMode("sticky")
                    },
                    {
                        content: "📐 Magnetic Edge Snap Only" + (_dockingMode === "snap" ? "  ✓" : ""),
                        callback: () => setDockingMode("snap")
                    },
                    {
                        content: "⚪ Docking Off" + (_dockingMode === "off" ? "  ✓" : ""),
                        callback: () => setDockingMode("off")
                    }
                ]
            }
        });

        return options;
    };
}

// ── Node-to-Node Magnetic Docking & Sticky Movement Logic ─────────────────────
function getNodeVisualBounds(node) {
    if (!node || !node.pos || !node.size) return null;

    let titleH = 0;
    if (node.flags?.collapsed) {
        titleH = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) || 30;
    } else if (node.title_mode === 1 || node.title_mode === 2) {
        // LiteGraph.TRANSPARENT_TITLE = 1, LiteGraph.NO_TITLE = 2
        titleH = 0;
    } else {
        // In ComfyUI modern canvas, nodes feature a 40-42px header bar that accommodates
        // title typography, status badge, title buttons [⬆][☲][🔖], and header divider.
        const baseH = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) || 30;
        titleH = Math.max(42, baseH + 12);
    }

    const x = node.pos[0];
    const y = node.pos[1] - titleH;
    const w = node.flags?.collapsed
        ? (node._collapsed_width || (typeof LiteGraph !== "undefined" && LiteGraph.NODE_COLLAPSED_WIDTH) || 80)
        : node.size[0];
    const h = node.flags?.collapsed ? titleH : (node.size[1] + titleH);

    return {
        x,
        y,
        w,
        h,
        right: x + w,
        bottom: y + h,
        titleOffset: titleH
    };
}

function areNodesDocked(nodeA, nodeB, gap) {
    if (!nodeA || !nodeB || !nodeA.pos || !nodeB.pos || !nodeA.size || !nodeB.size) return false;
    const tol = 16;
    const g = gap || 0;

    const bA = getNodeVisualBounds(nodeA);
    const bB = getNodeVisualBounds(nodeB);
    if (!bA || !bB) return false;

    // 1. Horizontal Adjacency (Side to Side Docking)
    const hAdjacency = (Math.abs((bA.right + g) - bB.x) <= tol) || (Math.abs((bB.right + g) - bA.x) <= tol);
    const vOverlapAmount = Math.min(bA.bottom, bB.bottom) - Math.max(bA.y, bB.y);
    if (hAdjacency && vOverlapAmount >= -tol) return true;

    // 2. Vertical Adjacency (Top and Bottom Docking)
    const vAdjacency = (Math.abs((bA.bottom + g) - bB.y) <= tol) || (Math.abs((bB.bottom + g) - bA.y) <= tol);
    const hOverlapAmount = Math.min(bA.right, bB.right) - Math.max(bA.x, bB.x);
    if (vAdjacency && hOverlapAmount >= -tol) return true;

    return false;
}

function findDockedCluster(seedNodes, allNodes, gap) {
    const cluster = new Set();
    const queue = [];
    for (const n of seedNodes) {
        if (n && n.id != null) {
            cluster.add(n);
            queue.push(n);
        }
    }

    const candidates = (allNodes || []).filter(n => n && !n.flags?.collapsed && n.pos && n.size);

    while (queue.length > 0) {
        const curr = queue.shift();
        for (const candidate of candidates) {
            if (!cluster.has(candidate) && areNodesDocked(curr, candidate, gap)) {
                cluster.add(candidate);
                queue.push(candidate);
            }
        }
    }
    return cluster;
}

function showDockingToast(msg) {
    const existing = document.getElementById("zombiehaus-docking-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "zombiehaus-docking-toast";
    toast.style.cssText = "position: fixed; bottom: 24px; right: 24px; background: rgba(17, 17, 27, 0.94); border: 1px solid rgba(137, 180, 250, 0.4); border-radius: 8px; padding: 10px 16px; color: #cdd6f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6); z-index: 100020; pointer-events: none; backdrop-filter: blur(8px); transition: opacity 0.3s ease, transform 0.3s ease; opacity: 0; transform: translateY(10px);";
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    });
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        setTimeout(() => toast.remove(), 350);
    }, 2400);
}

function setDockingMode(mode) {
    if (!["sticky", "snap", "off"].includes(mode)) mode = "sticky";
    _dockingMode = mode;
    try {
        localStorage.setItem("zombiehaus_node_docking_mode", _dockingMode);
    } catch (_) {}

    updateDockingBtnUI();

    const desc = (
        _dockingMode === "sticky"
            ? "Sticky Magnetic Docking: Nodes lock edge-to-edge and move as connected racks (Hold Alt to detach)"
            : (_dockingMode === "snap"
                ? "Magnetic Edge Snap: Nodes snap flush and align edges independently"
                : "Node Docking: Off (Standard canvas dragging)")
    );
    showDockingToast(`🧲 ${desc}`);

    if (app.canvas) app.canvas.setDirty(true, true);
}

function updateDockingBtnUI() {
    const btn = document.getElementById("zombiehaus-docking-mode-btn");
    if (!btn) return;

    const th = getActiveTheme();
    const dockColors = getDockingHighlightColors(th);
    let dotColor = dockColors.laserColor;
    let modeText = "Sticky";

    if (_dockingMode === "snap") {
        dotColor = dockColors.laserColor;
        modeText = "Snap";
    } else if (_dockingMode === "off") {
        dotColor = "#6c7086";
        modeText = "Off";
    }

    btn.innerHTML = `<span>🧲</span> Dock: <span style="display: inline-flex; align-items: center; gap: 5px; color: ${dotColor};"><span style="width: 7px; height: 7px; border-radius: 50%; background: ${dotColor}; box-shadow: 0 0 6px ${dotColor};"></span>${modeText}</span>`;
}

function attachTopBarControls() {
    let container = document.getElementById("zombiehaus-topbar-controls");
    if (!container) {
        container = document.createElement("div");
        container.id = "zombiehaus-topbar-controls";
        container.className = "zombiehaus-topbar-group";
        container.style.cssText = "display: inline-flex; align-items: center; gap: 4px; margin: 2px 6px; z-index: 100020; user-select: none;";
    }

    // 1. Theme Studio Button
    let themeBtn = document.getElementById("zombiehaus-card-theme-btn");
    if (!themeBtn) {
        themeBtn = document.createElement("button");
        themeBtn.id = "zombiehaus-card-theme-btn";
        themeBtn.type = "button";
        themeBtn.innerHTML = "<span>🎨</span> Themes";
        themeBtn.title = "Zombiehaus Card Theme & Theme Studio (Customize Colors, Borders, Presets)";
        themeBtn.style.cssText = "display: inline-flex; align-items: center; gap: 5px; background: rgba(22, 22, 34, 0.9); border: 1px solid rgba(137, 180, 250, 0.45); border-radius: 6px; padding: 4px 10px; color: #cdd6f4; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);";
        themeBtn.onclick = (e) => {
            e.preventDefault();
            openThemeStudioModal();
        };
        container.appendChild(themeBtn);
    }

    // 2. Docking Mode Button
    let dockBtn = document.getElementById("zombiehaus-docking-mode-btn");
    if (!dockBtn) {
        dockBtn = document.createElement("button");
        dockBtn.id = "zombiehaus-docking-mode-btn";
        dockBtn.type = "button";
        dockBtn.style.cssText = "display: inline-flex; align-items: center; gap: 6px; background: rgba(22, 22, 34, 0.9); border: 1px solid rgba(137, 180, 250, 0.45); border-radius: 6px; padding: 4px 10px; color: #cdd6f4; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);";
        dockBtn.title = "Node-to-Node Edge Docking & Magnetic Snapping. Click to cycle modes (Sticky -> Snap -> Off). Hold Alt while dragging to peel nodes away.";
        dockBtn.onclick = (e) => {
            e.preventDefault();
            const nextMode = (_dockingMode === "sticky") ? "snap" : ((_dockingMode === "snap") ? "off" : "sticky");
            setDockingMode(nextMode);
        };
        container.appendChild(dockBtn);
    }

    updateDockingBtnUI();

    // Insertion strategy:
    // A. Next to settings in ComfyUI modern top bar:
    if (window.app?.menu?.settingsGroup?.element?.parentElement) {
        if (container.parentElement !== window.app.menu.settingsGroup.element.parentElement) {
            window.app.menu.settingsGroup.element.before(container);
            container.style.position = "";
            container.style.top = "";
            container.style.right = "";
        }
        return;
    }

    // B. Inside top menu bar / action bar:
    const menuBar = (
        document.querySelector(".comfyui-menu .comfyui-button-group") ||
        document.querySelector(".comfyui-menu") ||
        document.querySelector("header.comfyui-menu") ||
        document.querySelector(".action-bar") ||
        document.querySelector(".comfy-menu") ||
        document.querySelector("#comfy-menu") ||
        document.querySelector(".side-bar-button-selected")?.parentElement
    );

    if (menuBar) {
        if (container.parentElement !== menuBar) {
            menuBar.appendChild(container);
            container.style.position = "";
            container.style.top = "";
            container.style.right = "";
        }
        return;
    }

    // C. Floating top bar pill over canvas:
    if (container.parentElement !== document.body) {
        container.style.position = "fixed";
        container.style.top = "10px";
        container.style.right = "180px";
        document.body.appendChild(container);
    }
}

function attachDockingToggleBtn() {
    attachTopBarControls();
}

function setupNodeEdgeDocking() {
    if (typeof LGraphCanvas === "undefined") return;

    // 0. Process Mouse Down to lock initial cluster before any position shifts occur
    const origProcessMouseDown = LGraphCanvas.prototype.processMouseDown;
    LGraphCanvas.prototype.processMouseDown = function (e) {
        const res = origProcessMouseDown ? origProcessMouseDown.apply(this, arguments) : undefined;

        _activeSnapGuides = [];
        _dragCluster.clear();
        _clusterOffsets = new Map();
        _lastDragPrimary = null;
        _lastPrimaryPos = null;

        if (_dockingMode === "sticky" && !e.altKey && this.graph?._nodes) {
            const draggedNodes = Object.values(this.selected_nodes || {});
            const primary = draggedNodes[0] || this.node_dragged;
            if (primary && primary.pos && primary.size) {
                _lastDragPrimary = primary;
                _lastPrimaryPos = [primary.pos[0], primary.pos[1]];
                const cluster = findDockedCluster([primary], this.graph._nodes, _dockingGap);
                if (cluster.size > 1) {
                    for (const item of cluster) {
                        _dragCluster.add(item);
                        _clusterOffsets.set(item, [item.pos[0] - primary.pos[0], item.pos[1] - primary.pos[1]]);
                    }
                }
            }
        }
        return res;
    };

    // 1. Process Mouse Move for Magnetic Edge Snapping & Sticky Dragging
    const origProcessMouseMove = LGraphCanvas.prototype.processMouseMove;
    LGraphCanvas.prototype.processMouseMove = function (e) {
        if (_dockingMode === "off") {
            return origProcessMouseMove ? origProcessMouseMove.apply(this, arguments) : undefined;
        }

        const res = origProcessMouseMove ? origProcessMouseMove.apply(this, arguments) : undefined;

        if (!this.graph || !this.graph._nodes) return res;

        const isDragging = (this.isDragging || (this.pointer?.isDown && this.selected_nodes && Object.keys(this.selected_nodes).length > 0) || this.node_dragged);
        if (!isDragging) {
            if (_activeSnapGuides.length > 0) {
                _activeSnapGuides = [];
                this.setDirty(true, true);
            }
            _lastDragPrimary = null;
            _lastPrimaryPos = null;
            _dragCluster.clear();
            _clusterOffsets = new Map();
            return res;
        }

        const draggedNodes = Object.values(this.selected_nodes || {});
        if (draggedNodes.length === 0 && !this.node_dragged) return res;

        const primary = draggedNodes[0] || this.node_dragged;
        if (!primary || !primary.pos || !primary.size) return res;

        // Initialize drag cluster on new drag if not already captured in processMouseDown
        if (_lastDragPrimary !== primary || _dragCluster.size === 0) {
            if (_lastDragPrimary !== primary) {
                _lastDragPrimary = primary;
                _lastPrimaryPos = [primary.pos[0], primary.pos[1]];
                _dragCluster.clear();
                _clusterOffsets = new Map();
            }
            if (_dockingMode === "sticky" && !e.altKey && _dragCluster.size === 0) {
                const cluster = findDockedCluster([primary], this.graph._nodes, _dockingGap);
                if (cluster.size > 1) {
                    for (const item of cluster) {
                        _dragCluster.add(item);
                        _clusterOffsets.set(item, [item.pos[0] - primary.pos[0], item.pos[1] - primary.pos[1]]);
                    }
                }
            }
        }

        // Propagate sticky cluster movement rigidly to all companion nodes
        if (_dockingMode === "sticky" && !e.altKey && _dragCluster.size > 1 && _clusterOffsets) {
            for (const companion of _dragCluster) {
                if (companion !== primary && (!this.selected_nodes || !this.selected_nodes[companion.id])) {
                    const offset = _clusterOffsets.get(companion);
                    if (offset) {
                        companion.pos[0] = primary.pos[0] + offset[0];
                        companion.pos[1] = primary.pos[1] + offset[1];
                        companion.setDirtyCanvas?.(true, true);
                    }
                }
            }
        }
        _lastPrimaryPos = [primary.pos[0], primary.pos[1]];

        // Magnetic Edge Snapping calculations (bypassed if Alt held)
        if (e.altKey) {
            if (_activeSnapGuides.length > 0) {
                _activeSnapGuides = [];
                this.setDirty(true, true);
            }
            return res;
        }

        let bestSnapX = null;
        let minDiffX = _snapThreshold + 1;
        let snapGuideX = null;

        let bestSnapY = null;
        let minDiffY = _snapThreshold + 1;
        let snapGuideY = null;

        const pBounds = getNodeVisualBounds(primary);
        if (!pBounds) return res;
        const gap = _dockingGap;

        for (const other of this.graph._nodes) {
            if (!other || other === primary || _dragCluster.has(other) || (this.selected_nodes && this.selected_nodes[other.id])) continue;
            if (other.flags?.collapsed || !other.pos || !other.size) continue;

            const oBounds = getNodeVisualBounds(other);
            if (!oBounds) continue;

            // Calculate cross-axis distances using true visual boundaries
            const hDist = Math.max(0, Math.max(pBounds.x, oBounds.x) - Math.min(pBounds.right, oBounds.right));
            const vDist = Math.max(0, Math.max(pBounds.y, oBounds.y) - Math.min(pBounds.bottom, oBounds.bottom));

            // ── 1. Vertical Snapping (Top & Bottom Docking + Y Alignments) ─────────
            // Eligible if in horizontal proximity (overlapping or close to same column)
            if (hDist <= _snapThreshold * 2) {
                // A. Dock Top: Primary Bottom flush to Other Top (- gap)
                // Other Top is oBounds.y (the top of other's title bar, fully exposed)
                const targetVisualBottom = oBounds.y - gap;
                const targetPrimaryPos1_top = targetVisualBottom - primary.size[1];
                const dY_top = targetPrimaryPos1_top - primary.pos[1];
                if (Math.abs(dY_top) < minDiffY) {
                    minDiffY = Math.abs(dY_top);
                    bestSnapY = dY_top;
                    snapGuideY = {
                        y: oBounds.y - (gap > 0 ? gap / 2 : 0),
                        x1: Math.min(pBounds.x, oBounds.x) - 12,
                        x2: Math.max(pBounds.right, oBounds.right) + 12,
                        type: "dock_top"
                    };
                }

                // B. Dock Bottom: Primary Top flush to Other Bottom (+ gap)
                // Other Bottom is oBounds.bottom. Primary Top is pBounds.y (pos[1] - titleOffset)
                const targetVisualTop = oBounds.bottom + gap;
                const targetPrimaryPos1_bottom = targetVisualTop + pBounds.titleOffset;
                const dY_bottom = targetPrimaryPos1_bottom - primary.pos[1];
                if (Math.abs(dY_bottom) < minDiffY) {
                    minDiffY = Math.abs(dY_bottom);
                    bestSnapY = dY_bottom;
                    snapGuideY = {
                        y: oBounds.bottom + (gap > 0 ? gap / 2 : 0),
                        x1: Math.min(pBounds.x, oBounds.x) - 12,
                        x2: Math.max(pBounds.right, oBounds.right) + 12,
                        type: "dock_bottom"
                    };
                }

                // C. Align Top: Primary Top to Other Top
                const targetPrimaryPos1_alignTop = oBounds.y + pBounds.titleOffset;
                const dY_alignTop = targetPrimaryPos1_alignTop - primary.pos[1];
                if (Math.abs(dY_alignTop) < minDiffY) {
                    minDiffY = Math.abs(dY_alignTop);
                    bestSnapY = dY_alignTop;
                    snapGuideY = {
                        y: oBounds.y,
                        x1: Math.min(pBounds.x, oBounds.x) - 12,
                        x2: Math.max(pBounds.right, oBounds.right) + 12,
                        type: "align_top"
                    };
                }

                // D. Align Center-Y: Primary Center-Y to Other Center-Y
                const oCenterY = oBounds.y + oBounds.h / 2;
                const pCenterY = pBounds.y + pBounds.h / 2;
                const dY_alignCenter = oCenterY - pCenterY;
                if (Math.abs(dY_alignCenter) < minDiffY) {
                    minDiffY = Math.abs(dY_alignCenter);
                    bestSnapY = dY_alignCenter;
                    snapGuideY = {
                        y: oCenterY,
                        x1: Math.min(pBounds.x, oBounds.x) - 12,
                        x2: Math.max(pBounds.right, oBounds.right) + 12,
                        type: "align_center_y"
                    };
                }

                // E. Align Bottom: Primary Bottom to Other Bottom
                const targetPrimaryPos1_alignBottom = oBounds.bottom - primary.size[1];
                const dY_alignBottom = targetPrimaryPos1_alignBottom - primary.pos[1];
                if (Math.abs(dY_alignBottom) < minDiffY) {
                    minDiffY = Math.abs(dY_alignBottom);
                    bestSnapY = dY_alignBottom;
                    snapGuideY = {
                        y: oBounds.bottom,
                        x1: Math.min(pBounds.x, oBounds.x) - 12,
                        x2: Math.max(pBounds.right, oBounds.right) + 12,
                        type: "align_bottom"
                    };
                }
            }

            // ── 2. Horizontal Snapping (Side to Side Docking + X Alignments) ────────
            // Eligible if in vertical proximity (overlapping or close to same row)
            if (vDist <= _snapThreshold * 2) {
                // A. Dock Left: Primary Right flush to Other Left (- gap)
                const targetX_left = oBounds.x - pBounds.w - gap;
                const dX_left = targetX_left - primary.pos[0];
                if (Math.abs(dX_left) < minDiffX) {
                    minDiffX = Math.abs(dX_left);
                    bestSnapX = dX_left;
                    snapGuideX = {
                        x: oBounds.x - (gap > 0 ? gap / 2 : 0),
                        y1: Math.min(pBounds.y, oBounds.y) - 12,
                        y2: Math.max(pBounds.bottom, oBounds.bottom) + 12,
                        type: "dock_left"
                    };
                }

                // B. Dock Right: Primary Left flush to Other Right (+ gap)
                const targetX_right = oBounds.right + gap;
                const dX_right = targetX_right - primary.pos[0];
                if (Math.abs(dX_right) < minDiffX) {
                    minDiffX = Math.abs(dX_right);
                    bestSnapX = dX_right;
                    snapGuideX = {
                        x: oBounds.right + (gap > 0 ? gap / 2 : 0),
                        y1: Math.min(pBounds.y, oBounds.y) - 12,
                        y2: Math.max(pBounds.bottom, oBounds.bottom) + 12,
                        type: "dock_right"
                    };
                }

                // C. Align Left: Primary Left to Other Left
                const targetX_alignLeft = oBounds.x;
                const dX_alignLeft = targetX_alignLeft - primary.pos[0];
                if (Math.abs(dX_alignLeft) < minDiffX) {
                    minDiffX = Math.abs(dX_alignLeft);
                    bestSnapX = dX_alignLeft;
                    snapGuideX = {
                        x: oBounds.x,
                        y1: Math.min(pBounds.y, oBounds.y) - 12,
                        y2: Math.max(pBounds.bottom, oBounds.bottom) + 12,
                        type: "align_left"
                    };
                }

                // D. Align Center-X: Primary Center-X to Other Center-X
                const targetX_alignCenter = oBounds.x + (oBounds.w - pBounds.w) / 2;
                const dX_alignCenter = targetX_alignCenter - primary.pos[0];
                if (Math.abs(dX_alignCenter) < minDiffX) {
                    minDiffX = Math.abs(dX_alignCenter);
                    bestSnapX = dX_alignCenter;
                    snapGuideX = {
                        x: oBounds.x + oBounds.w / 2,
                        y1: Math.min(pBounds.y, oBounds.y) - 12,
                        y2: Math.max(pBounds.bottom, oBounds.bottom) + 12,
                        type: "align_center_x"
                    };
                }

                // E. Align Right: Primary Right to Other Right
                const targetX_alignRight = oBounds.right - pBounds.w;
                const dX_alignRight = targetX_alignRight - primary.pos[0];
                if (Math.abs(dX_alignRight) < minDiffX) {
                    minDiffX = Math.abs(dX_alignRight);
                    bestSnapX = dX_alignRight;
                    snapGuideX = {
                        x: oBounds.right,
                        y1: Math.min(pBounds.y, oBounds.y) - 12,
                        y2: Math.max(pBounds.bottom, oBounds.bottom) + 12,
                        type: "align_right"
                    };
                }
            }
        }

        // Apply magnetic lock if within threshold
        const newGuides = [];
        if (bestSnapX !== null && Math.abs(bestSnapX) <= _snapThreshold) {
            primary.pos[0] += bestSnapX;
            _lastPrimaryPos[0] = primary.pos[0];
            if (snapGuideX) newGuides.push(snapGuideX);
        }
        if (bestSnapY !== null && Math.abs(bestSnapY) <= _snapThreshold) {
            primary.pos[1] += bestSnapY;
            _lastPrimaryPos[1] = primary.pos[1];
            if (snapGuideY) newGuides.push(snapGuideY);
        }

        // Synchronize cluster companions rigidly to snapped primary position
        if (_dockingMode === "sticky" && !e.altKey && _dragCluster.size > 1 && _clusterOffsets) {
            for (const companion of _dragCluster) {
                if (companion !== primary && (!this.selected_nodes || !this.selected_nodes[companion.id])) {
                    const offset = _clusterOffsets.get(companion);
                    if (offset) {
                        companion.pos[0] = primary.pos[0] + offset[0];
                        companion.pos[1] = primary.pos[1] + offset[1];
                        companion.setDirtyCanvas?.(true, true);
                    }
                }
            }
        }

        _activeSnapGuides = newGuides;
        this.setDirty(true, true);

        return res;
    };

    // 2. Process Mouse Up to finalize snap
    const origProcessMouseUp = LGraphCanvas.prototype.processMouseUp;
    LGraphCanvas.prototype.processMouseUp = function (e) {
        _activeSnapGuides = [];
        _lastDragPrimary = null;
        _lastPrimaryPos = null;
        _dragCluster.clear();
        _clusterOffsets = new Map();
        const res = origProcessMouseUp ? origProcessMouseUp.apply(this, arguments) : undefined;
        this.setDirty(true, true);
        return res;
    };

    // 3. Draw Front Canvas for Magnetic Guides
    const origDrawFrontCanvas = LGraphCanvas.prototype.drawFrontCanvas;
    LGraphCanvas.prototype.drawFrontCanvas = function (ctx) {
        const res = origDrawFrontCanvas ? origDrawFrontCanvas.apply(this, arguments) : undefined;

        if (_dockingMode !== "off" && _activeSnapGuides.length > 0 && ctx) {
            const th = getActiveTheme();
            const dockColors = getDockingHighlightColors(th);
            const glowColor = dockColors.glowColor;
            const laserColor = dockColors.laserColor;

            ctx.save();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = laserColor;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 6;

            for (const g of _activeSnapGuides) {
                if (g.x !== undefined) {
                    ctx.beginPath();
                    ctx.moveTo(g.x, g.y1);
                    ctx.lineTo(g.x, g.y2);
                    ctx.stroke();

                    ctx.fillStyle = laserColor;
                    ctx.beginPath();
                    ctx.arc(g.x, g.y1, 2.5, 0, Math.PI * 2);
                    ctx.arc(g.x, g.y2, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (g.y !== undefined) {
                    ctx.beginPath();
                    ctx.moveTo(g.x1, g.y);
                    ctx.lineTo(g.x2, g.y);
                    ctx.stroke();

                    ctx.fillStyle = laserColor;
                    ctx.beginPath();
                    ctx.arc(g.x1, g.y, 2.5, 0, Math.PI * 2);
                    ctx.arc(g.x2, g.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        return res;
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
        { key: "dock_highlight_color", label: "Dock & Snap Highlight" },
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

        const dockColors = getDockingHighlightColors(tempTheme);
        const seamEl = previewCard.querySelector(".zh-preview-dock-seam");
        if (seamEl) {
            seamEl.style.background = dockColors.laserColor;
            seamEl.style.boxShadow = `0 0 6px ${dockColors.glowColor}`;
        }
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

    previewCard.style.position = "relative";
    previewCard.innerHTML = `
        <div class="zh-preview-dock-seam" style="position: absolute; right: 0; top: 12px; bottom: 12px; width: 2px; border-radius: 2px; z-index: 2; transition: all 0.2s ease;" title="Docking & Connected Seam Accent"></div>
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
        _customThemes[_activeThemeName] = { ...tempTheme };
        try {
            localStorage.setItem("zombiehaus_card_theme_custom", JSON.stringify(_customThemes));
            localStorage.setItem("zombiehaus_card_theme_name", _activeThemeName);
        } catch (_) {}
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

        // Persistent Menu Button Injection for Theme Studio & Docking Controls
        attachTopBarControls();

        const themeBtnTimer = setInterval(() => {
            attachTopBarControls();
        }, 1500);

        if (window.MutationObserver) {
            const mo = new MutationObserver(() => {
                if (!document.getElementById("zombiehaus-topbar-controls") || !document.getElementById("zombiehaus-topbar-controls").isConnected) {
                    attachTopBarControls();
                }
            });
            mo.observe(document.body, { childList: true, subtree: true });
        }

        setupNodeEdgeDocking();

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

            app.ui.settings.addSetting({
                id: "Zombiehaus.NodeDockingMode",
                name: "Zombiehaus Node Snapping & Docking Mode",
                type: "combo",
                defaultValue: _dockingMode === "sticky" ? "Sticky Magnetic Docking" : (_dockingMode === "snap" ? "Magnetic Edge Snap" : "Off"),
                options: ["Sticky Magnetic Docking", "Magnetic Edge Snap", "Off"],
                onChange: (val) => {
                    if (val === "Sticky Magnetic Docking") setDockingMode("sticky");
                    else if (val === "Magnetic Edge Snap") setDockingMode("snap");
                    else setDockingMode("off");
                }
            });

            app.ui.settings.addSetting({
                id: "Zombiehaus.NodeDockingGap",
                name: "Zombiehaus Docked Edge Spacing",
                type: "combo",
                defaultValue: _dockingGap === 0 ? "Flush (0px)" : (_dockingGap === 8 ? "Card Gutter (8px)" : "Spaced (16px)"),
                options: ["Flush (0px)", "Card Gutter (8px)", "Spaced (16px)"],
                onChange: (val) => {
                    if (val === "Flush (0px)") _dockingGap = 0;
                    else if (val === "Card Gutter (8px)") _dockingGap = 8;
                    else _dockingGap = 16;
                    try {
                        localStorage.setItem("zombiehaus_node_docking_gap", String(_dockingGap));
                    } catch (_) {}
                    if (app.canvas) app.canvas.setDirty(true, true);
                }
            });

            app.ui.settings.addSetting({
                id: "Zombiehaus.NodeDockingSnapDistance",
                name: "Zombiehaus Magnetic Snap Distance",
                type: "combo",
                defaultValue: _snapThreshold === 32 ? "Large (32px)" : (_snapThreshold === 48 ? "Extra Large (48px)" : "Standard (16px)"),
                options: ["Standard (16px)", "Large (32px)", "Extra Large (48px)"],
                onChange: (val) => {
                    if (val === "Standard (16px)") _snapThreshold = 16;
                    else if (val === "Large (32px)") _snapThreshold = 32;
                    else _snapThreshold = 48;
                    try {
                        localStorage.setItem("zombiehaus_node_docking_snap_threshold", String(_snapThreshold));
                    } catch (_) {}
                    if (app.canvas) app.canvas.setDirty(true, true);
                }
            });
        }
    }
});
