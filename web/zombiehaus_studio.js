import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Ensure CSS stylesheet is injected into head
function ensureStudioStylesheet() {
    if (!document.getElementById("zombiehaus-studio-styles")) {
        const link = document.createElement("link");
        link.id = "zombiehaus-studio-styles";
        link.rel = "stylesheet";
        link.href = new URL("./zombiehaus_studio.css", import.meta.url).href;
        document.head.appendChild(link);
    }
}

function openStudioWindow(mode = "screenplay") {
    const url = `/zombiehaus/studio#mode=${mode}`;
    const w = 1650;
    const h = 960;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(url, "ZombiehausStudio", `width=${w},height=${h},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no`);
}

app.registerExtension({
    name: "zombiehaus.Studio",

    async setup() {
        ensureStudioStylesheet();

        // ── Add Top Menu Bar Studio Button ────────────────────────────────────
        const addTopBarButton = () => {
            if (document.getElementById("zh-top-bar-studio-btn")) return;

            const menu = document.querySelector(".comfy-menu") || document.querySelector(".comfyui-menu");
            const btn = document.createElement("button");
            btn.id = "zh-top-bar-studio-btn";
            btn.className = "zh-top-menu-btn";
            btn.innerHTML = `<span>🧟</span><span>Studio</span>`;
            btn.title = "Open Zombiehaus Creative Studio Workstation";
            btn.addEventListener("click", () => openStudioWindow("screenplay"));

            if (menu) {
                menu.prepend(btn);
            } else {
                // Floating top bar launcher pill fallback
                let launcher = document.getElementById("zh-floating-studio-launcher");
                if (!launcher) {
                    launcher = document.createElement("div");
                    launcher.id = "zh-floating-studio-launcher";
                    launcher.className = "zh-floating-launcher";
                    launcher.appendChild(btn);
                    document.body.appendChild(launcher);
                }
            }
        };

        addTopBarButton();
        setTimeout(addTopBarButton, 1000);
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ZombiehausStudio" || nodeData.name === "ZombiehausScriptStudio") {
            ensureStudioStylesheet();

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                const node = this;
                const isScriptMode = nodeData.name === "ZombiehausScriptStudio";

                // ── 1. Suppress 2500px Canvas Tower ──────────────────────────
                // Hide raw LiteGraph widgets from canvas rendering while keeping values for graph execution
                if (node.widgets) {
                    for (const w of node.widgets) {
                        w.computeSize = () => [0, -4];
                    }
                }

                // Sleek, compact card dimensions on canvas
                node.setSize([440, 240]);

                const getWidget = (name) => node.widgets?.find(w => w.name === name);

                // ── 2. Build Compact Studio Node Card ────────────────────────
                const card = document.createElement("div");
                card.className = "zh-canvas-studio-card";

                // Header
                const header = document.createElement("div");
                header.className = "zh-card-header";
                header.innerHTML = `
                    <div class="zh-card-title">
                        <span class="zh-pulse-dot"></span>
                        <span class="zh-title-text">${isScriptMode ? "SCRIPT STUDIO" : "ZOMBIEHAUS STUDIO"}</span>
                    </div>
                    <span class="zh-card-badge">${isScriptMode ? "SCREENPLAY" : "PROMPT"}</span>
                `;
                card.appendChild(header);

                // Profile Selector Row
                const profileRow = document.createElement("div");
                profileRow.className = "zh-card-profile-row";

                const pLabel = document.createElement("span");
                pLabel.className = "zh-card-label";
                pLabel.textContent = "Profile:";

                const pSelect = document.createElement("select");
                pSelect.className = "zh-card-select";

                const refreshProfiles = async () => {
                    try {
                        const resp = await api.fetchApi("/zombiehaus/studio/profiles");
                        const data = await resp.json();
                        if (data.success && data.profiles) {
                            pSelect.innerHTML = "";
                            const currentVal = getWidget("profile")?.value || "Chroma 1-HD Photoreal";
                            for (const p of data.profiles) {
                                const opt = document.createElement("option");
                                opt.value = p.name;
                                opt.textContent = p.name;
                                if (p.name === currentVal) opt.selected = true;
                                pSelect.appendChild(opt);
                            }
                        }
                    } catch (_) {}
                };
                refreshProfiles();

                pSelect.addEventListener("change", (e) => {
                    const pw = getWidget("profile");
                    if (pw) {
                        pw.value = e.target.value;
                        if (pw.callback) pw.callback(pw.value);
                        node.setDirtyCanvas(true, true);
                    }
                });

                profileRow.appendChild(pLabel);
                profileRow.appendChild(pSelect);
                card.appendChild(profileRow);

                // Big Glowing "Open Studio Workstation" Launcher
                const launchBtn = document.createElement("button");
                launchBtn.className = "zh-card-launch-btn";
                launchBtn.innerHTML = `<span>🗖</span><span>OPEN STUDIO WORKSTATION</span>`;
                launchBtn.title = "Launch full 3-column creative suite in a dedicated window";
                launchBtn.addEventListener("click", () => {
                    openStudioWindow(isScriptMode ? "screenplay" : "prompt");
                });
                card.appendChild(launchBtn);

                // Quick Status Badges Strip
                const statusStrip = document.createElement("div");
                statusStrip.className = "zh-card-status-strip";

                const updateBadges = () => {
                    const arch = (getWidget("architecture")?.value || "CHROMA").toUpperCase();
                    const w = getWidget("width")?.value || 1024;
                    const h = getWidget("height")?.value || 1024;
                    const hires = getWidget("enable_hires_fix")?.value ? "HIRES" : null;
                    const detail = getWidget("enable_detailer")?.value ? "DETAIL" : null;
                    const dewax = getWidget("enable_dewax")?.value ? "DEWAX" : null;

                    statusStrip.innerHTML = `
                        <span class="zh-chip zh-chip-arch">${arch}</span>
                        <span class="zh-chip">${w}×${h}</span>
                        ${hires ? `<span class="zh-chip zh-chip-active">HIRES</span>` : ""}
                        ${detail ? `<span class="zh-chip zh-chip-active">DETAIL</span>` : ""}
                        ${dewax ? `<span class="zh-chip zh-chip-active">DEWAX</span>` : ""}
                    `;
                };
                updateBadges();
                card.appendChild(statusStrip);

                // Quick Generate Button
                const queueBtn = document.createElement("button");
                queueBtn.className = "zh-card-queue-btn";
                queueBtn.innerHTML = `<span>⚡</span><span>Queue Generation</span>`;
                queueBtn.addEventListener("click", () => {
                    app.queuePrompt(0);
                });
                card.appendChild(queueBtn);

                // Attach custom DOM widget
                node.addDOMWidget("zombiehaus_studio_ui", "custom", card, {
                    serialize: false,
                    hideOnZoom: false
                });

                return r;
            };
        }
    }
});
