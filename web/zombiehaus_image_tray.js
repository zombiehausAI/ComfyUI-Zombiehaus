import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * Zombiehaus Image Tray - Dockable Bottom Filmstrip & Workflow Lightbox
 * Inspired by rgthree image tray: provides a real-time horizontal stream of
 * generated outputs with one-click workflow loading, node routing, and inspection.
 */

class ZombiehausImageTray {
    constructor() {
        this.items = []; // Array of { filename, subfolder, type, url, timestamp }
        this.isCollapsed = false;
        this.isHidden = false;
        this.size = "medium"; // 'small' | 'medium' | 'large'
        this.maxItems = 100;
        this.pushedElements = new Set();
        this.isUpdatingBottom = false;

        let savedEnabled = true;
        try {
            if (typeof localStorage !== "undefined") {
                const stored = localStorage.getItem("zombiehaus_image_tray_enabled");
                if (stored !== null) savedEnabled = stored === "true";
            }
        } catch (_) {}
        this.isEnabled = savedEnabled;

        this.initDOM();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();

        if (this.isEnabled) {
            this.fetchRecentOutputs();
        } else {
            this.trayEl.style.display = "none";
        }
    }

    // ── Enable / Disable State Control ────────────────────────────────────────
    setEnabled(enabled) {
        this.isEnabled = !!enabled;
        try {
            if (typeof localStorage !== "undefined") {
                localStorage.setItem("zombiehaus_image_tray_enabled", this.isEnabled ? "true" : "false");
            }
        } catch (_) {}

        if (this.trayEl) {
            this.trayEl.style.display = this.isEnabled ? "flex" : "none";
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
        this.filmstripEl = tray.querySelector("#zit-filmstrip-container");
        this.countBadge = tray.querySelector("#zit-count-badge");
        this.sizeLabel = tray.querySelector("#zit-size-label");
        this.pushedElements = new Set();
    }

    // ── Dynamic ComfyUI Docking (Native Body-Bottom Grid Integration / rgthree pattern) ──
    updateBottomOffset() {
        if (!this.trayEl) return;

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

            this.trayEl.style.setProperty("--zit-height", `${currentHeight}px`);
            this.trayEl.style.height = `${currentHeight}px`;

            if (!this.isEnabled || this.isHidden) {
                this.trayEl.style.display = "none";
            } else {
                this.trayEl.style.display = "flex";
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

        // React dynamically to ComfyUI DOM / style / class changes
        try {
            const observer = new MutationObserver(() => {
                if (this.isUpdatingBottom) return;
                if (this.offsetDebounce) clearTimeout(this.offsetDebounce);
                this.offsetDebounce = setTimeout(() => this.updateBottomOffset(), 100);
            });
            observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
        } catch (_) {}

        // Periodic check to ensure flawless positioning across async workflow loads
        setInterval(() => this.updateBottomOffset(), 2000);

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
                    this.setEnabled(false);
                }
            };
        }
        // Horizontal mouse-wheel scroll on the filmstrip (converts vertical wheel up/down to horizontal scroll)
        if (this.filmstripEl) {
            this.filmstripEl.addEventListener("wheel", (e) => {
                let delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
                if (delta === 0) return;
                if (e.deltaMode === 1) delta *= 28;
                else if (e.deltaMode === 2) delta *= 100;
                e.preventDefault();
                e.stopPropagation();
                this.filmstripEl.scrollBy({ left: delta, behavior: "auto" });
            }, { passive: false });

            // Click-and-drag mouse panning on the filmstrip
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
                    this.setEnabled(true);
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
        try {
            const res = await fetch("/zombiehaus/gallery/list?sort=date");
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

    // ── Add Single Image to Tray ──────────────────────────────────────────────
    addImage(imgObj, isNew = false) {
        // Prevent duplicates
        this.items = this.items.filter((item) => !(item.filename === imgObj.filename && item.subfolder === imgObj.subfolder));
        this.items.unshift(imgObj);

        if (this.items.length > this.maxItems) {
            this.items.pop();
        }

        this.renderFilmstrip(isNew ? imgObj.filename : null);

        // Auto-expand tray if collapsed and new image arrives
        if (isNew && this.isCollapsed) {
            this.isCollapsed = false;
            this.trayEl.classList.remove("zit-collapsed");
        }
    }

    // ── Render Filmstrip ──────────────────────────────────────────────────────
    renderFilmstrip(newFilename = null) {
        this.countBadge.textContent = this.items.length;

        if (this.items.length === 0) {
            this.filmstripEl.innerHTML = `
                <div class="zit-empty-msg">No images yet. Generated outputs will appear here in real time.</div>
            `;
            return;
        }

        this.filmstripEl.innerHTML = "";

        for (const item of this.items) {
            const card = document.createElement("div");
            card.className = "zit-card";
            if (newFilename && item.filename === newFilename) {
                card.classList.add("zit-card-new");
            }

            const url = `/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder || "")}&type=${encodeURIComponent(item.type || "output")}`;

            card.innerHTML = `
                <img src="${url}" class="zit-card-img" loading="lazy" alt="${item.filename}" />
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

            // Card Click -> Open Lightbox
            card.onclick = () => this.openLightbox(item, url);

            // Button actions
            card.querySelector(".zit-btn-view").onclick = (e) => {
                e.stopPropagation();
                this.openLightbox(item, url);
            };

            card.querySelector(".zit-btn-workflow").onclick = (e) => {
                e.stopPropagation();
                this.loadWorkflowFromImage(url);
            };

            card.querySelector(".zit-btn-send").onclick = (e) => {
                e.stopPropagation();
                this.sendToLoadImage(item.filename);
            };

            card.querySelector(".zit-btn-copy").onclick = async (e) => {
                e.stopPropagation();
                await this.copyImageToClipboard(url);
            };

            this.filmstripEl.appendChild(card);
        }
    }

    // ── Toggle Collapse / Hide ────────────────────────────────────────────────
    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.trayEl.classList.toggle("zit-collapsed", this.isCollapsed);
        this.updateBottomOffset();
    }

    toggleHidden() {
        this.isHidden = !this.isHidden;
        this.trayEl.classList.toggle("zit-hidden", this.isHidden);
        this.updateBottomOffset();
    }

    // ── Lightbox & Metadata Inspector with Click-to-Zoom & Pan ──────────────
    async openLightbox(item, url) {
        const existing = document.querySelector(".zit-lightbox-overlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.className = "zit-lightbox-overlay";
        overlay.innerHTML = `
            <div class="zit-lightbox-modal">
                <div class="zit-lightbox-main">
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
                    <div class="zit-lightbox-viewport" id="zit-lb-viewport" title="Click to Zoom In · Drag to Pan · Scroll to Change Images">
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

        // Style the navigation buttons
        const navBtnBaseStyle = `
            position: absolute;
            top: 50%;
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
                return;
            }

            prevBtn.style.display = "flex";
            nextBtn.style.display = "flex";
            if (countEl) countEl.textContent = `${currentIndex + 1} / ${this.items.length}`;

            const isFirst = currentIndex <= 0;
            const isLast = currentIndex >= this.items.length - 1;

            prevBtn.style.opacity = isFirst ? "0.2" : "1";
            prevBtn.style.cursor = isFirst ? "not-allowed" : "pointer";

            nextBtn.style.opacity = isLast ? "0.2" : "1";
            nextBtn.style.cursor = isLast ? "not-allowed" : "pointer";
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
            const curUrl = `/view?filename=${encodeURIComponent(curItem.filename)}&subfolder=${encodeURIComponent(curItem.subfolder || "")}&type=${encodeURIComponent(curItem.type || "output")}`;

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

        // ── Zoom, Pan & Scroll Navigation Interactive State ──
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
                ? "Click to Zoom Out · Drag to Pan · Scroll to Change Images"
                : "Click to Zoom In · Drag to Pan · Scroll to Change Images";
        };

        const zoomInAt = (targetScale, clientX, clientY) => {
            const rect = viewport.getBoundingClientRect();
            const cx = clientX - (rect.left + rect.width / 2);
            const cy = clientY - (rect.top + rect.height / 2);

            scale = Math.min(8.0, Math.max(0.5, targetScale));
            isZoomed = scale > 1.05;

            if (isZoomed) {
                panX = -cx * (scale - 1) * 0.45;
                panY = -cy * (scale - 1) * 0.45;
            } else {
                panX = 0;
                panY = 0;
            }
            updateTransform(true);
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
            if (e.target.closest(".zit-zoom-toolbar") || e.target.closest("#zit-lb-close") || e.target.closest("#zit-lb-prev") || e.target.closest("#zit-lb-next")) return;
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
            if (e.target.closest(".zit-zoom-toolbar") || e.target.closest("#zit-lb-close") || e.target.closest("#zit-lb-prev") || e.target.closest("#zit-lb-next")) return;
            if (hasMoved) return; // User dragged to pan, don't trigger zoom click

            if (!isZoomed) {
                // Click zooms in to 2.5x centered on click location
                zoomInAt(2.5, e.clientX, e.clientY);
            } else {
                // Click again resets back to Fit view
                resetZoom();
            }
        };

        // Scroll: Change images (horizontal or vertical wheel / trackpad scroll)
        let wheelAccumulator = 0;
        let lastWheelTime = 0;
        let wheelResetTimer = null;

        viewport.onwheel = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Support trackpad horizontal scroll, tilt wheel, Shift+wheel (deltaX),
            // as well as standard mouse wheel (deltaY).
            const absX = Math.abs(e.deltaX);
            const absY = Math.abs(e.deltaY);
            const delta = absX > absY ? e.deltaX : e.deltaY;

            if (Math.abs(delta) < 2) return;

            wheelAccumulator += delta;

            clearTimeout(wheelResetTimer);
            wheelResetTimer = setTimeout(() => {
                wheelAccumulator = 0;
            }, 180);

            const now = Date.now();
            const threshold = 30;
            const cooldown = 220; // 220ms cooldown between image changes

            if (Math.abs(wheelAccumulator) >= threshold && (now - lastWheelTime > cooldown)) {
                if (wheelAccumulator > 0) {
                    // Scroll right / down -> Next image
                    if (currentIndex < this.items.length - 1) {
                        navigateTo(currentIndex + 1);
                    }
                } else {
                    // Scroll left / up -> Previous image
                    if (currentIndex > 0) {
                        navigateTo(currentIndex - 1);
                    }
                }
                wheelAccumulator = 0;
                lastWheelTime = now;
            }
        };

        // Toolbar Zoom buttons
        overlay.querySelector("#zit-zoom-in").onclick = (e) => {
            e.stopPropagation();
            zoomInAt(scale * 1.3, window.innerWidth / 2, window.innerHeight / 2);
        };
        overlay.querySelector("#zit-zoom-out").onclick = (e) => {
            e.stopPropagation();
            zoomInAt(scale * 0.75, window.innerWidth / 2, window.innerHeight / 2);
        };
        overlay.querySelector("#zit-zoom-100").onclick = (e) => {
            e.stopPropagation();
            zoomInAt(1.0, window.innerWidth / 2, window.innerHeight / 2);
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
            clearTimeout(wheelResetTimer);
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
                        tray.setEnabled(true);
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
