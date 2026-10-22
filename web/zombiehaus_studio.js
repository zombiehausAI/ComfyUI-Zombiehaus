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

// ── ComfyUI Extension Registration ───────────────────────────────────────────
app.registerExtension({
    name: "zombiehaus.Studio",

    // Action Bar button (placed next to Run/Queue in modern ComfyUI v1)
    actionBarButtons: [
        {
            icon: "pi pi-bolt",
            label: "Zombiehaus Studio",
            tooltip: "Open Zombiehaus Studio: Screenplay, Image, Video, and Suno-grade Music Studio",
            onClick: () => openStudioWindow("screenplay")
        }
    ],

    // Command palette & Top Menu item
    commands: [
        {
            id: "Zombiehaus.OpenStudio",
            label: "Open Zombiehaus Studio",
            icon: "pi pi-bolt",
            function: () => openStudioWindow("screenplay")
        }
    ],

    menuCommands: [
        {
            path: ["Zombiehaus"],
            commands: ["Zombiehaus.OpenStudio"]
        }
    ],

    async setup() {
        ensureStudioStylesheet();

        // 1. Injected Floating Launcher Pill (Always accessible across any ComfyUI theme/version)
        const injectFloatingLauncher = () => {
            if (document.getElementById("zh-floating-studio-launcher")) return;
            const btn = document.createElement("button");
            btn.id = "zh-floating-studio-launcher";
            btn.className = "zh-top-menu-btn";
            btn.style.position = "fixed";
            btn.style.top = "10px";
            btn.style.right = "140px";
            btn.style.zIndex = "99999";
            btn.style.background = "linear-gradient(135deg, #0284c7 0%, #a855f7 100%)";
            btn.style.color = "#ffffff";
            btn.style.fontWeight = "800";
            btn.style.fontSize = "12px";
            btn.style.padding = "6px 14px";
            btn.style.borderRadius = "20px";
            btn.style.border = "1px solid rgba(255, 255, 255, 0.4)";
            btn.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.6)";
            btn.style.cursor = "pointer";
            btn.style.display = "flex";
            btn.style.alignItems = "center";
            btn.style.gap = "6px";
            btn.innerHTML = `<span>🧟</span><span>Zombiehaus Studio</span>`;
            btn.title = "Open Zombiehaus Studio Workstation (Screenplay, Image, Video, Suno Music)";
            btn.onclick = () => openStudioWindow("screenplay");
            document.body.appendChild(btn);
        };

        injectFloatingLauncher();
        setTimeout(injectFloatingLauncher, 1000);
        setTimeout(injectFloatingLauncher, 3000);

        // 2. Add to Canvas Right-Click Context Menu
        if (typeof LGraphCanvas !== "undefined" && LGraphCanvas.prototype) {
            const origGetCanvasMenuOptions = LGraphCanvas.prototype.getCanvasMenuOptions;
            LGraphCanvas.prototype.getCanvasMenuOptions = function () {
                const options = origGetCanvasMenuOptions ? origGetCanvasMenuOptions.apply(this, arguments) : [];
                options.unshift({
                    content: "🧟 Open Zombiehaus Studio",
                    callback: () => openStudioWindow("screenplay")
                }, null);
                return options;
            };
        }
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // Add Studio button widget to all creative Zombiehaus nodes
        const isStudioNode = nodeData.name === "ZombiehausStudio" || nodeData.name === "ZombiehausScriptStudio";
        const isCreativeNode = isStudioNode || nodeData.name === "ZombiehausSongWriter" || nodeData.name === "ZombiehausTextEditor";

        if (isCreativeNode) {
            ensureStudioStylesheet();

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                const node = this;

                // Add button widget directly on the node
                const modeTarget = nodeData.name === "ZombiehausSongWriter" ? "music" : 
                                  nodeData.name === "ZombiehausScriptStudio" ? "screenplay" : "prompt";

                node.addWidget("button", "🧟 Open Studio Workstation", null, () => {
                    openStudioWindow(modeTarget);
                }, { serialize: false });

                if (isStudioNode) {
                    // Suppress 2500px LiteGraph canvas tower for studio mega nodes
                    if (node.widgets) {
                        for (const w of node.widgets) {
                            if (w.name !== "button") {
                                w.computeSize = () => [0, -4];
                            }
                        }
                    }
                    node.setSize([440, 240]);
                }

                return r;
            };
        }
    }
});
