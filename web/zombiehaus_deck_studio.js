import { app } from "../../scripts/app.js";

/**
 * Zombiehaus Deck Studio - Disabled & Removed per user configuration.
 * Cleans up all Deck Studio DOM elements, toolbar buttons, sidebar icons, and styles.
 */

function cleanupDeckUI() {
    if (typeof document === "undefined") return;
    const selectors = [
        "#zombiehaus-deck-studio",
        "#zds-top-bar-view-btn",
        "#zds-top-toggle-btn",
        "#zombiehaus-deck-studio-sidebar-btn",
        "#zombiehaus-deck-studio-toggle-btn",
        "#zds-tray-header-btn",
        "#zit-btn-deck-studio",
        "#zds-floating-launcher-pill",
        ".zds-sidebar-btn",
        ".zds-top-bar-btn",
        "link[href*='zombiehaus_deck_studio.css']"
    ];
    for (const sel of selectors) {
        try {
            document.querySelectorAll(sel).forEach(el => el.remove());
        } catch (_) {}
    }
    document.body?.classList.remove("zombiehaus-deck-active");
}

if (typeof window !== "undefined") {
    cleanupDeckUI();
    window.zombiehausDeckStudio = null;
    window.zombiehausToggleDeckStudio = () => {};
    window.addEventListener("DOMContentLoaded", cleanupDeckUI);
    setTimeout(cleanupDeckUI, 200);
    setTimeout(cleanupDeckUI, 1000);
}

app.registerExtension({
    name: "zombiehaus.DeckStudio",
    async init() {
        cleanupDeckUI();
    },
    async setup() {
        cleanupDeckUI();
    }
});
