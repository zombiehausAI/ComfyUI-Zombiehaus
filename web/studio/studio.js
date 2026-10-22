/**
 * Zombiehaus Studio — Unified Creative Workstation Frontend
 */

const clientId = "zh_studio_" + Math.random().toString(36).substring(2, 10);
let currentMode = "screenplay"; // 'screenplay' | 'prompt'
let socket = null;
let currentPromptId = null;

// DOM Elements
const el = {
    // Mode buttons
    btnScreenplay: document.getElementById("mode-btn-screenplay"),
    btnPrompt: document.getElementById("mode-btn-prompt"),
    viewScreenplay: document.getElementById("view-screenplay"),
    viewPrompt: document.getElementById("view-prompt"),

    // Profile controls
    profileSelect: document.getElementById("profile-select"),
    btnSaveProfile: document.getElementById("btn-save-profile"),
    btnDeleteProfile: document.getElementById("btn-delete-profile"),

    // Action controls
    connectionPill: document.getElementById("connection-pill"),
    connectionText: document.getElementById("connection-text"),
    btnGenerate: document.getElementById("btn-generate"),
    btnInterrupt: document.getElementById("btn-interrupt"),

    // Engine fields
    architecture: document.getElementById("engine-architecture"),
    checkpoint: document.getElementById("engine-checkpoint"),
    unet: document.getElementById("engine-unet"),
    dtype: document.getElementById("engine-dtype"),
    clipType: document.getElementById("engine-clip-type"),
    clipName: document.getElementById("engine-clip-name"),
    vae: document.getElementById("engine-vae"),
    lora1Name: document.getElementById("engine-lora1-name"),
    lora1Strength: document.getElementById("engine-lora1-strength"),
    valLora1: document.getElementById("val-lora1-strength"),
    lora2Name: document.getElementById("engine-lora2-name"),
    lora2Strength: document.getElementById("engine-lora2-strength"),
    valLora2: document.getElementById("val-lora2-strength"),
    chromaShift: document.getElementById("engine-chroma-shift"),
    valChromaShift: document.getElementById("val-chroma-shift"),
    guidance: document.getElementById("engine-guidance"),
    valGuidance: document.getElementById("val-guidance"),
    badgeArch: document.getElementById("badge-arch"),

    // Creative editors
    scriptEditor: document.getElementById("script-editor"),
    positiveEditor: document.getElementById("positive-editor"),
    negativeEditor: document.getElementById("negative-editor"),
    promptStyle: document.getElementById("prompt-style-select"),
    btnOllama: document.getElementById("btn-ollama-enhance"),

    // Render & stages
    badgeRes: document.getElementById("badge-res"),
    width: document.getElementById("render-width"),
    height: document.getElementById("render-height"),
    batch: document.getElementById("render-batch"),
    seed: document.getElementById("render-seed"),
    btnRandomSeed: document.getElementById("btn-seed-random"),
    steps: document.getElementById("render-steps"),
    valSteps: document.getElementById("val-steps"),
    cfg: document.getElementById("render-cfg"),
    valCfg: document.getElementById("val-cfg"),
    sampler: document.getElementById("render-sampler"),
    scheduler: document.getElementById("render-scheduler"),

    // Stage toggles
    enableHires: document.getElementById("stage-enable-hires"),
    hiresScale: document.getElementById("stage-hires-scale"),
    hiresDenoise: document.getElementById("stage-hires-denoise"),
    enableDetailer: document.getElementById("stage-enable-detailer"),
    detailFace: document.getElementById("detail-face"),
    detailEyes: document.getElementById("detail-eyes"),
    detailHands: document.getElementById("detail-hands"),
    enableDewax: document.getElementById("stage-enable-dewax"),
    dewaxGrain: document.getElementById("stage-dewax-grain"),
    valDewaxGrain: document.getElementById("val-dewax-grain"),
    enableRestormer: document.getElementById("stage-enable-restormer"),
    restormerTask: document.getElementById("stage-restormer-task"),
    enableUpscale: document.getElementById("stage-enable-upscale"),
    upscaleModel: document.getElementById("stage-upscale-model"),

    // Preview & progress
    progressWrap: document.getElementById("progress-container"),
    progressFill: document.getElementById("progress-fill"),
    progressStep: document.getElementById("progress-step"),
    progressPercent: document.getElementById("progress-percent"),
    previewViewport: document.getElementById("preview-viewport"),
    previewEmpty: document.getElementById("preview-empty"),
    previewImg: document.getElementById("preview-img"),
    historyContainer: document.getElementById("history-container")
};

// ── 1. Initialization & API Loading ──────────────────────────────────────────

async function initStudio() {
    setupSliders();
    setupModeSwitcher();
    setupAspectRatios();
    setupEditorHelpers();
    setupHotkeys();

    await loadModelAssets();
    await loadProfiles();
    connectWebSocket();
}

function setupSliders() {
    const bindSlider = (slider, display, decimals = 2) => {
        if (!slider || !display) return;
        slider.addEventListener("input", () => {
            display.textContent = Number(slider.value).toFixed(decimals);
        });
    };
    bindSlider(el.lora1Strength, el.valLora1, 2);
    bindSlider(el.lora2Strength, el.valLora2, 2);
    bindSlider(el.chromaShift, el.valChromaShift, 1);
    bindSlider(el.guidance, el.valGuidance, 1);
    bindSlider(el.steps, el.valSteps, 0);
    bindSlider(el.cfg, el.valCfg, 1);
    bindSlider(el.dewaxGrain, el.valDewaxGrain, 2);

    el.architecture?.addEventListener("change", () => {
        if (el.badgeArch) {
            el.badgeArch.textContent = el.architecture.value.toUpperCase();
        }
    });

    const updateResBadge = () => {
        if (el.badgeRes && el.width && el.height) {
            el.badgeRes.textContent = `${el.width.value} × ${el.height.value}`;
        }
    };
    el.width?.addEventListener("change", updateResBadge);
    el.height?.addEventListener("change", updateResBadge);

    el.btnRandomSeed?.addEventListener("click", () => {
        if (el.seed) {
            el.seed.value = Math.floor(Math.random() * 1000000000);
        }
    });
}

function setupModeSwitcher() {
    const setMode = (mode) => {
        currentMode = mode;
        if (mode === "screenplay") {
            el.btnScreenplay?.classList.add("active");
            el.btnPrompt?.classList.remove("active");
            el.viewScreenplay?.classList.add("active");
            el.viewPrompt?.classList.remove("active");
        } else {
            el.btnPrompt?.classList.add("active");
            el.btnScreenplay?.classList.remove("active");
            el.viewPrompt?.classList.add("active");
            el.viewScreenplay?.classList.remove("active");
        }
    };

    el.btnScreenplay?.addEventListener("click", () => setMode("screenplay"));
    el.btnPrompt?.addEventListener("click", () => setMode("prompt"));
}

function setupAspectRatios() {
    const ratioBtns = document.querySelectorAll(".zh-ratio-btn");
    ratioBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            ratioBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const w = btn.getAttribute("data-w");
            const h = btn.getAttribute("data-h");
            if (el.width && el.height && w && h) {
                el.width.value = w;
                el.height.value = h;
                if (el.badgeRes) el.badgeRes.textContent = `${w} × ${h}`;
            }
        });
    });
}

function setupEditorHelpers() {
    // Quick script tag insertion chips
    document.querySelectorAll(".zh-tag-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const textToInsert = chip.getAttribute("data-insert")?.replace(/\\n/g, "\n");
            if (textToInsert && el.scriptEditor) {
                const start = el.scriptEditor.selectionStart || el.scriptEditor.value.length;
                const end = el.scriptEditor.selectionEnd || el.scriptEditor.value.length;
                const cur = el.scriptEditor.value;
                el.scriptEditor.value = cur.substring(0, start) + textToInsert + cur.substring(end);
                el.scriptEditor.focus();
                el.scriptEditor.selectionStart = el.scriptEditor.selectionEnd = start + textToInsert.length;
            }
        });
    });

    // Prompt guards
    const guardSnippets = {
        quality: "masterpiece, highly detailed, 8k uhd, photorealistic, professional photography, natural lighting",
        anatomy: "anatomically correct, flawless proportions, perfect hands, detailed fingers",
        "3d": "authentic realistic photo, film grain, unrendered, not 3d cgi render, octane render bypass",
        watermark: "clean image, no watermark, no text, no logo, pristine frame"
    };

    document.querySelectorAll(".zh-guard-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const gType = btn.getAttribute("data-guard");
            const snippet = guardSnippets[gType];
            if (snippet && el.positiveEditor) {
                const cur = el.positiveEditor.value.trim();
                el.positiveEditor.value = cur ? `${cur}, ${snippet}` : snippet;
                el.positiveEditor.focus();
            }
        });
    });

    // Ollama AI enhance
    el.btnOllama?.addEventListener("click", async () => {
        const prompt = el.positiveEditor?.value.trim();
        if (!prompt) return;

        const origText = el.btnOllama.textContent;
        el.btnOllama.textContent = "✨ Thinking...";
        el.btnOllama.disabled = true;

        try {
            const resp = await fetch("/zombiehaus/enhance_prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt,
                    style: el.promptStyle?.value || "prose"
                })
            });
            const data = await resp.json();
            if (data.success && data.enhanced && el.positiveEditor) {
                el.positiveEditor.value = data.enhanced;
            }
        } catch (err) {
            console.error("Enhance prompt error:", err);
        } finally {
            el.btnOllama.textContent = origText;
            el.btnOllama.disabled = false;
        }
    });
}

function setupHotkeys() {
    window.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            triggerGenerate();
        }
    });

    el.btnGenerate?.addEventListener("click", triggerGenerate);
    el.btnInterrupt?.addEventListener("click", triggerInterrupt);
}

// ── 2. Models & Profiles API ─────────────────────────────────────────────────

function populateSelect(selectEl, items, selectedVal) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    for (const item of items) {
        const opt = document.createElement("option");
        opt.value = item;
        opt.textContent = item;
        if (item === selectedVal) opt.selected = true;
        selectEl.appendChild(opt);
    }
}

async function loadModelAssets() {
    try {
        const resp = await fetch("/zombiehaus/studio/models");
        const data = await resp.json();
        if (!data.success) return;

        populateSelect(el.checkpoint, data.checkpoints, "None");
        populateSelect(el.unet, data.unets, "None");
        populateSelect(el.vae, data.vaes, "None");
        populateSelect(el.clipName, data.clips, "disabled");
        populateSelect(el.lora1Name, data.loras, "None");
        populateSelect(el.lora2Name, data.loras, "None");
        populateSelect(el.upscaleModel, data.upscalers, "None");
        populateSelect(el.sampler, data.samplers, "euler_ancestral");
        populateSelect(el.scheduler, data.schedulers, "simple");
    } catch (err) {
        console.error("Error loading model assets:", err);
    }
}

async function loadProfiles() {
    try {
        const resp = await fetch("/zombiehaus/studio/profiles");
        const data = await resp.json();
        if (data.success && data.profiles && el.profileSelect) {
            el.profileSelect.innerHTML = "";
            for (const p of data.profiles) {
                const opt = document.createElement("option");
                opt.value = p.name;
                opt.textContent = p.name;
                el.profileSelect.appendChild(opt);
            }
            if (data.profiles.length > 0) {
                applyProfileData(data.profiles[0].data);
            }
        }
    } catch (err) {
        console.error("Error loading profiles:", err);
    }

    el.profileSelect?.addEventListener("change", async (e) => {
        const name = e.target.value;
        const resp = await fetch("/zombiehaus/studio/profiles");
        const data = await resp.json();
        const found = data.profiles?.find(p => p.name === name);
        if (found && found.data) {
            applyProfileData(found.data);
        }
    });

    el.btnSaveProfile?.addEventListener("click", async () => {
        const name = prompt("Enter profile name to save:", el.profileSelect?.value || "My Setup");
        if (!name || !name.trim()) return;

        const pData = gatherCurrentProfileData();
        const resp = await fetch("/zombiehaus/studio/profiles/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim(), data: pData })
        });
        const res = await resp.json();
        if (res.success) {
            await loadProfiles();
            if (el.profileSelect) el.profileSelect.value = name.trim();
        }
    });

    el.btnDeleteProfile?.addEventListener("click", async () => {
        const name = el.profileSelect?.value;
        if (!name) return;
        if (!confirm(`Delete profile "${name}"?`)) return;

        const resp = await fetch("/zombiehaus/studio/profiles/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name })
        });
        const res = await resp.json();
        if (res.success) {
            await loadProfiles();
        } else {
            alert(res.message || "Failed to delete profile (built-in profiles cannot be deleted)");
        }
    });
}

function applyProfileData(data) {
    if (!data) return;
    const setVal = (elInput, val) => {
        if (elInput && val !== undefined) {
            elInput.value = val;
            elInput.dispatchEvent(new Event("input"));
            elInput.dispatchEvent(new Event("change"));
        }
    };
    setVal(el.architecture, data.architecture);
    setVal(el.checkpoint, data.checkpoint_name);
    setVal(el.unet, data.unet_name);
    setVal(el.dtype, data.weight_dtype);
    setVal(el.clipName, data.clip_name);
    setVal(el.clipType, data.clip_type);
    setVal(el.vae, data.vae_name);
    setVal(el.chromaShift, data.chroma_shift);
    setVal(el.steps, data.steps);
    setVal(el.cfg, data.cfg);
    setVal(el.sampler, data.sampler_name);
    setVal(el.scheduler, data.scheduler);
    if (el.badgeArch && data.architecture) {
        el.badgeArch.textContent = data.architecture.toUpperCase();
    }
}

function gatherCurrentProfileData() {
    return {
        architecture: el.architecture?.value || "chroma",
        checkpoint_name: el.checkpoint?.value || "None",
        unet_name: el.unet?.value || "None",
        weight_dtype: el.dtype?.value || "default",
        clip_name: el.clipName?.value || "disabled",
        clip_type: el.clipType?.value || "flux2",
        vae_name: el.vae?.value || "None",
        chroma_shift: parseFloat(el.chromaShift?.value || "3.0"),
        steps: parseInt(el.steps?.value || "30", 10),
        cfg: parseFloat(el.cfg?.value || "3.5"),
        sampler_name: el.sampler?.value || "euler_ancestral",
        scheduler: el.scheduler?.value || "simple"
    };
}

// ── 3. WebSocket & Realtime Events ───────────────────────────────────────────

function connectWebSocket() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${location.host}/ws?clientId=${clientId}`;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        if (el.connectionPill) {
            el.connectionPill.className = "zh-status-pill connected";
            el.connectionText.textContent = "Connected";
        }
    };

    socket.onclose = () => {
        if (el.connectionPill) {
            el.connectionPill.className = "zh-status-pill disconnected";
            el.connectionText.textContent = "Disconnected";
        }
        setTimeout(connectWebSocket, 3000);
    };

    socket.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            handleWsMessage(msg);
        } catch (_) {}
    };
}

function handleWsMessage(msg) {
    if (msg.type === "progress") {
        const val = msg.data.value;
        const max = msg.data.max;
        const pct = Math.round((val / max) * 100);
        if (el.progressWrap) el.progressWrap.style.display = "block";
        if (el.progressFill) el.progressFill.style.width = `${pct}%`;
        if (el.progressStep) el.progressStep.textContent = `Step ${val} / ${max}`;
        if (el.progressPercent) el.progressPercent.textContent = `${pct}%`;
    } else if (msg.type === "executing") {
        if (msg.data.node === null) {
            // Execution complete
            setGeneratingState(false);
            if (el.progressWrap) el.progressWrap.style.display = "none";
        } else {
            setGeneratingState(true);
        }
    } else if (msg.type === "executed") {
        if (msg.data.output && msg.data.output.images && msg.data.output.images.length > 0) {
            for (const img of msg.data.output.images) {
                const imgUrl = `/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${encodeURIComponent(img.type || "output")}`;
                displayGeneratedImage(imgUrl);
            }
        }
    } else if (msg.type === "execution_error") {
        setGeneratingState(false);
        if (el.progressWrap) el.progressWrap.style.display = "none";
        alert("Generation Error: " + (msg.data.exception_message || "Unknown error"));
    }
}

function displayGeneratedImage(url) {
    if (el.previewEmpty) el.previewEmpty.style.display = "none";
    if (el.previewImg) {
        el.previewImg.src = url;
        el.previewImg.style.display = "block";
    }

    // Add to history strip
    if (el.historyContainer) {
        const thumb = document.createElement("img");
        thumb.className = "zh-history-thumb";
        thumb.src = url;
        thumb.title = "Click to inspect";
        thumb.addEventListener("click", () => {
            if (el.previewImg) el.previewImg.src = url;
        });
        el.historyContainer.prepend(thumb);
    }
}

function setGeneratingState(isGenerating) {
    if (isGenerating) {
        if (el.btnGenerate) {
            el.btnGenerate.disabled = true;
            el.btnGenerate.style.opacity = "0.6";
        }
        if (el.btnInterrupt) el.btnInterrupt.style.display = "inline-flex";
    } else {
        if (el.btnGenerate) {
            el.btnGenerate.disabled = false;
            el.btnGenerate.style.opacity = "1";
        }
        if (el.btnInterrupt) el.btnInterrupt.style.display = "none";
    }
}

// ── 4. Prompt Construction & Execution ───────────────────────────────────────

async function triggerGenerate() {
    setGeneratingState(true);
    if (el.progressWrap) {
        el.progressWrap.style.display = "block";
        el.progressFill.style.width = "0%";
        el.progressStep.textContent = "Initializing pipeline...";
        el.progressPercent.textContent = "0%";
    }

    const seedVal = parseInt(el.seed?.value || "0", 10);
    const actualSeed = seedVal === 0 ? Math.floor(Math.random() * 1000000000) : seedVal;
    if (el.seed && seedVal === 0) {
        el.seed.value = actualSeed;
    }

    let promptGraph = {};

    if (currentMode === "screenplay") {
        // Screenplay Director Studio Node
        promptGraph = {
            "1": {
                "class_type": "ZombiehausScriptStudio",
                "inputs": {
                    "profile": el.profileSelect?.value || "Chroma 1-HD Photoreal",
                    "checkpoint_name": el.checkpoint?.value || "None",
                    "unet_name": el.unet?.value || "None",
                    "weight_dtype": el.dtype?.value || "default",
                    "clip_name": el.clipName?.value || "disabled",
                    "clip_type": el.clipType?.value || "flux2",
                    "vae_name": el.vae?.value || "None",
                    "architecture": el.architecture?.value || "chroma",
                    "script_text": el.scriptEditor?.value || "",
                    "chroma_shift": parseFloat(el.chromaShift?.value || "3.0"),
                    "guidance": parseFloat(el.guidance?.value || "3.5"),
                    "width": parseInt(el.width?.value || "1024", 10),
                    "height": parseInt(el.height?.value || "1024", 10),
                    "batch_size": parseInt(el.batch?.value || "1", 10),
                    "seed": actualSeed,
                    "steps": parseInt(el.steps?.value || "30", 10),
                    "cfg": parseFloat(el.cfg?.value || "3.5"),
                    "sampler_name": el.sampler?.value || "euler_ancestral",
                    "scheduler": el.scheduler?.value || "simple",
                    "denoise": 1.0,
                    "enable_hires_fix": Boolean(el.enableHires?.checked),
                    "hires_scale_factor": parseFloat(el.hiresScale?.value || "1.5"),
                    "hires_denoise": parseFloat(el.hiresDenoise?.value || "0.45"),
                    "enable_detailer": Boolean(el.enableDetailer?.checked),
                    "detail_face": Boolean(el.detailFace?.checked),
                    "detail_eyes": Boolean(el.detailEyes?.checked),
                    "detail_hands": Boolean(el.detailHands?.checked),
                    "enable_dewax": Boolean(el.enableDewax?.checked),
                    "dewax_grain": parseFloat(el.dewaxGrain?.value || "0.05"),
                    "dewax_micro_texture": 0.35,
                    "enable_restormer": Boolean(el.enableRestormer?.checked),
                    "restormer_task": el.restormerTask?.value || "Real-World Image Restoration (Denoising)",
                    "enable_upscale": Boolean(el.enableUpscale?.checked),
                    "upscale_model": el.upscaleModel?.value || "None",
                    "upscale_factor": 2.0
                }
            },
            "2": {
                "class_type": "SaveImage",
                "inputs": {
                    "filename_prefix": "Zombiehaus_Director",
                    "images": ["1", 0]
                }
            }
        };
    } else {
        // Standard Prompt Studio Node
        promptGraph = {
            "1": {
                "class_type": "ZombiehausStudio",
                "inputs": {
                    "profile": el.profileSelect?.value || "Chroma 1-HD Photoreal",
                    "checkpoint_name": el.checkpoint?.value || "None",
                    "unet_name": el.unet?.value || "None",
                    "weight_dtype": el.dtype?.value || "default",
                    "clip_name": el.clipName?.value || "disabled",
                    "clip_type": el.clipType?.value || "flux2",
                    "vae_name": el.vae?.value || "None",
                    "architecture": el.architecture?.value || "chroma",
                    "positive": el.positiveEditor?.value || "",
                    "negative": el.negativeEditor?.value || "",
                    "prompt_style": el.promptStyle?.value || "Natural Prose (FLUX / SD3)",
                    "chroma_shift": parseFloat(el.chromaShift?.value || "3.0"),
                    "guidance": parseFloat(el.guidance?.value || "3.5"),
                    "width": parseInt(el.width?.value || "1024", 10),
                    "height": parseInt(el.height?.value || "1024", 10),
                    "batch_size": parseInt(el.batch?.value || "1", 10),
                    "seed": actualSeed,
                    "steps": parseInt(el.steps?.value || "30", 10),
                    "cfg": parseFloat(el.cfg?.value || "3.5"),
                    "sampler_name": el.sampler?.value || "euler_ancestral",
                    "scheduler": el.scheduler?.value || "simple",
                    "denoise": 1.0,
                    "enable_hires_fix": Boolean(el.enableHires?.checked),
                    "hires_scale_factor": parseFloat(el.hiresScale?.value || "1.5"),
                    "hires_denoise": parseFloat(el.hiresDenoise?.value || "0.45"),
                    "enable_detailer": Boolean(el.enableDetailer?.checked),
                    "detail_face": Boolean(el.detailFace?.checked),
                    "detail_eyes": Boolean(el.detailEyes?.checked),
                    "detail_hands": Boolean(el.detailHands?.checked),
                    "enable_dewax": Boolean(el.enableDewax?.checked),
                    "dewax_grain": parseFloat(el.dewaxGrain?.value || "0.05"),
                    "dewax_micro_texture": 0.35,
                    "enable_restormer": Boolean(el.enableRestormer?.checked),
                    "restormer_task": el.restormerTask?.value || "Real-World Image Restoration (Denoising)",
                    "enable_upscale": Boolean(el.enableUpscale?.checked),
                    "upscale_model": el.upscaleModel?.value || "None",
                    "upscale_factor": 2.0
                }
            },
            "2": {
                "class_type": "SaveImage",
                "inputs": {
                    "filename_prefix": "Zombiehaus_Studio",
                    "images": ["1", 0]
                }
            }
        };
    }

    try {
        const resp = await fetch("/prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: clientId,
                prompt: promptGraph
            })
        });
        const data = await resp.json();
        if (data.prompt_id) {
            currentPromptId = data.prompt_id;
        } else if (data.error) {
            setGeneratingState(false);
            alert("Prompt Error: " + JSON.stringify(data.error));
        }
    } catch (err) {
        setGeneratingState(false);
        console.error("Queue prompt failed:", err);
    }
}

async function triggerInterrupt() {
    try {
        await fetch("/interrupt", { method: "POST" });
        setGeneratingState(false);
    } catch (err) {
        console.error("Interrupt failed:", err);
    }
}

// Start application
window.addEventListener("DOMContentLoaded", initStudio);
