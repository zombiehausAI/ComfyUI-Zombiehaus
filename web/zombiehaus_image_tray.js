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

        document.body.appendChild(tray);
        this.trayEl = tray;
        this.filmstripEl = tray.querySelector("#zit-filmstrip-container");
        this.countBadge = tray.querySelector("#zit-count-badge");
        this.sizeLabel = tray.querySelector("#zit-size-label");

        // Elevated z-index so Image Tray is never buried beneath ComfyUI menus or canvas
        this.trayEl.style.zIndex = "100010";
        this.trayEl.style.bottom = "var(--zit-bottom-offset, 0px)";
        this.trayEl.style.left = "var(--zit-left-offset, 0px)";
    }

    // ── Dynamic ComfyUI Docking (Bottom Dock & Left Sidebar Offset) ────────────
    updateBottomOffset() {
        if (!this.trayEl) return;

        // If Deck Studio full-screen overlay is active, dock at bottom 0 and left 0 with elevated z-index
        const isDeckActive = document.body.classList.contains("zombiehaus-deck-active") ||
            !!document.querySelector("#zombiehaus-deck-studio.zds-active");

        if (isDeckActive) {
            this.trayEl.style.bottom = "0px";
            this.trayEl.style.left = "0px";
            this.trayEl.style.zIndex = "100055";
            this.trayEl.style.setProperty("--zit-bottom-offset", "0px");
            this.trayEl.style.setProperty("--zit-left-offset", "0px");
            this.pushBottomElements(0, 0);
            return;
        }

        this.trayEl.style.zIndex = "100010";

        const vh = window.innerHeight;
        const vw = window.innerWidth;

        // ── 1. Detect Left Sidebar (Help, Console, Shortcuts, Settings) ────────
        let leftOffset = 0;
        const leftSidebarCandidates = [
            ".side-tool-bar-container",
            "nav.side-tool-bar-container",
            ".side-tool-bar",
            "aside.comfyui-nav",
            ".comfyui-nav",
            "aside"
        ];
        for (const sel of leftSidebarCandidates) {
            const els = document.querySelectorAll(sel);
            for (const el of els) {
                if (!el || !el.isConnected) continue;
                if (el.closest("#zombiehaus-image-tray") || el.closest("#zombiehaus-deck-studio")) continue;
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.left <= 8 && rect.height > vh * 0.4) {
                    const w = Math.round(rect.right);
                    if (w >= 30 && w <= 250 && w > leftOffset) {
                        leftOffset = w;
                    }
                }
            }
        }
        this.trayEl.style.left = `${leftOffset}px`;
        this.trayEl.style.setProperty("--zit-left-offset", `${leftOffset}px`);

        // ── 2. Determine Bottom Offset (Manual Setting or ComfyUI Bottom Menu Auto-Detection) ─
        let bottomOffset = 0;
        let detectedBottomMenuEl = null;

        // A. Check user manual override setting from Zombiehaus Settings
        try {
            const settingVal = window.app?.ui?.settings?.getSettingValue?.("Zombiehaus.ImageTrayBottomOffset");
            if (typeof settingVal === "number" && settingVal > 0) {
                bottomOffset = settingVal;
            } else {
                const stored = localStorage?.getItem("zombiehaus_image_tray_bottom_offset");
                if (stored && stored !== "auto") {
                    const parsed = parseInt(stored, 10);
                    if (parsed > 0) bottomOffset = parsed;
                }
            }
        } catch (_) {}

        // B. If no manual offset set, auto-detect ComfyUI bottom menu or bar
        if (bottomOffset === 0) {
            const bottomMenuCandidates = [
                ".comfyui-menu.bottom",
                ".comfyui-menu[data-position='bottom']",
                ".comfyui-body-bottom",
                ".comfyui-bottom-bar",
                "footer.comfyui-footer",
                ".comfyui-footer",
                ".comfy-menu.bottom",
                ".comfyui-action-bar.bottom",
                "header.comfyui-menu",
                ".comfyui-menu",
                "#comfy-menu",
                ".comfy-menu"
            ];

            for (const sel of bottomMenuCandidates) {
                const els = document.querySelectorAll(sel);
                for (const el of els) {
                    if (!el || !el.isConnected) continue;
                    if (el.closest("#zombiehaus-image-tray") || el.closest("#zombiehaus-deck-studio") || el.closest("#zombiehaus-settings-modal")) continue;

                    const style = window.getComputedStyle(el);
                    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

                    const rect = el.getBoundingClientRect();
                    // Must be resting near viewport bottom and have reasonable menu height
                    if (rect.height >= 24 && rect.height <= 180 && rect.bottom >= vh - 6 && rect.top > vh * 0.4) {
                        if (rect.width >= vw * 0.35 || el.classList.contains("comfyui-menu") || el.id === "comfy-menu") {
                            const h = Math.round(vh - rect.top);
                            if (h > bottomOffset && h < 200) {
                                bottomOffset = h;
                                detectedBottomMenuEl = el;
                            }
                        }
                    }
                }
            }

            // General fallback: scan any wide fixed/absolute container touching viewport bottom
            if (bottomOffset === 0) {
                const candidateBars = document.querySelectorAll("body > footer, body > nav, #app footer, .comfyui-app footer, [class*='bottom-bar'], [class*='bottom_bar']");
                for (const bar of candidateBars) {
                    if (!bar || !bar.isConnected) continue;
                    if (bar.closest("#zombiehaus-image-tray") || bar.closest("#zombiehaus-deck-studio")) continue;
                    const rect = bar.getBoundingClientRect();
                    if (rect.height >= 24 && rect.height <= 140 && rect.bottom >= vh - 4 && rect.top > vh * 0.5 && rect.width >= vw * 0.4) {
                        const h = Math.round(vh - rect.top);
                        if (h > bottomOffset && h < 200) {
                            bottomOffset = h;
                            detectedBottomMenuEl = bar;
                        }
                    }
                }
            }
        }

        this.detectedBottomMenuEl = detectedBottomMenuEl;
        this.trayEl.style.bottom = `${bottomOffset}px`;
        this.trayEl.style.setProperty("--zit-bottom-offset", `${bottomOffset}px`);

        const trayHeight = (!this.isEnabled || this.isHidden)
            ? 0
            : (this.isCollapsed ? 36 : (this.trayEl.offsetHeight || 184));

        this.pushBottomElements(bottomOffset, trayHeight);
    }

    // ── Push ComfyUI Bottom UI Up Above Tray (rgthree style docking) ──────────
    pushBottomElements(bottomOffset, trayHeight) {
        if (this.isUpdatingBottom) return;
        this.isUpdatingBottom = true;

        try {
            document.documentElement.style.setProperty("--zit-bottom-offset", `${bottomOffset}px`);
            document.documentElement.style.setProperty("--zit-tray-height", `${trayHeight}px`);

            // If the detected bottom menu was ever modified, restore it completely so it stays anchored at bottom
            if (this.detectedBottomMenuEl) {
                const menuEl = this.detectedBottomMenuEl;
                if (menuEl.dataset.zitPushed || this.pushedElements.has(menuEl)) {
                    if (menuEl.dataset.zitOrigStyle) {
                        menuEl.style.setProperty("bottom", menuEl.dataset.zitOrigStyle);
                    } else {
                        menuEl.style.removeProperty("bottom");
                    }
                    delete menuEl.dataset.zitPushed;
                    delete menuEl.dataset.zitBaseBottom;
                    delete menuEl.dataset.zitOrigStyle;
                    this.pushedElements.delete(menuEl);
                }
            }

            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const elementsToAdjust = new Set();

            // Find floating canvas toolbars (e.g. zoom controls, canvas buttons) that should sit above the tray
            const floatingSelectors = [
                ".litegraph.litemenu",
                ".graph-canvas-menu",
                ".canvas-menu",
                ".comfyui-canvas-menu",
                ".comfyui-floating-menu",
                ".comfy-floating-menu",
                "[class*='zoom-control']",
                "[class*='canvas-menu']",
                "[class*='graph-menu']",
                "[class*='floating-menu']"
            ];

            for (const sel of floatingSelectors) {
                try {
                    const found = document.querySelectorAll(sel);
                    for (const el of found) {
                        elementsToAdjust.add(el);
                    }
                } catch (_) {}
            }

            // Dynamic scan: find compact floating controls docked near bottom
            try {
                const candidates = document.querySelectorAll(
                    "body > div, body > nav, #app div, .comfyui-app div, [class*='bottom']"
                );
                for (const el of candidates) {
                    if (!el || !el.isConnected) continue;
                    if (el.closest("#zombiehaus-image-tray") || el.closest("#zombiehaus-deck-studio") || el.closest("#zombiehaus-settings-modal") || el.closest(".zit-lightbox-overlay")) {
                        continue;
                    }
                    if (this.detectedBottomMenuEl && (el === this.detectedBottomMenuEl || this.detectedBottomMenuEl.contains(el))) {
                        continue;
                    }
                    const tag = el.tagName;
                    if (tag === "CANVAS" || tag === "SVG" || tag === "IMG" || tag === "BODY" || tag === "HTML" || tag === "FOOTER") {
                        continue;
                    }

                    const style = window.getComputedStyle(el);
                    if (style.position !== "fixed" && style.position !== "absolute") continue;
                    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

                    const rect = el.getBoundingClientRect();
                    // Floating controls are compact (< 150px height, < 40% screen width) and within range of bottom
                    if (rect.height > 0 && rect.height < 150 && rect.width < vw * 0.4 && rect.bottom >= vh - (bottomOffset + 100) && rect.top > vh * 0.4) {
                        elementsToAdjust.add(el);
                    }
                }
            } catch (_) {}

            // Remove any element that is the detected bottom menu
            if (this.detectedBottomMenuEl) {
                elementsToAdjust.delete(this.detectedBottomMenuEl);
            }

            // Apply push or restore
            const totalBottomLift = bottomOffset + trayHeight;

            for (const el of elementsToAdjust) {
                if (!el || !el.isConnected) {
                    this.pushedElements.delete(el);
                    continue;
                }
                if (el.closest("#zombiehaus-image-tray") || el.closest("#zombiehaus-deck-studio") || el.closest("#zombiehaus-settings-modal")) {
                    this.pushedElements.delete(el);
                    continue;
                }
                if (el.parentElement && elementsToAdjust.has(el.parentElement)) {
                    continue;
                }

                if (trayHeight > 0) {
                    if (!el.dataset.zitBaseBottom) {
                        const rect = el.getBoundingClientRect();
                        const computedStyle = window.getComputedStyle(el);
                        const rawBottom = parseInt(computedStyle.bottom, 10);
                        const distFromBottom = Math.max(0, Math.round(vh - rect.bottom));
                        const base = (!isNaN(rawBottom) && rawBottom >= 0 && rawBottom < 100) ? rawBottom : distFromBottom;
                        el.dataset.zitBaseBottom = String(base);
                        el.dataset.zitOrigStyle = el.style.bottom || "";
                    }

                    const baseBottom = parseInt(el.dataset.zitBaseBottom, 10) || 0;
                    const targetBottom = baseBottom + totalBottomLift;
                    el.style.setProperty("bottom", `${targetBottom}px`, "important");
                    el.style.transition = "bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
                    el.dataset.zitPushed = "true";
                    this.pushedElements.add(el);
                } else if (el.dataset.zitPushed || this.pushedElements.has(el)) {
                    if (el.dataset.zitOrigStyle) {
                        el.style.setProperty("bottom", el.dataset.zitOrigStyle);
                    } else {
                        el.style.removeProperty("bottom");
                    }
                    delete el.dataset.zitPushed;
                    delete el.dataset.zitBaseBottom;
                    delete el.dataset.zitOrigStyle;
                    this.pushedElements.delete(el);
                }
            }

            // Restore any elements no longer targeted
            for (const el of this.pushedElements) {
                if (!elementsToAdjust.has(el) || trayHeight === 0) {
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
                    this.pushedElements.delete(el);
                }
            }
        } finally {
            this.isUpdatingBottom = false;
        }
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
                    <div class="zit-lightbox-viewport" id="zit-lb-viewport" title="Click to Zoom In / Drag to Pan / Click to Zoom Out">
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

        const loadMetadata = async (filename) => {
            metaEl.textContent = "Loading metadata...";
            try {
                const metaRes = await fetch(`/zombiehaus/gallery/metadata?path=${encodeURIComponent(filename)}`);
                const metaData = await metaRes.json();

                if (metaData?.success && metaData.data) {
                    const info = metaData.data;
                    let text = "";
                    if (info.prompt) text += `--- PROMPT ---\n${typeof info.prompt === "object" ? JSON.stringify(info.prompt, null, 2) : info.prompt}\n\n`;
                    if (info.workflow) text += `--- WORKFLOW ---\n(Embedded graph data available)\n\n`;
                    if (info.extra) text += `--- EXTRA INFO ---\n${JSON.stringify(info.extra, null, 2)}`;
                    metaEl.textContent = text || JSON.stringify(info, null, 2);
                } else {
                    metaEl.textContent = "No generation metadata found in image headers.";
                }
            } catch (_) {
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
            loadMetadata(curItem.filename);
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

        // ── Zoom & Pan Interactive State ──
        let scale = 1.0;
        let panX = 0;
        let panY = 0;
        let isZoomed = false;
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let hasMoved = false;

        const updateTransform = (withTransition = true) => {
            img.style.transition = withTransition ? "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)" : "none";
            img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
            zoomBadge.textContent = scale <= 1.05 ? "Fit" : `${Math.round(scale * 100)}%`;
            viewport.classList.toggle("zit-is-zoomed", scale > 1.05);
            viewport.title = scale > 1.05 ? "Click to Zoom Out · Drag to Pan" : "Click to Zoom In · Drag to Pan";
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
            if (e.target.closest(".zit-zoom-toolbar") || e.target.closest("#zit-lb-close") || e.target.closest("#zit-lb-prev") || e.target.closest("#zit-lb-next")) return;
            isDragging = true;
            hasMoved = false;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
            if (isZoomed) {
                viewport.classList.add("zit-is-dragging");
            }
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const newPanX = e.clientX - startX;
            const newPanY = e.clientY - startY;
            if (Math.abs(newPanX - panX) > 4 || Math.abs(newPanY - panY) > 4) {
                hasMoved = true;
            }
            if (isZoomed) {
                panX = newPanX;
                panY = newPanY;
                updateTransform(false);
            }
        };

        const onMouseUp = () => {
            isDragging = false;
            viewport.classList.remove("zit-is-dragging");
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        // Click on image: if user didn't drag, toggle zoom!
        viewport.onclick = (e) => {
            if (e.target.closest(".zit-zoom-toolbar") || e.target.closest("#zit-lb-close") || e.target.closest("#zit-lb-prev") || e.target.closest("#zit-lb-next")) return;
            if (hasMoved) return; // user dragged to pan, don't toggle zoom

            if (!isZoomed) {
                // Click zooms in to 2.5x full resolution
                zoomInAt(2.5, e.clientX, e.clientY);
            } else {
                // Click again zooms back out to full fit!
                resetZoom();
            }
        };

        // Mouse Wheel dynamic zoom
        viewport.onwheel = (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.25 : 0.8;
            const newScale = Math.min(8.0, Math.max(0.5, scale * factor));
            zoomInAt(newScale, e.clientX, e.clientY);
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
        loadMetadata(item.filename);
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
