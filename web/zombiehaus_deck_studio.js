import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * Zombiehaus Deck Studio - Modular Column-and-Card Workspace Interface
 * A high-performance, structured alternative to ComfyUI's 2D canvas that organizes
 * nodes into logical Stage Columns with interactive, draggable cards.
 */

// ── Stage Column Definitions ──────────────────────────────────────────────────
const STAGES = [
    {
        id: "assets",
        name: "Assets & Loaders",
        icon: "📦",
        colorClass: "zds-col-1",
        description: "Checkpoints, LoRAs, VAE, CLIP, Image/Audio Inputs",
        matches(type, cat) {
            const t = (type || "").toLowerCase();
            const c = (cat || "").toLowerCase();
            return (
                t.includes("loader") ||
                t.includes("checkpoint") ||
                t.includes("unet") ||
                t.includes("lora") ||
                t.includes("vae") ||
                t.includes("clip_loader") ||
                t.includes("loadimage") ||
                t.includes("load_image") ||
                t.includes("loadimage") ||
                t.includes("loadaudio") ||
                t.includes("loadvideo") ||
                t.includes("preset") ||
                t.includes("scryer") ||
                c.includes("loaders")
            );
        }
    },
    {
        id: "prompt",
        name: "Prompt & Conditioning",
        icon: "✨",
        colorClass: "zds-col-2",
        description: "Prompts, CLIP Text Encode, ControlNet, Styles",
        matches(type, cat) {
            const t = (type || "").toLowerCase();
            const c = (cat || "").toLowerCase();
            return (
                t.includes("text") ||
                t.includes("prompt") ||
                t.includes("cliptext") ||
                t.includes("conditioning") ||
                t.includes("controlnet") ||
                t.includes("style") ||
                t.includes("refiner") ||
                t.includes("curator") ||
                t.includes("writer") ||
                c.includes("conditioning") ||
                c.includes("prompt")
            );
        }
    },
    {
        id: "generation",
        name: "Generation Core",
        icon: "⚡",
        colorClass: "zds-col-3",
        description: "KSampler, Latent Generators, Dynamic Guidance",
        matches(type, cat) {
            const t = (type || "").toLowerCase();
            const c = (cat || "").toLowerCase();
            return (
                t.includes("sampler") ||
                t.includes("emptylatent") ||
                t.includes("guidance") ||
                t.includes("stepaudio") ||
                t.includes("chromashift") ||
                t.includes("seed") ||
                c.includes("sampling") ||
                c.includes("latent")
            );
        }
    },
    {
        id: "refinement",
        name: "Refinement & FX",
        icon: "🔮",
        colorClass: "zds-col-4",
        description: "Detailers, Upscalers, Restormer, Inpainting, Glamour",
        matches(type, cat) {
            const t = (type || "").toLowerCase();
            const c = (cat || "").toLowerCase();
            return (
                t.includes("detailer") ||
                t.includes("upscale") ||
                t.includes("restormer") ||
                t.includes("dewax") ||
                t.includes("inpaint") ||
                t.includes("wardrobe") ||
                t.includes("faceswap") ||
                t.includes("glamour") ||
                t.includes("director") ||
                t.includes("replacer") ||
                t.includes("hires") ||
                t.includes("resizer") ||
                t.includes("preprocessor") ||
                c.includes("upscaling") ||
                c.includes("postprocessing")
            );
        }
    },
    {
        id: "output",
        name: "Output & Gallery",
        icon: "🖼️",
        colorClass: "zds-col-5",
        description: "Save Image, Preview, Gallery, Compare, Video Sync",
        matches(type, cat) {
            const t = (type || "").toLowerCase();
            const c = (cat || "").toLowerCase();
            return (
                t.includes("save") ||
                t.includes("preview") ||
                t.includes("gallery") ||
                t.includes("compare") ||
                t.includes("export") ||
                t.includes("showtext") ||
                t.includes("mixer") ||
                c.includes("image") ||
                c.includes("output")
            );
        }
    }
];

// Helper: classify node into stage
function classifyNode(node) {
    const type = node.type || "";
    const cat = node.category || (node.constructor && node.constructor.category) || "";
    for (const stage of STAGES) {
        if (stage.matches(type, cat)) {
            return stage.id;
        }
    }
    // Fallback: if node has only outputs and no inputs -> assets
    if (!node.inputs || node.inputs.length === 0) return "assets";
    // If node has only inputs and no outputs -> output
    if (!node.outputs || node.outputs.length === 0) return "output";
    return "generation";
}

// Helper: get color class for data type
function getTypeClass(type) {
    const t = String(type || "").toUpperCase();
    if (t === "MODEL") return "zds-type-model";
    if (t === "CLIP") return "zds-type-clip";
    if (t === "VAE") return "zds-type-vae";
    if (t === "IMAGE") return "zds-type-image";
    if (t === "LATENT") return "zds-type-latent";
    if (t.includes("CONDITION")) return "zds-type-conditioning";
    if (t === "MASK") return "zds-type-mask";
    return "";
}

// Helper: get human-readable role / description for a node
function getNodeRoleDescription(node) {
    const t = (node.type || "").toLowerCase();
    const title = (node.title || "").toLowerCase();
    if (t.includes("checkpointloader") || t.includes("unetloader")) return "Core Base Model Loader";
    if (t.includes("loraloader")) return "LoRA Style / Concept Adapter";
    if (t.includes("vaeloader")) return "Latent Space Color Decoder";
    if (t.includes("controlnet")) return "Structural Pose / Depth Guide";
    if (t.includes("cliptextencode") || t.includes("texteditor") || title.includes("prompt")) return "Conditioning Semantic Director";
    if (t.includes("ksampler") || t.includes("sampler")) return "Diffusion Denoising Engine";
    if (t.includes("emptylatent")) return "Initial Latent Space Canvas";
    if (t.includes("vaedecode")) return "Latent to Pixel Reconstructor";
    if (t.includes("vaeencode")) return "Pixel to Latent Compressor";
    if (t.includes("saveimage")) return "Final Master Output Exporter";
    if (t.includes("previewimage")) return "Real-time Diagnostic Preview";
    if (t.includes("loadimage")) return "External Image Asset Input";
    if (t.includes("allinonedetailer") || t.includes("allinone")) return "All-in-One YOLO Detailer";
    if (t.includes("detailerslot")) return "Detailer Inpaint Slot";
    if (t.includes("upscale")) return "Super-Resolution Neural Upscaler";
    if (t.includes("inpaint") || t.includes("mask")) return "Selective Inpaint & Masking Tool";
    if (t.includes("zombiehaus")) return "Zombiehaus Custom Node";
    return node.type || "Workflow Processor";
}

// ── HTML Escape & Syntax Highlighting Engine ──────────────────────────────────
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function highlightPromptSyntax(text, theme = null) {
    if (!text) return "";
    const themeName = theme || (typeof localStorage !== "undefined" ? localStorage.getItem("zombiehaus_syntax_theme") : "") || "Zombiehaus Neon";
    if (themeName === "Off (Plain Text)" || themeName === "Off") {
        return escapeHtml(text);
    }

    const colors = {
        weight: "#38bdf8",          // (word:1.2), (word) -> sky cyan
        lora: "#c084fc",            // <lora:...> -> light purple / magenta
        wildcard: "#facc15",        // __wildcard__ -> golden yellow
        curator: "#4ade80",         // {curator}, {curator2} -> emerald green
        variable: "#fb923c",        // $var -> orange
        comment: "#94a3b8",         // /* ... */, // ..., # ... -> slate gray
        section: "#f472b6",         // [Section] -> pink
        keyword: "#a78bfa",         // embedding:..., break, etc.
        text: "#f8fafc"             // default
    };

    const intervals = [];
    const addMatches = (regex, type) => {
        let m;
        regex.lastIndex = 0;
        while ((m = regex.exec(text)) !== null) {
            const start = m.index;
            const end = start + m[0].length;
            if (start === end) {
                regex.lastIndex++;
                continue;
            }
            const collides = intervals.some(iv => (start < iv.end && end > iv.start));
            if (!collides) {
                intervals.push({ start, end, type });
            }
        }
    };

    // Priority tokens:
    // 0. Section Banners: // [Section] or standalone [Section]
    addMatches(/(?:\/\/|#|\/\*)\s*\[[^\]\r\n]+\](?:\s*\*\/)?/g, "section");
    addMatches(/(?:^|(?<=[\r\n]))\s*\[[^\]\r\n]+\](?=\s*(?:[\r\n]|$))/g, "section");

    // 1. Comments: /* ... */ or // ... or # ...
    addMatches(/\/\*[\s\S]*?\*\//g, "comment");
    addMatches(/\/\/[^\r\n]*/g, "comment");
    addMatches(/(?:^|(?<=[\r\n]))\s*#[^\r\n]*/g, "comment");

    // 2. LoRA / Hypernetwork: <lora:...>, <hypernet:...>, <lyco:...>
    addMatches(/<(?:lora|hypernet|lyco):[^>]+>/gi, "lora");

    // 3. Wildcards: __wildcard_name__
    addMatches(/__[a-zA-Z0-9_\-\/\\]+__/g, "wildcard");

    // 4. Curator placeholders: {curator}, {curator2}, etc.
    addMatches(/\{curator\d*\}/gi, "curator");

    // 5. Variables: $var or ${var}
    addMatches(/\$(?:[a-zA-Z0-9_]+|\{[a-zA-Z0-9_]+\})/g, "variable");

    // 6. Embeddings: embedding:name
    addMatches(/\b(?:embedding|embed):[a-zA-Z0-9_\-\.]+/gi, "keyword");

    // 7. Attention Weights: (word:weight) or (word)
    addMatches(/\((?:[^():\r\n]+):[-+]?\d*\.?\d+\)/g, "weight");
    addMatches(/\([a-zA-Z0-9_\s\-,.]+\)/g, "weight");

    intervals.sort((a, b) => a.start - b.start);

    let html = "";
    let cursor = 0;
    for (const iv of intervals) {
        if (iv.start > cursor) {
            html += escapeHtml(text.substring(cursor, iv.start));
        }
        const tokenText = text.substring(iv.start, iv.end);
        const color = colors[iv.type] || colors.text;
        const fontStyle = iv.type === "comment" ? "font-style: italic;" : (iv.type === "section" ? "font-weight: 700;" : "");
        html += `<span style="color: ${color}; ${fontStyle}">${escapeHtml(tokenText)}</span>`;
        cursor = iv.end;
    }
    if (cursor < text.length) {
        html += escapeHtml(text.substring(cursor));
    }
    if (text.endsWith("\n")) {
        html += "<br/>";
    }
    return html;
}

// ── Deck Studio Master Controller ─────────────────────────────────────────────
class ZombiehausDeckStudio {
    constructor() {
        this.isOpen = false;
        this.batchCount = 1;
        this.filterQuery = "";
        this.activeConnectingSource = null; // { nodeId, slotIndex, type }
        this.executingNodeId = null;
        this.currentProgressNodeId = null;
        this._currentBlobUrls = {};
        this._lastPreviewBlob = null;
        this.samplerProgress = {}; // { [nodeId]: { step, max_steps } }
        this.lastExecutedImages = {}; // { [nodeId]: url }
        this.cardOverrides = {}; // user custom column assignments: { [nodeId]: { stage, lane } }
        try {
            const rawCO = localStorage.getItem("zds_card_overrides");
            if (rawCO) this.cardOverrides = JSON.parse(rawCO);
        } catch (_) {}

        this.cardSizes = {};
        try {
            const raw = localStorage.getItem("zds_card_sizes");
            if (raw) this.cardSizes = JSON.parse(raw);
        } catch (_) {}

        this.bayWidths = {};
        try {
            const rawBay = localStorage.getItem("zds_bay_widths");
            if (rawBay) this.bayWidths = JSON.parse(rawBay);
        } catch (_) {}

        this.laneWidths = {};
        try {
            const rawLanes = localStorage.getItem("zds_lane_widths");
            if (rawLanes) this.laneWidths = JSON.parse(rawLanes);
        } catch (_) {}

        this.enableWireTracing = false;
        try {
            const rawTrace = localStorage.getItem("zds_trace_wires");
            if (rawTrace !== null) this.enableWireTracing = rawTrace === "true";
        } catch (_) {}

        this.viewMode = "all"; // "all" | "quickview"

        this.quickViewNodeIds = new Set();
        try {
            const rawQV = localStorage.getItem("zds_quick_view_nodes");
            if (rawQV) {
                const arr = JSON.parse(rawQV);
                if (Array.isArray(arr)) this.quickViewNodeIds = new Set(arr);
            }
        } catch (_) {}

        this.quickViewColumns = [];
        try {
            const rawQVC = localStorage.getItem("zds_quick_view_columns");
            if (rawQVC) {
                const arr = JSON.parse(rawQVC);
                if (Array.isArray(arr)) this.quickViewColumns = arr.map(c => Array.isArray(c) ? c.map(String) : [String(c)]);
            }
        } catch (_) {}

        this.quickViewOrder = [];
        try {
            const rawQVO = localStorage.getItem("zds_quick_view_order");
            if (rawQVO) {
                const arr = JSON.parse(rawQVO);
                if (Array.isArray(arr)) this.quickViewOrder = arr.map(String);
            }
        } catch (_) {}
        this.quickViewOrder = this.quickViewOrder.filter(id => this.quickViewNodeIds.has(id));
        for (const id of this.quickViewNodeIds) {
            if (!this.quickViewOrder.includes(id)) {
                this.quickViewOrder.push(id);
            }
        }

        this.quickViewLayout = "row"; // "row" | "grid"
        try {
            const rawQVL = localStorage.getItem("zds_quick_view_layout");
            if (rawQVL === "grid" || rawQVL === "row") this.quickViewLayout = rawQVL;
        } catch (_) {}

        this.quickViewCardSizes = {};
        try {
            const rawQVCS = localStorage.getItem("zds_quick_view_card_sizes");
            if (rawQVCS) this.quickViewCardSizes = JSON.parse(rawQVCS);
        } catch (_) {}

        this.quickViewCardWidth = null;
        try {
            const rawQVW = localStorage.getItem("zds_quick_view_card_width");
            if (rawQVW) {
                const w = parseInt(rawQVW, 10);
                if (!isNaN(w) && w > 100) this.quickViewCardWidth = w;
            }
        } catch (_) {}

        this.quickViewHeightMode = "full"; // "full" | "auto"
        try {
            const rawQVHM = localStorage.getItem("zds_quick_view_height_mode");
            if (rawQVHM === "auto" || rawQVHM === "full") this.quickViewHeightMode = rawQVHM;
        } catch (_) {}

        this.collapsedCardIds = new Set();
        try {
            const rawColl = localStorage.getItem("zds_collapsed_cards");
            if (rawColl) {
                const arr = JSON.parse(rawColl);
                if (Array.isArray(arr)) this.collapsedCardIds = new Set(arr);
            }
        } catch (_) {}

        this._currentBlobUrl = null;

        this.initDOM();
        this.updateQuickViewCount();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }

    updateQuickViewCount() {
        if (!this.overlay) return;
        const badge = this.overlay.querySelector("#zds-quickview-badge");
        if (badge) {
            badge.textContent = this.quickViewNodeIds.size;
        }
    }

    // ── Inject Stylesheet & Structure ──────────────────────────────────────────
    initDOM() {
        if (!document.getElementById("zds-stylesheet")) {
            const link = document.createElement("link");
            link.id = "zds-stylesheet";
            link.rel = "stylesheet";
            link.href = new URL("./zombiehaus_deck_studio.css", import.meta.url).href;
            document.head.appendChild(link);

            const overrideStyle = document.createElement("style");
            overrideStyle.id = "zds-tracing-override";
            overrideStyle.textContent = `
                .zds-card.zds-card-dimmed { opacity: 1 !important; filter: none !important; }
                .zds-btn-active { background: rgba(168, 85, 247, 0.3) !important; border-color: rgba(168, 85, 247, 0.7) !important; color: #ffffff !important; }
                .zds-workspace {
                    flex: 1 1 0px !important;
                    min-height: 0 !important;
                    max-height: calc(100% - 64px) !important;
                    height: calc(100% - 64px) !important;
                    display: flex !important;
                    overflow-x: auto !important;
                    overflow-y: hidden !important;
                    align-items: stretch !important;
                }
                .zds-bay {
                    position: relative !important;
                    width: max-content;
                    height: 100% !important;
                    max-height: 100% !important;
                    min-height: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                    flex-shrink: 0 !important;
                }
                .zds-bay-header {
                    flex-shrink: 0 !important;
                }
                .zds-bay-lanes {
                    flex: 1 1 0px !important;
                    min-height: 0 !important;
                    max-height: 100% !important;
                    height: 100% !important;
                    display: flex !important;
                    flex-direction: row !important;
                    overflow-x: auto !important;
                    overflow-y: hidden !important;
                    align-items: stretch !important;
                }
                .zds-bay-resizer {
                    position: absolute;
                    top: 0;
                    right: -4px;
                    width: 8px;
                    height: 100%;
                    cursor: col-resize;
                    z-index: 25;
                    background: transparent;
                    transition: background 0.15s ease;
                }
                .zds-bay-resizer:hover, .zds-bay-resizer.is-resizing {
                    background: rgba(168, 85, 247, 0.6);
                }
                .zds-column-lane {
                    position: relative !important;
                    flex: 0 0 auto !important;
                    width: max-content !important;
                    min-width: 320px !important;
                    max-width: none !important;
                    height: 100% !important;
                    max-height: 100% !important;
                    min-height: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                }
                .zds-lane-header {
                    flex-shrink: 0 !important;
                }
                .zds-lane-resizer {
                    position: absolute;
                    top: 0;
                    right: -4px;
                    width: 8px;
                    height: 100%;
                    cursor: col-resize;
                    z-index: 24;
                    background: transparent;
                    transition: background 0.15s ease;
                }
                .zds-lane-resizer:hover, .zds-lane-resizer.is-resizing {
                    background: rgba(6, 182, 212, 0.6) !important;
                }
                .zds-lane-cards {
                    flex: 1 1 0px !important;
                    min-height: 0 !important;
                    max-height: 100% !important;
                    height: 100% !important;
                    width: 100% !important;
                    min-width: 100% !important;
                    box-sizing: border-box !important;
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    overscroll-behavior-y: contain !important;
                    padding-bottom: 32px !important;
                }
                .zds-lane-cards::-webkit-scrollbar {
                    width: 8px !important;
                }
                .zds-lane-cards::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.25) !important;
                    border-radius: 4px !important;
                }
                .zds-lane-cards::-webkit-scrollbar-thumb {
                    background: rgba(168, 85, 247, 0.45) !important;
                    border-radius: 4px !important;
                }
                .zds-lane-cards::-webkit-scrollbar-thumb:hover {
                    background: rgba(168, 85, 247, 0.8) !important;
                }
                .zds-card {
                    resize: both !important;
                    min-width: 240px !important;
                    max-width: none !important;
                    min-height: 80px !important;
                    max-height: none !important;
                    display: flex !important;
                    flex-direction: column !important;
                    box-sizing: border-box !important;
                    flex-shrink: 0 !important;
                    overflow: hidden !important;
                    position: relative !important;
                }
                .zds-card::-webkit-resizer {
                    background: linear-gradient(135deg, transparent 40%, rgba(245, 158, 11, 0.6) 40%, rgba(245, 158, 11, 0.95) 100%) !important;
                    cursor: nwse-resize !important;
                    width: 16px !important;
                    height: 16px !important;
                }
                .zds-lane-cards {
                    overflow-x: auto !important;
                    overflow-y: auto !important;
                }
                .zds-lane-cards .zds-card {
                    min-width: 240px !important;
                    max-width: none !important;
                    resize: both !important;
                }
                .zds-card-corner-resizer {
                    position: absolute !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 20px !important;
                    height: 20px !important;
                    cursor: nwse-resize !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    color: rgba(245, 158, 11, 0.75) !important;
                    background: linear-gradient(135deg, transparent 35%, rgba(245, 158, 11, 0.25) 35%, rgba(245, 158, 11, 0.6) 100%) !important;
                    border-bottom-right-radius: 6px !important;
                    z-index: 30 !important;
                    user-select: none !important;
                    touch-action: none !important;
                    transition: color 0.15s ease, background 0.15s ease, transform 0.15s ease !important;
                }
                .zds-card-corner-resizer:hover, .zds-card.zds-card-resizing .zds-card-corner-resizer {
                    color: #ffffff !important;
                    background: linear-gradient(135deg, transparent 20%, rgba(245, 158, 11, 0.7) 20%, #f59e0b 100%) !important;
                    transform: scale(1.1) !important;
                }
                .zds-card.zds-card-resizing {
                    user-select: none !important;
                    transition: none !important;
                    box-shadow: 0 0 20px rgba(245, 158, 11, 0.6) !important;
                }
                .zds-syntax-wrapper {
                    position: relative !important;
                    display: flex !important;
                    flex-direction: column !important;
                    flex: 1 1 auto !important;
                    width: 100% !important;
                    min-height: 70px !important;
                    height: 100% !important;
                    box-sizing: border-box !important;
                    overflow: visible !important;
                    border-radius: 6px !important;
                }
                .zds-syntax-backdrop {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    box-sizing: border-box !important;
                    padding: 8px 10px !important;
                    font-family: Consolas, 'SF Mono', Monaco, 'Liberation Mono', monospace !important;
                    font-size: 12px !important;
                    line-height: 1.45 !important;
                    white-space: pre-wrap !important;
                    word-break: break-word !important;
                    overflow-wrap: break-word !important;
                    overflow-y: hidden !important;
                    overflow-x: hidden !important;
                    pointer-events: none !important;
                    user-select: none !important;
                    -webkit-user-select: none !important;
                    color: #f8fafc !important;
                    background: transparent !important;
                    z-index: 1 !important;
                }
                .zds-textarea.zds-syntax-ta {
                    position: relative !important;
                    z-index: 2 !important;
                    color: transparent !important;
                    caret-color: #ffffff !important;
                    -webkit-text-fill-color: transparent !important;
                    background: rgba(0, 0, 0, 0.65) !important;
                }
                .zds-textarea.zds-syntax-ta::selection {
                    background: rgba(168, 85, 247, 0.45) !important;
                    -webkit-text-fill-color: #ffffff !important;
                    color: #ffffff !important;
                }
                .zds-textarea.zds-syntax-ta::-moz-selection {
                    background: rgba(168, 85, 247, 0.45) !important;
                    color: #ffffff !important;
                }
                .zds-autocomplete-menu {
                    position: fixed !important;
                    background: rgba(15, 23, 42, 0.96) !important;
                    backdrop-filter: blur(16px) !important;
                    -webkit-backdrop-filter: blur(16px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.16) !important;
                    border-radius: 8px !important;
                    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.85), 0 0 1px 1px rgba(255, 255, 255, 0.1) !important;
                    max-height: 240px !important;
                    width: 340px !important;
                    overflow-y: auto !important;
                    z-index: 999999 !important;
                    pointer-events: auto !important;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
                    font-size: 12px !important;
                    display: none;
                    box-sizing: border-box !important;
                    padding: 4px !important;
                    scrollbar-width: thin !important;
                    scrollbar-color: rgba(255, 255, 255, 0.25) transparent !important;
                }
                .zds-autocomplete-item {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    padding: 6px 10px !important;
                    border-radius: 5px !important;
                    cursor: pointer !important;
                    user-select: none !important;
                    transition: background 0.1s ease !important;
                    color: #f1f5f9 !important;
                }
                .zds-autocomplete-item:hover, .zds-autocomplete-item.selected {
                    background: rgba(139, 92, 246, 0.3) !important;
                    color: #ffffff !important;
                }
                .zds-ac-badge {
                    font-size: 9px !important;
                    font-weight: 700 !important;
                    padding: 1px 5px !important;
                    border-radius: 3px !important;
                    letter-spacing: 0.5px !important;
                    text-transform: uppercase !important;
                    flex-shrink: 0 !important;
                }
                .zds-ac-badge.badge-wildcard {
                    background: rgba(245, 158, 11, 0.25) !important;
                    color: #fbbf24 !important;
                    border: 1px solid rgba(245, 158, 11, 0.4) !important;
                }
                .zds-ac-badge.badge-lora {
                    background: rgba(168, 85, 247, 0.25) !important;
                    color: #c084fc !important;
                    border: 1px solid rgba(168, 85, 247, 0.4) !important;
                }
                .zds-ac-badge.badge-variable {
                    background: rgba(59, 130, 246, 0.25) !important;
                    color: #60a5fa !important;
                    border: 1px solid rgba(59, 130, 246, 0.4) !important;
                }
                .zds-ac-badge.badge-property {
                    background: rgba(16, 185, 129, 0.25) !important;
                    color: #34d399 !important;
                    border: 1px solid rgba(16, 185, 129, 0.4) !important;
                }
                .zds-ac-badge.badge-curator {
                    background: rgba(236, 72, 153, 0.25) !important;
                    color: #f472b6 !important;
                    border: 1px solid rgba(236, 72, 153, 0.4) !important;
                }
                .zds-ac-label {
                    flex: 1 !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                }
                .zds-ac-hint {
                    font-size: 10px !important;
                    color: #94a3b8 !important;
                    margin-left: auto !important;
                    flex-shrink: 0 !important;
                }
                .zds-ac-empty {
                    padding: 6px 10px !important;
                    font-size: 11px !important;
                    color: #94a3b8 !important;
                    text-align: center !important;
                    font-style: italic !important;
                }
                .zds-widgets-body {
                    flex: 1 1 auto !important;
                    min-height: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    gap: 8px !important;
                    padding: 8px 10px 14px 10px !important;
                    box-sizing: border-box !important;
                }
                .zds-widgets-body::-webkit-scrollbar {
                    width: 6px !important;
                }
                .zds-widgets-body::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.25) !important;
                    border-radius: 3px !important;
                }
                .zds-widgets-body::-webkit-scrollbar-thumb {
                    background: rgba(168, 85, 247, 0.45) !important;
                    border-radius: 3px !important;
                }
                .zds-widgets-body::-webkit-scrollbar-thumb:hover {
                    background: rgba(168, 85, 247, 0.8) !important;
                }
                .zds-widget-row {
                    width: 100% !important;
                    box-sizing: border-box !important;
                    flex-shrink: 0;
                }
                .zds-widget-row.zds-widget-multiline {
                    flex: 1 1 auto !important;
                    flex-shrink: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    min-height: 90px !important;
                }
                .zds-widget-row.zds-widget-hero-prompt {
                    flex: 2.2 1 130px !important;
                    min-height: 120px !important;
                }
                .zds-widget-row.zds-widget-secondary-prompt {
                    flex: 1.2 1 85px !important;
                    min-height: 80px !important;
                }
                .zds-textarea {
                    width: 100% !important;
                    box-sizing: border-box !important;
                    flex: 1 1 auto !important;
                    min-height: 70px !important;
                    height: 100% !important;
                    resize: vertical !important;
                    background: rgba(0, 0, 0, 0.5) !important;
                    border: 1px solid rgba(255, 255, 255, 0.12) !important;
                    border-radius: 6px !important;
                    color: #f8fafc !important;
                    font-family: Consolas, 'SF Mono', Monaco, 'Liberation Mono', monospace !important;
                    font-size: 12px !important;
                    line-height: 1.45 !important;
                    padding: 8px 10px !important;
                    white-space: pre-wrap !important;
                    word-break: break-word !important;
                    outline: none !important;
                    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease !important;
                }
                .zds-textarea:focus {
                    border-color: #a855f7 !important;
                    background: rgba(0, 0, 0, 0.75) !important;
                    box-shadow: 0 0 10px rgba(168, 85, 247, 0.35) !important;
                }
                /* Structured Studio Cards & Toolbars */
                .zds-studio-toolbar {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 6px !important;
                    padding: 4px 0 6px 0 !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
                    margin-bottom: 6px !important;
                }
                .zds-studio-btn {
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 4px !important;
                    background: rgba(255, 255, 255, 0.05) !important;
                    border: 1px solid rgba(255, 255, 255, 0.12) !important;
                    border-radius: 5px !important;
                    color: #e2e8f0 !important;
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    padding: 4px 10px !important;
                    cursor: pointer !important;
                    transition: all 0.15s ease !important;
                    white-space: nowrap !important;
                    line-height: 1.2 !important;
                }
                .zds-studio-btn:hover {
                    background: rgba(168, 85, 247, 0.25) !important;
                    border-color: rgba(168, 85, 247, 0.6) !important;
                    color: #ffffff !important;
                    box-shadow: 0 0 10px rgba(168, 85, 247, 0.3) !important;
                    transform: translateY(-1px) !important;
                }
                .zds-studio-btn:active {
                    transform: translateY(0) !important;
                }
                .zds-prompt-box {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 5px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    margin-bottom: 6px !important;
                }
                .zds-prompt-box-pos {
                    flex: 2.2 1 140px !important;
                    min-height: 130px !important;
                }
                .zds-prompt-box-neg {
                    flex: 1.2 1 90px !important;
                    min-height: 85px !important;
                }
                .zds-prompt-muted .zds-textarea-neg {
                    opacity: 0.45 !important;
                    filter: grayscale(0.8) !important;
                    text-decoration: line-through !important;
                }
                .zds-prompt-header {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    width: 100% !important;
                    padding: 2px 2px !important;
                    box-sizing: border-box !important;
                }
                .zds-prompt-label-left {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    font-size: 11.5px !important;
                    font-weight: 700 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                }
                .zds-prompt-dot-pos {
                    width: 7px !important;
                    height: 7px !important;
                    border-radius: 50% !important;
                    background: #10b981 !important;
                    box-shadow: 0 0 8px rgba(16, 185, 129, 0.7) !important;
                    display: inline-block !important;
                }
                .zds-prompt-dot-neg {
                    width: 7px !important;
                    height: 7px !important;
                    border-radius: 50% !important;
                    background: #f43f5e !important;
                    box-shadow: 0 0 8px rgba(244, 63, 94, 0.7) !important;
                    display: inline-block !important;
                }
                .zds-mute-inline-label {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 4px !important;
                    cursor: pointer !important;
                    margin-left: 8px !important;
                }
                .zds-prompt-actions {
                    display: flex !important;
                    align-items: center !important;
                    gap: 6px !important;
                }
                .zds-prompt-counter {
                    font-size: 10px !important;
                    color: var(--zds-text-muted, #94a3b8) !important;
                    font-family: Consolas, monospace !important;
                    font-weight: normal !important;
                    margin-right: 4px !important;
                }
                .zds-prompt-tool-btn {
                    background: rgba(255, 255, 255, 0.04) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 4px !important;
                    color: #94a3b8 !important;
                    font-size: 10.5px !important;
                    padding: 2px 7px !important;
                    cursor: pointer !important;
                    transition: all 0.15s ease !important;
                    line-height: 1.2 !important;
                }
                .zds-prompt-tool-btn:hover {
                    border-color: #a855f7 !important;
                    color: #ffffff !important;
                    background: rgba(168, 85, 247, 0.2) !important;
                }
                .zds-section-subhead {
                    font-size: 11px !important;
                    font-weight: 700 !important;
                    color: #c084fc !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    margin-bottom: 6px !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 6px !important;
                }
                .zds-library-section {
                    width: 100% !important;
                    box-sizing: border-box !important;
                    background: rgba(0, 0, 0, 0.25) !important;
                    border: 1px solid rgba(255, 255, 255, 0.06) !important;
                    border-radius: 6px !important;
                    padding: 8px 10px !important;
                    margin-top: 4px !important;
                    flex-shrink: 0 !important;
                }
                .zds-prompt-library-grid {
                    display: grid !important;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
                    gap: 8px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
                .zds-grid-cell {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 4px !important;
                    min-width: 0 !important;
                }
                .zds-cell-label {
                    font-size: 10.5px !important;
                    color: var(--zds-text-muted, #94a3b8) !important;
                    text-transform: capitalize !important;
                    font-weight: 600 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                .zds-select-compact {
                    padding: 4px 8px !important;
                    font-size: 11px !important;
                    height: 28px !important;
                }
                .zds-input-compact {
                    padding: 4px 8px !important;
                    font-size: 11px !important;
                    height: 28px !important;
                    box-sizing: border-box !important;
                }
                .zds-params-strip {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    align-items: center !important;
                    gap: 12px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    background: rgba(0, 0, 0, 0.25) !important;
                    border: 1px solid rgba(255, 255, 255, 0.06) !important;
                    border-radius: 6px !important;
                    padding: 8px 10px !important;
                    margin-top: 4px !important;
                    flex-shrink: 0 !important;
                }
                .zds-param-block {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 3px !important;
                    min-width: 120px !important;
                    flex: 1 1 auto !important;
                }
                .zds-seed-block {
                    flex: 1.5 1 200px !important;
                }
                .zds-card-header {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    padding: 8px 12px;
                    background: rgba(14, 17, 28, 0.85);
                    border-bottom: 1px solid var(--zds-border-subtle);
                    cursor: grab;
                }
                .zds-card-header:active {
                    cursor: grabbing;
                }
                .zds-card-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    width: 100%;
                }
                .zds-card-title-left {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                    flex: 1;
                }
                .zds-card-title {
                    font-size: 13.5px;
                    font-weight: 700;
                    color: #ffffff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    border-radius: 4px;
                    padding: 2px 5px;
                    cursor: default;
                    border: 1px solid transparent;
                    transition: all 0.15s ease;
                }
                .zds-card-title:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.15);
                }
                .zds-card-title.zds-title-editing {
                    background: rgba(0, 0, 0, 0.9) !important;
                    border-color: #a855f7 !important;
                    box-shadow: 0 0 10px rgba(168, 85, 247, 0.5) !important;
                    color: #ffffff !important;
                    cursor: text !important;
                    outline: none !important;
                }
                .zds-card-meta-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11px;
                    color: var(--zds-text-secondary);
                    overflow: hidden;
                }
                .zds-card-meta-row .zds-card-role {
                    flex: 1;
                    min-width: 0;
                }
                /* Collapsed Card State */
                .zds-card.zds-card-collapsed {
                    height: auto !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    resize: none !important;
                    padding-bottom: 0 !important;
                }
                .zds-card.zds-card-collapsed .zds-card-lineage-bar,
                .zds-card.zds-card-collapsed .zds-card-connections-drawer,
                .zds-card.zds-card-collapsed .zds-ports-section,
                .zds-card.zds-card-collapsed .zds-progress-container,
                .zds-card.zds-card-collapsed .zds-widgets-body,
                .zds-card.zds-card-collapsed .zds-card-preview {
                    display: none !important;
                }
                /* Disconnected Node Warning State */
                .zds-card.zds-card-disconnected {
                    border: 1px dashed rgba(239, 68, 68, 0.7) !important;
                    box-shadow: inset 0 0 12px rgba(239, 68, 68, 0.1) !important;
                }
                .zds-badge-disconnected {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 3px !important;
                    padding: 1px 6px !important;
                    border-radius: 4px !important;
                    background: rgba(239, 68, 68, 0.22) !important;
                    border: 1px solid rgba(239, 68, 68, 0.55) !important;
                    color: #fca5a5 !important;
                    font-size: 10px !important;
                    font-weight: 700 !important;
                    letter-spacing: 0.4px !important;
                    white-space: nowrap !important;
                    animation: zds-pulse-warn 2s infinite ease-in-out !important;
                }
                .zds-badge-unfed {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 3px !important;
                    padding: 1px 6px !important;
                    border-radius: 4px !important;
                    background: rgba(245, 158, 11, 0.22) !important;
                    border: 1px solid rgba(245, 158, 11, 0.55) !important;
                    color: #fcd34d !important;
                    font-size: 10px !important;
                    font-weight: 700 !important;
                    letter-spacing: 0.4px !important;
                    white-space: nowrap !important;
                }
                @keyframes zds-pulse-warn {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                /* Always-Visible Connection Lineage Bar */
                .zds-card-lineage-bar {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 4px !important;
                    padding: 6px 10px !important;
                    background: rgba(0, 0, 0, 0.38) !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
                    box-sizing: border-box !important;
                    flex-shrink: 0 !important;
                }
                .zds-lineage-row {
                    display: flex !important;
                    align-items: center !important;
                    gap: 6px !important;
                    font-size: 11px !important;
                    overflow-x: auto !important;
                    overflow-y: hidden !important;
                    scrollbar-width: none !important;
                }
                .zds-lineage-row::-webkit-scrollbar {
                    display: none !important;
                }
                .zds-lineage-label {
                    font-size: 9.5px !important;
                    font-weight: 800 !important;
                    color: #94a3b8 !important;
                    letter-spacing: 0.6px !important;
                    flex-shrink: 0 !important;
                    min-width: 38px !important;
                    text-transform: uppercase !important;
                }
                .zds-lineage-chips {
                    display: flex !important;
                    align-items: center !important;
                    gap: 4px !important;
                    flex-wrap: nowrap !important;
                }
                .zds-lineage-chip {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 3px !important;
                    padding: 2px 7px !important;
                    border-radius: 4px !important;
                    font-size: 10px !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    white-space: nowrap !important;
                    transition: all 0.15s ease !important;
                    border: 1px solid transparent !important;
                    line-height: 1.2 !important;
                }
                .zds-lineage-chip.zds-chip-in {
                    background: rgba(59, 130, 246, 0.18) !important;
                    color: #93c5fd !important;
                    border-color: rgba(59, 130, 246, 0.35) !important;
                }
                .zds-lineage-chip.zds-chip-in:hover {
                    background: rgba(59, 130, 246, 0.38) !important;
                    border-color: #3b82f6 !important;
                    color: #ffffff !important;
                    box-shadow: 0 0 8px rgba(59, 130, 246, 0.45) !important;
                    transform: translateY(-1px) !important;
                }
                .zds-lineage-chip.zds-chip-out {
                    background: rgba(16, 185, 129, 0.18) !important;
                    color: #6ee7b7 !important;
                    border-color: rgba(16, 185, 129, 0.35) !important;
                }
                .zds-lineage-chip.zds-chip-out:hover {
                    background: rgba(16, 185, 129, 0.38) !important;
                    border-color: #10b981 !important;
                    color: #ffffff !important;
                    box-shadow: 0 0 8px rgba(16, 185, 129, 0.45) !important;
                    transform: translateY(-1px) !important;
                }
                .zds-lineage-empty {
                    font-size: 10px !important;
                    color: rgba(255, 255, 255, 0.35) !important;
                    font-style: italic !important;
                }
                .zds-lineage-empty-warn {
                    color: #f59e0b !important;
                    font-weight: 600 !important;
                }
                /* Header Quick View & Delete Buttons */
                .zds-card-btn-star {
                    font-size: 12px !important;
                    color: #94a3b8 !important;
                }
                .zds-card-btn-star:hover {
                    color: #fbbf24 !important;
                    background: rgba(251, 191, 36, 0.15) !important;
                    border-color: rgba(251, 191, 36, 0.4) !important;
                }
                .zds-card-btn-star.zds-btn-active-star {
                    color: #fbbf24 !important;
                    background: rgba(251, 191, 36, 0.25) !important;
                    border-color: rgba(251, 191, 36, 0.7) !important;
                    box-shadow: 0 0 8px rgba(251, 191, 36, 0.4) !important;
                }
                .zds-card-btn-delete {
                    font-size: 11px !important;
                    color: #94a3b8 !important;
                }
                .zds-card-btn-delete:hover {
                    color: #ef4444 !important;
                    background: rgba(239, 68, 68, 0.2) !important;
                    border-color: rgba(239, 68, 68, 0.5) !important;
                }
                .zds-quickview-badge {
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    min-width: 16px !important;
                    height: 16px !important;
                    padding: 0 4px !important;
                    border-radius: 8px !important;
                    background: rgba(251, 191, 36, 0.25) !important;
                    border: 1px solid rgba(251, 191, 36, 0.6) !important;
                    color: #fde68a !important;
                    font-size: 10px !important;
                    font-weight: 700 !important;
                    margin-left: 4px !important;
                }
                .zds-quickview-workspace {
                    flex: 1 1 0px !important;
                    min-height: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    height: 100% !important;
                    max-height: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                    background: radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.05), transparent 75%) !important;
                }
                .zds-quickview-header {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    padding: 8px 18px !important;
                    background: rgba(14, 17, 28, 0.95) !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                    flex-shrink: 0 !important;
                    gap: 12px !important;
                    flex-wrap: wrap !important;
                    backdrop-filter: blur(12px) !important;
                }
                .zds-quickview-title-group {
                    display: flex !important;
                    align-items: center !important;
                    gap: 10px !important;
                }
                .zds-quickview-title {
                    font-size: 14px !important;
                    font-weight: 700 !important;
                    color: #f8fafc !important;
                    letter-spacing: -0.2px !important;
                }
                .zds-quickview-subtitle {
                    font-size: 11.5px !important;
                    color: #94a3b8 !important;
                    margin-left: 8px !important;
                }
                .zds-quickview-actions {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    flex-wrap: wrap !important;
                }
                .zds-qv-btn-group {
                    display: inline-flex !important;
                    align-items: center !important;
                    background: rgba(0, 0, 0, 0.35) !important;
                    border: 1px solid rgba(255, 255, 255, 0.12) !important;
                    border-radius: 6px !important;
                    padding: 2px !important;
                    gap: 2px !important;
                }
                .zds-qv-subbtn {
                    background: transparent !important;
                    border: none !important;
                    color: #94a3b8 !important;
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    padding: 3px 8px !important;
                    border-radius: 4px !important;
                    cursor: pointer !important;
                    transition: all 0.15s ease !important;
                }
                .zds-qv-subbtn:hover {
                    color: #f8fafc !important;
                    background: rgba(255, 255, 255, 0.08) !important;
                }
                .zds-qv-subbtn.zds-btn-active {
                    color: #ffffff !important;
                    background: rgba(245, 158, 11, 0.3) !important;
                    box-shadow: 0 0 8px rgba(245, 158, 11, 0.35) !important;
                }
                .zds-quickview-lane {
                    flex: 1 1 auto !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                    height: 100% !important;
                    max-height: 100% !important;
                    min-height: 0 !important;
                    gap: 16px !important;
                    padding: 16px 20px 50px 20px !important;
                    box-sizing: border-box !important;
                }
                .zds-quickview-lane::-webkit-scrollbar {
                    width: 12px !important;
                    height: 12px !important;
                }
                .zds-quickview-lane::-webkit-scrollbar-track {
                    background: rgba(10, 12, 20, 0.75) !important;
                    border-radius: 6px !important;
                }
                .zds-quickview-lane::-webkit-scrollbar-thumb {
                    background: rgba(245, 158, 11, 0.6) !important;
                    border-radius: 6px !important;
                    border: 2px solid rgba(10, 12, 20, 0.75) !important;
                }
                .zds-quickview-lane::-webkit-scrollbar-thumb:hover {
                    background: #f59e0b !important;
                }
                .zds-quickview-lane.zds-qv-lane-row {
                    overflow-x: scroll !important;
                    overflow-y: auto !important;
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: flex-start !important;
                }
                .zds-quickview-lane.zds-qv-lane-grid {
                    overflow-x: auto !important;
                    overflow-y: auto !important;
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    align-items: flex-start !important;
                    align-content: flex-start !important;
                }
                .zds-quickview-lane .zds-card {
                    position: relative !important;
                    flex: 0 0 auto !important;
                    min-width: 240px !important;
                    max-width: none !important;
                    min-height: 90px !important;
                    max-height: none !important;
                    resize: both !important;
                    overflow: hidden !important;
                    border: 1px solid rgba(245, 158, 11, 0.3) !important;
                    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55), 0 0 16px rgba(245, 158, 11, 0.08) !important;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
                }
                .zds-quickview-lane .zds-card:hover {
                    border-color: rgba(245, 158, 11, 0.6) !important;
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.65), 0 0 20px rgba(245, 158, 11, 0.18) !important;
                }
                .zds-qv-column {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 16px !important;
                    flex: 0 0 auto !important;
                    min-width: 240px !important;
                    align-items: flex-start !important;
                    box-sizing: border-box !important;
                }
                .zds-card.zds-qv-drop-before {
                    border-left: 5px solid #f59e0b !important;
                    box-shadow: -6px 0 20px rgba(245, 158, 11, 0.8) !important;
                }
                .zds-card.zds-qv-drop-after {
                    border-right: 5px solid #f59e0b !important;
                    box-shadow: 6px 0 20px rgba(245, 158, 11, 0.8) !important;
                }
                .zds-card.zds-qv-drop-top {
                    border-top: 5px solid #f59e0b !important;
                    box-shadow: 0 -6px 20px rgba(245, 158, 11, 0.8) !important;
                }
                .zds-card.zds-qv-drop-bottom {
                    border-bottom: 5px solid #f59e0b !important;
                    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.8) !important;
                }
                .zds-card-btn-move {
                    font-size: 10px !important;
                    padding: 2px 5px !important;
                    color: #94a3b8 !important;
                }
                .zds-card-btn-move:hover {
                    color: #f59e0b !important;
                    background: rgba(245, 158, 11, 0.2) !important;
                }
                .zds-card-btn-width {
                    font-size: 11px !important;
                    padding: 2px 5px !important;
                    color: #94a3b8 !important;
                }
                .zds-card-btn-width:hover {
                    color: #38bdf8 !important;
                    background: rgba(56, 189, 248, 0.2) !important;
                }
                /* Node Picker Dropdown */
                .zds-qv-picker-dropdown {
                    background: #111422 !important;
                    border: 1px solid rgba(245, 158, 11, 0.35) !important;
                    border-radius: 8px !important;
                    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.75), 0 0 20px rgba(245, 158, 11, 0.15) !important;
                    width: 340px !important;
                    max-height: 480px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                }
                .zds-qv-picker-header {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    padding: 8px 12px !important;
                    background: rgba(0, 0, 0, 0.4) !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                }
                .zds-qv-picker-list {
                    flex: 1 1 auto !important;
                    overflow-y: auto !important;
                    max-height: 380px !important;
                    padding: 4px !important;
                }
                .zds-qv-picker-item {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    padding: 6px 10px !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    transition: background 0.15s ease !important;
                }
                .zds-qv-picker-item:hover {
                    background: rgba(255, 255, 255, 0.08) !important;
                }
                .zds-qv-picker-item.is-pinned {
                    background: rgba(245, 158, 11, 0.12) !important;
                }
                .zds-qv-picker-item.is-pinned:hover {
                    background: rgba(245, 158, 11, 0.22) !important;
                }
                .zds-qv-picker-star {
                    font-size: 13px !important;
                    color: #94a3b8 !important;
                    width: 16px !important;
                    text-align: center !important;
                }
                .zds-qv-picker-item.is-pinned .zds-qv-picker-star {
                    color: #fbbf24 !important;
                }
                .zds-qv-picker-icon {
                    font-size: 14px !important;
                }
                .zds-qv-picker-info {
                    flex: 1 1 auto !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                }
                .zds-qv-picker-title {
                    font-size: 12px !important;
                    font-weight: 600 !important;
                    color: #f8fafc !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                .zds-qv-picker-type {
                    font-size: 10px !important;
                    color: #94a3b8 !important;
                }
                .zds-quickview-empty {
                    margin: auto !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    text-align: center !important;
                    max-width: 540px !important;
                    padding: 40px 28px !important;
                    background: rgba(18, 22, 36, 0.85) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6) !important;
                }
                .zds-quickview-empty-icon {
                    font-size: 44px !important;
                    margin-bottom: 12px !important;
                    filter: drop-shadow(0 0 16px rgba(251, 191, 36, 0.5)) !important;
                }
                .zds-quickview-empty h3 {
                    margin: 0 0 8px 0 !important;
                    font-size: 17px !important;
                    color: #ffffff !important;
                    font-weight: 700 !important;
                }
                .zds-quickview-empty p {
                    margin: 0 0 14px 0 !important;
                    font-size: 13px !important;
                    color: #94a3b8 !important;
                    line-height: 1.5 !important;
                }
                .zds-quickview-empty-tip {
                    background: rgba(251, 191, 36, 0.1) !important;
                    border: 1px solid rgba(251, 191, 36, 0.3) !important;
                    padding: 8px 14px !important;
                    border-radius: 6px !important;
                    color: #fde68a !important;
                    font-size: 12px !important;
                    margin-bottom: 18px !important;
                }
            `;
            document.head.appendChild(overrideStyle);
        }

        let overlay = document.getElementById("zombiehaus-deck-studio-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "zombiehaus-deck-studio-overlay";
            overlay.innerHTML = `
            <div class="zds-toolbar">
                <div class="zds-toolbar-left">
                    <div class="zds-brand">
                        <div class="zds-brand-logo">▥</div>
                        <span class="zds-brand-title">Zombiehaus Deck Studio</span>
                        <span class="zds-brand-pill">v1.0.1-dev</span>
                    </div>

                    <div class="zds-view-toggle">
                        <button type="button" class="zds-view-btn" id="zds-btn-canvas-view" title="Switch to Canvas Plane (Alt+D / Esc)">
                            <span>⊞</span> Canvas
                        </button>
                        <button type="button" class="zds-view-btn zds-active-view" id="zds-btn-deck-view" title="All Cards View (F9)">
                            <span>▥</span> All Cards
                        </button>
                        <button type="button" class="zds-view-btn" id="zds-btn-quick-view" title="Focus Dashboard (Quick View): Work on your curated cards with custom layout and zero distraction (Alt+Q)">
                            <span>⭐</span> Focus Dashboard <span class="zds-quickview-badge" id="zds-quickview-badge">0</span>
                        </button>
                    </div>
                </div>

                <div class="zds-toolbar-center">
                    <div class="zds-search-box">
                        <span class="zds-search-icon">🔍</span>
                        <input type="text" class="zds-search-input" id="zds-search-input" placeholder="Filter cards..." />
                    </div>

                    <button type="button" class="zds-btn" id="zds-btn-add-card">
                        <span>➕</span> Add Card
                    </button>

                    <button type="button" class="zds-btn" id="zds-btn-prompt-studio" title="Open Fullscreen Prompt Studio (Alt+P)">
                        <span>🗖</span> Prompt Studio
                    </button>

                    <button type="button" class="zds-btn" id="zds-btn-deck-tray" title="Toggle Dockable Image Tray (Alt+T / F10)">
                        <span>🖼️</span> Image Tray
                    </button>

                    <button type="button" class="zds-btn" id="zds-btn-refresh-deck" title="Re-sync all cards with graph">
                        <span>🔄</span> Refresh
                    </button>

                    <button type="button" class="zds-btn" id="zds-btn-toggle-tracing" title="Toggle Connection Cable Tracing on Hover">
                        <span>⚡</span> Trace Wires
                    </button>
                </div>

                <div class="zds-toolbar-right">
                    <div class="zds-batch-stepper" title="Batch Execution Count">
                        <span style="font-size: 11px; color: var(--zds-text-secondary); margin-left: 6px;">Batch:</span>
                        <button type="button" class="zds-stepper-btn" id="zds-batch-dec">-</button>
                        <span class="zds-stepper-val" id="zds-batch-val">1</span>
                        <button type="button" class="zds-stepper-btn" id="zds-batch-inc">+</button>
                    </div>

                    <button type="button" class="zds-btn zds-btn-danger" id="zds-btn-interrupt" title="Cancel Execution">
                        <span>⏹</span> Cancel
                    </button>

                    <button type="button" class="zds-btn zds-btn-primary" id="zds-btn-queue-prompt">
                        <span id="zds-queue-icon">▶</span>
                        <span id="zds-queue-label">Queue Prompt</span>
                    </button>
                </div>
            </div>

            <div class="zds-workspace" id="zds-columns-workspace">
                <!-- 5 Stage Bays injected dynamically -->
            </div>
            `;

            const target = document.body || document.documentElement;
            if (target) {
                target.appendChild(overlay);
            }
        }

        this.overlay = overlay;
        this.workspace = overlay.querySelector("#zds-columns-workspace");

        let svg = this.workspace ? this.workspace.querySelector("#zds-connections-svg") : null;
        if (!svg && this.workspace) {
            svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("class", "zds-connections-svg");
            svg.setAttribute("id", "zds-connections-svg");
            this.workspace.appendChild(svg);
        }
        this.svgOverlay = svg;

        this.renderColumnsSkeleton();
    }

    renderColumnsSkeleton() {
        this.workspace.innerHTML = "";
        this.workspace.style.overflow = "";
        for (const stage of STAGES) {
            const bay = document.createElement("div");
            bay.className = `zds-bay ${stage.colorClass}`;
            bay.id = `zds-bay-${stage.id}`;
            bay.dataset.stageId = stage.id;
            if (this.bayWidths[stage.id]) {
                bay.style.width = `${this.bayWidths[stage.id]}px`;
            }

            bay.innerHTML = `
                <div class="zds-bay-header">
                    <div class="zds-col-indicator"></div>
                    <div class="zds-col-title-group">
                        <div class="zds-col-icon">${stage.icon}</div>
                        <div>
                            <div class="zds-col-name">${stage.name}</div>
                        </div>
                    </div>
                    <span class="zds-col-count" id="zds-count-${stage.id}">0</span>
                </div>
                <div class="zds-bay-lanes" id="zds-lanes-${stage.id}">
                    <div class="zds-column-lane">
                        <div class="zds-lane-header">
                            <span>Lane 1</span>
                            <span class="zds-lane-priority-tag">Standby</span>
                        </div>
                        <div class="zds-lane-cards">
                            <div class="zds-empty-lane">
                                <span>No cards in ${stage.name}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const resizer = document.createElement("div");
            resizer.className = "zds-bay-resizer";
            resizer.title = "Drag to resize column width";
            this.setupBayResizer(resizer, bay, stage.id);
            bay.appendChild(resizer);

            this.workspace.appendChild(bay);
        }
    }

    setupBayResizer(resizer, bay, stageId) {
        let startX = 0;
        let startWidth = 0;

        const onPointerMove = (e) => {
            const dx = e.clientX - startX;
            const newWidth = Math.max(280, Math.round(startWidth + dx));
            bay.style.width = `${newWidth}px`;
            this.bayWidths[stageId] = newWidth;
        };

        const onPointerUp = () => {
            resizer.classList.remove("is-resizing");
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            try {
                localStorage.setItem("zds_bay_widths", JSON.stringify(this.bayWidths));
            } catch (_) {}
            if (this.enableWireTracing && this.svgOverlay) {
                const focusedCard = this.overlay.querySelector(".zds-card-focused");
                if (focusedCard) {
                    const nid = parseInt(focusedCard.dataset.nodeId, 10);
                    if (!isNaN(nid)) this.drawConnectionWires(nid, this.getNodeConnections(nid));
                }
            }
        };

        resizer.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            startX = e.clientX;
            startWidth = bay.offsetWidth;
            resizer.classList.add("is-resizing");
            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);
        });
    }

    setupLaneResizer(resizer, laneEl, laneKey) {
        let startX = 0;
        let startWidth = 0;

        const onPointerMove = (e) => {
            const dx = e.clientX - startX;
            const newWidth = Math.max(280, Math.round(startWidth + dx));
            laneEl.style.width = `${newWidth}px`;
            this.laneWidths[laneKey] = newWidth;
        };

        const onPointerUp = () => {
            resizer.classList.remove("is-resizing");
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            try {
                localStorage.setItem("zds_lane_widths", JSON.stringify(this.laneWidths));
            } catch (_) {}
            if (this.enableWireTracing && this.svgOverlay) {
                const focusedCard = this.overlay.querySelector(".zds-card-focused");
                if (focusedCard) {
                    const nid = parseInt(focusedCard.dataset.nodeId, 10);
                    if (!isNaN(nid)) this.drawConnectionWires(nid, this.getNodeConnections(nid));
                }
            }
        };

        resizer.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            startX = e.clientX;
            startWidth = laneEl.offsetWidth;
            resizer.classList.add("is-resizing");
            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);
        });
    }

    // ── Setup UI Event Listeners ──────────────────────────────────────────────
    setupEventListeners() {
        const overlay = this.overlay;

        // Toggle back to Canvas
        overlay.querySelector("#zds-btn-canvas-view").onclick = () => this.close();

        // View Toggles: All Cards vs Quick View
        const deckViewBtn = overlay.querySelector("#zds-btn-deck-view");
        const quickViewBtn = overlay.querySelector("#zds-btn-quick-view");

        if (deckViewBtn) {
            deckViewBtn.onclick = () => {
                if (this.viewMode === "all") return;
                this.viewMode = "all";
                deckViewBtn.classList.add("zds-active-view");
                if (quickViewBtn) quickViewBtn.classList.remove("zds-active-view");
                this.renderColumnsSkeleton();
                this.syncCards();
            };
        }

        if (quickViewBtn) {
            quickViewBtn.onclick = () => {
                if (this.viewMode === "quickview") return;
                this.viewMode = "quickview";
                quickViewBtn.classList.add("zds-active-view");
                if (deckViewBtn) deckViewBtn.classList.remove("zds-active-view");
                this.syncCards();
            };
        }

        // Refresh button
        overlay.querySelector("#zds-btn-refresh-deck").onclick = () => this.syncCards();

        // Dynamically update wire tracing on workspace / column scroll
        if (this.workspace) {
            this.workspace.addEventListener("scroll", () => {
                if (this.enableWireTracing && this.svgOverlay) {
                    const focusedCard = this.overlay.querySelector(".zds-card-focused");
                    if (focusedCard) {
                        const nid = parseInt(focusedCard.dataset.nodeId, 10);
                        if (!isNaN(nid)) this.drawConnectionWires(nid, this.getNodeConnections(nid));
                    }
                }
            }, { capture: true, passive: true });
        }

        // Image Tray Toggle in Deck Studio
        const trayToggleBtn = overlay.querySelector("#zds-btn-deck-tray");
        if (trayToggleBtn) {
            trayToggleBtn.onclick = () => {
                if (window.zombiehausImageTray) {
                    window.zombiehausImageTray.toggleCollapse();
                    setTimeout(() => this.updateTrayOffset(), 150);
                }
            };
        }

        // Prompt Studio Popout Button
        const promptStudioBtn = overlay.querySelector("#zds-btn-prompt-studio");
        if (promptStudioBtn) {
            promptStudioBtn.onclick = () => this.openPromptStudio();
        }

        // Trace Wires Toggle Button
        const traceBtn = overlay.querySelector("#zds-btn-toggle-tracing");
        const updateTraceBtnUI = () => {
            if (!traceBtn) return;
            if (this.enableWireTracing) {
                traceBtn.classList.add("zds-btn-active");
            } else {
                traceBtn.classList.remove("zds-btn-active");
            }
        };
        updateTraceBtnUI();
        if (traceBtn) {
            traceBtn.onclick = () => {
                this.enableWireTracing = !this.enableWireTracing;
                try {
                    localStorage.setItem("zds_trace_wires", this.enableWireTracing ? "true" : "false");
                } catch (_) {}
                updateTraceBtnUI();
                if (!this.enableWireTracing) {
                    this.clearConnectionHighlights();
                }
            };
        }

        // Queue Prompt
        overlay.querySelector("#zds-btn-queue-prompt").onclick = async () => {
            try {
                const btn = overlay.querySelector("#zds-btn-queue-prompt");
                btn.classList.add("zds-btn-running");
                overlay.querySelector("#zds-queue-label").textContent = "Queuing...";
                await app.queuePrompt(0, this.batchCount);
                setTimeout(() => {
                    overlay.querySelector("#zds-queue-label").textContent = "Queue Prompt";
                    btn.classList.remove("zds-btn-running");
                }, 800);
            } catch (err) {
                console.error("[Deck Studio] Queue Error:", err);
                overlay.querySelector("#zds-queue-label").textContent = "Error";
            }
        };

        // Interrupt
        overlay.querySelector("#zds-btn-interrupt").onclick = () => {
            if (api?.interrupt) {
                api.interrupt();
            } else {
                fetch("/interrupt", { method: "POST" });
            }
        };

        // Batch Stepper
        const batchVal = overlay.querySelector("#zds-batch-val");
        overlay.querySelector("#zds-batch-inc").onclick = () => {
            this.batchCount = Math.min(100, this.batchCount + 1);
            batchVal.textContent = this.batchCount;
        };
        overlay.querySelector("#zds-batch-dec").onclick = () => {
            this.batchCount = Math.max(1, this.batchCount - 1);
            batchVal.textContent = this.batchCount;
        };

        // Search Filter
        const searchInput = overlay.querySelector("#zds-search-input");
        searchInput.oninput = (e) => {
            this.filterQuery = (e.target.value || "").trim().toLowerCase();
            this.applyFilter();
        };

        // Add Card Modal
        overlay.querySelector("#zds-btn-add-card").onclick = () => this.openAddCardModal();

        // ComfyUI WebSocket & Execution Listeners
        const apis = new Set();
        if (typeof api !== "undefined" && api) apis.add(api);
        if (typeof app !== "undefined" && app?.api) apis.add(app.api);

        const handlePreviewBlob = (blob, explicitNodeId) => {
            if (!blob) return;
            if (blob === this._lastPreviewBlob) return;
            this._lastPreviewBlob = blob;

            const nid = explicitNodeId != null
                ? parseInt(explicitNodeId, 10)
                : (this.executingNodeId || this.currentProgressNodeId || (app?.runningNodeId ? parseInt(app.runningNodeId, 10) : null));

            if (!nid || isNaN(nid)) return;

            const blobUrl = URL.createObjectURL(blob);
            if (!this._currentBlobUrls) this._currentBlobUrls = {};
            const oldUrl = this._currentBlobUrls[nid];
            this._currentBlobUrls[nid] = blobUrl;
            this.lastExecutedImages[nid] = blobUrl;

            this.updateCardPreview(nid, blobUrl);

            if (oldUrl && oldUrl.startsWith("blob:")) {
                setTimeout(() => {
                    try { URL.revokeObjectURL(oldUrl); } catch (_) {}
                }, 1500);
            }
        };

        apis.forEach((apiTarget) => {
            apiTarget?.addEventListener?.("execution_start", () => {
                this.executingNodeId = null;
                this.currentProgressNodeId = null;
                this.updateExecutionState();
            });

            apiTarget?.addEventListener?.("executing", (e) => {
                const rawNodeId = (e.detail && typeof e.detail === "object")
                    ? (e.detail.display_node || e.detail.node || e.detail.nodeId)
                    : e.detail;
                this.executingNodeId = rawNodeId ? parseInt(rawNodeId, 10) : null;
                this.updateExecutionState();
            });

            apiTarget?.addEventListener?.("progress", (e) => {
                const { value, max, node } = e.detail || {};
                if (node != null) {
                    const nid = parseInt(node, 10);
                    this.currentProgressNodeId = nid;
                    if (!this.executingNodeId) this.executingNodeId = nid;
                    this.samplerProgress[nid] = { value, max };
                    this.updateProgressBar(nid, value, max);
                }
            });

            // Live Real-Time Step-by-Step Preview during KSampler / Generation
            apiTarget?.addEventListener?.("b_preview", (e) => {
                const blob = (e.detail instanceof Blob) ? e.detail : (e.detail?.blob instanceof Blob ? e.detail.blob : null);
                if (blob) {
                    handlePreviewBlob(blob, e.detail?.nodeId || e.detail?.displayNodeId);
                }
            });

            apiTarget?.addEventListener?.("b_preview_with_metadata", (e) => {
                const blob = (e.detail?.blob instanceof Blob) ? e.detail.blob : (e.detail instanceof Blob ? e.detail : null);
                const nid = e.detail?.displayNodeId || e.detail?.nodeId || e.detail?.realNodeId;
                if (blob) {
                    handlePreviewBlob(blob, nid);
                }
            });

            apiTarget?.addEventListener?.("executed", (e) => {
                const { node, output } = e.detail || {};
                if (node && output?.images && output.images.length > 0) {
                    const img = output.images[0];
                    const url = `/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${encodeURIComponent(img.type || "output")}`;
                    this.lastExecutedImages[parseInt(node, 10)] = url;
                    this.updateCardPreview(parseInt(node, 10), url);
                }
                if (parseInt(node, 10) === this.executingNodeId) {
                    this.executingNodeId = null;
                    this.updateExecutionState();
                }
            });
        });

        window.addEventListener("resize", () => {
            if (this.isOpen) this.updateTrayOffset();
        });
    }

    // ── Setup Keyboard Shortcuts ──────────────────────────────────────────────
    setupKeyboardShortcuts() {
        window.addEventListener("keydown", (e) => {
            // Alt + D or F9 to toggle Deck Studio
            if ((e.altKey && e.code === "KeyD") || e.code === "F9") {
                e.preventDefault();
                this.toggle();
                return;
            }

            // Alt + Q to toggle Quick View Cockpit
            if ((e.altKey && e.code === "KeyQ") && this.isOpen) {
                e.preventDefault();
                if (this.viewMode === "quickview") {
                    const btn = this.overlay.querySelector("#zds-btn-deck-view");
                    if (btn) btn.click();
                } else {
                    const btn = this.overlay.querySelector("#zds-btn-quick-view");
                    if (btn) btn.click();
                }
                return;
            }

            // Alt + P to pop out Prompt Studio
            if ((e.altKey && e.code === "KeyP") && this.isOpen) {
                e.preventDefault();
                this.openPromptStudio();
                return;
            }

            // Esc to exit Deck Studio / modals
            if (e.code === "Escape" && this.isOpen) {
                if (document.querySelector(".zds-prompt-modal-overlay")) {
                    document.querySelector(".zds-prompt-modal-overlay").remove();
                } else if (document.querySelector(".zds-modal-overlay")) {
                    document.querySelector(".zds-modal-overlay").remove();
                } else if (this.activeConnectingSource) {
                    this.cancelConnectingMode();
                } else {
                    this.close();
                }
            }
        });
    }

    // ── Toggle, Open, Close ───────────────────────────────────────────────────
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    updateTrayOffset() {
        if (!this.overlay) return;
        let trayH = 0;
        const tray = window.zombiehausImageTray?.trayEl || document.getElementById("zombiehaus-image-tray");
        if (tray && tray.style.display !== "none") {
            trayH = Math.round(tray.offsetHeight) || 0;
        }
        this.overlay.style.bottom = `${trayH}px`;
    }

    open() {
        this.isOpen = true;
        this.overlay.classList.add("zds-active");
        document.body.classList.add("zombiehaus-deck-active");
        this.updateTrayOffset();
        if (window.zombiehausImageTray) {
            window.zombiehausImageTray.updateBottomOffset();
        }
        try {
            this.syncCards();
            this.updateExecutionState();
        } catch (err) {
            console.error("[Deck Studio] Error during open syncCards:", err);
        }
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.remove("zds-active");
        document.body.classList.remove("zombiehaus-deck-active");
        if (window.zombiehausImageTray) {
            window.zombiehausImageTray.updateBottomOffset();
        }
        this.cancelConnectingMode();
        this.clearConnectionHighlights();
    }

    // ── Sync All Cards from Active Graph with Execution Priority ────────────
    syncCards() {
        if (!app.graph || !app.graph._nodes) return;

        if (this.viewMode === "quickview") {
            this.renderQuickViewWorkspace();
            return;
        }

        const nodes = app.graph._nodes;
        const buckets = {
            assets: [],
            prompt: [],
            generation: [],
            refinement: [],
            output: []
        };

        for (const node of nodes) {
            const ov = this.cardOverrides[node.id];
            const targetStage = (ov && typeof ov === "object" ? ov.stage : ov) || classifyNode(node);
            if (buckets[targetStage]) {
                buckets[targetStage].push(node);
            } else {
                buckets.generation.push(node);
            }
        }

        // Divide each stage into multi-column lanes (up to 3 cards per lane)
        const stageLanesMap = {};
        for (const stage of STAGES) {
            const stageNodes = buckets[stage.id] || [];
            const laneCount = Math.max(1, Math.ceil(stageNodes.length / 3));
            const lanes = Array.from({ length: laneCount }, () => []);

            stageNodes.forEach((node, idx) => {
                const ov = this.cardOverrides[node.id];
                const preferredLane = ov && typeof ov === "object" ? ov.lane : Math.floor(idx / 3);
                const assignedLane = Math.min(preferredLane, laneCount - 1);
                lanes[assignedLane].push(node);
            });
            stageLanesMap[stage.id] = lanes;
        }

        // Calculate deterministic run priority: Top-Left -> Down -> Next Column -> Next Bay
        let globalStepPriority = 1;
        for (const stage of STAGES) {
            const lanes = stageLanesMap[stage.id] || [];
            for (const lane of lanes) {
                for (const node of lane) {
                    node._zdsRunStep = globalStepPriority++;
                }
            }
        }

        // Render each Stage Bay with multi-column lanes
        for (const stage of STAGES) {
            const bay = this.overlay.querySelector(`#zds-bay-${stage.id}`);
            const lanesContainer = this.overlay.querySelector(`#zds-lanes-${stage.id}`);
            const countEl = this.overlay.querySelector(`#zds-count-${stage.id}`);
            const stageNodes = buckets[stage.id] || [];
            const lanes = stageLanesMap[stage.id] || [];

            if (countEl) countEl.textContent = stageNodes.length;
            if (!lanesContainer) continue;

            lanesContainer.innerHTML = "";

            if (stageNodes.length === 0) {
                lanesContainer.innerHTML = `
                    <div class="zds-column-lane">
                        <div class="zds-lane-header">
                            <span>Lane 1</span>
                            <span class="zds-lane-priority-tag">Standby</span>
                        </div>
                        <div class="zds-lane-cards">
                            <div class="zds-empty-lane">
                                <span>No cards in ${stage.name}</span>
                            </div>
                        </div>
                    </div>
                `;
                continue;
            }

            lanes.forEach((laneNodes, laneIdx) => {
                const laneEl = document.createElement("div");
                laneEl.className = "zds-column-lane";
                laneEl.dataset.stageId = stage.id;
                laneEl.dataset.laneIndex = laneIdx;
                const laneKey = `${stage.id}_lane_${laneIdx}`;
                if (this.laneWidths[laneKey]) {
                    laneEl.style.width = `${this.laneWidths[laneKey]}px`;
                }

                const firstStep = laneNodes.length > 0 ? laneNodes[0]._zdsRunStep : "-";
                const lastStep = laneNodes.length > 0 ? laneNodes[laneNodes.length - 1]._zdsRunStep : "-";

                laneEl.innerHTML = `
                    <div class="zds-lane-header">
                        <span>Lane ${laneIdx + 1}</span>
                        <span class="zds-lane-priority-tag">${laneNodes.length > 0 ? `Steps #${firstStep}-${lastStep}` : "Empty"}</span>
                    </div>
                    <div class="zds-lane-cards"></div>
                `;

                const laneResizer = document.createElement("div");
                laneResizer.className = "zds-lane-resizer";
                laneResizer.title = "Drag to resize column lane width";
                this.setupLaneResizer(laneResizer, laneEl, laneKey);
                laneEl.appendChild(laneResizer);

                const cardsContainer = laneEl.querySelector(".zds-lane-cards");

                // Forward wheel scrolling from column lane header/border to cards container
                laneEl.addEventListener("wheel", (e) => {
                    if (cardsContainer && !cardsContainer.contains(e.target) && e.deltaY) {
                        cardsContainer.scrollTop += e.deltaY;
                    }
                }, { passive: true });

                // Drag & Drop onto specific Lane
                laneEl.addEventListener("dragover", (e) => {
                    e.preventDefault();
                    laneEl.style.borderColor = "var(--zds-accent-cyan)";
                });

                laneEl.addEventListener("dragleave", (e) => {
                    if (!laneEl.contains(e.relatedTarget)) {
                        laneEl.style.borderColor = "";
                    }
                });

                laneEl.addEventListener("drop", (e) => {
                    e.preventDefault();
                    laneEl.style.borderColor = "";
                    let rawId = null;
                    try {
                        rawId = e.dataTransfer.getData("text/zds-node-id") ||
                                e.dataTransfer.getData("text/plain") ||
                                e.dataTransfer.getData("text/zds-qv-node-id");
                    } catch (_) {}
                    const nodeId = parseInt(rawId || this.draggedCardNodeId, 10);
                    if (!isNaN(nodeId)) {
                        this.cardOverrides[nodeId] = { stage: stage.id, lane: laneIdx };
                        try {
                            localStorage.setItem("zds_card_overrides", JSON.stringify(this.cardOverrides));
                        } catch (_) {}
                        this.syncCards();
                    }
                });

                for (const node of laneNodes) {
                    try {
                        const card = this.renderCard(node);
                        if (card) cardsContainer.appendChild(card);
                    } catch (cardErr) {
                        console.error(`[Deck Studio] Error rendering card #${node?.id}:`, cardErr);
                    }
                }

                lanesContainer.appendChild(laneEl);
            });
        }

        this.applyFilter();
        this.updateExecutionState();
    }

    renderQuickViewWorkspace() {
        if (!this.workspace || !app.graph || !app.graph._nodes) return;
        this.clearConnectionHighlights();
        this.workspace.innerHTML = "";
        this.workspace.style.overflow = "hidden"; // Confines scrolling strictly to the lane to prevent nested double-scroll trap

        const allNodes = app.graph._nodes || [];
        const nodeMap = new Map();
        allNodes.forEach(n => {
            nodeMap.set(String(n.id), n);
            nodeMap.set(n.id, n);
        });

        // Reconcile and order pinned nodes based on this.quickViewOrder with string normalization
        const currentOrder = (this.quickViewOrder || []).map(String);
        const pinnedList = Array.from(this.quickViewNodeIds || []).map(String);

        const orderedNodes = [];
        for (const idStr of currentOrder) {
            if (pinnedList.includes(idStr) && nodeMap.has(idStr)) {
                const n = nodeMap.get(idStr);
                if (!orderedNodes.includes(n)) {
                    orderedNodes.push(n);
                }
            }
        }
        for (const idStr of pinnedList) {
            if (nodeMap.has(idStr)) {
                const n = nodeMap.get(idStr);
                if (!orderedNodes.includes(n)) {
                    orderedNodes.push(n);
                    currentOrder.push(idStr);
                }
            }
        }
        this.quickViewOrder = currentOrder;
        try {
            localStorage.setItem("zds_quick_view_order", JSON.stringify(this.quickViewOrder));
        } catch (_) {}

        const qvContainer = document.createElement("div");
        qvContainer.className = "zds-quickview-workspace";

        // Focus Dashboard Sub-header
        const header = document.createElement("div");
        header.className = "zds-quickview-header";
        const isGrid = this.quickViewLayout === "grid";
        const isAutoH = this.quickViewHeightMode === "auto";

        header.innerHTML = `
            <div class="zds-quickview-title-group">
                <span style="font-size: 16px;">⭐</span>
                <div>
                    <span class="zds-quickview-title">Focus Dashboard</span>
                    <span class="zds-quickview-subtitle">${orderedNodes.length} cards • Drag cards or use ◀ ▶ to arrange in any order</span>
                </div>
            </div>
            <div class="zds-quickview-actions">
                <div class="zds-qv-btn-group" title="Dashboard Flow Layout">
                    <button type="button" class="zds-qv-subbtn ${!isGrid ? "zds-btn-active" : ""}" id="zds-qv-layout-row" title="Horizontal Board: side-by-side workstation columns">
                        <span>⇥</span> Row Flow
                    </button>
                    <button type="button" class="zds-qv-subbtn ${isGrid ? "zds-btn-active" : ""}" id="zds-qv-layout-grid" title="Wrap Grid: tiles wrap across the dashboard">
                        <span>⊞</span> Grid Wrap
                    </button>
                </div>

                <div class="zds-qv-btn-group" title="Card Width Sizing Presets">
                    <span style="font-size: 10px; color: #94a3b8; padding: 0 4px; font-weight: 600;">Width:</span>
                    <button type="button" class="zds-qv-subbtn" id="zds-qv-w-380" title="Compact (380px)">380</button>
                    <button type="button" class="zds-qv-subbtn" id="zds-qv-w-520" title="Standard (520px)">520</button>
                    <button type="button" class="zds-qv-subbtn" id="zds-qv-w-720" title="Wide (720px)">720</button>
                    <button type="button" class="zds-qv-subbtn" id="zds-qv-w-960" title="Studio (960px)">960</button>
                    <button type="button" class="zds-qv-subbtn" id="zds-qv-w-reset" title="Reset all custom widths & heights">↺ Reset</button>
                </div>

                <button type="button" class="zds-btn ${isAutoH ? "zds-btn-active" : ""}" id="zds-qv-toggle-height" title="Toggle Card Height: Full Workspace Height vs Content Auto-Height">
                    <span>↕</span> ${isAutoH ? "Auto Height" : "Full Height"}
                </button>

                <button type="button" class="zds-btn zds-btn-secondary" id="zds-btn-qv-manage" title="Add / remove cards from Focus Dashboard">
                    <span>➕</span> Pin Cards ▾
                </button>

                ${orderedNodes.length > 0 ? `
                    <button type="button" class="zds-btn" id="zds-btn-qv-clear-all" title="Unpin all nodes from Focus Dashboard">
                        <span>✕</span> Clear All
                    </button>
                ` : ""}

                <button type="button" class="zds-btn zds-btn-primary" id="zds-btn-qv-all-cards" title="Return to All Cards View (Full 5-Stage Grid)">
                    <span>▥</span> All Cards
                </button>
            </div>
        `;

        // Layout toggles
        const rowBtn = header.querySelector("#zds-qv-layout-row");
        const gridBtn = header.querySelector("#zds-qv-layout-grid");
        if (rowBtn) {
            rowBtn.onclick = () => {
                this.quickViewLayout = "row";
                try { localStorage.setItem("zds_quick_view_layout", "row"); } catch (_) {}
                this.syncCards();
            };
        }
        if (gridBtn) {
            gridBtn.onclick = () => {
                this.quickViewLayout = "grid";
                try { localStorage.setItem("zds_quick_view_layout", "grid"); } catch (_) {}
                this.syncCards();
            };
        }

        // Width presets
        const applyWidthPreset = (w) => {
            this.quickViewCardWidth = w;
            try { localStorage.setItem("zds_quick_view_card_width", String(w)); } catch (_) {}
            orderedNodes.forEach(n => {
                if (!this.quickViewCardSizes) this.quickViewCardSizes = {};
                const prev = this.quickViewCardSizes[n.id] || {};
                this.quickViewCardSizes[n.id] = { width: w, height: prev.height || (isGrid ? 520 : undefined) };
            });
            try { localStorage.setItem("zds_quick_view_card_sizes", JSON.stringify(this.quickViewCardSizes)); } catch (_) {}
            this.syncCards();
        };

        const w380 = header.querySelector("#zds-qv-w-380");
        const w520 = header.querySelector("#zds-qv-w-520");
        const w720 = header.querySelector("#zds-qv-w-720");
        const w960 = header.querySelector("#zds-qv-w-960");
        const wReset = header.querySelector("#zds-qv-w-reset");
        if (w380) w380.onclick = () => applyWidthPreset(380);
        if (w520) w520.onclick = () => applyWidthPreset(520);
        if (w720) w720.onclick = () => applyWidthPreset(720);
        if (w960) w960.onclick = () => applyWidthPreset(960);
        if (wReset) {
            wReset.onclick = () => {
                this.quickViewCardWidth = null;
                this.quickViewCardSizes = {};
                try {
                    localStorage.removeItem("zds_quick_view_card_width");
                    localStorage.removeItem("zds_quick_view_card_sizes");
                } catch (_) {}
                this.syncCards();
            };
        }

        // Height toggle
        const hBtn = header.querySelector("#zds-qv-toggle-height");
        if (hBtn) {
            hBtn.onclick = () => {
                this.quickViewHeightMode = this.quickViewHeightMode === "auto" ? "full" : "auto";
                try { localStorage.setItem("zds_quick_view_height_mode", this.quickViewHeightMode); } catch (_) {}
                this.syncCards();
            };
        }

        // Manage Cards picker
        const manageBtn = header.querySelector("#zds-btn-qv-manage");
        if (manageBtn) {
            manageBtn.onclick = (e) => {
                e.stopPropagation();
                this.openQuickViewNodePicker(manageBtn);
            };
        }

        const clearBtn = header.querySelector("#zds-btn-qv-clear-all");
        if (clearBtn) {
            clearBtn.onclick = () => {
                if (confirm("Unpin all nodes from Focus Dashboard?")) {
                    this.quickViewNodeIds.clear();
                    this.quickViewOrder = [];
                    try {
                        localStorage.setItem("zds_quick_view_nodes", JSON.stringify([]));
                        localStorage.setItem("zds_quick_view_order", JSON.stringify([]));
                    } catch (_) {}
                    this.updateQuickViewCount();
                    this.syncCards();
                }
            };
        }

        const allCardsBtn = header.querySelector("#zds-btn-qv-all-cards");
        if (allCardsBtn) {
            allCardsBtn.onclick = () => {
                const btn = this.overlay.querySelector("#zds-btn-deck-view");
                if (btn) btn.click();
            };
        }

        qvContainer.appendChild(header);

        if (orderedNodes.length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "zds-quickview-empty";
            emptyDiv.innerHTML = `
                <div class="zds-quickview-empty-icon">⭐</div>
                <h3>Your Focus Dashboard is Empty</h3>
                <p>Pin only the essential cards you want to focus on (e.g. Prompt Editor, List Curator, KSampler, Hi-Res Fix, All-in-One Detailer). Arrange them in any order and resize freely without clutter.</p>
                <div class="zds-quickview-empty-tip">💡 Click <strong>➕ Pin Cards</strong> above or click the <strong>☆</strong> star icon on any card header in Deck Studio.</div>
                <div style="display: flex; gap: 10px;">
                    <button type="button" class="zds-btn zds-btn-primary" id="zds-btn-qv-empty-pin">
                        <span>➕</span> Choose Cards to Pin
                    </button>
                    <button type="button" class="zds-btn" id="zds-btn-qv-return">
                        <span>▥</span> Return to All Cards
                    </button>
                </div>
            `;
            const emptyPinBtn = emptyDiv.querySelector("#zds-btn-qv-empty-pin");
            if (emptyPinBtn) {
                emptyPinBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.openQuickViewNodePicker(emptyPinBtn);
                };
            }
            const retBtn = emptyDiv.querySelector("#zds-btn-qv-return");
            if (retBtn) {
                retBtn.onclick = () => {
                    const btn = this.overlay.querySelector("#zds-btn-deck-view");
                    if (btn) btn.click();
                };
            }
            qvContainer.appendChild(emptyDiv);
        } else {
            const lane = document.createElement("div");
            lane.className = `zds-quickview-lane ${isGrid ? "zds-qv-lane-grid" : "zds-qv-lane-row"}`;

            // Smooth Horizontal Scrolling via Mouse Wheel in Row Flow
            lane.addEventListener("wheel", (e) => {
                if (this.quickViewLayout !== "grid" && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    const scrollable = e.target.closest(".zds-widgets-body, .zds-prompt-box, textarea");
                    if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
                        const atBottom = e.deltaY > 0 && scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 2;
                        const atTop = e.deltaY < 0 && scrollable.scrollTop <= 2;
                        if (!atBottom && !atTop) return;
                    }
                    e.preventDefault();
                    lane.scrollLeft += e.deltaY * 1.25;
                }
            }, { passive: false });

            lane.addEventListener("dragover", (e) => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
            });

            lane.addEventListener("drop", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.target.closest(".zds-card")) return;

                let rawId = null;
                try {
                    rawId = e.dataTransfer.getData("text/zds-qv-node-id") ||
                            e.dataTransfer.getData("text/plain") ||
                            e.dataTransfer.getData("text/zds-node-id");
                } catch (_) {}
                const fromStr = String(rawId || this.draggedCardNodeId || "");
                if (!fromStr) return;

                const cols = this.getQuickViewColumns();
                cols.push([fromStr]);
                this.quickViewColumns = cols;
                this.quickViewOrder = cols.flat();
                try {
                    localStorage.setItem("zds_quick_view_columns", JSON.stringify(this.quickViewColumns));
                    localStorage.setItem("zds_quick_view_order", JSON.stringify(this.quickViewOrder));
                } catch (_) {}
                this.syncCards();
            });

            const columns = this.getQuickViewColumns();
            columns.forEach((colIds, cIdx) => {
                const colEl = document.createElement("div");
                colEl.className = "zds-qv-column";
                colEl.dataset.colIdx = cIdx;

                colIds.forEach(idStr => {
                    const node = nodeMap.get(idStr);
                    if (node) {
                        try {
                            const card = this.renderCard(node);
                            if (card) {
                                colEl.appendChild(card);
                            }
                        } catch (err) {
                            console.error(`[Deck Studio] Error rendering Quick View card #${idStr}:`, err);
                        }
                    }
                });

                if (colEl.children.length > 0) {
                    lane.appendChild(colEl);
                }
            });

            qvContainer.appendChild(lane);
        }

        this.workspace.appendChild(qvContainer);
        this.updateQuickViewCount();
        this.updateExecutionState();
    }

    getQuickViewColumns() {
        const pinnedList = Array.from(this.quickViewNodeIds || []).map(String);
        let cols = [];
        try {
            const raw = localStorage.getItem("zds_quick_view_columns");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    cols = parsed.map(c => Array.isArray(c) ? c.map(String) : [String(c)]);
                }
            }
        } catch (_) {}

        if (cols.length === 0 && this.quickViewOrder && this.quickViewOrder.length > 0) {
            cols = this.quickViewOrder.map(id => [String(id)]);
        }

        cols = cols.map(c => c.filter(id => pinnedList.includes(id))).filter(c => c.length > 0);

        const allInCols = cols.flat();
        for (const pid of pinnedList) {
            if (!allInCols.includes(pid)) {
                cols.push([pid]);
            }
        }

        this.quickViewColumns = cols;
        this.quickViewOrder = cols.flat();
        return cols;
    }

    moveQuickViewCardPosition(fromId, toId, action = "bottom") {
        const fromStr = String(fromId);
        const toStr = String(toId);
        if (!fromStr || !toStr || fromStr === toStr) return;

        let cols = this.getQuickViewColumns();

        // 1. Remove fromStr from current column
        for (let c = 0; c < cols.length; c++) {
            const idx = cols[c].indexOf(fromStr);
            if (idx !== -1) {
                cols[c].splice(idx, 1);
                break;
            }
        }
        cols = cols.filter(col => col.length > 0);

        // 2. Find toStr position
        let targetCol = -1;
        let targetRow = -1;
        for (let c = 0; c < cols.length; c++) {
            const r = cols[c].indexOf(toStr);
            if (r !== -1) {
                targetCol = c;
                targetRow = r;
                break;
            }
        }

        if (targetCol === -1) {
            cols.push([fromStr]);
        } else if (action === "bottom") {
            cols[targetCol].splice(targetRow + 1, 0, fromStr);
        } else if (action === "top") {
            cols[targetCol].splice(targetRow, 0, fromStr);
        } else if (action === "left") {
            cols.splice(targetCol, 0, [fromStr]);
        } else if (action === "right") {
            cols.splice(targetCol + 1, 0, [fromStr]);
        }

        this.quickViewColumns = cols;
        this.quickViewOrder = cols.flat();
        try {
            localStorage.setItem("zds_quick_view_columns", JSON.stringify(this.quickViewColumns));
            localStorage.setItem("zds_quick_view_order", JSON.stringify(this.quickViewOrder));
        } catch (_) {}
        this.syncCards();
    }

    nudgeQuickViewCard(nodeId, direction) {
        const sId = String(nodeId);
        let cols = this.getQuickViewColumns();

        let cIdx = -1;
        let rIdx = -1;
        for (let c = 0; c < cols.length; c++) {
            const r = cols[c].indexOf(sId);
            if (r !== -1) {
                cIdx = c;
                rIdx = r;
                break;
            }
        }
        if (cIdx === -1) return;

        if (direction === "up") {
            if (rIdx > 0) {
                const above = cols[cIdx][rIdx - 1];
                cols[cIdx][rIdx - 1] = sId;
                cols[cIdx][rIdx] = above;
            } else if (cols[cIdx].length > 1) {
                cols[cIdx].splice(rIdx, 1);
                cols.splice(cIdx, 0, [sId]);
            }
        } else if (direction === "down") {
            if (rIdx < cols[cIdx].length - 1) {
                const below = cols[cIdx][rIdx + 1];
                cols[cIdx][rIdx + 1] = sId;
                cols[cIdx][rIdx] = below;
            } else if (cIdx > 0) {
                cols[cIdx].splice(rIdx, 1);
                cols[cIdx - 1].push(sId);
            }
        } else if (direction === "left") {
            if (cols[cIdx].length > 1) {
                cols[cIdx].splice(rIdx, 1);
                cols.splice(cIdx, 0, [sId]);
            } else if (cIdx > 0) {
                const prev = cols[cIdx - 1];
                cols[cIdx - 1] = cols[cIdx];
                cols[cIdx] = prev;
            }
        } else if (direction === "right") {
            if (cols[cIdx].length > 1) {
                cols[cIdx].splice(rIdx, 1);
                cols.splice(cIdx + 1, 0, [sId]);
            } else if (cIdx < cols.length - 1) {
                const next = cols[cIdx + 1];
                cols[cIdx + 1] = cols[cIdx];
                cols[cIdx] = next;
            }
        }

        cols = cols.filter(c => c.length > 0);
        this.quickViewColumns = cols;
        this.quickViewOrder = cols.flat();
        try {
            localStorage.setItem("zds_quick_view_columns", JSON.stringify(this.quickViewColumns));
            localStorage.setItem("zds_quick_view_order", JSON.stringify(this.quickViewOrder));
        } catch (_) {}
        this.syncCards();
    }

    openQuickViewNodePicker(anchorBtn) {
        const existing = document.querySelector(".zds-qv-picker-dropdown");
        if (existing) {
            existing.remove();
            return;
        }

        const dropdown = document.createElement("div");
        dropdown.className = "zds-qv-picker-dropdown";
        dropdown.innerHTML = `
            <div class="zds-qv-picker-header">
                <span style="font-weight: 700; color: #f8fafc; font-size: 12px;">Pin Cards to Focus Dashboard</span>
                <button type="button" class="zds-card-btn" id="zds-qv-picker-close">✕</button>
            </div>
            <div style="padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                <input type="text" class="zds-modal-input" id="zds-qv-picker-search" placeholder="Filter graph nodes..." style="font-size: 11px; padding: 5px 8px;" autofocus />
            </div>
            <div class="zds-qv-picker-list" id="zds-qv-picker-list"></div>
        `;

        document.body.appendChild(dropdown);

        if (anchorBtn) {
            const rect = anchorBtn.getBoundingClientRect();
            dropdown.style.position = "fixed";
            dropdown.style.top = `${rect.bottom + 6}px`;
            dropdown.style.left = `${Math.max(10, Math.min(window.innerWidth - 350, rect.left))}px`;
            dropdown.style.zIndex = "100005";
        }

        const close = () => dropdown.remove();
        dropdown.querySelector("#zds-qv-picker-close").onclick = close;

        const onDocClick = (e) => {
            if (!dropdown.contains(e.target) && e.target !== anchorBtn && !anchorBtn.contains(e.target)) {
                close();
                document.removeEventListener("pointerdown", onDocClick);
            }
        };
        setTimeout(() => document.addEventListener("pointerdown", onDocClick), 50);

        const listEl = dropdown.querySelector("#zds-qv-picker-list");
        const searchInput = dropdown.querySelector("#zds-qv-picker-search");

        const allNodes = (app.graph && app.graph._nodes) ? [...app.graph._nodes] : [];

        const renderItems = (filter = "") => {
            listEl.innerHTML = "";
            const q = filter.toLowerCase();
            const filtered = allNodes.filter(n => {
                const title = (n.title || n.type || "").toLowerCase();
                const type = (n.type || "").toLowerCase();
                return title.includes(q) || type.includes(q) || String(n.id).includes(q);
            });

            if (filtered.length === 0) {
                listEl.innerHTML = `<div style="text-align: center; color: var(--zds-text-muted); padding: 16px; font-size: 11px;">No nodes match filter</div>`;
                return;
            }

            for (const node of filtered) {
                const isPinned = this.quickViewNodeIds.has(node.id);
                const item = document.createElement("div");
                item.className = `zds-qv-picker-item ${isPinned ? "is-pinned" : ""}`;
                const stageId = classifyNode(node);
                const stageObj = STAGES.find(s => s.id === stageId) || STAGES[2];

                item.innerHTML = `
                    <span class="zds-qv-picker-star">${isPinned ? "★" : "☆"}</span>
                    <span class="zds-qv-picker-icon">${stageObj.icon}</span>
                    <div class="zds-qv-picker-info">
                        <span class="zds-qv-picker-title">#${node.id}: ${escapeHtml(node.title || node.type)}</span>
                        <span class="zds-qv-picker-type">${escapeHtml(node.type)}</span>
                    </div>
                `;

                item.onclick = (e) => {
                    e.stopPropagation();
                    if (this.quickViewNodeIds.has(node.id)) {
                        this.quickViewNodeIds.delete(node.id);
                        this.quickViewOrder = this.quickViewOrder.filter(id => id !== node.id);
                    } else {
                        this.quickViewNodeIds.add(node.id);
                        if (!this.quickViewOrder.includes(node.id)) {
                            this.quickViewOrder.push(node.id);
                        }
                    }
                    try {
                        localStorage.setItem("zds_quick_view_nodes", JSON.stringify([...this.quickViewNodeIds]));
                        localStorage.setItem("zds_quick_view_order", JSON.stringify(this.quickViewOrder));
                    } catch (_) {}
                    this.updateQuickViewCount();
                    renderItems(searchInput.value);
                    this.syncCards();
                };

                listEl.appendChild(item);
            }
        };

        renderItems();
        searchInput.oninput = () => renderItems(searchInput.value);
    }

    // ── Render Individual Node Card ───────────────────────────────────────────
    renderCard(node) {
        const card = document.createElement("div");
        card.className = "zds-card";
        card.id = `zds-card-${node.id}`;
        card.dataset.nodeId = node.id;
        card.draggable = false; // Initiated strictly on header/handle mousedown so text selection & resizing never trigger card drag

        if (node.mode === 2) card.classList.add("zds-card-bypassed");
        if (node.mode === 1) card.classList.add("zds-card-muted");
        if (node.id === this.executingNodeId) card.classList.add("zds-card-executing");

        // Unified Drag & Drop Start and End
        card.addEventListener("dragstart", (e) => {
            this.draggedCardNodeId = String(node.id);
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                try {
                    e.dataTransfer.setData("text/plain", String(node.id));
                    e.dataTransfer.setData("text/zds-node-id", String(node.id));
                    e.dataTransfer.setData("text/zds-qv-node-id", String(node.id));
                } catch (_) {}
            }
            card.classList.add("zds-card-dragging");
        });

        card.addEventListener("dragend", () => {
            card.draggable = false;
            card.classList.remove("zds-card-dragging");
            setTimeout(() => {
                this.draggedCardNodeId = null;
            }, 120);
            if (this.workspace) {
                this.workspace.querySelectorAll(".zds-qv-drop-before, .zds-qv-drop-after").forEach(el => {
                    el.classList.remove("zds-qv-drop-before", "zds-qv-drop-after");
                });
            }
        });

        // Connection Tracing on Hover (when enabled and not in Quick View)
        card.addEventListener("mouseenter", () => {
            if (this.viewMode !== "quickview" && this.enableWireTracing) {
                this.highlightNodeConnections(node.id);
            }
        });
        card.addEventListener("mouseleave", () => {
            if (this.viewMode !== "quickview" && this.enableWireTracing) {
                this.clearConnectionHighlights();
            }
        });

        // Restore Saved Card Dimensions
        if (!this.collapsedCardIds.has(node.id)) {
            if (this.viewMode === "quickview") {
                const qsz = this.quickViewCardSizes && this.quickViewCardSizes[node.id];
                if (qsz) {
                    if (qsz.width) card.style.width = `${qsz.width}px`;
                    if (qsz.height) {
                        card.style.height = `${qsz.height}px`;
                        card.style.minHeight = "0px";
                    }
                } else {
                    if (this.quickViewCardWidth) {
                        card.style.width = `${this.quickViewCardWidth}px`;
                    }
                    if (this.quickViewHeightMode === "full") {
                        card.style.minHeight = "calc(100vh - 200px)";
                    } else {
                        card.style.height = "auto";
                    }
                }
            } else if (this.cardSizes[node.id]) {
                const sz = this.cardSizes[node.id];
                if (typeof sz === "number") {
                    card.style.height = `${sz}px`;
                } else if (sz && typeof sz === "object") {
                    if (sz.width) card.style.width = `${sz.width}px`;
                    if (sz.height) card.style.height = `${sz.height}px`;
                }
            }
        }

        // Observe manual resize (horizontal & vertical) to persist across sessions
        if (typeof ResizeObserver !== "undefined") {
            let resizeDebounce = null;
            const ro = new ResizeObserver(() => {
                if (card.classList.contains("zds-card-collapsed") || card.classList.contains("zds-card-resizing")) return;
                clearTimeout(resizeDebounce);
                resizeDebounce = setTimeout(() => {
                    const h = Math.round(card.offsetHeight);
                    const w = Math.round(card.offsetWidth);
                    if (this.viewMode === "quickview") {
                        if (w > 100 && h > 60) {
                            if (!this.quickViewCardSizes) this.quickViewCardSizes = {};
                            this.quickViewCardSizes[node.id] = { width: w, height: h };
                            try {
                                localStorage.setItem("zds_quick_view_card_sizes", JSON.stringify(this.quickViewCardSizes));
                            } catch (_) {}
                        }
                    } else {
                        if (h > 60) {
                            const existing = this.cardSizes[node.id] || {};
                            this.cardSizes[node.id] = { width: w > 100 ? w : existing.width, height: h };
                            try {
                                localStorage.setItem("zds_card_sizes", JSON.stringify(this.cardSizes));
                            } catch (_) {}
                        }
                    }
                }, 200);
            });
            ro.observe(card);
        }

        // Focus Dashboard Drag-and-Drop Reordering Event Handlers (2D: Stack Under/Above or Column Left/Right)
        if (this.viewMode === "quickview") {
            card.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const relX = x / rect.width;
                const relY = y / rect.height;

                card.classList.remove("zds-qv-drop-before", "zds-qv-drop-after", "zds-qv-drop-top", "zds-qv-drop-bottom");

                if (relY > 0.65) {
                    card.classList.add("zds-qv-drop-bottom");
                    card.dataset.dropAction = "bottom";
                } else if (relY < 0.35) {
                    card.classList.add("zds-qv-drop-top");
                    card.dataset.dropAction = "top";
                } else if (relX < 0.5) {
                    card.classList.add("zds-qv-drop-before");
                    card.dataset.dropAction = "left";
                } else {
                    card.classList.add("zds-qv-drop-after");
                    card.dataset.dropAction = "right";
                }
            });

            card.addEventListener("dragleave", (e) => {
                if (card.contains(e.relatedTarget)) return;
                card.classList.remove("zds-qv-drop-before", "zds-qv-drop-after", "zds-qv-drop-top", "zds-qv-drop-bottom");
            });

            card.addEventListener("drop", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const action = card.dataset.dropAction || "bottom";
                card.classList.remove("zds-qv-drop-before", "zds-qv-drop-after", "zds-qv-drop-top", "zds-qv-drop-bottom");
                let rawId = null;
                try {
                    rawId = e.dataTransfer.getData("text/zds-qv-node-id") ||
                            e.dataTransfer.getData("text/plain") ||
                            e.dataTransfer.getData("text/zds-node-id");
                } catch (_) {}
                const fromId = String(rawId || this.draggedCardNodeId || "");
                const toId = String(node.id);
                if (!fromId || fromId === toId) return;

                this.moveQuickViewCardPosition(fromId, toId, action);
            });
        }

        const conns = this.getNodeConnections(node.id);
        const hasInputs = Array.isArray(node.inputs) && node.inputs.length > 0;
        const hasOutputs = Array.isArray(node.outputs) && node.outputs.length > 0;
        const totalConns = conns.feeders.length + conns.consumers.length;
        const isTotallyDisconnected = (hasInputs || hasOutputs) && totalConns === 0;
        const isUnfed = hasInputs && conns.feeders.length === 0;

        if (isTotallyDisconnected) {
            card.classList.add("zds-card-disconnected");
        }

        const isCollapsed = this.collapsedCardIds.has(node.id);
        if (isCollapsed) {
            card.classList.add("zds-card-collapsed");
        }

        // Connection Links Drawer (collapsible details)
        const drawer = document.createElement("div");
        drawer.className = "zds-card-connections-drawer";
        drawer.style.display = "none";

        // 1. Header (Prominent Title Bar)
        const header = document.createElement("div");
        header.className = "zds-card-header";

        // Enable card.draggable strictly when dragging header or handle
        header.addEventListener("mousedown", (e) => {
            if (e.target.closest("button, input, select, textarea, .zds-title-editing, .zds-card-btn, .zds-card-corner-resizer")) {
                card.draggable = false;
                return;
            }
            card.draggable = true;
        });

        const titleRow = document.createElement("div");
        titleRow.className = "zds-card-title-row";

        const titleLeft = document.createElement("div");
        titleLeft.className = "zds-card-title-left";

        const dragHandle = document.createElement("span");
        dragHandle.className = "zds-card-drag-handle";
        dragHandle.innerHTML = "⋮⋮";
        dragHandle.title = "Drag to re-order priority / move card";
        dragHandle.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            card.draggable = true;
        });

        const idBadge = document.createElement("span");
        idBadge.className = "zds-card-id";
        idBadge.textContent = `#${node.id}`;

        const title = document.createElement("span");
        title.className = "zds-card-title";
        title.textContent = node.title || node.type;
        title.contentEditable = "false";
        title.spellcheck = false;
        title.title = `Node #${node.id} (${node.type}) — Double-click to rename`;

        let originalTitle = node.title || node.type;

        title.ondblclick = (e) => {
            e.stopPropagation();
            title.contentEditable = "true";
            title.classList.add("zds-title-editing");
            title.focus();
            try {
                const range = document.createRange();
                range.selectNodeContents(title);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (_) {}
        };

        const finishEditing = (commit = true) => {
            if (title.contentEditable !== "true") return;
            title.contentEditable = "false";
            title.classList.remove("zds-title-editing");
            if (commit) {
                const newTitle = title.textContent.trim();
                if (newTitle) {
                    node.title = newTitle;
                    originalTitle = newTitle;
                    node.setDirtyCanvas(true, true);
                } else {
                    title.textContent = originalTitle;
                }
            } else {
                title.textContent = originalTitle;
            }
        };

        title.onblur = () => finishEditing(true);

        title.onkeydown = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                finishEditing(true);
            } else if (e.key === "Escape") {
                e.preventDefault();
                finishEditing(false);
            }
        };

        titleLeft.appendChild(dragHandle);
        titleLeft.appendChild(idBadge);
        titleLeft.appendChild(title);

        const headerActions = document.createElement("div");
        headerActions.className = "zds-card-header-actions";

        // In Quick View: add Move Column Left ◀, Move Up in Column ▲, Stack Under / Move Down ▼, Move Column Right ▶, and Cycle Width ↔
        if (this.viewMode === "quickview") {
            const moveLeftBtn = document.createElement("button");
            moveLeftBtn.className = "zds-card-btn zds-card-btn-move";
            moveLeftBtn.innerHTML = "◀";
            moveLeftBtn.title = "Move Column Left (or unstack into column to the left)";
            moveLeftBtn.onclick = (e) => {
                e.stopPropagation();
                this.nudgeQuickViewCard(node.id, "left");
            };
            headerActions.appendChild(moveLeftBtn);

            const moveUpBtn = document.createElement("button");
            moveUpBtn.className = "zds-card-btn zds-card-btn-move";
            moveUpBtn.innerHTML = "▲";
            moveUpBtn.title = "Move Up in Column (or unstack into own column)";
            moveUpBtn.onclick = (e) => {
                e.stopPropagation();
                this.nudgeQuickViewCard(node.id, "up");
            };
            headerActions.appendChild(moveUpBtn);

            const moveDownBtn = document.createElement("button");
            moveDownBtn.className = "zds-card-btn zds-card-btn-move";
            moveDownBtn.innerHTML = "▼";
            moveDownBtn.title = "Stack Under card on the left / Move Down in Column";
            moveDownBtn.onclick = (e) => {
                e.stopPropagation();
                this.nudgeQuickViewCard(node.id, "down");
            };
            headerActions.appendChild(moveDownBtn);

            const moveRightBtn = document.createElement("button");
            moveRightBtn.className = "zds-card-btn zds-card-btn-move";
            moveRightBtn.innerHTML = "▶";
            moveRightBtn.title = "Move Column Right (or unstack into column to the right)";
            moveRightBtn.onclick = (e) => {
                e.stopPropagation();
                this.nudgeQuickViewCard(node.id, "right");
            };
            headerActions.appendChild(moveRightBtn);

            const widthCycleBtn = document.createElement("button");
            widthCycleBtn.className = "zds-card-btn zds-card-btn-width";
            widthCycleBtn.innerHTML = "↔";
            widthCycleBtn.title = "Step Width (380px ➔ 540px ➔ 760px ➔ 1000px)";
            widthCycleBtn.onclick = (e) => {
                e.stopPropagation();
                const curW = card.offsetWidth;
                let nextW = 540;
                if (curW < 440) nextW = 560;
                else if (curW < 640) nextW = 760;
                else if (curW < 850) nextW = 1000;
                else nextW = 380;
                card.style.width = `${nextW}px`;
                if (!this.quickViewCardSizes) this.quickViewCardSizes = {};
                this.quickViewCardSizes[node.id] = {
                    width: nextW,
                    height: card.offsetHeight
                };
                try {
                    localStorage.setItem("zds_quick_view_card_sizes", JSON.stringify(this.quickViewCardSizes));
                } catch (_) {}
            };
            headerActions.appendChild(widthCycleBtn);
        }

        // Quick View Pin / Star Button
        const isPinned = this.quickViewNodeIds.has(node.id);
        const starBtn = document.createElement("button");
        starBtn.className = `zds-card-btn zds-card-btn-star ${isPinned ? "zds-btn-active-star" : ""}`;
        starBtn.innerHTML = isPinned ? "★" : "☆";
        starBtn.title = isPinned ? "Remove from Focus Dashboard" : "Pin to Focus Dashboard";
        starBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.quickViewNodeIds.has(node.id)) {
                this.quickViewNodeIds.delete(node.id);
                this.quickViewOrder = this.quickViewOrder.filter(id => id !== node.id);
                starBtn.classList.remove("zds-btn-active-star");
                starBtn.innerHTML = "☆";
                starBtn.title = "Pin to Focus Dashboard";
            } else {
                this.quickViewNodeIds.add(node.id);
                if (!this.quickViewOrder.includes(node.id)) {
                    this.quickViewOrder.push(node.id);
                }
                starBtn.classList.add("zds-btn-active-star");
                starBtn.innerHTML = "★";
                starBtn.title = "Remove from Focus Dashboard";
            }
            try {
                localStorage.setItem("zds_quick_view_nodes", JSON.stringify([...this.quickViewNodeIds]));
                localStorage.setItem("zds_quick_view_order", JSON.stringify(this.quickViewOrder));
            } catch (_) {}
            this.updateQuickViewCount();
            if (this.viewMode === "quickview") {
                this.syncCards();
            }
        };
        headerActions.appendChild(starBtn);

        // Prompt Popout Button (for prompt/text/function/song nodes)
        const isPromptNode = (node.type || "").toLowerCase().includes("text") ||
            (node.type || "").toLowerCase().includes("prompt") ||
            (node.title || "").toLowerCase().includes("prompt") ||
            (node.type || "").toLowerCase().includes("function") ||
            (node.type || "").toLowerCase().includes("song") ||
            node.widgets?.some(w =>
                (w.name || "").toLowerCase().includes("positive") ||
                (w.name || "").toLowerCase().includes("prompt") ||
                (w.name || "").toLowerCase().includes("pop out") ||
                (w.name || "").toLowerCase().includes("popout")
            );

        if (isPromptNode) {
            const popoutBtn = document.createElement("button");
            popoutBtn.className = "zds-card-btn zds-card-btn-prompt";
            popoutBtn.innerHTML = "🗖";
            popoutBtn.title = "Pop out Full Studio Cockpit (Alt+P)";
            popoutBtn.onclick = (e) => {
                e.stopPropagation();
                this.openPromptStudio(node);
            };
            headerActions.appendChild(popoutBtn);
        }

        // Bypass button
        const bypassBtn = document.createElement("button");
        bypassBtn.className = `zds-card-btn ${node.mode === 2 ? "zds-btn-active-bypass" : ""}`;
        bypassBtn.innerHTML = "⊘";
        bypassBtn.title = "Bypass Node (Ctrl+B)";
        bypassBtn.onclick = () => {
            node.mode = node.mode === 2 ? 0 : 2;
            node.setDirtyCanvas(true, true);
            card.classList.toggle("zds-card-bypassed", node.mode === 2);
            bypassBtn.classList.toggle("zds-btn-active-bypass", node.mode === 2);
        };

        // Mute button
        const muteBtn = document.createElement("button");
        muteBtn.className = `zds-card-btn ${node.mode === 1 ? "zds-btn-active-mute" : ""}`;
        muteBtn.innerHTML = "🔇";
        muteBtn.title = "Mute Node (Ctrl+M)";
        muteBtn.onclick = () => {
            node.mode = node.mode === 1 ? 0 : 1;
            node.setDirtyCanvas(true, true);
            card.classList.toggle("zds-card-muted", node.mode === 1);
            muteBtn.classList.toggle("zds-btn-active-mute", node.mode === 1);
        };

        // Locate on Canvas
        const locateBtn = document.createElement("button");
        locateBtn.className = "zds-card-btn";
        locateBtn.innerHTML = "🎯";
        locateBtn.title = "Locate Node on Canvas Plane";
        locateBtn.onclick = () => {
            this.close();
            if (app.canvas) {
                app.canvas.centerOnNode(node);
                app.canvas.selectNode(node);
            }
        };

        // Collapse / Expand
        const collapseBtn = document.createElement("button");
        collapseBtn.className = "zds-card-btn";
        collapseBtn.innerHTML = isCollapsed ? "▸" : "▾";
        collapseBtn.title = isCollapsed ? "Expand Card Body" : "Collapse Card Body";
        collapseBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.collapsedCardIds.has(node.id)) {
                this.collapsedCardIds.delete(node.id);
                card.classList.remove("zds-card-collapsed");
                collapseBtn.innerHTML = "▾";
                collapseBtn.title = "Collapse Card Body";
            } else {
                this.collapsedCardIds.add(node.id);
                card.classList.add("zds-card-collapsed");
                collapseBtn.innerHTML = "▸";
                collapseBtn.title = "Expand Card Body";
            }
            try {
                localStorage.setItem("zds_collapsed_cards", JSON.stringify([...this.collapsedCardIds]));
            } catch (_) {}
        };

        // Delete / Remove Node button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "zds-card-btn zds-card-btn-delete";
        deleteBtn.innerHTML = "✕";
        deleteBtn.title = `Delete Node #${node.id} from Graph`;
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            const nodeTitle = node.title || node.type || `#${node.id}`;
            if (confirm(`Remove node #${node.id} ("${nodeTitle}") from the graph?`)) {
                this.quickViewNodeIds.delete(node.id);
                this.collapsedCardIds.delete(node.id);
                try {
                    localStorage.setItem("zds_quick_view_nodes", JSON.stringify([...this.quickViewNodeIds]));
                    localStorage.setItem("zds_collapsed_cards", JSON.stringify([...this.collapsedCardIds]));
                } catch (_) {}
                app.graph.remove(node);
                app.graph.setDirtyCanvas(true, true);
                this.syncCards();
            }
        };

        headerActions.appendChild(bypassBtn);
        headerActions.appendChild(muteBtn);
        headerActions.appendChild(locateBtn);
        headerActions.appendChild(collapseBtn);
        headerActions.appendChild(deleteBtn);

        titleRow.appendChild(titleLeft);
        titleRow.appendChild(headerActions);

        // 2. Meta Sub-row (Priority Step, Node Role, Disconnected Warning, Connection Pills)
        const metaRow = document.createElement("div");
        metaRow.className = "zds-card-meta-row";

        // Execution Priority Step Badge
        const stepBadge = document.createElement("span");
        stepBadge.className = "zds-card-step-badge";
        stepBadge.textContent = `▶ Step ${node._zdsRunStep || 1}`;
        stepBadge.title = `Execution Run Priority #${node._zdsRunStep || 1}`;

        const roleTag = document.createElement("span");
        roleTag.className = "zds-card-role";
        roleTag.textContent = getNodeRoleDescription(node);

        metaRow.appendChild(stepBadge);
        metaRow.appendChild(roleTag);

        // Disconnected warning badge
        if (isTotallyDisconnected) {
            const discBadge = document.createElement("span");
            discBadge.className = "zds-badge-disconnected";
            discBadge.textContent = "⚠️ DISCONNECTED";
            discBadge.title = "This node has 0 connections in the graph (isolated)";
            metaRow.appendChild(discBadge);
        } else if (isUnfed) {
            const unfedBadge = document.createElement("span");
            unfedBadge.className = "zds-badge-unfed";
            unfedBadge.textContent = "⚠️ UNFED";
            unfedBadge.title = "This node has inputs but no feeder nodes connected";
            metaRow.appendChild(unfedBadge);
        }

        // Connection Summary Pill (Click to toggle Link Drawer)
        const linksSummary = document.createElement("span");
        linksSummary.className = "zds-card-links-summary";
        linksSummary.title = `Connections: ${conns.feeders.length} input feeder(s), ${conns.consumers.length} output consumer(s). Click to toggle links drawer.`;
        linksSummary.innerHTML = `<span class="zds-conn-in-count">◀ ${conns.feeders.length}</span> • <span class="zds-conn-out-count">${conns.consumers.length} ▶</span>`;
        linksSummary.onclick = (e) => {
            e.stopPropagation();
            drawer.style.display = drawer.style.display === "none" ? "flex" : "none";
        };
        metaRow.appendChild(linksSummary);

        header.appendChild(titleRow);
        header.appendChild(metaRow);
        card.appendChild(header);

        // 3. Always-Visible Connection Lineage Bar
        const lineageBar = document.createElement("div");
        lineageBar.className = "zds-card-lineage-bar";

        // Input Lineage Row
        const inLineageRow = document.createElement("div");
        inLineageRow.className = "zds-lineage-row";
        inLineageRow.innerHTML = `<span class="zds-lineage-label">IN ◀</span>`;
        const inChips = document.createElement("div");
        inChips.className = "zds-lineage-chips";

        if (conns.feeders.length > 0) {
            conns.feeders.forEach(fn => {
                const chip = document.createElement("span");
                chip.className = "zds-lineage-chip zds-chip-in";
                const fnTitle = fn.title || fn.type || `#${fn.id}`;
                const shortTitle = fnTitle.length > 16 ? fnTitle.substring(0, 14) + "..." : fnTitle;
                chip.textContent = `#${fn.id} ${shortTitle}`;
                chip.title = `Feeds into this node from #${fn.id} (${fnTitle}). Click to scroll to card.`;
                chip.onclick = (e) => {
                    e.stopPropagation();
                    this.scrollToCard(fn.id);
                };
                inChips.appendChild(chip);
            });
        } else if (hasInputs) {
            inChips.innerHTML = `<span class="zds-lineage-empty zds-lineage-empty-warn">No inputs wired</span>`;
        } else {
            inChips.innerHTML = `<span class="zds-lineage-empty">Source / Loader</span>`;
        }
        inLineageRow.appendChild(inChips);
        lineageBar.appendChild(inLineageRow);

        // Output Lineage Row
        const outLineageRow = document.createElement("div");
        outLineageRow.className = "zds-lineage-row";
        outLineageRow.innerHTML = `<span class="zds-lineage-label">▶ OUT</span>`;
        const outChips = document.createElement("div");
        outChips.className = "zds-lineage-chips";

        if (conns.consumers.length > 0) {
            conns.consumers.forEach(cn => {
                const chip = document.createElement("span");
                chip.className = "zds-lineage-chip zds-chip-out";
                const cnTitle = cn.title || cn.type || `#${cn.id}`;
                const shortTitle = cnTitle.length > 16 ? cnTitle.substring(0, 14) + "..." : cnTitle;
                chip.textContent = `#${cn.id} ${shortTitle}`;
                chip.title = `Feeds out to #${cn.id} (${cnTitle}). Click to scroll to card.`;
                chip.onclick = (e) => {
                    e.stopPropagation();
                    this.scrollToCard(cn.id);
                };
                outChips.appendChild(chip);
            });
        } else if (hasOutputs) {
            outChips.innerHTML = `<span class="zds-lineage-empty">No outputs wired</span>`;
        } else {
            outChips.innerHTML = `<span class="zds-lineage-empty">Terminal / Output</span>`;
        }
        outLineageRow.appendChild(outChips);
        lineageBar.appendChild(outLineageRow);

        card.appendChild(lineageBar);

        if (conns.feeders.length > 0) {
            const inRow = document.createElement("div");
            inRow.className = "zds-conn-row";
            inRow.innerHTML = `<span class="zds-conn-label">In from:</span>`;
            conns.feeders.forEach(fn => {
                const chip = document.createElement("span");
                chip.className = "zds-conn-node-chip zds-chip-in";
                const t = fn.title || fn.type || "";
                chip.innerHTML = `◀ #${fn.id} ${t.length > 18 ? t.substring(0, 16) + '...' : t}`;
                chip.title = `Feeds into this card. Click to scroll to #${fn.id} (${t})`;
                chip.onclick = (e) => {
                    e.stopPropagation();
                    this.scrollToCard(fn.id);
                };
                inRow.appendChild(chip);
            });
            drawer.appendChild(inRow);
        }

        if (conns.consumers.length > 0) {
            const outRow = document.createElement("div");
            outRow.className = "zds-conn-row";
            outRow.innerHTML = `<span class="zds-conn-label">Out to:</span>`;
            conns.consumers.forEach(cn => {
                const chip = document.createElement("span");
                chip.className = "zds-conn-node-chip zds-chip-out";
                const t = cn.title || cn.type || "";
                chip.innerHTML = `▶ #${cn.id} ${t.length > 18 ? t.substring(0, 16) + '...' : t}`;
                chip.title = `Receives from this card. Click to scroll to #${cn.id} (${t})`;
                chip.onclick = (e) => {
                    e.stopPropagation();
                    this.scrollToCard(cn.id);
                };
                outRow.appendChild(chip);
            });
            drawer.appendChild(outRow);
        }
        card.appendChild(drawer);

        // 2. Port Chips Section (Clean, non-cluttered pills)
        const portsSection = this.renderPortsSection(node);
        if (portsSection) {
            card.appendChild(portsSection);
        }

        // 3. Live Sampler Progress Bar (if sampler)
        if ((node.type || "").toLowerCase().includes("sampler")) {
            const prog = document.createElement("div");
            prog.className = "zds-progress-container";
            prog.id = `zds-progress-${node.id}`;
            prog.style.display = "none";
            prog.innerHTML = `
                <div class="zds-progress-bar-bg">
                    <div class="zds-progress-bar-fill" id="zds-progress-fill-${node.id}"></div>
                </div>
                <div class="zds-progress-text" id="zds-progress-text-${node.id}">Step 0/0</div>
            `;
            card.appendChild(prog);
        }

        // 4. Interactive Widgets
        const widgetsBody = document.createElement("div");
        widgetsBody.className = "zds-widgets-body";

        const nodeTypeLower = (node.type || "").toLowerCase();
        const nodeTitleLower = (node.title || "").toLowerCase();
        const isTextStudio = nodeTypeLower.includes("texteditor") ||
                             nodeTypeLower.includes("zombiehaustext") ||
                             nodeTitleLower.includes("text studio") ||
                             (node.widgets?.some(w => w.name === "positive") && node.widgets?.some(w => w.name === "negative"));

        if (isTextStudio) {
            this.renderTextStudioWidgets(node, widgetsBody);
        } else if (node.widgets && node.widgets.length > 0) {
            let currentToolbar = null;
            for (const widget of node.widgets) {
                try {
                    const isBtn = widget.type === "button" || (typeof widget.callback === "function" && widget.value === undefined);
                    if (isBtn) {
                        if (!currentToolbar) {
                            currentToolbar = document.createElement("div");
                            currentToolbar.className = "zds-studio-toolbar";
                            widgetsBody.appendChild(currentToolbar);
                        }
                        const btn = document.createElement("button");
                        btn.type = "button";
                        btn.className = "zds-studio-btn";
                        btn.textContent = widget.name || "Action";
                        btn.title = widget.name || "";
                        btn.onclick = () => {
                            if (widget.callback) widget.callback(widget, app.canvas, node);
                        };
                        currentToolbar.appendChild(btn);
                    } else {
                        currentToolbar = null;
                        const wRow = this.renderWidgetControl(node, widget);
                        if (wRow) widgetsBody.appendChild(wRow);
                    }
                } catch (wErr) {
                    console.warn(`[Deck Studio] Skipping widget "${widget?.name}" on #${node.id}:`, wErr);
                }
            }
        } else {
            const noW = document.createElement("div");
            noW.style.cssText = "font-size: 11px; color: var(--zds-text-muted); text-align: center; padding: 4px;";
            noW.textContent = "No direct settings";
            widgetsBody.appendChild(noW);
        }

        card.appendChild(widgetsBody);

        // 5. Image Preview Output (for Save/Preview/Detailer/KSampler nodes)
        let imgUrl = this.lastExecutedImages[node.id];
        if (!imgUrl && node.imgs && node.imgs.length > 0) {
            const imgObj = node.imgs[node.imageIndex || 0] || node.imgs[0];
            if (imgObj && imgObj.src) imgUrl = imgObj.src;
        }
        if (!imgUrl && app?.nodePreviewImages && app.nodePreviewImages[node.id]?.length > 0) {
            imgUrl = app.nodePreviewImages[node.id][0];
        }
        if (imgUrl) {
            const preview = document.createElement("div");
            preview.className = "zds-card-preview";
            preview.innerHTML = `<img src="${imgUrl}" class="zds-preview-img" alt="Result" />`;
            const prog = card.querySelector(".zds-progress-container");
            if (prog) {
                prog.after(preview);
            } else {
                card.appendChild(preview);
            }
        }

        // 6. Tactile 2D Corner Resizer (Zero Limitations)
        const cornerResizer = document.createElement("div");
        cornerResizer.className = "zds-card-corner-resizer";
        cornerResizer.title = "Drag to resize card width and height freely (no limits)";
        cornerResizer.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

        cornerResizer.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            card.draggable = false;
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = card.offsetWidth;
            const startH = card.offsetHeight;
            try { cornerResizer.setPointerCapture(e.pointerId); } catch (_) {}
            card.classList.add("zds-card-resizing");

            const onPointerMove = (me) => {
                const dx = me.clientX - startX;
                const dy = me.clientY - startY;
                const newW = Math.max(220, Math.round(startW + dx));
                const newH = Math.max(70, Math.round(startH + dy));
                card.style.width = `${newW}px`;
                card.style.height = `${newH}px`;
                card.style.minHeight = "0px";
            };

            const onPointerUp = (ue) => {
                try { cornerResizer.releasePointerCapture(ue.pointerId); } catch (_) {}
                card.classList.remove("zds-card-resizing");
                window.removeEventListener("pointermove", onPointerMove);
                window.removeEventListener("pointerup", onPointerUp);

                const finalW = card.offsetWidth;
                const finalH = card.offsetHeight;
                if (this.viewMode === "quickview") {
                    if (!this.quickViewCardSizes) this.quickViewCardSizes = {};
                    this.quickViewCardSizes[node.id] = { width: finalW, height: finalH };
                    try {
                        localStorage.setItem("zds_quick_view_card_sizes", JSON.stringify(this.quickViewCardSizes));
                    } catch (_) {}
                } else {
                    if (!this.cardSizes) this.cardSizes = {};
                    this.cardSizes[node.id] = { width: finalW, height: finalH };
                    try {
                        localStorage.setItem("zds_card_sizes", JSON.stringify(this.cardSizes));
                    } catch (_) {}
                }
            };

            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);
        });

        card.appendChild(cornerResizer);

        return card;
    }

    // ── Node Connection Intelligence & Wire Tracing ───────────────────────────
    getNodeConnections(nodeId) {
        const feeders = [];
        const consumers = [];
        if (!app.graph || !app.graph.links) return { feeders, consumers };

        const node = app.graph.getNodeById(nodeId);
        if (!node) return { feeders, consumers };

        const seenFeeders = new Set();
        const seenConsumers = new Set();

        // 1. Upstream feeders (into node.inputs)
        if (node.inputs) {
            for (const input of node.inputs) {
                if (input.link != null && app.graph.links[input.link]) {
                    const link = app.graph.links[input.link];
                    const originNode = app.graph.getNodeById(link.origin_id);
                    if (originNode && !seenFeeders.has(originNode.id)) {
                        seenFeeders.add(originNode.id);
                        feeders.push(originNode);
                    }
                }
            }
        }

        // 2. Downstream consumers (out of node.outputs)
        if (node.outputs) {
            node.outputs.forEach((output, slotIdx) => {
                if (typeof node.getOutputNodes === "function") {
                    try {
                        const targetNodes = node.getOutputNodes(slotIdx);
                        if (Array.isArray(targetNodes)) {
                            targetNodes.forEach(tn => {
                                if (tn && !seenConsumers.has(tn.id)) {
                                    seenConsumers.add(tn.id);
                                    consumers.push(tn);
                                }
                            });
                            return;
                        }
                    } catch (_) {}
                }
                const links = output.links || [];
                if (Array.isArray(links)) {
                    for (const linkId of links) {
                        const link = app.graph.links ? app.graph.links[linkId] : null;
                        if (link) {
                            const targetNode = app.graph.getNodeById(link.target_id);
                            if (targetNode && !seenConsumers.has(targetNode.id)) {
                                seenConsumers.add(targetNode.id);
                                consumers.push(targetNode);
                            }
                        }
                    }
                }
            });
        }

        return { feeders, consumers };
    }

    highlightNodeConnections(nodeId) {
        if (!this.enableWireTracing || !app.graph) return;
        const conns = this.getNodeConnections(nodeId);
        const feederIds = new Set(conns.feeders.map(n => n.id));
        const consumerIds = new Set(conns.consumers.map(n => n.id));

        const allCards = this.overlay.querySelectorAll(".zds-card");
        allCards.forEach(card => {
            const nid = parseInt(card.dataset.nodeId, 10);
            if (nid === nodeId) {
                card.classList.add("zds-card-focused");
                card.classList.remove("zds-card-feeder", "zds-card-consumer", "zds-card-dimmed");
            } else if (feederIds.has(nid)) {
                card.classList.add("zds-card-feeder");
                card.classList.remove("zds-card-focused", "zds-card-consumer", "zds-card-dimmed");
            } else if (consumerIds.has(nid)) {
                card.classList.add("zds-card-consumer");
                card.classList.remove("zds-card-focused", "zds-card-feeder", "zds-card-dimmed");
            } else {
                card.classList.remove("zds-card-focused", "zds-card-feeder", "zds-card-consumer", "zds-card-dimmed");
            }
        });

        this.drawConnectionWires(nodeId, conns);
    }

    clearConnectionHighlights() {
        const allCards = this.overlay.querySelectorAll(".zds-card");
        allCards.forEach(card => {
            card.classList.remove("zds-card-focused", "zds-card-feeder", "zds-card-consumer", "zds-card-dimmed");
        });
        if (this.svgOverlay) {
            this.svgOverlay.innerHTML = "";
        }
    }

    drawConnectionWires(activeNodeId, conns) {
        if (!this.svgOverlay || !this.workspace) return;
        this.svgOverlay.innerHTML = "";

        const activeCard = this.overlay.querySelector(`#zds-card-${activeNodeId}`);
        if (!activeCard) return;

        const wsRect = this.workspace.getBoundingClientRect();
        this.svgOverlay.setAttribute("width", `${this.workspace.scrollWidth}`);
        this.svgOverlay.setAttribute("height", `${this.workspace.scrollHeight}`);
        this.svgOverlay.style.width = `${this.workspace.scrollWidth}px`;
        this.svgOverlay.style.height = `${this.workspace.scrollHeight}px`;

        const scrollLeft = this.workspace.scrollLeft;
        const scrollTop = this.workspace.scrollTop;

        const getCardAnchor = (cardEl, side = "right") => {
            const r = cardEl.getBoundingClientRect();
            const x = (side === "right" ? r.right : r.left) - wsRect.left + scrollLeft;
            const y = r.top + r.height / 2 - wsRect.top + scrollTop;
            return { x, y };
        };

        const activeLeft = getCardAnchor(activeCard, "left");
        const activeRight = getCardAnchor(activeCard, "right");

        // Feeders -> Active (Cyan lines)
        conns.feeders.forEach(fn => {
            const fCard = this.overlay.querySelector(`#zds-card-${fn.id}`);
            if (!fCard) return;
            const fRight = getCardAnchor(fCard, "right");

            const p1 = fRight;
            const p2 = activeLeft;
            const dx = Math.max(40, Math.abs(p2.x - p1.x) * 0.5);
            const pathData = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("class", "zds-wire-path");
            path.setAttribute("stroke", "#06b6d4");
            path.setAttribute("stroke-width", "3");
            path.setAttribute("opacity", "0.85");
            this.svgOverlay.appendChild(path);
        });

        // Active -> Consumers (Pink/Magenta lines)
        conns.consumers.forEach(cn => {
            const cCard = this.overlay.querySelector(`#zds-card-${cn.id}`);
            if (!cCard) return;
            const cLeft = getCardAnchor(cCard, "left");

            const p1 = activeRight;
            const p2 = cLeft;
            const dx = Math.max(40, Math.abs(p2.x - p1.x) * 0.5);
            const pathData = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("class", "zds-wire-path");
            path.setAttribute("stroke", "#ec4899");
            path.setAttribute("stroke-width", "3");
            path.setAttribute("opacity", "0.85");
            this.svgOverlay.appendChild(path);
        });
    }

    scrollToCard(targetNodeId) {
        const card = this.overlay.querySelector(`#zds-card-${targetNodeId}`);
        if (!card) return;
        card.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        card.classList.add("zds-card-focused");
        setTimeout(() => {
            card.classList.remove("zds-card-focused");
        }, 1800);
    }

    // ── Render Port Chips & Smart Wire Connections ────────────────────────────
    renderPortsSection(node) {
        const hasInputs = node.inputs && node.inputs.length > 0;
        const hasOutputs = node.outputs && node.outputs.length > 0;
        if (!hasInputs && !hasOutputs) return null;

        const sec = document.createElement("div");
        sec.className = "zds-ports-section";

        const row = document.createElement("div");
        row.className = "zds-ports-row";

        // Inputs (compact, clean pills with origin badges)
        const inGroup = document.createElement("div");
        inGroup.className = "zds-inputs-group";

        if (hasInputs) {
            node.inputs.forEach((input, slotIdx) => {
                const chip = document.createElement("span");
                const isConnected = input.link != null;
                const typeClass = getTypeClass(input.type);
                chip.className = `zds-port-chip ${typeClass} ${isConnected ? "zds-port-connected" : ""}`;
                chip.dataset.nodeId = node.id;
                chip.dataset.slotIndex = slotIdx;
                chip.dataset.portType = input.type || "*";
                chip.dataset.direction = "input";

                let portLabel = input.name;
                let originBadge = "";
                let tooltip = `${input.name} (${input.type || "*"}) — Click to connect`;

                if (isConnected && app.graph.links && app.graph.links[input.link]) {
                    const link = app.graph.links[input.link];
                    const originNode = app.graph.getNodeById(link.origin_id);
                    const originTitle = originNode ? (originNode.title || originNode.type) : `#${link.origin_id}`;
                    originBadge = `<span class="zds-port-origin-badge">#${link.origin_id}</span>`;
                    tooltip = `${input.name} ← Receives ${input.type || ""} from "${originTitle}" (#${link.origin_id}). Click to disconnect.`;
                }

                chip.innerHTML = `<span class="zds-port-dot"></span><span class="zds-port-name">${portLabel}</span>${originBadge}`;
                chip.title = tooltip;

                chip.onclick = (e) => {
                    e.stopPropagation();
                    if (this.activeConnectingSource) {
                        this.handleCompleteConnection(node, slotIdx, input);
                    } else if (isConnected) {
                        if (confirm(`Disconnect ${input.name} on ${node.title || node.type}?`)) {
                            node.disconnectInput(slotIdx);
                            node.setDirtyCanvas(true, true);
                            this.syncCards();
                        }
                    }
                };

                inGroup.appendChild(chip);
            });
        }

        // Outputs
        const outGroup = document.createElement("div");
        outGroup.className = "zds-outputs-group";

        if (hasOutputs) {
            node.outputs.forEach((output, slotIdx) => {
                const chip = document.createElement("span");
                const isConnected = typeof node.isOutputConnected === "function" ? node.isOutputConnected(slotIdx) : (output.links && output.links.length > 0);
                const typeClass = getTypeClass(output.type);
                chip.className = `zds-port-chip ${typeClass} ${isConnected ? "zds-port-connected" : ""}`;
                chip.dataset.nodeId = node.id;
                chip.dataset.slotIndex = slotIdx;
                chip.dataset.portType = output.type || "*";
                chip.dataset.direction = "output";

                let portLabel = output.name;
                let countBadge = "";
                let tooltip = `${output.name} (${output.type || "*"}) — Click to wire`;

                if (isConnected) {
                    countBadge = `<span class="zds-port-origin-badge">${output.links.length}</span>`;
                    tooltip = `${output.name} → Feeds ${output.links.length} downstream input(s). Click to wire another connection.`;
                }

                chip.innerHTML = `<span class="zds-port-dot"></span><span class="zds-port-name">${portLabel}</span>${countBadge}`;
                chip.title = tooltip;

                chip.onclick = (e) => {
                    e.stopPropagation();
                    if (this.activeConnectingSource && this.activeConnectingSource.nodeId === node.id && this.activeConnectingSource.slotIndex === slotIdx) {
                        this.cancelConnectingMode();
                    } else {
                        this.startConnectingMode(node, slotIdx, output);
                    }
                };

                outGroup.appendChild(chip);
            });
        }

        row.appendChild(inGroup);
        row.appendChild(outGroup);
        sec.appendChild(row);
        return sec;
    }

    // ── Dedicated Prompt Studio Popout Modal ──────────────────────────────────
    openPromptStudio(targetNode = null) {
        let node = targetNode;

        const tryOpenNativePopout = (n) => {
            if (!n) return false;
            window._popoutZIndex = Math.max(window._popoutZIndex || 10001, 100050);

            if (typeof n.showPopOutStudio === "function") {
                n.showPopOutStudio();
                if (n._popoutStudioEl && document.body.contains(n._popoutStudioEl)) {
                    n._popoutStudioEl.style.zIndex = String(++window._popoutZIndex);
                    return true;
                }
            }
            if (typeof window.zombiehausShowPopOutStudio === "function" && n.type === "ZombiehausTextEditor") {
                window.zombiehausShowPopOutStudio(n);
                if (n._popoutStudioEl && document.body.contains(n._popoutStudioEl)) {
                    n._popoutStudioEl.style.zIndex = String(++window._popoutZIndex);
                    return true;
                }
            }
            const popoutBtn = n.widgets?.find(w => {
                const wn = (w.name || "").toLowerCase();
                return wn.includes("pop out") || wn.includes("popout");
            });
            if (popoutBtn && typeof popoutBtn.callback === "function") {
                popoutBtn.callback();
                if (n._popoutStudioEl && document.body.contains(n._popoutStudioEl)) {
                    n._popoutStudioEl.style.zIndex = String(++window._popoutZIndex);
                    return true;
                }
            }
            return false;
        };

        // 1. If target node has native popout (e.g. ZombiehausTextEditor, FunctionEditor, SongWriter)
        if (node && tryOpenNativePopout(node)) {
            return;
        }

        // 2. If no target specified or target lacks popout, find text/function/song editor in graph
        if (app.graph?._nodes) {
            const textEditorNode = app.graph._nodes.find(n => n.type === "ZombiehausTextEditor");
            if (textEditorNode && tryOpenNativePopout(textEditorNode)) {
                return;
            }

            const otherEditorNode = app.graph._nodes.find(n =>
                n.type === "ZombiehausFunctionEditor" ||
                n.type === "ZombiehausSongWriter" ||
                n.widgets?.some(w => (w.name || "").toLowerCase().includes("pop out") || (w.name || "").toLowerCase().includes("popout"))
            );
            if (otherEditorNode && tryOpenNativePopout(otherEditorNode)) {
                return;
            }
        }

        // 3. Fallback for generic CLIP nodes without ZombiehausTextEditor in graph
        if (!node && app.graph?._nodes) {
            node = app.graph._nodes.find(n =>
                (n.type || "").toLowerCase().includes("texteditor") ||
                n.widgets?.some(w => w.name.toLowerCase().includes("positive"))
            ) || app.graph._nodes.find(n =>
                (n.type || "").toLowerCase().includes("prompt") ||
                (n.type || "").toLowerCase().includes("clip")
            );
        }

        if (!node) {
            alert("No prompt or text nodes found in the current workflow.");
            return;
        }

        const existing = document.querySelector(".zds-prompt-modal-overlay");
        if (existing) existing.remove();

        const posWidget = node.widgets?.find(w => w.name.toLowerCase().includes("positive") || w.name.toLowerCase().includes("text")) || node.widgets?.[0];
        const negWidget = node.widgets?.find(w => w.name.toLowerCase().includes("negative"));

        const overlay = document.createElement("div");
        overlay.className = "zds-prompt-modal-overlay";

        const modal = document.createElement("div");
        modal.className = "zds-prompt-modal";

        modal.innerHTML = `
            <div class="zds-prompt-modal-header">
                <div class="zds-prompt-modal-title">
                    <span style="font-size: 20px;">🎨</span>
                    <div>
                        <h2>Zombiehaus Prompt Studio</h2>
                        <div style="font-size: 11px; color: var(--zds-text-secondary); margin-top: 2px;">
                            Active Node #${node.id} (${node.title || node.type}) • Real-time Canvas Sync
                        </div>
                    </div>
                </div>
                <button type="button" class="zds-card-btn" id="zds-prompt-modal-close" style="font-size: 16px;">✕</button>
            </div>

            <div class="zds-prompt-modal-body">
                <div class="zds-prompt-pane">
                    <div class="zds-prompt-pane-header">
                        <span style="color: #c084fc;">Positive Conditioning Prompt</span>
                        <span id="zds-pos-count" style="font-family: var(--zds-font-mono); font-size: 11px; color: var(--zds-text-muted);">0 words</span>
                    </div>
                    <textarea class="zds-prompt-textarea" id="zds-pos-textarea" placeholder="Describe subject, optical textures, lighting, angle, and camera focal length...">${posWidget?.value || ""}</textarea>
                </div>

                ${negWidget ? `
                <div class="zds-prompt-pane" style="flex: 0 0 160px;">
                    <div class="zds-prompt-pane-header">
                        <span style="color: #f87171;">Negative Conditioning Prompt</span>
                        <span id="zds-neg-count" style="font-family: var(--zds-font-mono); font-size: 11px; color: var(--zds-text-muted);">0 words</span>
                    </div>
                    <textarea class="zds-prompt-textarea" id="zds-neg-textarea" style="min-height: 90px;" placeholder="Undesired artifacts, bad anatomy, blur, oversaturation...">${negWidget.value || ""}</textarea>
                </div>
                ` : ""}

                <div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--zds-text-secondary); text-transform: uppercase; margin-bottom: 6px;">
                        Quick Cinematic & Optical Tag Injector
                    </div>
                    <div class="zds-prompt-tag-bar" id="zds-tag-chips-container"></div>
                </div>
            </div>

            <div class="zds-prompt-modal-footer">
                <div style="font-size: 11px; color: #10b981; display: flex; align-items: center; gap: 6px;">
                    <span>🟢</span> Live Canvas Sync Active (changes reflect instantly on node #${node.id})
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="button" class="zds-btn" id="zds-prompt-clear-btn">Clear</button>
                    <button type="button" class="zds-btn zds-btn-primary" id="zds-prompt-apply-btn">💾 Apply & Close</button>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const posArea = modal.querySelector("#zds-pos-textarea");
        const negArea = modal.querySelector("#zds-neg-textarea");
        const posCount = modal.querySelector("#zds-pos-count");
        const negCount = modal.querySelector("#zds-neg-count");

        const updateCounts = () => {
            if (posArea && posCount) {
                const words = (posArea.value.trim().match(/\S+/g) || []).length;
                posCount.textContent = `${words} words • ${posArea.value.length} chars`;
            }
            if (negArea && negCount) {
                const words = (negArea.value.trim().match(/\S+/g) || []).length;
                negCount.textContent = `${words} words • ${negArea.value.length} chars`;
            }
        };
        updateCounts();

        // Two-Way Sync on input
        if (posArea && posWidget) {
            posArea.oninput = () => {
                posWidget.value = posArea.value;
                if (posWidget.callback) posWidget.callback(posArea.value, app.canvas, node);
                node.setDirtyCanvas(true, true);
                updateCounts();
                const cardTa = document.querySelector(`#zds-card-${node.id} textarea`);
                if (cardTa) cardTa.value = posArea.value;
            };
        }

        if (negArea && negWidget) {
            negArea.oninput = () => {
                negWidget.value = negArea.value;
                if (negWidget.callback) negWidget.callback(negArea.value, app.canvas, node);
                node.setDirtyCanvas(true, true);
                updateCounts();
            };
        }

        // Tag Injector Chips
        const tagContainer = modal.querySelector("#zds-tag-chips-container");
        const sampleTags = [
            "35mm photograph", "85mm f/1.4 portrait", "cinematic softbox lighting",
            "warm rim light", "photorealistic skin pores", "sharp optical focus",
            "volumetric backlight", "8k uhd masterpiece", "subtle film grain",
            "shallow depth of field", "natural daylight", "dynamic pose"
        ];

        sampleTags.forEach(tag => {
            const chip = document.createElement("span");
            chip.className = "zds-tag-chip";
            chip.textContent = `+ ${tag}`;
            chip.onclick = () => {
                if (!posArea) return;
                const val = posArea.value.trim();
                posArea.value = val ? `${val}, ${tag}` : tag;
                posArea.dispatchEvent(new Event("input"));
                posArea.focus();
            };
            tagContainer.appendChild(chip);
        });

        // Close handlers
        modal.querySelector("#zds-prompt-modal-close").onclick = () => overlay.remove();
        modal.querySelector("#zds-prompt-apply-btn").onclick = () => overlay.remove();
        modal.querySelector("#zds-prompt-clear-btn").onclick = () => {
            if (posArea && confirm("Clear positive prompt?")) {
                posArea.value = "";
                posArea.dispatchEvent(new Event("input"));
            }
        };
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };
    }

    // ── Smart Wire Connection Handling ────────────────────────────────────────
    startConnectingMode(node, slotIndex, output) {
        this.activeConnectingSource = {
            nodeId: node.id,
            slotIndex,
            type: output.type
        };

        this.overlay.classList.add("zds-connecting-mode");

        // Highlight matching chips
        const inputChips = this.overlay.querySelectorAll('.zds-port-chip[data-direction="input"]');
        inputChips.forEach((chip) => {
            const targetType = chip.dataset.portType;
            const targetNodeId = parseInt(chip.dataset.nodeId, 10);
            const isMatch = (targetType === "*" || output.type === "*" || targetType === output.type) && targetNodeId !== node.id;
            chip.classList.toggle("zds-port-target-compatible", isMatch);
        });

        // Mark active source chip
        const sourceChip = this.overlay.querySelector(`.zds-port-chip[data-node-id="${node.id}"][data-slot-index="${slotIndex}"][data-direction="output"]`);
        if (sourceChip) sourceChip.classList.add("zds-port-active-source");
    }

    cancelConnectingMode() {
        this.activeConnectingSource = null;
        this.overlay.classList.remove("zds-connecting-mode");
        const chips = this.overlay.querySelectorAll(".zds-port-chip");
        chips.forEach((c) => {
            c.classList.remove("zds-port-target-compatible", "zds-port-active-source");
        });
    }

    handleCompleteConnection(targetNode, targetSlotIdx, input) {
        if (!this.activeConnectingSource) return;
        const { nodeId: originId, slotIndex: originSlot, type: originType } = this.activeConnectingSource;

        const originNode = app.graph.getNodeById(originId);
        if (originNode) {
            originNode.connect(originSlot, targetNode, targetSlotIdx);
            targetNode.setDirtyCanvas(true, true);
        }

        this.cancelConnectingMode();
        this.syncCards();
    }

    // ── Syntax Highlighter Attachment Helper ──────────────────────────────────
    attachSyntaxHighlighterToTextarea(ta, container, currentTheme = null) {
        if (!ta || ta._hasZdsHighlighter) return;
        ta._hasZdsHighlighter = true;

        const wrapper = document.createElement("div");
        wrapper.className = "zds-syntax-wrapper";

        const backdrop = document.createElement("div");
        backdrop.className = "zds-syntax-backdrop";

        if (ta.parentNode) {
            ta.parentNode.insertBefore(wrapper, ta);
        } else if (container) {
            container.appendChild(wrapper);
        }
        wrapper.appendChild(backdrop);
        wrapper.appendChild(ta);

        ta.classList.add("zds-syntax-ta");

        const updateHighlight = () => {
            backdrop.innerHTML = highlightPromptSyntax(ta.value, currentTheme);
            backdrop.scrollTop = ta.scrollTop;
            backdrop.scrollLeft = ta.scrollLeft;
        };

        ta.addEventListener("input", updateHighlight);
        ta.addEventListener("scroll", () => {
            backdrop.scrollTop = ta.scrollTop;
            backdrop.scrollLeft = ta.scrollLeft;
        });

        updateHighlight();
    }

    // ── Dedicated Autocomplete Engine for Deck Studio Cards ───────────────────
    attachAutocompleteToTextarea(ta, node) {
        if (!ta || ta._hasZdsAutocomplete) return;
        ta._hasZdsAutocomplete = true;

        if (typeof window.zombiehausAttachAutocomplete === "function") {
            try {
                window.zombiehausAttachAutocomplete(ta, node);
                return;
            } catch (_) {}
        }

        // Shared module caches
        if (!window._zdsAcCaches) {
            window._zdsAcCaches = {
                wildcards: null,
                loras: null,
                wildcardKeys: new Map()
            };
        }
        const caches = window._zdsAcCaches;

        const getWildcards = async () => {
            if (caches.wildcards) return caches.wildcards;
            try {
                const r = await fetch("/zombiehaus/wildcards/list");
                const data = await r.json();
                if (data && data.success && Array.isArray(data.data)) {
                    caches.wildcards = data.data;
                    return data.data;
                }
            } catch (_) {}
            return [];
        };

        const getLoras = async () => {
            if (caches.loras) return caches.loras;
            try {
                const r = await fetch("/zombiehaus/get_loras");
                const data = await r.json();
                if (data && data.success && Array.isArray(data.data)) {
                    caches.loras = data.data;
                    return data.data;
                }
            } catch (_) {}
            return [];
        };

        const parseWildcardData = (content) => {
            const itemKeys = new Set();
            const propsByItem = new Map();
            const allProps = new Set();
            if (!content || typeof content !== "string") {
                return { items: [], propsByItem, allProps: [] };
            }

            const lines = content.split(/\r?\n/);
            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line || line.startsWith("#") || line.startsWith("//")) continue;

                const colonMatch = line.match(/^([a-zA-Z0-9_-]+)\s*[:=]\s*(.*)$/);
                if (colonMatch) {
                    const itemKey = colonMatch[1].trim();
                    const val = colonMatch[2].trim();
                    itemKeys.add(itemKey);

                    const propMatches = val.matchAll(/(?:^|[{,\s])([a-zA-Z0-9_]+)\s*:/g);
                    const pSet = propsByItem.get(itemKey.toLowerCase()) || new Set();
                    for (const pm of propMatches) {
                        const pk = pm[1].trim();
                        if (pk) {
                            pSet.add(pk);
                            allProps.add(pk);
                        }
                    }
                    if (pSet.size > 0) {
                        propsByItem.set(itemKey.toLowerCase(), pSet);
                    }
                } else {
                    const wordMatch = line.match(/^([a-zA-Z0-9_-]+)/);
                    if (wordMatch) {
                        itemKeys.add(wordMatch[1]);
                    }
                }
            }

            return {
                items: Array.from(itemKeys),
                propsByItem,
                allProps: Array.from(allProps)
            };
        };

        const getWildcardData = async (filename) => {
            const clean = (filename || "").replace(/^__+|__+$/g, "").replace(/\.txt$/i, "").trim().toLowerCase();
            if (!clean) return { items: [], propsByItem: new Map(), allProps: [] };
            if (caches.wildcardKeys.has(clean)) return caches.wildcardKeys.get(clean);

            try {
                const r = await fetch("/zombiehaus/wildcards/load", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filename: clean })
                });
                const data = await r.json();
                if (data && data.success && data.data) {
                    const parsed = parseWildcardData(data.data);
                    caches.wildcardKeys.set(clean, parsed);
                    return parsed;
                }
            } catch (_) {}
            const empty = { items: [], propsByItem: new Map(), allProps: [] };
            caches.wildcardKeys.set(clean, empty);
            return empty;
        };

        const getCaretCoords = (element, position) => {
            const div = document.createElement("div");
            const cs = window.getComputedStyle(element);
            const props = [
                "direction", "boxSizing", "width", "height", "overflowX", "overflowY",
                "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderStyle",
                "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
                "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize",
                "fontSizeAdjust", "lineHeight", "fontFamily", "textAlign", "textTransform",
                "textIndent", "textDecoration", "letterSpacing", "wordSpacing", "tabSize"
            ];
            div.style.position = "absolute";
            div.style.visibility = "hidden";
            div.style.whiteSpace = "pre-wrap";
            div.style.wordWrap = "break-word";
            div.style.top = "0";
            div.style.left = "-9999px";
            for (const p of props) {
                div.style[p] = cs[p];
            }
            div.style.width = (element.clientWidth || 300) + "px";
            div.textContent = element.value.substring(0, position);
            const span = document.createElement("span");
            span.textContent = element.value.substring(position) || ".";
            div.appendChild(span);
            document.body.appendChild(div);
            const top = span.offsetTop - element.scrollTop + parseInt(cs.borderTopWidth || "0", 10);
            const left = span.offsetLeft - element.scrollLeft + parseInt(cs.borderLeftWidth || "0", 10);
            const lineHeight = parseInt(cs.lineHeight, 10) || 18;
            document.body.removeChild(div);
            return { top, left, lineHeight };
        };

        const detectTrigger = (text, cursor) => {
            if (cursor <= 0 || !text) return null;
            const sub = text.slice(0, cursor);

            // 0. Property access: $var.prop (e.g. $woman. or $women.MeganFox.)
            const propMatch = sub.match(/(?:^|[^\$a-zA-Z0-9_])\$([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]*)$/);
            if (propMatch) {
                return {
                    type: "property",
                    varName: propMatch[1],
                    query: propMatch[2] || "",
                    replaceStart: cursor - (propMatch[2] || "").length,
                    replaceEnd: cursor
                };
            }

            // 1. Wildcards: __name
            const wcMatch = sub.match(/(?:^|[\s,.:;!?([{\"])(__([a-zA-Z0-9_\/-]*))$/);
            if (wcMatch) {
                return {
                    type: "wildcard",
                    query: wcMatch[2] || "",
                    replaceStart: cursor - wcMatch[1].length,
                    replaceEnd: cursor
                };
            }

            // 2. LoRA: <lora:name or <name
            const loraMatch = sub.match(/(?:^|[\s,.:;!?([{\"])(<(?:lora:)?([a-zA-Z0-9_\/\-\.]*))$/i);
            if (loraMatch) {
                return {
                    type: "lora",
                    query: loraMatch[2] || "",
                    replaceStart: cursor - loraMatch[1].length,
                    replaceEnd: cursor
                };
            }

            // 3. Variables: $name
            const varMatch = sub.match(/(?:^|[^\$a-zA-Z0-9_])(\$([a-zA-Z0-9_]*))$/);
            if (varMatch) {
                return {
                    type: "variable",
                    query: varMatch[2] || "",
                    replaceStart: cursor - varMatch[1].length,
                    replaceEnd: cursor
                };
            }

            // 4. Curator placeholders: {c or {curator
            const curMatch = sub.match(/(?:^|[\s,.:;!?([{\"])(\{([a-zA-Z0-9_]*))$/i);
            if (curMatch) {
                return {
                    type: "curator",
                    query: curMatch[2] || "",
                    replaceStart: cursor - curMatch[1].length,
                    replaceEnd: cursor
                };
            }

            return null;
        };

        const resolveItems = async (trigger) => {
            const q = (trigger.query || "").toLowerCase();
            const fullContext = (ta.value || "") + "\n" + (node?.widgets?.map(w => w.value || "").join("\n") || "");

            if (trigger.type === "property") {
                const items = [];
                const varName = trigger.varName;
                const assignMatch = fullContext.match(new RegExp(`(?:^|\\n)\\s*\\$${varName}\\s*=\\s*([^;\\n\\r]+)`, "i"));
                let rhs = assignMatch ? assignMatch[1].trim() : "";

                let wcName = null;
                let subItem = null;

                const chainMatch = rhs.match(/\$([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i);
                if (chainMatch) {
                    const parentVar = chainMatch[1];
                    subItem = chainMatch[2];
                    const pAssign = fullContext.match(new RegExp(`(?:^|\\n)\\s*\\$${parentVar}\\s*=\\s*([^;\\n\\r]+)`, "i"));
                    if (pAssign) rhs = pAssign[1].trim();
                }

                const wcMatch = rhs.match(/__(?:[-a-zA-Z0-9_*$]+?\$\$)?([a-zA-Z0-9_/-]+)__/i) ||
                               rhs.match(/(?:all|any|one|choose)\s*[\({]\s*['"]?([a-zA-Z0-9_/-]+)['"]?\s*[\)}]/i);
                if (wcMatch) {
                    wcName = wcMatch[1].replace(/\.txt$/i, "").trim().toLowerCase();
                }

                if (wcName) {
                    const data = await getWildcardData(wcName);
                    if (subItem && data.propsByItem.has(subItem.toLowerCase())) {
                        for (const prop of data.propsByItem.get(subItem.toLowerCase())) {
                            items.push({ name: prop, badge: "PROP", badgeClass: "badge-property", desc: `${subItem}.${prop}` });
                        }
                    } else if (data.items.length > 0) {
                        for (const it of data.items) {
                            items.push({ name: it, badge: "ITEM", badgeClass: "badge-property", desc: `${wcName} item` });
                        }
                    }
                    if (items.length === 0 && data.allProps.length > 0) {
                        for (const prop of data.allProps) {
                            items.push({ name: prop, badge: "PROP", badgeClass: "badge-property", desc: `Property (${wcName})` });
                        }
                    }
                }

                // Inline dictionary extraction fallback
                const inlineMatches = rhs.matchAll(/(?:^|[{,\s])([a-zA-Z0-9_]+)\s*:/g);
                for (const im of inlineMatches) {
                    const k = im[1].trim();
                    if (k && !items.some(it => it.name === k)) {
                        items.push({ name: k, badge: "PROP", badgeClass: "badge-property", desc: "Dictionary key" });
                    }
                }

                // Standard helper methods
                ["keys", "values", "length", "first", "last"].forEach(h => {
                    items.push({ name: h, badge: "FUNC", badgeClass: "badge-variable", desc: "Helper method" });
                });

                return items.filter(it => !q || it.name.toLowerCase().includes(q));
            }

            if (trigger.type === "wildcard") {
                const wcs = await getWildcards();
                return wcs
                    .map(w => ({ name: w, badge: "WC", badgeClass: "badge-wildcard", desc: "Wildcard file" }))
                    .filter(it => !q || it.name.toLowerCase().includes(q));
            }

            if (trigger.type === "lora") {
                const loras = await getLoras();
                return loras
                    .map(l => ({ name: l, badge: "LORA", badgeClass: "badge-lora", desc: "LoRA model" }))
                    .filter(it => !q || it.name.toLowerCase().includes(q));
            }

            if (trigger.type === "variable") {
                const vars = new Set();
                const vRegex = /\$([a-zA-Z0-9_]+)/g;
                let vm;
                while ((vm = vRegex.exec(fullContext)) !== null) {
                    vars.add(vm[1]);
                }
                ["subject", "style", "lighting", "quality", "details", "outfit"].forEach(s => vars.add(s));
                return Array.from(vars)
                    .map(v => ({ name: v, badge: "VAR", badgeClass: "badge-variable", desc: "Prompt variable" }))
                    .filter(it => !q || it.name.toLowerCase().includes(q));
            }

            if (trigger.type === "curator") {
                return ["curator", "curator2", "curator3", "curator4", "curator5", "curator6"]
                    .map(c => ({ name: c, badge: "LIST", badgeClass: "badge-curator", desc: "List curator slot" }))
                    .filter(it => !q || it.name.toLowerCase().includes(q));
            }

            return [];
        };

        const formatReplacement = (item, type) => {
            if (type === "property") return item.name;
            if (type === "wildcard") return `__${item.name}__`;
            if (type === "lora") return `<lora:${item.name}:1.0>`;
            if (type === "variable") return `$${item.name}`;
            if (type === "curator") return `{${item.name}}`;
            return item.name;
        };

        // Autocomplete menu container attached to overlay or body
        const menu = document.createElement("div");
        menu.className = "zds-autocomplete-menu";
        document.body.appendChild(menu);

        let activeItems = [];
        let selectedIndex = 0;
        let currentTrigger = null;

        const closeMenu = () => {
            menu.style.display = "none";
            menu.innerHTML = "";
            activeItems = [];
            selectedIndex = 0;
            currentTrigger = null;
        };

        const commitItem = (item) => {
            if (!currentTrigger) return;
            const replacement = formatReplacement(item, currentTrigger.type);
            ta.setRangeText(replacement, currentTrigger.replaceStart, currentTrigger.replaceEnd, "end");
            ta.dispatchEvent(new Event("input", { bubbles: true }));
            closeMenu();
            ta.focus();
        };

        const updateHighlight = () => {
            const rows = menu.querySelectorAll(".zds-autocomplete-item");
            rows.forEach((r, idx) => {
                if (idx === selectedIndex) {
                    r.classList.add("selected");
                    r.scrollIntoView({ block: "nearest" });
                } else {
                    r.classList.remove("selected");
                }
            });
        };

        const positionMenu = () => {
            if (!currentTrigger) return;
            const coords = getCaretCoords(ta, currentTrigger.replaceStart);
            const rect = ta.getBoundingClientRect();
            const left = Math.min(window.innerWidth - 350, Math.max(10, Math.round(rect.left + coords.left - ta.scrollLeft)));
            let top = Math.round(rect.top + coords.top - ta.scrollTop + coords.lineHeight + 4);
            if (top + 240 > window.innerHeight && rect.top - 240 > 10) {
                top = Math.round(rect.top + coords.top - ta.scrollTop - 244);
            }
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
        };

        const renderMenu = () => {
            menu.innerHTML = "";
            if (activeItems.length === 0) {
                closeMenu();
                return;
            }

            const maxVisible = 25;
            const displayItems = activeItems.slice(0, maxVisible);
            displayItems.forEach((item, idx) => {
                const row = document.createElement("div");
                row.className = "zds-autocomplete-item" + (idx === selectedIndex ? " selected" : "");

                const badge = document.createElement("span");
                badge.className = `zds-ac-badge ${item.badgeClass || ""}`;
                badge.textContent = item.badge || "AUTO";

                const label = document.createElement("span");
                label.className = "zds-ac-label";
                label.textContent = item.name;

                row.appendChild(badge);
                row.appendChild(label);

                if (item.desc) {
                    const desc = document.createElement("span");
                    desc.className = "zds-ac-hint";
                    desc.textContent = item.desc;
                    row.appendChild(desc);
                }

                row.addEventListener("mousedown", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    commitItem(item);
                });

                row.addEventListener("mouseenter", () => {
                    selectedIndex = idx;
                    updateHighlight();
                });

                menu.appendChild(row);
            });

            if (activeItems.length > maxVisible) {
                const more = document.createElement("div");
                more.className = "zds-ac-empty";
                more.textContent = `+${activeItems.length - maxVisible} more (type to filter)...`;
                menu.appendChild(more);
            }

            positionMenu();
            menu.style.display = "block";
            updateHighlight();
        };

        const checkTriggerAndSuggest = async () => {
            const trigger = detectTrigger(ta.value, ta.selectionStart);
            if (!trigger) {
                closeMenu();
                return;
            }

            currentTrigger = trigger;
            const items = await resolveItems(trigger);
            if (currentTrigger !== trigger) return;

            activeItems = items;
            selectedIndex = 0;
            renderMenu();
        };

        ta.addEventListener("input", () => {
            checkTriggerAndSuggest();
        });

        ta.addEventListener("keydown", (e) => {
            if (menu.style.display !== "none" && activeItems.length > 0) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    e.stopPropagation();
                    selectedIndex = (selectedIndex + 1) % activeItems.length;
                    updateHighlight();
                    return;
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    e.stopPropagation();
                    selectedIndex = (selectedIndex - 1 + activeItems.length) % activeItems.length;
                    updateHighlight();
                    return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    e.stopPropagation();
                    commitItem(activeItems[selectedIndex]);
                    return;
                }
                if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    closeMenu();
                    return;
                }
            }
        });

        ta.addEventListener("blur", () => {
            setTimeout(closeMenu, 180);
        });

        ta.addEventListener("scroll", () => {
            if (menu.style.display !== "none") positionMenu();
        });

        window.addEventListener("resize", closeMenu);
    }

    // ── Dedicated Structured Layout for Text Studio Nodes ─────────────────────
    renderTextStudioWidgets(node, container) {
        const findW = (name) => node.widgets?.find((w) => w.name === name);
        const positiveW = findW("positive");
        const negativeW = findW("negative");
        const muteNegativeW = findW("mute_negative");
        const savedPromptW = findW("saved_prompt");
        const promptStyleW = findW("prompt_style");
        const syntaxThemeW = findW("syntax_theme");
        const typeFilterW = findW("type_filter");
        const catFilterW = findW("category_filter");
        const negPresetsW = findW("negative_presets");
        const weightModeW = findW("weight_mode");
        const seedW = findW("seed");
        const seedActionW = findW("seed_action") || findW("control_after_generate");
        const promptCategoryW = findW("prompt_category");

        // Action buttons
        const buttonWidgets = (node.widgets || []).filter((w) => w.type === "button" || (typeof w.callback === "function" && w.value === undefined));

        // 1. Sleek Action Toolbar at the Top
        if (buttonWidgets.length > 0) {
            const toolbar = document.createElement("div");
            toolbar.className = "zds-studio-toolbar";
            for (const bw of buttonWidgets) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "zds-studio-btn";
                btn.textContent = bw.name || "Action";
                btn.title = bw.name || "";
                btn.onclick = (e) => {
                    e.stopPropagation();
                    if (bw.callback) {
                        try {
                            bw.callback(bw, app.canvas, node);
                        } catch (err) {
                            console.error("[Deck Studio] Button action error:", err);
                        }
                    }
                };
                toolbar.appendChild(btn);
            }
            container.appendChild(toolbar);
        }

        let posTa = null;
        let negTa = null;

        const updateCounter = (ta, counterEl) => {
            const txt = ta.value || "";
            const words = txt.trim() ? txt.trim().split(/\s+/).length : 0;
            counterEl.textContent = `${words}w • ${txt.length}c`;
        };

        // 2. Positive Prompt Box (Hero Focus)
        if (positiveW) {
            const posBox = document.createElement("div");
            posBox.className = "zds-prompt-box zds-prompt-box-pos";

            const posHeader = document.createElement("div");
            posHeader.className = "zds-prompt-header";

            const left = document.createElement("div");
            left.className = "zds-prompt-label-left";
            left.innerHTML = `<span class="zds-prompt-dot-pos"></span><span style="color: #34d399; font-weight: 700;">Positive Prompt</span>`;

            const right = document.createElement("div");
            right.className = "zds-prompt-actions";

            const counter = document.createElement("span");
            counter.className = "zds-prompt-counter";

            const copyBtn = document.createElement("button");
            copyBtn.type = "button";
            copyBtn.className = "zds-prompt-tool-btn";
            copyBtn.textContent = "📋 Copy";
            copyBtn.title = "Copy Positive Prompt";
            copyBtn.onclick = () => {
                if (posTa) {
                    navigator.clipboard.writeText(posTa.value).then(() => {
                        copyBtn.textContent = "✓ Copied";
                        setTimeout(() => {
                            copyBtn.textContent = "📋 Copy";
                        }, 1500);
                    });
                }
            };

            const clearBtn = document.createElement("button");
            clearBtn.type = "button";
            clearBtn.className = "zds-prompt-tool-btn";
            clearBtn.textContent = "🧹 Clear";
            clearBtn.title = "Clear Positive Prompt";
            clearBtn.onclick = () => {
                if (posTa && confirm("Clear positive prompt?")) {
                    posTa.value = "";
                    posTa.dispatchEvent(new Event("input"));
                }
            };

            right.appendChild(counter);
            right.appendChild(copyBtn);
            right.appendChild(clearBtn);

            posHeader.appendChild(left);
            posHeader.appendChild(right);
            posBox.appendChild(posHeader);

            posTa = document.createElement("textarea");
            posTa.className = "zds-textarea zds-textarea-pos";
            posTa.value = positiveW.value || "";
            posTa.placeholder = "Enter positive prompt (tags, descriptions, styles)...";

            posTa.oninput = () => {
                positiveW.value = posTa.value;
                updateCounter(posTa, counter);
                if (positiveW.callback) positiveW.callback(posTa.value, app.canvas, node);
                node.setDirtyCanvas(true, true);
            };

            updateCounter(posTa, counter);
            posBox.appendChild(posTa);
            this.attachSyntaxHighlighterToTextarea(posTa, posBox);
            this.attachAutocompleteToTextarea(posTa, node);
            container.appendChild(posBox);
        }

        // 3. Negative Prompt Box (with integrated Mute Negative switch)
        if (negativeW) {
            const negBox = document.createElement("div");
            negBox.className = "zds-prompt-box zds-prompt-box-neg";

            const negHeader = document.createElement("div");
            negHeader.className = "zds-prompt-header";

            const left = document.createElement("div");
            left.className = "zds-prompt-label-left";
            left.innerHTML = `<span class="zds-prompt-dot-neg"></span><span style="color: #fb7185; font-weight: 700;">Negative Prompt</span>`;

            // Embed Mute Negative toggle right into the header
            if (muteNegativeW) {
                const muteLabel = document.createElement("label");
                muteLabel.className = "zds-mute-inline-label";
                muteLabel.title = "Mute or bypass the negative prompt during generation";

                const muteText = document.createElement("span");
                muteText.textContent = "Mute:";
                muteText.style.fontSize = "10px";
                muteText.style.color = "var(--zds-text-muted)";

                const switchSpan = document.createElement("label");
                switchSpan.className = "zds-switch";
                switchSpan.style.transform = "scale(0.8)";
                switchSpan.style.margin = "0 4px";

                const chk = document.createElement("input");
                chk.type = "checkbox";
                chk.checked = !!muteNegativeW.value;

                chk.onchange = () => {
                    muteNegativeW.value = chk.checked;
                    if (chk.checked) {
                        negBox.classList.add("zds-prompt-muted");
                    } else {
                        negBox.classList.remove("zds-prompt-muted");
                    }
                    if (muteNegativeW.callback) muteNegativeW.callback(chk.checked, app.canvas, node);
                    node.setDirtyCanvas(true, true);
                };

                if (chk.checked) negBox.classList.add("zds-prompt-muted");

                const slider = document.createElement("span");
                slider.className = "zds-switch-slider";

                switchSpan.appendChild(chk);
                switchSpan.appendChild(slider);
                muteLabel.appendChild(muteText);
                muteLabel.appendChild(switchSpan);
                left.appendChild(muteLabel);
            }

            const right = document.createElement("div");
            right.className = "zds-prompt-actions";

            const counter = document.createElement("span");
            counter.className = "zds-prompt-counter";

            const copyBtn = document.createElement("button");
            copyBtn.type = "button";
            copyBtn.className = "zds-prompt-tool-btn";
            copyBtn.textContent = "📋 Copy";
            copyBtn.title = "Copy Negative Prompt";
            copyBtn.onclick = () => {
                if (negTa) {
                    navigator.clipboard.writeText(negTa.value).then(() => {
                        copyBtn.textContent = "✓ Copied";
                        setTimeout(() => {
                            copyBtn.textContent = "📋 Copy";
                        }, 1500);
                    });
                }
            };

            const clearBtn = document.createElement("button");
            clearBtn.type = "button";
            clearBtn.className = "zds-prompt-tool-btn";
            clearBtn.textContent = "🧹 Clear";
            clearBtn.title = "Clear Negative Prompt";
            clearBtn.onclick = () => {
                if (negTa && confirm("Clear negative prompt?")) {
                    negTa.value = "";
                    negTa.dispatchEvent(new Event("input"));
                }
            };

            right.appendChild(counter);
            right.appendChild(copyBtn);
            right.appendChild(clearBtn);

            negHeader.appendChild(left);
            negHeader.appendChild(right);
            negBox.appendChild(negHeader);

            negTa = document.createElement("textarea");
            negTa.className = "zds-textarea zds-textarea-neg";
            negTa.value = negativeW.value || "";
            negTa.placeholder = "Enter negative prompt (unwanted artifacts, quality filters)...";

            negTa.oninput = () => {
                negativeW.value = negTa.value;
                updateCounter(negTa, counter);
                if (negativeW.callback) negativeW.callback(negTa.value, app.canvas, node);
                node.setDirtyCanvas(true, true);
            };

            updateCounter(negTa, counter);
            negBox.appendChild(negTa);
            this.attachSyntaxHighlighterToTextarea(negTa, negBox);
            this.attachAutocompleteToTextarea(negTa, node);
            container.appendChild(negBox);
        }

        // 4. Prompt Library & Presets (Clean 2-Column Responsive Grid)
        const libraryWidgets = [
            savedPromptW,
            catFilterW,
            negPresetsW,
            promptStyleW,
            typeFilterW,
            syntaxThemeW,
            promptCategoryW
        ].filter(Boolean);

        if (libraryWidgets.length > 0) {
            const libSection = document.createElement("div");
            libSection.className = "zds-library-section";

            const libHeader = document.createElement("div");
            libHeader.className = "zds-section-subhead";
            libHeader.innerHTML = `<span>📚 Prompt Library & Styles</span>`;
            libSection.appendChild(libHeader);

            const grid = document.createElement("div");
            grid.className = "zds-prompt-library-grid";

            for (const w of libraryWidgets) {
                const cell = document.createElement("div");
                cell.className = "zds-grid-cell";

                const lbl = document.createElement("label");
                lbl.className = "zds-cell-label";
                lbl.textContent = w.name.replace(/_/g, " ");

                cell.appendChild(lbl);

                if (w.type === "combo" || Array.isArray(w.options?.values) || typeof w.options?.values === "function") {
                    const sel = document.createElement("select");
                    sel.className = "zds-select zds-select-compact";

                    let values = w.options?.values;
                    if (typeof values === "function") {
                        try {
                            values = values(w, node);
                        } catch (_) {
                            values = [];
                        }
                    }
                    if (!Array.isArray(values)) values = [];

                    let selectedVal = w.value;
                    if (typeof selectedVal === "number" && values[selectedVal] !== undefined) {
                        selectedVal = values[selectedVal];
                    }
                    if (selectedVal && !values.includes(selectedVal)) {
                        values = [selectedVal, ...values];
                    }

                    for (const val of values) {
                        const opt = document.createElement("option");
                        opt.value = val;
                        opt.textContent = val;
                        if (val === selectedVal) opt.selected = true;
                        sel.appendChild(opt);
                    }

                    sel.onchange = () => {
                        w.value = sel.value;
                        if (w.callback) w.callback(sel.value, app.canvas, node);
                        node.setDirtyCanvas(true, true);

                        // If loading a saved prompt or preset, refresh textareas after ComfyUI updates them
                        if (w === savedPromptW || w === negPresetsW) {
                            setTimeout(() => {
                                if (posTa && positiveW) {
                                    posTa.value = positiveW.value || "";
                                    posTa.dispatchEvent(new Event("input"));
                                }
                                if (negTa && negativeW) {
                                    negTa.value = negativeW.value || "";
                                    negTa.dispatchEvent(new Event("input"));
                                }
                            }, 50);
                        }
                    };

                    cell.appendChild(sel);
                } else {
                    const inp = document.createElement("input");
                    inp.type = "text";
                    inp.className = "zds-modal-input zds-input-compact";
                    inp.value = w.value || "";
                    inp.oninput = () => {
                        w.value = inp.value;
                        if (w.callback) w.callback(inp.value, app.canvas, node);
                        node.setDirtyCanvas(true, true);
                    };
                    cell.appendChild(inp);
                }

                grid.appendChild(cell);
            }

            libSection.appendChild(grid);
            container.appendChild(libSection);
        }

        // 5. Parameters & Seed Strip (Horizontal Compact Bar)
        if (seedW || weightModeW || seedActionW) {
            const paramsStrip = document.createElement("div");
            paramsStrip.className = "zds-params-strip";

            // Seed Control
            if (seedW) {
                const seedBlock = document.createElement("div");
                seedBlock.className = "zds-param-block zds-seed-block";

                const seedLbl = document.createElement("span");
                seedLbl.className = "zds-cell-label";
                seedLbl.textContent = "Seed";

                const seedGroup = document.createElement("div");
                seedGroup.className = "zds-seed-group";

                const seedInput = document.createElement("input");
                seedInput.type = "number";
                seedInput.className = "zds-seed-input";
                seedInput.value = seedW.value;

                seedInput.oninput = () => {
                    const val = parseInt(seedInput.value, 10) || 0;
                    seedW.value = val;
                    if (seedW.callback) seedW.callback(val, app.canvas, node);
                    node.setDirtyCanvas(true, true);
                };

                const randBtn = document.createElement("button");
                randBtn.type = "button";
                randBtn.className = "zds-seed-btn";
                randBtn.innerHTML = "🎲";
                randBtn.title = "Generate Random Seed";
                randBtn.onclick = () => {
                    const r = Math.floor(Math.random() * 1125899906842624);
                    seedInput.value = r;
                    seedInput.dispatchEvent(new Event("input"));
                };

                const incBtn = document.createElement("button");
                incBtn.type = "button";
                incBtn.className = "zds-seed-btn";
                incBtn.innerHTML = "+1";
                incBtn.title = "Increment Seed";
                incBtn.onclick = () => {
                    seedInput.value = (parseInt(seedInput.value, 10) || 0) + 1;
                    seedInput.dispatchEvent(new Event("input"));
                };

                seedGroup.appendChild(seedInput);
                seedGroup.appendChild(randBtn);
                seedGroup.appendChild(incBtn);

                seedBlock.appendChild(seedLbl);
                seedBlock.appendChild(seedGroup);
                paramsStrip.appendChild(seedBlock);
            }

            // Seed Action
            if (seedActionW) {
                const actBlock = document.createElement("div");
                actBlock.className = "zds-param-block";

                const actLbl = document.createElement("span");
                actLbl.className = "zds-cell-label";
                actLbl.textContent = "Seed Action";

                const sel = document.createElement("select");
                sel.className = "zds-select zds-select-compact";
                const values = Array.isArray(seedActionW.options?.values) ? seedActionW.options.values : ["fixed", "randomize", "increment", "decrement"];
                for (const v of values) {
                    const opt = document.createElement("option");
                    opt.value = v;
                    opt.textContent = v;
                    if (v === seedActionW.value) opt.selected = true;
                    sel.appendChild(opt);
                }
                sel.onchange = () => {
                    seedActionW.value = sel.value;
                    if (seedActionW.callback) seedActionW.callback(sel.value, app.canvas, node);
                    node.setDirtyCanvas(true, true);
                };

                actBlock.appendChild(actLbl);
                actBlock.appendChild(sel);
                paramsStrip.appendChild(actBlock);
            }

            // Weight Mode
            if (weightModeW) {
                const wmBlock = document.createElement("div");
                wmBlock.className = "zds-param-block";

                const wmLbl = document.createElement("span");
                wmLbl.className = "zds-cell-label";
                wmLbl.textContent = "Weight Mode";

                const sel = document.createElement("select");
                sel.className = "zds-select zds-select-compact";
                let values = weightModeW.options?.values || [];
                if (typeof values === "function") {
                    try {
                        values = values(weightModeW, node);
                    } catch (_) {
                        values = [];
                    }
                }
                if (!Array.isArray(values)) values = [];
                let sVal = weightModeW.value;
                if (typeof sVal === "number" && values[sVal] !== undefined) sVal = values[sVal];

                for (const v of values) {
                    const opt = document.createElement("option");
                    opt.value = v;
                    opt.textContent = v;
                    if (v === sVal) opt.selected = true;
                    sel.appendChild(opt);
                }
                sel.onchange = () => {
                    weightModeW.value = sel.value;
                    if (weightModeW.callback) weightModeW.callback(sel.value, app.canvas, node);
                    node.setDirtyCanvas(true, true);
                };

                wmBlock.appendChild(wmLbl);
                wmBlock.appendChild(sel);
                paramsStrip.appendChild(wmBlock);
            }

            container.appendChild(paramsStrip);
        }

        // 6. Gracefully append any extra or custom unhandled widgets
        const handledNames = new Set([
            "positive", "negative", "mute_negative", "saved_prompt", "prompt_style",
            "syntax_theme", "type_filter", "category_filter", "negative_presets",
            "weight_mode", "seed", "seed_action", "control_after_generate", "prompt_category"
        ]);
        const remainingWidgets = (node.widgets || []).filter((w) => !handledNames.has(w.name) && w.type !== "button" && !(typeof w.callback === "function" && w.value === undefined));
        if (remainingWidgets.length > 0) {
            for (const rw of remainingWidgets) {
                try {
                    const row = this.renderWidgetControl(node, rw);
                    if (row) container.appendChild(row);
                } catch (_) {}
            }
        }
    }

    // ── Render Tactile HTML Widgets (Two-Way Sync) ─────────────────────────────
    renderWidgetControl(node, widget) {
        if (!widget || widget.type === "hidden") return null;

        const row = document.createElement("div");
        row.className = "zds-widget-row";

        const header = document.createElement("div");
        header.className = "zds-widget-header";

        const label = document.createElement("span");
        label.textContent = widget.name;
        header.appendChild(label);

        // Dropdown Select (COMBO) - evaluated first so combo options with numeric indices/values are never mistaken for sliders
        if (widget.type === "combo" || Array.isArray(widget.options?.values) || typeof widget.options?.values === "function") {
            row.appendChild(header);
            const select = document.createElement("select");
            select.className = "zds-select";

            let values = widget.options?.values;
            if (typeof values === "function") {
                try {
                    values = values(widget, node);
                } catch (_) {
                    values = [];
                }
            }
            if (!Array.isArray(values)) {
                values = [];
            }

            let selectedVal = widget.value;
            if (typeof selectedVal === "number" && values[selectedVal] !== undefined) {
                selectedVal = values[selectedVal];
            }

            if (selectedVal && !values.includes(selectedVal)) {
                values = [selectedVal, ...values];
            }

            for (const val of values) {
                const opt = document.createElement("option");
                opt.value = val;
                opt.textContent = val;
                if (val === selectedVal) {
                    opt.selected = true;
                }
                select.appendChild(opt);
            }

            select.onchange = () => {
                widget.value = select.value;
                if (widget.callback) widget.callback(select.value, app.canvas, node);
                node.setDirtyCanvas(true, true);
            };

            row.appendChild(select);
            return row;
        }

        // Button Widget
        if (widget.type === "button" || (typeof widget.callback === "function" && widget.value === undefined)) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "zds-btn";
            btn.style.cssText = "width: 100%; margin-top: 4px; padding: 5px 10px; font-size: 11px;";
            btn.textContent = widget.name || "Action";
            btn.onclick = () => {
                if (widget.callback) widget.callback(widget, app.canvas, node);
            };
            row.appendChild(btn);
            return row;
        }

        // Boolean Toggle
        if (widget.type === "toggle" || typeof widget.value === "boolean") {
            const switchLabel = document.createElement("label");
            switchLabel.className = "zds-switch-label";
            switchLabel.innerHTML = `<span>${widget.name}</span>`;

            const switchSpan = document.createElement("label");
            switchSpan.className = "zds-switch";
            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.checked = !!widget.value;

            chk.onchange = () => {
                widget.value = chk.checked;
                if (widget.callback) widget.callback(chk.checked, app.canvas, node);
                node.setDirtyCanvas(true, true);
            };

            const slider = document.createElement("span");
            slider.className = "zds-switch-slider";

            switchSpan.appendChild(chk);
            switchSpan.appendChild(slider);
            switchLabel.appendChild(switchSpan);
            row.appendChild(switchLabel);
            return row;
        }

        // Numeric Slider Control
        if (widget.type === "number" || typeof widget.value === "number") {
            const isFloat = !Number.isInteger(widget.options?.step || 1) || (widget.value % 1 !== 0);
            const min = widget.options?.min ?? (isFloat ? 0.0 : 0);
            const max = widget.options?.max ?? (isFloat ? 2.0 : 100);
            const step = widget.options?.step ?? (isFloat ? 0.05 : 1);

            const valBadge = document.createElement("span");
            valBadge.className = "zds-widget-val-badge";
            valBadge.textContent = widget.value;
            header.appendChild(valBadge);
            row.appendChild(header);

            // Special Seed Handling
            if (widget.name.toLowerCase().includes("seed")) {
                const seedGroup = document.createElement("div");
                seedGroup.className = "zds-seed-group";

                const seedInput = document.createElement("input");
                seedInput.type = "number";
                seedInput.className = "zds-seed-input";
                seedInput.value = widget.value;

                seedInput.oninput = () => {
                    const val = parseInt(seedInput.value, 10) || 0;
                    widget.value = val;
                    valBadge.textContent = val;
                    if (widget.callback) widget.callback(val, app.canvas, node);
                    node.setDirtyCanvas(true, true);
                };

                const randBtn = document.createElement("button");
                randBtn.type = "button";
                randBtn.className = "zds-seed-btn";
                randBtn.innerHTML = "🎲";
                randBtn.title = "Generate Random Seed";
                randBtn.onclick = () => {
                    const r = Math.floor(Math.random() * 1125899906842624);
                    seedInput.value = r;
                    seedInput.dispatchEvent(new Event("input"));
                };

                const incBtn = document.createElement("button");
                incBtn.type = "button";
                incBtn.className = "zds-seed-btn";
                incBtn.innerHTML = "+1";
                incBtn.title = "Increment Seed";
                incBtn.onclick = () => {
                    seedInput.value = (parseInt(seedInput.value, 10) || 0) + 1;
                    seedInput.dispatchEvent(new Event("input"));
                };

                seedGroup.appendChild(seedInput);
                seedGroup.appendChild(randBtn);
                seedGroup.appendChild(incBtn);
                row.appendChild(seedGroup);
                return row;
            }

            // Normal Slider + Number
            const sliderCont = document.createElement("div");
            sliderCont.className = "zds-slider-container";

            const range = document.createElement("input");
            range.type = "range";
            range.className = "zds-range-input";
            range.min = min;
            range.max = max;
            range.step = step;
            range.value = widget.value;

            const num = document.createElement("input");
            num.type = "number";
            num.className = "zds-num-input";
            num.min = min;
            num.max = max;
            num.step = step;
            num.value = widget.value;

            const syncNum = (newVal) => {
                const v = isFloat ? parseFloat(newVal) : parseInt(newVal, 10);
                if (!isNaN(v)) {
                    widget.value = v;
                    range.value = v;
                    num.value = v;
                    valBadge.textContent = v;
                    if (widget.callback) widget.callback(v, app.canvas, node);
                    node.setDirtyCanvas(true, true);
                }
            };

            range.oninput = () => syncNum(range.value);
            num.onchange = () => syncNum(num.value);

            sliderCont.appendChild(range);
            sliderCont.appendChild(num);
            row.appendChild(sliderCont);
            return row;
        }

        // Multi-line Textarea / Text Input
        if (widget.type === "text" || widget.type === "customtext" || typeof widget.value === "string") {
            row.appendChild(header);

            const nameLower = (widget.name || "").toLowerCase();
            const isExcludedSingleLine = nameLower.includes("category") ||
                                         nameLower.includes("filter") ||
                                         nameLower.includes("style") ||
                                         nameLower.includes("theme") ||
                                         nameLower.includes("preset") ||
                                         nameLower.includes("prefix") ||
                                         nameLower.includes("suffix") ||
                                         nameLower.includes("filename") ||
                                         nameLower.includes("folder") ||
                                         nameLower.includes("path") ||
                                         nameLower.includes("mode") ||
                                         nameLower.includes("action") ||
                                         nameLower.includes("method");

            const isExplicitMultiline = widget.options?.multiline === true || widget.type === "customtext";
            const isMultilineName = nameLower === "positive" ||
                                    nameLower === "negative" ||
                                    nameLower.includes("positive_") ||
                                    nameLower.includes("negative_") ||
                                    nameLower.includes("prompt") ||
                                    nameLower.includes("caption") ||
                                    nameLower.includes("description") ||
                                    nameLower.includes("lyrics") ||
                                    nameLower.includes("script") ||
                                    nameLower.includes("notes") ||
                                    nameLower.includes("content") ||
                                    nameLower === "text" ||
                                    nameLower.startsWith("text_");

            const hasMultilineContent = typeof widget.value === "string" && (widget.value.includes("\n") || widget.value.length > 80);

            const isMultiline = isExplicitMultiline || (!isExcludedSingleLine && (isMultilineName || hasMultilineContent));

            if (isMultiline) {
                row.classList.add("zds-widget-multiline");
                if (nameLower === "positive" || nameLower.includes("lyrics") || nameLower === "caption") {
                    row.classList.add("zds-widget-hero-prompt");
                } else if (nameLower === "negative") {
                    row.classList.add("zds-widget-secondary-prompt");
                }

                const ta = document.createElement("textarea");
                ta.className = "zds-textarea";
                ta.value = widget.value || "";
                ta.placeholder = `Enter ${widget.name}...`;

                ta.oninput = () => {
                    widget.value = ta.value;
                    if (widget.callback) widget.callback(ta.value, app.canvas, node);
                    node.setDirtyCanvas(true, true);
                };

                row.appendChild(ta);
                this.attachSyntaxHighlighterToTextarea(ta, row);
                this.attachAutocompleteToTextarea(ta, node);
            } else {
                const inp = document.createElement("input");
                inp.type = "text";
                inp.className = "zds-modal-input";
                inp.style.padding = "6px 8px";
                inp.value = widget.value || "";

                inp.oninput = () => {
                    widget.value = inp.value;
                    if (widget.callback) widget.callback(inp.value, app.canvas, node);
                    node.setDirtyCanvas(true, true);
                };

                row.appendChild(inp);
            }
            return row;
        }

        return null;
    }

    // ── Real-Time Execution Feedback ──────────────────────────────────────────
    updateExecutionState() {
        const cards = this.overlay.querySelectorAll(".zds-card");
        cards.forEach((card) => {
            const nid = parseInt(card.dataset.nodeId, 10);
            card.classList.toggle("zds-card-executing", nid === this.executingNodeId);
        });
    }

    updateProgressBar(nodeId, step, max) {
        let container = this.overlay.querySelector(`#zds-progress-${nodeId}`);
        let fill = this.overlay.querySelector(`#zds-progress-fill-${nodeId}`);
        let text = this.overlay.querySelector(`#zds-progress-text-${nodeId}`);

        if (!container) {
            const card = this.overlay.querySelector(`#zds-card-${nodeId}`);
            if (card) {
                container = document.createElement("div");
                container.className = "zds-progress-container";
                container.id = `zds-progress-${nodeId}`;
                container.innerHTML = `
                    <div class="zds-progress-bar-bg">
                        <div class="zds-progress-bar-fill" id="zds-progress-fill-${nodeId}"></div>
                    </div>
                    <div class="zds-progress-text" id="zds-progress-text-${nodeId}">Step 0/0</div>
                `;
                const ports = card.querySelector(".zds-ports-section");
                const drawer = card.querySelector(".zds-drawer");
                if (ports) {
                    ports.after(container);
                } else if (drawer) {
                    drawer.after(container);
                } else {
                    card.prepend(container);
                }
                fill = container.querySelector(`#zds-progress-fill-${nodeId}`);
                text = container.querySelector(`#zds-progress-text-${nodeId}`);
            }
        }

        if (container && fill && text) {
            container.style.display = "flex";
            const pct = Math.round((step / max) * 100);
            fill.style.width = `${pct}%`;
            text.textContent = `Step ${step}/${max} (${pct}%)`;
        }
    }

    updateCardPreview(nodeId, url) {
        const card = this.overlay.querySelector(`#zds-card-${nodeId}`);
        if (!card) return;

        let preview = card.querySelector(".zds-card-preview");
        if (!preview) {
            preview = document.createElement("div");
            preview.className = "zds-card-preview";
            const prog = card.querySelector(".zds-progress-container");
            if (prog) {
                prog.after(preview);
            } else {
                const cornerResizer = card.querySelector(".zds-card-corner-resizer");
                if (cornerResizer) {
                    card.insertBefore(preview, cornerResizer);
                } else {
                    card.appendChild(preview);
                }
            }
        }

        let img = preview.querySelector(".zds-preview-img");
        if (!img) {
            img = document.createElement("img");
            img.className = "zds-preview-img";
            img.alt = "Preview";
            preview.appendChild(img);
        }
        if (img.src !== url) {
            img.src = url;
        }
    }

    // ── Search & Filter ───────────────────────────────────────────────────────
    applyFilter() {
        const q = this.filterQuery;
        const cards = this.overlay.querySelectorAll(".zds-card");
        cards.forEach((card) => {
            if (!q) {
                card.style.display = "";
                return;
            }
            const title = (card.querySelector(".zds-card-title")?.textContent || "").toLowerCase();
            const id = (card.dataset.nodeId || "").toLowerCase();
            const match = title.includes(q) || id.includes(q);
            card.style.display = match ? "" : "none";
        });
    }

    // ── Add Card Node Selector Modal ──────────────────────────────────────────
    openAddCardModal() {
        const existing = document.querySelector(".zds-modal-overlay");
        if (existing) existing.remove();

        const modalOverlay = document.createElement("div");
        modalOverlay.className = "zds-modal-overlay";

        const modal = document.createElement("div");
        modal.className = "zds-modal";
        modal.innerHTML = `
            <div class="zds-modal-header">
                <span class="zds-modal-title">Add Node Card to Deck</span>
                <button type="button" class="zds-card-btn" id="zds-modal-close">✕</button>
            </div>
            <div class="zds-modal-search">
                <input type="text" class="zds-modal-input" id="zds-node-search" placeholder="Type node name (e.g. KSampler, LoRA, Restormer)..." autofocus />
            </div>
            <div class="zds-modal-list" id="zds-node-list"></div>
        `;

        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        const close = () => modalOverlay.remove();
        modal.querySelector("#zds-modal-close").onclick = close;
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) close(); };

        const listEl = modal.querySelector("#zds-node-list");
        const searchInput = modal.querySelector("#zds-node-search");

        const allTypes = Object.keys(LiteGraph.registered_node_types || {}).sort();

        const renderItems = (filter = "") => {
            listEl.innerHTML = "";
            const q = filter.toLowerCase();
            const filtered = allTypes.filter((t) => t.toLowerCase().includes(q)).slice(0, 50);

            if (filtered.length === 0) {
                listEl.innerHTML = `<div style="text-align: center; color: var(--zds-text-muted); padding: 20px;">No matching nodes</div>`;
                return;
            }

            for (const type of filtered) {
                const item = document.createElement("div");
                item.className = "zds-modal-item";
                const nodeDef = LiteGraph.registered_node_types[type];
                const cat = nodeDef?.category || "Custom";

                item.innerHTML = `
                    <span class="zds-modal-item-name">${type}</span>
                    <span class="zds-modal-item-cat">${cat}</span>
                `;

                item.onclick = () => {
                    const node = LiteGraph.createNode(type);
                    if (node) {
                        // Position in visible center of graph
                        const pos = app.canvas ? app.canvas.convertEventToCanvasOffset({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }) : [100, 100];
                        node.pos = pos;
                        app.graph.add(node);
                        node.setDirtyCanvas(true, true);
                        this.syncCards();
                    }
                    close();
                };

                listEl.appendChild(item);
            }
        };

        searchInput.oninput = () => renderItems(searchInput.value);
        renderItems();
    }
}

// ── Extension Registration ───────────────────────────────────────────────────
let studioInstance = null;
function getOrCreateDeckStudio() {
    if (!studioInstance) {
        try {
            studioInstance = new ZombiehausDeckStudio();
            window.zombiehausDeckStudio = studioInstance;
        } catch (err) {
            console.error("[Deck Studio] Initialization Error:", err);
            return null;
        }
    }
    return studioInstance;
}

window.zombiehausToggleDeckStudio = () => {
    let s = studioInstance || window.zombiehausDeckStudio || getOrCreateDeckStudio();
    if (s && typeof s.toggle === "function") {
        s.toggle();
    } else {
        try {
            studioInstance = new ZombiehausDeckStudio();
            window.zombiehausDeckStudio = studioInstance;
            studioInstance.toggle();
        } catch (err) {
            console.error("[Deck Studio] Failed to toggle:", err);
        }
    }
};

app.registerExtension({
    name: "zombiehaus.DeckStudio",

    async init() {
        if (document.body) {
            getOrCreateDeckStudio();
        }
    },

    async setup() {
        getOrCreateDeckStudio();

        // Helper to check element visibility
        const isElementVisible = (el) => {
            if (!el) return false;
            try {
                const style = window.getComputedStyle(el);
                if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
                return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
            } catch (_) {
                return false;
            }
        };

        // Multi-Surface Toggle Button Injection
        const attachMenuToggle = () => {
            // Remove duplicate/extra Deck Studio buttons if present
            const oldTrayLeft = document.getElementById("zds-tray-header-btn");
            if (oldTrayLeft) oldTrayLeft.remove();
            const oldTrayRight = document.getElementById("zit-btn-deck-studio");
            if (oldTrayRight) oldTrayRight.remove();
            const oldToggleBtn = document.getElementById("zombiehaus-deck-studio-toggle-btn");
            if (oldToggleBtn) oldToggleBtn.remove();
            const oldFloatPill = document.getElementById("zds-floating-launcher-pill");
            if (oldFloatPill) oldFloatPill.remove();

            // 1. Modern ComfyUI Sidebar (Help, Console, Shortcuts, Settings or Templates)
            let sideBar = document.querySelector(".side-tool-bar-container") ||
                document.querySelector("nav.side-tool-bar-container") ||
                document.querySelector(".side-tool-bar") ||
                document.querySelector(".side-bar-panel") ||
                document.querySelector(".comfyui-sidebar");

            if (!sideBar) {
                const allElements = Array.from(document.querySelectorAll("button, div[role='button'], a[role='button']"));
                const settingsBtn = allElements.find(b => b.textContent?.includes("Settings") || b.getAttribute("title")?.includes("Settings") || b.getAttribute("aria-label")?.includes("Settings"));
                if (settingsBtn && settingsBtn.parentElement) {
                    sideBar = settingsBtn.parentElement;
                } else {
                    const templatesBtn = allElements.find(b => b.textContent?.includes("Templates") || b.getAttribute("title")?.includes("Templates"));
                    if (templatesBtn && templatesBtn.parentElement) {
                        sideBar = templatesBtn.parentElement;
                    }
                }
            }

            if (sideBar) {
                let sideBtn = document.getElementById("zombiehaus-deck-studio-sidebar-btn");
                if (!sideBtn) {
                    sideBtn = document.createElement("button");
                    sideBtn.id = "zombiehaus-deck-studio-sidebar-btn";
                    sideBtn.type = "button";
                    sideBtn.className = "side-tool-bar-btn comfy-btn zds-sidebar-btn";
                    sideBtn.title = "Toggle Zombiehaus Deck Studio Workstation (Alt+D / F9)";
                    sideBtn.style.cssText = "display: flex; flex-direction: column; align-items: center; justify-content: center; background: none; border: none; color: #c084fc; cursor: pointer; padding: 8px 4px; width: 100%; gap: 3px; border-radius: 6px; transition: background 0.15s ease;";
                    sideBtn.onmouseenter = () => { sideBtn.style.background = "rgba(168, 85, 247, 0.2)"; };
                    sideBtn.onmouseleave = () => { sideBtn.style.background = "none"; };
                    sideBtn.innerHTML = `
                        <span style="font-size: 16px; line-height: 1;">▥</span>
                        <span style="font-size: 9px; font-weight: 700; line-height: 1; letter-spacing: -0.2px;">Deck</span>
                    `;
                    sideBtn.onclick = (e) => {
                        e.preventDefault();
                        window.zombiehausToggleDeckStudio();
                    };

                    const settingsEl = Array.from(sideBar.querySelectorAll("button, div[role='button']"))
                        .find(b => b.textContent?.includes("Settings") || b.title?.includes("Settings"));
                    if (settingsEl && settingsEl.parentElement === sideBar) {
                        sideBar.insertBefore(sideBtn, settingsEl);
                    } else {
                        sideBar.appendChild(sideBtn);
                    }
                }
            }

            // 2. Top View Bar (next to "Graph" dropdown)
            const allBtns = Array.from(document.querySelectorAll("button, div[role='button']"));
            const graphBtn = allBtns.find(b => b.textContent?.trim().startsWith("Graph") || b.title?.includes("Graph"));
            if (graphBtn && graphBtn.parentElement) {
                const parent = graphBtn.parentElement;
                let topViewBtn = document.getElementById("zds-top-bar-view-btn");
                if (!topViewBtn) {
                    topViewBtn = document.createElement("button");
                    topViewBtn.id = "zds-top-bar-view-btn";
                    topViewBtn.type = "button";
                    topViewBtn.className = "comfy-btn zds-top-bar-btn";
                    topViewBtn.title = "Switch to Zombiehaus Deck Studio Workstation (Alt+D / F9)";
                    topViewBtn.style.cssText = "display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(6, 182, 212, 0.3)); border: 1px solid rgba(168, 85, 247, 0.7); border-radius: 6px; padding: 3px 10px; color: #ffffff; font-size: 12px; font-weight: 700; cursor: pointer; margin-left: 6px;";
                    topViewBtn.innerHTML = "<span>▥</span> Deck";
                    topViewBtn.onclick = (e) => {
                        e.preventDefault();
                        window.zombiehausToggleDeckStudio();
                    };
                    parent.appendChild(topViewBtn);
                }
            }
        };

        attachMenuToggle();
        const timer = setInterval(attachMenuToggle, 1000);
        setTimeout(() => {
            clearInterval(timer);
            // Long-term polling every 3 seconds to survive workflow reloads
            setInterval(attachMenuToggle, 3000);
        }, 15000);
    }
});
