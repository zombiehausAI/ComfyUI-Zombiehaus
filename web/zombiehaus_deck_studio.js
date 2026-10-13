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
        }

        const overlay = document.createElement("div");
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

        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.workspace = overlay.querySelector("#zds-columns-workspace");

        this.renderColumnsSkeleton();
    }

    renderColumnsSkeleton() {
        this.workspace.innerHTML = "";
        for (const stage of STAGES) {
            const bay = document.createElement("div");
            bay.className = `zds-bay ${stage.colorClass}`;
            bay.id = `zds-bay-${stage.id}`;
            bay.dataset.stageId = stage.id;

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

            this.workspace.appendChild(bay);
        }
    }

    // ── Setup UI Event Listeners ──────────────────────────────────────────────
    setupEventListeners() {
        const overlay = this.overlay;

        // Toggle back to Canvas
        overlay.querySelector("#zds-btn-canvas-view").onclick = () => this.close();

        // Refresh button
        overlay.querySelector("#zds-btn-refresh-deck").onclick = () => this.syncCards();

        // Image Tray Toggle in Deck Studio
        const trayToggleBtn = overlay.querySelector("#zds-btn-deck-tray");
        if (trayToggleBtn) {
            trayToggleBtn.onclick = () => {
                if (window.zombiehausImageTray) {
                    window.zombiehausImageTray.toggleCollapse();
                }
            };
        }

        // Prompt Studio Popout Button
        const promptStudioBtn = overlay.querySelector("#zds-btn-prompt-studio");
        if (promptStudioBtn) {
            promptStudioBtn.onclick = () => this.openPromptStudio();
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
        api.addEventListener("execution_start", () => {
            this.executingNodeId = null;
            this.updateExecutionState();
        });

        api.addEventListener("executing", (e) => {
            const nodeId = e.detail;
            this.executingNodeId = nodeId ? parseInt(nodeId, 10) : null;
            this.updateExecutionState();
        });

        api.addEventListener("progress", (e) => {
            const { value, max, node } = e.detail;
            if (node) {
                const nid = parseInt(node, 10);
                this.samplerProgress[nid] = { value, max };
                this.updateProgressBar(nid, value, max);
            }
        });

        api.addEventListener("executed", (e) => {
            const { node, output } = e.detail;
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

    open() {
        this.isOpen = true;
        this.overlay.classList.add("zds-active");
        document.body.classList.add("zombiehaus-deck-active");
        if (window.zombiehausImageTray) {
            window.zombiehausImageTray.updateBottomOffset();
        }
        this.syncCards();
        this.updateExecutionState();
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.remove("zds-active");
        document.body.classList.remove("zombiehaus-deck-active");
        if (window.zombiehausImageTray) {
            window.zombiehausImageTray.updateBottomOffset();
        }
        this.cancelConnectingMode();
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

                const firstStep = laneNodes.length > 0 ? laneNodes[0]._zdsRunStep : "-";
                const lastStep = laneNodes.length > 0 ? laneNodes[laneNodes.length - 1]._zdsRunStep : "-";

                laneEl.innerHTML = `
                    <div class="zds-lane-header">
                        <span>Lane ${laneIdx + 1}</span>
                        <span class="zds-lane-priority-tag">${laneNodes.length > 0 ? `Steps #${firstStep}-${lastStep}` : "Empty"}</span>
                    </div>
                    <div class="zds-lane-cards"></div>
                `;

                const cardsContainer = laneEl.querySelector(".zds-lane-cards");

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
                    const card = this.renderCard(node);
                    cardsContainer.appendChild(card);
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

        // 1. Header
        const header = document.createElement("div");
        header.className = "zds-card-header";

        const headerLeft = document.createElement("div");
        headerLeft.className = "zds-card-header-left";

        const dragHandle = document.createElement("span");
        dragHandle.className = "zds-card-drag-handle";
        dragHandle.innerHTML = "⋮⋮";
        dragHandle.title = "Drag to re-order priority";

        // Execution Priority Step Badge
        const stepBadge = document.createElement("span");
        stepBadge.className = "zds-card-step-badge";
        stepBadge.textContent = `▶ ${node._zdsRunStep || 1}`;
        stepBadge.title = `Execution Run Priority #${node._zdsRunStep || 1}`;

        const idBadge = document.createElement("span");
        idBadge.className = "zds-card-id";
        idBadge.textContent = `#${node.id}`;

        const titleGroup = document.createElement("div");
        titleGroup.className = "zds-card-title-group";

        const title = document.createElement("span");
        title.className = "zds-card-title";
        title.textContent = node.title || node.type;
        title.contentEditable = "true";
        title.spellcheck = false;
        title.onblur = () => {
            node.title = title.textContent.trim();
            node.setDirtyCanvas(true, true);
        };
        title.onkeydown = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                title.blur();
            }
        };

        const roleTag = document.createElement("span");
        roleTag.className = "zds-card-role";
        roleTag.textContent = getNodeRoleDescription(node);

        titleGroup.appendChild(title);
        titleGroup.appendChild(roleTag);

        headerLeft.appendChild(dragHandle);
        headerLeft.appendChild(stepBadge);
        headerLeft.appendChild(idBadge);
        headerLeft.appendChild(titleGroup);

        const headerActions = document.createElement("div");
        headerActions.className = "zds-card-header-actions";

        // Prompt Popout Button (for prompt/text nodes)
        const isPromptNode = (node.type || "").toLowerCase().includes("text") ||
            (node.type || "").toLowerCase().includes("prompt") ||
            (node.title || "").toLowerCase().includes("prompt") ||
            node.widgets?.some(w => w.name.toLowerCase().includes("positive") || w.name.toLowerCase().includes("prompt"));

        if (isPromptNode) {
            const popoutBtn = document.createElement("button");
            popoutBtn.className = "zds-card-btn zds-card-btn-prompt";
            popoutBtn.innerHTML = "🗖";
            popoutBtn.title = "Expand into Prompt Studio (Alt+P)";
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

        header.appendChild(headerLeft);
        header.appendChild(headerActions);
        card.appendChild(header);

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
                const wRow = this.renderWidgetControl(node, widget);
                if (wRow) widgetsBody.appendChild(wRow);
            }
        } else {
            const noW = document.createElement("div");
            noW.style.cssText = "font-size: 11px; color: var(--zds-text-muted); text-align: center; padding: 4px;";
            noW.textContent = "No direct settings";
            widgetsBody.appendChild(noW);
        }

        card.appendChild(widgetsBody);

        // 5. Image Preview Output (for Save/Preview nodes)
        if (this.lastExecutedImages[node.id]) {
            const preview = document.createElement("div");
            preview.className = "zds-card-preview";
            preview.innerHTML = `<img src="${this.lastExecutedImages[node.id]}" class="zds-preview-img" alt="Result" />`;
            card.appendChild(preview);
        }

        return card;
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
                const isConnected = output.links && output.links.length > 0;
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
        if (widget.type === "combo" || Array.isArray(widget.options?.values)) {
            row.appendChild(header);
            const select = document.createElement("select");
            select.className = "zds-select";

            const values = widget.options?.values || [];
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
                const ta = document.createElement("textarea");
                ta.className = "zds-textarea";
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
app.registerExtension({
    name: "zombiehaus.DeckStudio",

    async setup() {
        const studio = new ZombiehausDeckStudio();
        window.zombiehausDeckStudio = studio;

        // Persistent Menu / Sidebar Button Injection
        const attachMenuToggle = () => {
            // Clean up any button mistakenly appended as a direct child of .comfyui-body-bottom
            const oldBottomBtn = document.querySelector(".comfyui-body-bottom > #zombiehaus-deck-studio-toggle-btn");
            if (oldBottomBtn) oldBottomBtn.remove();

            // 1. Modern ComfyUI: inject into the left sidebar (Help, Console, Shortcuts, Settings)
            const sideBar = document.querySelector(".side-tool-bar-container") ||
                document.querySelector("nav.side-tool-bar-container") ||
                document.querySelector(".side-tool-bar");

            if (sideBar) {
                let sideBtn = document.getElementById("zombiehaus-deck-studio-sidebar-btn");
                if (!sideBtn) {
                    sideBtn = document.createElement("button");
                    sideBtn.id = "zombiehaus-deck-studio-sidebar-btn";
                    sideBtn.type = "button";
                    sideBtn.className = "side-tool-bar-btn comfy-btn";
                    sideBtn.title = "Toggle Zombiehaus Deck Studio Workstation (Alt+D / F9)";
                    sideBtn.style.cssText = "display: flex; flex-direction: column; align-items: center; justify-content: center; background: none; border: none; color: #c084fc; cursor: pointer; padding: 8px 4px; width: 100%; gap: 3px; border-radius: 6px; transition: background 0.15s ease;";
                    sideBtn.onmouseenter = () => { sideBtn.style.background = "rgba(168, 85, 247, 0.15)"; };
                    sideBtn.onmouseleave = () => { sideBtn.style.background = "none"; };
                    sideBtn.innerHTML = `
                        <span style="font-size: 16px; line-height: 1;">▥</span>
                        <span style="font-size: 9px; font-weight: 700; line-height: 1; letter-spacing: -0.2px;">Deck</span>
                    `;
                    sideBtn.onclick = (e) => {
                        e.preventDefault();
                        studio.toggle();
                    };

                    const settingsBtn = sideBar.querySelector("[title*='Settings']") || sideBar.querySelector("button:last-child");
                    if (settingsBtn && settingsBtn.parentElement === sideBar) {
                        sideBar.insertBefore(sideBtn, settingsBtn);
                    } else {
                        sideBar.appendChild(sideBtn);
                    }
                }
                return;
            }

            // 2. Classic ComfyUI / Top Menu Bar: inject into horizontal menu bar
            const menuBar = (
                document.querySelector("header.comfyui-menu") ||
                document.querySelector(".comfyui-menu:not(.comfyui-body-bottom)") ||
                document.querySelector(".comfy-menu") ||
                document.querySelector("#comfy-menu") ||
                document.querySelector(".side-bar-button-selected")?.parentElement ||
                document.querySelector(".comfyui-action-bar")
            );

            if (menuBar) {
                let btn = document.getElementById("zombiehaus-deck-studio-toggle-btn");
                if (!btn) {
                    btn = document.createElement("button");
                    btn.id = "zombiehaus-deck-studio-toggle-btn";
                    btn.type = "button";
                    btn.className = "comfy-btn zds-menu-toggle-btn";
                    btn.innerHTML = "<span>▥</span> Deck Studio";
                    btn.title = "Toggle Zombiehaus Deck Studio Workstation (Alt+D / F9)";
                    btn.style.cssText = "display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(6, 182, 212, 0.3)); border: 1px solid rgba(168, 85, 247, 0.6); border-radius: 6px; padding: 4px 12px; color: #f8fafc; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5); margin: 2px 6px; z-index: 1000;";
                    btn.onclick = (e) => {
                        e.preventDefault();
                        studio.toggle();
                    };
                    menuBar.appendChild(btn);
                }
            }
        };

        attachMenuToggle();
        const timer = setInterval(() => {
            attachMenuToggle();
            const sideBtn = document.getElementById("zombiehaus-deck-studio-sidebar-btn");
            const topBtn = document.getElementById("zombiehaus-deck-studio-toggle-btn");
            if (sideBtn || topBtn) {
                clearInterval(timer);
            }
        }, 1000);
        setTimeout(() => clearInterval(timer), 12000);
    }
});
