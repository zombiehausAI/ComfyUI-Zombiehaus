import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * Zombiehaus Model Scryer (WeightScryer Integration) Frontend Extension
 * 1. Global Floating Oracle Cockpit (accessible anywhere, independent of canvas nodes)
 * 2. Persistent Top Menu & Floating Cockpit Launcher
 * 3. Universal Right-Click Context Menu on all Model & LoRA Loaders
 * 4. Dual View Modes: [Tags & Vocabulary] and [Golden Recipe & Cheatsheet]
 * 5. Semantic Expression, Pose, Lighting, Wardrobe & Training Recipe Extraction
 */

function copyToClipboard(text, targetEl, successLabel = "✓ Copied!") {
    if (!text) {
        return;
    }

    const showSuccess = () => {
        if (targetEl) {
            const originalText = targetEl.innerText;
            const originalBg = targetEl.style.backgroundColor;
            const originalColor = targetEl.style.color;

            targetEl.innerText = successLabel;
            targetEl.style.backgroundColor = "#22c55e";
            targetEl.style.color = "#ffffff";
            targetEl.style.borderColor = "#16a34a";

            setTimeout(() => {
                targetEl.innerText = originalText;
                targetEl.style.backgroundColor = originalBg;
                targetEl.style.color = originalColor;
                targetEl.style.borderColor = "";
            }, 1200);
        }
    };

    const fallbackCopy = (str) => {
        const ta = document.createElement("textarea");
        ta.value = str;
        ta.style.position = "fixed";
        ta.style.top = "0";
        ta.style.left = "0";
        ta.style.width = "2em";
        ta.style.height = "2em";
        ta.style.padding = "0";
        ta.style.border = "none";
        ta.style.outline = "none";
        ta.style.boxShadow = "none";
        ta.style.background = "transparent";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
            const successful = document.execCommand("copy");
            if (successful) {
                showSuccess();
            }
        } catch (_) {}
        document.body.removeChild(ta);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showSuccess).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function createTagChip(tagObj) {
    const chip = document.createElement("button");
    chip.className = "zombiehaus-scry-chip";
    const src = tagObj.source || "Scryer";
    const freq = tagObj.frequency != null ? `${tagObj.frequency}x dataset occurrences` : `Power: ${Math.round(tagObj.power_score || 0)}%`;
    chip.title = `[${tagObj.category || 'Tag'}] "${tagObj.tag}"\n${freq}\nSource: ${src}\nClick to copy to clipboard`;

    let catColor = "#c084fc"; // Violet (Triggers)
    let catBg = "rgba(168, 85, 247, 0.14)";
    let borderCol = "rgba(168, 85, 247, 0.35)";

    const cat = (tagObj.category || "").toLowerCase();
    if (cat.includes("expression")) {
        catColor = "#fb7185"; // Rose (Expressions)
        catBg = "rgba(251, 113, 133, 0.14)";
        borderCol = "rgba(251, 113, 133, 0.35)";
    } else if (cat.includes("pose")) {
        catColor = "#2dd4bf"; // Teal (Poses)
        catBg = "rgba(45, 212, 191, 0.14)";
        borderCol = "rgba(45, 212, 191, 0.35)";
    } else if (cat.includes("lighting")) {
        catColor = "#facc15"; // Warm Gold (Lighting)
        catBg = "rgba(250, 204, 21, 0.14)";
        borderCol = "rgba(250, 204, 21, 0.35)";
    } else if (cat.includes("wardrobe") || cat.includes("clothing")) {
        catColor = "#e879f9"; // Fuchsia (Clothing)
        catBg = "rgba(232, 121, 249, 0.14)";
        borderCol = "rgba(232, 121, 249, 0.35)";
    } else if (cat.includes("style")) {
        catColor = "#34d399"; // Emerald (Style)
        catBg = "rgba(52, 211, 153, 0.14)";
        borderCol = "rgba(52, 211, 153, 0.35)";
    } else if (cat.includes("quality")) {
        catColor = "#fbbf24"; // Amber (Quality)
        catBg = "rgba(251, 191, 36, 0.14)";
        borderCol = "rgba(251, 191, 36, 0.35)";
    } else if (cat.includes("subject") || cat.includes("census")) {
        catColor = "#38bdf8"; // Cyan (Subject)
        catBg = "rgba(56, 189, 248, 0.14)";
        borderCol = "rgba(56, 189, 248, 0.35)";
    }

    chip.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 8px;
        margin: 2px;
        font-size: 11px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
        font-weight: 500;
        color: ${catColor};
        background: ${catBg};
        border: 1px solid ${borderCol};
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
        user-select: none;
    `;

    chip.onmouseenter = () => {
        chip.style.filter = "brightness(1.25)";
        chip.style.transform = "translateY(-1px)";
    };
    chip.onmouseleave = () => {
        chip.style.filter = "none";
        chip.style.transform = "none";
    };

    const labelSpan = document.createElement("span");
    labelSpan.innerText = tagObj.tag;
    chip.appendChild(labelSpan);

    if (tagObj.frequency != null && tagObj.frequency > 0) {
        const countSpan = document.createElement("span");
        countSpan.style.cssText = `
            opacity: 0.75;
            font-size: 9px;
            padding: 1px 4px;
            background: rgba(0, 0, 0, 0.25);
            border-radius: 4px;
        `;
        countSpan.innerText = `${tagObj.frequency}x`;
        chip.appendChild(countSpan);
    } else if (tagObj.power_score) {
        const scoreSpan = document.createElement("span");
        scoreSpan.style.cssText = `
            opacity: 0.75;
            font-size: 9px;
            padding: 1px 4px;
            background: rgba(0, 0, 0, 0.25);
            border-radius: 4px;
        `;
        scoreSpan.innerText = `${Math.round(tagObj.power_score)}%`;
        chip.appendChild(scoreSpan);
    }

    chip.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        copyToClipboard(tagObj.tag, chip);
    };

    return chip;
}

// ── Global Model Scryer Floating Cockpit Modal ──────────────────────────────
export function openGlobalModelScryerDialog(initialSourceType = "Diffusers", initialModelName = null) {
    const existing = document.getElementById("zombiehaus-scryer-global-modal");
    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = "zombiehaus-scryer-global-modal";
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 10008;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
        position: absolute;
        top: 60px;
        right: 40px;
        pointer-events: auto;
        background: #0f121a;
        border: 1px solid #232b3d;
        border-radius: 12px;
        width: 820px;
        height: 620px;
        min-width: 480px;
        min-height: 360px;
        max-width: calc(100vw - 30px);
        max-height: calc(100vh - 30px);
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(99, 102, 241, 0.15);
        color: #e2e8f0;
        overflow: hidden;
        resize: both;
    `;

    // Modal Header (Draggable)
    const modalHeader = document.createElement("div");
    modalHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 16px;
        background: #141822;
        border-bottom: 1px solid #1f2738;
        cursor: move;
        user-select: none;
    `;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    modalHeader.onmousedown = (e) => {
        if (e.target.closest("button") || e.target.closest("select") || e.target.closest("input")) {
            return;
        }
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = dialog.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        dialog.style.right = "auto";
        dialog.style.left = `${initialLeft}px`;
        dialog.style.top = `${initialTop}px`;

        const onMouseMove = (moveEvent) => {
            if (!isDragging) {
                return;
            }
            const dx = moveEvent.clientX - dragStartX;
            const dy = moveEvent.clientY - dragStartY;
            dialog.style.left = `${Math.max(10, Math.min(window.innerWidth - 100, initialLeft + dx))}px`;
            dialog.style.top = `${Math.max(10, Math.min(window.innerHeight - 50, initialTop + dy))}px`;
        };

        const onMouseUp = () => {
            isDragging = false;
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    };

    const titleGroup = document.createElement("div");
    titleGroup.style.display = "flex";
    titleGroup.style.alignItems = "center";
    titleGroup.style.gap = "8px";
    titleGroup.innerHTML = `
        <span style="font-size: 16px;">🔮</span>
        <span style="font-weight: 700; font-size: 14px; color: #c084fc;">Zombiehaus Model Scryer Oracle Cockpit</span>
    `;

    const headerRight = document.createElement("div");
    headerRight.style.display = "flex";
    headerRight.style.alignItems = "center";
    headerRight.style.gap = "10px";

    // View Switcher Tabs [Tags] vs [Golden Recipe]
    let activeView = "tags";
    const viewSwitch = document.createElement("div");
    viewSwitch.style.cssText = `
        display: flex;
        background: #0d1017;
        padding: 2px;
        border-radius: 6px;
        border: 1px solid #242c3d;
        gap: 2px;
    `;

    const tagsTab = document.createElement("button");
    tagsTab.innerText = "🏷️ Tags & Vocabulary";
    tagsTab.style.cssText = `padding: 4px 10px; font-size: 11px; font-weight: 600; border: none; border-radius: 4px; background: #6366f1; color: #ffffff; cursor: pointer;`;

    const recipeTab = document.createElement("button");
    recipeTab.innerText = "🎯 Golden Recipe";
    recipeTab.style.cssText = `padding: 4px 10px; font-size: 11px; font-weight: 600; border: none; border-radius: 4px; background: transparent; color: #94a3b8; cursor: pointer;`;

    const deepTab = document.createElement("button");
    deepTab.innerText = "🔬 Deep Dive & Specs";
    deepTab.style.cssText = `padding: 4px 10px; font-size: 11px; font-weight: 600; border: none; border-radius: 4px; background: transparent; color: #94a3b8; cursor: pointer;`;

    viewSwitch.appendChild(tagsTab);
    viewSwitch.appendChild(recipeTab);
    viewSwitch.appendChild(deepTab);
    headerRight.appendChild(viewSwitch);

    // Minimize / restore button
    let isMinimized = false;
    let prevHeight = "620px";
    const minBtn = document.createElement("button");
    minBtn.textContent = "—";
    minBtn.title = "Minimize / Expand Cockpit";
    minBtn.style.cssText = "background: none; border: none; color: #94a3b8; font-size: 14px; cursor: pointer; padding: 2px 6px; border-radius: 4px;";
    minBtn.onclick = () => {
        isMinimized = !isMinimized;
        if (isMinimized) {
            prevHeight = dialog.style.height || "620px";
            modalBody.style.display = "none";
            dialog.style.height = "auto";
            dialog.style.minHeight = "0";
            dialog.style.resize = "none";
            minBtn.textContent = "□";
        } else {
            modalBody.style.display = "flex";
            dialog.style.height = prevHeight;
            dialog.style.minHeight = "360px";
            dialog.style.resize = "both";
            minBtn.textContent = "—";
        }
    };
    headerRight.appendChild(minBtn);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.title = "Close Cockpit";
    closeBtn.style.cssText = "background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 2px 8px; border-radius: 4px;";
    closeBtn.onclick = () => overlay.remove();
    headerRight.appendChild(closeBtn);

    modalHeader.appendChild(titleGroup);
    modalHeader.appendChild(headerRight);
    dialog.appendChild(modalHeader);

    // Modal Body
    const modalBody = document.createElement("div");
    modalBody.style.cssText = "padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; flex: 1;";

    // Model Category Switcher Bar (Diffusers | LoRAs | Checkpoints)
    const modelFilterRow = document.createElement("div");
    modelFilterRow.style.cssText = "display: flex; gap: 6px; background: #0b0e14; padding: 4px; border-radius: 6px; border: 1px solid #1a2233;";

    let activeCat = initialSourceType || "Diffusers";
    const categories = [
        { id: "Diffusers", label: "🎨 Diffusers (UNet/DiT)", key: "diffusers" },
        { id: "LoRAs", label: "⚡ LoRAs", key: "loras" },
        { id: "Checkpoints", label: "📦 Checkpoints", key: "checkpoints" }
    ];

    const catButtons = {};
    let modelLibrary = { diffusers: [], loras: [], checkpoints: [] };

    // Model Selector row
    const modelSelectRow = document.createElement("div");
    modelSelectRow.style.cssText = "display: flex; gap: 8px; align-items: center; width: 100%; box-sizing: border-box;";

    const modelSelect = document.createElement("select");
    modelSelect.style.cssText = `
        flex: 1 1 0;
        min-width: 0;
        width: 0;
        padding: 7px 10px;
        font-size: 12px;
        background: #171d29;
        border: 1px solid #283347;
        border-radius: 6px;
        color: #f1f5f9;
        outline: none;
        cursor: pointer;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    `;

    const scryActionBtn = document.createElement("button");
    scryActionBtn.innerText = "🔮 Scry Model";
    scryActionBtn.style.cssText = `
        flex: 0 0 auto;
        flex-shrink: 0;
        white-space: nowrap;
        padding: 7px 16px;
        font-size: 12px;
        font-weight: 600;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: #ffffff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
        transition: all 0.15s ease;
    `;
    scryActionBtn.onmouseenter = () => {
        scryActionBtn.style.filter = "brightness(1.15)";
    };
    scryActionBtn.onmouseleave = () => {
        scryActionBtn.style.filter = "none";
    };

    modelSelectRow.appendChild(modelSelect);
    modelSelectRow.appendChild(scryActionBtn);

    const updateSelector = () => {
        modelSelect.innerHTML = `<option value="none">-- Select ${activeCat} --</option>`;
        const catKey = categories.find(c => c.id === activeCat)?.key || "diffusers";
        const list = modelLibrary[catKey] || [];
        list.sort().forEach((name) => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.innerText = name;
            modelSelect.appendChild(opt);
        });
        if (initialModelName && activeCat === initialSourceType) {
            modelSelect.value = initialModelName;
        }
    };

    categories.forEach((cat) => {
        const btn = document.createElement("button");
        btn.innerText = cat.label;
        btn.style.cssText = `
            flex: 1;
            padding: 5px 8px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 5px;
            border: 1px solid ${cat.id === activeCat ? "#4f46e5" : "transparent"};
            background: ${cat.id === activeCat ? "rgba(79, 70, 229, 0.28)" : "transparent"};
            color: ${cat.id === activeCat ? "#e0e7ff" : "#94a3b8"};
            cursor: pointer;
        `;

        btn.onclick = () => {
            activeCat = cat.id;
            Object.keys(catButtons).forEach(k => {
                const isAct = k === activeCat;
                catButtons[k].style.border = isAct ? "1px solid #4f46e5" : "transparent";
                catButtons[k].style.background = isAct ? "rgba(79, 70, 229, 0.28)" : "transparent";
                catButtons[k].style.color = isAct ? "#e0e7ff" : "#94a3b8";
            });
            updateSelector();
        };

        catButtons[cat.id] = btn;
        modelFilterRow.appendChild(btn);
    });

    modalBody.appendChild(modelFilterRow);
    modalBody.appendChild(modelSelectRow);

    // Full Stack Banner
    const stackBanner = document.createElement("div");
    stackBanner.style.cssText = "display: none; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 6px; padding: 6px 10px; font-size: 11px; color: #94a3b8;";
    modalBody.appendChild(stackBanner);

    // SECTION 1: TAGS
    const tagsViewContainer = document.createElement("div");
    tagsViewContainer.style.cssText = "display: flex; flex-direction: column; gap: 8px;";

    const actionsRow = document.createElement("div");
    actionsRow.style.cssText = "display: flex; gap: 6px; align-items: center;";

    const copyTrigBtn = document.createElement("button");
    copyTrigBtn.innerText = "🎯 Copy Triggers";
    copyTrigBtn.style.cssText = "padding: 4px 8px; font-size: 11px; font-weight: 500; background: #1e2535; color: #cbd5e1; border: 1px solid #334155; border-radius: 4px; cursor: pointer;";

    const copyExprBtn = document.createElement("button");
    copyExprBtn.innerText = "😊 Copy Expressions";
    copyExprBtn.style.cssText = "padding: 4px 8px; font-size: 11px; font-weight: 500; background: #1e2535; color: #cbd5e1; border: 1px solid #334155; border-radius: 4px; cursor: pointer;";

    const copyVisBtn = document.createElement("button");
    copyVisBtn.innerText = "📋 Copy Visible";
    copyVisBtn.style.cssText = "padding: 4px 8px; font-size: 11px; font-weight: 500; background: #1e2535; color: #cbd5e1; border: 1px solid #334155; border-radius: 4px; cursor: pointer;";

    actionsRow.appendChild(copyTrigBtn);
    actionsRow.appendChild(copyExprBtn);
    actionsRow.appendChild(copyVisBtn);
    tagsViewContainer.appendChild(actionsRow);

    // Tags subcategories pills
    const pillsRow = document.createElement("div");
    pillsRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; gap: 4px; flex-wrap: wrap;";

    const pillsGroup = document.createElement("div");
    pillsGroup.style.display = "flex";
    pillsGroup.style.flexWrap = "wrap";
    pillsGroup.style.gap = "4px";

    let activeTagCat = "all";
    let tagSearchQuery = "";
    let currentData = null;

    const tagCats = [
        { id: "all", label: "All" },
        { id: "trigger", label: "🎯 Triggers" },
        { id: "expression", label: "😊 Expressions" },
        { id: "pose", label: "💃 Poses" },
        { id: "lighting", label: "💡 Lighting" },
        { id: "style", label: "🎨 Style" },
        { id: "quality", label: "✨ Quality" }
    ];

    const tagPillButtons = {};
    tagCats.forEach((c) => {
        const btn = document.createElement("button");
        btn.innerText = c.label;
        btn.style.cssText = `padding: 3px 8px; font-size: 10px; border-radius: 4px; border: 1px solid ${c.id === "all" ? "#6366f1" : "#1f2937"}; background: ${c.id === "all" ? "rgba(99, 102, 241, 0.25)" : "transparent"}; color: ${c.id === "all" ? "#e0e7ff" : "#94a3b8"}; cursor: pointer;`;
        btn.onclick = () => {
            activeTagCat = c.id;
            Object.keys(tagPillButtons).forEach(k => {
                const isAct = k === activeTagCat;
                tagPillButtons[k].style.border = isAct ? "1px solid #6366f1" : "1px solid #1f2937";
                tagPillButtons[k].style.background = isAct ? "rgba(99, 102, 241, 0.25)" : "transparent";
                tagPillButtons[k].style.color = isAct ? "#e0e7ff" : "#94a3b8";
            });
            renderChips();
        };
        tagPillButtons[c.id] = btn;
        pillsGroup.appendChild(btn);
    });

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "🔍 Search tags...";
    searchInput.style.cssText = "width: 110px; padding: 3px 8px; font-size: 11px; background: #171d29; border: 1px solid #283347; border-radius: 4px; color: #f1f5f9; outline: none;";
    searchInput.oninput = (e) => {
        tagSearchQuery = e.target.value.trim().toLowerCase();
        renderChips();
    };

    pillsRow.appendChild(pillsGroup);
    pillsRow.appendChild(searchInput);
    tagsViewContainer.appendChild(pillsRow);

    const chipsScrollArea = document.createElement("div");
    chipsScrollArea.style.cssText = "display: flex; flex-wrap: wrap; gap: 4px; min-height: 140px; max-height: 280px; overflow-y: auto; padding: 6px; background: #0c0f16; border-radius: 6px; border: 1px solid #1b212f;";
    chipsScrollArea.innerHTML = `<span style="color:#64748b; font-style:italic; padding:6px;">Select a model and click "Scry" to extract triggers, expressions, & parameters.</span>`;
    tagsViewContainer.appendChild(chipsScrollArea);

    modalBody.appendChild(tagsViewContainer);

    // SECTION 2: GOLDEN RECIPE
    const recipeViewContainer = document.createElement("div");
    recipeViewContainer.style.cssText = "display: none; flex-direction: column; gap: 10px; overflow-y: auto; flex: 1;";
    recipeViewContainer.innerHTML = `<span style="color:#64748b; font-style:italic; padding:6px;">Golden settings & training recipe will appear here after scrying.</span>`;
    modalBody.appendChild(recipeViewContainer);

    // SECTION 3: DEEP DIVE & WEIGHT HEALTH AUDIT
    const deepViewContainer = document.createElement("div");
    deepViewContainer.style.cssText = "display: none; flex-direction: column; gap: 10px; overflow-y: auto; flex: 1;";
    deepViewContainer.innerHTML = `<span style="color:#64748b; font-style:italic; padding:6px;">Select a model to view deep weight health, layer distribution, and full-stack specs.</span>`;
    modalBody.appendChild(deepViewContainer);

    // View Switching
    const updateActiveTab = (viewName) => {
        activeView = viewName;
        tagsTab.style.background = viewName === "tags" ? "#6366f1" : "transparent";
        tagsTab.style.color = viewName === "tags" ? "#ffffff" : "#94a3b8";

        recipeTab.style.background = viewName === "recipe" ? "#6366f1" : "transparent";
        recipeTab.style.color = viewName === "recipe" ? "#ffffff" : "#94a3b8";

        deepTab.style.background = viewName === "deep" ? "#6366f1" : "transparent";
        deepTab.style.color = viewName === "deep" ? "#ffffff" : "#94a3b8";

        tagsViewContainer.style.display = viewName === "tags" ? "flex" : "none";
        recipeViewContainer.style.display = viewName === "recipe" ? "flex" : "none";
        deepViewContainer.style.display = viewName === "deep" ? "flex" : "none";
    };

    tagsTab.onclick = () => updateActiveTab("tags");
    recipeTab.onclick = () => updateActiveTab("recipe");
    deepTab.onclick = () => updateActiveTab("deep");

    // Render Chips
    const renderChips = () => {
        chipsScrollArea.innerHTML = "";
        if (!currentData || !currentData.tags || currentData.tags.length === 0) {
            chipsScrollArea.innerHTML = `<span style="color:#64748b; font-style:italic; padding:6px;">No tags found for this model.</span>`;
            return;
        }

        const filtered = currentData.tags.filter((t) => {
            const cat = (t.category || "").toLowerCase();
            if (activeTagCat !== "all") {
                if (activeTagCat === "trigger" && !cat.includes("trigger")) return false;
                if (activeTagCat === "expression" && !cat.includes("expression")) return false;
                if (activeTagCat === "pose" && !cat.includes("pose")) return false;
                if (activeTagCat === "lighting" && !cat.includes("lighting")) return false;
                if (activeTagCat === "style" && !cat.includes("style")) return false;
                if (activeTagCat === "quality" && !cat.includes("quality")) return false;
            }
            if (tagSearchQuery && !t.tag.toLowerCase().includes(tagSearchQuery)) return false;
            return true;
        });

        if (filtered.length === 0) {
            chipsScrollArea.innerHTML = `<span style="color:#64748b; font-style:italic; padding:6px;">No tags match current filter.</span>`;
            return;
        }

        filtered.forEach(t => chipsScrollArea.appendChild(createTagChip(t)));
    };

    // Render Recipe View
    const renderRecipe = (data) => {
        const run = data.run_settings || {};
        const rec = data.training_recipe || {};
        const neg = data.negative_prompt || "";

        let html = `
            <div style="background:#131824; border:1px solid #1e2638; border-radius:8px; padding:10px;">
                <div style="font-weight:700; color:#38bdf8; margin-bottom:8px; font-size:12px;">🎯 Recommended Golden Run Settings</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:11px;">
                    <div><span style="color:#64748b;">Sampler:</span> <strong>${run.sampler || 'euler'}</strong></div>
                    <div><span style="color:#64748b;">Scheduler:</span> <strong>${run.scheduler || 'normal'}</strong></div>
                    <div><span style="color:#64748b;">Step Range:</span> <strong>${run.steps || '24 - 30'}</strong></div>
                    <div><span style="color:#64748b;">CFG Scale:</span> <strong>${run.cfg || '7.0'}</strong></div>
                    <div><span style="color:#64748b;">CLIP Skip:</span> <strong>${run.clip_skip != null ? run.clip_skip : 'Default'}</strong></div>
                    <div><span style="color:#64748b;">Native Aspect Ratios:</span> <strong>${run.native_res || '1024x1024'}</strong></div>
                </div>
            </div>
        `;

        if (neg) {
            html += `
                <div style="background:#131824; border:1px solid #1e2638; border-radius:8px; padding:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-weight:700; color:#f87171; font-size:12px;">🚫 Negative Prompt Blueprint</span>
                        <button id="modal-copy-neg" style="padding:3px 8px; font-size:10px; background:#242c3d; color:#e2e8f0; border:1px solid #3b465c; border-radius:4px; cursor:pointer;">📋 Copy Negative</button>
                    </div>
                    <div style="font-size:11px; color:#cbd5e1; background:#0a0d14; padding:6px 10px; border-radius:4px; font-family:monospace; line-height:1.4;">${neg}</div>
                </div>
            `;
        }

        if (rec && Object.keys(rec).length > 0) {
            html += `
                <div style="background:#131824; border:1px solid #1e2638; border-radius:8px; padding:10px;">
                    <div style="font-weight:700; color:#c084fc; margin-bottom:8px; font-size:12px;">📊 Training Recipe & LoRA Diagnosis</div>
                    <div style="font-size:11px; color:#cbd5e1; line-height:1.5;">
                        ${rec.rank ? `<div>• <strong>Network Rank:</strong> ${rec.rank} | <strong>Alpha:</strong> ${rec.alpha} (Ratio: ${rec.alpha_rank_ratio})</div>` : ''}
                        ${rec.recommended_strength ? `<div>• <strong>Recommended LoRA Strength:</strong> <span style="color:#34d399;">${rec.recommended_strength}</span></div>` : ''}
                        ${rec.training_resolution ? `<div>• <strong>Training Resolution:</strong> ${rec.training_resolution}</div>` : ''}
                        ${rec.epochs ? `<div>• <strong>Epochs:</strong> ${rec.epochs} ${rec.steps ? `(${rec.steps} steps)` : ''}</div>` : ''}
                    </div>
                </div>
            `;
        }

        if (run.prompt_blueprint) {
            html += `
                <div style="background:#131824; border:1px solid #1e2638; border-radius:8px; padding:10px;">
                    <div style="font-weight:700; color:#34d399; margin-bottom:6px; font-size:12px;">📝 Optimal Prompt Sequence</div>
                    <div style="font-size:11px; color:#94a3b8; font-family:monospace; background:#0a0d14; padding:6px 10px; border-radius:4px;">${run.prompt_blueprint}</div>
                </div>
            `;
        }

        recipeViewContainer.innerHTML = html;
        const negBtn = recipeViewContainer.querySelector("#modal-copy-neg");
        if (negBtn) {
            negBtn.onclick = () => copyToClipboard(neg, negBtn);
        }
    };

    // Render Deep Dive View
    const renderDeepDive = (data) => {
        const deep = data.deep_dive;
        if (!deep) {
            deepViewContainer.innerHTML = `<span style="color:#64748b; font-style:italic; padding:6px;">No deep tensor audit available for this model.</span>`;
            return;
        }

        const health = deep.weight_health || {};
        const companions = deep.full_stack_companions || {};
        const train = deep.training_details || {};
        const layers = deep.layer_distribution || [];

        let layersHtml = "";
        if (layers.length > 0) {
            layersHtml = `
                <div style="background:#131824; border:1px solid #1e2638; border-radius:8px; padding:12px;">
                    <div style="font-weight:700; color:#38bdf8; margin-bottom:10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                        <span>🧩 Layer Weight Mass & Distribution</span>
                        <span style="font-weight:400; color:#94a3b8; font-size:11px;">Total: ${deep.param_count_human} (${deep.tensor_count} Tensors)</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
            `;
            layers.forEach(l => {
                layersHtml += `
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:3px;">
                            <span style="color:#cbd5e1;">${l.name}</span>
                            <span style="font-weight:600; color:#38bdf8;">${l.percentage}% <span style="color:#64748b; font-weight:400;">(${l.params})</span></span>
                        </div>
                        <div style="background:#0a0d14; height:6px; border-radius:3px; overflow:hidden;">
                            <div style="width:${Math.min(100, Math.max(2, l.percentage))}%; height:100%; background:linear-gradient(90deg, #6366f1, #38bdf8); border-radius:3px;"></div>
                        </div>
                    </div>
                `;
            });
            layersHtml += `</div></div>`;
        }

        let html = `
            <!-- Top Specs Overview Badge Bar -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:8px;">
                <div style="background:#131824; border:1px solid #1e2638; border-radius:8px; padding:8px 10px;">
                    <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:600;">Total Parameters</div>
                    <div style="font-size:13px; font-weight:700; color:#c084fc; margin-top:2px;">${deep.param_count_human}</div>
                </div>
                <div style="background:#131824; border:1px solid #1e2638; border-radius:8px; padding:8px 10px;">
                    <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:600;">Disk Footprint</div>
                    <div style="font-size:13px; font-weight:700; color:#38bdf8; margin-top:2px;">${deep.file_size_human}</div>
                </div>
                <div style="background:#131824; border:1px solid #1e2638; border-radius:8px; padding:8px 10px;">
                    <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:600;">Tensor Precision</div>
                    <div style="font-size:13px; font-weight:700; color:#34d399; margin-top:2px;">${deep.precision_summary}</div>
                </div>
                <div style="background:#131824; border:1px solid #1e2638; border-radius:8px; padding:8px 10px;">
                    <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:600;">AutoV2 Hash</div>
                    <div style="font-size:13px; font-weight:700; color:#f59e0b; margin-top:2px; font-family:monospace;">${deep.model_hash || 'N/A'}</div>
                </div>
            </div>

            <!-- Weight Health & Saturation Diagnosis Card -->
            <div style="background:#131824; border:1px solid ${health.status_color || '#34d399'}44; border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:700; color:${health.status_color || '#34d399'}; font-size:13px;">🩺 Weight Health: ${health.verdict || 'Healthy'}</span>
                        <span style="background:${health.status_color || '#34d399'}22; color:${health.status_color || '#34d399'}; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:700;">Score: ${health.health_score || 95}%</span>
                    </div>
                    <div style="font-size:11px; color:#94a3b8;">
                        Mean Norm: <strong>${health.mean_norm || '1.0'}</strong> | Max: <strong>${health.max_norm || '2.0'}</strong>
                    </div>
                </div>
                <div style="font-size:11px; color:#cbd5e1; line-height:1.5; background:#0a0d14; padding:8px 12px; border-radius:6px; border:1px solid #1e2638;">
                    <div>${health.diagnosis || 'Model weights are in equilibrium.'}</div>
                    ${health.cfg_advice ? `<div style="margin-top:4px; color:#38bdf8;"><strong>Steering Recommendation:</strong> ${health.cfg_advice}</div>` : ''}
                </div>
            </div>

            <!-- Full-Stack Companion Requirements (No Guesswork) -->
            <div style="background:#131824; border:1px solid #1e2638; border-radius:8px; padding:12px;">
                <div style="font-weight:700; color:#c084fc; margin-bottom:8px; font-size:12px;">⚡ Required Companion Stack (Zero Guesswork)</div>
                <div style="display:grid; grid-template-columns: 1fr; gap:6px; font-size:11px;">
                    <div><span style="color:#64748b; font-weight:600;">Text Encoder(s):</span> <span style="color:#cbd5e1;">${companions.text_encoders || 'Auto-detected'}</span></div>
                    <div><span style="color:#64748b; font-weight:600;">Required VAE:</span> <span style="color:#cbd5e1;">${companions.vae || 'Auto-detected'}</span></div>
                    <div><span style="color:#64748b; font-weight:600;">Guidance Model:</span> <span style="color:#cbd5e1;">${companions.guidance_model || 'Standard'}</span></div>
                    <div><span style="color:#64748b; font-weight:600;">Native Resolutions:</span> <span style="color:#cbd5e1;">${companions.native_res || '1024x1024'}</span></div>
                </div>
            </div>

            <!-- Layer Mass Distribution -->
            ${layersHtml}

            <!-- Deep Training Hyperparameters -->
            <div style="background:#131824; border:1px solid #1e2638; border-radius:8px; padding:12px;">
                <div style="font-weight:700; color:#34d399; margin-bottom:8px; font-size:12px;">🛠️ Training Architecture & Optimization</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:11px;">
                    <div><span style="color:#64748b;">Network Type:</span> <strong style="color:#e2e8f0;">${train.network_type || 'Standard'}</strong></div>
                    <div><span style="color:#64748b;">Optimizer:</span> <strong style="color:#e2e8f0;">${train.optimizer || 'Standard'}</strong></div>
                    <div><span style="color:#64748b;">Scheduler:</span> <strong style="color:#e2e8f0;">${train.scheduler || 'Standard'}</strong></div>
                    <div><span style="color:#64748b;">Dataset Size:</span> <strong style="color:#e2e8f0;">${train.dataset_images || 'Not recorded'}</strong></div>
                    <div><span style="color:#64748b;">Learning Rate:</span> <strong style="color:#e2e8f0;">${train.learning_rate || 'Standard'}</strong></div>
                    <div><span style="color:#64748b;">Text Encoder LR:</span> <strong style="color:#e2e8f0;">${train.text_encoder_lr || 'Standard'}</strong></div>
                    <div><span style="color:#64748b;">Noise Offset:</span> <strong style="color:#e2e8f0;">${train.noise_offset || 'Standard'}</strong></div>
                    <div><span style="color:#64748b;">Min-SNR Gamma:</span> <strong style="color:#e2e8f0;">${train.min_snr_gamma || 'Standard'}</strong></div>
                </div>
            </div>
        `;

        deepViewContainer.innerHTML = html;
    };

    // Scry execution
    const runScry = async (sourceType, modelName) => {
        if (!modelName || modelName === "none") {
            chipsScrollArea.innerHTML = `<span style="color:#ef4444; padding:6px;">Please select a ${sourceType} first.</span>`;
            return;
        }

        chipsScrollArea.innerHTML = `<span style="color:#38bdf8; padding:6px;">🔮 Peering into weights of ${modelName}...</span>`;

        try {
            const res = await api.fetchApi(`/zombiehaus/scry_model?source_type=${encodeURIComponent(sourceType)}&model_name=${encodeURIComponent(modelName)}&max_tags=60`);
            const data = await res.json();
            if (data.success && data.data) {
                currentData = data.data;

                // Update tab pill counts
                const allCnt = currentData.tags.length;
                const trigCnt = currentData.tags.filter(t => (t.category || "").toLowerCase().includes("trigger")).length;
                const exprCnt = currentData.tags.filter(t => (t.category || "").toLowerCase().includes("expression")).length;
                const poseCnt = currentData.tags.filter(t => (t.category || "").toLowerCase().includes("pose")).length;
                const lightCnt = currentData.tags.filter(t => (t.category || "").toLowerCase().includes("lighting")).length;
                const styleCnt = currentData.tags.filter(t => (t.category || "").toLowerCase().includes("style")).length;
                const qualCnt = currentData.tags.filter(t => (t.category || "").toLowerCase().includes("quality")).length;

                tagPillButtons["all"].innerText = `All (${allCnt})`;
                tagPillButtons["trigger"].innerText = `🎯 (${trigCnt})`;
                tagPillButtons["expression"].innerText = `😊 (${exprCnt})`;
                tagPillButtons["pose"].innerText = `💃 (${poseCnt})`;
                tagPillButtons["lighting"].innerText = `💡 (${lightCnt})`;
                tagPillButtons["style"].innerText = `🎨 (${styleCnt})`;
                tagPillButtons["quality"].innerText = `✨ (${qualCnt})`;

                renderChips();
                renderRecipe(currentData);
                renderDeepDive(currentData);
            } else {
                chipsScrollArea.innerHTML = `<span style="color:#ef4444; padding:6px;">Error: ${data.message || 'Inspection failed.'}</span>`;
            }
        } catch (err) {
            chipsScrollArea.innerHTML = `<span style="color:#ef4444; padding:6px;">Network error: ${err.message}</span>`;
        }
    };

    scryActionBtn.onclick = () => runScry(activeCat, modelSelect.value);
    modelSelect.onchange = () => {
        if (modelSelect.value && modelSelect.value !== "none") {
            runScry(activeCat, modelSelect.value);
        }
    };

    copyTrigBtn.onclick = () => {
        if (!currentData) return;
        const trigs = currentData.triggers?.length ? currentData.triggers.join(", ") : currentData.tags.slice(0, 5).map(t => t.tag).join(", ");
        copyToClipboard(trigs, copyTrigBtn);
    };

    copyExprBtn.onclick = () => {
        if (!currentData) return;
        const exprs = currentData.expressions?.length ? currentData.expressions.join(", ") : currentData.tags.filter(t => (t.category || "").toLowerCase().includes("expression")).map(t => t.tag).join(", ");
        copyToClipboard(exprs, copyExprBtn);
    };

    copyVisBtn.onclick = () => {
        const visible = Array.from(chipsScrollArea.querySelectorAll(".zombiehaus-scry-chip span:first-child")).map(s => s.innerText);
        if (visible.length) copyToClipboard(visible.join(", "), copyVisBtn);
    };

    // Fetch models and trigger auto-scry if initialModelName was provided
    api.fetchApi("/zombiehaus/list_models").then(async (res) => {
        try {
            const d = await res.json();
            if (d.success && d.data) {
                modelLibrary = d.data;
                updateSelector();
                if (initialModelName && initialModelName !== "none") {
                    runScry(initialSourceType, initialModelName);
                }
            }
        } catch (_) {}
    });

    dialog.appendChild(modalBody);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

// ── Persistent ComfyUI Top Menu & Floating Launcher ──────────────────────────
function attachComfyMenuLauncher() {
    if (document.getElementById("zombiehaus-scryer-menu-btn")) return;

    // 1. Try modern top menu bar
    const menuBar = document.querySelector(".comfy-menu") || document.querySelector("#comfyui-menu-bar") || document.querySelector(".comfyui-menu");
    if (menuBar) {
        const btn = document.createElement("button");
        btn.id = "zombiehaus-scryer-menu-btn";
        btn.className = "comfy-btn";
        btn.innerHTML = "🔮 Zombiehaus Scryer";
        btn.title = "Open Zombiehaus Model Scryer Cockpit (Auditing Diffusers, LoRAs & Checkpoints)";
        btn.style.cssText = "font-weight: 600; color: #c084fc; cursor: pointer;";
        btn.onclick = (e) => {
            e.preventDefault();
            openGlobalModelScryerDialog();
        };
        menuBar.appendChild(btn);
    }

    // 2. Persistent Floating Quick Launcher (Draggable anywhere on screen)
    if (!document.getElementById("zombiehaus-scryer-float-btn")) {
        const floatBtn = document.createElement("button");
        floatBtn.id = "zombiehaus-scryer-float-btn";
        floatBtn.type = "button";
        floatBtn.innerHTML = "🔮 Zombiehaus Oracle";
        floatBtn.title = "Drag anywhere or click to open Zombiehaus Model Scryer Cockpit";

        // Read saved position if available
        let savedPos = null;
        try {
            const raw = localStorage.getItem("zombiehaus_oracle_pill_pos");
            if (raw) savedPos = JSON.parse(raw);
        } catch (_) {}

        let initialLeft = "18px";
        let initialTop = "auto";
        let initialBottom = "58px";

        if (savedPos && typeof savedPos.left === "number" && typeof savedPos.top === "number") {
            const boundedLeft = Math.max(4, Math.min(window.innerWidth - 120, savedPos.left));
            const boundedTop = Math.max(4, Math.min(window.innerHeight - 40, savedPos.top));
            initialLeft = `${boundedLeft}px`;
            initialTop = `${boundedTop}px`;
            initialBottom = "auto";
        }

        floatBtn.style.cssText = `
            position: fixed;
            bottom: ${initialBottom};
            left: ${initialLeft};
            top: ${initialTop};
            z-index: 9998;
            background: #111420;
            color: #c084fc;
            border: 1px solid #3b2b68;
            border-radius: 8px;
            padding: 6px 12px;
            font-weight: 700;
            font-size: 11px;
            cursor: move;
            user-select: none;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7);
            transition: border-color 0.15s ease;
        `;

        let isDraggingBtn = false;
        let btnStartX = 0;
        let btnStartY = 0;
        let btnInitialLeft = 18;
        let btnInitialTop = window.innerHeight - 90;
        let hasMoved = false;

        floatBtn.onmousedown = (e) => {
            isDraggingBtn = true;
            hasMoved = false;
            btnStartX = e.clientX;
            btnStartY = e.clientY;
            const rect = floatBtn.getBoundingClientRect();
            btnInitialLeft = rect.left;
            btnInitialTop = rect.top;
            floatBtn.style.bottom = "auto";
            floatBtn.style.left = `${btnInitialLeft}px`;
            floatBtn.style.top = `${btnInitialTop}px`;

            const onMouseMove = (me) => {
                if (!isDraggingBtn) return;
                const dx = me.clientX - btnStartX;
                const dy = me.clientY - btnStartY;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
                const nextLeft = Math.max(4, Math.min(window.innerWidth - 120, btnInitialLeft + dx));
                const nextTop = Math.max(4, Math.min(window.innerHeight - 40, btnInitialTop + dy));
                floatBtn.style.left = `${nextLeft}px`;
                floatBtn.style.top = `${nextTop}px`;
            };

            const onMouseUp = () => {
                isDraggingBtn = false;
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
                if (hasMoved) {
                    const rect = floatBtn.getBoundingClientRect();
                    try {
                        localStorage.setItem("zombiehaus_oracle_pill_pos", JSON.stringify({
                            left: Math.round(rect.left),
                            top: Math.round(rect.top)
                        }));
                    } catch (_) {}
                }
            };

            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        };

        floatBtn.onmouseenter = () => { floatBtn.style.borderColor = "#8b5cf6"; };
        floatBtn.onmouseleave = () => { floatBtn.style.borderColor = "#3b2b68"; };
        floatBtn.onclick = (e) => {
            e.preventDefault();
            if (hasMoved) return;
            openGlobalModelScryerDialog();
        };
        document.body.appendChild(floatBtn);
    }
}

// ── ComfyUI Extension Registration ──────────────────────────────────────────
app.registerExtension({
    name: "zombiehaus.ModelScryer",

    async setup() {
        attachComfyMenuLauncher();
        setTimeout(attachComfyMenuLauncher, 1000);
        setTimeout(attachComfyMenuLauncher, 3000);
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // Universal Right-Click Node Context Menu for all Model & LoRA Loaders
        const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function (_, options) {
            const r = origGetExtraMenuOptions ? origGetExtraMenuOptions.apply(this, arguments) : undefined;
            const node = this;

            // Detect if this node has model, lora, or checkpoint widgets
            let detectedType = null;
            let detectedModel = null;

            const loraW = node.widgets?.find(w => w.name === "lora_name");
            const ckptW = node.widgets?.find(w => w.name === "ckpt_name" || w.name === "checkpoint_name");
            const unetW = node.widgets?.find(w => w.name === "unet_name" || w.name === "diffuser_name");

            if (loraW && loraW.value && loraW.value !== "none") {
                detectedType = "LoRAs";
                detectedModel = loraW.value;
            } else if (unetW && unetW.value && unetW.value !== "none") {
                detectedType = "Diffusers";
                detectedModel = unetW.value;
            } else if (ckptW && ckptW.value && ckptW.value !== "none") {
                detectedType = "Checkpoints";
                detectedModel = ckptW.value;
            }

            if (detectedModel || nodeData.name.includes("Loader") || nodeData.name.includes("Model")) {
                options.push({
                    content: "🔮 Zombiehaus Scry Model",
                    callback: () => {
                        openGlobalModelScryerDialog(detectedType || "Diffusers", detectedModel);
                    }
                });
            }

            return r;
        };

        // On-Node UI for ZombiehausModelScryer / ZombiehausModelScryer canvas node
        if (nodeData.name === "ZombiehausModelScryer") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                const node = this;

                const currentWidth = node.size ? node.size[0] : 440;
                const currentHeight = node.size ? node.size[1] : 480;
                node.setSize([Math.max(currentWidth, 440), Math.max(currentHeight, 460)]);

                const container = document.createElement("div");
                container.style.cssText = "display: flex; flex-direction: column; width: 100%; background: #0f121a; border: 1px solid #1e2536; border-radius: 8px; padding: 8px 10px; box-sizing: border-box; color: #e2e8f0; font-size: 11px; margin-top: 4px; gap: 6px;";

                // Header with optional Pop-Out button
                const header = document.createElement("div");
                header.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 1px solid #1e2636;";

                const titleGroup = document.createElement("div");
                titleGroup.style.display = "flex";
                titleGroup.style.alignItems = "center";
                titleGroup.style.gap = "6px";
                titleGroup.innerHTML = `<span>🔮</span><span style="font-weight:600; color:#c084fc;">Zombiehaus Model Scryer</span>`;

                const popOutBtn = document.createElement("button");
                popOutBtn.innerText = "⛶ Pop-Out Window";
                popOutBtn.title = "Open detached floating cockpit";
                popOutBtn.style.cssText = "padding: 2px 8px; font-size: 10px; font-weight: 600; background: #242c3d; color: #cbd5e1; border: 1px solid #3b465c; border-radius: 4px; cursor: pointer;";
                popOutBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const sourceType = node.widgets?.find(w => w.name === "source_type")?.value || "Diffusers";
                    let modelName = "none";
                    if (sourceType === "Diffusers") modelName = node.widgets?.find(w => w.name === "diffuser_name")?.value;
                    else if (sourceType === "LoRAs") modelName = node.widgets?.find(w => w.name === "lora_name")?.value;
                    else modelName = node.widgets?.find(w => w.name === "checkpoint_name")?.value;
                    openGlobalModelScryerDialog(sourceType, modelName);
                };

                header.appendChild(titleGroup);
                header.appendChild(popOutBtn);
                container.appendChild(header);

                // On-node preview content area
                const contentArea = document.createElement("div");
                contentArea.style.cssText = "display: flex; flex-direction: column; gap: 6px; font-size: 11px;";
                contentArea.innerHTML = `<span style="color:#64748b; font-style:italic;">Queue prompt or click 'Inspect Model on Node' to evaluate weights & triggers directly here.</span>`;
                container.appendChild(contentArea);

                // Add as DOM widget
                node.addDOMWidget("scry_board", "tag_board", container, {
                    getValue() { return ""; },
                    setValue(v) { }
                });

                // Helper to render inspection directly ON THE NODE
                const updateNodeDisplay = (data) => {
                    if (!data) return;
                    const arch = data.architecture || "Unknown";
                    const deep = data.deep_dive || {};
                    const health = deep.weight_health || {};
                    const comp = deep.full_stack_companions || {};
                    const trigs = (data.triggers && data.triggers.length) ? data.triggers.join(", ") : "Natural language prose";

                    contentArea.innerHTML = `
                        <div style="background:#131824; border:1px solid #1e2638; border-radius:6px; padding:6px 8px;">
                            <div style="font-weight:700; color:#38bdf8;">📦 ${data.file_name || 'Model'} (${arch})</div>
                            <div style="font-size:10px; color:#94a3b8; margin-top:2px;">
                                ${deep.param_count_human ? `${deep.param_count_human} | ` : ''}
                                ${deep.precision_summary ? `${deep.precision_summary} | ` : ''}
                                Health: <strong style="color:${health.status_color || '#34d399'};">${health.verdict || 'OK'}</strong>
                            </div>
                        </div>
                        <div style="background:#131824; border:1px solid #1e2638; border-radius:6px; padding:6px 8px;">
                            <div style="font-weight:700; color:#c084fc; font-size:10px;">🎯 Triggers:</div>
                            <div style="font-size:11px; color:#cbd5e1; margin-top:2px; word-break:break-word;">${trigs}</div>
                        </div>
                        <div style="background:#131824; border:1px solid #1e2638; border-radius:6px; padding:6px 8px;">
                            <div style="font-weight:700; color:#34d399; font-size:10px;">⚡ Required Companions:</div>
                            <div style="font-size:10px; color:#cbd5e1; margin-top:2px;">
                                <div>• Text: ${comp.text_encoders || 'Auto'}</div>
                                <div>• VAE: ${comp.vae || 'Auto'}</div>
                            </div>
                        </div>
                    `;
                };

                // Listen for execution updates from Python (supporting both Zombiehaus and legacy Zombiehaus events)
                const handleScryerUpdate = (event) => {
                    if (event.detail && (event.detail.node_id == node.id || !event.detail.node_id)) {
                        updateNodeDisplay(event.detail);
                    }
                };
                api.addEventListener("zombiehaus-model-scryer-update", handleScryerUpdate);
                api.addEventListener("zombiehaus-model-scryer-update", handleScryerUpdate);

                // Add on-node action button: inspects and displays ON NODE without opening popup
                node.addWidget("button", "🔍 Inspect Model on Node", null, async () => {
                    const sourceType = node.widgets?.find(w => w.name === "source_type")?.value || "Diffusers";
                    let modelName = "none";
                    if (sourceType === "Diffusers") modelName = node.widgets?.find(w => w.name === "diffuser_name")?.value;
                    else if (sourceType === "LoRAs") modelName = node.widgets?.find(w => w.name === "lora_name")?.value;
                    else modelName = node.widgets?.find(w => w.name === "checkpoint_name")?.value;

                    if (!modelName || modelName === "none") {
                        contentArea.innerHTML = `<span style="color:#ef4444;">Please select a ${sourceType} in widget above.</span>`;
                        return;
                    }

                    contentArea.innerHTML = `<span style="color:#38bdf8;">🔮 Peering into weights of ${modelName}...</span>`;
                    try {
                        const res = await api.fetchApi(`/zombiehaus/scry_model?source_type=${encodeURIComponent(sourceType)}&model_name=${encodeURIComponent(modelName)}&max_tags=30`);
                        const d = await res.json();
                        if (d.success && d.data) {
                            updateNodeDisplay(d.data);
                        } else {
                            contentArea.innerHTML = `<span style="color:#ef4444;">Error: ${d.message || 'Inspection failed.'}</span>`;
                        }
                    } catch (err) {
                        contentArea.innerHTML = `<span style="color:#ef4444;">Network error: ${err.message}</span>`;
                    }
                });
            };
        }
    }
});
