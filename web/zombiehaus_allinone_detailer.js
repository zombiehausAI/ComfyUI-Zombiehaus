import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// --- Global Progress Tracking ---

let currentDetailerProgress = null;
let listenersRegistered = false;
let isReorderingSlots = false;

function setupProgressListeners() {
    if (listenersRegistered) {
        return;
    }
    listenersRegistered = true;

    api.addEventListener("zombiehaus_detailer_progress", (event) => {
        const data = event.detail;
        if (!data) {
            return;
        }

        if (data.status === "done" || data.slot_index == null) {
            currentDetailerProgress = null;
        } else {
            currentDetailerProgress = {
                ...data,
                timestamp: performance.now()
            };
        }
        app.graph?.setDirtyCanvas?.(true, true);
    });

    api.addEventListener("executing", (event) => {
        const executingNodeId = event.detail;
        if (executingNodeId == null) {
            if (currentDetailerProgress) {
                currentDetailerProgress = null;
                app.graph?.setDirtyCanvas?.(true, true);
            }
        }
    });

    api.addEventListener("execution_error", () => {
        if (currentDetailerProgress) {
            currentDetailerProgress = null;
            app.graph?.setDirtyCanvas?.(true, true);
        }
    });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
    } else {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y + x + radius, y);
        ctx.closePath();
    }
}

app.registerExtension({
    name: "zombiehaus.AllInOneDetailer",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        setupProgressListeners();

        // -------------------------------------------------------------------
        // DetailerSlot Node Hooks (Highlighting the active slot node)
        // -------------------------------------------------------------------
        if (nodeData.name === "ZombiehausDetailerSlot") {
            const origSlotDraw = nodeType.prototype.onDrawForeground;
            nodeType.prototype.onDrawForeground = function (ctx) {
                const r = origSlotDraw ? origSlotDraw.apply(this, arguments) : undefined;
                if (this.flags?.collapsed) {
                    return r;
                }

                if (currentDetailerProgress && String(currentDetailerProgress.source_node_id) === String(this.id)) {
                    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
                    const alpha = 0.45 + 0.45 * pulse;

                    ctx.save();
                    const titleHeight = (LiteGraph && LiteGraph.NODE_TITLE_HEIGHT) || 30;

                    // 1. Glowing outer halo border wrapping the entire node (including title bar)
                    ctx.strokeStyle = `rgba(34, 197, 94, ${alpha})`;
                    ctx.lineWidth = 3 + 2 * pulse;
                    ctx.shadowColor = "#22c55e";
                    ctx.shadowBlur = 14 + 10 * pulse;
                    drawRoundedRect(ctx, -4, -titleHeight - 4, this.size[0] + 8, this.size[1] + titleHeight + 8, 8);
                    ctx.stroke();

                    // 2. Floating status pill badge positioned cleanly ABOVE the title bar
                    ctx.shadowBlur = 0;
                    let statusLabel = "RUNNING";
                    let statusIcon = "▶";
                    if (currentDetailerProgress.status === "detecting") {
                        statusLabel = "DETECTING";
                        statusIcon = "🔍";
                    } else if (currentDetailerProgress.status === "inpainting") {
                        const mCur = currentDetailerProgress.current_mask || 1;
                        const mTot = currentDetailerProgress.total_masks || 1;
                        statusLabel = mTot > 1 ? `INPAINTING (${mCur}/${mTot})` : "INPAINTING";
                        statusIcon = "⚡";
                    } else if (currentDetailerProgress.status === "no_detections") {
                        statusLabel = "0 DETECTIONS";
                        statusIcon = "⚠️";
                    }

                    const bIdx = (currentDetailerProgress.batch_idx || 0) + 1;
                    const bTot = currentDetailerProgress.total_batches || 1;
                    const batchPrefix = bTot > 1 ? `[IMG ${bIdx}/${bTot}] ` : "";
                    const fullBadgeText = `${statusIcon} ${batchPrefix}${statusLabel} (SLOT #${currentDetailerProgress.slot_index})`;

                    ctx.font = "bold 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
                    const textMetrics = ctx.measureText(fullBadgeText);
                    const pillW = textMetrics.width + 22;
                    const pillH = 22;
                    const pillX = (this.size[0] - pillW) / 2;
                    // Position clearly above the title bar with a clean 6px air gap
                    const pillY = -titleHeight - pillH - 6;

                    // Solid opaque dark background (no see-through or bleed)
                    ctx.fillStyle = "#0c140e";
                    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 5);
                    ctx.fill();

                    // Glowing accent border around pill
                    ctx.strokeStyle = "#22c55e";
                    ctx.lineWidth = 1.5;
                    ctx.shadowColor = "#22c55e";
                    ctx.shadowBlur = 6;
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // High-contrast text
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(fullBadgeText, pillX + 11, pillY + 15);

                    ctx.restore();

                    // Keep pulse breathing
                    this.setDirtyCanvas(true, true);
                }
                return r;
            };
            return;
        }

        // -------------------------------------------------------------------
        // AllInOneDetailer Main Node Hooks
        // -------------------------------------------------------------------
        if (nodeData.name !== "ZombiehausAllInOneDetailer") {
            return;
        }

        // --- helpers ---

        /** Return all inputs whose name matches slot_N */
        function getSlotInputs(node) {
            if (!node || !node.inputs) {
                return [];
            }
            return node.inputs.filter(inp => /^slot_\d+$/.test(inp.name));
        }

        /**
         * Update display labels (inp.label) for all slot inputs.
         * Priority:
         * 1. Manual user override in node.properties.slot_custom_labels[inp.name]
         * 2. Auto-recognized name from connected origin node (custom title or YOLO model)
         * 3. Fallback to default slot_N
         */
        function updateSlotLabels(node) {
            if (!node || !node.inputs) {
                return;
            }
            const slotInputs = getSlotInputs(node);
            node.properties = node.properties || {};
            node.properties.slot_custom_labels = node.properties.slot_custom_labels || {};

            let maxLabelLen = 0;
            slotInputs.forEach((inp, i) => {
                const slotNum = i + 1;
                const customName = node.properties.slot_custom_labels[inp.name];
                if (customName && customName.trim()) {
                    inp.label = `${slotNum}: ${customName.trim()}`;
                } else if (inp.link != null) {
                    const link = app.graph?.links?.[inp.link];
                    const originNode = link ? app.graph?.getNodeById?.(link.origin_id) : null;
                    if (originNode) {
                        const title = originNode.title?.trim();
                        const isCustomTitle = title &&
                            title !== "Detailer Slot" &&
                            title !== "Zombiehaus Detailer Slot" &&
                            title !== "ZombiehausDetailerSlot";

                        let modelName = "";
                        const modelWidget = originNode.widgets?.find(w => w.name === "model");
                        if (modelWidget && modelWidget.value && modelWidget.value !== "disabled") {
                            const raw = String(modelWidget.value);
                            modelName = raw.split(/[/\\]/).pop().replace(/\.(pt|pth|onnx)$/i, "");
                        }

                        const enabledWidget = originNode.widgets?.find(w => w.name === "enabled");
                        const isEnabled = enabledWidget ? enabledWidget.value !== false : true;

                        let recognized = isCustomTitle ? title : (modelName || "Detailer");
                        if (!isEnabled) {
                            recognized += " [off]";
                        }

                        inp.label = `${slotNum}: ${recognized}`;
                    } else {
                        inp.label = `slot_${slotNum}`;
                    }
                } else {
                    inp.label = `slot_${slotNum}`;
                }

                if (inp.label && inp.label.length > maxLabelLen) {
                    maxLabelLen = inp.label.length;
                }
            });

            // Ensure comfortable node width for text + move buttons
            const minReqWidth = Math.max(260, maxLabelLen * 7.5 + 75);
            if (node.size && node.size[0] < minReqWidth) {
                node.size[0] = Math.ceil(minReqWidth);
            }
        }

        function getSlotLocalY(node, actualIdx) {
            if (!node || actualIdx == null || actualIdx < 0) {
                return 0;
            }
            if (typeof node.getConnectionPos === "function") {
                const pos = node.getConnectionPos(true, actualIdx);
                if (pos) {
                    return pos[1] - (node.pos?.[1] || 0);
                }
            }
            const slotH = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_SLOT_HEIGHT) || 20;
            return (actualIdx + 0.5) * slotH;
        }

        /**
         * Ensure there is always exactly one unconnected slot at the end.
         */
        function syncSlots(node) {
            if (isReorderingSlots) {
                return;
            }
            const slotInputs = getSlotInputs(node);
            if (slotInputs.length === 0) {
                node.addInput("slot_1", "DETAILER_SLOT");
                updateSlotLabels(node);
                node.setDirtyCanvas(true, true);
                return;
            }

            const lastSlot = slotInputs[slotInputs.length - 1];
            const secondLastSlot = slotInputs.length >= 2
                ? slotInputs[slotInputs.length - 2]
                : null;

            const lastConnected = lastSlot.link != null;
            const secondLastConnected = secondLastSlot ? secondLastSlot.link != null : true;

            if (lastConnected) {
                // All trailing slots filled — add a new empty one
                const nextNum = slotInputs.length + 1;
                node.addInput(`slot_${nextNum}`, "DETAILER_SLOT");
                updateSlotLabels(node);
                node.setDirtyCanvas(true, true);
            } else if (!lastConnected && !secondLastConnected && slotInputs.length > 1) {
                // Two unconnected at the end — remove the last one
                const idx = node.inputs.indexOf(lastSlot);
                node.removeInput(idx);
                updateSlotLabels(node);
                node.setDirtyCanvas(true, true);
                syncSlots(node);
            } else {
                updateSlotLabels(node);
            }
        }

        /**
         * Snapshot current slot origins and custom labels.
         */
        function getSlotOrigins(node) {
            const slotInputs = getSlotInputs(node);
            node.properties = node.properties || {};
            node.properties.slot_custom_labels = node.properties.slot_custom_labels || {};

            return slotInputs.map(inp => {
                if (inp.link == null) {
                    return null;
                }
                const link = app.graph?.links?.[inp.link];
                if (!link) {
                    return null;
                }
                const originNode = app.graph?.getNodeById?.(link.origin_id);
                if (!originNode) {
                    return null;
                }
                return {
                    node: originNode,
                    slot: link.origin_slot,
                    custom: node.properties.slot_custom_labels[inp.name] || null
                };
            });
        }

        /**
         * Reconnect slots cleanly using LiteGraph's native disconnectInput and connect APIs.
         * Protected by isReorderingSlots flag to avoid premature slot trimming.
         */
        function applySlotOrigins(node, newSlotOrigins) {
            if (isReorderingSlots) {
                return;
            }
            isReorderingSlots = true;

            try {
                const slotInputs = getSlotInputs(node);

                // 1. Disconnect all slot inputs cleanly
                slotInputs.forEach(inp => {
                    const idx = node.inputs.indexOf(inp);
                    if (inp.link != null) {
                        node.disconnectInput(idx);
                    }
                });

                // 2. Ensure enough slot inputs exist to hold all origins (plus trailing empty)
                const nonNullCount = newSlotOrigins.filter(Boolean).length;
                const requiredSlots = Math.max(newSlotOrigins.length, nonNullCount + 1, 1);

                while (getSlotInputs(node).length < requiredSlots) {
                    const nextNum = getSlotInputs(node).length + 1;
                    node.addInput(`slot_${nextNum}`, "DETAILER_SLOT");
                }

                const currentSlotInputs = getSlotInputs(node);
                node.properties = node.properties || {};
                node.properties.slot_custom_labels = node.properties.slot_custom_labels || {};

                // 3. Connect each origin to its new target slot using native connect()
                newSlotOrigins.forEach((orig, i) => {
                    const inp = currentSlotInputs[i];
                    if (!inp) {
                        return;
                    }
                    const actualIdx = node.inputs.indexOf(inp);
                    const targetSlotIdx = node.findInputSlot ? node.findInputSlot(inp.name) : actualIdx;

                    if (orig && orig.node) {
                        orig.node.connect(orig.slot, node, targetSlotIdx >= 0 ? targetSlotIdx : actualIdx);
                        if (orig.custom) {
                            node.properties.slot_custom_labels[inp.name] = orig.custom;
                        } else {
                            delete node.properties.slot_custom_labels[inp.name];
                        }
                    } else {
                        delete node.properties.slot_custom_labels[inp.name];
                    }
                });
            } finally {
                isReorderingSlots = false;
            }

            syncSlots(node);
            updateSlotLabels(node);
            if (node.computeSize) {
                const minSize = node.computeSize();
                node.size[0] = Math.max(node.size[0], minSize[0]);
                node.size[1] = Math.max(node.size[1], minSize[1]);
            }
            node.setDirtyCanvas(true, true);
            app.graph?.setDirtyCanvas?.(true, true);
            app.graph?.afterChange?.();
        }

        function insertEmptySlotAt(node, slotNum) {
            const origins = getSlotOrigins(node);
            const targetIdx = slotNum - 1;
            if (targetIdx < 0) {
                return;
            }
            origins.splice(targetIdx, 0, null);
            applySlotOrigins(node, origins);
        }

        function removeSlotAndShiftUp(node, slotNum) {
            const origins = getSlotOrigins(node);
            const idx = slotNum - 1;
            if (idx < 0 || idx >= origins.length) {
                return;
            }
            origins.splice(idx, 1);
            applySlotOrigins(node, origins);
        }

        function swapSlots(node, slotNumA, slotNumB) {
            const origins = getSlotOrigins(node);
            const idxA = slotNumA - 1;
            const idxB = slotNumB - 1;
            if (idxA < 0 || idxA >= origins.length || idxB < 0 || idxB >= origins.length || idxA === idxB) {
                return;
            }

            const temp = origins[idxA];
            origins[idxA] = origins[idxB];
            origins[idxB] = temp;

            applySlotOrigins(node, origins);
        }

        function reorderSlotTo(node, fromSlotNum, toSlotNum) {
            const origins = getSlotOrigins(node);
            const fromIdx = fromSlotNum - 1;
            const toIdx = toSlotNum - 1;
            if (fromIdx < 0 || fromIdx >= origins.length || toIdx < 0 || toIdx >= origins.length || fromIdx === toIdx) {
                return;
            }

            const [moved] = origins.splice(fromIdx, 1);
            origins.splice(toIdx, 0, moved);

            applySlotOrigins(node, origins);
        }

        /**
         * Prompt user to enter a custom display label for a slot.
         */
        function promptRenameSlot(node, slot) {
            node.properties = node.properties || {};
            node.properties.slot_custom_labels = node.properties.slot_custom_labels || {};
            const existing = node.properties.slot_custom_labels[slot.name] || "";
            const res = prompt(`Enter custom display name for ${slot.name} (leave blank to reset to auto):`, existing);
            if (res === null) {
                return;
            }
            const trimmed = res.trim();
            if (trimmed) {
                node.properties.slot_custom_labels[slot.name] = trimmed;
            } else {
                delete node.properties.slot_custom_labels[slot.name];
            }
            updateSlotLabels(node);
            node.setDirtyCanvas(true, true);
        }

        function resolveSlotInput(node, slot) {
            if (!node || slot == null) {
                return null;
            }
            if (typeof slot === "number") {
                return node.inputs?.[slot] || null;
            }
            if (typeof slot === "string") {
                return node.inputs?.find(i => i.name === slot) || null;
            }
            if (slot.name) {
                return slot;
            }
            if (slot.input) {
                return slot.input;
            }
            if (slot.slot != null && typeof slot.slot === "number") {
                return node.inputs?.[slot.slot] || null;
            }
            return null;
        }

        // --- lifecycle hooks ---

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            onNodeCreated?.apply(this, arguments);
            if (getSlotInputs(this).length === 0) {
                this.addInput("slot_1", "DETAILER_SLOT");
            }
            updateSlotLabels(this);
        };

        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function () {
            onConfigure?.apply(this, arguments);
            syncSlots(this);
            updateSlotLabels(this);
        };

        const onConnectionsChange = nodeType.prototype.onConnectionsChange;
        nodeType.prototype.onConnectionsChange = function (type, index, connected, link_info) {
            onConnectionsChange?.apply(this, arguments);
            if (isReorderingSlots) {
                return;
            }
            if (type !== 1) {
                return;
            }
            const inp = this.inputs[index];
            if (inp && /^slot_\d+$/.test(inp.name)) {
                syncSlots(this);
                updateSlotLabels(this);
            }
        };

        // --- context menus ---

        const origGetSlotMenuOptions = nodeType.prototype.getSlotMenuOptions;
        nodeType.prototype.getSlotMenuOptions = function (slot) {
            const options = origGetSlotMenuOptions ? origGetSlotMenuOptions.apply(this, arguments) : [];
            const resolvedInp = resolveSlotInput(this, slot);
            if (!resolvedInp || !/^slot_\d+$/.test(resolvedInp.name)) {
                return options;
            }

            const slotInputs = getSlotInputs(this);
            const slotIndex = slotInputs.indexOf(resolvedInp);
            const slotNum = slotIndex + 1;

            const prevSlot = slotIndex > 0 ? slotInputs[slotIndex - 1] : null;
            const nextSlot = slotIndex < slotInputs.length - 1 ? slotInputs[slotIndex + 1] : null;

            const prevName = prevSlot ? (prevSlot.label || prevSlot.name).replace(/^\d+:\s*/, "") : "";
            const nextName = nextSlot ? (nextSlot.label || nextSlot.name).replace(/^\d+:\s*/, "") : "";

            const customOptions = [
                {
                    content: `➕ Insert Empty Slot Above #${slotNum} (Shift Down)`,
                    callback: () => insertEmptySlotAt(this, slotNum)
                }
            ];

            if (slotIndex > 0) {
                customOptions.push({
                    content: `▲ Move Up to #${slotNum - 1}${prevName ? ` (Swap with ${prevName})` : ""}`,
                    callback: () => swapSlots(this, slotNum, slotNum - 1)
                });
            }

            if (slotIndex < slotInputs.length - 1) {
                customOptions.push({
                    content: `▼ Move Down to #${slotNum + 1}${nextName ? ` (Swap with ${nextName})` : ""}`,
                    callback: () => swapSlots(this, slotNum, slotNum + 1)
                });
            }

            customOptions.push({
                content: `✏️ Rename Display Label...`,
                callback: () => promptRenameSlot(this, resolvedInp)
            });

            if (this.properties?.slot_custom_labels?.[resolvedInp.name]) {
                customOptions.push({
                    content: `Reset to Auto-Detected Name`,
                    callback: () => {
                        delete this.properties.slot_custom_labels[resolvedInp.name];
                        updateSlotLabels(this);
                        this.setDirtyCanvas(true, true);
                    }
                });
            }

            if (resolvedInp.link != null) {
                customOptions.push({
                    content: `❌ Remove & Shift Up`,
                    callback: () => removeSlotAndShiftUp(this, slotNum)
                });
            }

            return customOptions.concat(options || []);
        };

        const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function (canvas, options) {
            origGetExtraMenuOptions?.apply(this, arguments);

            const slotInputs = getSlotInputs(this);
            const submenu = [];

            submenu.push({
                content: "➕ Insert Slot at #1 (Shift Down)",
                callback: () => {
                    insertEmptySlotAt(this, 1);
                }
            });

            if (slotInputs.length > 1) {
                const shiftSub = [];
                slotInputs.forEach((inp, i) => {
                    const cleanName = (inp.label || inp.name).replace(/^\d+:\s*/, "");
                    shiftSub.push({
                        content: `Insert above #${i + 1} (${cleanName})`,
                        callback: () => {
                            insertEmptySlotAt(this, i + 1);
                        }
                    });
                });
                submenu.push({
                    content: "Insert Above Slot...",
                    has_submenu: true,
                    submenu: { options: shiftSub }
                });
            }

            const connectedSlots = slotInputs.filter(inp => inp.link != null);
            if (connectedSlots.length > 1) {
                const moveUpSub = [];
                const moveDownSub = [];
                slotInputs.forEach((inp, i) => {
                    const cleanName = (inp.label || inp.name).replace(/^\d+:\s*/, "");
                    if (i > 0) {
                        const targetCleanName = (slotInputs[i - 1].label || slotInputs[i - 1].name).replace(/^\d+:\s*/, "");
                        moveUpSub.push({
                            content: `▲ Move #${i + 1} (${cleanName}) Up to #${i} (Swap with ${targetCleanName})`,
                            callback: () => {
                                swapSlots(this, i + 1, i);
                            }
                        });
                    }
                    if (i < slotInputs.length - 1) {
                        const targetCleanName = (slotInputs[i + 1].label || slotInputs[i + 1].name).replace(/^\d+:\s*/, "");
                        moveDownSub.push({
                            content: `▼ Move #${i + 1} (${cleanName}) Down to #${i + 2} (Swap with ${targetCleanName})`,
                            callback: () => {
                                swapSlots(this, i + 1, i + 2);
                            }
                        });
                    }
                });
                if (moveUpSub.length > 0) {
                    submenu.push({ content: "Move Slot Up...", has_submenu: true, submenu: { options: moveUpSub } });
                }
                if (moveDownSub.length > 0) {
                    submenu.push({ content: "Move Slot Down...", has_submenu: true, submenu: { options: moveDownSub } });
                }
            }

            submenu.push({
                content: "🔄 Refresh Auto-Detected Names",
                callback: () => {
                    this.properties = this.properties || {};
                    this.properties.slot_custom_labels = {};
                    updateSlotLabels(this);
                    this.setDirtyCanvas(true, true);
                }
            });

            options.push({
                content: "Detailer Slots",
                has_submenu: true,
                submenu: { options: submenu }
            });
        };

        // --- on-node interactive controls: buttons (▲/▼) and drag-and-drop (⠿) ---

        const origOnMouseDown = nodeType.prototype.onMouseDown;
        nodeType.prototype.onMouseDown = function (e, localPos, graphCanvas) {
            if (e.button !== 0) {
                return origOnMouseDown ? origOnMouseDown.apply(this, arguments) : false;
            }
            const slotInputs = getSlotInputs(this);

            if (slotInputs.length > 0) {
                const btnW = 16;
                const btnH = 14;
                const btnDownX = this.size[0] - 22;
                const btnUpX = btnDownX - btnW - 3;

                for (let i = 0; i < slotInputs.length; i++) {
                    const inp = slotInputs[i];
                    const slotNum = i + 1;
                    const actualIdx = this.inputs.indexOf(inp);
                    const slotY = getSlotLocalY(this, actualIdx);

                    // 1. Check direct click on ▲ or ▼ button
                    if (Math.abs(localPos[1] - slotY) <= 8) {
                        if (localPos[0] >= btnUpX && localPos[0] <= btnUpX + btnW) {
                            if (i > 0) {
                                swapSlots(this, slotNum, slotNum - 1);
                                return true;
                            }
                        }
                        if (localPos[0] >= btnDownX && localPos[0] <= btnDownX + btnW) {
                            if (i < slotInputs.length - 1) {
                                swapSlots(this, slotNum, slotNum + 1);
                                return true;
                            }
                        }
                    }

                    // 2. Check click on ⠿ drag handle (between socket circle and label)
                    if (localPos[0] >= 6 && localPos[0] <= 24 && Math.abs(localPos[1] - slotY) <= 8) {
                        this._dragSlot = {
                            fromActualIdx: actualIdx,
                            fromSlotIdx: i,
                            startY: localPos[1],
                            currentY: localPos[1],
                            hoverTargetIdx: i
                        };
                        this.setDirtyCanvas(true, true);
                        return true;
                    }
                }
            }

            return origOnMouseDown ? origOnMouseDown.apply(this, arguments) : false;
        };

        const origOnMouseMove = nodeType.prototype.onMouseMove;
        nodeType.prototype.onMouseMove = function (e, localPos, graphCanvas) {
            if (this._dragSlot) {
                this._dragSlot.currentY = localPos[1];
                const slotInputs = getSlotInputs(this);
                let closestIdx = this._dragSlot.fromSlotIdx;
                let minDist = Infinity;
                for (let i = 0; i < slotInputs.length; i++) {
                    const inp = slotInputs[i];
                    const actualIdx = this.inputs.indexOf(inp);
                    const slotY = getSlotLocalY(this, actualIdx);
                    const dist = Math.abs(localPos[1] - slotY);
                    if (dist < minDist) {
                        minDist = dist;
                        closestIdx = i;
                    }
                }
                this._dragSlot.hoverTargetIdx = closestIdx;
                this.setDirtyCanvas(true, true);
                return true;
            }

            // Track hover on ▲ and ▼ buttons
            const slotInputs = getSlotInputs(this);
            let hoveredBtn = null;
            let hoveredSlot = null;

            for (let i = 0; i < slotInputs.length; i++) {
                const inp = slotInputs[i];
                const actualIdx = this.inputs.indexOf(inp);
                const slotY = getSlotLocalY(this, actualIdx);
                const btnW = 16;
                const btnH = 14;
                const btnDownX = this.size[0] - 22;
                const btnUpX = btnDownX - btnW - 3;

                if (Math.abs(localPos[1] - slotY) <= 8) {
                    if (localPos[0] >= btnUpX && localPos[0] <= btnUpX + btnW) {
                        hoveredBtn = { slotNum: i + 1, dir: "up" };
                        break;
                    }
                    if (localPos[0] >= btnDownX && localPos[0] <= btnDownX + btnW) {
                        hoveredBtn = { slotNum: i + 1, dir: "down" };
                        break;
                    }
                    if (localPos[0] >= 6 && localPos[0] <= 24) {
                        hoveredSlot = i;
                        break;
                    }
                }
            }

            const changed = (this._hoveredBtn?.slotNum !== hoveredBtn?.slotNum || this._hoveredBtn?.dir !== hoveredBtn?.dir) ||
                            (this._hoveredSlotIdx !== hoveredSlot);
            if (changed) {
                this._hoveredBtn = hoveredBtn;
                this._hoveredSlotIdx = hoveredSlot;
                this.setDirtyCanvas(true, true);
            }

            return origOnMouseMove ? origOnMouseMove.apply(this, arguments) : false;
        };

        const origOnMouseUp = nodeType.prototype.onMouseUp;
        nodeType.prototype.onMouseUp = function (e, localPos, graphCanvas) {
            if (this._dragSlot) {
                const fromSlotNum = this._dragSlot.fromSlotIdx + 1;
                const toSlotNum = this._dragSlot.hoverTargetIdx + 1;

                this._dragSlot = null;
                this.setDirtyCanvas(true, true);

                if (fromSlotNum !== toSlotNum) {
                    reorderSlotTo(this, fromSlotNum, toSlotNum);
                }
                return true;
            }
            return origOnMouseUp ? origOnMouseUp.apply(this, arguments) : false;
        };

        const origOnDrawForeground = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function (ctx) {
            const r = origOnDrawForeground ? origOnDrawForeground.apply(this, arguments) : undefined;
            if (this.flags?.collapsed) {
                return r;
            }

            // Periodically refresh auto labels (every 1.5 seconds)
            const now = Date.now();
            if (!this._lastLabelUpdate || now - this._lastLabelUpdate > 1500) {
                this._lastLabelUpdate = now;
                updateSlotLabels(this);
            }

            const slotInputs = getSlotInputs(this);
            if (slotInputs.length === 0) {
                return r;
            }

            ctx.save();

            const btnW = 16;
            const btnH = 14;
            const btnDownX = this.size[0] - 22;
            const btnUpX = btnDownX - btnW - 3;

            // 1. Draw on-node controls (⠿ drag handle and ▲/▼ buttons) for each slot
            for (let i = 0; i < slotInputs.length; i++) {
                const inp = slotInputs[i];
                const slotNum = i + 1;
                const actualIdx = this.inputs.indexOf(inp);
                const slotY = getSlotLocalY(this, actualIdx);

                const isConnected = inp.link != null;
                const canMoveUp = i > 0;
                const canMoveDown = i < slotInputs.length - 1;

                // ⠿ Drag Handle icon (LoRA style)
                const isGripHover = this._hoveredSlotIdx === i || (this._dragSlot && this._dragSlot.fromSlotIdx === i);
                ctx.font = "bold 13px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = isGripHover ? "#22c55e" : "rgba(255, 255, 255, 0.28)";
                ctx.fillText("⠿", 14, slotY);

                // ▲ and ▼ Move buttons
                if (isConnected || (i < slotInputs.length - 1 && slotInputs[i + 1].link != null)) {
                    const btnY = slotY - btnH / 2;

                    // ▲ UP button
                    const isUpHover = this._hoveredBtn?.slotNum === slotNum && this._hoveredBtn?.dir === "up";
                    ctx.fillStyle = isUpHover ? "rgba(34, 197, 94, 0.45)" : "rgba(255, 255, 255, 0.08)";
                    drawRoundedRect(ctx, btnUpX, btnY, btnW, btnH, 3);
                    ctx.fill();
                    ctx.strokeStyle = isUpHover ? "#22c55e" : "rgba(255, 255, 255, 0.18)";
                    ctx.lineWidth = 1;
                    drawRoundedRect(ctx, btnUpX, btnY, btnW, btnH, 3);
                    ctx.stroke();

                    ctx.font = "bold 9px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = canMoveUp ? (isUpHover ? "#22c55e" : "#e2e8f0") : "rgba(255, 255, 255, 0.25)";
                    ctx.fillText("▲", btnUpX + btnW / 2, slotY);

                    // ▼ DOWN button
                    const isDownHover = this._hoveredBtn?.slotNum === slotNum && this._hoveredBtn?.dir === "down";
                    ctx.fillStyle = isDownHover ? "rgba(34, 197, 94, 0.45)" : "rgba(255, 255, 255, 0.08)";
                    drawRoundedRect(ctx, btnDownX, btnY, btnW, btnH, 3);
                    ctx.fill();
                    ctx.strokeStyle = isDownHover ? "#22c55e" : "rgba(255, 255, 255, 0.18)";
                    ctx.lineWidth = 1;
                    drawRoundedRect(ctx, btnDownX, btnY, btnW, btnH, 3);
                    ctx.stroke();

                    ctx.fillStyle = canMoveDown ? (isDownHover ? "#22c55e" : "#e2e8f0") : "rgba(255, 255, 255, 0.25)";
                    ctx.fillText("▼", btnDownX + btnW / 2, slotY);
                }
            }

            // 2. Draw drag indicator line and floating pill when dragging
            if (this._dragSlot && this._dragSlot.hoverTargetIdx != null) {
                const targetSlot = slotInputs[this._dragSlot.hoverTargetIdx];
                if (targetSlot) {
                    const targetActualIdx = this.inputs.indexOf(targetSlot);
                    const targetY = getSlotLocalY(this, targetActualIdx);

                    ctx.strokeStyle = "#22c55e";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(12, targetY);
                    ctx.lineTo(this.size[0] - 12, targetY);
                    ctx.stroke();

                    ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
                    ctx.font = "bold 11px sans-serif";
                    const dragInp = this.inputs[this._dragSlot.fromActualIdx];
                    const labelText = `Drop to Slot #${this._dragSlot.hoverTargetIdx + 1}: ${dragInp?.label || dragInp?.name || ""}`;
                    const textW = ctx.measureText(labelText).width;
                    ctx.fillRect(12, this._dragSlot.currentY - 11, textW + 14, 20);
                    ctx.fillStyle = "#000";
                    ctx.fillText(labelText, 18, this._dragSlot.currentY + 3);
                }
            }

            // 3. Highlight and glow currently executing slot on this node
            const isThisDetailerActive = currentDetailerProgress && (
                String(currentDetailerProgress.allinone_node_id) === String(this.id) ||
                !currentDetailerProgress.allinone_node_id
            );

            if (isThisDetailerActive) {
                const activeInp = slotInputs.find(inp => {
                    if (currentDetailerProgress.slot_name && inp.name === currentDetailerProgress.slot_name) {
                        return true;
                    }
                    if (currentDetailerProgress.slot_index != null) {
                        const slotNum = parseInt(inp.name.replace("slot_", ""), 10);
                        if (slotNum === currentDetailerProgress.slot_index) {
                            return true;
                        }
                    }
                    if (currentDetailerProgress.source_node_id && inp.link != null) {
                        const link = app.graph?.links?.[inp.link];
                        if (link && String(link.origin_id) === String(currentDetailerProgress.source_node_id)) {
                            return true;
                        }
                    }
                    return false;
                });

                if (activeInp) {
                    const actualIdx = this.inputs.indexOf(activeInp);
                    const y = getSlotLocalY(this, actualIdx);

                    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);

                    // Row background glow band
                    ctx.fillStyle = `rgba(34, 197, 94, ${0.14 + 0.14 * pulse})`;
                    drawRoundedRect(ctx, 4, y - 9, this.size[0] - 8, 18, 4);
                    ctx.fill();

                    ctx.strokeStyle = `rgba(34, 197, 94, ${0.5 + 0.5 * pulse})`;
                    ctx.lineWidth = 1;
                    drawRoundedRect(ctx, 4, y - 9, this.size[0] - 8, 18, 4);
                    ctx.stroke();

                    // Left vertical glowing accent marker
                    ctx.fillStyle = "#22c55e";
                    ctx.shadowColor = "#22c55e";
                    ctx.shadowBlur = 8 + 6 * pulse;
                    ctx.fillRect(4, y - 9, 3, 18);

                    // Glowing socket circle terminal
                    ctx.fillStyle = "#22c55e";
                    ctx.shadowBlur = 10 + 6 * pulse;
                    ctx.beginPath();
                    ctx.arc(0, y, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Continuous animation request while running
                    this.setDirtyCanvas(true, true);
                }
            }

            ctx.restore();
            return r;
        };
    },
});
