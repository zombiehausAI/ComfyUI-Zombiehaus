import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

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
let _draggedNodeFromRack = null;

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

// ── 19" Equipment Rack for Minimized Nodes ───────────────────────────────────
function isEquipmentRackGroup(g) {
    if (!g) return false;
    if (g.is_equipment_rack === true) return true;
    const title = (g.title || "").toLowerCase();
    return title.includes("equipment rack") || title.includes("node rack") || title.startsWith("🗄️");
}

function findRackUnderPoint(x, y) {
    if (!app.graph || !app.graph._groups) return null;
    for (let i = app.graph._groups.length - 1; i >= 0; i--) {
        const g = app.graph._groups[i];
        if (!isEquipmentRackGroup(g) || !g.pos || !g.size) continue;
        const gx = g.pos[0];
        const gy = g.pos[1];
        const gw = g.size[0];
        const gh = g.size[1];
        if (x >= gx - 10 && x <= gx + gw + 10 && y >= gy - 10 && y <= gy + gh + 10) {
            return g;
        }
    }
    return null;
}

function findRackContainingNode(node) {
    if (!node) return null;
    if (node._equipment_rack && isEquipmentRackGroup(node._equipment_rack)) {
        if (app.graph?._groups && app.graph._groups.includes(node._equipment_rack)) {
            return node._equipment_rack;
        }
        delete node._equipment_rack;
        node._in_equipment_rack = false;
    }
    return null;
}

function getRackNodes(rack) {
    if (!rack || !app.graph?._nodes) return [];
    return app.graph._nodes.filter((n) => (
        n && n.flags?.collapsed && n._equipment_rack === rack
    ));
}

function resolveCanvasAndCtx(arg1, arg2) {
    let ctx = null;
    let canvas = null;
    if (arg1 && typeof arg1.save === "function") {
        ctx = arg1;
        canvas = arg2;
    } else if (arg2 && typeof arg2.save === "function") {
        ctx = arg2;
        canvas = arg1;
    }
    return { ctx, canvas };
}

function sanitizeGraphGroups(graph) {
    if (!graph) return;
    if (graph._nodes && graph._nodes.length > 0) {
        const misplaced = graph._nodes.filter((n) => n && (n.is_equipment_rack === true || isEquipmentRackGroup(n) || n.is_group));
        if (misplaced.length > 0) {
            graph._nodes = graph._nodes.filter((n) => !misplaced.includes(n));
            if (!graph._groups) graph._groups = [];
            for (const m of misplaced) {
                if (graph._nodes_by_id && graph._nodes_by_id[m.id] === m) {
                    delete graph._nodes_by_id[m.id];
                }
                if (!graph._groups.includes(m)) {
                    graph._groups.push(m);
                }
                m.graph = graph;
            }
        }
    }

    if (!graph._groups || !graph._nodes) return;

    const racks = graph._groups.filter((g) => isEquipmentRackGroup(g));
    if (racks.length === 0) return;

    for (const r of racks) {
        r.is_equipment_rack = true;
    }

    // Clean up stale rack references if rack was removed from graph
    for (const n of graph._nodes) {
        if (!n) continue;
        if (n._equipment_rack && !graph._groups.includes(n._equipment_rack)) {
            delete n._equipment_rack;
            n._in_equipment_rack = false;
        }
    }

    // Initialize unassigned collapsed nodes that were saved inside a rack on load
    for (const n of graph._nodes) {
        if (!n || !n.flags?.collapsed || !n.pos) continue;
        if (!n._equipment_rack) {
            for (const r of racks) {
                const rx = r.pos[0];
                const ry = r.pos[1];
                const rw = r.size[0];
                const rh = r.size[1];
                if (n.pos[0] >= rx - 10 && n.pos[0] <= rx + rw + 10 && n.pos[1] >= ry - 10 && n.pos[1] <= ry + rh + 10) {
                    n._equipment_rack = r;
                    n._in_equipment_rack = true;
                    break;
                }
            }
        }
    }

    // Ensure each rack's _nodes strictly contains only its own assigned nodes
    for (const r of racks) {
        r._nodes = graph._nodes.filter((n) => n && n.flags?.collapsed && n._equipment_rack === r);
    }
}

function createEquipmentRack(canvas, pos) {
    if (!app.graph) return null;
    const GroupClass = (typeof LiteGraph !== "undefined" && LiteGraph.LGraphGroup) || 
                       (typeof window !== "undefined" && window.LGraphGroup) || 
                       (typeof LGraphGroup !== "undefined" && LGraphGroup);
    if (!GroupClass) return null;

    const mousePos = pos || (canvas && canvas.graph_mouse) || [200, 200];
    const rack = new GroupClass("🗄️ Equipment Rack");
    rack.is_equipment_rack = true;
    rack.is_group = true;
    rack.pos = [Math.round(mousePos[0]), Math.round(mousePos[1])];
    rack.size = [320, 240];
    rack.color = "#181825";

    try {
        app.graph.add(rack);
    } catch (_) {}

    // Guarantee it is in _groups and purged from _nodes
    sanitizeGraphGroups(app.graph);
    if (!app.graph._groups) app.graph._groups = [];
    if (!app.graph._groups.includes(rack)) {
        app.graph._groups.push(rack);
    }
    rack.graph = app.graph;

    if (canvas) canvas.setDirty(true, true);
    showDockingToast("🗄️ Created Equipment Rack. Drag minimized nodes here to slot them!");
    return rack;
}

function slotNodesIntoRack(rack, nodes, canvas) {
    if (!rack || !nodes) return;
    const railX = rack.pos[0] + 16;
    const innerW = Math.max(220, rack.size[0] - 32);
    const startY = rack.pos[1] + 74; // Aligns 1U module top neatly at rack.pos[1] + 44
    const slotPitch = 38;

    // Find all nodes that belong in this rack
    const existing = (rack._nodes || []).filter((n) => n && n.flags?.collapsed && !nodes.includes(n));
    const allNodes = [...existing, ...nodes.filter((n) => n && n.pos)];

    // Sort by Y coordinate so dragging up/down in rack reorders intuitively
    allNodes.sort((a, b) => (a.pos[1] || 0) - (b.pos[1] || 0));

    allNodes.forEach((n, idx) => {
        n.flags = n.flags || {};
        n.flags.collapsed = true;
        n._collapsed_width = innerW;
        n.size[0] = innerW;
        n.pos[0] = railX;
        n.pos[1] = startY + idx * slotPitch;
        n._in_equipment_rack = true;
        n._equipment_rack = rack;
        if (n.setDirtyCanvas) n.setDirtyCanvas(true, true);
    });

    const neededH = Math.max(180, 56 + allNodes.length * slotPitch);
    if (rack.size[1] < neededH) {
        rack.size[1] = neededH;
    }

    rack.recomputeInsideNodes?.();
    if (canvas) canvas.setDirty(true, true);
}

function compactRackNodes(rack, canvas) {
    if (!rack || !app.graph?._nodes) return;
    const nodesInside = app.graph._nodes.filter((n) => (
        n && n.flags?.collapsed && n._equipment_rack === rack
    ));
    slotNodesIntoRack(rack, nodesInside, canvas);
}

function rackAllMinimizedNodes(canvas) {
    if (!app.graph || !app.graph._nodes) return;
    const collapsedNodes = app.graph._nodes.filter((n) => n && n.flags?.collapsed && !n.flags?.pinned);
    if (collapsedNodes.length === 0) {
        showDockingToast("No minimized nodes found in workflow (select nodes and press Alt+C)");
        return;
    }

    const groups = app.graph._groups || [];
    let rack = groups.find((g) => isEquipmentRackGroup(g));

    if (!rack) {
        const first = collapsedNodes[0];
        const rackPos = [Math.round(first.pos[0] - 20), Math.round(first.pos[1] - 50)];
        rack = createEquipmentRack(canvas, rackPos);
    }

    if (!rack) return;

    slotNodesIntoRack(rack, collapsedNodes, canvas);
    showDockingToast(`🗄️ Racked ${collapsedNodes.length} minimized modules in Equipment Rack!`);
}

function sendNodeToNearestRack(node, canvas) {
    if (!node) return;
    const groups = (app.graph?._groups || []).filter((g) => isEquipmentRackGroup(g));
    let nearestRack = null;
    let minDist = Infinity;
    for (const g of groups) {
        const dx = (g.pos[0] + g.size[0] / 2) - (node.pos[0] + (node.size[0] || 100) / 2);
        const dy = (g.pos[1] + g.size[1] / 2) - (node.pos[1] + 15);
        const dist = Math.hypot(dx, dy);
        if (dist < minDist) {
            minDist = dist;
            nearestRack = g;
        }
    }
    if (!nearestRack) {
        nearestRack = createEquipmentRack(canvas, [node.pos[0] - 20, node.pos[1] - 50]);
    }
    if (nearestRack) {
        slotNodesIntoRack(nearestRack, [node], canvas);
        showDockingToast(`🗄️ Slotted "${node.title || node.type}" into ${nearestRack.title || "Equipment Rack"}`);
    }
}

function detachNodeFromRack(node, canvas) {
    if (!node) return;
    const inRack = findRackContainingNode(node);
    delete node._equipment_rack;
    node._in_equipment_rack = false;
    node._collapsed_width = null;
    node.pos[0] += (inRack ? inRack.size[0] : 320) + 30;
    if (inRack) {
        compactRackNodes(inRack, canvas);
    }
    if (canvas) canvas.setDirty(true, true);
    showDockingToast(`🗄️ Detached "${node.title || node.type}" from Rack`);
}

// ── Coordinate Converter (Graph Space ➔ Client Screen DOM Space) ─────────────
function graphToScreenCoords(canvas, gx, gy) {
    if (!canvas) return [gx, gy, 1];
    const canvasEl = canvas.canvas || canvas.frontcanvas || document.querySelector("canvas#graph-canvas") || document.querySelector("canvas");
    const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };
    if (canvas.ds) {
        const scale = canvas.ds.scale || 1;
        const offsetX = canvas.ds.offset ? canvas.ds.offset[0] : 0;
        const offsetY = canvas.ds.offset ? canvas.ds.offset[1] : 0;
        const x = rect.left + (gx + offsetX) * scale;
        const y = rect.top + (gy + offsetY) * scale;
        return [x, y, scale];
    } else if (canvas.offset && canvas.scale) {
        const scale = canvas.scale || 1;
        const x = rect.left + (gx + canvas.offset[0]) * scale;
        const y = rect.top + (gy + canvas.offset[1]) * scale;
        return [x, y, scale];
    }
    return [rect.left + gx, rect.top + gy, 1];
}

// ── Interactive Patchbay & Wire Management ────────────────────────────────────
let _activePatchbay = null;
let _patchbayCloseTimer = null;

function cancelClosePatchbay() {
    if (_patchbayCloseTimer) {
        clearTimeout(_patchbayCloseTimer);
        _patchbayCloseTimer = null;
    }
}

function closePatchbay(canvas) {
    cancelClosePatchbay();
    _activePatchbay = null;
    const el = document.getElementById("zombiehaus-patchbay-overlay");
    if (el) el.style.display = "none";
    if (canvas && canvas.setDirty) canvas.setDirty(true, true);
}

function scheduleClosePatchbay(canvas, delayMs = 350) {
    cancelClosePatchbay();
    _patchbayCloseTimer = setTimeout(() => {
        closePatchbay(canvas);
    }, delayMs);
}

function getSlotTypeColor(type) {
    if (!type) return "#94a3b8";
    const t = String(type).toUpperCase();
    if (t === "MODEL") return "#f59e0b";
    if (t === "CLIP") return "#eab308";
    if (t === "VAE") return "#ef4444";
    if (t === "LATENT") return "#c084fc";
    if (t === "IMAGE") return "#38bdf8";
    if (t === "CONDITIONING") return "#ec4899";
    if (t === "MASK") return "#10b981";
    if (t === "CONTROL_NET") return "#06b6d4";
    if (t === "AUDIO") return "#a3e635";
    if (t === "STRING" || t === "TEXT") return "#22c55e";
    if (t === "INT" || t === "FLOAT" || t === "NUMBER") return "#60a5fa";
    if (t === "PIPE_LINE" || t === "PIPE") return "#f43f5e";
    if (typeof LiteGraph !== "undefined" && LiteGraph.LGraphCanvas && LiteGraph.LGraphCanvas.link_type_colors) {
        if (LiteGraph.LGraphCanvas.link_type_colors[type]) {
            return LiteGraph.LGraphCanvas.link_type_colors[type];
        }
    }
    return "#89b4fa";
}

function findCollapsedNodeUnderPoint(graph, x, y) {
    if (!graph || !graph._nodes) return null;
    const titleH = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) || 30;
    for (const n of graph._nodes) {
        if (!n || !n.flags?.collapsed || !n.pos) continue;
        const inRack = findRackContainingNode(n);
        const w = inRack ? Math.max(220, inRack.size[0] - 32) : (n._collapsed_width || (n.size ? n.size[0] : 180));
        const nx = n.pos[0];
        const ny = n.pos[1];
        if (x >= nx - 20 && x <= nx + w + 20 && y >= ny - titleH - 15 && y <= ny + 15) {
            return n;
        }
    }
    return null;
}

function startDraggingWireFromOutput(canvas, node, slotIndex) {
    if (!canvas || !node || !node.outputs || !node.outputs[slotIndex]) return;
    const slot = node.outputs[slotIndex];
    if (canvas.linkConnector && typeof canvas.linkConnector.dragNewFromOutput === "function") {
        try {
            canvas.linkConnector.dragNewFromOutput(canvas.graph, node, slot);
        } catch (_) {}
    }
    canvas.connecting_node = node;
    canvas.connecting_slot = slotIndex;
    canvas.connecting_output = slot;
    canvas.connecting_input = null;
    canvas.connecting_pos = [
        canvas.graph_mouse?.[0] || (node.pos[0] + (node.size?.[0] || 180)),
        canvas.graph_mouse?.[1] || (node.pos[1] - 15)
    ];
    if (canvas.setDirty) canvas.setDirty(true, true);
    showDockingToast(`🔌 Dragging "${slot.name || 'output'}" wire... drop onto any input!`);
}

function connectNodesWithWire(canvas, sourceNode, sourceSlotIndex, targetNode, targetSlotIndex) {
    if (!sourceNode || !targetNode) return false;
    try {
        if (typeof sourceNode.connect === "function") {
            sourceNode.connect(sourceSlotIndex, targetNode, targetSlotIndex);
        }
        if (canvas.linkConnector && typeof canvas.linkConnector.reset === "function") {
            try { canvas.linkConnector.reset(true); } catch (_) {}
        }
        canvas.connecting_node = null;
        canvas.connecting_slot = -1;
        canvas.connecting_output = null;
        canvas.connecting_input = null;
        if (canvas.graph?.change) canvas.graph.change();
        if (canvas.setDirty) canvas.setDirty(true, true);
        const sourceSlotName = sourceNode.outputs?.[sourceSlotIndex]?.name || `out ${sourceSlotIndex}`;
        const targetSlotName = targetNode.inputs?.[targetSlotIndex]?.name || `in ${targetSlotIndex}`;
        showDockingToast(`🔌 Wired "${sourceNode.title || sourceNode.type}" [${sourceSlotName}] ➔ "${targetNode.title || targetNode.type}" [${targetSlotName}]`);
        return true;
    } catch (err) {
        console.error("Zombiehaus: failed to connect nodes:", err);
        return false;
    }
}

function findBestInputSlotForOutput(targetNode, outputSlotType, outputSlotName) {
    if (!targetNode || !targetNode.inputs || targetNode.inputs.length === 0) return 0;
    const typeStr = String(outputSlotType || "").toUpperCase();
    const nameStr = String(outputSlotName || "").toLowerCase();

    // 1. Exact type match (e.g. MODEL -> MODEL, LATENT -> LATENT, IMAGE -> IMAGE)
    const exactTypeIdx = targetNode.inputs.findIndex((i) => i && String(i.type).toUpperCase() === typeStr);
    if (exactTypeIdx !== -1) return exactTypeIdx;

    // 2. Substring match on slot name
    if (nameStr.length > 2) {
        const nameIdx = targetNode.inputs.findIndex((i) => i && String(i.name || "").toLowerCase().includes(nameStr));
        if (nameIdx !== -1) return nameIdx;
    }

    // 3. Fallback to first unconnected input
    const firstOpen = targetNode.inputs.findIndex((i) => i && i.link == null);
    if (firstOpen !== -1) return firstOpen;

    return 0;
}

function openPatchbayForNode(node, isInput, canvas) {
    if (!node) return;
    const slots = isInput ? (node.inputs || []) : (node.outputs || []);
    if (slots.length === 0) {
        showDockingToast(`Node has no ${isInput ? "inputs" : "outputs"}`);
        return;
    }

    cancelClosePatchbay();
    const inRack = findRackContainingNode(node);
    const titleH = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) || 30;
    const nodeW = inRack ? Math.max(220, inRack.size[0] - 32) : (node._collapsed_width || (node.size ? node.size[0] : 240));
    const flyoutW = 230;
    const rowH = 28;
    const headerH = 34;
    const flyoutH = headerH + slots.length * rowH + 10;

    let fx, fy;
    if (inRack) {
        if (isInput) {
            fx = inRack.pos[0] - flyoutW - 16;
        } else {
            fx = inRack.pos[0] + inRack.size[0] + 16;
        }
        fy = node.pos[1] - titleH - 6;
    } else {
        if (isInput) {
            fx = node.pos[0] - flyoutW - 16;
        } else {
            fx = node.pos[0] + nodeW + 16;
        }
        fy = node.pos[1] - titleH - 6;
    }

    const items = slots.map((s, idx) => {
        const itemY = fy + headerH + idx * rowH;
        const hasLink = isInput ? (s.link != null) : (s.links && s.links.length > 0);
        return {
            index: idx,
            name: s.name || `Slot ${idx}`,
            type: s.type || "*",
            hasLink: !!hasLink,
            slot: s,
            y1: itemY,
            y2: itemY + rowH
        };
    });

    _activePatchbay = {
        node,
        isInput,
        x: fx,
        y: fy,
        w: flyoutW,
        h: flyoutH,
        hoveredIndex: -1,
        slots: items
    };

    renderDOMPatchbay(_activePatchbay, canvas);
    if (canvas && canvas.setDirty) canvas.setDirty(true, true);
}

function renderDOMPatchbay(patchbay, canvas) {
    let el = document.getElementById("zombiehaus-patchbay-overlay");
    if (!patchbay || !patchbay.node) {
        if (el) el.style.display = "none";
        return;
    }

    if (!el) {
        el = document.createElement("div");
        el.id = "zombiehaus-patchbay-overlay";
        document.body.appendChild(el);
    }

    const { node, isInput, x, y, slots } = patchbay;
    const [screenX, screenY] = graphToScreenCoords(canvas, x, y);

    const clampedX = Math.max(10, Math.min(window.innerWidth - 280, screenX));
    const clampedY = Math.max(10, Math.min(window.innerHeight - 380, screenY));

    const borderGlow = isInput ? "#00f0ff" : "#cba6f7";
    const headerTitle = isInput ? "⇥ INPUT PATCHBAY" : "↦ OUTPUT PATCHBAY";

    el.style.display = "flex";
    el.style.position = "fixed";
    el.style.left = `${Math.round(clampedX)}px`;
    el.style.top = `${Math.round(clampedY)}px`;
    el.style.width = "260px";
    el.style.maxHeight = "420px";
    el.style.background = "rgba(18, 19, 28, 0.98)";
    el.style.border = `1.5px solid ${borderGlow}`;
    el.style.borderRadius = "10px";
    el.style.boxShadow = `0 12px 32px rgba(0, 0, 0, 0.8), 0 0 16px ${isInput ? "rgba(0, 240, 255, 0.25)" : "rgba(203, 166, 247, 0.25)"}`;
    el.style.zIndex = "100050";
    el.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    el.style.color = "#cdd6f4";
    el.style.flexDirection = "column";
    el.style.overflow = "hidden";
    el.style.backdropFilter = "blur(12px)";
    el.style.userSelect = "none";
    el.style.pointerEvents = "auto";

    el.onmouseenter = () => cancelClosePatchbay();
    el.onmouseleave = () => scheduleClosePatchbay(canvas, 400);

    const isConnecting = (canvas?.connecting_node != null) || (canvas?.linkConnector && canvas.linkConnector.isConnecting);

    let html = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(26, 28, 42, 0.98); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 13px;">🔌</span>
                <div>
                    <div style="font-size: 10px; font-weight: 800; color: ${borderGlow}; letter-spacing: 0.5px;">${headerTitle}</div>
                    <div style="font-size: 11px; font-weight: 600; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${node.title || node.type}</div>
                </div>
            </div>
            <button id="zh-pb-close-btn" style="background: transparent; border: none; color: #6c7086; font-size: 13px; cursor: pointer; padding: 2px 6px; border-radius: 4px;">✕</button>
        </div>
        <div style="overflow-y: auto; max-height: 320px; padding: 6px 8px; display: flex; flex-direction: column; gap: 4px;">
    `;

    for (let i = 0; i < slots.length; i++) {
        const item = slots[i];
        const typeColor = getSlotTypeColor(item.type);
        const isHovered = (patchbay.hoveredIndex === i);
        const hasLink = item.hasLink;

        html += `
            <div class="zh-pb-row" data-idx="${i}" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-radius: 6px; background: ${isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isHovered ? borderGlow : 'rgba(255,255,255,0.06)'}; cursor: pointer; transition: all 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${hasLink ? typeColor : 'transparent'}; border: 1.5px solid ${typeColor}; box-shadow: ${hasLink ? `0 0 6px ${typeColor}` : 'none'}; flex-shrink: 0;"></span>
                    <div style="min-width: 0;">
                        <div style="font-size: 11px; font-weight: 600; color: #cdd6f4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
                        <div style="font-size: 9px; color: ${typeColor}; font-weight: 700;">${String(item.type).toUpperCase()}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
        `;

        if (!isInput) {
            html += `
                <button class="zh-pb-action-btn" data-action="drag" data-idx="${i}" style="background: rgba(203, 166, 247, 0.18); border: 1px solid #cba6f7; color: #cba6f7; border-radius: 4px; padding: 3px 8px; font-size: 10px; font-weight: 700; cursor: pointer;">🔌 Drag Wire</button>
            `;
            if (hasLink) {
                html += `
                    <button class="zh-pb-action-btn" data-action="disconnect-out" data-idx="${i}" title="Disconnect output" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.5); color: #f38ba8; border-radius: 4px; padding: 3px 6px; font-size: 10px; cursor: pointer;">✕</button>
                `;
            }
        } else {
            if (isConnecting) {
                html += `
                    <button class="zh-pb-action-btn" data-action="connect-in" data-idx="${i}" style="background: rgba(0, 240, 255, 0.25); border: 1px solid #00f0ff; color: #00f0ff; border-radius: 4px; padding: 3px 8px; font-size: 10px; font-weight: 700; cursor: pointer;">🎯 Connect</button>
                `;
            } else if (hasLink) {
                html += `
                    <button class="zh-pb-action-btn" data-action="disconnect-in" data-idx="${i}" title="Disconnect link" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.5); color: #f38ba8; border-radius: 4px; padding: 3px 6px; font-size: 10px; cursor: pointer;">✕ Disconnect</button>
                `;
            } else {
                html += `
                    <span style="font-size: 9px; color: #6c7086; font-style: italic;">Open</span>
                `;
            }
        }

        html += `
                </div>
            </div>
        `;
    }

    html += `
        </div>
        <div style="padding: 6px 10px; background: rgba(15, 16, 24, 0.95); border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 9px; color: #89b4fa; text-align: center;">
            💡 ${isInput ? "Drop a wire or click Connect to wire up module" : "Click 'Drag Wire' to pull a connection to any node"}
        </div>
    `;

    el.innerHTML = html;

    const closeBtn = el.querySelector("#zh-pb-close-btn");
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            closePatchbay(canvas);
        };
    }

    const rows = el.querySelectorAll(".zh-pb-row");
    rows.forEach((row) => {
        const idx = parseInt(row.getAttribute("data-idx"), 10);
        row.onmouseenter = () => {
            patchbay.hoveredIndex = idx;
            if (canvas && canvas.setDirty) canvas.setDirty(true, true);
        };
    });

    const actionBtns = el.querySelectorAll(".zh-pb-action-btn");
    actionBtns.forEach((btn) => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const action = btn.getAttribute("data-action");
            const idx = parseInt(btn.getAttribute("data-idx"), 10);

            if (action === "drag") {
                startDraggingWireFromOutput(canvas, node, idx);
                closePatchbay(canvas);
            } else if (action === "disconnect-out") {
                node.disconnectOutput?.(idx);
                showDockingToast(`🔌 Disconnected output [${slots[idx]?.name}] on ${node.title}`);
                if (canvas?.graph?.change) canvas.graph.change();
                if (canvas?.setDirty) canvas.setDirty(true, true);
                openPatchbayForNode(node, false, canvas);
            } else if (action === "connect-in") {
                let srcNode = canvas.connecting_node;
                let srcSlot = canvas.connecting_slot;
                if (!srcNode && canvas.linkConnector?.renderLinks?.length > 0) {
                    const rl = canvas.linkConnector.renderLinks[0];
                    srcNode = rl.node || rl.originNode || rl.fromSlot?.node;
                    srcSlot = rl.fromSlotIndex ?? (srcNode && rl.fromSlot ? sourceNode.outputs?.indexOf(rl.fromSlot) : 0);
                }
                if (srcNode) {
                    connectNodesWithWire(canvas, srcNode, srcSlot, node, idx);
                    closePatchbay(canvas);
                }
            } else if (action === "disconnect-in") {
                node.disconnectInput?.(idx);
                showDockingToast(`🔌 Disconnected input [${slots[idx]?.name}] on ${node.title}`);
                if (canvas?.graph?.change) canvas.graph.change();
                if (canvas?.setDirty) canvas.setDirty(true, true);
                openPatchbayForNode(node, true, canvas);
            }
        };
    });
}

// ── 1U Rack Mount Module Renderer (Dedicated Hardware Faceplate & Separator) ─
function draw1URackModule(node, ctx, nodeW, rack) {
    if (!node || !ctx) return;
    const titleH = Math.max(28, (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) || 30);
    const midY = -titleH * 0.5;
    const plateH = Math.max(18, titleH - 10);
    const plateY = -titleH + 5;

    ctx.save();

    // ── 1. Recessed Rack Shelf Separator Channel (Between Slots) ───────────
    // Dark recessed slot seam separating adjacent 1U modules
    ctx.fillStyle = "#0b0c13";
    ctx.fillRect(0, 0, nodeW, 7);

    // Subtle horizontal brushed metal divider rail
    ctx.strokeStyle = "rgba(137, 180, 250, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, 3.5);
    ctx.lineTo(nodeW - 2, 3.5);
    ctx.stroke();

    // Deep shadow groove under rail
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.beginPath();
    ctx.moveTo(2, 4.5);
    ctx.lineTo(nodeW - 2, 4.5);
    ctx.stroke();

    // Ventilation cooling slots in center of separator channel
    const ventW = 28;
    const ventStartX = (nodeW - ventW * 3) / 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
        const vx = ventStartX + i * ventW;
        ctx.beginPath();
        ctx.moveTo(vx + 4, 3.5);
        ctx.lineTo(vx + ventW - 4, 3.5);
        ctx.stroke();
    }

    // ── 2. 1U Solid Chassis Faceplate Panel ────────────────────────────────
    // Sleek brushed matte anodized panel background (100% opaque to block background text)
    const grad = ctx.createLinearGradient(0, -titleH, 0, 0);
    grad.addColorStop(0, "#222538");
    grad.addColorStop(0.5, "#1a1c2a");
    grad.addColorStop(1, "#141622");
    ctx.fillStyle = grad;

    if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(0, -titleH, nodeW, titleH, 4);
        ctx.fill();
    } else {
        ctx.fillRect(0, -titleH, nodeW, titleH);
    }

    // Crisp metallic chassis outer bevel border
    ctx.strokeStyle = "rgba(137, 180, 250, 0.32)";
    ctx.lineWidth = 1.2;
    if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(0, -titleH, nodeW, titleH, 4);
        ctx.stroke();
    } else {
        ctx.strokeRect(0, -titleH, nodeW, titleH);
    }

    // Top milled aluminum highlight edge
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, -titleH + 1);
    ctx.lineTo(nodeW - 2, -titleH + 1);
    ctx.stroke();

    // Bottom milled shadow bevel edge
    ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
    ctx.beginPath();
    ctx.moveTo(2, -0.5);
    ctx.lineTo(nodeW - 2, -0.5);
    ctx.stroke();

    // ── 3. Left & Right 1U Rack Ears & Mounting Screws ─────────────────────
    // Seams at left & right rack mount brackets
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(12, -titleH + 2);
    ctx.lineTo(12, -2);
    ctx.moveTo(nodeW - 12, -titleH + 2);
    ctx.lineTo(nodeW - 12, -2);
    ctx.stroke();

    // Left Rack Ear Screw
    ctx.fillStyle = "#282a3c";
    ctx.beginPath();
    ctx.arc(6, midY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0c0d14";
    ctx.beginPath();
    ctx.arc(6, midY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(137, 180, 250, 0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(4.5, midY); ctx.lineTo(7.5, midY);
    ctx.moveTo(6, midY - 1.5); ctx.lineTo(6, midY + 1.5);
    ctx.stroke();

    // Right Rack Ear Screw
    ctx.fillStyle = "#282a3c";
    ctx.beginPath();
    ctx.arc(nodeW - 6, midY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0c0d14";
    ctx.beginPath();
    ctx.arc(nodeW - 6, midY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(137, 180, 250, 0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(nodeW - 7.5, midY); ctx.lineTo(nodeW - 4.5, midY);
    ctx.moveTo(nodeW - 6, midY - 1.5); ctx.lineTo(nodeW - 6, midY + 1.5);
    ctx.stroke();

    // ── 4. Left Input Jack Module [ ⇥IN ] ──────────────────────────────────
    const plateW = 54;
    const inPlateX = 14;
    if (node.inputs && node.inputs.length > 0) {
        const hasConnectedInput = node.inputs.some((i) => i && i.link != null);
        const inputCount = node.inputs.length;

        ctx.fillStyle = "#12131e";
        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(inPlateX, plateY, plateW, plateH, 4);
            ctx.fill();
        } else {
            ctx.fillRect(inPlateX, plateY, plateW, plateH);
        }

        ctx.strokeStyle = hasConnectedInput ? "#00f0ff" : "rgba(137, 180, 250, 0.4)";
        ctx.lineWidth = 1.2;
        if (hasConnectedInput) {
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 6;
        }
        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(inPlateX, plateY, plateW, plateH, 4);
            ctx.stroke();
        } else {
            ctx.strokeRect(inPlateX, plateY, plateW, plateH);
        }
        ctx.shadowBlur = 0;

        const jackX = inPlateX + 10;
        const jackY = midY;
        ctx.strokeStyle = "rgba(205, 214, 244, 0.9)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(jackX, jackY, 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = hasConnectedInput ? "#00f0ff" : "#11111b";
        if (hasConnectedInput) {
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 5;
        }
        ctx.beginPath();
        ctx.arc(jackX, jackY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = "bold 9px monospace, sans-serif";
        ctx.fillStyle = hasConnectedInput ? "#00f0ff" : "#cdd6f4";
        ctx.fillText("⇥IN", inPlateX + 18, midY + 3);

        const maxDots = Math.min(3, inputCount);
        for (let i = 0; i < maxDots; i++) {
            const slot = node.inputs[i];
            const dotX = inPlateX + plateW + 5 + i * 6;
            const isConn = slot && slot.link != null;
            const dotColor = getSlotTypeColor(slot?.type);
            ctx.fillStyle = isConn ? dotColor : "rgba(255,255,255,0.15)";
            ctx.strokeStyle = dotColor;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(dotX, midY, 1.8, 0, Math.PI * 2);
            if (isConn) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
        }
    }

    // ── 5. Right Output Jack Module [ OUT↦ ] ────────────────────────────────
    const outPlateX = nodeW - plateW - 14;
    if (node.outputs && node.outputs.length > 0) {
        const hasConnectedOutput = node.outputs.some((o) => o && o.links && o.links.length > 0);
        const outputCount = node.outputs.length;

        ctx.fillStyle = "#12131e";
        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(outPlateX, plateY, plateW, plateH, 4);
            ctx.fill();
        } else {
            ctx.fillRect(outPlateX, plateY, plateW, plateH);
        }

        ctx.strokeStyle = hasConnectedOutput ? "#cba6f7" : "rgba(137, 180, 250, 0.4)";
        ctx.lineWidth = 1.2;
        if (hasConnectedOutput) {
            ctx.shadowColor = "#cba6f7";
            ctx.shadowBlur = 6;
        }
        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(outPlateX, plateY, plateW, plateH, 4);
            ctx.stroke();
        } else {
            ctx.strokeRect(outPlateX, plateY, plateW, plateH);
        }
        ctx.shadowBlur = 0;

        ctx.font = "bold 9px monospace, sans-serif";
        ctx.fillStyle = hasConnectedOutput ? "#cba6f7" : "#cdd6f4";
        ctx.fillText("OUT↦", outPlateX + 5, midY + 3);

        const jackX = outPlateX + plateW - 10;
        const jackY = midY;
        ctx.strokeStyle = "rgba(205, 214, 244, 0.9)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(jackX, jackY, 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = hasConnectedOutput ? "#cba6f7" : "#11111b";
        if (hasConnectedOutput) {
            ctx.shadowColor = "#cba6f7";
            ctx.shadowBlur = 5;
        }
        ctx.beginPath();
        ctx.arc(jackX, jackY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        const maxDots = Math.min(3, outputCount);
        for (let i = 0; i < maxDots; i++) {
            const slot = node.outputs[i];
            const dotX = outPlateX - 5 - i * 6;
            const isConn = slot && slot.links && slot.links.length > 0;
            const dotColor = getSlotTypeColor(slot?.type);
            ctx.fillStyle = isConn ? dotColor : "rgba(255,255,255,0.15)";
            ctx.strokeStyle = dotColor;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(dotX, midY, 1.8, 0, Math.PI * 2);
            if (isConn) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
        }
    }

    // ── 6. Crisp, High-Contrast Module Title & Status Jewel LED ────────────
    const rawTitle = (node.getTitle ? node.getTitle() : (node.title || node.type)) || "Node";
    const title = String(rawTitle);

    ctx.save();
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const leftBound = inPlateX + plateW + 28;
    const rightBound = outPlateX - 28;
    const maxTitleW = Math.max(40, rightBound - leftBound);

    let displayTitle = title;
    if (ctx.measureText(displayTitle).width > maxTitleW) {
        while (displayTitle.length > 3 && ctx.measureText(displayTitle + "…").width > maxTitleW) {
            displayTitle = displayTitle.slice(0, -1);
        }
        displayTitle += "…";
    }

    const titleW = ctx.measureText(displayTitle).width;
    const titleCenterX = nodeW / 2;

    // Jewel Status LED next to title
    const jewelColor = (node.color && node.color !== "#222" && node.color !== "#333" && !node.color.startsWith("#1") && !node.color.startsWith("#2"))
        ? node.color
        : "#89b4fa";
    const jewelX = titleCenterX - titleW / 2 - 10;
    ctx.fillStyle = jewelColor;
    ctx.shadowColor = jewelColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(jewelX, midY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Razor-sharp bright off-white text with rich shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(displayTitle, titleCenterX + 4, midY);
    ctx.restore();

    ctx.restore();
}

function drawCollapsedNodeJackPorts(node, ctx) {
    if (!node || !node.flags?.collapsed || !ctx) return;
    const inRack = findRackContainingNode(node);
    if (inRack) return; // Handled exclusively by draw1URackModule

    const titleH = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) || 30;
    const nodeW = node._collapsed_width || (node.size ? node.size[0] : 180);
    const midY = -titleH * 0.5;
    const plateH = Math.max(18, titleH - 10);
    const plateY = -titleH + 5;

    ctx.save();

    // ── 1. Left Input Jack Module ──────────────────────────────────────────
    if (node.inputs && node.inputs.length > 0) {
        const hasConnectedInput = node.inputs.some((i) => i && i.link != null);
        const inputCount = node.inputs.length;
        const plateW = 52;

        ctx.fillStyle = "rgba(18, 20, 32, 0.95)";
        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(4, plateY, plateW, plateH, 4);
            ctx.fill();
        } else {
            ctx.fillRect(4, plateY, plateW, plateH);
        }

        ctx.strokeStyle = hasConnectedInput ? "#00f0ff" : "rgba(137, 180, 250, 0.4)";
        ctx.lineWidth = 1.2;
        if (hasConnectedInput) {
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 6;
        }
        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(4, plateY, plateW, plateH, 4);
            ctx.stroke();
        } else {
            ctx.strokeRect(4, plateY, plateW, plateH);
        }
        ctx.shadowBlur = 0;

        const jackX = 14;
        const jackY = midY;
        ctx.strokeStyle = "rgba(205, 214, 244, 0.85)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(jackX, jackY, 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = hasConnectedInput ? "#00f0ff" : "#11111b";
        if (hasConnectedInput) {
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 5;
        }
        ctx.beginPath();
        ctx.arc(jackX, jackY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = "bold 9px monospace, sans-serif";
        ctx.fillStyle = hasConnectedInput ? "#00f0ff" : "#cdd6f4";
        ctx.fillText(`⇥IN`, 22, midY + 3);

        const maxDots = Math.min(3, inputCount);
        for (let i = 0; i < maxDots; i++) {
            const slot = node.inputs[i];
            const dotX = 4 + plateW + 5 + i * 6;
            const isConn = slot && slot.link != null;
            const dotColor = getSlotTypeColor(slot?.type);
            ctx.fillStyle = isConn ? dotColor : "rgba(255,255,255,0.15)";
            ctx.strokeStyle = dotColor;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(dotX, midY, 1.8, 0, Math.PI * 2);
            if (isConn) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
        }
    }

    // ── 2. Right Output Jack Module ─────────────────────────────────────────
    if (node.outputs && node.outputs.length > 0) {
        const hasConnectedOutput = node.outputs.some((o) => o && o.links && o.links.length > 0);
        const outputCount = node.outputs.length;
        const plateW = 54;
        const plateX = nodeW - plateW - 4;

        ctx.fillStyle = "rgba(18, 20, 32, 0.95)";
        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(plateX, plateY, plateW, plateH, 4);
            ctx.fill();
        } else {
            ctx.fillRect(plateX, plateY, plateW, plateH);
        }

        ctx.strokeStyle = hasConnectedOutput ? "#cba6f7" : "rgba(137, 180, 250, 0.4)";
        ctx.lineWidth = 1.2;
        if (hasConnectedOutput) {
            ctx.shadowColor = "#cba6f7";
            ctx.shadowBlur = 6;
        }
        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(plateX, plateY, plateW, plateH, 4);
            ctx.stroke();
        } else {
            ctx.strokeRect(plateX, plateY, plateW, plateH);
        }
        ctx.shadowBlur = 0;

        ctx.font = "bold 9px monospace, sans-serif";
        ctx.fillStyle = hasConnectedOutput ? "#cba6f7" : "#cdd6f4";
        ctx.fillText(`OUT↦`, plateX + 5, midY + 3);

        const jackX = plateX + plateW - 13;
        const jackY = midY;
        ctx.strokeStyle = "rgba(205, 214, 244, 0.85)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(jackX, jackY, 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = hasConnectedOutput ? "#cba6f7" : "#11111b";
        if (hasConnectedOutput) {
            ctx.shadowColor = "#cba6f7";
            ctx.shadowBlur = 5;
        }
        ctx.beginPath();
        ctx.arc(jackX, jackY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        const maxDots = Math.min(3, outputCount);
        for (let i = 0; i < maxDots; i++) {
            const slot = node.outputs[i];
            const dotX = plateX - 5 - i * 6;
            const isConn = slot && slot.links && slot.links.length > 0;
            const dotColor = getSlotTypeColor(slot?.type);
            ctx.fillStyle = isConn ? dotColor : "rgba(255,255,255,0.15)";
            ctx.strokeStyle = dotColor;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(dotX, midY, 1.8, 0, Math.PI * 2);
            if (isConn) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
        }
    }

    ctx.restore();
}

function drawPatchbayFlyout(patchbay, ctx, canvas) {
    if (!patchbay || !patchbay.node) return;
    const { node, isInput, x, y, w, h, hoveredIndex, slots } = patchbay;
    const inRack = findRackContainingNode(node);
    const titleH = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) || 30;
    const nodeW = inRack ? Math.max(220, inRack.size[0] - 32) : (node._collapsed_width || (node.size ? node.size[0] : 240));

    ctx.save();

    // Connecting laser guide line from collapsed node edge to flyout
    const anchorX = isInput ? node.pos[0] : (node.pos[0] + nodeW);
    const anchorY = node.pos[1] - titleH * 0.5;
    const targetAnchorX = isInput ? (x + w) : x;
    const targetAnchorY = y + 16;

    ctx.strokeStyle = isInput ? "rgba(0, 240, 255, 0.6)" : "rgba(203, 166, 247, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(targetAnchorX, targetAnchorY);
    ctx.stroke();

    // Flyout Container Shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;

    // Flyout Card Background
    ctx.fillStyle = "rgba(17, 18, 28, 0.97)";
    if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
    } else {
        ctx.fillRect(x, y, w, h);
    }

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Flyout Border
    ctx.strokeStyle = isInput ? "rgba(0, 240, 255, 0.6)" : "rgba(203, 166, 247, 0.6)";
    ctx.lineWidth = 1.5;
    if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.stroke();
    } else {
        ctx.strokeRect(x, y, w, h);
    }

    // Header Bar
    const headerH = 32;
    ctx.fillStyle = "rgba(24, 26, 40, 0.98)";
    ctx.fillRect(x + 1, y + 1, w - 2, headerH - 1);
    ctx.strokeStyle = "rgba(137, 180, 250, 0.2)";
    ctx.beginPath();
    ctx.moveTo(x + 1, y + headerH);
    ctx.lineTo(x + w - 1, y + headerH);
    ctx.stroke();

    // Header Title
    ctx.font = "bold 11px monospace, -apple-system, sans-serif";
    ctx.fillStyle = isInput ? "#00f0ff" : "#cba6f7";
    const headerTitle = `${isInput ? "⇥ INPUTS" : "↦ OUTPUTS"} • ${node.title || node.type}`.toUpperCase();
    ctx.fillText(headerTitle.slice(0, 24), x + 10, y + 20);

    // Slot Rows
    const rowH = 28;
    for (let i = 0; i < slots.length; i++) {
        const item = slots[i];
        const rowY = y + headerH + i * rowH;
        const isHovered = (hoveredIndex === i);
        const typeColor = getSlotTypeColor(item.type);

        if (isHovered) {
            ctx.fillStyle = isInput ? "rgba(0, 240, 255, 0.18)" : "rgba(203, 166, 247, 0.18)";
            ctx.fillRect(x + 2, rowY, w - 4, rowH);
            ctx.strokeStyle = isInput ? "rgba(0, 240, 255, 0.5)" : "rgba(203, 166, 247, 0.5)";
            ctx.strokeRect(x + 2, rowY, w - 4, rowH);
        }

        const jackX = isInput ? (x + 16) : (x + w - 16);
        const jackY = rowY + rowH / 2;

        ctx.strokeStyle = typeColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(jackX, jackY, 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = item.hasLink ? typeColor : "rgba(17, 18, 28, 0.9)";
        ctx.beginPath();
        ctx.arc(jackX, jackY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = isHovered ? "bold 11px sans-serif" : "11px sans-serif";
        ctx.fillStyle = isHovered ? "#ffffff" : "#cdd6f4";
        const textX = isInput ? (x + 28) : (x + 10);
        ctx.fillText(item.name.slice(0, 18), textX, rowY + 18);

        if (item.hasLink) {
            ctx.font = "9px monospace";
            ctx.fillStyle = "rgba(166, 227, 161, 0.9)";
            const badge = "●";
            const badgeX = isInput ? (x + w - 18) : (x + 10);
            ctx.fillText(badge, badgeX, rowY + 18);
        }
    }

    ctx.restore();
}

function drawEquipmentRackChassis(group, ctx, canvas) {
    if (!group || !ctx || typeof ctx.save !== "function") return;
    try {
        const x = Number(group.pos?.[0] ?? (group._pos?.[0] ?? 0));
        const y = Number(group.pos?.[1] ?? (group._pos?.[1] ?? 0));
        const w = Number(group.size?.[0] ?? (group._size?.[0] ?? 320));
        const h = Number(group.size?.[1] ?? (group._size?.[1] ?? 240));
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) return;

        ctx.save();

        // 1. Chassis Outer Shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;

        // 2. Chassis Background (Dark Matte Metallic)
        ctx.fillStyle = "rgba(18, 19, 28, 0.96)";
        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 10);
            ctx.fill();
        } else {
            ctx.fillRect(x, y, w, h);
        }

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // 3. Chassis Bevel Border
        ctx.strokeStyle = "rgba(137, 180, 250, 0.35)";
        ctx.lineWidth = 1.5;
        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 10);
            ctx.stroke();
        } else {
            ctx.strokeRect(x, y, w, h);
        }

        // 4. Left & Right 19" Steel Rack Rails (16px wide each)
        const railW = 16;
        ctx.fillStyle = "rgba(28, 30, 44, 0.98)";
        ctx.fillRect(x + 1, y + 1, railW, h - 2);
        ctx.fillRect(x + w - railW - 1, y + 1, railW, h - 2);

        // Rail Divider Lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + railW + 1, y + 1);
        ctx.lineTo(x + railW + 1, y + h - 1);
        ctx.moveTo(x + w - railW - 1, y + 1);
        ctx.lineTo(x + w - railW - 1, y + h - 1);
        ctx.stroke();

        // Screw Rivets along left & right rails every 38px (1U slot spacing centered at y + 59)
        const slotPitch = 38;
        const startY = y + 59;
        const endY = y + h - 18;
        for (let sy = startY; sy <= endY; sy += slotPitch) {
            // Left Rail Screw
            const lx = x + railW / 2 + 1;
            ctx.fillStyle = "rgba(205, 214, 244, 0.4)";
            ctx.beginPath();
            ctx.arc(lx, sy, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#11111b";
            ctx.beginPath();
            ctx.arc(lx, sy, 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Right Rail Screw
            const rx = x + w - railW / 2 - 1;
            ctx.fillStyle = "rgba(205, 214, 244, 0.4)";
            ctx.beginPath();
            ctx.arc(rx, sy, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#11111b";
            ctx.beginPath();
            ctx.arc(rx, sy, 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Subtle 1U slot divider guideline across the interior
            ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
            ctx.beginPath();
            ctx.moveTo(x + railW + 4, sy + 19);
            ctx.lineTo(x + w - railW - 4, sy + 19);
            ctx.stroke();
        }

        // 5. Header Bar (Tactile Faceplate)
        const headerH = 34;
        ctx.fillStyle = "rgba(26, 28, 42, 0.98)";
        ctx.fillRect(x + railW + 1, y + 1, w - 2 * railW - 2, headerH);

        ctx.strokeStyle = "rgba(137, 180, 250, 0.22)";
        ctx.beginPath();
        ctx.moveTo(x + 1, y + headerH);
        ctx.lineTo(x + w - 1, y + headerH);
        ctx.stroke();

        // 6. LED Power Dot (Teal / Neon)
        const ledX = x + railW + 14;
        const ledY = y + headerH / 2 + 1;
        ctx.fillStyle = "#00f0ff";
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ledX, ledY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 7. Rack Title Text
        ctx.font = "bold 12px monospace, -apple-system, sans-serif";
        ctx.fillStyle = "#cdd6f4";
        ctx.fillText(group.title || "EQUIPMENT RACK", ledX + 12, ledY + 4);

        // 8. Units count badge
        const nodesInRack = getRackNodes(group);
        const uCount = nodesInRack.length;
        const badgeText = uCount > 0 ? `[ ${uCount}U • ${uCount} MODULES ]` : "[ EMPTY RACK ]";
        ctx.font = "10px monospace, sans-serif";
        ctx.fillStyle = uCount > 0 ? "rgba(137, 220, 235, 0.85)" : "rgba(108, 112, 134, 0.8)";
        const badgeW = ctx.measureText(badgeText).width;
        ctx.fillText(badgeText, x + w - railW - badgeW - 12, ledY + 4);

        // 9. Watermark if empty
        if (uCount === 0) {
            ctx.font = "11px sans-serif";
            ctx.fillStyle = "rgba(108, 112, 134, 0.4)";
            const hint = "DROP MINIMIZED NODES HERE TO SLOT IN RACK";
            const hintW = ctx.measureText(hint).width;
            ctx.fillText(hint, x + (w - hintW) / 2, y + h / 2 + 6);
        }

        ctx.restore();
    } catch (err) {
        console.error("Zombiehaus: drawEquipmentRackChassis error:", err);
    }
}

// ── Classic LiteGraph Canvas Card Decorator ───────────────────────────────────
function setupClassicCanvasDecorator() {
    if (typeof LGraphCanvas === "undefined") return;
    if (LGraphCanvas.prototype._zombiehaus_canvas_hooked) return;
    LGraphCanvas.prototype._zombiehaus_canvas_hooked = true;

    // Hook group drawing for 19" Equipment Rack chassis across both LiteGraph and ComfyUI Modern Frontend
    const GroupClasses = [
        (typeof LiteGraph !== "undefined" && LiteGraph.LGraphGroup),
        (typeof window !== "undefined" && window.LGraphGroup)
    ].filter(Boolean);

    for (const GC of GroupClasses) {
        if (GC.prototype && !GC.prototype._zombiehaus_hooked) {
            GC.prototype._zombiehaus_hooked = true;
            const origGroupDraw = GC.prototype.draw;
            GC.prototype.draw = function (arg1, arg2) {
                if (isEquipmentRackGroup(this)) {
                    const { ctx, canvas } = resolveCanvasAndCtx(arg1, arg2);
                    if (ctx) {
                        drawEquipmentRackChassis(this, ctx, canvas || this.graph?.canvas);
                        this._drawn_by_proto = true;
                        return;
                    }
                }
                return origGroupDraw ? origGroupDraw.apply(this, arguments) : undefined;
            };

            const origRecompute = GC.prototype.recomputeInsideNodes;
            GC.prototype.recomputeInsideNodes = function () {
                if (isEquipmentRackGroup(this)) {
                    // Equipment Rack: strictly contains ONLY collapsed nodes assigned to THIS rack
                    this._nodes = (this.graph?._nodes || []).filter((n) => (
                        n && n.flags?.collapsed && n._equipment_rack === this
                    ));
                    return;
                }
                // Normal groups: compute normally, but never drag or steal nodes belonging to an equipment rack
                if (origRecompute) {
                    origRecompute.apply(this, arguments);
                }
                if (this._nodes) {
                    this._nodes = this._nodes.filter((n) => !(n && n._in_equipment_rack && n._equipment_rack));
                }
            };

            const origMove = GC.prototype.move;
            GC.prototype.move = function (deltax, deltay, ignore_nodes) {
                if (isEquipmentRackGroup(this)) {
                    this.pos[0] += deltax;
                    this.pos[1] += deltay;
                    if (!ignore_nodes && this.graph?._nodes) {
                        const railX = this.pos[0] + 16;
                        for (const n of this.graph._nodes) {
                            if (n && n.flags?.collapsed && n._equipment_rack === this && n.pos) {
                                n.pos[0] = railX;
                                n.pos[1] += deltay;
                            }
                        }
                    }
                    return;
                }
                return origMove ? origMove.apply(this, arguments) : undefined;
            };
        }
    }

    const NodeClasses = [
        (typeof LiteGraph !== "undefined" && LiteGraph.LGraphNode),
        (typeof window !== "undefined" && window.LGraphNode)
    ].filter(Boolean);

    for (const NC of NodeClasses) {
        if (NC.prototype && !NC.prototype._zombiehaus_rack_hooked) {
            NC.prototype._zombiehaus_rack_hooked = true;
            const origMeasure = NC.prototype.measure;
            if (origMeasure) {
                NC.prototype.measure = function (out, ctx) {
                    const res = origMeasure.apply(this, arguments);
                    if (this.flags?.collapsed) {
                        const rack = findRackContainingNode(this);
                        if (rack) {
                            const innerW = Math.max(220, rack.size[0] - 32);
                            this._collapsed_width = innerW;
                            this.size[0] = innerW;
                            if (out && Array.isArray(out) && out.length >= 3) {
                                out[2] = innerW;
                            }
                        }
                    }
                    return res;
                };
            }
            const origCollapse = NC.prototype.collapse;
            if (origCollapse) {
                NC.prototype.collapse = function () {
                    const res = origCollapse.apply(this, arguments);
                    if (this.flags?.collapsed) {
                        const rack = findRackContainingNode(this);
                        if (rack) {
                            const innerW = Math.max(220, rack.size[0] - 32);
                            this._collapsed_width = innerW;
                            this.size[0] = innerW;
                        }
                    }
                    return res;
                };
            }
        }
    }

    const origDrawGroups = LGraphCanvas.prototype.drawGroups;
    LGraphCanvas.prototype.drawGroups = function (arg1, arg2) {
        sanitizeGraphGroups(this.graph);
        const { ctx, canvas } = resolveCanvasAndCtx(arg1, arg2);

        // Dynamically fit all slotted collapsed nodes to rack width & rail positions
        if (this.graph?._groups && this.graph?._nodes) {
            for (const g of this.graph._groups) {
                if (isEquipmentRackGroup(g) && g.size && g.pos) {
                    const gx = g.pos[0];
                    const gy = g.pos[1];
                    const gw = g.size[0];
                    const gh = g.size[1];
                    const railX = gx + 16;
                    const innerW = Math.max(220, gw - 32);

                    for (const n of this.graph._nodes) {
                        if (!n || !n.flags?.collapsed || !n.pos) continue;
                        if (n._equipment_rack === g) {
                            const isDraggingNode = (_lastDragPrimary === n) || (this.selected_nodes && this.selected_nodes[n.id]);
                            if (!isDraggingNode) {
                                n.pos[0] = railX;
                            }
                            n._collapsed_width = innerW;
                            n.size[0] = innerW;
                            n._in_equipment_rack = true;
                        }
                    }
                }
            }
        }

        const res = origDrawGroups ? origDrawGroups.apply(this, arguments) : undefined;
        if (ctx && this.graph?._groups) {
            for (const g of this.graph._groups) {
                if (isEquipmentRackGroup(g) && !g._drawn_by_proto) {
                    drawEquipmentRackChassis(g, ctx, canvas || this);
                }
                delete g._drawn_by_proto;
            }
        }
        return res;
    };

    if (LGraphCanvas.prototype.drawNodeCollapsed && !LGraphCanvas.prototype._zombiehaus_drawCollapsed_hooked) {
        LGraphCanvas.prototype._zombiehaus_drawCollapsed_hooked = true;
        const origDrawNodeCollapsed = LGraphCanvas.prototype.drawNodeCollapsed;
        LGraphCanvas.prototype.drawNodeCollapsed = function (node, ctx) {
            const rack = findRackContainingNode(node);
            if (rack) {
                const innerW = Math.max(220, rack.size[0] - 32);
                node._collapsed_width = innerW;
                node.size[0] = innerW;
                draw1URackModule(node, ctx, innerW, rack);
                return;
            }
            return origDrawNodeCollapsed ? origDrawNodeCollapsed.apply(this, arguments) : undefined;
        };
    }

    const origDrawNode = LGraphCanvas.prototype.drawNode;
    LGraphCanvas.prototype.drawNode = function (node, ctx) {
        if (!node || node.is_group || isEquipmentRackGroup(node) || !node.inputs) {
            return;
        }
        if (node.flags?.collapsed) {
            const rack = findRackContainingNode(node);
            if (rack) {
                const innerW = Math.max(220, rack.size[0] - 32);
                node._collapsed_width = innerW;
                node.size[0] = innerW;
                const isDraggingNode = (_lastDragPrimary === node) || (this.selected_nodes && this.selected_nodes[node.id]);
                if (!isDraggingNode) {
                    node.pos[0] = rack.pos[0] + 16;
                }
                draw1URackModule(node, ctx, innerW, rack);
                return;
            }
        }
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

        if (node.flags?.collapsed) {
            const rack = findRackContainingNode(node);
            if (rack) {
                const innerW = Math.max(220, rack.size[0] - 32);
                node._collapsed_width = innerW;
                node.size[0] = innerW;
            }
        }

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

            // 3. Locked Node Visual Badge
            if (node.flags?.pinned || node.locked) {
                ctx.save();
                ctx.font = "bold 11px sans-serif";
                ctx.fillStyle = "#f9e2af";
                ctx.shadowColor = "rgba(249, 226, 175, 0.7)";
                ctx.shadowBlur = 6;
                ctx.fillText("🔒", w - 24, 22);
                ctx.restore();
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

        // Tactile Jack Ports on Minimized / Collapsed Nodes
        if (_themeEnabled && node && node.flags?.collapsed && ctx) {
            drawCollapsedNodeJackPorts(node, ctx);
        }

        return res;
    };

    const origGetCanvasMenuOptions = LGraphCanvas.prototype.getCanvasMenuOptions;
    LGraphCanvas.prototype.getCanvasMenuOptions = function () {
        const options = origGetCanvasMenuOptions ? origGetCanvasMenuOptions.apply(this, arguments) : [];
        options.push(null);
        options.push({
            content: "🗄️ Add Equipment Rack",
            callback: () => {
                createEquipmentRack(this, this.graph_mouse);
            }
        });
        options.push({
            content: "🗄️ Rack Minimized Nodes",
            callback: () => {
                rackAllMinimizedNodes(this);
            }
        });
        options.push({
            content: "🗄️ Re-slot All Equipment Racks",
            callback: () => {
                if (this.graph?._groups) {
                    for (const g of this.graph._groups) {
                        if (isEquipmentRackGroup(g)) {
                            compactRackNodes(g, this);
                        }
                    }
                }
                showDockingToast("🗄️ Re-slotted and cleaned all Equipment Racks");
            }
        });
        options.push({
            content: "🧹 Clear GPU Memory",
            callback: () => {
                clearGpuMemory();
            }
        });
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

    const origGetGroupMenuOptions = LGraphCanvas.prototype.getGroupMenuOptions;
    LGraphCanvas.prototype.getGroupMenuOptions = function (group) {
        const options = origGetGroupMenuOptions ? origGetGroupMenuOptions.apply(this, arguments) : [];
        if (group && isEquipmentRackGroup(group)) {
            options.push(null);
            options.push({
                content: "🗄️ Clean & Re-slot Rack",
                callback: () => {
                    compactRackNodes(group, this);
                    showDockingToast(`🗄️ Cleaned and re-slotted ${group.title || "Equipment Rack"}`);
                }
            });
            options.push({
                content: "🗄️ Detach All Nodes from Rack",
                callback: () => {
                    const rackNodes = getRackNodes(group);
                    for (const n of rackNodes) {
                        detachNodeFromRack(n, this);
                    }
                    showDockingToast(`🗄️ Detached all nodes from ${group.title || "Equipment Rack"}`);
                }
            });
        }
        return options;
    };

    const origGetNodeMenuOptions = LGraphCanvas.prototype.getNodeMenuOptions;
    LGraphCanvas.prototype.getNodeMenuOptions = function (node) {
        const options = origGetNodeMenuOptions ? origGetNodeMenuOptions.apply(this, arguments) : [];
        if (!node) return options;

        const cluster = findDockedCluster([node], this.graph?._nodes || [], _dockingGap);
        const isCluster = cluster.size > 1;
        const isLocked = !!(node.flags?.pinned || node.locked);
        const isClusterLocked = isCluster && Array.from(cluster).some((n) => n.flags?.pinned || n.locked);

        options.push(null); // Separator

        if (node.flags?.collapsed) {
            const inRack = findRackContainingNode(node);
            if (inRack) {
                options.push({
                    content: "🗄️ Detach from Equipment Rack",
                    callback: () => {
                        detachNodeFromRack(node, this);
                    }
                });
            } else {
                options.push({
                    content: "🗄️ Send to Equipment Rack",
                    callback: () => {
                        sendNodeToNearestRack(node, this);
                    }
                });
            }
        }

        if (node.flags?.collapsed) {
            if (node.inputs && node.inputs.length > 0) {
                options.push({
                    content: "🔌 Open Inputs Patchbay",
                    callback: () => {
                        openPatchbayForNode(node, true, this);
                    }
                });
            }
            if (node.outputs && node.outputs.length > 0) {
                options.push({
                    content: "🔌 Open Outputs Patchbay",
                    callback: () => {
                        openPatchbayForNode(node, false, this);
                    }
                });
            }
        }

        options.push({
            content: "🧹 Clear GPU Memory",
            callback: () => {
                clearGpuMemory();
            }
        });

        if (isCluster) {
            options.push({
                content: isClusterLocked ? "🔓 Unlock Sticky Rack in Place" : "🔒 Lock Sticky Rack in Place",
                callback: () => {
                    toggleSelectedClusterLock(node);
                }
            });
            options.push({
                content: "🧲 Select Entire Sticky Rack",
                callback: () => {
                    for (const n of cluster) {
                        this.selectNode(n, true);
                    }
                    this.setDirty(true, true);
                }
            });
        }

        options.push({
            content: isLocked ? "🔓 Unlock This Node" : "🔒 Lock This Node in Place",
            callback: () => {
                node.flags = node.flags || {};
                node.flags.pinned = !isLocked;
                node.locked = !isLocked;
                this.setDirty(true, true);
                showDockingToast(node.locked ? `🔒 Locked "${node.title || node.type}" in place` : `🔓 Unlocked "${node.title || node.type}"`);
            }
        });

        return options;
    };
}

// ── Node-to-Node Magnetic Docking & Sticky Movement Logic ─────────────────────
function getNodeVisualBounds(node) {
    if (!node || !node.pos || !node.size) return null;

    const baseTitleH = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) || 30;
    const isCollapsed = Boolean(node.flags?.collapsed);
    const titleH = Math.max(30, baseTitleH);

    const x = node.pos[0];
    const y = node.pos[1] - titleH;
    const inRack = isCollapsed ? findRackContainingNode(node) : null;
    const rackW = inRack ? Math.max(220, inRack.size[0] - 32) : null;
    const w = isCollapsed
        ? (rackW || node._collapsed_width || (typeof LiteGraph !== "undefined" && LiteGraph.NODE_COLLAPSED_WIDTH) || 80)
        : node.size[0];
    const h = isCollapsed ? titleH : (node.size[1] + titleH);

    return {
        x,
        y,
        w,
        h,
        right: x + w,
        bottom: y + h,
        titleH,
        isCollapsed
    };
}

function getGroupVisualBounds(group) {
    if (!group || !group.pos || !group.size) return null;
    const x = group.pos[0];
    const y = group.pos[1];
    const w = group.size[0];
    const h = group.size[1];
    return {
        x,
        y,
        w,
        h,
        right: x + w,
        bottom: y + h,
        isGroup: true,
        group
    };
}

function areNodesDocked(nodeA, nodeB, gap) {
    if (!nodeA || !nodeB || !nodeA.pos || !nodeB.pos || !nodeA.size || !nodeB.size) return false;
    const tol = 18;
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

function toggleSelectedClusterLock(targetNode) {
    if (!app.graph?._nodes) return;
    const canvas = app.canvas;
    const selected = Object.values(canvas?.selected_nodes || {});
    const node = targetNode || selected[0] || canvas?.current_node || canvas?.node_over;

    if (!node) {
        showDockingToast("Select a node or sticky rack to lock/unlock");
        return;
    }

    const cluster = findDockedCluster([node], app.graph._nodes, _dockingGap);
    const nodesToToggle = cluster.size > 0 ? Array.from(cluster) : [node];

    const anyLocked = nodesToToggle.some((n) => n.flags?.pinned || n.locked);
    const newLockState = !anyLocked;

    for (const n of nodesToToggle) {
        n.flags = n.flags || {};
        n.flags.pinned = newLockState;
        n.locked = newLockState;
        n.setDirtyCanvas?.(true, true);
    }

    if (canvas) canvas.setDirty(true, true);

    const count = nodesToToggle.length;
    const label = count > 1 ? `Sticky Rack (${count} nodes)` : `Node "${node.title || node.type}"`;
    if (newLockState) {
        showDockingToast(`🔒 Locked ${label} in place (Shift+L to unlock)`);
    } else {
        showDockingToast(`🔓 Unlocked ${label}`);
    }
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

async function clearGpuMemory() {
    showDockingToast("🧹 Purging GPU VRAM & cache...");
    try {
        const payload = JSON.stringify({ unload_models: true, free_memory: true });
        const comfyApi = (typeof api !== "undefined" && api) || app.api || window.api;
        let res;
        if (comfyApi?.fetchApi) {
            try {
                res = await comfyApi.fetchApi("/free", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload
                });
            } catch (_) {
                res = await comfyApi.fetchApi("/api/free", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload
                });
            }
        } else {
            res = await fetch("/free", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: payload
            });
        }
        if (res && !res.ok && res.status !== 200) {
            throw new Error(`Server returned HTTP ${res.status}`);
        }
        showDockingToast("✨ GPU VRAM & model cache cleared!");
        if (app.canvas) {
            app.canvas.setDirty(true, true);
        }
    } catch (err) {
        console.error("[Zombiehaus] Error clearing GPU memory:", err);
        showDockingToast("⚠️ Failed to clear GPU memory: " + (err.message || err));
    }
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

        // 3. Lock Rack in Place Button
        let lockBtn = document.getElementById("zombiehaus-lock-cluster-btn");
        if (!lockBtn) {
            lockBtn = document.createElement("button");
            lockBtn.id = "zombiehaus-lock-cluster-btn";
            lockBtn.type = "button";
            lockBtn.style.cssText = "display: inline-flex; align-items: center; gap: 5px; background: rgba(22, 22, 34, 0.9); border: 1px solid rgba(137, 180, 250, 0.45); border-radius: 6px; padding: 4px 10px; color: #cdd6f4; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);";
            lockBtn.title = "Lock / Unlock Selected Node Rack in Place (Shift+L). Pinned nodes cannot be moved.";
            lockBtn.innerHTML = "<span>🔒</span> Lock Rack";
            lockBtn.onclick = (e) => {
                e.preventDefault();
                toggleSelectedClusterLock();
            };
            container.appendChild(lockBtn);
        }

        // 4. Equipment Rack Button
        let rackBtn = document.getElementById("zombiehaus-rack-nodes-btn");
        if (!rackBtn) {
            rackBtn = document.createElement("button");
            rackBtn.id = "zombiehaus-rack-nodes-btn";
            rackBtn.type = "button";
            rackBtn.style.cssText = "display: inline-flex; align-items: center; gap: 5px; background: rgba(22, 22, 34, 0.9); border: 1px solid rgba(137, 180, 250, 0.45); border-radius: 6px; padding: 4px 10px; color: #cdd6f4; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);";
            rackBtn.title = "Rack Minimized Nodes (Shift+R): Gather all collapsed nodes into an organized 19\" Equipment Rack frame.";
            rackBtn.innerHTML = "<span>🗄️</span> Rack Nodes";
            rackBtn.onclick = (e) => {
                e.preventDefault();
                rackAllMinimizedNodes(app.canvas);
            };
            container.appendChild(rackBtn);
        }
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

        if (this.selected_group) {
            _draggedNodeFromRack = null;
            _lastDragPrimary = null;
        } else {
            const draggedNodes = Object.values(this.selected_nodes || {});
            const primary = draggedNodes[0] || this.current_node;
            if (primary && primary.flags?.collapsed) {
                _draggedNodeFromRack = findRackContainingNode(primary);
            } else {
                _draggedNodeFromRack = null;
            }
        }

        // 1. Check if user clicked a slot inside an active Mini Patchbay Flyout (canvas hit)
        if (_activePatchbay && _activePatchbay.hoveredIndex >= 0) {
            const pb = _activePatchbay;
            const slotItem = pb.slots[pb.hoveredIndex];
            if (slotItem) {
                if (!pb.isInput) {
                    startDraggingWireFromOutput(this, pb.node, slotItem.index);
                    closePatchbay(this);
                    return true;
                } else {
                    if (slotItem.hasLink) {
                        pb.node.disconnectInput(slotItem.index);
                        showDockingToast(`🔌 Disconnected "${slotItem.name}" on ${pb.node.title || pb.node.type}`);
                        slotItem.hasLink = false;
                        if (this.graph?.change) this.graph.change();
                        this.setDirty(true, true);
                        renderDOMPatchbay(pb, this);
                        return true;
                    } else {
                        const isConn = (this.connecting_node != null) || (this.linkConnector && this.linkConnector.isConnecting);
                        if (isConn) {
                            let srcNode = this.connecting_node;
                            let srcSlot = this.connecting_slot;
                            if (!srcNode && this.linkConnector?.renderLinks?.length > 0) {
                                const rl = this.linkConnector.renderLinks[0];
                                srcNode = rl.node || rl.originNode || rl.fromSlot?.node;
                                srcSlot = rl.fromSlotIndex ?? (srcNode && rl.fromSlot ? srcNode.outputs?.indexOf(rl.fromSlot) : 0);
                            }
                            if (srcNode) {
                                connectNodesWithWire(this, srcNode, srcSlot, pb.node, slotItem.index);
                                closePatchbay(this);
                                return true;
                            }
                        }
                    }
                }
            }
        }

        // 2. Direct click on collapsed node left [ ⇥ IN ] or right [ OUT ↦ ] jacks
        if (primary && primary.flags?.collapsed) {
            const inRack = findRackContainingNode(primary);
            const w = inRack ? Math.max(220, inRack.size[0] - 32) : (primary._collapsed_width || (primary.size ? primary.size[0] : 180));
            const clickLocalX = this.graph_mouse[0] - primary.pos[0];
            const titleH = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) || 30;
            const clickLocalY = this.graph_mouse[1] - primary.pos[1]; // range: -titleH to 0

            if (clickLocalY >= -titleH - 8 && clickLocalY <= 8) {
                // Clicked Left Input Jack Area
                if (clickLocalX >= -10 && clickLocalX <= 64 && primary.inputs && primary.inputs.length > 0) {
                    openPatchbayForNode(primary, true, this);
                    return true;
                }
                // Clicked Right Output Jack Area
                if (clickLocalX >= w - 64 && clickLocalX <= w + 14 && primary.outputs && primary.outputs.length > 0) {
                    if (primary.outputs.length === 1) {
                        startDraggingWireFromOutput(this, primary, 0);
                        return true;
                    } else {
                        openPatchbayForNode(primary, false, this);
                        return true;
                    }
                }
            }
        }

        if (_dockingMode === "sticky" && !e.altKey && this.graph?._nodes) {
            const draggedNodes = Object.values(this.selected_nodes || {});
            const primary = draggedNodes[0] || this.current_node || this.node_over;
            if (primary && primary.pos && primary.size) {
                const cluster = findDockedCluster([primary], this.graph._nodes, _dockingGap);
                if (cluster.size > 1) {
                    const isLocked = Array.from(cluster).some((n) => n.flags?.pinned || n.locked);
                    if (isLocked) {
                        showDockingToast("🔒 Sticky rack is locked in place (Shift+L to unlock)");
                    } else {
                        _lastDragPrimary = primary;
                        _lastPrimaryPos = [primary.pos[0], primary.pos[1]];
                        for (const item of cluster) {
                            _dragCluster.add(item);
                            _clusterOffsets.set(item, [item.pos[0] - primary.pos[0], item.pos[1] - primary.pos[1]]);
                            if (this.selected_nodes) {
                                this.selected_nodes[item.id] = item;
                            }
                        }
                        this.setDirty(true, true);
                    }
                }
            }
        }
        return res;
    };

    // 1. Process Mouse Move for Magnetic Edge Snapping & Sticky Dragging
    const origProcessMouseMove = LGraphCanvas.prototype.processMouseMove;
    LGraphCanvas.prototype.processMouseMove = function (e) {
        // Mini Patchbay Hover & Wire Tracking (runs unconditionally)
        if (_activePatchbay) {
            const pb = _activePatchbay;
            const mx = this.graph_mouse[0];
            const my = this.graph_mouse[1];
            if (mx >= pb.x && mx <= pb.x + pb.w && my >= pb.y + 32 && my <= pb.y + pb.h) {
                cancelClosePatchbay();
                const idx = Math.floor((my - (pb.y + 34)) / 28);
                if (idx >= 0 && idx < pb.slots.length) {
                    if (pb.hoveredIndex !== idx) {
                        pb.hoveredIndex = idx;
                        this.setDirty(true, true);
                    }
                }
            } else {
                if (pb.hoveredIndex !== -1) {
                    pb.hoveredIndex = -1;
                    this.setDirty(true, true);
                }
                const distNode = Math.hypot(mx - (pb.node.pos[0] + (pb.node.size ? pb.node.size[0] : 180) / 2), my - pb.node.pos[1]);
                const distFlyout = Math.hypot(mx - (pb.x + pb.w / 2), my - (pb.y + pb.h / 2));
                if (distNode > 260 && distFlyout > 260) {
                    scheduleClosePatchbay(this, 350);
                }
            }
        }

        const isConnecting = (this.connecting_node != null) || (this.linkConnector && this.linkConnector.isConnecting);

        // When dragging a wire over a collapsed node, auto-open matching Inputs patchbay
        if (isConnecting) {
            const collapsedTarget = findCollapsedNodeUnderPoint(this.graph, this.graph_mouse[0], this.graph_mouse[1]);
            let isOutputDrag = true;
            if (this.linkConnector && this.linkConnector.isConnecting) {
                isOutputDrag = (this.linkConnector.state.connectingTo === "input");
            } else if (this.connecting_node) {
                isOutputDrag = !!this.connecting_output || (this.connecting_input == null && this.connecting_slot != null);
            }
            const targetMode = isOutputDrag; // true = show input patchbay
            if (collapsedTarget && collapsedTarget !== this.connecting_node) {
                if (!_activePatchbay || _activePatchbay.node !== collapsedTarget || _activePatchbay.isInput !== targetMode) {
                    openPatchbayForNode(collapsedTarget, targetMode, this);
                }
            }
        } else if (!this.node_capturing_input && !this.selected_group && !this.isDragging) {
            // Hovering near collapsed node edges reveals patchbay
            const cNode = findCollapsedNodeUnderPoint(this.graph, this.graph_mouse[0], this.graph_mouse[1]);
            if (cNode) {
                const inRack = findRackContainingNode(cNode);
                const w = inRack ? Math.max(220, inRack.size[0] - 32) : (cNode._collapsed_width || (cNode.size ? cNode.size[0] : 180));
                const localX = this.graph_mouse[0] - cNode.pos[0];
                if (localX >= -10 && localX <= 60 && cNode.inputs && cNode.inputs.length > 0) {
                    if (!_activePatchbay || _activePatchbay.node !== cNode || !_activePatchbay.isInput) {
                        openPatchbayForNode(cNode, true, this);
                    }
                } else if (localX >= w - 60 && localX <= w + 10 && cNode.outputs && cNode.outputs.length > 0) {
                    if (!_activePatchbay || _activePatchbay.node !== cNode || _activePatchbay.isInput) {
                        openPatchbayForNode(cNode, false, this);
                    }
                }
            }
        }

        if (_dockingMode === "off") {
            return origProcessMouseMove ? origProcessMouseMove.apply(this, arguments) : undefined;
        }

        const res = origProcessMouseMove ? origProcessMouseMove.apply(this, arguments) : undefined;

        if (!this.graph || !this.graph._nodes) return res;

        const hasSelected = this.selected_nodes && Object.keys(this.selected_nodes).length > 0;
        const isDragging = (e.buttons & 1) === 1 && !this.dragging_canvas && (hasSelected || this.current_node || this.selected_group);
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

        // ── Group / Equipment Rack Magnetic Edge Snapping ─────────────────
        if (this.selected_group) {
            _lastDragPrimary = null;
            _lastPrimaryPos = null;
            _dragCluster.clear();
            _clusterOffsets = new Map();

            if (e.altKey || _dockingMode === "off") {
                if (_activeSnapGuides.length > 0) {
                    _activeSnapGuides = [];
                    this.setDirty(true, true);
                }
                return res;
            }

            const group = this.selected_group;
            if (!group.pos || !group.size) return res;

            const pBounds = getGroupVisualBounds(group);
            if (!pBounds) return res;

            let bestSnapX = null;
            let minDiffX = _snapThreshold + 1;
            let snapGuideX = null;

            let bestSnapY = null;
            let minDiffY = _snapThreshold + 1;
            let snapGuideY = null;

            const gap = _dockingGap;
            const candidateTargets = [];

            // 1. Other groups / racks
            if (this.graph._groups) {
                for (const otherG of this.graph._groups) {
                    if (otherG === group || !otherG.pos || !otherG.size) continue;
                    const gb = getGroupVisualBounds(otherG);
                    if (gb) candidateTargets.push(gb);
                }
            }

            // 2. Normal uncollapsed nodes (not in an equipment rack)
            if (this.graph._nodes) {
                for (const otherN of this.graph._nodes) {
                    if (!otherN || otherN.flags?.collapsed || otherN._in_equipment_rack || !otherN.pos || !otherN.size) continue;
                    const nb = getNodeVisualBounds(otherN);
                    if (nb) candidateTargets.push(nb);
                }
            }

            for (const oBounds of candidateTargets) {
                const hDist = Math.max(0, Math.max(pBounds.x, oBounds.x) - Math.min(pBounds.right, oBounds.right));
                const vDist = Math.max(0, Math.max(pBounds.y, oBounds.y) - Math.min(pBounds.bottom, oBounds.bottom));

                // Vertical Snapping (when horizontally near/overlapping)
                if (hDist <= _snapThreshold * 2) {
                    // Dock top: pBounds bottom flush to oBounds top
                    const dY_top = (oBounds.y - gap) - pBounds.bottom;
                    if (Math.abs(dY_top) < minDiffY) {
                        minDiffY = Math.abs(dY_top);
                        bestSnapY = dY_top;
                        snapGuideY = {
                            y: oBounds.y - (gap > 0 ? gap / 2 : 0),
                            x1: Math.min(pBounds.x, oBounds.x) - 16,
                            x2: Math.max(pBounds.right, oBounds.right) + 16,
                            type: "dock_top"
                        };
                    }

                    // Dock bottom: pBounds top flush to oBounds bottom
                    const dY_bottom = (oBounds.bottom + gap) - pBounds.y;
                    if (Math.abs(dY_bottom) < minDiffY) {
                        minDiffY = Math.abs(dY_bottom);
                        bestSnapY = dY_bottom;
                        snapGuideY = {
                            y: oBounds.bottom + (gap > 0 ? gap / 2 : 0),
                            x1: Math.min(pBounds.x, oBounds.x) - 16,
                            x2: Math.max(pBounds.right, oBounds.right) + 16,
                            type: "dock_bottom"
                        };
                    }

                    // Align top
                    const dY_alignTop = oBounds.y - pBounds.y;
                    if (Math.abs(dY_alignTop) < minDiffY) {
                        minDiffY = Math.abs(dY_alignTop);
                        bestSnapY = dY_alignTop;
                        snapGuideY = {
                            y: oBounds.y,
                            x1: Math.min(pBounds.x, oBounds.x) - 16,
                            x2: Math.max(pBounds.right, oBounds.right) + 16,
                            type: "align_top"
                        };
                    }

                    // Align bottom
                    const dY_alignBottom = oBounds.bottom - pBounds.bottom;
                    if (Math.abs(dY_alignBottom) < minDiffY) {
                        minDiffY = Math.abs(dY_alignBottom);
                        bestSnapY = dY_alignBottom;
                        snapGuideY = {
                            y: oBounds.bottom,
                            x1: Math.min(pBounds.x, oBounds.x) - 16,
                            x2: Math.max(pBounds.right, oBounds.right) + 16,
                            type: "align_bottom"
                        };
                    }
                }

                // Horizontal Snapping (when vertically near/overlapping)
                if (vDist <= _snapThreshold * 2) {
                    // Dock left: pBounds right flush to oBounds left
                    const dX_left = (oBounds.x - gap) - pBounds.right;
                    if (Math.abs(dX_left) < minDiffX) {
                        minDiffX = Math.abs(dX_left);
                        bestSnapX = dX_left;
                        snapGuideX = {
                            x: oBounds.x - (gap > 0 ? gap / 2 : 0),
                            y1: Math.min(pBounds.y, oBounds.y) - 16,
                            y2: Math.max(pBounds.bottom, oBounds.bottom) + 16,
                            type: "dock_left"
                        };
                    }

                    // Dock right: pBounds left flush to oBounds right
                    const dX_right = (oBounds.right + gap) - pBounds.x;
                    if (Math.abs(dX_right) < minDiffX) {
                        minDiffX = Math.abs(dX_right);
                        bestSnapX = dX_right;
                        snapGuideX = {
                            x: oBounds.right + (gap > 0 ? gap / 2 : 0),
                            y1: Math.min(pBounds.y, oBounds.y) - 16,
                            y2: Math.max(pBounds.bottom, oBounds.bottom) + 16,
                            type: "dock_right"
                        };
                    }

                    // Align left
                    const dX_alignLeft = oBounds.x - pBounds.x;
                    if (Math.abs(dX_alignLeft) < minDiffX) {
                        minDiffX = Math.abs(dX_alignLeft);
                        bestSnapX = dX_alignLeft;
                        snapGuideX = {
                            x: oBounds.x,
                            y1: Math.min(pBounds.y, oBounds.y) - 16,
                            y2: Math.max(pBounds.bottom, oBounds.bottom) + 16,
                            type: "align_left"
                        };
                    }

                    // Align right
                    const dX_alignRight = oBounds.right - pBounds.right;
                    if (Math.abs(dX_alignRight) < minDiffX) {
                        minDiffX = Math.abs(dX_alignRight);
                        bestSnapX = dX_alignRight;
                        snapGuideX = {
                            x: oBounds.right,
                            y1: Math.min(pBounds.y, oBounds.y) - 16,
                            y2: Math.max(pBounds.bottom, oBounds.bottom) + 16,
                            type: "align_right"
                        };
                    }

                    // Align center X
                    const dX_alignCenter = (oBounds.x + oBounds.w / 2) - (pBounds.x + pBounds.w / 2);
                    if (Math.abs(dX_alignCenter) < minDiffX) {
                        minDiffX = Math.abs(dX_alignCenter);
                        bestSnapX = dX_alignCenter;
                        snapGuideX = {
                            x: oBounds.x + oBounds.w / 2,
                            y1: Math.min(pBounds.y, oBounds.y) - 16,
                            y2: Math.max(pBounds.bottom, oBounds.bottom) + 16,
                            type: "align_center_x"
                        };
                    }
                }
            }

            const newGuides = [];
            const moveDeltaX = (bestSnapX !== null && Math.abs(bestSnapX) <= _snapThreshold) ? bestSnapX : 0;
            const moveDeltaY = (bestSnapY !== null && Math.abs(bestSnapY) <= _snapThreshold) ? bestSnapY : 0;

            if (moveDeltaX !== 0 || moveDeltaY !== 0) {
                group.move(moveDeltaX, moveDeltaY);
            }
            if (moveDeltaX !== 0 && snapGuideX) newGuides.push(snapGuideX);
            if (moveDeltaY !== 0 && snapGuideY) newGuides.push(snapGuideY);

            _activeSnapGuides = newGuides;
            this.setDirty(true, true);
            return res;
        }

        const draggedNodes = Object.values(this.selected_nodes || {});
        const primary = draggedNodes[0] || this.current_node;
        if (!primary || !primary.pos || !primary.size) return res;

        // Prevent dragging if primary or cluster is locked
        if (primary.flags?.pinned || primary.locked) {
            return res;
        }

        // Equipment Rack drag-and-snap preview for collapsed nodes
        if (primary.flags?.collapsed) {
            const hRack = findRackUnderPoint(primary.pos[0] + (primary.size[0] || 80) / 2, primary.pos[1] - 15);
            if (hRack) {
                const railX = hRack.pos[0] + 16;
                const innerW = Math.max(220, hRack.size[0] - 32);
                const currentRackNodes = (hRack._nodes || []).filter((n) => n && n.flags?.collapsed && n !== primary);
                const slotIdx = Math.max(0, Math.min(currentRackNodes.length, Math.round((primary.pos[1] - (hRack.pos[1] + 74)) / 38)));
                const targetY = hRack.pos[1] + 74 + slotIdx * 38;
                _activeSnapGuides = [{
                    type: "rack_slot",
                    x1: railX,
                    x2: railX + innerW,
                    y: targetY - 30,
                    rack: hRack
                }];
                this.setDirty(true, true);
                return res;
            }
        }

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
                        if (this.selected_nodes) {
                            this.selected_nodes[item.id] = item;
                        }
                    }
                }
            }
        }

        // Propagate sticky cluster movement rigidly to all companion nodes
        if (_dockingMode === "sticky" && !e.altKey && _dragCluster.size > 1 && _clusterOffsets) {
            for (const companion of _dragCluster) {
                if (companion !== primary) {
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

        const candidateTargets = [];
        for (const other of this.graph._nodes) {
            if (!other || other === primary || _dragCluster.has(other) || (this.selected_nodes && this.selected_nodes[other.id])) continue;
            if (other.flags?.collapsed || other._in_equipment_rack || !other.pos || !other.size) continue;
            const ob = getNodeVisualBounds(other);
            if (ob) candidateTargets.push(ob);
        }
        if (this.graph._groups) {
            for (const otherG of this.graph._groups) {
                if (!otherG.pos || !otherG.size) continue;
                const gb = getGroupVisualBounds(otherG);
                if (gb) candidateTargets.push(gb);
            }
        }

        for (const oBounds of candidateTargets) {

            const hDist = Math.max(0, Math.max(pBounds.x, oBounds.x) - Math.min(pBounds.right, oBounds.right));
            const vDist = Math.max(0, Math.max(pBounds.y, oBounds.y) - Math.min(pBounds.bottom, oBounds.bottom));

            // Vertical Snapping
            if (hDist <= _snapThreshold * 2) {
                const dY_top = (oBounds.y - gap) - pBounds.bottom;
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

                const dY_bottom = (oBounds.bottom + gap) - pBounds.y;
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

                const dY_alignTop = oBounds.y - pBounds.y;
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

                const dY_alignCenter = (oBounds.y + oBounds.h / 2) - (pBounds.y + pBounds.h / 2);
                if (Math.abs(dY_alignCenter) < minDiffY) {
                    minDiffY = Math.abs(dY_alignCenter);
                    bestSnapY = dY_alignCenter;
                    snapGuideY = {
                        y: oBounds.y + oBounds.h / 2,
                        x1: Math.min(pBounds.x, oBounds.x) - 12,
                        x2: Math.max(pBounds.right, oBounds.right) + 12,
                        type: "align_center_y"
                    };
                }

                const dY_alignBottom = oBounds.bottom - pBounds.bottom;
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

            // Horizontal Snapping
            if (vDist <= _snapThreshold * 2) {
                const dX_left = (oBounds.x - gap) - pBounds.right;
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

                const dX_right = (oBounds.right + gap) - pBounds.x;
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

                const dX_alignLeft = oBounds.x - pBounds.x;
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

                const dX_alignCenter = (oBounds.x + oBounds.w / 2) - (pBounds.x + pBounds.w / 2);
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

                const dX_alignRight = oBounds.right - pBounds.right;
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

        if (_dockingMode === "sticky" && !e.altKey && _dragCluster.size > 1 && _clusterOffsets) {
            for (const companion of _dragCluster) {
                if (companion !== primary) {
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
        const draggedPrimary = _lastDragPrimary;
        const fromRack = _draggedNodeFromRack;
        const wasDraggingGroup = !!this.selected_group;
        _draggedNodeFromRack = null;

        if (!wasDraggingGroup && draggedPrimary && draggedPrimary.flags?.collapsed) {
            const targetRack = findRackUnderPoint(draggedPrimary.pos[0] + (draggedPrimary.size[0] || 80) / 2, draggedPrimary.pos[1] - 15);
            if (targetRack) {
                slotNodesIntoRack(targetRack, [draggedPrimary], this);
                if (fromRack && fromRack !== targetRack) {
                    compactRackNodes(fromRack, this);
                }
            } else if (fromRack) {
                draggedPrimary._in_equipment_rack = false;
                delete draggedPrimary._equipment_rack;
                draggedPrimary._collapsed_width = null;
                compactRackNodes(fromRack, this);
                showDockingToast(`🗄️ Detached "${draggedPrimary.title || draggedPrimary.type}" from Rack`);
            }
        }

        _activeSnapGuides = [];
        _lastDragPrimary = null;
        _lastPrimaryPos = null;
        _dragCluster.clear();
        _clusterOffsets = new Map();

        const isConnecting = (this.connecting_node != null) || (this.linkConnector && this.linkConnector.isConnecting);

        // Dropping wire onto active Mini Patchbay Flyout slot or collapsed node
        if (isConnecting) {
            let sourceNode = this.connecting_node;
            let sourceSlot = this.connecting_slot;
            let isOutputDrag = true;

            if (this.linkConnector && this.linkConnector.isConnecting) {
                isOutputDrag = (this.linkConnector.state.connectingTo === "input");
                if (this.linkConnector.renderLinks && this.linkConnector.renderLinks.length > 0) {
                    const rl = this.linkConnector.renderLinks[0];
                    sourceNode = rl.node || rl.originNode || rl.fromSlot?.node;
                    sourceSlot = rl.fromSlotIndex ?? (sourceNode && rl.fromSlot ? sourceNode.outputs?.indexOf(rl.fromSlot) : 0);
                }
            }

            // A. Dropped directly over patchbay slot
            if (_activePatchbay) {
                const pb = _activePatchbay;
                const targetSlotItem = (pb.hoveredIndex >= 0) ? pb.slots[pb.hoveredIndex] : null;
                if (targetSlotItem && sourceNode) {
                    if (pb.isInput) {
                        connectNodesWithWire(this, sourceNode, sourceSlot, pb.node, targetSlotItem.index);
                    } else {
                        connectNodesWithWire(this, pb.node, targetSlotItem.index, sourceNode, sourceSlot);
                    }
                    closePatchbay(this);
                    return;
                }
            }

            // B. Dropped directly over a collapsed node (smart auto-connection)
            const droppedNode = findCollapsedNodeUnderPoint(this.graph, this.graph_mouse[0], this.graph_mouse[1]);
            if (droppedNode && sourceNode && droppedNode !== sourceNode && isOutputDrag) {
                const srcOutputSlot = sourceNode.outputs?.[sourceSlot];
                const bestInputIdx = findBestInputSlotForOutput(droppedNode, srcOutputSlot?.type, srcOutputSlot?.name);
                connectNodesWithWire(this, sourceNode, sourceSlot, droppedNode, bestInputIdx);
                closePatchbay(this);
                return;
            }
        }

        const res = origProcessMouseUp ? origProcessMouseUp.apply(this, arguments) : undefined;
        this.setDirty(true, true);
        return res;
    };

    // 3. Draw Front Canvas for Magnetic Guides & Patchbay
    const origDrawFrontCanvas = LGraphCanvas.prototype.drawFrontCanvas;
    LGraphCanvas.prototype.drawFrontCanvas = function () {
        const res = origDrawFrontCanvas ? origDrawFrontCanvas.apply(this, arguments) : undefined;
        const ctx = this.ctx || this.frontcanvas?.getContext?.('2d') || this.canvas?.getContext?.('2d');
        if (!ctx) return res;

        ctx.save();
        if (this.ds && typeof this.ds.toCanvasContext === "function") {
            this.ds.toCanvasContext(ctx);
        } else if (typeof this.setGraphTransform === "function") {
            this.setGraphTransform(ctx);
        }

        try {
            if (_dockingMode !== "off" && _activeSnapGuides.length > 0) {
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
                    if (g.type === "rack_slot") {
                        ctx.save();
                        ctx.strokeStyle = "#00f0ff";
                        ctx.fillStyle = "rgba(0, 240, 255, 0.12)";
                        ctx.shadowColor = "rgba(0, 240, 255, 0.85)";
                        ctx.shadowBlur = 10;
                        ctx.lineWidth = 2;
                        if (typeof ctx.roundRect === "function") {
                            ctx.beginPath();
                            ctx.roundRect(g.x1, g.y, g.x2 - g.x1, 32, 6);
                            ctx.fill();
                            ctx.stroke();
                        } else {
                            ctx.fillRect(g.x1, g.y, g.x2 - g.x1, 32);
                            ctx.strokeRect(g.x1, g.y, g.x2 - g.x1, 32);
                        }
                        ctx.restore();
                        continue;
                    }
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

            // Draw Mini Patchbay Flyout on front canvas
            if (_activePatchbay) {
                drawPatchbayFlyout(_activePatchbay, ctx, this);
            }
        } catch (err) {
            console.error("Zombiehaus: drawFrontCanvas error:", err);
        } finally {
            ctx.restore();
        }

        // Also update DOM Patchbay position if active
        if (_activePatchbay) {
            renderDOMPatchbay(_activePatchbay, this);
        }

        return res;
    };

    if (!window._zombiehausDockingKeydownBound) {
        window._zombiehausDockingKeydownBound = true;
        window.addEventListener("keydown", (e) => {
            // Shift + L: Toggle Lock / Freeze for selected node or sticky rack
            if (e.shiftKey && e.code === "KeyL" && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const activeTag = document.activeElement?.tagName;
                if (activeTag === "INPUT" || activeTag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
                e.preventDefault();
                toggleSelectedClusterLock();
            }
            // Shift + R: Rack all minimized nodes into an Equipment Rack
            if (e.shiftKey && e.code === "KeyR" && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const activeTag = document.activeElement?.tagName;
                if (activeTag === "INPUT" || activeTag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
                e.preventDefault();
                rackAllMinimizedNodes(app.canvas);
            }
        });
    }
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
        sanitizeGraphGroups(app.graph);

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
