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

// ── Deck Studio Master Controller ─────────────────────────────────────────────
class ZombiehausDeckStudio {
    constructor() {
        this.isOpen = false;
        this.batchCount = 1;
        this.filterQuery = "";
        this.activeConnectingSource = null; // { nodeId, slotIndex, type }
        this.executingNodeId = null;
        this.samplerProgress = {}; // { [nodeId]: { step, max_steps } }
        this.lastExecutedImages = {}; // { [nodeId]: url }
        this.cardOverrides = {}; // user custom column assignments: { [nodeId]: stageId }

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

        this._currentBlobUrl = null;

        this.initDOM();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
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
                    min-width: 280px !important;
                    max-width: 1400px !important;
                    min-height: 110px !important;
                    max-height: 1200px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    box-sizing: border-box !important;
                    flex-shrink: 0 !important;
                    overflow: hidden !important;
                }
                .zds-card::-webkit-resizer {
                    background: linear-gradient(135deg, transparent 50%, rgba(168, 85, 247, 0.8) 50%) !important;
                    cursor: nwse-resize !important;
                }
                .zds-widgets-body {
                    flex: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                }
                .zds-widget-row {
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
                .zds-widget-row.zds-widget-multiline {
                    flex: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    min-height: 90px !important;
                }
                .zds-textarea {
                    width: 100% !important;
                    box-sizing: border-box !important;
                    flex: 1 !important;
                    min-height: 80px !important;
                    height: 100% !important;
                    resize: vertical !important;
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
                        <button type="button" class="zds-view-btn zds-active-view" id="zds-btn-deck-view" title="Stay in Deck Studio (F9)">
                            <span>▥</span> Deck Studio
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
            const newWidth = Math.max(320, Math.min(1200, Math.round(startWidth + dx)));
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
            const newWidth = Math.max(300, Math.min(1600, Math.round(startWidth + dx)));
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
        api?.addEventListener?.("execution_start", () => {
            this.executingNodeId = null;
            this.updateExecutionState();
        });

        api?.addEventListener?.("executing", (e) => {
            const nodeId = e.detail;
            this.executingNodeId = nodeId ? parseInt(nodeId, 10) : null;
            this.updateExecutionState();
        });

        api?.addEventListener?.("progress", (e) => {
            const { value, max, node } = e.detail || {};
            if (node) {
                const nid = parseInt(node, 10);
                this.samplerProgress[nid] = { value, max };
                this.updateProgressBar(nid, value, max);
            }
        });

        // Live Real-Time Step-by-Step Preview during KSampler / Generation
        api?.addEventListener?.("b_index", (e) => {
            if (this.executingNodeId && e.detail instanceof Blob) {
                const blobUrl = URL.createObjectURL(e.detail);
                if (this._currentBlobUrl) {
                    try { URL.revokeObjectURL(this._currentBlobUrl); } catch (_) {}
                }
                this._currentBlobUrl = blobUrl;
                this.updateCardPreview(this.executingNodeId, blobUrl);
            }
        });

        api?.addEventListener?.("executed", (e) => {
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
                    const nodeIdStr = e.dataTransfer.getData("text/zds-node-id");
                    if (nodeIdStr) {
                        const nodeId = parseInt(nodeIdStr, 10);
                        this.cardOverrides[nodeId] = { stage: stage.id, lane: laneIdx };
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

    // ── Render Individual Node Card ───────────────────────────────────────────
    renderCard(node) {
        const card = document.createElement("div");
        card.className = "zds-card";
        card.id = `zds-card-${node.id}`;
        card.dataset.nodeId = node.id;
        card.draggable = true;

        if (node.mode === 2) card.classList.add("zds-card-bypassed");
        if (node.mode === 1) card.classList.add("zds-card-muted");
        if (node.id === this.executingNodeId) card.classList.add("zds-card-executing");

        // Drag & Drop
        card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/zds-node-id", String(node.id));
            card.classList.add("zds-card-dragging");
        });

        card.addEventListener("dragend", () => {
            card.classList.remove("zds-card-dragging");
        });

        // Connection Tracing on Hover (when enabled)
        card.addEventListener("mouseenter", () => {
            if (this.enableWireTracing) {
                this.highlightNodeConnections(node.id);
            }
        });
        card.addEventListener("mouseleave", () => {
            if (this.enableWireTracing) {
                this.clearConnectionHighlights();
            }
        });

        // Restore Saved Card Width & Height (Bidirectional Resizability)
        if (this.cardSizes[node.id]) {
            const sz = this.cardSizes[node.id];
            if (typeof sz === "number") {
                card.style.height = `${sz}px`;
            } else if (sz && typeof sz === "object") {
                if (sz.height) card.style.height = `${sz.height}px`;
                if (sz.width) card.style.width = `${sz.width}px`;
            }
        }

        // Observe manual resize (horizontal & vertical) to persist across sessions
        if (typeof ResizeObserver !== "undefined") {
            let resizeDebounce = null;
            const ro = new ResizeObserver(() => {
                clearTimeout(resizeDebounce);
                resizeDebounce = setTimeout(() => {
                    const w = Math.round(card.offsetWidth);
                    const h = Math.round(card.offsetHeight);
                    if ((w && w > 120) || (h && h > 80)) {
                        this.cardSizes[node.id] = { width: w, height: h };
                        try {
                            localStorage.setItem("zds_card_sizes", JSON.stringify(this.cardSizes));
                        } catch (_) {}
                    }
                }, 200);
            });
            ro.observe(card);
        }

        const conns = this.getNodeConnections(node.id);

        // Connection Links Drawer (collapsible details)
        const drawer = document.createElement("div");
        drawer.className = "zds-card-connections-drawer";
        drawer.style.display = "none";

        // 1. Header (Prominent Title Bar)
        const header = document.createElement("div");
        header.className = "zds-card-header";

        const titleRow = document.createElement("div");
        titleRow.className = "zds-card-title-row";

        const titleLeft = document.createElement("div");
        titleLeft.className = "zds-card-title-left";

        const dragHandle = document.createElement("span");
        dragHandle.className = "zds-card-drag-handle";
        dragHandle.innerHTML = "⋮⋮";
        dragHandle.title = "Drag to re-order priority / move card";

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
        collapseBtn.innerHTML = "▾";
        collapseBtn.title = "Collapse Card Body";
        collapseBtn.onclick = () => {
            card.classList.toggle("zds-card-collapsed");
            collapseBtn.innerHTML = card.classList.contains("zds-card-collapsed") ? "▸" : "▾";
        };

        headerActions.appendChild(bypassBtn);
        headerActions.appendChild(muteBtn);
        headerActions.appendChild(locateBtn);
        headerActions.appendChild(collapseBtn);

        titleRow.appendChild(titleLeft);
        titleRow.appendChild(headerActions);

        // 2. Meta Sub-row (Priority Step, Node Role, Connection Pills)
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

        // Connection Summary Pill (Click to toggle Link Drawer)
        const linksSummary = document.createElement("span");
        linksSummary.className = "zds-card-links-summary";
        linksSummary.title = `Connections: ${conns.feeders.length} input feeder(s), ${conns.consumers.length} output consumer(s). Click to toggle links drawer.`;
        linksSummary.innerHTML = `<span class="zds-conn-in-count">◀ ${conns.feeders.length}</span> • <span class="zds-conn-out-count">${conns.consumers.length} ▶</span>`;
        linksSummary.onclick = (e) => {
            e.stopPropagation();
            drawer.style.display = drawer.style.display === "none" ? "flex" : "none";
        };

        metaRow.appendChild(stepBadge);
        metaRow.appendChild(roleTag);
        metaRow.appendChild(linksSummary);

        header.appendChild(titleRow);
        header.appendChild(metaRow);
        card.appendChild(header);

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

        if (node.widgets && node.widgets.length > 0) {
            for (const widget of node.widgets) {
                try {
                    const wRow = this.renderWidgetControl(node, widget);
                    if (wRow) widgetsBody.appendChild(wRow);
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
        if (imgUrl) {
            const preview = document.createElement("div");
            preview.className = "zds-card-preview";
            preview.innerHTML = `<img src="${imgUrl}" class="zds-preview-img" alt="Result" />`;
            card.appendChild(preview);
        }

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

        // Dropdown Select (COMBO)
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

            if (widget.value && !values.includes(widget.value)) {
                values = [widget.value, ...values];
            }

            for (const val of values) {
                const opt = document.createElement("option");
                opt.value = val;
                opt.textContent = val;
                if (val === widget.value) opt.selected = true;
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

        // Multi-line Textarea / Text Input
        if (widget.type === "text" || widget.type === "customtext" || typeof widget.value === "string") {
            row.appendChild(header);
            const isMultiline = widget.name.toLowerCase().includes("prompt") || widget.name.toLowerCase().includes("text");

            if (isMultiline) {
                row.classList.add("zds-widget-multiline");
                const ta = document.createElement("textarea");
                ta.className = "zds-textarea";
                ta.style.width = "100%";
                ta.style.boxSizing = "border-box";
                ta.style.flex = "1";
                ta.value = widget.value || "";

                ta.oninput = () => {
                    widget.value = ta.value;
                    if (widget.callback) widget.callback(ta.value, app.canvas, node);
                    node.setDirtyCanvas(true, true);
                };

                row.appendChild(ta);
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
        const container = this.overlay.querySelector(`#zds-progress-${nodeId}`);
        const fill = this.overlay.querySelector(`#zds-progress-fill-${nodeId}`);
        const text = this.overlay.querySelector(`#zds-progress-text-${nodeId}`);

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
            card.appendChild(preview);
        }

        preview.innerHTML = `<img src="${url}" class="zds-preview-img" alt="Result" />`;
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
            // 1. Direct Tray Header Injection (Left side next to Clear)
            const trayLeft = document.querySelector(".zit-header-left");
            if (trayLeft) {
                let trayBtn = document.getElementById("zds-tray-header-btn");
                if (!trayBtn) {
                    trayBtn = document.createElement("button");
                    trayBtn.id = "zds-tray-header-btn";
                    trayBtn.type = "button";
                    trayBtn.className = "zit-action-btn";
                    trayBtn.title = "Switch to Deck Studio Interface (Alt+D / F9)";
                    trayBtn.style.cssText = "display: inline-flex; align-items: center; gap: 5px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(6, 182, 212, 0.35)); border: 1px solid rgba(168, 85, 247, 0.7); border-radius: 6px; padding: 2px 10px; color: #ffffff; font-size: 11px; font-weight: 700; cursor: pointer; margin-left: 8px;";
                    trayBtn.innerHTML = "<span>▥</span> Deck Studio";
                    trayBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.zombiehausToggleDeckStudio();
                    };
                    trayLeft.appendChild(trayBtn);
                }
            }

            // 2. Modern ComfyUI Sidebar (Help, Console, Shortcuts, Settings or Templates)
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

            // 3. Top View Bar (next to "Graph" dropdown)
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

            // 4. Visible Menu Bar / Bottom Action Bar Button
            const menuBarCandidates = [
                document.querySelector(".comfyui-body-bottom .comfyui-menu"),
                document.querySelector(".comfyui-body-bottom"),
                document.querySelector("header.comfyui-menu"),
                document.querySelector(".comfyui-menu:not(.comfyui-body-bottom)"),
                document.querySelector(".comfyui-action-bar"),
                document.querySelector(".comfy-menu")
            ];
            const visibleMenuBar = menuBarCandidates.find(mb => mb && isElementVisible(mb));

            if (visibleMenuBar) {
                let btn = document.getElementById("zombiehaus-deck-studio-toggle-btn");
                if (!btn) {
                    btn = document.createElement("button");
                    btn.id = "zombiehaus-deck-studio-toggle-btn";
                    btn.type = "button";
                    btn.className = "comfy-btn zds-menu-toggle-btn";
                    btn.innerHTML = "<span>▥</span> Deck Studio";
                    btn.title = "Switch to Zombiehaus Deck Studio Workstation (Alt+D / F9)";
                    btn.onclick = (e) => {
                        e.preventDefault();
                        window.zombiehausToggleDeckStudio();
                    };
                }
                btn.style.cssText = "display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: auto; max-width: fit-content; align-self: flex-start; background: linear-gradient(135deg, rgba(168, 85, 247, 0.45), rgba(6, 182, 212, 0.4)); border: 1px solid rgba(168, 85, 247, 0.8); border-radius: 6px; padding: 6px 14px; color: #ffffff; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5); margin: 3px 6px; z-index: 1000;";
                if (btn.parentElement !== visibleMenuBar) {
                    const firstBtn = visibleMenuBar.querySelector("button");
                    if (firstBtn && firstBtn.parentElement === visibleMenuBar && firstBtn !== btn) {
                        visibleMenuBar.insertBefore(btn, firstBtn);
                    } else {
                        visibleMenuBar.appendChild(btn);
                    }
                }
            }

            // 5. Unconditional Floating Launcher Pill (Always Available)
            let floatPill = document.getElementById("zds-floating-launcher-pill");
            if (!floatPill) {
                floatPill = document.createElement("button");
                floatPill.id = "zds-floating-launcher-pill";
                floatPill.type = "button";
                floatPill.className = "comfy-btn";
                floatPill.title = "Switch to Zombiehaus Deck Studio Workstation (Alt+D / F9)";
                floatPill.style.cssText = "position: fixed; top: 12px; right: 180px; z-index: 99990; display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #7c3aed, #06b6d4); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 8px; padding: 5px 12px; color: #ffffff; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6); transition: transform 0.15s ease;";
                floatPill.onmouseenter = () => { floatPill.style.transform = "scale(1.05)"; };
                floatPill.onmouseleave = () => { floatPill.style.transform = "scale(1)"; };
                floatPill.innerHTML = "<span>▥</span> Deck Studio";
                floatPill.onclick = (e) => {
                    e.preventDefault();
                    window.zombiehausToggleDeckStudio();
                };
                document.body.appendChild(floatPill);
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
