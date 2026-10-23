/**
 * Zombiehaus Studio — Unified Creative Workstation Frontend
 * Supports Screenplay Director, Image Prompting, Video DiT, and Suno-grade Hit Songwriting & Music.
 */

const clientId = "zh_studio_" + Math.random().toString(36).substring(2, 10);
let currentMode = "screenplay"; // 'screenplay' | 'prompt' | 'video' | 'music'
let socket = null;
let currentPromptId = null;

// Audio visualizer state
let audioCtx = null;
let animFrameId = null;

// DOM Elements
const el = {
    // Mode buttons
    btnScreenplay: document.getElementById("mode-btn-screenplay"),
    btnPrompt: document.getElementById("mode-btn-prompt"),
    btnI2i: document.getElementById("mode-btn-i2i"),
    btnVideo: document.getElementById("mode-btn-video"),
    btnMusic: document.getElementById("mode-btn-music"),
    btnLists: document.getElementById("mode-btn-lists"),

    // Views
    viewScreenplay: document.getElementById("view-screenplay"),
    viewPrompt: document.getElementById("view-prompt"),
    viewI2i: document.getElementById("view-i2i"),
    viewVideo: document.getElementById("view-video"),
    viewMusic: document.getElementById("view-music"),
    viewLists: document.getElementById("view-lists"),

    // Image Edit (i2i / Wardrobe) controls
    i2iDropzone: document.getElementById("i2i-dropzone"),
    i2iFileInput: document.getElementById("i2i-file-input"),
    i2iDropPlaceholder: document.getElementById("i2i-drop-placeholder"),
    i2iPreviewContainer: document.getElementById("i2i-preview-container"),
    i2iPreviewImg: document.getElementById("i2i-preview-img"),
    i2iInfoBadge: document.getElementById("i2i-info-badge"),
    btnI2iClear: document.getElementById("btn-i2i-clear"),
    i2iPaneWardrobe: document.getElementById("i2i-pane-wardrobe"),
    i2iPaneGeneral: document.getElementById("i2i-pane-general"),
    i2iGarmentPreset: document.getElementById("i2i-garment-preset"),
    i2iGrowMask: document.getElementById("i2i-grow-mask"),
    valI2iGrowMask: document.getElementById("val-i2i-grow-mask"),
    i2iBlurMask: document.getElementById("i2i-blur-mask"),
    valI2iBlurMask: document.getElementById("val-i2i-blur-mask"),
    i2iFidelitySlider: document.getElementById("i2i-fidelity-slider"),
    valI2iFidelity: document.getElementById("val-i2i-fidelity"),
    i2iFidelityLabel: document.getElementById("i2i-fidelity-label"),
    i2iFidelitySummary: document.getElementById("i2i-fidelity-summary"),
    i2iPositiveEditor: document.getElementById("i2i-positive-editor"),
    i2iPositiveBackdrop: document.getElementById("i2i-positive-backdrop"),
    i2iNegativeEditor: document.getElementById("i2i-negative-editor"),
    i2iNegativeBackdrop: document.getElementById("i2i-negative-backdrop"),
    i2iQuickTags: document.getElementById("i2i-quick-tags"),

    // Scale & Curator controls
    uiScaleSelect: document.getElementById("ui-scale-select"),
    curatorFileSelect: document.getElementById("curator-file-select"),
    btnCuratorNew: document.getElementById("btn-curator-new"),
    btnCuratorSave: document.getElementById("btn-curator-save"),
    btnCuratorDelete: document.getElementById("btn-curator-delete"),
    curatorFilterInput: document.getElementById("curator-filter-input"),
    curatorCountBadge: document.getElementById("curator-count-badge"),
    curatorTextEditor: document.getElementById("curator-text-editor"),

    // Engine racks
    enginePanelTitle: document.getElementById("engine-panel-title"),
    engineRackImage: document.getElementById("engine-rack-image"),
    engineRackVideo: document.getElementById("engine-rack-video"),
    engineRackMusic: document.getElementById("engine-rack-music"),

    // Render settings groups
    renderPanelTitle: document.getElementById("render-panel-title"),
    renderSettingsImage: document.getElementById("render-settings-image"),
    renderSettingsVideo: document.getElementById("render-settings-video"),
    renderSettingsMusic: document.getElementById("render-settings-music"),

    // Profile controls
    profileSelect: document.getElementById("profile-select"),
    btnSaveProfile: document.getElementById("btn-save-profile"),
    btnDeleteProfile: document.getElementById("btn-delete-profile"),

    // Action controls
    connectionPill: document.getElementById("connection-pill"),
    connectionText: document.getElementById("connection-text"),
    btnGenerate: document.getElementById("btn-generate"),
    genBtnLabel: document.getElementById("gen-btn-label"),
    btnInterrupt: document.getElementById("btn-interrupt"),

    // Engine fields (Image & Screenplay)
    architecture: document.getElementById("engine-architecture"),
    checkpoint: document.getElementById("engine-checkpoint"),
    unet: document.getElementById("engine-unet"),
    dtype: document.getElementById("engine-dtype"),
    clipType: document.getElementById("engine-clip-type"),
    clipName: document.getElementById("engine-clip-name"),
    vae: document.getElementById("engine-vae"),
    loraStackContainer: document.getElementById("lora-stack-container"),
    btnAddLora: document.getElementById("btn-add-lora"),
    chromaShift: document.getElementById("engine-chroma-shift"),
    valChromaShift: document.getElementById("val-chroma-shift"),
    guidance: document.getElementById("engine-guidance"),
    valGuidance: document.getElementById("val-guidance"),
    badgeArch: document.getElementById("badge-arch"),

    // Video Engine & Fields
    videoArch: document.getElementById("video-engine-arch"),
    videoModel: document.getElementById("video-engine-model"),
    videoFps: document.getElementById("video-fps"),
    videoCodec: document.getElementById("video-codec"),
    videoMotion: document.getElementById("video-motion-scale"),
    valVideoMotion: document.getElementById("val-video-motion"),
    videoDenoise: document.getElementById("video-temporal-denoise"),
    valVideoDenoise: document.getElementById("val-video-denoise"),
    videoPromptEditor: document.getElementById("video-prompt-editor"),
    videoDuration: document.getElementById("video-duration"),
    valVideoDuration: document.getElementById("val-video-duration"),
    videoSteps: document.getElementById("video-steps"),
    valVideoSteps: document.getElementById("val-video-steps"),

    // Music & Songwriting Fields
    musicGenre: document.getElementById("music-genre"),
    musicVocalStyle: document.getElementById("music-vocal-style"),
    musicKey: document.getElementById("music-key"),
    musicTimeSig: document.getElementById("music-time-sig"),
    musicBpm: document.getElementById("music-bpm"),
    valMusicBpm: document.getElementById("val-music-bpm"),
    musicMastering: document.getElementById("music-mastering-enable"),
    musicStereo3D: document.getElementById("music-stereo-3d"),
    musicTitle: document.getElementById("music-title"),
    musicStyleTags: document.getElementById("music-style-tags"),
    musicLyricsEditor: document.getElementById("music-lyrics-editor"),
    musicSongTemplate: document.getElementById("music-song-template"),
    btnAiSongwriter: document.getElementById("btn-ai-songwriter"),
    musicDuration: document.getElementById("music-duration"),
    valMusicDuration: document.getElementById("val-music-duration"),
    musicExportFormat: document.getElementById("music-export-format"),

    // Creative editors (Image / Screenplay)
    scriptEditor: document.getElementById("script-editor"),
    scriptBackdrop: document.getElementById("script-backdrop"),
    positiveEditor: document.getElementById("positive-editor"),
    positiveBackdrop: document.getElementById("positive-backdrop"),
    negativeEditor: document.getElementById("negative-editor"),
    negativeBackdrop: document.getElementById("negative-backdrop"),
    promptStyle: document.getElementById("prompt-style-select"),
    btnOllama: document.getElementById("btn-ollama-enhance"),
    btnInsertVarScript: document.getElementById("btn-insert-var-script"),
    btnInsertWcScript: document.getElementById("btn-insert-wc-script"),
    btnInsertVarPos: document.getElementById("btn-insert-var-pos"),
    btnInsertWcPos: document.getElementById("btn-insert-wc-pos"),
    btnInsertWcNeg: document.getElementById("btn-insert-wc-neg"),
    autocompletePopup: document.getElementById("zh-autocomplete-popup"),

    // Prompt Presets & Utility Tools
    presetCategorySelect: document.getElementById("preset-category-select"),
    presetPromptSelect: document.getElementById("preset-prompt-select"),
    btnSavePromptPreset: document.getElementById("btn-save-prompt-preset"),
    btnRefreshPrompts: document.getElementById("btn-refresh-prompts"),
    btnPromptDedupe: document.getElementById("btn-prompt-dedupe"),
    btnPromptProsify: document.getElementById("btn-prompt-prosify"),
    btnPromptTagify: document.getElementById("btn-prompt-tagify"),
    btnPromptSwap: document.getElementById("btn-prompt-swap"),
    btnPromptStripWeights: document.getElementById("btn-prompt-strip-weights"),

    // Style Harmonizer
    styleMovementSelect: document.getElementById("style-movement-select"),
    colorPaletteSelect: document.getElementById("color-palette-select"),
    styleStrengthSlider: document.getElementById("style-strength-slider"),
    valStyleStrength: document.getElementById("val-style-strength"),
    btnApplyStyle: document.getElementById("btn-apply-style"),

    // Negative Pedalboard & Mute
    muteNegativeCheckbox: document.getElementById("mute-negative-checkbox"),

    // Glamour Controller
    glamourToggleHeader: document.getElementById("glamour-toggle-header"),
    glamourArrow: document.getElementById("glamour-arrow"),
    glamourCardBody: document.getElementById("glamour-card-body"),
    glamourEnable: document.getElementById("glamour-enable"),
    glamourAge: document.getElementById("glamour-age"),
    valGlamourAge: document.getElementById("val-glamour-age"),
    glamourSmile: document.getElementById("glamour-smile"),
    valGlamourSmile: document.getElementById("val-glamour-smile"),
    glamourSkin: document.getElementById("glamour-skin"),
    valGlamourSkin: document.getElementById("val-glamour-skin"),
    glamourEthnicity: document.getElementById("glamour-ethnicity"),
    glamourHair: document.getElementById("glamour-hair"),
    glamourEyes: document.getElementById("glamour-eyes"),
    glamourBreasts: document.getElementById("glamour-breasts"),
    valGlamourBreasts: document.getElementById("val-glamour-breasts"),
    glamourWaist: document.getElementById("glamour-waist"),
    valGlamourWaist: document.getElementById("val-glamour-waist"),
    glamourHips: document.getElementById("glamour-hips"),
    valGlamourHips: document.getElementById("val-glamour-hips"),
    glamourMuscle: document.getElementById("glamour-muscle"),
    valGlamourMuscle: document.getElementById("val-glamour-muscle"),

    // Render & stages (Image / Screenplay)
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
    detailerStackContainer: document.getElementById("detailer-stack-container"),
    btnAddDetailer: document.getElementById("btn-add-detailer"),
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
    emptyIcon: document.getElementById("empty-icon"),
    emptyTitle: document.getElementById("empty-title"),
    previewImg: document.getElementById("preview-img"),
    previewVideo: document.getElementById("preview-video"),
    previewAudioContainer: document.getElementById("preview-audio-container"),
    audioPlayerTitle: document.getElementById("audio-player-title"),
    audioPlayerTime: document.getElementById("audio-player-time"),
    audioWaveformCanvas: document.getElementById("audio-waveform-canvas"),
    previewAudio: document.getElementById("preview-audio"),
    historyContainer: document.getElementById("history-container")
};

// ── 1. Initialization & API Loading ──────────────────────────────────────────

let availableLoraList = ["None"];
let availableSamplers = ["euler_ancestral", "euler", "dpmpp_2m", "dpmpp_sde", "ddim", "uni_pc"];
let availableSchedulers = ["karras", "simple", "sgm_uniform", "normal", "exponential"];

const defaultDetectorOptions = [
    { value: "face_yolov8m.pt", label: "Face (face_yolov8m)" },
    { value: "Eyes.pt", label: "Eyes (Eyes.pt)" },
    { value: "hand_yolov8s.pt", label: "Hands (hand_yolov8s)" },
    { value: "person_yolov8m-seg.pt", label: "Full Body (person_yolov8m-seg)" },
    { value: "deepfashion2_yolov8s-seg.pt", label: "Clothing (deepfashion2_yolov8s-seg)" },
    { value: "hair_yolov8n-seg_60.pt", label: "Hair (hair_yolov8n-seg)" },
    { value: "lips_v1.pt", label: "Lips (lips_v1)" }
];

let availableDetectorList = [...defaultDetectorOptions];

async function initStudio() {
    injectDetailerStyles();
    setupUiScale();
    setupSliders();
    setupDynamicStacks();
    ensureDetailerGlobalControls();
    setupModeSwitcher();
    setupAspectRatios();
    setupEditorHelpers();
    setupPromptPresets();
    setupStyleHarmonizer();
    setupNegativePedalboard();
    setupGlamourController();
    setupSyntaxHighlighting();
    setupAutocomplete();
    setupListCurator();
    setupMusicStudio();
    setupVideoStudio();
    setupImageEditStudio();
    setupHotkeys();

    await loadModelAssets();
    await loadProfiles();
    await loadCuratorWildcards();
    await loadPromptPresets();
    connectWebSocket();
}

// ── Dynamic LoRA & Detailer Stack Handlers ────────────────────────────────────

function addLoraItem(name = "None", strength = 1.0) {
    if (!el.loraStackContainer) return;

    const item = document.createElement("div");
    item.className = "zh-stack-item zh-lora-item";

    const row1 = document.createElement("div");
    row1.className = "zh-stack-item-row";

    const select = document.createElement("select");
    select.className = "zh-select zh-lora-select flex-1";
    for (const loraName of availableLoraList) {
        const opt = document.createElement("option");
        opt.value = loraName;
        opt.textContent = loraName;
        if (lorNameMatch(loraName, name)) opt.selected = true;
        select.appendChild(opt);
    }

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "zh-btn-delete-item";
    delBtn.innerHTML = "✕";
    delBtn.title = "Remove LoRA";
    delBtn.addEventListener("click", () => item.remove());

    row1.appendChild(select);
    row1.appendChild(delBtn);

    const row2 = document.createElement("div");
    row2.className = "zh-stack-item-row";

    const valSpan = document.createElement("span");
    valSpan.className = "zh-slider-val zh-lora-val";
    valSpan.textContent = Number(strength).toFixed(2);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "-2.0";
    slider.max = "2.0";
    slider.step = "0.05";
    slider.value = strength;
    slider.className = "zh-slider zh-lora-slider flex-1";
    slider.addEventListener("input", () => {
        valSpan.textContent = Number(slider.value).toFixed(2);
    });

    row2.appendChild(slider);
    row2.appendChild(valSpan);

    item.appendChild(row1);
    item.appendChild(row2);
    el.loraStackContainer.appendChild(item);
}

function lorNameMatch(a, b) {
    if (!a || !b) return false;
    return a.toLowerCase() === b.toLowerCase();
}

function getLoraStackData() {
    const items = [];
    if (!el.loraStackContainer) return items;
    el.loraStackContainer.querySelectorAll(".zh-lora-item").forEach(item => {
        const select = item.querySelector(".zh-lora-select");
        const slider = item.querySelector(".zh-lora-slider");
        const val = select ? select.value : "None";
        if (val && val !== "None") {
            const str = parseFloat(slider?.value || "1.0");
            items.push({
                name: val,
                strength: str,
                model_strength: str,
                clip_strength: str,
                enabled: true
            });
        }
    });
    return items;
}

function injectDetailerStyles() {
    if (document.getElementById("zh-detailer-custom-styles")) return;
    const style = document.createElement("style");
    style.id = "zh-detailer-custom-styles";
    style.textContent = `
        .zh-detailer-item {
            background: rgba(15, 23, 42, 0.75);
            border: 1px solid rgba(56, 189, 248, 0.25);
            border-radius: 8px;
            padding: 10px 12px;
            margin-bottom: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .zh-detailer-item:hover {
            border-color: rgba(56, 189, 248, 0.45);
            box-shadow: 0 6px 16px rgba(56, 189, 248, 0.12);
        }
        .zh-detailer-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 8px;
        }
        .zh-detailer-header-left {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }
        .zh-detailer-pass-badge {
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(99, 102, 241, 0.25));
            border: 1px solid rgba(56, 189, 248, 0.5);
            color: #38bdf8;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            letter-spacing: 0.5px;
            user-select: none;
        }
        .zh-detailer-header-actions {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .zh-detailer-toggle-adv {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: var(--text-muted);
            font-size: 10px;
            padding: 3px 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .zh-detailer-toggle-adv:hover {
            color: #fff;
            background: rgba(56, 189, 248, 0.2);
            border-color: rgba(56, 189, 248, 0.4);
        }
        .zh-detailer-main-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            background: rgba(0, 0, 0, 0.25);
            padding: 8px 10px;
            border-radius: 6px;
            margin-bottom: 6px;
        }
        .zh-detailer-param label {
            font-size: 10px;
            color: var(--text-muted);
        }
        .zh-detailer-advanced-drawer {
            border-top: 1px dashed rgba(255, 255, 255, 0.12);
            padding-top: 8px;
            margin-top: 6px;
            animation: fadeIn 0.2s ease-in-out;
        }
        .zh-detailer-adv-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }
        .zh-adv-field label {
            font-size: 9px;
            color: var(--text-muted);
            display: block;
            margin-bottom: 2px;
        }
        .zh-adv-field .zh-input, .zh-adv-field .zh-select {
            height: 24px;
            padding: 1px 6px;
            font-size: 11px;
        }
        .zh-detailer-global-bar {
            background: rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 10px;
        }
    `;
    document.head.appendChild(style);
}

function ensureDetailerGlobalControls() {
    if (!el.detailerStackContainer) return;
    if (document.getElementById("detailer-global-controls")) return;

    const bar = document.createElement("div");
    bar.id = "detailer-global-controls";
    bar.className = "zh-detailer-global-bar";
    bar.innerHTML = `
        <div class="zh-label-row" style="margin-bottom: 4px;">
            <label style="font-size: 11px; font-weight: 600; color: var(--accent-cyan); display: flex; align-items: center; gap: 4px;">
                <span>🎯 Detection Confidence Threshold</span>
            </label>
            <input id="detailer-global-confidence" type="number" step="0.05" min="0.05" max="0.95" value="0.30" class="zh-slider-val-input" title="Sensitivity threshold (lower = detects more, higher = only high confidence)">
        </div>
        <input id="detailer-global-confidence-slider" type="range" min="0.05" max="0.95" step="0.05" value="0.30" class="zh-slider">
    `;
    el.detailerStackContainer.parentNode.insertBefore(bar, el.detailerStackContainer);

    const slider = document.getElementById("detailer-global-confidence-slider");
    const numInput = document.getElementById("detailer-global-confidence");
    slider?.addEventListener("input", () => { numInput.value = Number(slider.value).toFixed(2); });
    numInput?.addEventListener("input", () => { slider.value = numInput.value; });
}

function populateDetectorSelect(selectEl, selectedVal) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    const cleanSelected = (selectedVal || "").replace(/^(bbox|segm)\//, "");

    const allModels = availableDetectorList.map(d => typeof d === "string" ? d : d.value);

    const cats = {
        "Face & Expressions": [],
        "Eyes & Gaze": [],
        "Hands & Limbs": [],
        "Body & Silhouette": [],
        "Clothing & Fashion": [],
        "Anatomy & Intimate": [],
        "Other / Utility": []
    };

    allModels.forEach(m => {
        const name = m.toLowerCase();
        if (name.includes("face") || name.includes("mouth") || name.includes("lips") || name.includes("teeth") || name.includes("chin")) {
            cats["Face & Expressions"].push(m);
        } else if (name.includes("eye") || name.includes("pupil") || name.includes("iris")) {
            cats["Eyes & Gaze"].push(m);
        } else if (name.includes("hand") || name.includes("finger") || name.includes("palm")) {
            cats["Hands & Limbs"].push(m);
        } else if (name.includes("breast") || name.includes("nipple") || name.includes("penis") || name.includes("vagina") || name.includes("anus") || name.includes("ass") || name.includes("cock") || name.includes("ball")) {
            cats["Anatomy & Intimate"].push(m);
        } else if (name.includes("fashion") || name.includes("garment") || name.includes("dress") || name.includes("cloth") || name.includes("heels")) {
            cats["Clothing & Fashion"].push(m);
        } else if (name.includes("person") || name.includes("body") || name.includes("hair") || name.includes("belly") || name.includes("foot") || name.includes("feet") || name.includes("nail")) {
            cats["Body & Silhouette"].push(m);
        } else {
            cats["Other / Utility"].push(m);
        }
    });

    let found = false;
    for (const [catName, models] of Object.entries(cats)) {
        if (models.length === 0) continue;
        const group = document.createElement("optgroup");
        group.label = `${catName} (${models.length})`;
        for (const m of models) {
            const opt = document.createElement("option");
            opt.value = m;
            const niceName = m.replace(/\.(pt|pth)$/i, "").replace(/[-_]/g, " ");
            opt.textContent = `${niceName} (${m})`;
            if (m === cleanSelected) {
                opt.selected = true;
                found = true;
            }
            group.appendChild(opt);
        }
        selectEl.appendChild(group);
    }

    if (!found && cleanSelected) {
        const opt = document.createElement("option");
        opt.value = cleanSelected;
        opt.textContent = cleanSelected;
        opt.selected = true;
        selectEl.appendChild(opt);
    }
}

function refreshAllDetailerDropdowns() {
    if (!el.detailerStackContainer) return;
    el.detailerStackContainer.querySelectorAll(".zh-detailer-select").forEach(sel => {
        const currentVal = sel.value;
        populateDetectorSelect(sel, currentVal);
    });
}

function addDetailerItem(config = {}) {
    if (!el.detailerStackContainer) return;
    ensureDetailerGlobalControls();

    const model = (typeof config === "string" ? config : config.model) || "face_yolov8m.pt";
    const cleanModel = model.replace(/^(bbox|segm)\//, "");
    const denoise = config.denoise !== undefined ? config.denoise : 0.45;
    const steps = config.steps !== undefined ? config.steps : 20;
    const cfg = config.cfg !== undefined ? config.cfg : 7.0;
    const padding = config.padding !== undefined ? config.padding : 32;
    const maskBlur = config.mask_blur !== undefined ? config.mask_blur : 4;
    const blendFeather = config.blend_feather !== undefined ? config.blend_feather : 16;
    const contextPad = config.context_pad !== undefined ? config.context_pad : 32;
    const sampler = config.sampler || (el.sampler?.value || "euler_ancestral");
    const scheduler = config.scheduler || (el.scheduler?.value || "karras");
    const enabled = config.enabled !== undefined ? config.enabled : true;
    const inpaintPrompt = config.inpaint_prompt || "";

    const passIndex = el.detailerStackContainer.querySelectorAll(".zh-detailer-item").length + 1;

    const item = document.createElement("div");
    item.className = "zh-stack-item zh-detailer-item";
    item.setAttribute("data-detailer-pass", passIndex);

    item.innerHTML = `
        <div class="zh-detailer-header">
            <div class="zh-detailer-header-left">
                <input type="checkbox" class="zh-detailer-enable-toggle" ${enabled ? "checked" : ""} title="Enable or bypass this detailer pass">
                <span class="zh-detailer-pass-badge">#${passIndex}</span>
                <select class="zh-select zh-detailer-select flex-1" title="Select detector model"></select>
            </div>
            <div class="zh-detailer-header-actions">
                <button type="button" class="zh-detailer-toggle-adv zh-btn-mini" title="Expand advanced settings">⚙️ Settings</button>
                <button type="button" class="zh-btn-delete-item" title="Remove Detailer pass">✕</button>
            </div>
        </div>

        <div class="zh-detailer-main-grid">
            <div class="zh-detailer-param">
                <div class="zh-label-row">
                    <label>Denoise</label>
                    <input type="number" step="0.05" min="0.05" max="1.0" value="${Number(denoise).toFixed(2)}" class="zh-slider-val-input zh-det-denoise-num">
                </div>
                <input type="range" min="0.05" max="1.0" step="0.05" value="${denoise}" class="zh-slider zh-det-denoise-slider">
            </div>

            <div class="zh-detailer-param">
                <div class="zh-label-row">
                    <label>Steps</label>
                    <input type="number" step="1" min="5" max="80" value="${steps}" class="zh-slider-val-input zh-det-steps-num">
                </div>
                <input type="range" min="5" max="80" step="1" value="${steps}" class="zh-slider zh-det-steps-slider">
            </div>

            <div class="zh-detailer-param">
                <div class="zh-label-row">
                    <label>CFG Scale</label>
                    <input type="number" step="0.5" min="1.0" max="20.0" value="${Number(cfg).toFixed(1)}" class="zh-slider-val-input zh-det-cfg-num">
                </div>
                <input type="range" min="1.0" max="20.0" step="0.5" value="${cfg}" class="zh-slider zh-det-cfg-slider">
            </div>
        </div>

        <div class="zh-detailer-advanced-drawer" style="display: none;">
            <div class="zh-detailer-adv-grid">
                <div class="zh-adv-field">
                    <label>Padding (px)</label>
                    <input type="number" min="0" max="256" step="8" value="${padding}" class="zh-input zh-det-padding">
                </div>
                <div class="zh-adv-field">
                    <label>Context Pad</label>
                    <input type="number" min="0" max="256" step="8" value="${contextPad}" class="zh-input zh-det-context-pad">
                </div>
                <div class="zh-adv-field">
                    <label>Mask Blur (px)</label>
                    <input type="number" min="0" max="64" step="2" value="${maskBlur}" class="zh-input zh-det-mask-blur">
                </div>
                <div class="zh-adv-field">
                    <label>Blend Feather</label>
                    <input type="number" min="0" max="128" step="4" value="${blendFeather}" class="zh-input zh-det-blend-feather">
                </div>
                <div class="zh-adv-field">
                    <label>Sampler</label>
                    <select class="zh-select zh-det-sampler"></select>
                </div>
                <div class="zh-adv-field">
                    <label>Scheduler</label>
                    <select class="zh-select zh-det-scheduler"></select>
                </div>
            </div>
            <div class="zh-detailer-prompt-row" style="margin-top: 6px;">
                <label style="font-size: 10px; color: var(--text-muted); display: block; margin-bottom: 2px;">Inpaint Focus Prompt (Optional)</label>
                <input type="text" class="zh-input zh-det-inpaint-prompt" placeholder="e.g. highly detailed iris, sharp eyelashes, realistic skin" value="${inpaintPrompt}" style="width: 100%; font-size: 11px;">
            </div>
        </div>
    `;

    const select = item.querySelector(".zh-detailer-select");
    populateDetectorSelect(select, cleanModel);

    const samplerSelect = item.querySelector(".zh-det-sampler");
    const schedSelect = item.querySelector(".zh-det-scheduler");
    populateSelect(samplerSelect, availableSamplers, sampler);
    populateSelect(schedSelect, availableSchedulers, scheduler);

    const bindPair = (sliderClass, numClass, decimals = 2) => {
        const slider = item.querySelector(sliderClass);
        const num = item.querySelector(numClass);
        if (slider && num) {
            slider.addEventListener("input", () => { num.value = Number(slider.value).toFixed(decimals); });
            num.addEventListener("input", () => { slider.value = num.value; });
        }
    };
    bindPair(".zh-det-denoise-slider", ".zh-det-denoise-num", 2);
    bindPair(".zh-det-steps-slider", ".zh-det-steps-num", 0);
    bindPair(".zh-det-cfg-slider", ".zh-det-cfg-num", 1);

    const advBtn = item.querySelector(".zh-detailer-toggle-adv");
    const advDrawer = item.querySelector(".zh-detailer-advanced-drawer");
    advBtn?.addEventListener("click", () => {
        const isHidden = advDrawer.style.display === "none";
        advDrawer.style.display = isHidden ? "block" : "none";
        advBtn.textContent = isHidden ? "▲ Less" : "⚙️ Settings";
        advBtn.style.color = isHidden ? "var(--accent-cyan)" : "";
    });

    const delBtn = item.querySelector(".zh-btn-delete-item");
    delBtn?.addEventListener("click", () => {
        item.remove();
        el.detailerStackContainer?.querySelectorAll(".zh-detailer-item").forEach((elItem, idx) => {
            const badge = elItem.querySelector(".zh-detailer-pass-badge");
            if (badge) badge.textContent = `#${idx + 1}`;
        });
    });

    el.detailerStackContainer.appendChild(item);
}

function getDetailerStackData() {
    const items = [];
    if (!el.detailerStackContainer) return items;
    el.detailerStackContainer.querySelectorAll(".zh-detailer-item").forEach(item => {
        const enabled = item.querySelector(".zh-detailer-enable-toggle")?.checked ?? true;
        const select = item.querySelector(".zh-detailer-select");
        const denoise = parseFloat(item.querySelector(".zh-det-denoise-num")?.value || "0.45");
        const steps = parseInt(item.querySelector(".zh-det-steps-num")?.value || "20", 10);
        const cfg = parseFloat(item.querySelector(".zh-det-cfg-num")?.value || "7.0");
        const padding = parseInt(item.querySelector(".zh-det-padding")?.value || "32", 10);
        const contextPad = parseInt(item.querySelector(".zh-det-context-pad")?.value || "32", 10);
        const maskBlur = parseInt(item.querySelector(".zh-det-mask-blur")?.value || "4", 10);
        const blendFeather = parseInt(item.querySelector(".zh-det-blend-feather")?.value || "16", 10);
        const sampler = item.querySelector(".zh-det-sampler")?.value || "euler_ancestral";
        const scheduler = item.querySelector(".zh-det-scheduler")?.value || "karras";
        const inpaintPrompt = item.querySelector(".zh-det-inpaint-prompt")?.value || "";

        const rawModel = select ? select.value : "face_yolov8m.pt";
        items.push({
            model: rawModel.replace(/^(bbox|segm)\//, ""),
            denoise: isNaN(denoise) ? 0.45 : denoise,
            steps: isNaN(steps) ? 20 : steps,
            cfg: isNaN(cfg) ? 7.0 : cfg,
            padding: isNaN(padding) ? 32 : padding,
            context_pad: isNaN(contextPad) ? 32 : contextPad,
            mask_blur: isNaN(maskBlur) ? 4 : maskBlur,
            blend_feather: isNaN(blendFeather) ? 16 : blendFeather,
            sampler,
            scheduler,
            enabled,
            inpaint_prompt: inpaintPrompt
        });
    });
    return items;
}

function setupDynamicStacks() {
    el.btnAddLora?.addEventListener("click", () => addLoraItem());
    el.btnAddDetailer?.addEventListener("click", () => addDetailerItem());
}

function setupSliders() {
    const bindSlider = (slider, display, suffix = "", decimals = 2) => {
        if (!slider || !display) return;
        const isInput = display.tagName === "INPUT";
        const updateDisplay = () => {
            const val = Number(slider.value).toFixed(decimals);
            if (isInput) display.value = val;
            else display.textContent = val + suffix;
        };
        slider.addEventListener("input", updateDisplay);
        if (isInput) {
            display.addEventListener("input", () => {
                const num = parseFloat(display.value);
                if (!isNaN(num)) {
                    slider.value = num;
                    slider.dispatchEvent(new Event("change"));
                }
            });
            display.addEventListener("change", () => {
                const num = parseFloat(display.value);
                if (!isNaN(num)) {
                    slider.value = num;
                    slider.dispatchEvent(new Event("change"));
                    display.value = Number(slider.value).toFixed(decimals);
                }
            });
        }
    };

    bindSlider(el.chromaShift, el.valChromaShift, "", 1);
    bindSlider(el.guidance, el.valGuidance, "", 1);
    bindSlider(el.steps, el.valSteps, "", 0);
    bindSlider(el.cfg, el.valCfg, "", 1);
    bindSlider(el.dewaxGrain, el.valDewaxGrain, "", 2);

    // Style & Glamour sliders
    bindSlider(el.styleStrengthSlider, el.valStyleStrength, "", 1);
    bindSlider(el.glamourAge, el.valGlamourAge, "", 1);
    bindSlider(el.glamourSmile, el.valGlamourSmile, "", 2);
    bindSlider(el.glamourSkin, el.valGlamourSkin, "", 2);
    bindSlider(el.glamourBreasts, el.valGlamourBreasts, "", 1);
    bindSlider(el.glamourWaist, el.valGlamourWaist, "", 1);
    bindSlider(el.glamourHips, el.valGlamourHips, "", 1);
    bindSlider(el.glamourMuscle, el.valGlamourMuscle, "", 1);

    // Video sliders
    bindSlider(el.videoMotion, el.valVideoMotion, "", 2);
    bindSlider(el.videoDenoise, el.valVideoDenoise, "", 2);
    if (el.videoDuration && el.valVideoDuration) {
        el.videoDuration.addEventListener("input", () => {
            const sec = parseInt(el.videoDuration.value, 10);
            const fps = parseInt(el.videoFps?.value || "30", 10);
            el.valVideoDuration.textContent = `${sec}s (${sec * fps} frames)`;
        });
    }
    bindSlider(el.videoSteps, el.valVideoSteps, "", 0);

    // Music sliders
    bindSlider(el.musicBpm, el.valMusicBpm, "", 0);
    el.musicBpm?.addEventListener("input", updateMusicStyleSignature);
    if (el.musicDuration && el.valMusicDuration) {
        el.musicDuration.addEventListener("input", () => {
            const sec = parseInt(el.musicDuration.value, 10);
            const m = Math.floor(sec / 60);
            const s = String(sec % 60).padStart(2, "0");
            el.valMusicDuration.textContent = `${m}:${s} (${sec}s)`;
        });
    }

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

        // Mode button active states
        [el.btnScreenplay, el.btnPrompt, el.btnI2i, el.btnVideo, el.btnMusic, el.btnLists].forEach(b => b?.classList.remove("active"));
        [el.viewScreenplay, el.viewPrompt, el.viewI2i, el.viewVideo, el.viewMusic, el.viewLists].forEach(v => v?.classList.remove("active"));

        // Engine rack active states
        if (el.engineRackImage) el.engineRackImage.style.display = "none";
        if (el.engineRackVideo) el.engineRackVideo.style.display = "none";
        if (el.engineRackMusic) el.engineRackMusic.style.display = "none";

        // Render settings active states
        if (el.renderSettingsImage) el.renderSettingsImage.style.display = "none";
        if (el.renderSettingsVideo) el.renderSettingsVideo.style.display = "none";
        if (el.renderSettingsMusic) el.renderSettingsMusic.style.display = "none";

        if (mode === "screenplay") {
            el.btnScreenplay?.classList.add("active");
            el.viewScreenplay?.classList.add("active");
            if (el.engineRackImage) el.engineRackImage.style.display = "block";
            if (el.renderSettingsImage) el.renderSettingsImage.style.display = "block";
            if (el.enginePanelTitle) el.enginePanelTitle.textContent = "🎛️ Engine & Models";
            if (el.renderPanelTitle) el.renderPanelTitle.textContent = "⚡ Render Pipeline";
            if (el.genBtnLabel) el.genBtnLabel.textContent = "GENERATE SCRIPT";
            if (el.badgeArch) el.badgeArch.textContent = (el.architecture?.value || "CHROMA").toUpperCase();
        } else if (mode === "prompt") {
            el.btnPrompt?.classList.add("active");
            el.viewPrompt?.classList.add("active");
            if (el.engineRackImage) el.engineRackImage.style.display = "block";
            if (el.renderSettingsImage) el.renderSettingsImage.style.display = "block";
            if (el.enginePanelTitle) el.enginePanelTitle.textContent = "🎛️ Engine & Models";
            if (el.renderPanelTitle) el.renderPanelTitle.textContent = "⚡ Render Pipeline";
            if (el.genBtnLabel) el.genBtnLabel.textContent = "GENERATE IMAGE";
            if (el.badgeArch) el.badgeArch.textContent = (el.architecture?.value || "CHROMA").toUpperCase();
        } else if (mode === "i2i") {
            el.btnI2i?.classList.add("active");
            el.viewI2i?.classList.add("active");
            if (el.engineRackImage) el.engineRackImage.style.display = "block";
            if (el.renderSettingsImage) el.renderSettingsImage.style.display = "block";
            if (el.enginePanelTitle) el.enginePanelTitle.textContent = "🎛️ Engine & Models";
            if (el.renderPanelTitle) el.renderPanelTitle.textContent = "⚡ Render Pipeline";
            if (el.genBtnLabel) el.genBtnLabel.textContent = i2iCurrentTask === "wardrobe" ? "CHANGE CLOTHES" : "EDIT IMAGE";
            if (el.badgeArch) el.badgeArch.textContent = (el.architecture?.value || "CHROMA").toUpperCase();
        } else if (mode === "video") {
            el.btnVideo?.classList.add("active");
            el.viewVideo?.classList.add("active");
            if (el.engineRackVideo) el.engineRackVideo.style.display = "block";
            if (el.renderSettingsVideo) el.renderSettingsVideo.style.display = "block";
            if (el.enginePanelTitle) el.enginePanelTitle.textContent = "🎥 Video DiT Engine";
            if (el.renderPanelTitle) el.renderPanelTitle.textContent = "⚡ Video Render";
            if (el.genBtnLabel) el.genBtnLabel.textContent = "RENDER VIDEO";
            if (el.badgeArch) el.badgeArch.textContent = "WAN 2.1";
        } else if (mode === "music") {
            el.btnMusic?.classList.add("active");
            el.viewMusic?.classList.add("active");
            if (el.engineRackMusic) el.engineRackMusic.style.display = "block";
            if (el.renderSettingsMusic) el.renderSettingsMusic.style.display = "block";
            if (el.enginePanelTitle) el.enginePanelTitle.textContent = "🎵 Vocal & Sound Rack";
            if (el.renderPanelTitle) el.renderPanelTitle.textContent = "⚡ Audio Master";
            if (el.genBtnLabel) el.genBtnLabel.textContent = "PRODUCE HIT SONG";
            if (el.badgeArch) el.badgeArch.textContent = "ACE-STEP 24B";
        } else if (mode === "lists") {
            el.btnLists?.classList.add("active");
            el.viewLists?.classList.add("active");
            if (el.engineRackImage) el.engineRackImage.style.display = "block";
            if (el.renderSettingsImage) el.renderSettingsImage.style.display = "block";
            if (el.enginePanelTitle) el.enginePanelTitle.textContent = "📚 Lists & Wildcards";
            if (el.renderPanelTitle) el.renderPanelTitle.textContent = "⚡ Curator Tools";
            if (el.genBtnLabel) el.genBtnLabel.textContent = "SAVE LIST";
            if (el.badgeArch) el.badgeArch.textContent = "CURATOR";
            loadCuratorWildcards();
        }
    };

    el.btnScreenplay?.addEventListener("click", () => setMode("screenplay"));
    el.btnPrompt?.addEventListener("click", () => setMode("prompt"));
    el.btnI2i?.addEventListener("click", () => setMode("i2i"));
    el.btnVideo?.addEventListener("click", () => setMode("video"));
    el.btnMusic?.addEventListener("click", () => setMode("music"));
    el.btnLists?.addEventListener("click", () => setMode("lists"));
}

function setupAspectRatios() {
    // Image aspect ratio buttons
    document.querySelectorAll(".zh-ratio-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".zh-ratio-btn").forEach(b => b.classList.remove("active"));
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

    // Video aspect ratio buttons
    document.querySelectorAll(".zh-video-ratio-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".zh-video-ratio-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
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

    // Ollama AI prompt enhance
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

// ── Prompt Presets, Style Harmonizer, Pedalboard & Glamour ────────────────────

let allSavedPrompts = [];

async function loadPromptPresets() {
    try {
        const resp = await fetch("/zombiehaus/list_prompts");
        const res = await resp.json();
        if (res.success && res.data) {
            allSavedPrompts = res.data;
            populatePresetCategories();
            filterAndPopulatePresets();
        }
    } catch (e) {
        console.error("Failed to load prompt presets:", e);
    }
}

function populatePresetCategories() {
    if (!el.presetCategorySelect) return;
    const cats = new Set(["all"]);
    for (const p of allSavedPrompts) {
        if (p.category) cats.add(p.category);
    }
    const curVal = el.presetCategorySelect.value || "all";
    el.presetCategorySelect.innerHTML = "";
    for (const c of cats) {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c === "all" ? "All Categories" : c;
        if (c === curVal) opt.selected = true;
        el.presetCategorySelect.appendChild(opt);
    }
}

function filterAndPopulatePresets() {
    if (!el.presetPromptSelect) return;
    const selCat = el.presetCategorySelect?.value || "all";
    const filtered = allSavedPrompts.filter(p => selCat === "all" || p.category === selCat);
    el.presetPromptSelect.innerHTML = '<option value="">-- select prompt --</option>';
    for (const p of filtered) {
        const opt = document.createElement("option");
        opt.value = p.filename;
        opt.textContent = p.filename.replace(/\.json$/i, "");
        el.presetPromptSelect.appendChild(opt);
    }
}

function setupPromptPresets() {
    el.presetCategorySelect?.addEventListener("change", () => {
        filterAndPopulatePresets();
    });

    el.presetPromptSelect?.addEventListener("change", async (e) => {
        const filename = e.target.value;
        if (!filename) return;

        try {
            const resp = await fetch("/zombiehaus/load_prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename })
            });
            const res = await resp.json();
            if (res.success && res.data) {
                if (el.positiveEditor) {
                    el.positiveEditor.value = res.data.positive || "";
                    el.positiveEditor.dispatchEvent(new Event("input"));
                }
                if (el.negativeEditor) {
                    el.negativeEditor.value = res.data.negative || "";
                    el.negativeEditor.dispatchEvent(new Event("input"));
                }
                syncPedalboardActiveStates();
            }
        } catch (err) {
            console.error("Failed to load prompt preset:", err);
        }
    });

    el.btnSavePromptPreset?.addEventListener("click", async () => {
        const name = prompt("Enter a name for this prompt preset:");
        if (!name || !name.trim()) return;

        const category = prompt("Enter a category (e.g. characters, styles, prompts):", "prompts") || "prompts";
        const positive = el.positiveEditor?.value || "";
        const negative = el.negativeEditor?.value || "";

        try {
            const resp = await fetch("/zombiehaus/save_prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: name.trim(),
                    category: category.trim(),
                    positive,
                    negative
                })
            });
            const res = await resp.json();
            if (res.success) {
                alert(`Saved preset "${name.trim()}"!`);
                await loadPromptPresets();
                if (el.presetPromptSelect) el.presetPromptSelect.value = `${name.trim()}.json`;
            } else {
                alert("Save failed: " + (res.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Error saving prompt preset:", err);
        }
    });

    el.btnRefreshPrompts?.addEventListener("click", async () => {
        await loadPromptPresets();
    });

    // Dedupe Prompt Tags
    el.btnPromptDedupe?.addEventListener("click", () => {
        if (!el.positiveEditor) return;
        const raw = el.positiveEditor.value;
        const tokens = raw.split(",").map(t => t.trim()).filter(t => t.length > 0);
        const seen = new Set();
        const deduped = [];
        for (const t of tokens) {
            const lower = t.toLowerCase();
            if (!seen.has(lower)) {
                seen.add(lower);
                deduped.push(t);
            }
        }
        el.positiveEditor.value = deduped.join(", ");
        el.positiveEditor.dispatchEvent(new Event("input"));
    });

    // Prosify Prompt (Natural Prose)
    el.btnPromptProsify?.addEventListener("click", () => {
        if (!el.positiveEditor) return;
        const raw = el.positiveEditor.value.trim();
        if (!raw) return;
        const tags = raw.split(",").map(t => t.trim().replace(/^[\(\[\{]+|[\)\]\}]+$/g, "")).filter(t => t.length > 0);
        if (tags.length === 0) return;
        const prose = `A stunning cinematic depiction featuring ${tags.slice(0, 3).join(" and ")}, set amidst ${tags.slice(3, 7).join(", ")}, with exquisite atmosphere, flawless lighting, and rich authentic detail.`;
        el.positiveEditor.value = prose;
        el.positiveEditor.dispatchEvent(new Event("input"));
    });

    // Tagify Prompt
    el.btnPromptTagify?.addEventListener("click", () => {
        if (!el.positiveEditor) return;
        const raw = el.positiveEditor.value.trim();
        if (!raw) return;
        const words = raw.replace(/[.;!?\n\r]+/g, ",").split(",").map(w => w.trim()).filter(w => w.length > 0);
        el.positiveEditor.value = words.join(", ");
        el.positiveEditor.dispatchEvent(new Event("input"));
    });

    // Swap Positive & Negative Prompts
    el.btnPromptSwap?.addEventListener("click", () => {
        if (!el.positiveEditor || !el.negativeEditor) return;
        const pos = el.positiveEditor.value;
        const neg = el.negativeEditor.value;
        el.positiveEditor.value = neg;
        el.negativeEditor.value = pos;
        el.positiveEditor.dispatchEvent(new Event("input"));
        el.negativeEditor.dispatchEvent(new Event("input"));
        syncPedalboardActiveStates();
    });

    // Clean / Strip Weights
    el.btnPromptStripWeights?.addEventListener("click", () => {
        if (!el.positiveEditor) return;
        let text = el.positiveEditor.value;
        text = text.replace(/\(([^:)]+):[0-9.]+\)/g, "$1");
        text = text.replace(/[()\[\]{}]/g, "");
        el.positiveEditor.value = text.trim();
        el.positiveEditor.dispatchEvent(new Event("input"));
    });
}

// ── Style & Color Harmonizer (from ZombiehausStylePicker) ─────────────────────

const stylePresetTokens = {
    "vogue_fashion_editorial": "vogue editorial fashion photography, high fashion avant-garde styling, studio elegance, clean lines, professional retouching",
    "cyberpunk_synthwave": "cyberpunk synthwave aesthetic, neon holographic glow, futuristic reflections, electric cyan and magenta, high-tech dystopian atmosphere",
    "dark_fantasy_oil": "dark fantasy oil painting, heavy textured impasto brushstrokes, rich oil pigments, dramatic baroque lighting, gothic masterpiece",
    "90s_retro_anime": "1990s retro anime aesthetic, hand-drawn animation cel, subtle analog tape grain, vintage color palette, nostalgic anime still",
    "shinkai_cinematic": "makoto shinkai cinematic style, breathtaking detailed skies, brilliant god rays, vibrant hyper-detailed lighting, anime film masterpiece",
    "watercolor_ink_wash": "watercolor and ink wash painting, fluid translucent color bleeds, organic pigment pooling, textured cold-press cotton paper",
    "ukiyo_e_woodblock": "traditional japanese ukiyo-e woodcut print, distinct black outline contours, decorative flat color blocks, hokusai inspired, washi texture",
    "art_nouveau_mucha": "art nouveau illustration, elegant flowing sinuous curves, intricate floral botanical filigree, alphonse mucha inspired, golden decorative motifs",
    "comic_book_noir": "graphic novel comic art, heavy ink cross-hatching, dramatic chiaroscuro noir, gritty comic book paneling, bold lineart",
    "pixar_3d_stylized": "3d stylized animation render, soft tactile subsurface scattering, whimsical charming proportions, octane render quality",
    "claymation_stop_motion": "stop-motion claymation, authentic plasticine clay surface texture, subtle handmade sculpting marks, miniature stage lighting",
    "sci_fi_concept_art": "epic sci-fi concept art, matte painting fidelity, monumental scale, intricate industrial architecture, syd mead inspired",
    "national_geographic": "national geographic documentary photography, tack-sharp telephoto optics, authentic wildlife realism, pristine natural color grading",
    "surrealist_dreamscape": "surrealist dreamscape painting, salvador dali inspired, impossible physics, ethereal floating elements, uncanny beauty"
};

const colorPaletteTokens = {
    "warm_golden_amber": "warm golden amber color grading, rich honey tones, warm luminous shadows",
    "cool_cyber_cyan": "cool cyan and teal color harmony, electric blue accents, deep oceanic darks",
    "monochrome_high_contrast": "dramatic black and white high contrast, deep ink blacks, crisp silver highlights",
    "pastel_dreamy": "soft pastel color palette, delicate lavender and peach, gentle muted saturation",
    "moody_desaturated": "moody desaturated tones, somber charcoal and slate, subdued atmospheric color grading",
    "vibrant_hyper_saturated": "vibrant saturated color palette, vivid pop art hues, dynamic color intensity"
};

function setupStyleHarmonizer() {
    el.btnApplyStyle?.addEventListener("click", () => {
        if (!el.positiveEditor) return;
        const styleKey = el.styleMovementSelect?.value || "none_photorealistic";
        const paletteKey = el.colorPaletteSelect?.value || "natural_balance";
        const strength = parseFloat(el.styleStrengthSlider?.value || "1.0");

        const pieces = [];
        if (stylePresetTokens[styleKey]) {
            const rawStyle = stylePresetTokens[styleKey];
            pieces.push(strength !== 1.0 ? `(${rawStyle}: ${strength.toFixed(2)})` : rawStyle);
        }
        if (colorPaletteTokens[paletteKey]) {
            const rawPal = colorPaletteTokens[paletteKey];
            pieces.push(strength !== 1.0 ? `(${rawPal}: ${strength.toFixed(2)})` : rawPal);
        }

        if (pieces.length === 0) return;
        const injected = pieces.join(", ");
        const cur = el.positiveEditor.value.trim();
        el.positiveEditor.value = cur ? `${cur}, ${injected}` : injected;
        el.positiveEditor.dispatchEvent(new Event("input"));
    });
}

// ── Negative Pedalboard Guards ───────────────────────────────────────────────

const pedalboardSnippets = {
    quality: "blurry, low quality, artifact, low resolution, bad hands, deformed",
    anatomy: "bad anatomy, deformed, mutated, extra limbs, missing fingers, floating limbs, disconnected limbs, poorly drawn hands",
    cgi: "3d render, cgi, cartoon, illustration, drawing, painting, artificial, doll, plastic",
    watermark: "watermark, text, signature, logo, border, copyright, banner",
    nsfw: "nsfw, nude, explicit, suggestive, uncensored"
};

function syncPedalboardActiveStates() {
    if (!el.negativeEditor) return;
    const curNeg = el.negativeEditor.value.toLowerCase();
    document.querySelectorAll(".zh-pedal-chip").forEach(chip => {
        const pedalKey = chip.getAttribute("data-pedal");
        const snippet = pedalboardSnippets[pedalKey];
        if (snippet && curNeg.includes(snippet.substring(0, 15).toLowerCase())) {
            chip.classList.add("active");
        } else {
            chip.classList.remove("active");
        }
    });
}

function setupNegativePedalboard() {
    document.querySelectorAll(".zh-pedal-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            if (!el.negativeEditor) return;
            const pedalKey = chip.getAttribute("data-pedal");
            const snippet = pedalboardSnippets[pedalKey];
            if (!snippet) return;

            let cur = el.negativeEditor.value;
            const isActive = chip.classList.contains("active");

            if (isActive) {
                // Remove snippet
                cur = cur.replace(snippet, "").replace(/,\s*,/g, ",").replace(/^,\s*|,\s*$/g, "").trim();
                chip.classList.remove("active");
            } else {
                // Add snippet
                cur = cur.trim() ? `${cur.trim()}, ${snippet}` : snippet;
                chip.classList.add("active");
            }

            el.negativeEditor.value = cur;
            el.negativeEditor.dispatchEvent(new Event("input"));
        });
    });

    el.negativeEditor?.addEventListener("input", syncPedalboardActiveStates);
}

// ── Glamour & Character Sculpting Controller ─────────────────────────────────

function setupGlamourController() {
    el.glamourToggleHeader?.addEventListener("click", () => {
        if (!el.glamourCardBody) return;
        const isHidden = el.glamourCardBody.style.display === "none";
        el.glamourCardBody.style.display = isHidden ? "block" : "none";
        if (el.glamourArrow) {
            if (isHidden) el.glamourArrow.classList.add("open");
            else el.glamourArrow.classList.remove("open");
        }
    });
}

function getGlamourPromptTokens() {
    if (!el.glamourEnable?.checked) return "";
    const tokens = [];

    // Age shift
    const age = parseFloat(el.glamourAge?.value || "0.0");
    if (age > 0.5) tokens.push(`(mature distinguished: ${(1.0 + age * 0.1).toFixed(2)})`);
    else if (age < -0.5) tokens.push(`(youthful young fresh: ${(1.0 + Math.abs(age) * 0.1).toFixed(2)})`);

    // Smile & Skin
    const smile = parseFloat(el.glamourSmile?.value || "0.0");
    if (smile > 0.1) tokens.push(`(warm captivating smile: ${(1.0 + smile * 0.5).toFixed(2)})`);

    const skin = parseFloat(el.glamourSkin?.value || "0.0");
    if (skin > 0.1) tokens.push(`(luminous radiant skin glow, flawless pores: ${(1.0 + skin * 0.4).toFixed(2)})`);

    // Ethnicity
    const ethnicity = el.glamourEthnicity?.value;
    if (ethnicity && ethnicity !== "keep_original") {
        tokens.push(`${ethnicity.replace("_", " ")} heritage facial features`);
    }

    // Hair & Eyes
    const hair = el.glamourHair?.value;
    if (hair && hair !== "keep_original") {
        tokens.push(`${hair.replace("_", " ")} hair`);
    }
    const eyes = el.glamourEyes?.value;
    if (eyes && eyes !== "keep_original") {
        tokens.push(`${eyes.replace("_", " ")} eyes`);
    }

    // Body Sculpting
    const breasts = parseFloat(el.glamourBreasts?.value || "0.0");
    if (breasts > 0.5) tokens.push(`(full voluminous bust: ${(1.0 + breasts * 0.08).toFixed(2)})`);
    else if (breasts < -0.5) tokens.push(`(slender petite chest: ${(1.0 + Math.abs(breasts) * 0.08).toFixed(2)})`);

    const waist = parseFloat(el.glamourWaist?.value || "0.0");
    if (waist > 0.5) tokens.push(`(narrow cinched waist, hourglass silhouette: ${(1.0 + waist * 0.08).toFixed(2)})`);

    const hips = parseFloat(el.glamourHips?.value || "0.0");
    if (hips > 0.5) tokens.push(`(curvy feminine hips: ${(1.0 + hips * 0.08).toFixed(2)})`);

    const muscle = parseFloat(el.glamourMuscle?.value || "0.0");
    if (muscle > 0.5) tokens.push(`(athletic toned muscles, fitness physique: ${(1.0 + muscle * 0.1).toFixed(2)})`);

    return tokens.join(", ");
}

// ── 2. Music Studio Setup ────────────────────────────────────────────────────

function updateMusicStyleSignature() {
    const genre = el.musicGenre?.value || "Pop / Dance Anthem";
    const vocals = el.musicVocalStyle?.value || "Female Belter";
    const bpm = el.musicBpm?.value || "128";
    const key = el.musicKey?.value || "A minor";
    const sig = `${genre.toLowerCase()}, ${vocals.toLowerCase()}, ${bpm} bpm, ${key}, radio hit master, 48khz stereo`;
    if (el.musicStyleTags) {
        el.musicStyleTags.value = sig;
    }
}

function setupMusicStudio() {
    el.musicGenre?.addEventListener("change", updateMusicStyleSignature);
    el.musicVocalStyle?.addEventListener("change", updateMusicStyleSignature);
    el.musicKey?.addEventListener("change", updateMusicStyleSignature);

    // Section chips
    document.querySelectorAll(".zh-section-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const tag = chip.getAttribute("data-insert")?.replace(/\\n/g, "\n");
            if (tag && el.musicLyricsEditor) {
                const start = el.musicLyricsEditor.selectionStart || el.musicLyricsEditor.value.length;
                const end = el.musicLyricsEditor.selectionEnd || el.musicLyricsEditor.value.length;
                const cur = el.musicLyricsEditor.value;
                el.musicLyricsEditor.value = cur.substring(0, start) + tag + cur.substring(end);
                el.musicLyricsEditor.focus();
                el.musicLyricsEditor.selectionStart = el.musicLyricsEditor.selectionEnd = start + tag.length;
            }
        });
    });

    // Song Templates
    const songTemplates = {
        pop_rock: `[intro]\n(Melodic synth arpeggio building tension)\n\n[verse 1]\nMidnight shadows walking down the boulevard\nHolding all the pieces of a broken heart\nNeon reflections washing through the rain\nLooking for a spark to wash away the pain\n\n[pre-chorus]\nThe rhythm's rising high, we're taking to the sky\n\n[chorus]\nWe are the electric fire in the dark\nIgniting the night with a single spark\nRun till the horizon meets the morning light\nNothing can tear us down tonight!\n\n[verse 2]\nEchoes of the past are fading in the haze\nLost inside the rhythm of a brand new phase\nEvery heartbeat pounding like a heavy drum\nWaiting for the morning sun to finally come\n\n[chorus]\nWe are the electric fire in the dark\nIgniting the night with a single spark\nRun till the horizon meets the morning light\nNothing can tear us down tonight!\n\n[bridge]\nThrough the thunder, through the pouring rain\nWe will never break again!\n\n[outro]\nInto the morning light...\n(Synth fading out smoothly)`,
        ballad: `[intro]\n(Gentle acoustic guitar fingerpicking and warm piano)\n\n[verse 1]\nDust on the windowsill, sun on the floor\nI watch the shadows dancing at the door\nRemembering the promises we made in June\nWhispered underneath a crescent moon\n\n[chorus]\nTime rolls like a river to the sea\nCarrying away what used to be\nThough seasons change and flowers fade away\nThe echo of your voice is here to stay\n\n[outro]\nSoftly now, until the morning comes\n(Piano chord fades)`
    };

    el.musicSongTemplate?.addEventListener("change", (e) => {
        const t = songTemplates[e.target.value];
        if (t && el.musicLyricsEditor) {
            el.musicLyricsEditor.value = t;
        }
    });

    // AI Songwriter (Ollama)
    el.btnAiSongwriter?.addEventListener("click", async () => {
        const title = el.musicTitle?.value.trim() || "Hit Single";
        const genre = el.musicGenre?.value || "Pop / Dance Anthem";
        const style = el.musicStyleTags?.value || "Radio hit";

        const origText = el.btnAiSongwriter.textContent;
        el.btnAiSongwriter.textContent = "✨ Writing Song...";
        el.btnAiSongwriter.disabled = true;

        try {
            const prompt = `Write complete radio hit song lyrics for a song titled "${title}". 
Genre & Vibe: ${genre}, ${style}. 
Include explicit sections: [intro], [verse 1], [pre-chorus], [chorus], [verse 2], [bridge], [chorus], and [outro]. 
Ensure catchy rhythmic phrasing, emotional resonance, and standard Suno/Udio musical structure tags.`;

            const resp = await fetch("/zombiehaus/enhance_prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: prompt, style: "prose" })
            });
            const data = await resp.json();
            if (data.success && data.enhanced && el.musicLyricsEditor) {
                el.musicLyricsEditor.value = data.enhanced;
            }
        } catch (err) {
            console.error("AI Songwriter error:", err);
        } finally {
            el.btnAiSongwriter.textContent = origText;
            el.btnAiSongwriter.disabled = false;
        }
    });
}

// ── 3. Video Studio Setup ────────────────────────────────────────────────────

function setupVideoStudio() {
    const camTrajectories = {
        static: "static cinematic frame, subtle natural parallax, 24fps filmic smoothness",
        dolly_in: "smooth slow camera dolly-in moving closer to the subject, depth of field blur background",
        pan_left: "fluid cinematic pan from right to left tracking the subject across the environment",
        pan_right: "fluid cinematic pan from left to right capturing rich background details",
        orbit: "360-degree seamless orbit rotation around the main subject showcasing complete spatial depth"
    };

    document.querySelectorAll("[data-video-cam]").forEach(btn => {
        btn.addEventListener("click", () => {
            const cType = btn.getAttribute("data-video-cam");
            const snippet = camTrajectories[cType];
            if (snippet && el.videoPromptEditor) {
                const cur = el.videoPromptEditor.value.trim();
                el.videoPromptEditor.value = cur ? `${cur}, ${snippet}` : snippet;
                el.videoPromptEditor.focus();
            }
        });
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

// ── Image Edit (i2i / Wardrobe) Studio Setup ─────────────────────────────────

let i2iCurrentTask = "wardrobe";
let i2iUploadedFilename = null;

function setupImageEditStudio() {
    // Mode tabs: wardrobe, realism, style, refine
    const tabs = document.querySelectorAll(".zh-i2i-mode-pills [data-i2i-task]");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const task = tab.getAttribute("data-i2i-task");
            setI2iTask(task);
        });
    });

    // File upload / dropzone
    if (el.i2iDropzone && el.i2iFileInput) {
        el.i2iDropzone.addEventListener("click", (e) => {
            if (e.target.closest("#btn-i2i-clear")) return;
            el.i2iFileInput.click();
        });

        el.i2iFileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                handleI2iFileUpload(e.target.files[0]);
            }
        });

        el.i2iDropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            el.i2iDropzone.classList.add("drag-over");
        });

        ["dragleave", "dragend"].forEach(evt => {
            el.i2iDropzone.addEventListener(evt, () => el.i2iDropzone.classList.remove("drag-over"));
        });

        el.i2iDropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            el.i2iDropzone.classList.remove("drag-over");
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleI2iFileUpload(e.dataTransfer.files[0]);
            }
        });
    }

    el.btnI2iClear?.addEventListener("click", (e) => {
        e.stopPropagation();
        clearI2iImage();
    });

    // Mask Grow & Blur sync
    if (el.i2iGrowMask && el.valI2iGrowMask) {
        el.i2iGrowMask.addEventListener("input", () => {
            el.valI2iGrowMask.value = el.i2iGrowMask.value;
        });
        el.valI2iGrowMask.addEventListener("input", () => {
            el.i2iGrowMask.value = el.valI2iGrowMask.value;
        });
    }
    if (el.i2iBlurMask && el.valI2iBlurMask) {
        el.i2iBlurMask.addEventListener("input", () => {
            el.valI2iBlurMask.value = el.i2iBlurMask.value;
        });
        el.valI2iBlurMask.addEventListener("input", () => {
            el.i2iBlurMask.value = el.valI2iBlurMask.value;
        });
    }

    // Fidelity slider sync & presets
    if (el.i2iFidelitySlider && el.valI2iFidelity) {
        const updateFidelitySummary = (val) => {
            const v = parseFloat(val);
            if (el.i2iFidelitySummary) {
                if (v >= 85) {
                    el.i2iFidelitySummary.textContent = `${v}% Fidelity: High-precision polish; preserves original structure while fixing artifacts and sharpening micro-details.`;
                } else if (v >= 65) {
                    el.i2iFidelitySummary.textContent = `${v}% Fidelity: Preserves subject pose and composition while re-rendering photorealistic textures, skin pores, and lifelike lighting.`;
                } else if (v >= 40) {
                    el.i2iFidelitySummary.textContent = `${v}% Fidelity: Balanced re-imagining; significant restyle or artistic transformation while keeping overall scene layout.`;
                } else {
                    el.i2iFidelitySummary.textContent = `${v}% Fidelity: Creative divergence; loose structural reference with high artistic freedom.`;
                }
            }
        };

        el.i2iFidelitySlider.addEventListener("input", () => {
            el.valI2iFidelity.value = el.i2iFidelitySlider.value;
            updateFidelitySummary(el.i2iFidelitySlider.value);
        });
        el.valI2iFidelity.addEventListener("input", () => {
            el.i2iFidelitySlider.value = el.valI2iFidelity.value;
            updateFidelitySummary(el.valI2iFidelity.value);
        });

        document.querySelectorAll(".zh-fidelity-quick-rack [data-fidelity]").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".zh-fidelity-quick-rack [data-fidelity]").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const val = btn.getAttribute("data-fidelity");
                el.i2iFidelitySlider.value = val;
                el.valI2iFidelity.value = val;
                updateFidelitySummary(val);
            });
        });
    }

    // Dynamic suggestions setup
    bindI2iSuggestionTags();

    // Negative guard chips
    document.querySelectorAll(".zh-pedal-chip[data-i2i-neg]").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.classList.toggle("active");
            syncI2iNegativeGuards();
        });
    });

    // Default wardrobe prompt
    if (el.i2iPositiveEditor && !el.i2iPositiveEditor.value) {
        el.i2iPositiveEditor.value = "haute couture silk evening gown, elegant, tailored, luxurious fabric";
    }
}

async function handleI2iFileUpload(file) {
    if (!file || !file.type.startsWith("image/")) {
        alert("Please select a valid image file (PNG, JPG, WEBP).");
        return;
    }

    // Local thumbnail preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
        if (el.i2iPreviewImg) {
            el.i2iPreviewImg.src = e.target.result;
            el.i2iPreviewImg.onload = () => {
                if (el.i2iInfoBadge) {
                    el.i2iInfoBadge.textContent = `${el.i2iPreviewImg.naturalWidth} × ${el.i2iPreviewImg.naturalHeight}`;
                }
            };
        }
        if (el.i2iDropPlaceholder) el.i2iDropPlaceholder.style.display = "none";
        if (el.i2iPreviewContainer) el.i2iPreviewContainer.style.display = "flex";
    };
    reader.readAsDataURL(file);

    // Upload to ComfyUI backend
    const formData = new FormData();
    formData.append("image", file);
    formData.append("overwrite", "true");

    try {
        if (el.i2iInfoBadge) el.i2iInfoBadge.textContent = "Uploading...";
        const res = await fetch("/upload/image", {
            method: "POST",
            body: formData
        });
        if (res.ok) {
            const data = await res.json();
            i2iUploadedFilename = data.name;
            if (el.i2iInfoBadge && el.i2iPreviewImg) {
                el.i2iInfoBadge.textContent = `${el.i2iPreviewImg.naturalWidth || 1024} × ${el.i2iPreviewImg.naturalHeight || 1024} • ${data.name}`;
            }
        } else {
            console.error("Failed to upload image:", res.statusText);
            if (el.i2iInfoBadge) el.i2iInfoBadge.textContent = "Upload failed";
        }
    } catch (err) {
        console.error("Error uploading image:", err);
        if (el.i2iInfoBadge) el.i2iInfoBadge.textContent = "Upload error";
    }
}

function clearI2iImage() {
    i2iUploadedFilename = null;
    if (el.i2iFileInput) el.i2iFileInput.value = "";
    if (el.i2iPreviewImg) el.i2iPreviewImg.src = "";
    if (el.i2iPreviewContainer) el.i2iPreviewContainer.style.display = "none";
    if (el.i2iDropPlaceholder) el.i2iDropPlaceholder.style.display = "flex";
}

function setI2iTask(task) {
    i2iCurrentTask = task;
    if (task === "wardrobe") {
        if (el.i2iPaneWardrobe) el.i2iPaneWardrobe.style.display = "block";
        if (el.i2iPaneGeneral) el.i2iPaneGeneral.style.display = "none";
        if (currentMode === "i2i" && el.genBtnLabel) el.genBtnLabel.textContent = "CHANGE CLOTHES";
        updateI2iSuggestions([
            { tag: "haute couture silk evening gown, elegant, tailored, luxurious fabric", label: "Silk Gown" },
            { tag: "casual denim jacket over white cotton t-shirt and blue jeans", label: "Denim & Tee" },
            { tag: "sharp black tailored tuxedo with satin lapels, white dress shirt", label: "Black Tuxedo" },
            { tag: "leather biker jacket, silver zippers, rugged rebel chic", label: "Biker Leather" },
            { tag: "bohemian summer floral sundress, light breezy fabric", label: "Floral Dress" }
        ]);
        if (!el.i2iPositiveEditor?.value) {
            el.i2iPositiveEditor.value = "haute couture silk evening gown, elegant, tailored, luxurious fabric";
        }
    } else if (task === "realism") {
        if (el.i2iPaneWardrobe) el.i2iPaneWardrobe.style.display = "none";
        if (el.i2iPaneGeneral) el.i2iPaneGeneral.style.display = "block";
        if (currentMode === "i2i" && el.genBtnLabel) el.genBtnLabel.textContent = "MAKE REALISTIC";
        if (el.i2iFidelitySlider) {
            el.i2iFidelitySlider.value = 75;
            if (el.valI2iFidelity) el.valI2iFidelity.value = 75;
            if (el.i2iFidelitySummary) el.i2iFidelitySummary.textContent = "75% Fidelity: Preserves subject pose and composition while re-rendering photorealistic textures, skin pores, and lifelike lighting.";
        }
        updateI2iSuggestions([
            { tag: "photorealistic 8k raw photo, highly detailed skin pores, lifelike natural cinematic lighting, masterpiece, sharp focus", label: "Photoreal 8K" },
            { tag: "hyperdetailed cinematic portrait, rembrandt lighting, shot on 35mm lens, f/1.8, fine film grain", label: "35mm Portrait" },
            { tag: "candid street photograph, natural ambient sunlight, authentic skin texture", label: "Candid Sunlight" },
            { tag: "studio fashion editorial portrait, crisp focus, soft diffused beauty dish lighting", label: "Studio Editorial" }
        ]);
        if (!el.i2iPositiveEditor?.value) {
            el.i2iPositiveEditor.value = "photorealistic 8k raw photo, highly detailed skin pores, lifelike natural cinematic lighting, masterpiece, sharp focus";
        }
    } else if (task === "style") {
        if (el.i2iPaneWardrobe) el.i2iPaneWardrobe.style.display = "none";
        if (el.i2iPaneGeneral) el.i2iPaneGeneral.style.display = "block";
        if (currentMode === "i2i" && el.genBtnLabel) el.genBtnLabel.textContent = "TRANSFER STYLE";
        if (el.i2iFidelitySlider) {
            el.i2iFidelitySlider.value = 50;
            if (el.valI2iFidelity) el.valI2iFidelity.value = 50;
            if (el.i2iFidelitySummary) el.i2iFidelitySummary.textContent = "50% Fidelity: Balanced re-imagining; significant restyle or artistic transformation while keeping overall scene layout.";
        }
        updateI2iSuggestions([
            { tag: "cyberpunk neon synthwave style, glowing volumetric light, holographic reflections, futuristic", label: "Cyberpunk" },
            { tag: "dark fantasy oil painting, heavy brush strokes, dramatic chiaroscuro, Frank Frazetta aesthetic", label: "Oil Painting" },
            { tag: "90s retro anime aesthetic, cel shaded, vibrant hand-drawn colors, nostalgic film grain", label: "Retro Anime" },
            { tag: "watercolor and ink wash painting, fluid splashes, delicate paper texture, sumi-e elegance", label: "Watercolor" }
        ]);
        if (!el.i2iPositiveEditor?.value) {
            el.i2iPositiveEditor.value = "cyberpunk neon synthwave style, glowing volumetric light, holographic reflections, futuristic";
        }
    } else if (task === "refine") {
        if (el.i2iPaneWardrobe) el.i2iPaneWardrobe.style.display = "none";
        if (el.i2iPaneGeneral) el.i2iPaneGeneral.style.display = "block";
        if (currentMode === "i2i" && el.genBtnLabel) el.genBtnLabel.textContent = "REFINE IMAGE";
        if (el.i2iFidelitySlider) {
            el.i2iFidelitySlider.value = 88;
            if (el.valI2iFidelity) el.valI2iFidelity.value = 88;
            if (el.i2iFidelitySummary) el.i2iFidelitySummary.textContent = "88% Fidelity: High-precision polish; preserves original structure while fixing artifacts and sharpening micro-details.";
        }
        updateI2iSuggestions([
            { tag: "ultra-sharp high definition, enhanced micro-textures, crystal clear clarity, cleaned edges", label: "Ultra-Sharp" },
            { tag: "color grade correction, deep rich contrast, clean shadows, cinematic balance", label: "Color Grade" },
            { tag: "denoise artifacts, smooth transitions, crisp specular highlights", label: "Clean Specular" }
        ]);
        if (!el.i2iPositiveEditor?.value) {
            el.i2iPositiveEditor.value = "ultra-sharp high definition, enhanced micro-textures, crystal clear clarity, cleaned edges";
        }
    }
}

function updateI2iSuggestions(items) {
    if (!el.i2iQuickTags) return;
    el.i2iQuickTags.innerHTML = "";
    items.forEach(item => {
        const btn = document.createElement("button");
        btn.className = "zh-tag-chip";
        btn.setAttribute("data-i2i-tag", item.tag);
        btn.textContent = item.label;
        btn.addEventListener("click", () => {
            if (el.i2iPositiveEditor) {
                const cur = el.i2iPositiveEditor.value.trim();
                el.i2iPositiveEditor.value = cur ? `${cur}, ${item.tag}` : item.tag;
            }
        });
        el.i2iQuickTags.appendChild(btn);
    });
}

function bindI2iSuggestionTags() {
    document.querySelectorAll("#i2i-quick-tags [data-i2i-tag]").forEach(btn => {
        btn.addEventListener("click", () => {
            const tag = btn.getAttribute("data-i2i-tag");
            if (el.i2iPositiveEditor && tag) {
                const cur = el.i2iPositiveEditor.value.trim();
                el.i2iPositiveEditor.value = cur ? `${cur}, ${tag}` : tag;
            }
        });
    });
}

function syncI2iNegativeGuards() {
    const guards = {
        unreal: "cartoon, 3d render, cgi, illustration, anime, sketch, drawing, painting, bad digital art",
        badclothes: "deformed clothing, distorted seams, ill-fitting clothes, asymmetrical collar, mismatched patterns",
        quality: "blurry, low quality, jpeg artifacts, lowres, worst quality, pixelated, washed out"
    };
    const activeTokens = [];
    document.querySelectorAll(".zh-pedal-chip[data-i2i-neg].active").forEach(btn => {
        const type = btn.getAttribute("data-i2i-neg");
        if (guards[type]) activeTokens.push(guards[type]);
    });
    if (el.i2iNegativeEditor) {
        el.i2iNegativeEditor.value = activeTokens.join(", ");
    }
}

// ── 4. Models & Profiles API ─────────────────────────────────────────────────

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
        populateSelect(el.upscaleModel, data.upscalers, "None");
        populateSelect(el.sampler, data.samplers, "euler_ancestral");
        populateSelect(el.scheduler, data.schedulers, "simple");

        if (data.loras) {
            availableLoraList = data.loras;
            if (el.loraStackContainer && el.loraStackContainer.children.length === 0) {
                addLoraItem("None", 1.0);
            }
        }
        // Dynamically discover all detector models, samplers, and schedulers directly from ComfyUI
        try {
            const slotResp = await fetch("/object_info/ZombiehausDetailerSlot");
            if (slotResp.ok) {
                const slotData = await slotResp.json();
                const nodeInfo = slotData?.ZombiehausDetailerSlot?.input?.required;
                if (nodeInfo?.model?.[0] && Array.isArray(nodeInfo.model[0])) {
                    const scanned = nodeInfo.model[0].filter(m => m && m !== "disabled" && m !== "(no models found)");
                    if (scanned.length > 0) {
                        data.detectors = scanned;
                    }
                }
                if (nodeInfo?.sampler?.[0] && Array.isArray(nodeInfo.sampler[0])) {
                    availableSamplers = nodeInfo.sampler[0];
                }
                if (nodeInfo?.scheduler?.[0] && Array.isArray(nodeInfo.scheduler[0])) {
                    availableSchedulers = nodeInfo.scheduler[0];
                }
            }
        } catch (e) {
            console.warn("Could not query /object_info/ZombiehausDetailerSlot:", e);
        }

        if (data.detectors && data.detectors.length > 0) {
            availableDetectorList = data.detectors;
            refreshAllDetailerDropdowns();
        }
        if (el.detailerStackContainer && el.detailerStackContainer.children.length === 0) {
            addDetailerItem({ model: "face_yolov8m.pt", denoise: 0.45, steps: 20 });
        }

        if (el.videoModel) {
            populateSelect(el.videoModel, data.unets, "None");
        }
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

    if (Array.isArray(data.loras) && el.loraStackContainer) {
        el.loraStackContainer.innerHTML = "";
        for (const l of data.loras) {
            addLoraItem(l.name, l.strength !== undefined ? l.strength : 1.0);
        }
        if (data.loras.length === 0) addLoraItem("None", 1.0);
    }
    if (data.detailer_confidence !== undefined) {
        const confNum = document.getElementById("detailer-global-confidence");
        const confSlider = document.getElementById("detailer-global-confidence-slider");
        if (confNum) confNum.value = Number(data.detailer_confidence).toFixed(2);
        if (confSlider) confSlider.value = data.detailer_confidence;
    }
    if (Array.isArray(data.detailers) && el.detailerStackContainer) {
        el.detailerStackContainer.innerHTML = "";
        for (const d of data.detailers) {
            addDetailerItem(d);
        }
        if (data.detailers.length === 0) addDetailerItem({ model: "face_yolov8m.pt", denoise: 0.45, steps: 20 });
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
        scheduler: el.scheduler?.value || "simple",
        loras: getLoraStackData(),
        detailers: getDetailerStackData(),
        detailer_confidence: parseFloat(document.getElementById("detailer-global-confidence")?.value || "0.3")
    };
}

// ── 5. WebSocket & Realtime Events ───────────────────────────────────────────

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
        if (el.progressStep) el.progressStep.textContent = `Processing step ${val} / ${max}`;
        if (el.progressPercent) el.progressPercent.textContent = `${pct}%`;
    } else if (msg.type === "executing") {
        if (msg.data.node === null) {
            setGeneratingState(false);
            if (el.progressWrap) el.progressWrap.style.display = "none";
        } else {
            setGeneratingState(true);
        }
    } else if (msg.type === "executed") {
        if (msg.data.output) {
            // Check for images
            if (msg.data.output.images && msg.data.output.images.length > 0) {
                for (const img of msg.data.output.images) {
                    const imgUrl = `/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${encodeURIComponent(img.type || "output")}`;
                    displayGeneratedImage(imgUrl);
                }
            }
            // Check for video/gifs
            if (msg.data.output.videos && msg.data.output.videos.length > 0) {
                const vid = msg.data.output.videos[0];
                const vidUrl = `/view?filename=${encodeURIComponent(vid.filename)}&subfolder=${encodeURIComponent(vid.subfolder || "")}&type=${encodeURIComponent(vid.type || "output")}`;
                displayGeneratedVideo(vidUrl);
            }
            // Check for audio
            if (msg.data.output.audio && msg.data.output.audio.length > 0) {
                const aud = msg.data.output.audio[0];
                const audUrl = `/view?filename=${encodeURIComponent(aud.filename)}&subfolder=${encodeURIComponent(aud.subfolder || "")}&type=${encodeURIComponent(aud.type || "output")}`;
                displayGeneratedAudio(audUrl, el.musicTitle?.value || "Hit Single");
            }
        }
    } else if (msg.type === "execution_error") {
        setGeneratingState(false);
        if (el.progressWrap) el.progressWrap.style.display = "none";
        alert("Generation Error: " + (msg.data.exception_message || "Unknown error"));
    }
}

function hideAllPreviewOutputs() {
    if (el.previewEmpty) el.previewEmpty.style.display = "none";
    if (el.previewImg) el.previewImg.style.display = "none";
    if (el.previewVideo) {
        el.previewVideo.style.display = "none";
        el.previewVideo.pause();
    }
    if (el.previewAudioContainer) {
        el.previewAudioContainer.style.display = "none";
        if (el.previewAudio) el.previewAudio.pause();
    }
}

function displayGeneratedImage(url) {
    hideAllPreviewOutputs();
    if (el.previewImg) {
        el.previewImg.src = url;
        el.previewImg.style.display = "block";
    }

    if (el.historyContainer) {
        const thumb = document.createElement("img");
        thumb.className = "zh-history-thumb";
        thumb.src = url;
        thumb.title = "Click to inspect";
        thumb.addEventListener("click", () => displayGeneratedImage(url));
        el.historyContainer.prepend(thumb);
    }
}

function displayGeneratedVideo(url) {
    hideAllPreviewOutputs();
    if (el.previewVideo) {
        el.previewVideo.src = url;
        el.previewVideo.style.display = "block";
        el.previewVideo.play().catch(() => {});
    }
}

function displayGeneratedAudio(url, title = "Hit Single") {
    hideAllPreviewOutputs();
    if (el.previewAudioContainer && el.previewAudio) {
        el.previewAudioContainer.style.display = "flex";
        if (el.audioPlayerTitle) el.audioPlayerTitle.textContent = title;
        el.previewAudio.src = url;
        el.previewAudio.play().catch(() => {});
        drawWaveformAnimation();
    }
}

function drawWaveformAnimation() {
    const canvas = el.audioWaveformCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.parentElement.clientWidth || 300;
    canvas.height = 60;

    let offset = 0;
    function renderWave() {
        if (el.previewAudio && !el.previewAudio.paused) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#38bdf8";

            const bars = Math.floor(canvas.width / 5);
            for (let i = 0; i < bars; i++) {
                const h = Math.abs(Math.sin((i + offset) * 0.15)) * (canvas.height * 0.7) + 4;
                const y = (canvas.height - h) / 2;
                ctx.fillRect(i * 5, y, 3, h);
            }
            offset += 0.8;
            animFrameId = requestAnimationFrame(renderWave);
        }
    }
    el.previewAudio.onplay = () => renderWave();
    el.previewAudio.onpause = () => cancelAnimationFrame(animFrameId);
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

// ── 6. Prompt Construction & Execution Across All 4 Modes ────────────────────

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

    if (currentMode === "screenplay" || currentMode === "prompt" || currentMode === "i2i") {
        const activeLoras = getLoraStackData();
        const loraStackJson = JSON.stringify(activeLoras);

        promptGraph["1"] = {
            "class_type": "ZombiehausModelLoader",
            "inputs": {
                "unet_name": el.unet?.value || "None",
                "weight_dtype": el.dtype?.value || "default",
                "use_dual_clip_loader": false,
                "dual_clip_type": "sdxl",
                "clip1_name": el.clipName?.value || "disabled",
                "clip1_type": el.clipType?.value || "flux2",
                "clip1_device": "auto",
                "clip2_name": "disabled",
                "clip2_type": "stable_diffusion",
                "clip2_device": "auto",
                "clip3_name": "disabled",
                "clip3_type": "stable_diffusion",
                "clip3_device": "auto",
                "clip4_name": "disabled",
                "clip4_type": "stable_diffusion",
                "clip4_device": "auto",
                "clip_skip": 0,
                "checkpoint_name": el.checkpoint?.value || "None",
                "use_checkpoint_clip": false,
                "vae_name": el.vae?.value || "None",
                "t5_min_length": 256,
                "t5_min_padding": 0
            }
        };

        promptGraph["2"] = {
            "class_type": "ZombiehausLoraLoader",
            "inputs": {
                "pipe": ["1", 7],
                "lora_stack": loraStackJson,
                "base_model_name": "None",
                "enable_dynamic_lora": true
            }
        };

        let currentPipe;

        if (currentMode === "i2i") {
            if (!i2iUploadedFilename) {
                alert("Please upload or drop a source image before generating in Image Edit mode.");
                setGeneratingState(false);
                if (el.progressWrap) el.progressWrap.style.display = "none";
                return;
            }

            promptGraph["source_image"] = {
                "class_type": "ZombiehausLoadImage",
                "inputs": {
                    "image": i2iUploadedFilename,
                    "scaling": "None (Original)",
                    "target_width": parseInt(el.width?.value || "1024", 10),
                    "target_height": parseInt(el.height?.value || "1024", 10),
                    "resampling": "lanczos"
                }
            };

            let posText = el.i2iPositiveEditor?.value || "";
            let negText = el.i2iNegativeEditor?.value || "";
            const glamourTokens = getGlamourPromptTokens();
            if (glamourTokens) {
                posText = posText.trim() ? `${posText.trim()}, ${glamourTokens}` : glamourTokens;
            }

            promptGraph["4"] = {
                "class_type": "ZombiehausTextEditor",
                "inputs": {
                    "pipe": ["2", 5],
                    "positive": posText,
                    "negative": negText,
                    "saved_prompt": "--select prompt--",
                    "weight_mode": "Translate for Chroma / Flux (Linguistic Emphasis)"
                }
            };

            if (i2iCurrentTask === "wardrobe") {
                promptGraph["5_wardrobe"] = {
                    "class_type": "ZombiehausWardrobeInpaint",
                    "inputs": {
                        "image": ["source_image", 0],
                        "preset": el.i2iGarmentPreset?.value || "all_garments",
                        "grow_mask": parseInt(el.i2iGrowMask?.value || "16", 10),
                        "blur_mask": parseInt(el.i2iBlurMask?.value || "8", 10),
                        "do_inpaint": true,
                        "seed": actualSeed,
                        "steps": parseInt(el.steps?.value || "25", 10),
                        "cfg": parseFloat(el.cfg?.value || "7.0"),
                        "denoise": 1.0,
                        "sampler": el.sampler?.value || "euler",
                        "scheduler": el.scheduler?.value || "normal",
                        "pipe": ["4", 5]
                    }
                };
                currentPipe = ["5_wardrobe", 2];
            } else {
                const fidelityVal = parseFloat(el.i2iFidelitySlider?.value || "75");
                promptGraph["5_i2i_encode"] = {
                    "class_type": "ZombiehausImg2ImgVAEEncode",
                    "inputs": {
                        "image_upload": i2iUploadedFilename,
                        "image": ["source_image", 0],
                        "pipe": ["4", 5],
                        "fidelity": fidelityVal,
                        "preset": "Custom (Use Slider)",
                        "target_model": "Chroma 1-HD",
                        "auto_resize": true,
                        "target_width": parseInt(el.width?.value || "1024", 10),
                        "target_height": parseInt(el.height?.value || "1024", 10),
                        "alignment": "Auto (16px for Flux/Chroma, 8px for SD)",
                        "resize_mode": "Crop to Multiple",
                        "curve": "Smooth S-Curve",
                        "base_steps": parseInt(el.steps?.value || "30", 10),
                        "step_compensation": true,
                        "min_denoise": 0.20,
                        "max_denoise": 0.95
                    }
                };
                promptGraph["5_i2i_sampler"] = {
                    "class_type": "ZombiehausKSampler",
                    "inputs": {
                        "pipe": ["4", 5],
                        "latent_image": ["5_i2i_encode", 0],
                        "seed": actualSeed,
                        "steps": ["5_i2i_encode", 2],
                        "cfg": parseFloat(el.cfg?.value || "3.5"),
                        "sampler_name": el.sampler?.value || "euler_ancestral",
                        "scheduler": el.scheduler?.value || "simple",
                        "denoise": ["5_i2i_encode", 1],
                        "use_cudnn": true
                    }
                };
                currentPipe = ["5_i2i_sampler", 9];
            }
        } else {
            const is16ch = el.architecture?.value === "chroma" || el.architecture?.value === "flux";
            promptGraph["3"] = {
                "class_type": "ZombiehausLatentPreset",
                "inputs": {
                    "pipe": ["2", 5],
                    "resolution": "Manual",
                    "width": parseInt(el.width?.value || "1024", 10),
                    "height": parseInt(el.height?.value || "1024", 10),
                    "batch_size": parseInt(el.batch?.value || "1", 10),
                    "latent_channels": is16ch ? 16 : 4,
                    "downscale": 8,
                    "architecture": is16ch ? "Chroma / Flux (16ch)" : "SDXL / Pony (4ch)"
                }
            };

            let posText = el.positiveEditor?.value || "";
            let negText = el.muteNegativeCheckbox?.checked ? "" : (el.negativeEditor?.value || "");

            // Inject glamour sculpting if enabled
            const glamourTokens = getGlamourPromptTokens();
            if (glamourTokens) {
                posText = posText.trim() ? `${posText.trim()}, ${glamourTokens}` : glamourTokens;
            }

            let samplerPipe = ["4", 5];

            if (currentMode === "screenplay") {
                let scriptText = el.scriptEditor?.value || "";
                if (glamourTokens) {
                    scriptText = `${scriptText.trim()}\n\n// Glamour & Anatomy Directives\n${glamourTokens}`;
                }
                promptGraph["4_text"] = {
                    "class_type": "ZombiehausTextEditor",
                    "inputs": {
                        "pipe": ["3", 1],
                        "positive": scriptText,
                        "negative": negText,
                        "saved_prompt": "--select prompt--",
                        "weight_mode": "Translate for Chroma / Flux (Linguistic Emphasis)"
                    }
                };
                promptGraph["4"] = {
                    "class_type": "ZombiehausSceneScriptDirector",
                    "inputs": {
                        "pipe": ["4_text", 5],
                        "script": ["4_text", 0],
                        "default_lora_strength": 0.85,
                        "default_overlap_blend": 0.25
                    }
                };
                samplerPipe = ["4", 0];
            } else {
                promptGraph["4"] = {
                    "class_type": "ZombiehausTextEditor",
                    "inputs": {
                        "pipe": ["3", 1],
                        "positive": posText,
                        "negative": negText,
                        "saved_prompt": "--select prompt--",
                        "weight_mode": "Translate for Chroma / Flux (Linguistic Emphasis)"
                    }
                };
                samplerPipe = ["4", 5];
            }

            promptGraph["5"] = {
                "class_type": "ZombiehausKSampler",
                "inputs": {
                    "pipe": samplerPipe,
                    "latent_image": ["3", 0],
                    "seed": actualSeed,
                    "steps": parseInt(el.steps?.value || "30", 10),
                    "cfg": parseFloat(el.cfg?.value || "3.5"),
                    "sampler_name": el.sampler?.value || "euler_ancestral",
                    "scheduler": el.scheduler?.value || "simple",
                    "denoise": 1.0,
                    "use_cudnn": true
                }
            };

            // ZombiehausKSampler outputs: 0=LATENT, 1=IMAGE, 2=AUDIO, 3=INT, 4=MODEL, 5=CLIP, 6=VAE, 7=POS, 8=NEG, 9=PIPE
            currentPipe = ["5", 9];
        }

        // 1. Hi-Res Fix Stage
        if (el.enableHires?.checked) {
            const hiresScale = parseFloat(el.hiresScale?.value || "1.5");
            const hiresDenoise = parseFloat(el.hiresDenoise?.value || "0.35");
            promptGraph["6_hires"] = {
                "class_type": "ZombiehausHiresFix",
                "inputs": {
                    "pipe": currentPipe,
                    "scale_by": hiresScale,
                    "upscale_method": "bicubic",
                    "denoise": hiresDenoise,
                    "steps": 20,
                    "cfg": parseFloat(el.cfg?.value || "5.0"),
                    "sampler_name": el.sampler?.value || "euler",
                    "scheduler": el.scheduler?.value || "karras",
                    "seed": actualSeed,
                    "restore_face": false,
                    "dewax_texture": false
                }
            };
            currentPipe = ["6_hires", 1];
        }

        // 2. Multi-Pass Detailer Refiners
        if (el.enableDetailer?.checked) {
            const detailers = getDetailerStackData().filter(d => d.enabled);
            const globalConfidence = parseFloat(document.getElementById("detailer-global-confidence")?.value || "0.3");
            if (detailers.length > 0) {
                const detailerInputs = {
                    "pipe": currentPipe,
                    "confidence": isNaN(globalConfidence) ? 0.3 : globalConfidence
                };
                detailers.forEach((det, idx) => {
                    const slotKey = `slot_${idx + 1}`;
                    const slotId = `slot_node_${idx + 1}`;
                    const cleanModel = det.model.replace(/^(bbox|segm)\//, "");
                    promptGraph[slotId] = {
                        "class_type": "ZombiehausDetailerSlot",
                        "inputs": {
                            "model": cleanModel,
                            "steps": det.steps,
                            "cfg": det.cfg,
                            "denoise": det.denoise,
                            "padding": det.padding,
                            "mask_blur": det.mask_blur,
                            "blend_feather": det.blend_feather,
                            "context_pad": det.context_pad,
                            "sampler": det.sampler || (el.sampler?.value || "euler_ancestral"),
                            "scheduler": det.scheduler || (el.scheduler?.value || "karras"),
                            "enabled": true,
                            "pipe": currentPipe
                        }
                    };
                    detailerInputs[slotKey] = [slotId, 0];
                });

                promptGraph["7_detailer"] = {
                    "class_type": "ZombiehausAllInOneDetailer",
                    "inputs": detailerInputs
                };
                currentPipe = ["7_detailer", 1];
            }
        }

        // 3. De-Wax & Texture Restore Stage
        if (el.enableDewax?.checked) {
            const grain = parseFloat(el.dewaxGrain?.value || "0.12");
            promptGraph["8_dewax"] = {
                "class_type": "ZombiehausDeWaxTextureRestore",
                "inputs": {
                    "pipe": currentPipe,
                    "micro_texture": 0.30,
                    "grain_intensity": grain,
                    "blur_radius": 3
                }
            };
            currentPipe = ["8_dewax", 1];
        }

        // 4. Neural Model Upscaler Stage
        if (el.enableUpscale?.checked && el.upscaleModel?.value && el.upscaleModel.value !== "None") {
            promptGraph["9_upscale"] = {
                "class_type": "ZombiehausModelUpscale",
                "inputs": {
                    "pipe": currentPipe,
                    "upscale_model_name": el.upscaleModel.value,
                    "upscale_mode": "target",
                    "target_size": 2560,
                    "downscale_enabled": true,
                    "scale_down_by": 0.5,
                    "rescale_method": "lanczos",
                    "tile_size": 512,
                    "tile_overlap": 32
                }
            };
            currentPipe = ["9_upscale", 1];
        }

        promptGraph["final_save"] = {
            "class_type": "ZombiehausSaveImage",
            "inputs": {
                "pipe": currentPipe,
                "filename_prefix": currentMode === "screenplay" ? "Zombiehaus_Director" : "Zombiehaus_Studio",
                "format": "png",
                "quality": 95,
                "embed_metadata": "enabled",
                "clean_vram": false
            }
        };
    } else if (currentMode === "video") {
        const sec = parseInt(el.videoDuration?.value || "5", 10);
        const fps = parseInt(el.videoFps?.value || "30", 10);
        const totalFrames = sec * fps;

        promptGraph = {
            "10": {
                "class_type": "ZombiehausVideoLatent",
                "inputs": {
                    "width": 1280,
                    "height": 720,
                    "length": totalFrames,
                    "batch_size": 1
                }
            },
            "11": {
                "class_type": "ZombiehausSaveVideo",
                "inputs": {
                    "fps": fps,
                    "format": el.videoCodec?.value || "h264",
                    "crf": 18,
                    "filename_prefix": "Zombiehaus_Video",
                    "images": ["10", 0]
                }
            }
        };
    } else if (currentMode === "music") {
        const songDur = parseFloat(el.musicDuration?.value || "150");
        const songBpm = parseInt(el.musicBpm?.value || "128", 10);
        const engineModel = el.musicEngineModel?.value || "diffrhythm";

        if (engineModel === "mmaudio") {
            // MMAudio High-Fidelity 44.1kHz Stereo Synthesis
            promptGraph = {
                "30": {
                    "class_type": "MMAudioModelLoader",
                    "inputs": {
                        "mmaudio_model": "mmaudio_large_44k",
                        "base_precision": "fp16"
                    }
                },
                "31": {
                    "class_type": "MMAudioFeatureUtilsLoader",
                    "inputs": {}
                },
                "32": {
                    "class_type": "MMAudioSampler",
                    "inputs": {
                        "mmaudio_model": ["30", 0],
                        "feature_utils": ["31", 0],
                        "duration": Math.min(songDur, 30.0),
                        "steps": 25,
                        "cfg": 4.5,
                        "seed": actualSeed,
                        "prompt": `${el.musicTitle?.value || "Music"}: ${el.musicStyleTags?.value || "pop dance"}. ${el.musicLyricsEditor?.value?.substring(0, 300) || ""}`,
                        "negative_prompt": "distorted vocals, harsh clipping, out of tune, low bit depth, noise",
                        "mask_away_clip": false,
                        "force_offload": true
                    }
                },
                "33": {
                    "class_type": "ZombiehausSaveAudio",
                    "inputs": {
                        "filename_prefix": "Zombiehaus_MMAudio",
                        "format": el.musicExportFormat?.value || "wav",
                        "audio": ["32", 0]
                    }
                }
            };
        } else if (engineModel === "diffrhythm") {
            // DiffRhythm State-of-the-Art Vocal Singing & Accompaniment
            promptGraph = {
                "20": {
                    "class_type": "ZombiehausSongWriter",
                    "inputs": {
                        "title": el.musicTitle?.value || "Neon Midnight",
                        "genre": el.musicGenre?.value || "Pop / Dance Anthem",
                        "vocal_style": el.musicVocalStyle?.value || "Female Belter",
                        "bpm": songBpm,
                        "key": el.musicKey?.value || "A minor",
                        "time_signature": el.musicTimeSig?.value || "4",
                        "lyrics": el.musicLyricsEditor?.value || "",
                        "style_tags": el.musicStyleTags?.value || ""
                    }
                },
                "21": {
                    "class_type": "DiffRhythmRun",
                    "inputs": {
                        "model": "cfm_model_v1_2.pt",
                        "style_prompt": el.musicStyleTags?.value || "Pop dance anthem, female vocal, high fidelity studio master",
                        "lyrics_or_edit_lyrics": ["20", 0],
                        "steps": 30,
                        "unload_model": true,
                        "odeint_method": "euler"
                    }
                },
                "22": {
                    "class_type": "ZombiehausSaveAudio",
                    "inputs": {
                        "filename_prefix": "Zombiehaus_DiffRhythm",
                        "format": el.musicExportFormat?.value || "wav",
                        "audio": ["21", 0]
                    }
                }
            };
        } else {
            // ACE-Step / Standalone Songwriter
            promptGraph = {
                "20": {
                    "class_type": "ZombiehausSongWriter",
                    "inputs": {
                        "title": el.musicTitle?.value || "Neon Midnight",
                        "genre": el.musicGenre?.value || "Pop / Dance Anthem",
                        "vocal_style": el.musicVocalStyle?.value || "Female Belter",
                        "bpm": songBpm,
                        "key": el.musicKey?.value || "A minor",
                        "time_signature": el.musicTimeSig?.value || "4",
                        "lyrics": el.musicLyricsEditor?.value || "",
                        "style_tags": el.musicStyleTags?.value || ""
                    }
                },
                "21": {
                    "class_type": "ZombiehausSaveAudio",
                    "inputs": {
                        "filename_prefix": "Zombiehaus_Song",
                        "format": el.musicExportFormat?.value || "wav",
                        "audio": ["20", 0]
                    }
                }
            };
        }
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

// ── UI Scale Management ──────────────────────────────────────────────────────

function setupUiScale() {
    const saved = localStorage.getItem("zh_studio_scale") || "1.0";
    if (el.uiScaleSelect) {
        el.uiScaleSelect.value = saved;
        document.documentElement.style.setProperty("--ui-scale", saved);
        if (document.body) document.body.style.zoom = saved;

        el.uiScaleSelect.addEventListener("change", (e) => {
            const val = e.target.value;
            localStorage.setItem("zh_studio_scale", val);
            document.documentElement.style.setProperty("--ui-scale", val);
            if (document.body) document.body.style.zoom = val;
        });
    }
}

// ── Syntax Highlighting Engine ───────────────────────────────────────────────

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tokenizeAndHighlight(text) {
    if (!text) return "";

    const intervals = [];
    const addMatches = (regex, type) => {
        let m;
        regex.lastIndex = 0;
        while ((m = regex.exec(text)) !== null) {
            const start = m.index;
            const end = start + m[0].length;
            if (start === end) {
                regex.lastIndex++;
                continue;
            }
            const collides = intervals.some(iv => (start < iv.end && end > iv.start));
            if (!collides) {
                intervals.push({ start, end, type });
            }
        }
    };

    // 1. Directives & Sections: [SCENE], [PERSONA ...], [INTERACTION], [intro], etc.
    addMatches(/(?:^|[\r\n])\s*\[[^\]\r\n]+\]/g, "tok-section");
    // 2. Comments: // ... or # ... or /* ... */
    addMatches(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|#[^\r\n]*/g, "tok-comment");
    // 3. LoRA tags: <lora:...>
    addMatches(/<lora:[^>\r\n]+>/gi, "tok-lora");
    // 4. Variables: $women.Amanda, $variable.key
    addMatches(/\$[a-zA-Z0-9_\.]+/g, "tok-variable");
    // 5. Wildcards: __wildcard__
    addMatches(/__[a-zA-Z0-9_\.\-]+__/g, "tok-wildcard");
    // 6. Attention / weights: (word:1.2) or (word)
    addMatches(/\([^()]+(?::[0-9.]+)?\)/g, "tok-weight");
    // 7. Dynamic choices: {a|b|c}
    addMatches(/\{[^{}]+\}/g, "tok-choice");

    intervals.sort((a, b) => a.start - b.start);

    let html = "";
    let lastIdx = 0;

    for (const iv of intervals) {
        if (iv.start > lastIdx) {
            html += escapeHtml(text.slice(lastIdx, iv.start));
        }
        const tokText = text.slice(iv.start, iv.end);
        html += `<span class="${iv.type}">${escapeHtml(tokText)}</span>`;
        lastIdx = iv.end;
    }

    if (lastIdx < text.length) {
        html += escapeHtml(text.slice(lastIdx));
    }

    if (text.endsWith("\n")) {
        html += "\n";
    }

    return html;
}

function setupSyntaxHighlighting() {
    const bindEditor = (textarea, backdrop) => {
        if (!textarea || !backdrop) return;
        const render = () => {
            backdrop.innerHTML = tokenizeAndHighlight(textarea.value || "");
        };
        textarea.addEventListener("input", render);
        textarea.addEventListener("scroll", () => {
            backdrop.scrollTop = textarea.scrollTop;
            backdrop.scrollLeft = textarea.scrollLeft;
        }, { passive: true });

        render();
    };

    bindEditor(el.scriptEditor, el.scriptBackdrop);
    bindEditor(el.positiveEditor, el.positiveBackdrop);
    bindEditor(el.negativeEditor, el.negativeBackdrop);
}

// ── Variable & Wildcard Autocomplete System ─────────────────────────────────

let availableWildcards = [];
let availableVariables = [
    { name: "$women.Amanda", desc: "Amanda (Blue eyes, Brunette, Medium)" },
    { name: "$women.KelseyKernstine", desc: "Kelsey Kernstine (Hazel eyes, Jet black hair)" },
    { name: "$women.Altasweet", desc: "Altasweet" },
    { name: "$women.Kayce", desc: "Kayce" },
    { name: "$men.John", desc: "John (Tailored Tuxedo, Confident)" },
    { name: "$colors", desc: "Colors Wildcard" },
    { name: "$outfits", desc: "Outfits Wildcard" },
    { name: "$poses", desc: "Camera Poses Wildcard" },
    { name: "$places", desc: "Atmospheric Locations Wildcard" }
];

function insertTextAtCursor(textarea, textToInsert) {
    if (!textarea) return;
    const start = textarea.selectionStart || textarea.value.length;
    const end = textarea.selectionEnd || textarea.value.length;
    const cur = textarea.value;
    textarea.value = cur.substring(0, start) + textToInsert + cur.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    textarea.dispatchEvent(new Event("input"));
}

function hideAutocomplete() {
    if (el.autocompletePopup) el.autocompletePopup.style.display = "none";
}

function showAutocomplete(targetTextarea, type = "variable", query = "") {
    const popup = el.autocompletePopup;
    if (!popup || !targetTextarea) return;

    popup.innerHTML = "";
    const header = document.createElement("div");
    header.className = "zh-ac-header";
    header.textContent = type === "variable" ? "Insert Variable ($)" : "Insert Wildcard (__)";
    popup.appendChild(header);

    const items = type === "variable" 
        ? availableVariables 
        : availableWildcards.map(w => ({ name: `__${w}__`, desc: `${w}.txt` }));
    
    const filtered = items.filter(it => it.name.toLowerCase().includes(query.toLowerCase()));

    if (filtered.length === 0) {
        const none = document.createElement("div");
        none.className = "zh-ac-item";
        none.textContent = "No matches found";
        popup.appendChild(none);
    } else {
        filtered.slice(0, 12).forEach(it => {
            const row = document.createElement("div");
            row.className = "zh-ac-item";
            row.innerHTML = `<span>${it.name}</span><span class="zh-ac-meta">${it.desc || ""}</span>`;
            row.addEventListener("click", () => {
                insertTextAtCursor(targetTextarea, it.name);
                hideAutocomplete();
            });
            popup.appendChild(row);
        });
    }

    const rect = targetTextarea.getBoundingClientRect();
    popup.style.top = `${rect.top + 36}px`;
    popup.style.left = `${Math.min(window.innerWidth - 360, rect.left + 20)}px`;
    popup.style.display = "flex";
}

function setupAutocomplete() {
    // Toolbar buttons for explicit picker access
    el.btnInsertVarScript?.addEventListener("click", () => {
        showAutocomplete(el.scriptEditor, "variable", "");
    });
    el.btnInsertWcScript?.addEventListener("click", () => {
        showAutocomplete(el.scriptEditor, "wildcard", "");
    });
    el.btnInsertVarPos?.addEventListener("click", () => {
        showAutocomplete(el.positiveEditor, "variable", "");
    });
    el.btnInsertWcPos?.addEventListener("click", () => {
        showAutocomplete(el.positiveEditor, "wildcard", "");
    });
    el.btnInsertWcNeg?.addEventListener("click", () => {
        showAutocomplete(el.negativeEditor, "wildcard", "");
    });

    // Real-time keystroke triggers for $ and __
    const hookAutoTrigger = (ta) => {
        if (!ta) return;
        ta.addEventListener("keyup", (e) => {
            if (e.key === "Escape") {
                hideAutocomplete();
                return;
            }
            const pos = ta.selectionStart;
            const textBefore = ta.value.substring(0, pos);
            const varMatch = textBefore.match(/\$([a-zA-Z0-9_\.]*)$/);
            if (varMatch) {
                showAutocomplete(ta, "variable", varMatch[0]);
                return;
            }
            const wcMatch = textBefore.match(/__([a-zA-Z0-9_\.\-]*)$/);
            if (wcMatch) {
                showAutocomplete(ta, "wildcard", wcMatch[0]);
                return;
            }
            hideAutocomplete();
        });
    };

    hookAutoTrigger(el.scriptEditor);
    hookAutoTrigger(el.positiveEditor);
    hookAutoTrigger(el.negativeEditor);

    document.addEventListener("click", (e) => {
        if (!el.autocompletePopup?.contains(e.target) && !e.target.closest(".zh-btn-var") && !e.target.closest(".zh-btn-wc")) {
            hideAutocomplete();
        }
    });
}

// ── List & Wildcard Curator Implementation ──────────────────────────────────

async function loadCuratorWildcards() {
    try {
        const resp = await fetch("/zombiehaus/wildcards/list");
        const res = await resp.json();
        if (res.success && res.data) {
            availableWildcards = res.data;
            if (el.curatorFileSelect) {
                el.curatorFileSelect.innerHTML = "";
                for (const wc of res.data) {
                    const opt = document.createElement("option");
                    opt.value = wc;
                    opt.textContent = wc + ".txt";
                    el.curatorFileSelect.appendChild(opt);
                }
                if (res.data.length > 0) {
                    loadCuratorContent(res.data[0]);
                }
            }
        }
    } catch (e) {
        console.error("Failed to load wildcards:", e);
    }
}

async function loadCuratorContent(filename) {
    if (!filename || !el.curatorTextEditor) return;
    try {
        const resp = await fetch("/zombiehaus/wildcards/load", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename })
        });
        const res = await resp.json();
        if (res.success) {
            el.curatorTextEditor.value = res.data || "";
            const lines = (res.data || "").split("\n").filter(l => l.trim().length > 0);
            if (el.curatorCountBadge) el.curatorCountBadge.textContent = `${lines.length} items`;
        }
    } catch (e) {
        console.error("Failed to load list content:", e);
    }
}

function setupListCurator() {
    el.curatorFileSelect?.addEventListener("change", (e) => {
        loadCuratorContent(e.target.value);
    });

    el.btnCuratorSave?.addEventListener("click", async () => {
        const filename = el.curatorFileSelect?.value;
        const content = el.curatorTextEditor?.value || "";
        if (!filename) return;

        try {
            const resp = await fetch("/zombiehaus/wildcards/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename, content })
            });
            const res = await resp.json();
            if (res.success) {
                alert(`Saved "${filename}.txt" successfully!`);
                await loadCuratorWildcards();
                if (el.curatorFileSelect) el.curatorFileSelect.value = filename;
            } else {
                alert("Save failed: " + (res.message || "Unknown error"));
            }
        } catch (e) {
            console.error("Curator save error:", e);
        }
    });

    el.btnCuratorNew?.addEventListener("click", async () => {
        const name = prompt("Enter new wildcard list name (e.g. hairstyles, artists):");
        if (!name || !name.trim()) return;
        const clean = name.trim().replace(/\.txt$/i, "");
        const resp = await fetch("/zombiehaus/wildcards/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: clean, content: "" })
        });
        const res = await resp.json();
        if (res.success) {
            await loadCuratorWildcards();
            if (el.curatorFileSelect) {
                el.curatorFileSelect.value = clean;
                loadCuratorContent(clean);
            }
        }
    });

    el.btnCuratorDelete?.addEventListener("click", async () => {
        const filename = el.curatorFileSelect?.value;
        if (!filename) return;
        if (!confirm(`Delete wildcard list "${filename}.txt"?`)) return;
        const resp = await fetch("/zombiehaus/wildcards/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename })
        });
        const res = await resp.json();
        if (res.success) {
            await loadCuratorWildcards();
        }
    });

    el.curatorFilterInput?.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        const lines = (el.curatorTextEditor?.value || "").split("\n");
        const count = q ? lines.filter(l => l.toLowerCase().includes(q)).length : lines.length;
        if (el.curatorCountBadge) el.curatorCountBadge.textContent = `${count} matches`;
    });
}

// Start application
window.addEventListener("DOMContentLoaded", () => {
    initStudio();

    // Register PWA Service Worker
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/extensions/ComfyUI-Zombiehaus/studio/sw.js")
            .then(reg => console.log("[Zombiehaus PWA] Service Worker registered:", reg.scope))
            .catch(err => console.debug("[Zombiehaus PWA] Service Worker registration skipped:", err));
    }
});

