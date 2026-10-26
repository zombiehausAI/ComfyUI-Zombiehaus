import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * Zombiehaus Image Tray - Dockable Bottom Filmstrip & Workflow Lightbox
 * Inspired by rgthree image tray: provides a real-time horizontal stream of
 * generated outputs with one-click workflow loading, node routing, and inspection.
 */

class ZombiehausImageTray {
    constructor() {
        this._initTime = Date.now();
        this.items = []; // Array of { filename, subfolder, type, url, timestamp }
        this.isCollapsed = false;
        this.isHidden = false;
        this.size = "medium"; // 'small' | 'medium' | 'large'
        this.maxItems = 100;
        this.pushedElements = new Set();
        this.isUpdatingBottom = false;
        this._lastAppliedHeight = null;
        this._lastAppliedDisplay = null;

        let savedEnabled = true;
        try {
            if (typeof localStorage !== "undefined") {
                const stored = localStorage.getItem("zombiehaus_image_tray_enabled");
                if (stored !== null) savedEnabled = stored === "true";
            }
        } catch (_) {}
        this.isEnabled = savedEnabled;
        this.imageObserver = null;

        this.initDOM();
        this.initImageObserver();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();

        if (this.isEnabled) {
            this.fetchRecentOutputs();
        } else {
            if (this.trayEl) {
                this.trayEl.style.display = "none";
                this.trayEl.classList.add("zit-disabled");
            }
            this.syncSettingsState(false);
            setTimeout(() => this.syncSettingsState(false), 250);
            setTimeout(() => this.syncSettingsState(false), 1200);
        }
    }

    getViewUrl(item) {
        if (!item) return "";
        const filename = typeof item === "object" ? item.filename : item;
        const subfolder = (typeof item === "object" ? item.subfolder : "") || "";
        const type = (typeof item === "object" ? item.type : "output") || "output";
        return `/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
    }

    getThumbnailUrl(item, size = 256) {
        if (!item) return "";
        const filename = typeof item === "object" ? item.filename : item;
        const subfolder = (typeof item === "object" ? item.subfolder : "") || "";
        const type = (typeof item === "object" ? item.type : "output") || "output";
        return `/zombiehaus/gallery/thumbnail?filename=${encodeURIComponent(filename)}&path=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}&size=${size}`;
    }

    initImageObserver() {
        if (!("IntersectionObserver" in window)) return;
        if (this.imageObserver) {
            this.imageObserver.disconnect();
        }
        this.imageObserver = new IntersectionObserver((entries, observer) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const img = card.querySelector("img.zit-card-img");
                    if (img && img.dataset.src && !img.src) {
                        img.src = img.dataset.src;
                        if (img.complete) {
                            img.classList.add("zit-loaded");
                        } else {
                            img.onload = () => { img.classList.add("zit-loaded"); };
                        }
                    }
                    observer.unobserve(card);
                }
            }
        }, {
            root: this.filmstripEl || null,
            rootMargin: "350px"
        });
    }

    // ── Enable / Disable State Control ────────────────────────────────────────
    setEnabled(enabled, fromUser = false) {
        const targetState = !!enabled;

        // Startup protection: If settings system attempts to re-enable on page load
        // because of default setting values, but the user explicitly disabled the tray,
        // ignore automated startup calls and preserve the disabled state.
        if (targetState && !fromUser) {
            const isStartup = (Date.now() - (this._initTime || 0)) < 4000;
            let storedDisabled = false;
            try {
                if (typeof localStorage !== "undefined") {
                    storedDisabled = localStorage.getItem("zombiehaus_image_tray_enabled") === "false";
                }
            } catch (_) {}

            if (isStartup && storedDisabled) {
                console.log("[Zombiehaus Image Tray] Startup override prevented: tray remains disabled per user preference.");
                this.isEnabled = false;
                if (this.trayEl) {
                    this.trayEl.style.display = "none";
                    this.trayEl.classList.add("zit-disabled");
                }
                this.syncSettingsState(false);
                this.updateBottomOffset();
                return;
            }
        }

        this.isEnabled = targetState;

        try {
            if (typeof localStorage !== "undefined") {
                localStorage.setItem("zombiehaus_image_tray_enabled", this.isEnabled ? "true" : "false");
            }
        } catch (_) {}

        this.syncSettingsState(this.isEnabled);

        if (this.trayEl) {
            this.trayEl.style.display = this.isEnabled ? "flex" : "none";
            this.trayEl.classList.toggle("zit-disabled", !this.isEnabled);
            if (!this.isEnabled) {
                this.restorePushedElements();
            }
        }

        const toggleBtn = document.getElementById("zombiehaus-image-tray-toggle-btn");
        if (toggleBtn) {
            toggleBtn.style.opacity = this.isEnabled ? "1" : "0.5";
            toggleBtn.title = this.isEnabled ? "Toggle Zombiehaus Image Tray (Alt+T / F10)" : "Image Tray is Disabled (Click to Enable)";
        }

        this.updateBottomOffset();

        if (this.isEnabled && this.items.length === 0) {
            this.fetchRecentOutputs();
        }
    }

    syncSettingsState(enabled) {
        try {
            const sm = window.app?.ui?.settings || window.app?.settings || window.app?.extensionManager?.setting;
            if (sm && typeof sm.setSettingValue === "function") {
                sm.setSettingValue("Zombiehaus.EnableImageTray", !!enabled);
            }
        } catch (_) {}
    }

    // ── Inject Stylesheet & Base DOM ──────────────────────────────────────────
    initDOM() {
        if (!document.getElementById("zit-stylesheet")) {
            const link = document.createElement("link");
            link.id = "zit-stylesheet";
            link.rel = "stylesheet";
            link.href = new URL("./zombiehaus_image_tray.css", import.meta.url).href;
            document.head.appendChild(link);
        }

        if (!document.getElementById("zit-grid-integration")) {
            const style = document.createElement("style");
            style.id = "zit-grid-integration";
            style.textContent = `
                #zombiehaus-image-tray.zit-disabled,
                .comfyui-body-bottom #zombiehaus-image-tray.zit-disabled {
                    display: none !important;
                    height: 0 !important;
                    max-height: 0 !important;
                    min-height: 0 !important;
                    overflow: hidden !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                }
                .comfyui-body-bottom #zombiehaus-image-tray {
                    position: relative !important;
                    bottom: auto !important;
                    left: auto !important;
                    right: auto !important;
                    width: 100% !important;
                    z-index: 1000 !important;
                    box-sizing: border-box !important;
                    transform: none !important;
                    transition: height 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    overflow: hidden !important;
                    height: var(--zit-height, 184px) !important;
                    max-height: var(--zit-height, 184px) !important;
                }
                .comfyui-body-bottom #zombiehaus-image-tray.zit-collapsed {
                    height: 36px !important;
                    max-height: 36px !important;
                    transform: none !important;
                    overflow: hidden !important;
                }
                .comfyui-body-bottom #zombiehaus-image-tray.zit-hidden {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        const tray = document.createElement("div");
        tray.id = "zombiehaus-image-tray";
        tray.innerHTML = `
            <div class="zit-header" id="zit-header-bar">
                <div class="zit-header-left">
                    <div class="zit-title-group">
                        <span class="zit-icon">🖼️</span>
                        <span class="zit-title">Image Tray</span>
                        <span class="zit-count-badge" id="zit-count-badge">0</span>
                    </div>

                    <button type="button" class="zit-action-btn" id="zit-btn-refresh" title="Refresh Output Gallery">
                        <span>🔄</span> Refresh
                    </button>

                    <button type="button" class="zit-action-btn" id="zit-btn-clear" title="Clear Tray View">
                        <span>🗑️</span> Clear
                    </button>
                </div>

                <div class="zit-header-right">
                    <button type="button" class="zit-action-btn" id="zit-btn-size" title="Toggle Thumbnail Size">
                        <span>📐</span> <span id="zit-size-label">Medium</span>
                    </button>

                    <button type="button" class="zit-action-btn" id="zit-btn-disable" title="Disable Image Tray (re-enable anytime in ComfyUI Settings or Alt+T)">
                        <span>✕</span> Disable
                    </button>

                    <span class="zit-collapse-toggle" id="zit-collapse-icon" title="Toggle Tray (Alt+T / F10)">▾</span>
                </div>
            </div>

            <div class="zit-filmstrip" id="zit-filmstrip-container">
                <div class="zit-empty-msg">No images yet. Generated outputs will appear here in real time.</div>
            </div>
        `;

        const bodyBottom = document.querySelector(".comfyui-body-bottom") || document.getElementById("comfyui-body-bottom");
        if (bodyBottom) {
            bodyBottom.prepend(tray);
        } else {
            document.body.appendChild(tray);
        }
        this.trayEl = tray;
        if (!this.isEnabled) {
            this.trayEl.style.display = "none";
            this.trayEl.classList.add("zit-disabled");
        }
        this.filmstripEl = tray.querySelector("#zit-filmstrip-container");
        this.countBadge = tray.querySelector("#zit-count-badge");
        this.sizeLabel = tray.querySelector("#zit-size-label");
        this.pushedElements = new Set();
    }

    // ── Dynamic ComfyUI Docking (Native Body-Bottom Grid Integration / rgthree pattern) ──
    updateBottomOffset() {
        if (!this.trayEl) return;

        if (!this.isEnabled) {
            this.trayEl.style.display = "none";
            this.trayEl.classList.add("zit-disabled");
            if (this.trayEl.parentElement && this.trayEl.parentElement.classList?.contains("comfyui-body-bottom")) {
                this.trayEl.style.setProperty("--zit-height", "0px");
                this.trayEl.style.height = "0px";
            }
            this._lastAppliedHeight = 0;
            this._lastAppliedDisplay = "none";
            this.restorePushedElements();
            return;
        }

        this.trayEl.classList.remove("zit-disabled");

        // If Deck Studio full-screen overlay is active, dock at bottom 0 and left 0 with elevated z-index
        const isDeckActive = document.body.classList.contains("zombiehaus-deck-active") ||
            !!document.querySelector("#zombiehaus-deck-studio.zds-active");

        if (isDeckActive) {
            if (this.trayEl.parentElement !== document.body) {
                document.body.appendChild(this.trayEl);
            }
            this.trayEl.style.position = "fixed";
            this.trayEl.style.bottom = "0px";
            this.trayEl.style.left = "0px";
            this.trayEl.style.right = "0px";
            this.trayEl.style.width = "100%";
            this.trayEl.style.zIndex = "100055";
            this.restorePushedElements();
            return;
        }

        // 1. Check for Modern ComfyUI layout container (.comfyui-body-bottom) - rgthree pattern
        const bodyBottom = document.querySelector(".comfyui-body-bottom") || document.getElementById("comfyui-body-bottom");
        if (bodyBottom) {
            // Mount directly inside ComfyUI's native bottom grid container
            if (this.trayEl.parentElement !== bodyBottom) {
                bodyBottom.prepend(this.trayEl);
            }

            const currentHeight = (!this.isEnabled || this.isHidden)
                ? 0
                : (this.isCollapsed ? 36 : (this.size === "small" ? 148 : (this.size === "large" ? 228 : 184)));

            const displayVal = (!this.isEnabled || this.isHidden) ? "none" : "flex";

            if (this._lastAppliedHeight !== currentHeight) {
                this.trayEl.style.setProperty("--zit-height", `${currentHeight}px`);
                this.trayEl.style.height = `${currentHeight}px`;
                this._lastAppliedHeight = currentHeight;
            }

            if (this._lastAppliedDisplay !== displayVal) {
                this.trayEl.style.display = displayVal;
                this._lastAppliedDisplay = displayVal;
            }

            // Restore any previously pushed elements so ComfyUI's native grid manages canvas and floating menus cleanly
            this.restorePushedElements();
            return;
        }

        // 2. Fallback for non-grid / legacy ComfyUI layout
        if (this.trayEl.parentElement !== document.body) {
            document.body.appendChild(this.trayEl);
        }
        this.trayEl.style.position = "fixed";
        this.trayEl.style.zIndex = "1000";
        this.trayEl.style.left = "0px";
        this.trayEl.style.right = "0px";
        this.trayEl.style.bottom = "0px";
    }

    restorePushedElements() {
        if (!this.pushedElements || this.pushedElements.size === 0) return;
        for (const el of this.pushedElements) {
            if (el && el.isConnected) {
                if (el.dataset.zitOrigStyle) {
                    el.style.setProperty("bottom", el.dataset.zitOrigStyle);
                } else {
                    el.style.removeProperty("bottom");
                }
                delete el.dataset.zitPushed;
                delete el.dataset.zitBaseBottom;
                delete el.dataset.zitOrigStyle;
            }
        }
        this.pushedElements.clear();
    }

    // ── Event Handlers ────────────────────────────────────────────────────────
    setupEventListeners() {
        const header = this.trayEl.querySelector("#zit-header-bar");

        // Initial bottom offset computation
        this.updateBottomOffset();
        window.addEventListener("resize", () => this.updateBottomOffset());

        // React dynamically to Deck Studio activation without subtree recursion
        try {
            const bodyObserver = new MutationObserver(() => {
                if (this.isUpdatingBottom) return;
                if (this.offsetDebounce) clearTimeout(this.offsetDebounce);
                this.offsetDebounce = setTimeout(() => this.updateBottomOffset(), 120);
            });
            bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        } catch (_) {}

        // React to bottom container layout changes via efficient ResizeObserver
        try {
            const bodyBottom = document.querySelector(".comfyui-body-bottom") || document.getElementById("comfyui-body-bottom");
            if (bodyBottom && window.ResizeObserver) {
                const ro = new ResizeObserver(() => {
                    if (this.isUpdatingBottom) return;
                    this.updateBottomOffset();
                });
                ro.observe(bodyBottom);
            }
        } catch (_) {}

        // Lightweight heartbeat to ensure positioning if DOM moved
        setInterval(() => {
            if (this.isEnabled && !this.trayEl.isConnected) {
                this.updateBottomOffset();
            }
        }, 8000);

        // Header click toggles collapse (unless clicking action buttons)
        header.onclick = (e) => {
            if (e.target.closest(".zit-action-btn")) return;
            this.toggleCollapse();
        };

        // Refresh
        this.trayEl.querySelector("#zit-btn-refresh").onclick = (e) => {
            e.stopPropagation();
            this.fetchRecentOutputs();
        };

        // Clear
        this.trayEl.querySelector("#zit-btn-clear").onclick = (e) => {
            e.stopPropagation();
            this.items = [];
            this.renderFilmstrip();
        };

        // Size Toggle
        this.trayEl.querySelector("#zit-btn-size").onclick = (e) => {
            e.stopPropagation();
            if (this.size === "small") {
                this.size = "medium";
            } else if (this.size === "medium") {
                this.size = "large";
            } else {
                this.size = "small";
            }
            this.filmstripEl.classList.remove("zit-size-small", "zit-size-large");
            if (this.size === "small") this.filmstripEl.classList.add("zit-size-small");
            if (this.size === "large") this.filmstripEl.classList.add("zit-size-large");
            this.sizeLabel.textContent = this.size.charAt(0).toUpperCase() + this.size.slice(1);
            setTimeout(() => this.updateBottomOffset(), 50);
        };

        // Disable Button
        const disableBtn = this.trayEl.querySelector("#zit-btn-disable");
        if (disableBtn) {
            disableBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm("Disable the Image Tray? You can re-enable it anytime in ComfyUI Settings or by pressing Alt+T.")) {
                    this.setEnabled(false, true);
                }
            };
        }
        // Horizontal mouse-wheel scroll on the filmstrip (instant 1:1 scroll without animation queue lag)
        if (this.filmstripEl) {
            this.filmstripEl.style.scrollBehavior = "auto";

            this.filmstripEl.addEventListener("wheel", (e) => {
                let delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
                if (delta === 0) return;
                if (e.deltaMode === 1) delta *= 28;
                else if (e.deltaMode === 2) delta *= 100;
                e.preventDefault();
                e.stopPropagation();
                this.filmstripEl.scrollLeft += delta;
            }, { passive: false });

            // Click-and-drag mouse panning on the filmstrip (instant 1:1 cursor tracking)
            let isDown = false;
            let startX = 0;
            let scrollStart = 0;
            let hasDragged = false;

            this.filmstripEl.addEventListener("mousedown", (e) => {
                if (e.target.closest("button") || e.target.closest(".zit-quick-btn")) return;
                isDown = true;
                hasDragged = false;
                startX = e.pageX - this.filmstripEl.offsetLeft;
                scrollStart = this.filmstripEl.scrollLeft;
            });

            window.addEventListener("mouseup", () => {
                isDown = false;
            });

            this.filmstripEl.addEventListener("mousemove", (e) => {
                if (!isDown) return;
                const x = e.pageX - this.filmstripEl.offsetLeft;
                const walk = (x - startX) * 1.5;
                if (Math.abs(walk) > 4) {
                    hasDragged = true;
                }
                this.filmstripEl.scrollLeft = scrollStart - walk;
            });

            this.filmstripEl.addEventListener("click", (e) => {
                if (hasDragged) {
                    e.preventDefault();
                    e.stopPropagation();
                    hasDragged = false;
                }
            }, true);
        }

        // ComfyUI Real-time Execution Listener
        api.addEventListener("executed", (e) => {
            if (!this.isEnabled) return;
            const { output } = e.detail || {};
            if (output && output.images && output.images.length > 0) {
                for (const img of output.images) {
                    this.addImage({
                        filename: img.filename,
                        subfolder: img.subfolder || "",
                        type: img.type || "output",
                        timestamp: Date.now()
                    }, true);
                }
            }
        });
    }

    // ── Keyboard Shortcuts ────────────────────────────────────────────────────
    setupKeyboardShortcuts() {
        window.addEventListener("keydown", (e) => {
            // Alt + T or F10 to toggle Image Tray (re-enables if disabled)
            if ((e.altKey && e.code === "KeyT") || e.code === "F10") {
                e.preventDefault();
                if (!this.isEnabled) {
                    this.setEnabled(true, true);
                } else {
                    this.toggleCollapse();
                }
                return;
            }

            // Esc closes Lightbox if open
            if (e.code === "Escape") {
                const lb = document.querySelector(".zit-lightbox-overlay");
                if (lb) lb.remove();
            }
        });
    }

    // ── Fetch Recent Output Images from Server ────────────────────────────────
    async fetchRecentOutputs() {
        if (!this.isEnabled) return;
        try {
            const res = await fetch("/zombiehaus/gallery/list?sort=date&limit=40");
            const data = await res.json();
            if (data?.success && data.data?.images) {
                const images = data.data.images;
                const stats = data.data.imageStats || {};

                // Sort newest first
                const sorted = [...images].sort((a, b) => {
                    const timeA = stats[a]?.modified || 0;
                    const timeB = stats[b]?.modified || 0;
                    return timeB - timeA;
                }).slice(0, 40);

                this.items = sorted.map((filename) => ({
                    filename,
                    subfolder: "",
                    type: "output",
                    timestamp: (stats[filename]?.modified || 0) * 1000
                }));

                this.renderFilmstrip();
            }
        } catch (err) {
            console.warn("[Zombiehaus Image Tray] Failed to fetch recent outputs:", err);
        }
    }

    // ── Create Single Card DOM Element ─────────────────────────────────────────
    createCardElement(item, isNew = false) {
        const card = document.createElement("div");
        card.className = "zit-card";
        card.dataset.filename = item.filename;
        card.dataset.subfolder = item.subfolder || "";
        if (isNew) {
            card.classList.add("zit-card-new");
        }

        const fullUrl = this.getViewUrl(item);
        const thumbUrl = this.getThumbnailUrl(item, 256);

        card.innerHTML = `
            <img data-src="${thumbUrl}" class="zit-card-img" decoding="async" alt="${item.filename}" />
            <div class="zit-card-actions">
                <div class="zit-card-top-bar">
                    <span class="zit-dim-badge">OUTPUT</span>
                </div>
                <div class="zit-card-bot-bar">
                    <button type="button" class="zit-quick-btn zit-btn-view" title="Inspect & View Lightbox">🔍</button>
                    <button type="button" class="zit-quick-btn zit-btn-workflow" title="Load Embedded Workflow">📥</button>
                    <button type="button" class="zit-quick-btn zit-btn-send" title="Send to LoadImage Node">➡️</button>
                    <button type="button" class="zit-quick-btn zit-btn-copy" title="Copy to Clipboard">📋</button>
                </div>
            </div>
        `;

        const imgEl = card.querySelector("img.zit-card-img");
        imgEl.onerror = () => {
            if (imgEl.src && imgEl.src !== fullUrl) {
                imgEl.src = fullUrl;
            }
        };

        if (this.imageObserver) {
            this.imageObserver.observe(card);
        } else {
            imgEl.src = thumbUrl;
            imgEl.onload = () => { imgEl.classList.add("zit-loaded"); };
        }

        // Card Click -> Open Lightbox
        card.onclick = () => this.openLightbox(item, fullUrl);

        // Button actions
        card.querySelector(".zit-btn-view").onclick = (e) => {
            e.stopPropagation();
            this.openLightbox(item, fullUrl);
        };

        card.querySelector(".zit-btn-workflow").onclick = (e) => {
            e.stopPropagation();
            this.loadWorkflowFromImage(fullUrl);
        };

        card.querySelector(".zit-btn-send").onclick = (e) => {
            e.stopPropagation();
            this.sendToLoadImage(item.filename);
        };

        card.querySelector(".zit-btn-copy").onclick = async (e) => {
            e.stopPropagation();
            await this.copyImageToClipboard(fullUrl);
        };

        return card;
    }

    // ── Add Single Image to Tray ──────────────────────────────────────────────
    addImage(imgObj, isNew = false) {
        if (!this.isEnabled) return;

        // Prevent duplicates in state
        this.items = this.items.filter((item) => !(item.filename === imgObj.filename && item.subfolder === imgObj.subfolder));
        this.items.unshift(imgObj);

        if (this.items.length > this.maxItems) {
            this.items.pop();
        }

        this.countBadge.textContent = this.items.length;

        // Fast O(1) DOM prepend instead of wiping and rebuilding all cards
        if (this.filmstripEl) {
            const emptyMsg = this.filmstripEl.querySelector(".zit-empty-msg");
            if (emptyMsg) {
                emptyMsg.remove();
            }

            // Remove existing DOM card for this item if present
            const escapedName = (window.CSS && CSS.escape ? CSS.escape(imgObj.filename) : imgObj.filename.replace(/"/g, '\\"'));
            const existingCard = this.filmstripEl.querySelector(`.zit-card[data-filename="${escapedName}"]`);
            if (existingCard) {
                if (this.imageObserver) {
                    this.imageObserver.unobserve(existingCard);
                }
                existingCard.remove();
            }

            const newCard = this.createCardElement(imgObj, isNew);
            this.filmstripEl.prepend(newCard);

            // Trim trailing cards from DOM if exceeding maxItems
            while (this.filmstripEl.children.length > this.maxItems) {
                const removed = this.filmstripEl.lastElementChild;
                if (removed) {
                    if (this.imageObserver) {
                        this.imageObserver.unobserve(removed);
                    }
                    removed.remove();
                }
            }
        }

        // Auto-expand tray if collapsed and new image arrives
        if (isNew && this.isCollapsed && this.isEnabled) {
            this.isCollapsed = false;
            this.trayEl.classList.remove("zit-collapsed");
        }
    }

    // ── Render Filmstrip ──────────────────────────────────────────────────────
    renderFilmstrip(newFilename = null) {
        if (!this.isEnabled) return;
        this.countBadge.textContent = this.items.length;

        if (this.items.length === 0) {
            if (this.imageObserver) {
                this.imageObserver.disconnect();
            }
            this.filmstripEl.innerHTML = `
                <div class="zit-empty-msg">No images yet. Generated outputs will appear here in real time.</div>
            `;
            return;
        }

        if (this.imageObserver) {
            this.imageObserver.disconnect();
        }

        // Batch DOM update with DocumentFragment to prevent repeated layout reflows
        const fragment = document.createDocumentFragment();
        for (const item of this.items) {
            const isNew = newFilename && item.filename === newFilename;
            fragment.appendChild(this.createCardElement(item, isNew));
        }

        this.filmstripEl.innerHTML = "";
        this.filmstripEl.appendChild(fragment);
    }

    // ── Toggle Collapse / Hide ────────────────────────────────────────────────
    toggleCollapse() {
        if (!this.isEnabled) {
            this.setEnabled(true, true);
            return;
        }
        this.isCollapsed = !this.isCollapsed;
        this.trayEl.classList.toggle("zit-collapsed", this.isCollapsed);
        this.updateBottomOffset();
    }

    toggleHidden() {
        if (!this.isEnabled) return;
        this.isHidden = !this.isHidden;
        this.trayEl.classList.toggle("zit-hidden", this.isHidden);
        this.updateBottomOffset();
    }

    // ── Lightbox & Metadata Inspector with Top Filmstrip & Focal Zoom ───────
    async openLightbox(item, url) {
        const existing = document.querySelector(".zit-lightbox-overlay");
        if (existing) existing.remove();

        if (!document.getElementById("zit-lb-styles")) {
            const style = document.createElement("style");
            style.id = "zit-lb-styles";
            style.textContent = `
                .zit-lightbox-modal {
                    display: flex;
                    flex-direction: row;
                }
                .zit-lightbox-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                    background: #090a10;
                }
                .zit-lb-strip-wrap {
                    width: 100%;
                    height: 76px;
                    min-height: 76px;
                    flex-shrink: 0;
                    background: rgba(10, 12, 20, 0.95);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    position: relative;
                    z-index: 20;
                    box-sizing: border-box;
                }
                .zit-lb-strip {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    overflow-x: auto;
                    overflow-y: hidden;
                    width: 100%;
                    height: 100%;
                    padding: 8px 68px 8px 16px;
                    box-sizing: border-box;
                    scroll-behavior: smooth;
                    user-select: none;
                }
                .zit-lb-strip::-webkit-scrollbar {
                    height: 5px;
                }
                .zit-lb-strip::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.25);
                }
                .zit-lb-strip::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.22);
                    border-radius: 4px;
                }
                .zit-lb-strip::-webkit-scrollbar-thumb:hover {
                    background: #a855f7;
                }
                .zit-lb-thumb {
                    height: 56px;
                    width: 64px;
                    min-width: 64px;
                    max-width: 84px;
                    border-radius: 6px;
                    overflow: hidden;
                    cursor: pointer;
                    border: 2px solid rgba(255, 255, 255, 0.12);
                    opacity: 0.55;
                    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                    flex-shrink: 0;
                    background: #090a10;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    position: relative;
                }
                .zit-lb-thumb:hover {
                    opacity: 0.95;
                    border-color: rgba(255, 255, 255, 0.5);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                }
                .zit-lb-thumb.zit-lb-thumb-active {
                    opacity: 1;
                    border-color: #a855f7;
                    box-shadow: 0 0 14px rgba(168, 85, 247, 0.75), 0 2px 8px rgba(0, 0, 0, 0.6);
                    transform: scale(1.06);
                    z-index: 2;
                }
                .zit-lb-thumb img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    pointer-events: none;
                    display: block;
                }
                .zit-lightbox-close {
                    z-index: 30 !important;
                    top: 18px !important;
                    right: 18px !important;
                }
                .zit-lightbox-viewport {
                    flex: 1;
                    width: 100%;
                    height: calc(100% - 76px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    position: relative;
                }
            `;
            document.head.appendChild(style);
        }

        const overlay = document.createElement("div");
        overlay.className = "zit-lightbox-overlay";
        overlay.innerHTML = `
            <div class="zit-lightbox-modal">
                <div class="zit-lightbox-main">
                    <div class="zit-lb-strip-wrap" id="zit-lb-strip-wrap">
                        <div class="zit-lb-strip" id="zit-lb-strip"></div>
                    </div>
                    <button type="button" class="zit-lightbox-close" id="zit-lb-close" title="Close Lightbox (Esc)">✕</button>
                    <button type="button" class="zit-lightbox-nav zit-lightbox-prev" id="zit-lb-prev" title="Previous Image (Left Arrow)">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; margin-right: 2px;">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <button type="button" class="zit-lightbox-nav zit-lightbox-next" id="zit-lb-next" title="Next Image (Right Arrow)">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; margin-left: 2px;">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                    <div class="zit-lightbox-viewport" id="zit-lb-viewport" title="Click to Zoom · Scroll to Zoom at Cursor · Drag to Pan">
                        <img src="${url}" class="zit-lightbox-image" id="zit-lb-img" alt="${item.filename}" draggable="false" />
                    </div>
                    <div class="zit-zoom-toolbar">
                        <button type="button" class="zit-zoom-btn" id="zit-zoom-out" title="Zoom Out">-</button>
                        <span class="zit-zoom-level-badge" id="zit-zoom-badge">Fit</span>
                        <button type="button" class="zit-zoom-btn" id="zit-zoom-in" title="Zoom In">+</button>
                        <button type="button" class="zit-zoom-btn" id="zit-zoom-100" title="100% Native Resolution">1:1</button>
                        <button type="button" class="zit-zoom-btn" id="zit-zoom-fit" title="Reset to Fit View">⊡ Fit</button>
                    </div>
                </div>
                <div class="zit-lightbox-sidebar">
                    <div class="zit-sidebar-title" style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>Image Details</span>
                            <span id="zit-lb-count" style="font-size: 11px; font-weight: 600; color: #a855f7; font-family: var(--zit-font-mono, monospace);"></span>
                        </div>
                        <span id="zit-lb-filename" style="font-size: 11px; font-weight: normal; color: var(--zit-text-muted); max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.filename}">${item.filename}</span>
                    </div>

                    <div class="zit-sidebar-actions">
                        <button type="button" class="zit-sidebar-btn zit-btn-accent" id="zit-lb-load-wf">
                            <span>📥</span> Load This Workflow
                        </button>
                        <button type="button" class="zit-sidebar-btn" id="zit-lb-send-node">
                            <span>➡️</span> Send to LoadImage Node
                        </button>
                        <button type="button" class="zit-sidebar-btn" id="zit-lb-copy">
                            <span>📋</span> Copy Image to Clipboard
                        </button>
                        <a href="${url}" download="${item.filename}" class="zit-sidebar-btn" id="zit-lb-download" style="text-decoration: none;">
                            <span>⬇️</span> Download File
                        </a>
                        <a href="${url}" target="_blank" class="zit-sidebar-btn" id="zit-lb-tab" style="text-decoration: none;">
                            <span>🔗</span> Open in New Tab
                        </a>
                    </div>

                    <div style="font-size: 12px; font-weight: 700; color: #a855f7; margin-top: 6px;">Metadata & Generation Info</div>
                    <div class="zit-meta-box" id="zit-lb-meta">Loading metadata...</div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const stripEl = overlay.querySelector("#zit-lb-strip");
        const viewport = overlay.querySelector("#zit-lb-viewport");
        const img = overlay.querySelector("#zit-lb-img");
        const zoomBadge = overlay.querySelector("#zit-zoom-badge");
        const prevBtn = overlay.querySelector("#zit-lb-prev");
        const nextBtn = overlay.querySelector("#zit-lb-next");
        const filenameEl = overlay.querySelector("#zit-lb-filename");
        const countEl = overlay.querySelector("#zit-lb-count");
        const downloadLink = overlay.querySelector("#zit-lb-download");
        const tabLink = overlay.querySelector("#zit-lb-tab");
        const metaEl = overlay.querySelector("#zit-lb-meta");

        // Style the navigation buttons centered over the viewport
        const navBtnBaseStyle = `
            position: absolute;
            top: calc(50% + 38px);
            transform: translateY(-50%);
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(14, 16, 26, 0.78);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.16);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 15;
            transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.15);
            user-select: none;
            outline: none;
            padding: 0;
        `;
        prevBtn.style.cssText = navBtnBaseStyle + "left: 20px;";
        nextBtn.style.cssText = navBtnBaseStyle + "right: 20px;";

        let activeItem = item;
        let activeUrl = url;
        let currentIndex = this.items.findIndex((i) => i.filename === item.filename);
        if (currentIndex < 0) {
            currentIndex = 0;
        }

        // Populate top horizontally scrollable image strip
        const populateStrip = () => {
            if (!stripEl) return;
            stripEl.innerHTML = "";
            this.items.forEach((it, idx) => {
                const thumb = document.createElement("div");
                thumb.className = `zit-lb-thumb ${idx === currentIndex ? "zit-lb-thumb-active" : ""}`;
                thumb.dataset.index = idx;
                thumb.title = it.filename || `Image ${idx + 1}`;

                const thumbImg = document.createElement("img");
                const thumbUrl = this.getThumbnailUrl(it, 160);
                const fullViewUrl = this.getViewUrl(it);
                thumbImg.src = thumbUrl;
                thumbImg.alt = it.filename || "";
                thumbImg.loading = "lazy";
                thumbImg.decoding = "async";
                thumbImg.draggable = false;
                thumbImg.onerror = () => {
                    if (thumbImg.src !== fullViewUrl) thumbImg.src = fullViewUrl;
                };

                thumb.appendChild(thumbImg);
                thumb.onclick = (e) => {
                    e.stopPropagation();
                    const targetIdx = parseInt(thumb.dataset.index, 10);
                    if (!isNaN(targetIdx) && targetIdx !== currentIndex) {
                        navigateTo(targetIdx);
                    }
                };
                stripEl.appendChild(thumb);
            });
        };
        populateStrip();

        if (stripEl) {
            stripEl.addEventListener("wheel", (e) => {
                let delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
                if (delta === 0) return;
                if (e.deltaMode === 1) delta *= 28;
                else if (e.deltaMode === 2) delta *= 100;
                e.preventDefault();
                e.stopPropagation();
                stripEl.scrollBy({ left: delta, behavior: "auto" });
            }, { passive: false });
        }

        const setupNavBtnHover = (btn, isNext) => {
            btn.onmouseenter = () => {
                const isAtBoundary = isNext ? (currentIndex >= this.items.length - 1) : (currentIndex <= 0);
                if (isAtBoundary) return;
                btn.style.background = "rgba(168, 85, 247, 0.35)";
                btn.style.borderColor = "rgba(168, 85, 247, 0.8)";
                btn.style.transform = "translateY(-50%) scale(1.1)";
                btn.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.75), 0 0 20px rgba(168, 85, 247, 0.5)";
            };
            btn.onmouseleave = () => {
                btn.style.background = "rgba(14, 16, 26, 0.78)";
                btn.style.borderColor = "rgba(255, 255, 255, 0.16)";
                btn.style.transform = "translateY(-50%) scale(1)";
                btn.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.15)";
            };
            btn.onmousedown = () => {
                const isAtBoundary = isNext ? (currentIndex >= this.items.length - 1) : (currentIndex <= 0);
                if (isAtBoundary) return;
                btn.style.transform = "translateY(-50%) scale(0.95)";
            };
            btn.onmouseup = () => {
                const isAtBoundary = isNext ? (currentIndex >= this.items.length - 1) : (currentIndex <= 0);
                if (isAtBoundary) return;
                btn.style.transform = "translateY(-50%) scale(1.1)";
            };
        };
        setupNavBtnHover(prevBtn, false);
        setupNavBtnHover(nextBtn, true);

        const updateNavState = () => {
            const hasMultiple = this.items && this.items.length > 1;
            if (!hasMultiple) {
                prevBtn.style.display = "none";
                nextBtn.style.display = "none";
                if (countEl) countEl.textContent = "";
            } else {
                prevBtn.style.display = "flex";
                nextBtn.style.display = "flex";
                if (countEl) countEl.textContent = `${currentIndex + 1} / ${this.items.length}`;

                const isFirst = currentIndex <= 0;
                const isLast = currentIndex >= this.items.length - 1;

                prevBtn.style.opacity = isFirst ? "0.2" : "1";
                prevBtn.style.cursor = isFirst ? "not-allowed" : "pointer";

                nextBtn.style.opacity = isLast ? "0.2" : "1";
                nextBtn.style.cursor = isLast ? "not-allowed" : "pointer";
            }

            // Sync active thumbnail in top strip and scroll into view
            if (stripEl) {
                const thumbs = stripEl.querySelectorAll(".zit-lb-thumb");
                thumbs.forEach((th, i) => {
                    if (i === currentIndex) {
                        th.classList.add("zit-lb-thumb-active");
                        th.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                    } else {
                        th.classList.remove("zit-lb-thumb-active");
                    }
                });
            }
        };

        const parsePngMetadata = async (imageUrl) => {
            try {
                const res = await fetch(imageUrl);
                const buf = await res.arrayBuffer();
                const view = new DataView(buf);
                if (buf.byteLength < 8) return null;
                // Verify PNG signature (0x89504E47, 0x0D0A1A0A)
                if (view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a) {
                    return null;
                }
                let offset = 8;
                const result = {};
                const utf8 = new TextDecoder("utf-8");
                const latin1 = new TextDecoder("latin1");

                while (offset + 8 <= buf.byteLength) {
                    const length = view.getUint32(offset);
                    const type = String.fromCharCode(
                        view.getUint8(offset + 4),
                        view.getUint8(offset + 5),
                        view.getUint8(offset + 6),
                        view.getUint8(offset + 7)
                    );
                    const chunkDataOffset = offset + 8;
                    if (chunkDataOffset + length > buf.byteLength) break;

                    if (type === "tEXt") {
                        const bytes = new Uint8Array(buf, chunkDataOffset, length);
                        const nullIdx = bytes.indexOf(0);
                        if (nullIdx > 0) {
                            const key = latin1.decode(bytes.subarray(0, nullIdx));
                            const val = latin1.decode(bytes.subarray(nullIdx + 1));
                            try {
                                result[key] = JSON.parse(val);
                            } catch (_) {
                                result[key] = val;
                            }
                        }
                    } else if (type === "iTXt") {
                        const bytes = new Uint8Array(buf, chunkDataOffset, length);
                        const nullIdx = bytes.indexOf(0);
                        if (nullIdx > 0) {
                            const key = utf8.decode(bytes.subarray(0, nullIdx));
                            const compFlag = bytes[nullIdx + 1];
                            if (compFlag === 0) {
                                const secondNull = bytes.indexOf(0, nullIdx + 3);
                                const thirdNull = secondNull >= 0 ? bytes.indexOf(0, secondNull + 1) : -1;
                                const textStart = thirdNull >= 0 ? thirdNull + 1 : nullIdx + 3;
                                const val = utf8.decode(bytes.subarray(textStart));
                                try {
                                    result[key] = JSON.parse(val);
                                } catch (_) {
                                    result[key] = val;
                                }
                            }
                        }
                    } else if (type === "IEND") {
                        break;
                    }

                    offset += 12 + length;
                }
                return Object.keys(result).length > 0 ? result : null;
            } catch (_) {
                return null;
            }
        };

        const loadMetadata = async (curItem, curUrl) => {
            metaEl.textContent = "Loading metadata...";
            try {
                const filename = typeof curItem === "object" ? curItem.filename : curItem;
                const subfolder = (typeof curItem === "object" ? curItem.subfolder : "") || "";
                const imgUrl = curUrl || (typeof curItem === "object" && curItem.url) || `/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=output`;

                let info = null;

                // 1. Primary: fetch from backend gallery metadata endpoint with correct query parameters
                try {
                    const metaRes = await fetch(`/zombiehaus/gallery/metadata?filename=${encodeURIComponent(filename)}&path=${encodeURIComponent(subfolder)}`);
                    const metaData = await metaRes.json();
                    if (metaData?.success && (metaData.metadata || metaData.data)) {
                        info = metaData.metadata || metaData.data;
                    }
                } catch (e) {
                    console.warn("[Zombiehaus Image Tray] Gallery metadata endpoint fetch failed:", e);
                }

                // 2. Fallback: direct PNG header parse if backend metadata missing or image is newly generated
                if (!info || (!info.prompt && !info.workflow && !info.parameters)) {
                    try {
                        const directMeta = await parsePngMetadata(imgUrl);
                        if (directMeta) {
                            info = Object.assign({}, directMeta, info || {});
                        }
                    } catch (e) {
                        console.warn("[Zombiehaus Image Tray] Direct PNG chunk parse failed:", e);
                    }
                }

                if (info && (info.prompt || info.workflow || info.parameters || info._image_info || info._file_info)) {
                    const sections = [];

                    // Extract high-level generation parameters if prompt node graph is present
                    const promptNodes = [];
                    let samplerInfo = null;
                    let modelName = "";
                    const loras = [];

                    if (info.prompt && typeof info.prompt === "object") {
                        for (const [nodeId, nodeData] of Object.entries(info.prompt)) {
                            const cls = nodeData?.class_type || "";
                            const inputs = nodeData?.inputs || {};
                            if (cls.includes("CLIPTextEncode") || cls.includes("PromptRefiner") || cls.includes("ShowText") || cls.includes("ZombiehausTextEditor")) {
                                if (inputs.text && typeof inputs.text === "string" && inputs.text.trim()) {
                                    promptNodes.push(inputs.text.trim());
                                }
                            }
                            if (cls.includes("KSampler")) {
                                samplerInfo = inputs;
                            }
                            if (cls.includes("CheckpointLoader") && inputs.ckpt_name) {
                                modelName = inputs.ckpt_name;
                            }
                            if (cls.includes("LoraLoader") || cls.includes("LoRALoader")) {
                                if (inputs.lora_name) {
                                    loras.push(`${inputs.lora_name} (strength: ${inputs.strength_model ?? 1.0})`);
                                }
                            }
                        }
                    }

                    if (modelName) {
                        sections.push(`--- MODEL ---\n${modelName}`);
                    }

                    if (loras.length > 0) {
                        sections.push(`--- LORAS ---\n${loras.join("\n")}`);
                    }

                    if (samplerInfo) {
                        const lines = ["--- GENERATION SETTINGS ---"];
                        if (samplerInfo.seed !== undefined) lines.push(`Seed: ${samplerInfo.seed}`);
                        if (samplerInfo.steps !== undefined) lines.push(`Steps: ${samplerInfo.steps}`);
                        if (samplerInfo.cfg !== undefined) lines.push(`CFG: ${samplerInfo.cfg}`);
                        if (samplerInfo.sampler_name) lines.push(`Sampler: ${samplerInfo.sampler_name}`);
                        if (samplerInfo.scheduler) lines.push(`Scheduler: ${samplerInfo.scheduler}`);
                        if (samplerInfo.denoise !== undefined) lines.push(`Denoise: ${samplerInfo.denoise}`);
                        sections.push(lines.join("\n"));
                    }

                    if (promptNodes.length > 0) {
                        const uniquePrompts = [...new Set(promptNodes)];
                        sections.push(`--- PROMPT TEXT ---\n${uniquePrompts.join("\n\n---\n\n")}`);
                    }

                    if (info.parameters && typeof info.parameters === "string") {
                        sections.push(`--- RAW PARAMETERS ---\n${info.parameters}`);
                    }

                    if (info.prompt) {
                        sections.push(`--- NODE GRAPH (PROMPT JSON) ---\n${typeof info.prompt === "object" ? JSON.stringify(info.prompt, null, 2) : info.prompt}`);
                    }

                    if (info.workflow) {
                        sections.push(`--- EMBEDDED WORKFLOW ---\n(Full graph data available · Click "Load This Workflow" to restore canvas)`);
                    }

                    if (info._image_info || info._file_info) {
                        sections.push(`--- FILE DETAILS ---\n${JSON.stringify({ ...(info._image_info || {}), ...(info._file_info || {}) }, null, 2)}`);
                    }

                    metaEl.textContent = sections.join("\n\n") || JSON.stringify(info, null, 2);
                } else {
                    metaEl.textContent = "No generation metadata found in image headers.";
                }
            } catch (err) {
                console.error("[Zombiehaus Image Tray] Error reading metadata:", err);
                metaEl.textContent = "Unable to read metadata.";
            }
        };

        const navigateTo = (index) => {
            if (index < 0 || index >= this.items.length) return;
            currentIndex = index;
            const curItem = this.items[currentIndex];
            const curUrl = curItem.url || `/view?filename=${encodeURIComponent(curItem.filename)}&subfolder=${encodeURIComponent(curItem.subfolder || "")}&type=${encodeURIComponent(curItem.type || "output")}`;

            activeItem = curItem;
            activeUrl = curUrl;

            resetZoom();

            img.style.opacity = "0.5";
            img.src = curUrl;
            img.alt = curItem.filename;
            img.onload = () => { img.style.opacity = "1"; };
            img.onerror = () => { img.style.opacity = "1"; };

            if (filenameEl) {
                filenameEl.textContent = curItem.filename;
                filenameEl.title = curItem.filename;
            }

            if (downloadLink) {
                downloadLink.href = curUrl;
                downloadLink.download = curItem.filename;
            }
            if (tabLink) {
                tabLink.href = curUrl;
            }

            updateNavState();
            loadMetadata(curItem, curUrl);
        };

        prevBtn.onclick = (e) => {
            e.stopPropagation();
            if (currentIndex > 0) {
                navigateTo(currentIndex - 1);
            }
        };

        nextBtn.onclick = (e) => {
            e.stopPropagation();
            if (currentIndex < this.items.length - 1) {
                navigateTo(currentIndex + 1);
            }
        };

        // ── Zoom, Pan & Cursor-Focal Scroll Interactive State ────────────────
        let scale = 1.0;
        let panX = 0;
        let panY = 0;
        let isZoomed = false;
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let downX = 0;
        let downY = 0;
        let hasMoved = false;

        const updateTransform = (withTransition = true) => {
            img.style.transition = withTransition ? "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)" : "none";
            img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
            zoomBadge.textContent = scale <= 1.05 ? "Fit" : `${Math.round(scale * 100)}%`;
            viewport.classList.toggle("zit-is-zoomed", scale > 1.05);
            viewport.title = scale > 1.05
                ? "Click to Zoom Out · Drag to Pan · Scroll to Zoom"
                : "Click to Zoom In · Drag to Pan · Scroll to Zoom";
        };

        // Precise focal zoom maintaining the spot under (clientX, clientY)
        const zoomAt = (targetScale, clientX, clientY, withTransition = true) => {
            const vRect = viewport.getBoundingClientRect();
            const centerX = vRect.left + vRect.width / 2;
            const centerY = vRect.top + vRect.height / 2;
            const mouseX = clientX - centerX;
            const mouseY = clientY - centerY;

            let newScale = Math.min(12.0, Math.max(1.0, targetScale));

            if (newScale <= 1.02) {
                scale = 1.0;
                panX = 0;
                panY = 0;
                isZoomed = false;
            } else {
                const ratio = newScale / scale;
                panX = mouseX - (mouseX - panX) * ratio;
                panY = mouseY - (mouseY - panY) * ratio;
                scale = newScale;
                isZoomed = true;
            }

            updateTransform(withTransition);
        };

        const resetZoom = () => {
            scale = 1.0;
            panX = 0;
            panY = 0;
            isZoomed = false;
            updateTransform(true);
        };

        // Mouse Down for dragging / pan
        viewport.onmousedown = (e) => {
            if (e.button !== 0) return;
            if (e.target.closest(".zit-zoom-toolbar") || e.target.closest("#zit-lb-close") || e.target.closest("#zit-lb-prev") || e.target.closest("#zit-lb-next") || e.target.closest("#zit-lb-strip-wrap")) return;
            isDragging = true;
            hasMoved = false;
            downX = e.clientX;
            downY = e.clientY;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
            if (dist > 5) {
                hasMoved = true;
                viewport.classList.add("zit-is-dragging");
            }
            if (hasMoved) {
                panX = e.clientX - startX;
                panY = e.clientY - startY;
                updateTransform(false);
            }
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                viewport.classList.remove("zit-is-dragging");
            }
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        // Click on image: if user didn't drag, zoom in / out
        viewport.onclick = (e) => {
            if (e.target.closest(".zit-zoom-toolbar") || e.target.closest("#zit-lb-close") || e.target.closest("#zit-lb-prev") || e.target.closest("#zit-lb-next") || e.target.closest("#zit-lb-strip-wrap")) return;
            if (hasMoved) return; // User dragged to pan, don't trigger zoom click

            if (!isZoomed) {
                // Click zooms in to 2.5x centered on click location
                zoomAt(2.5, e.clientX, e.clientY, true);
            } else {
                // Click again resets back to Fit view
                resetZoom();
            }
        };

        // Scroll wheel on image: zoom focused on the area the cursor is pointing to
        viewport.onwheel = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
            const targetScale = scale * zoomFactor;

            zoomAt(targetScale, e.clientX, e.clientY, false);
        };

        // Toolbar Zoom buttons
        overlay.querySelector("#zit-zoom-in").onclick = (e) => {
            e.stopPropagation();
            const vRect = viewport.getBoundingClientRect();
            zoomAt(scale * 1.25, vRect.left + vRect.width / 2, vRect.top + vRect.height / 2, true);
        };
        overlay.querySelector("#zit-zoom-out").onclick = (e) => {
            e.stopPropagation();
            const vRect = viewport.getBoundingClientRect();
            zoomAt(scale * 0.8, vRect.left + vRect.width / 2, vRect.top + vRect.height / 2, true);
        };
        overlay.querySelector("#zit-zoom-100").onclick = (e) => {
            e.stopPropagation();
            const vRect = viewport.getBoundingClientRect();
            zoomAt(1.0, vRect.left + vRect.width / 2, vRect.top + vRect.height / 2, true);
        };
        overlay.querySelector("#zit-zoom-fit").onclick = (e) => {
            e.stopPropagation();
            resetZoom();
        };

        const onKeyDown = (e) => {
            if (e.code === "ArrowLeft" || e.key === "ArrowLeft") {
                if (currentIndex > 0) {
                    e.preventDefault();
                    navigateTo(currentIndex - 1);
                }
            } else if (e.code === "ArrowRight" || e.key === "ArrowRight") {
                if (currentIndex < this.items.length - 1) {
                    e.preventDefault();
                    navigateTo(currentIndex + 1);
                }
            }
        };
        window.addEventListener("keydown", onKeyDown);

        const close = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("keydown", onKeyDown);
            overlay.remove();
        };
        overlay.querySelector("#zit-lb-close").onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };

        overlay.querySelector("#zit-lb-load-wf").onclick = () => {
            this.loadWorkflowFromImage(activeUrl);
            close();
        };

        overlay.querySelector("#zit-lb-send-node").onclick = () => {
            this.sendToLoadImage(activeItem.filename);
            close();
        };

        overlay.querySelector("#zit-lb-copy").onclick = () => {
            this.copyImageToClipboard(activeUrl);
        };

        // Initialize navigation states and fetch metadata for the initial image
        updateNavState();
        loadMetadata(item, url);
    }

    // ── Load Workflow from Image File ─────────────────────────────────────────
    async loadWorkflowFromImage(imageUrl) {
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            const file = new File([blob], "image.png", { type: blob.type });

            if (app.handleFile) {
                await app.handleFile(file);
                alert("✅ Workflow loaded successfully from image!");
            }
        } catch (err) {
            console.error("[Zombiehaus Image Tray] Error loading workflow:", err);
            alert("Could not extract workflow from image.");
        }
    }

    // ── Send to LoadImage Node on Active Canvas ───────────────────────────────
    sendToLoadImage(filename) {
        if (!app.graph) return;

        // Find existing LoadImage node
        let targetNode = app.graph._nodes.find((n) => (n.type || "").toLowerCase().includes("loadimage"));

        if (!targetNode) {
            // Create a new LoadImage node
            targetNode = LiteGraph.createNode("LoadImage");
            if (targetNode) {
                targetNode.pos = [100, 100];
                app.graph.add(targetNode);
            }
        }

        if (targetNode) {
            const widget = targetNode.widgets?.find((w) => w.name === "image");
            if (widget) {
                widget.value = filename;
                if (widget.callback) widget.callback(filename, app.canvas, targetNode);
                targetNode.setDirtyCanvas(true, true);
                if (app.canvas) {
                    app.canvas.centerOnNode(targetNode);
                    app.canvas.selectNode(targetNode);
                }
            }
        }
    }

    // ── Copy Image to System Clipboard ────────────────────────────────────────
    async copyImageToClipboard(imageUrl) {
        try {
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            alert("📋 Image copied to clipboard!");
        } catch (err) {
            console.warn("[Zombiehaus Image Tray] Clipboard error:", err);
            alert("Clipboard permission denied or not supported.");
        }
    }
}

// ── Extension Registration ───────────────────────────────────────────────────
app.registerExtension({
    name: "zombiehaus.ImageTray",

    async setup() {
        const tray = new ZombiehausImageTray();
        window.zombiehausImageTray = tray;

        // Persistent Menu Toggle Button Injection (Unified Topbar Mount)
        const attachToggleBtn = () => {
            let btn = document.getElementById("zombiehaus-image-tray-toggle-btn");
            if (!btn) {
                btn = document.createElement("button");
                btn.id = "zombiehaus-image-tray-toggle-btn";
                btn.type = "button";
                btn.innerHTML = "<span>🖼️</span> Tray";
                btn.title = tray.isEnabled ? "Toggle Zombiehaus Image Tray (Alt+T / F10)" : "Image Tray is Disabled (Click to Enable)";
                btn.style.cssText = "display: inline-flex; align-items: center; gap: 5px; background: rgba(22, 22, 34, 0.9); border: 1px solid rgba(168, 85, 247, 0.5); border-radius: 6px; padding: 4px 10px; color: #f8fafc; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);";
                btn.onclick = (e) => {
                    e.preventDefault();
                    if (!tray.isEnabled) {
                        tray.setEnabled(true, true);
                    } else {
                        tray.toggleCollapse();
                    }
                };
            }

            // Priority 1: Zombiehaus Topbar Controls group (where Themes and Dock buttons live)
            const topbarGroup = document.getElementById("zombiehaus-topbar-controls");
            if (topbarGroup) {
                if (btn.parentElement !== topbarGroup) {
                    topbarGroup.appendChild(btn);
                    btn.style.position = "";
                    btn.style.bottom = "";
                    btn.style.right = "";
                }
                return;
            }

            // Priority 2: Next to settings in ComfyUI modern top bar
            if (window.app?.menu?.settingsGroup?.element?.parentElement) {
                if (btn.parentElement !== window.app.menu.settingsGroup.element.parentElement) {
                    window.app.menu.settingsGroup.element.before(btn);
                    btn.style.position = "";
                    btn.style.bottom = "";
                    btn.style.right = "";
                }
                return;
            }

            // Priority 3: ComfyUI top menu / action bar
            const menuBar = (
                document.querySelector(".comfyui-menu .comfyui-button-group") ||
                document.querySelector("header.comfyui-menu") ||
                document.querySelector(".comfyui-menu") ||
                document.querySelector(".action-bar") ||
                document.querySelector(".comfy-menu") ||
                document.querySelector("#comfy-menu")
            );

            if (menuBar && btn.parentElement !== menuBar) {
                menuBar.appendChild(btn);
                btn.style.position = "";
                btn.style.bottom = "";
                btn.style.right = "";
                return;
            }

            // Priority 4: Fallback fixed toggle
            if (!btn.parentElement) {
                btn.style.position = "fixed";
                btn.style.bottom = "54px";
                btn.style.right = "18px";
                document.body.appendChild(btn);
            }
        };

        attachToggleBtn();
        const trayTimer = setInterval(() => {
            attachToggleBtn();
        }, 1000);
        setTimeout(() => clearInterval(trayTimer), 15000);
    }
});
