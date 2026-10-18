import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// --- Global Progress Tracking ---

let currentDetailerProgress = null;
let listenersRegistered = false;

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
        ctx.quadraticCurveTo(x, y, x + radius, y);
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

            slotInputs.forEach((inp, i) => {
                const slotNum = i + 1;
                const customName = node.properties.slot_custom_labels[inp.name];
                if (customName && customName.trim()) {
                    inp.label = `${slotNum}: ${customName.trim()}`;
                    return;
                }

                if (inp.link != null) {
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
                        return;
                    }
                }

                inp.label = `slot_${slotNum}`;
            });
        }

        /**
         * Ensure there is always exactly one unconnected slot at the end.
         * - If every slot is connected → append slot_(N+1)
         * - If 2+ trailing slots are unconnected → remove the last one (keep ≥ 1)
         */
        function syncSlots(node) {
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
                // Recurse in case there are more to trim
                syncSlots(node);
            } else {
                updateSlotLabels(node);
            }
        }

        /**
         * Insert an empty slot at targetInputIdx, shifting all subsequent
         * connections and custom labels down by one slot.
         */
        function insertEmptySlotAt(node, targetInputIdx) {
            const slotInputs = getSlotInputs(node);
            const targetInput = node.inputs[targetInputIdx];
            const fromIndex = slotInputs.indexOf(targetInput);
            if (fromIndex === -1) {
                return;
            }

            // Ensure we have a trailing empty slot
            const lastSlot = slotInputs[slotInputs.length - 1];
            if (lastSlot.link != null) {
                const nextNum = slotInputs.length + 1;
                node.addInput(`slot_${nextNum}`, "DETAILER_SLOT");
            }

            const updatedSlotInputs = getSlotInputs(node);
            node.properties = node.properties || {};
            node.properties.slot_custom_labels = node.properties.slot_custom_labels || {};

            const currentSlotItems = updatedSlotInputs.map(inp => ({
                link: inp.link,
                label: inp.label,
                custom: node.properties.slot_custom_labels[inp.name]
            }));

            // Insert empty slot at fromIndex
            currentSlotItems.splice(fromIndex, 0, { link: null, label: undefined, custom: undefined });

            // Assign connections and labels back to slot positions
            updatedSlotInputs.forEach((inp, i) => {
                const item = currentSlotItems[i] || { link: null, label: undefined, custom: undefined };
                const actualIdx = node.inputs.indexOf(inp);
                inp.link = item.link;
                inp.label = item.label;
                if (item.link != null && app.graph?.links?.[item.link]) {
                    app.graph.links[item.link].target_slot = actualIdx;
                }
                if (item.custom) {
                    node.properties.slot_custom_labels[inp.name] = item.custom;
                } else {
                    delete node.properties.slot_custom_labels[inp.name];
                }
            });

            syncSlots(node);
            updateSlotLabels(node);
            node.setDirtyCanvas(true, true);
            app.graph?.setDirtyCanvas?.(true, true);
        }

        /**
         * Remove slot at targetInputIdx, shifting all subsequent connections up by one.
         */
        function removeSlotAndShiftUp(node, targetInputIdx) {
            const slotInputs = getSlotInputs(node);
            const targetInput = node.inputs[targetInputIdx];
            const fromIndex = slotInputs.indexOf(targetInput);
            if (fromIndex === -1) {
                return;
            }

            if (targetInput.link != null) {
                node.disconnectInput(targetInputIdx);
            }

            node.properties = node.properties || {};
            node.properties.slot_custom_labels = node.properties.slot_custom_labels || {};

            const currentSlotItems = slotInputs.map(inp => ({
                link: inp.link,
                label: inp.label,
                custom: node.properties.slot_custom_labels[inp.name]
            }));

            currentSlotItems.splice(fromIndex, 1);
            currentSlotItems.push({ link: null, label: undefined, custom: undefined });

            slotInputs.forEach((inp, i) => {
                const item = currentSlotItems[i] || { link: null, label: undefined, custom: undefined };
                const actualIdx = node.inputs.indexOf(inp);
                inp.link = item.link;
                inp.label = item.label;
                if (item.link != null && app.graph?.links?.[item.link]) {
                    app.graph.links[item.link].target_slot = actualIdx;
                }
                if (item.custom) {
                    node.properties.slot_custom_labels[inp.name] = item.custom;
                } else {
                    delete node.properties.slot_custom_labels[inp.name];
                }
            });

            syncSlots(node);
            updateSlotLabels(node);
            node.setDirtyCanvas(true, true);
            app.graph?.setDirtyCanvas?.(true, true);
        }

        /**
         * Swap connections, labels, and settings between two slots.
         */
        function swapSlots(node, idxA, idxB) {
            const inputA = node.inputs[idxA];
            const inputB = node.inputs[idxB];
            if (!inputA || !inputB) {
                return;
            }

            const linkA = inputA.link;
            const linkB = inputB.link;

            inputA.link = linkB;
            inputB.link = linkA;

            if (linkA != null && app.graph?.links?.[linkA]) {
                app.graph.links[linkA].target_slot = idxB;
            }
            if (linkB != null && app.graph?.links?.[linkB]) {
                app.graph.links[linkB].target_slot = idxA;
            }

            node.properties = node.properties || {};
            node.properties.slot_custom_labels = node.properties.slot_custom_labels || {};
            const customA = node.properties.slot_custom_labels[inputA.name];
            const customB = node.properties.slot_custom_labels[inputB.name];

            if (customB) {
                node.properties.slot_custom_labels[inputA.name] = customB;
            } else {
                delete node.properties.slot_custom_labels[inputA.name];
            }

            if (customA) {
                node.properties.slot_custom_labels[inputB.name] = customA;
            } else {
                delete node.properties.slot_custom_labels[inputB.name];
            }

            syncSlots(node);
            updateSlotLabels(node);
            node.setDirtyCanvas(true, true);
            app.graph?.setDirtyCanvas?.(true, true);
        }

        /**
         * Reorder a slot by moving from fromSlotIdx to toSlotIdx in the sequence of slots.
         */
        function reorderSlotTo(node, fromActualIdx, toActualIdx) {
            const slotInputs = getSlotInputs(node);
            const fromInput = node.inputs[fromActualIdx];
            const toInput = node.inputs[toActualIdx];
            const fromIndex = slotInputs.indexOf(fromInput);
            const toIndex = slotInputs.indexOf(toInput);
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
                return;
            }

            node.properties = node.properties || {};
            node.properties.slot_custom_labels = node.properties.slot_custom_labels || {};

            const currentSlotItems = slotInputs.map(inp => ({
                link: inp.link,
                label: inp.label,
                custom: node.properties.slot_custom_labels[inp.name]
            }));

            const [moved] = currentSlotItems.splice(fromIndex, 1);
            currentSlotItems.splice(toIndex, 0, moved);

            slotInputs.forEach((inp, i) => {
                const item = currentSlotItems[i] || { link: null, label: undefined, custom: undefined };
                const actualIdx = node.inputs.indexOf(inp);
                inp.link = item.link;
                inp.label = item.label;
                if (item.link != null && app.graph?.links?.[item.link]) {
                    app.graph.links[item.link].target_slot = actualIdx;
                }
                if (item.custom) {
                    node.properties.slot_custom_labels[inp.name] = item.custom;
                } else {
                    delete node.properties.slot_custom_labels[inp.name];
                }
            });

            syncSlots(node);
            updateSlotLabels(node);
            node.setDirtyCanvas(true, true);
            app.graph?.setDirtyCanvas?.(true, true);
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
            // LiteGraph.INPUT === 1
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
            if (!slot || !/^slot_\d+$/.test(slot.name)) {
                return options;
            }

            const slotInputs = getSlotInputs(this);
            const slotIndex = slotInputs.indexOf(slot);
            const actualIndex = this.inputs.indexOf(slot);

            const customOptions = [
                {
                    content: `➕ Insert Empty Slot Here (Shift Down)`,
                    callback: () => insertEmptySlotAt(this, actualIndex)
                }
            ];

            if (slotIndex > 0) {
                customOptions.push({
                    content: `▲ Move Slot Up`,
                    callback: () => {
                        const prevIdx = this.inputs.indexOf(slotInputs[slotIndex - 1]);
                        swapSlots(this, prevIdx, actualIndex);
                    }
                });
            }

            if (slotIndex < slotInputs.length - 1) {
                customOptions.push({
                    content: `▼ Move Slot Down`,
                    callback: () => {
                        const nextIdx = this.inputs.indexOf(slotInputs[slotIndex + 1]);
                        swapSlots(this, actualIndex, nextIdx);
                    }
                });
            }

            customOptions.push({
                content: `✏️ Rename Display Label...`,
                callback: () => promptRenameSlot(this, slot)
            });

            if (this.properties?.slot_custom_labels?.[slot.name]) {
                customOptions.push({
                    content: `Reset to Auto-Detected Name`,
                    callback: () => {
                        delete this.properties.slot_custom_labels[slot.name];
                        updateSlotLabels(this);
                        this.setDirtyCanvas(true, true);
                    }
                });
            }

            if (slot.link != null) {
                customOptions.push({
                    content: `❌ Remove & Shift Up`,
                    callback: () => removeSlotAndShiftUp(this, actualIndex)
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
                    if (slotInputs.length > 0) {
                        const idx = this.inputs.indexOf(slotInputs[0]);
                        insertEmptySlotAt(this, idx);
                    }
                }
            });

            if (slotInputs.length > 1) {
                const shiftSub = [];
                slotInputs.forEach((inp, i) => {
                    const label = inp.label || inp.name;
                    shiftSub.push({
                        content: `Insert above #${i + 1} (${label})`,
                        callback: () => {
                            const idx = this.inputs.indexOf(inp);
                            insertEmptySlotAt(this, idx);
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
                    if (i > 0) {
                        moveUpSub.push({
                            content: `Move #${i + 1} (${inp.label || inp.name}) Up`,
                            callback: () => {
                                const idxA = this.inputs.indexOf(slotInputs[i - 1]);
                                const idxB = this.inputs.indexOf(inp);
                                swapSlots(this, idxA, idxB);
                            }
                        });
                    }
                    if (i < slotInputs.length - 1) {
                        moveDownSub.push({
                            content: `Move #${i + 1} (${inp.label || inp.name}) Down`,
                            callback: () => {
                                const idxA = this.inputs.indexOf(inp);
                                const idxB = this.inputs.indexOf(slotInputs[i + 1]);
                                swapSlots(this, idxA, idxB);
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

        // --- drag-and-drop slot reordering & visual indicators ---

        const origOnMouseDown = nodeType.prototype.onMouseDown;
        nodeType.prototype.onMouseDown = function (e, localPos, graphCanvas) {
            const slotInputs = getSlotInputs(this);
            if (slotInputs.length > 0 && localPos[0] >= 10 && localPos[0] <= 36) {
                for (let i = 0; i < slotInputs.length; i++) {
                    const inp = slotInputs[i];
                    const actualIdx = this.inputs.indexOf(inp);
                    const pos = this.getConnectionPos(true, actualIdx);
                    if (Math.abs(localPos[1] - pos[1]) <= 10) {
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
                    const pos = this.getConnectionPos(true, actualIdx);
                    const dist = Math.abs(localPos[1] - pos[1]);
                    if (dist < minDist) {
                        minDist = dist;
                        closestIdx = i;
                    }
                }
                this._dragSlot.hoverTargetIdx = closestIdx;
                this.setDirtyCanvas(true, true);
                return true;
            }

            const slotInputs = getSlotInputs(this);
            let isOverGrip = false;
            if (slotInputs.length > 0 && localPos[0] >= 10 && localPos[0] <= 36) {
                for (let i = 0; i < slotInputs.length; i++) {
                    const inp = slotInputs[i];
                    const actualIdx = this.inputs.indexOf(inp);
                    const pos = this.getConnectionPos(true, actualIdx);
                    if (Math.abs(localPos[1] - pos[1]) <= 10) {
                        isOverGrip = true;
                        this._hoveredSlotIdx = i;
                        break;
                    }
                }
            }
            if (!isOverGrip && this._hoveredSlotIdx != null) {
                this._hoveredSlotIdx = null;
                this.setDirtyCanvas(true, true);
            } else if (isOverGrip) {
                this.setDirtyCanvas(true, true);
            }

            return origOnMouseMove ? origOnMouseMove.apply(this, arguments) : false;
        };

        const origOnMouseUp = nodeType.prototype.onMouseUp;
        nodeType.prototype.onMouseUp = function (e, localPos, graphCanvas) {
            if (this._dragSlot) {
                const slotInputs = getSlotInputs(this);
                const fromActualIdx = this._dragSlot.fromActualIdx;
                const targetSlot = slotInputs[this._dragSlot.hoverTargetIdx];
                const targetActualIdx = targetSlot ? this.inputs.indexOf(targetSlot) : null;

                this._dragSlot = null;
                this.setDirtyCanvas(true, true);

                if (targetActualIdx != null && fromActualIdx !== targetActualIdx) {
                    reorderSlotTo(this, fromActualIdx, targetActualIdx);
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

            // 1. Draw grip handles for each slot
            for (let i = 0; i < slotInputs.length; i++) {
                const inp = slotInputs[i];
                const actualIdx = this.inputs.indexOf(inp);
                const pos = this.getConnectionPos(true, actualIdx);
                const y = pos[1];
                const isHovered = (this._hoveredSlotIdx === i) || (this._dragSlot && this._dragSlot.fromSlotIdx === i);

                ctx.fillStyle = isHovered ? "#22c55e" : "rgba(255, 255, 255, 0.3)";
                ctx.fillRect(16, y - 4, 8, 2);
                ctx.fillRect(16, y - 1, 8, 2);
                ctx.fillRect(16, y + 2, 8, 2);
            }

            // 2. Draw drag indicator line and floating pill when dragging
            if (this._dragSlot && this._dragSlot.hoverTargetIdx != null) {
                const targetSlot = slotInputs[this._dragSlot.hoverTargetIdx];
                if (targetSlot) {
                    const targetActualIdx = this.inputs.indexOf(targetSlot);
                    const targetPos = this.getConnectionPos(true, targetActualIdx);
                    const targetY = targetPos[1];

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

            // 3. Highlight currently executing slot row if this node is running
            if (currentDetailerProgress && String(currentDetailerProgress.allinone_node_id) === String(this.id)) {
                const activeInp = slotInputs.find(inp => inp.name === currentDetailerProgress.slot_name);
                if (activeInp) {
                    const actualIdx = this.inputs.indexOf(activeInp);
                    const pos = this.getConnectionPos(true, actualIdx);
                    const y = pos[1];

                    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);

                    // Row background glow
                    ctx.fillStyle = `rgba(34, 197, 94, ${0.12 + 0.14 * pulse})`;
                    drawRoundedRect(ctx, 8, y - 9, this.size[0] - 16, 18, 4);
                    ctx.fill();

                    // Left vertical glowing accent marker
                    ctx.fillStyle = "#22c55e";
                    ctx.shadowColor = "#22c55e";
                    ctx.shadowBlur = 8 + 6 * pulse;
                    ctx.fillRect(8, y - 9, 3, 18);
                    ctx.shadowBlur = 0;

                    // Status badge text on the right
                    let statusText = "▶ RUNNING";
                    if (currentDetailerProgress.status === "detecting") {
                        statusText = "🔍 DETECTING";
                    } else if (currentDetailerProgress.status === "inpainting") {
                        const mCur = currentDetailerProgress.current_mask || 1;
                        const mTot = currentDetailerProgress.total_masks || 1;
                        statusText = mTot > 1 ? `⚡ INPAINT ${mCur}/${mTot}` : "⚡ INPAINTING";
                    } else if (currentDetailerProgress.status === "no_detections") {
                        statusText = "⚠️ 0 DETECTS";
                    } else if (currentDetailerProgress.status === "slot_done") {
                        statusText = "✓ DONE";
                    }

                    const bTot = currentDetailerProgress.total_batches || 1;
                    if (bTot > 1) {
                        const bCur = (currentDetailerProgress.batch_idx || 0) + 1;
                        statusText = `[${bCur}/${bTot}] ${statusText}`;
                    }

                    ctx.font = "bold 9px sans-serif";
                    const badgeW = ctx.measureText(statusText).width + 10;
                    const badgeX = this.size[0] - badgeW - 12;

                    ctx.fillStyle = "rgba(10, 16, 12, 0.92)";
                    drawRoundedRect(ctx, badgeX, y - 8, badgeW, 16, 3);
                    ctx.fill();

                    ctx.strokeStyle = `rgba(34, 197, 94, ${0.6 + 0.4 * pulse})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.fillStyle = "#22c55e";
                    ctx.fillText(statusText, badgeX + 5, y + 4);

                    // Continuous animation request while running
                    this.setDirtyCanvas(true, true);
                }
            }

            ctx.restore();
            return r;
        };
    },
});
