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

        // Ensure any floating launcher element is removed
        document.querySelectorAll("#zh-floating-studio-launcher, .zh-floating-launcher").forEach(n => n.remove());

        // 1. Add to Canvas Right-Click Context Menu
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
        // Add Studio button widget to creative Zombiehaus nodes
        const isCreativeNode = nodeData.name === "ZombiehausSongWriter" || nodeData.name === "ZombiehausTextEditor";

        if (isCreativeNode) {
            ensureStudioStylesheet();

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                const node = this;

                // Add button widget directly on the node
                const modeTarget = nodeData.name === "ZombiehausSongWriter" ? "music" : "prompt";

                node.addWidget("button", "🧟 Open Studio Workstation", null, () => {
                    openStudioWindow(modeTarget);
                }, { serialize: false });

                return r;
            };
        }
    }
});
