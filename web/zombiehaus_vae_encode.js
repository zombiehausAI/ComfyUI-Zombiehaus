import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

/**
 * Zombiehaus VAE Encode & Fidelity Controller Web Extension
 * - Real-time live feedback of calculated Denoise and Effective Steps as the slider moves
 * - Preset auto-sync (selecting a preset updates the slider; dragging slider sets 'Custom')
 * - Bulletproof onConfigure restoring by widget name (avoids LiteGraph index shift)
 * - Native image upload button and file handling
 */

function calculateFidelity(fidelityPct, curve, minDenoise, maxDenoise, baseSteps, stepCompensation, targetModel) {
    const f = Math.max(0, Math.min(100, Number(fidelityPct) || 75)) / 100.0;
    const t = 1.0 - f;

    let factor = t;
    if (curve === "Smooth S-Curve") {
        factor = t * t * (3.0 - 2.0 * t);
    } else if (curve === "Preserve Structure (Exponential)") {
        factor = Math.pow(t, 1.45);
    } else if (curve === "Creative Bias") {
        factor = Math.pow(t, 0.72);
    }

    const minD = Number(minDenoise) || 0.20;
    const maxD = Number(maxDenoise) || 0.95;
    const denoise = Math.round((minD + factor * (maxD - minD)) * 1000) / 1000;

    let steps = Number(baseSteps) || 25;
    if (stepCompensation && denoise > 0.01) {
        const isChromaOrFlux = targetModel && (targetModel.includes("Chroma") || targetModel.includes("Flux"));
        const targetEffective = isChromaOrFlux ? 12 : 15;
        const compensated = Math.max(steps, Math.round(targetEffective / denoise));
        steps = Math.min(60, compensated);
    }

    const effectiveSteps = Math.max(1, Math.round(steps * denoise));
    return { denoise, steps, effectiveSteps, fidelityPct: Math.round(f * 100) };
}

app.registerExtension({
    name: "zombiehaus.VAEEncode.Widgets",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "ZombiehausImg2ImgVAEEncode" ||
            nodeData.name === "ZombiehausFidelityController") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                const node = this;

                // Safe find helper
                const findWidget = (name) => node.widgets?.find((w) => w.name === name);

                const fidelityWidget = findWidget("fidelity");
                const presetWidget = findWidget("preset");
                const targetModelWidget = findWidget("target_model");
                const curveWidget = findWidget("curve");
                const baseStepsWidget = findWidget("base_steps");
                const stepCompWidget = findWidget("step_compensation");
                const minDenoiseWidget = findWidget("min_denoise");
                const maxDenoiseWidget = findWidget("max_denoise");
                const imageWidget = findWidget("image_upload") || findWidget("image");

                // ── Live Info Widget ──────────────────────────────────────────
                // Add a read-only live preview widget displaying real-time calculation
                let liveInfoWidget = node.widgets?.find((w) => w.name === "fidelity_live_info");
                if (!liveInfoWidget) {
                    liveInfoWidget = node.addWidget("text", "fidelity_live_info", "", () => {});
                    liveInfoWidget.name = "fidelity_live_info";
                    liveInfoWidget.disabled = true;
                    liveInfoWidget.options = { serialize: false };
                }

                const updateLiveDisplay = () => {
                    if (!fidelityWidget) return;
                    const res = calculateFidelity(
                        fidelityWidget.value,
                        curveWidget?.value || "Smooth S-Curve",
                        minDenoiseWidget?.value ?? 0.20,
                        maxDenoiseWidget?.value ?? 0.95,
                        baseStepsWidget?.value ?? 25,
                        stepCompWidget?.value ?? true,
                        targetModelWidget?.value || "Chroma 1-HD"
                    );

                    const infoText = `📊 Denoise: ${res.denoise.toFixed(3)} | Steps: ${res.steps} (Eff: ~${res.effectiveSteps})`;
                    if (liveInfoWidget) {
                        liveInfoWidget.value = infoText;
                    }
                    node.setDirtyCanvas(true, false);
                };

                // ── Preset to Slider Sync ─────────────────────────────────────
                if (presetWidget && fidelityWidget) {
                    const originalPresetCallback = presetWidget.callback;
                    presetWidget.callback = function (val) {
                        originalPresetCallback?.apply(this, arguments);
                        if (val.includes("90%")) fidelityWidget.value = 90.0;
                        else if (val.includes("75%")) fidelityWidget.value = 75.0;
                        else if (val.includes("50%")) fidelityWidget.value = 50.0;
                        else if (val.includes("25%")) fidelityWidget.value = 25.0;
                        else if (val.includes("10%")) fidelityWidget.value = 10.0;
                        updateLiveDisplay();
                    };

                    const originalFidelityCallback = fidelityWidget.callback;
                    fidelityWidget.callback = function (val) {
                        originalFidelityCallback?.apply(this, arguments);
                        // If user moved slider away from preset standard values, set to Custom
                        const v = Math.round(Number(val));
                        const isPresetVal = v === 90 || v === 75 || v === 50 || v === 25 || v === 10;
                        if (!isPresetVal && presetWidget.value !== "Custom (Use Slider)") {
                            presetWidget.value = "Custom (Use Slider)";
                        }
                        updateLiveDisplay();
                    };
                }

                // Attach live updates to other calculation-affecting widgets
                [curveWidget, baseStepsWidget, stepCompWidget, minDenoiseWidget, maxDenoiseWidget, targetModelWidget].forEach((w) => {
                    if (w) {
                        const orig = w.callback;
                        w.callback = function () {
                            orig?.apply(this, arguments);
                            updateLiveDisplay();
                        };
                    }
                });

                // ── Clear Photo Button ────────────────────────────────────────
                if (imageWidget && (nodeData.name === "ZombiehausImg2ImgVAEEncode")) {
                    const hasClearBtn = node.widgets?.some((w) => w.name && w.name.includes("Clear"));
                    if (!hasClearBtn) {
                        const clearBtn = node.addWidget("button", "🗑️ Clear Photo (Text-to-Image)", "clear", () => {
                            imageWidget.value = "none";
                            if (imageWidget.callback) {
                                imageWidget.callback("none");
                            }
                            if (node.imgs) {
                                node.imgs = null;
                            }
                            if (node.imageIndex != null) {
                                node.imageIndex = null;
                            }
                            node.setDirtyCanvas(true, true);
                            updateLiveDisplay();
                        });
                        clearBtn.options = { serialize: false };
                    }
                }

                // Initial calculation
                setTimeout(updateLiveDisplay, 50);

                // ── Bulletproof onConfigure Handler ───────────────────────────
                // Prevents LiteGraph index-shift bugs by restoring strictly by widget NAME
                const origOnConfigure = node.onConfigure;
                node.onConfigure = function (info) {
                    origOnConfigure?.apply(this, arguments);

                    if (info.widgets_values_named) {
                        for (const [name, val] of Object.entries(info.widgets_values_named)) {
                            const target = this.widgets?.find((w) => w.name === name);
                            if (target && target.type !== "button") {
                                target.value = val;
                            }
                        }
                    }
                    setTimeout(updateLiveDisplay, 50);
                };
            };
        }
    }
});
