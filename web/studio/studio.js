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

    // Workflow / Profile controls
    profileSelect: document.getElementById("profile-select"),
    btnUpdateProfile: document.getElementById("btn-update-profile"),
    btnSaveProfile: document.getElementById("btn-save-profile"),
    btnExportWorkflow: document.getElementById("btn-export-workflow"),
    btnImportWorkflow: document.getElementById("btn-import-workflow"),
    workflowFileInput: document.getElementById("workflow-file-input"),
    btnNewWorkflow: document.getElementById("btn-new-workflow"),
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
    setupFlowDynamics();
    ensureDetailerGlobalControls();
    setupProfileRack();
    setupActionRackControls();
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
    setupGlobalWorkflowDrop();

    await loadModelAssets();
    await loadProfiles();
    await loadCuratorWildcards();
    await loadPromptPresets();
    connectWebSocket();
}

// ── Dynamic LoRA & Detailer Stack Handlers ────────────────────────────────────

function addLoraItem(name = "None", strength = 1.0) {
    if (!el.loraStackContainer) return;
    if (typeof name === "object" && name !== null) {
        strength = name.strength !== undefined ? name.strength : (name.model_strength !== undefined ? name.model_strength : 1.0);
        name = name.name || "None";
    }

    const item = document.createElement("div");
    item.className = "zh-stack-item zh-lora-item";

    const row1 = document.createElement("div");
    row1.className = "zh-stack-item-row";

    const select = document.createElement("select");
    select.className = "zh-select zh-lora-select flex-1";
    let found = false;
    for (const loraName of availableLoraList) {
        const opt = document.createElement("option");
        opt.value = loraName;
        opt.textContent = loraName;
        if (lorNameMatch(loraName, name)) {
            opt.selected = true;
            found = true;
        }
        select.appendChild(opt);
    }
    if (!found && name && name !== "None") {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        opt.selected = true;
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

let detailerPasses = [];

const WORKFLOW_13_PRESET = [
    { model: "person_yolov8n-seg.pt", denoise: 0.25, steps: 20, cfg: 7.0, enabled: true },
    { model: "deepfashion2_yolov8s-seg.pt", denoise: 0.35, steps: 20, cfg: 7.0, enabled: true },
    { model: "face-yolo8n.pt", denoise: 0.40, steps: 20, cfg: 7.0, enabled: true },
    { model: "eyes-full-v1.pt", denoise: 0.35, steps: 20, cfg: 7.0, enabled: true },
    { model: "hand_yolov8n.pt", denoise: 0.45, steps: 20, cfg: 7.0, enabled: true },
    { model: "adetailerFootYolov8x_v20.pt", denoise: 0.40, steps: 20, cfg: 7.0, enabled: true },
    { model: "female_breast-v4.2.pt", denoise: 0.35, steps: 20, cfg: 7.0, enabled: true },
    { model: "nipples_yolov8s.pt", denoise: 0.35, steps: 20, cfg: 7.0, enabled: false },
    { model: "penis.pt", denoise: 0.35, steps: 20, cfg: 7.0, enabled: false },
    { model: "vagina-v3.2.pt", denoise: 0.35, steps: 20, cfg: 7.0, enabled: false },
    { model: "JTeethSeg.pt", denoise: 0.30, steps: 20, cfg: 7.0, enabled: true },
    { model: "lips_v1.pt", denoise: 0.35, steps: 20, cfg: 7.0, enabled: true },
    { model: "nails_seg_s_yolov8_v1.pt", denoise: 0.35, steps: 20, cfg: 7.0, enabled: true }
];

const PORTRAIT_4_PRESET = [
    { model: "face-yolo8n.pt", denoise: 0.40, steps: 20, cfg: 7.0, enabled: true },
    { model: "eyes-full-v1.pt", denoise: 0.35, steps: 20, cfg: 7.0, enabled: true },
    { model: "lips_v1.pt", denoise: 0.35, steps: 20, cfg: 7.0, enabled: true },
    { model: "JTeethSeg.pt", denoise: 0.30, steps: 20, cfg: 7.0, enabled: true }
];

function getDetectorIcon(modelName) {
    const name = (modelName || "").toLowerCase();
    if (name.includes("face")) return "👤";
    if (name.includes("eye") || name.includes("pupil") || name.includes("iris")) return "👁️";
    if (name.includes("hand") || name.includes("finger")) return "✋";
    if (name.includes("fashion") || name.includes("garment") || name.includes("dress")) return "👗";
    if (name.includes("breast") || name.includes("nipple") || name.includes("penis") || name.includes("vagina")) return "✨";
    if (name.includes("lips") || name.includes("mouth")) return "👄";
    if (name.includes("teeth")) return "🦷";
    if (name.includes("nail")) return "💅";
    if (name.includes("foot") || name.includes("feet")) return "🦶";
    if (name.includes("person") || name.includes("body")) return "🧍";
    return "🎯";
}

function formatModelName(modelName) {
    if (!modelName) return "Detector";
    const clean = modelName.replace(/^(bbox|segm)\//, "").replace(/\.(pt|pth)$/i, "");
    return clean.replace(/[-_]/g, " ");
}

function injectDetailerStyles() {
    if (document.getElementById("zh-detailer-custom-styles")) return;
    const style = document.createElement("style");
    style.id = "zh-detailer-custom-styles";
    style.textContent = `
        /* Main UI Compact Detailer Stack */
        .zh-det-summary-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(15, 23, 42, 0.65);
            border: 1px solid rgba(56, 189, 248, 0.2);
            border-radius: 6px;
            padding: 5px 10px;
            margin-bottom: 6px;
            font-size: 11px;
        }
        .zh-det-summary-info {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--text-muted);
            font-weight: 500;
        }
        .zh-det-summary-badge {
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
            padding: 1px 6px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 10px;
        }
        .zh-det-compact-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-left: 3px solid #38bdf8;
            border-radius: 6px;
            padding: 6px 10px;
            margin-bottom: 4px;
            transition: all 0.15s ease;
        }
        .zh-det-compact-card:hover {
            border-color: rgba(56, 189, 248, 0.4);
            background: rgba(15, 23, 42, 0.9);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .zh-det-compact-card.is-disabled {
            opacity: 0.55;
            border-left-color: rgba(255, 255, 255, 0.2);
            background: rgba(15, 23, 42, 0.4);
        }
        .zh-det-compact-card.is-disabled .zh-det-compact-name {
            text-decoration: line-through;
            color: var(--text-muted);
        }
        .zh-det-compact-left {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            min-width: 0;
            cursor: pointer;
        }
        .zh-det-compact-toggle {
            cursor: pointer;
            accent-color: #38bdf8;
            width: 14px;
            height: 14px;
        }
        .zh-det-compact-badge {
            font-size: 10px;
            font-weight: 700;
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.15);
            padding: 1px 5px;
            border-radius: 3px;
            user-select: none;
        }
        .zh-det-compact-name {
            font-size: 11px;
            font-weight: 600;
            color: #f1f5f9;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .zh-det-compact-stats {
            font-size: 10px;
            color: var(--text-muted);
            background: rgba(0, 0, 0, 0.3);
            padding: 1px 6px;
            border-radius: 4px;
            white-space: nowrap;
        }
        .zh-det-compact-actions {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-left: 6px;
        }
        .zh-det-compact-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-muted);
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .zh-det-compact-btn:hover {
            color: #fff;
            background: rgba(56, 189, 248, 0.2);
            border-color: rgba(56, 189, 248, 0.4);
        }
        .zh-det-empty-state {
            text-align: center;
            padding: 14px;
            color: var(--text-muted);
            font-size: 11px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px dashed rgba(255, 255, 255, 0.1);
            border-radius: 6px;
        }

        /* Detailer Modal Dialog */
        .zh-detailer-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(3, 7, 18, 0.82);
            backdrop-filter: blur(10px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: zhFadeIn 0.2s ease-out;
        }
        @keyframes zhFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .zh-detailer-modal-card {
            background: #0b1120;
            border: 1px solid rgba(56, 189, 248, 0.35);
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.12);
            border-radius: 12px;
            width: 100%;
            max-width: 920px;
            max-height: 88vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .zh-detailer-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 20px;
            background: rgba(15, 23, 42, 0.85);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .zh-detailer-modal-title {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
            color: #f8fafc;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .zh-detailer-modal-subtitle {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 2px;
        }
        .zh-detailer-modal-close {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 18px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            line-height: 1;
        }
        .zh-detailer-modal-close:hover {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.15);
        }
        .zh-detailer-modal-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 20px;
            background: rgba(15, 23, 42, 0.5);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            gap: 12px;
            flex-wrap: wrap;
        }
        .zh-modal-conf-group {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            color: var(--text-muted);
        }
        .zh-modal-cards-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .zh-modal-pass-card {
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(56, 189, 248, 0.25);
            border-radius: 8px;
            padding: 12px 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
        }
        .zh-modal-pass-card.highlight-focus {
            border-color: #38bdf8;
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
        }
        .zh-modal-pass-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 10px;
        }
        .zh-modal-pass-header-left {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }
        .zh-detailer-modal-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            background: rgba(15, 23, 42, 0.9);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
    `;
    document.head.appendChild(style);
}

function ensureDetailerGlobalControls() {
    injectDetailerStyles();
    ensureDetailerModal();
    renderMainDetailerList();
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
    renderMainDetailerList();
    const modal = document.getElementById("zh-detailer-modal");
    if (modal && modal.style.display !== "none") {
        renderModalDetailerCards();
    }
}

function ensureDetailerModal() {
    if (document.getElementById("zh-detailer-modal")) return;

    const modal = document.createElement("div");
    modal.id = "zh-detailer-modal";
    modal.className = "zh-detailer-modal-backdrop";
    modal.style.display = "none";

    modal.innerHTML = `
        <div class="zh-detailer-modal-card">
            <div class="zh-detailer-modal-header">
                <div>
                    <h3 class="zh-detailer-modal-title">🎯 Multi-Pass Detailer Configuration</h3>
                    <div class="zh-detailer-modal-subtitle">Configure detection models, denoise strength, steps, padding, and inpaint prompts</div>
                </div>
                <button type="button" class="zh-detailer-modal-close" id="btn-detailer-modal-close" title="Close">✕</button>
            </div>

            <div class="zh-detailer-modal-toolbar">
                <div class="zh-modal-conf-group">
                    <span style="font-weight: 600; color: #38bdf8;">🎯 Sensitivity Threshold:</span>
                    <input id="detailer-modal-conf-slider" type="range" min="0.05" max="0.95" step="0.05" value="0.30" class="zh-slider" style="width: 110px;">
                    <input id="detailer-global-confidence" type="number" step="0.05" min="0.05" max="0.95" value="0.30" class="zh-slider-val-input" style="width: 48px;">
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <select id="sel-detailer-presets" class="zh-select" style="font-size: 11px; padding: 2px 8px; height: 26px;">
                        <option value="">⚡ Presets & Templates...</option>
                        <option value="workflow-13">⚡ Workflow Full (13 Passes)</option>
                        <option value="portrait-4">✨ Portrait Essentials (4 Passes)</option>
                    </select>
                    <button type="button" id="btn-modal-add-pass" class="zh-btn zh-btn-primary zh-btn-mini" style="height: 26px;">+ Add Pass</button>
                </div>
            </div>

            <div id="zh-detailer-modal-cards" class="zh-modal-cards-container"></div>

            <div class="zh-detailer-modal-footer">
                <div id="zh-detailer-modal-stats" style="font-size: 11px; color: var(--text-muted); font-weight: 500;"></div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" id="btn-detailer-toggle-all" class="zh-btn zh-btn-mini zh-btn-secondary">Toggle All</button>
                    <button type="button" id="btn-detailer-clear-all" class="zh-btn zh-btn-mini zh-btn-danger">Clear All</button>
                    <button type="button" id="btn-detailer-modal-done" class="zh-btn zh-btn-primary" style="padding: 4px 16px; font-weight: 600;">Done</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const confSlider = document.getElementById("detailer-modal-conf-slider");
    const confInput = document.getElementById("detailer-global-confidence");
    confSlider?.addEventListener("input", () => {
        confInput.value = Number(confSlider.value).toFixed(2);
    });
    confInput?.addEventListener("input", () => {
        confSlider.value = confInput.value;
    });

    document.getElementById("btn-detailer-modal-close")?.addEventListener("click", () => closeDetailerModal());
    document.getElementById("btn-detailer-modal-done")?.addEventListener("click", () => closeDetailerModal());
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeDetailerModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display !== "none") {
            closeDetailerModal();
        }
    });

    document.getElementById("btn-modal-add-pass")?.addEventListener("click", () => {
        addDetailerItem({ model: "face-yolo8n.pt", denoise: 0.40, steps: 20 });
        renderModalDetailerCards();
        const cards = document.getElementById("zh-detailer-modal-cards");
        if (cards) cards.scrollTop = cards.scrollHeight;
    });

    document.getElementById("sel-detailer-presets")?.addEventListener("change", (e) => {
        const val = e.target.value;
        if (!val) return;
        if (val === "workflow-13") {
            detailerPasses = JSON.parse(JSON.stringify(WORKFLOW_13_PRESET));
        } else if (val === "portrait-4") {
            detailerPasses = JSON.parse(JSON.stringify(PORTRAIT_4_PRESET));
        }
        e.target.value = "";
        renderModalDetailerCards();
        renderMainDetailerList();
    });

    document.getElementById("btn-detailer-toggle-all")?.addEventListener("click", () => {
        const anyDisabled = detailerPasses.some(p => !p.enabled);
        detailerPasses.forEach(p => { p.enabled = anyDisabled; });
        renderModalDetailerCards();
        renderMainDetailerList();
    });

    document.getElementById("btn-detailer-clear-all")?.addEventListener("click", () => {
        if (confirm("Remove all detailer passes?")) {
            detailerPasses = [];
            renderModalDetailerCards();
            renderMainDetailerList();
        }
    });
}

function openDetailerModal(targetPassId = null) {
    ensureDetailerModal();
    const modal = document.getElementById("zh-detailer-modal");
    if (!modal) return;
    renderModalDetailerCards();
    modal.style.display = "flex";

    if (targetPassId) {
        setTimeout(() => {
            const card = modal.querySelector(`[data-modal-pass-id="${targetPassId}"]`);
            if (card) {
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                card.classList.add("highlight-focus");
                setTimeout(() => card.classList.remove("highlight-focus"), 1200);
            }
        }, 50);
    }
}

function closeDetailerModal() {
    const modal = document.getElementById("zh-detailer-modal");
    if (modal) modal.style.display = "none";
    renderMainDetailerList();
}

function renderMainDetailerList() {
    if (!el.detailerStackContainer) return;
    el.detailerStackContainer.innerHTML = "";

    const activeCount = detailerPasses.filter(p => p.enabled).length;

    const summaryBar = document.createElement("div");
    summaryBar.className = "zh-det-summary-bar";
    summaryBar.innerHTML = `
        <div class="zh-det-summary-info">
            <span class="zh-det-summary-badge">${activeCount} of ${detailerPasses.length} active</span>
            <span>Detailer Refiner Passes</span>
        </div>
        <button type="button" class="zh-btn zh-btn-mini zh-btn-secondary zh-open-modal-btn" style="padding: 2px 8px; font-size: 10px;">⚙️ Configure Passes</button>
    `;
    summaryBar.querySelector(".zh-open-modal-btn")?.addEventListener("click", () => openDetailerModal());
    el.detailerStackContainer.appendChild(summaryBar);

    if (detailerPasses.length === 0) {
        const empty = document.createElement("div");
        empty.className = "zh-det-empty-state";
        empty.innerHTML = `
            <div>No detailer passes configured.</div>
            <button type="button" class="zh-btn zh-btn-mini zh-btn-primary" style="margin-top: 6px;">+ Configure Passes (Modal)</button>
        `;
        empty.querySelector("button")?.addEventListener("click", () => openDetailerModal());
        el.detailerStackContainer.appendChild(empty);
        return;
    }

    detailerPasses.forEach((pass, idx) => {
        const card = document.createElement("div");
        card.className = `zh-det-compact-card ${pass.enabled ? "is-enabled" : "is-disabled"}`;
        card.setAttribute("data-det-id", pass.id);

        const icon = getDetectorIcon(pass.model);
        const name = formatModelName(pass.model);

        card.innerHTML = `
            <div class="zh-det-compact-left">
                <input type="checkbox" class="zh-det-compact-toggle" ${pass.enabled ? "checked" : ""} title="Enable or bypass this pass">
                <span class="zh-det-compact-badge">#${idx + 1}</span>
                <span>${icon}</span>
                <span class="zh-det-compact-name" title="${pass.model}">${name}</span>
                <span class="zh-det-compact-stats">${Number(pass.denoise).toFixed(2)}d • ${pass.steps}s • ${Number(pass.cfg).toFixed(1)}cfg</span>
            </div>
            <div class="zh-det-compact-actions">
                <button type="button" class="zh-det-compact-btn zh-btn-edit" title="Configure pass in modal">⚙️</button>
                <button type="button" class="zh-det-compact-btn zh-btn-del" title="Remove pass">✕</button>
            </div>
        `;

        const chk = card.querySelector(".zh-det-compact-toggle");
        chk?.addEventListener("change", (e) => {
            pass.enabled = e.target.checked;
            card.classList.toggle("is-enabled", pass.enabled);
            card.classList.toggle("is-disabled", !pass.enabled);
            const badge = summaryBar.querySelector(".zh-det-summary-badge");
            if (badge) {
                const count = detailerPasses.filter(p => p.enabled).length;
                badge.textContent = `${count} of ${detailerPasses.length} active`;
            }
        });

        card.querySelector(".zh-det-compact-left")?.addEventListener("click", (e) => {
            if (e.target !== chk) openDetailerModal(pass.id);
        });

        card.querySelector(".zh-btn-edit")?.addEventListener("click", () => openDetailerModal(pass.id));

        card.querySelector(".zh-btn-del")?.addEventListener("click", () => {
            detailerPasses = detailerPasses.filter(p => p.id !== pass.id);
            renderMainDetailerList();
        });

        el.detailerStackContainer.appendChild(card);
    });
}

function renderModalDetailerCards() {
    const container = document.getElementById("zh-detailer-modal-cards");
    const statsEl = document.getElementById("zh-detailer-modal-stats");
    if (!container) return;
    container.innerHTML = "";

    const activeCount = detailerPasses.filter(p => p.enabled).length;
    if (statsEl) {
        statsEl.textContent = `${activeCount} of ${detailerPasses.length} passes active`;
    }

    if (detailerPasses.length === 0) {
        container.innerHTML = `
            <div class="zh-det-empty-state" style="padding: 30px;">
                <div style="font-size: 13px; font-weight: 600; color: #f1f5f9; margin-bottom: 6px;">No Detailer Passes Configured</div>
                <div style="margin-bottom: 12px;">Add individual passes or load a complete multi-pass character template above.</div>
                <button type="button" id="btn-modal-empty-add" class="zh-btn zh-btn-primary">+ Add First Pass</button>
            </div>
        `;
        document.getElementById("btn-modal-empty-add")?.addEventListener("click", () => {
            addDetailerItem({ model: "face-yolo8n.pt", denoise: 0.40, steps: 20 });
            renderModalDetailerCards();
        });
        return;
    }

    detailerPasses.forEach((pass, idx) => {
        const item = document.createElement("div");
        item.className = "zh-modal-pass-card";
        item.setAttribute("data-modal-pass-id", pass.id);

        item.innerHTML = `
            <div class="zh-modal-pass-header">
                <div class="zh-modal-pass-header-left">
                    <input type="checkbox" class="zh-modal-pass-toggle zh-det-compact-toggle" ${pass.enabled ? "checked" : ""} title="Enable or bypass this pass">
                    <span class="zh-det-compact-badge">#${idx + 1}</span>
                    <select class="zh-select zh-modal-pass-select flex-1" title="Select detector model"></select>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button type="button" class="zh-detailer-toggle-adv zh-btn-mini">⚙️ Advanced</button>
                    <button type="button" class="zh-btn-mini zh-btn-danger zh-modal-pass-del" title="Remove pass">✕</button>
                </div>
            </div>

            <div class="zh-detailer-main-grid">
                <div class="zh-detailer-param">
                    <div class="zh-label-row">
                        <label>Denoise</label>
                        <input type="number" step="0.05" min="0.05" max="1.0" value="${Number(pass.denoise).toFixed(2)}" class="zh-slider-val-input zh-det-denoise-num">
                    </div>
                    <input type="range" min="0.05" max="1.0" step="0.05" value="${pass.denoise}" class="zh-slider zh-det-denoise-slider">
                </div>

                <div class="zh-detailer-param">
                    <div class="zh-label-row">
                        <label>Steps</label>
                        <input type="number" step="1" min="5" max="80" value="${pass.steps}" class="zh-slider-val-input zh-det-steps-num">
                    </div>
                    <input type="range" min="5" max="80" step="1" value="${pass.steps}" class="zh-slider zh-det-steps-slider">
                </div>

                <div class="zh-detailer-param">
                    <div class="zh-label-row">
                        <label>CFG Scale</label>
                        <input type="number" step="0.5" min="1.0" max="20.0" value="${Number(pass.cfg).toFixed(1)}" class="zh-slider-val-input zh-det-cfg-num">
                    </div>
                    <input type="range" min="1.0" max="20.0" step="0.5" value="${pass.cfg}" class="zh-slider zh-det-cfg-slider">
                </div>
            </div>

            <div class="zh-detailer-advanced-drawer" style="display: none;">
                <div class="zh-detailer-adv-grid">
                    <div class="zh-adv-field">
                        <label>Padding (px)</label>
                        <input type="number" min="0" max="256" step="8" value="${pass.padding}" class="zh-input zh-det-padding">
                    </div>
                    <div class="zh-adv-field">
                        <label>Context Pad</label>
                        <input type="number" min="0" max="256" step="8" value="${pass.context_pad}" class="zh-input zh-det-context-pad">
                    </div>
                    <div class="zh-adv-field">
                        <label>Mask Blur (px)</label>
                        <input type="number" min="0" max="64" step="2" value="${pass.mask_blur}" class="zh-input zh-det-mask-blur">
                    </div>
                    <div class="zh-adv-field">
                        <label>Blend Feather</label>
                        <input type="number" min="0" max="128" step="4" value="${pass.blend_feather}" class="zh-input zh-det-blend-feather">
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
                    <input type="text" class="zh-input zh-det-inpaint-prompt" placeholder="e.g. highly detailed iris, sharp eyelashes, realistic skin" value="${pass.inpaint_prompt || ""}" style="width: 100%; font-size: 11px;">
                </div>
            </div>
        `;

        const select = item.querySelector(".zh-modal-pass-select");
        populateDetectorSelect(select, pass.model);
        select?.addEventListener("change", (e) => {
            pass.model = e.target.value;
            renderMainDetailerList();
        });

        const samplerSelect = item.querySelector(".zh-det-sampler");
        const schedSelect = item.querySelector(".zh-det-scheduler");
        populateSelect(samplerSelect, availableSamplers, pass.sampler);
        populateSelect(schedSelect, availableSchedulers, pass.scheduler);
        samplerSelect?.addEventListener("change", (e) => { pass.sampler = e.target.value; });
        schedSelect?.addEventListener("change", (e) => { pass.scheduler = e.target.value; });

        const chk = item.querySelector(".zh-modal-pass-toggle");
        chk?.addEventListener("change", (e) => {
            pass.enabled = e.target.checked;
            renderMainDetailerList();
            if (statsEl) {
                const count = detailerPasses.filter(p => p.enabled).length;
                statsEl.textContent = `${count} of ${detailerPasses.length} passes active`;
            }
        });

        const bindPair = (sliderClass, numClass, propName, decimals = 2) => {
            const slider = item.querySelector(sliderClass);
            const num = item.querySelector(numClass);
            if (slider && num) {
                slider.addEventListener("input", () => {
                    const val = parseFloat(slider.value);
                    num.value = val.toFixed(decimals);
                    pass[propName] = val;
                    renderMainDetailerList();
                });
                num.addEventListener("input", () => {
                    const val = parseFloat(num.value);
                    if (!isNaN(val)) {
                        slider.value = val;
                        pass[propName] = val;
                        renderMainDetailerList();
                    }
                });
            }
        };
        bindPair(".zh-det-denoise-slider", ".zh-det-denoise-num", "denoise", 2);
        bindPair(".zh-det-steps-slider", ".zh-det-steps-num", "steps", 0);
        bindPair(".zh-det-cfg-slider", ".zh-det-cfg-num", "cfg", 1);

        const bindAdvInt = (inputClass, propName) => {
            const input = item.querySelector(inputClass);
            input?.addEventListener("change", () => {
                const val = parseInt(input.value, 10);
                if (!isNaN(val)) pass[propName] = val;
            });
        };
        bindAdvInt(".zh-det-padding", "padding");
        bindAdvInt(".zh-det-context-pad", "context_pad");
        bindAdvInt(".zh-det-mask-blur", "mask_blur");
        bindAdvInt(".zh-det-blend-feather", "blend_feather");

        const promptInput = item.querySelector(".zh-det-inpaint-prompt");
        promptInput?.addEventListener("input", () => {
            pass.inpaint_prompt = promptInput.value;
        });

        const advBtn = item.querySelector(".zh-detailer-toggle-adv");
        const advDrawer = item.querySelector(".zh-detailer-advanced-drawer");
        advBtn?.addEventListener("click", () => {
            const isHidden = advDrawer.style.display === "none";
            advDrawer.style.display = isHidden ? "block" : "none";
            advBtn.textContent = isHidden ? "▲ Less" : "⚙️ Advanced";
            advBtn.style.color = isHidden ? "var(--accent-cyan)" : "";
        });

        item.querySelector(".zh-modal-pass-del")?.addEventListener("click", () => {
            detailerPasses = detailerPasses.filter(p => p.id !== pass.id);
            renderModalDetailerCards();
            renderMainDetailerList();
        });

        container.appendChild(item);
    });
}

function addDetailerItem(config = {}) {
    const rawModel = (typeof config === "string" ? config : config.model) || "face-yolo8n.pt";
    const cleanModel = rawModel.replace(/^(bbox|segm)\//, "");

    const pass = {
        id: "det_" + Math.random().toString(36).substring(2, 9),
        enabled: config.enabled !== undefined ? Boolean(config.enabled) : true,
        model: cleanModel,
        denoise: config.denoise !== undefined ? parseFloat(config.denoise) : 0.40,
        steps: config.steps !== undefined ? parseInt(config.steps, 10) : 20,
        cfg: config.cfg !== undefined ? parseFloat(config.cfg) : 7.0,
        padding: config.padding !== undefined ? parseInt(config.padding, 10) : 32,
        context_pad: config.context_pad !== undefined ? parseInt(config.context_pad, 10) : 32,
        mask_blur: config.mask_blur !== undefined ? parseInt(config.mask_blur, 10) : 4,
        blend_feather: config.blend_feather !== undefined ? parseInt(config.blend_feather, 10) : 16,
        sampler: config.sampler || (el.sampler?.value || "euler_ancestral"),
        scheduler: config.scheduler || (el.scheduler?.value || "karras"),
        inpaint_prompt: config.inpaint_prompt || ""
    };

    detailerPasses.push(pass);
    renderMainDetailerList();
    const modal = document.getElementById("zh-detailer-modal");
    if (modal && modal.style.display !== "none") {
        renderModalDetailerCards();
    }
}

function getDetailerStackData() {
    return detailerPasses.map(pass => ({
        model: (pass.model || "face-yolo8n.pt").replace(/^(bbox|segm)\//, ""),
        denoise: isNaN(pass.denoise) ? 0.40 : pass.denoise,
        steps: isNaN(pass.steps) ? 20 : pass.steps,
        cfg: isNaN(pass.cfg) ? 7.0 : pass.cfg,
        padding: isNaN(pass.padding) ? 32 : pass.padding,
        context_pad: isNaN(pass.context_pad) ? 32 : pass.context_pad,
        mask_blur: isNaN(pass.mask_blur) ? 4 : pass.mask_blur,
        blend_feather: isNaN(pass.blend_feather) ? 16 : pass.blend_feather,
        sampler: pass.sampler || (el.sampler?.value || "euler_ancestral"),
        scheduler: pass.scheduler || (el.scheduler?.value || "karras"),
        enabled: Boolean(pass.enabled),
        inpaint_prompt: pass.inpaint_prompt || ""
    }));
}

function setupDynamicStacks() {
    el.btnAddLora?.addEventListener("click", () => addLoraItem());
    el.btnAddDetailer?.addEventListener("click", () => openDetailerModal());
}

// ── Flow Dynamics & Dynamic Guidance Controllers ─────────────────────────────

function injectFlowDynamicsStyles() {
    if (document.getElementById("zh-flow-dynamics-styles")) return;
    const style = document.createElement("style");
    style.id = "zh-flow-dynamics-styles";
    style.textContent = `
        /* Studio Workflow Rack & Queue Controls */
        #btn-update-profile {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.4));
            border: 1px solid rgba(52, 211, 153, 0.5);
            color: #6ee7b7;
            font-weight: 600;
        }
        #btn-update-profile:hover {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.4), rgba(5, 150, 105, 0.6));
            border-color: #34d399;
            color: #ffffff;
        }
        .zh-queue-pill {
            background: rgba(14, 165, 233, 0.2);
            border: 1px solid rgba(56, 189, 248, 0.5);
            color: #38bdf8;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 9px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            animation: zhPulseGlow 2s infinite ease-in-out;
        }
        .zh-queue-pulse {
            width: 6px;
            height: 6px;
            background: #38bdf8;
            border-radius: 50%;
            box-shadow: 0 0 6px #38bdf8;
        }
        @keyframes zhPulseGlow {
            0%, 100% { opacity: 0.85; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.03); }
        }
        .zh-queue-dropdown {
            font-size: 11px;
            padding: 2px 6px;
            height: 32px;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(56, 189, 248, 0.3);
            border-radius: 6px;
            color: #e2e8f0;
            font-weight: 600;
            cursor: pointer;
        }
        .zh-queue-dropdown:hover {
            border-color: #38bdf8;
        }
        .zh-btn-generate.is-queuing {
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(2, 132, 199, 0.9)) !important;
            border-color: #38bdf8 !important;
            box-shadow: 0 0 14px rgba(56, 189, 248, 0.4) !important;
        }

        /* Flow Dynamics & Dynamic CFG Styles */
        .zh-flow-card {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .zh-flow-section {
            background: rgba(15, 23, 42, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 10px;
            transition: border-color 0.2s, background 0.2s;
        }
        .zh-flow-section.cfg-section {
            border-color: rgba(56, 189, 248, 0.22);
        }
        .zh-flow-section.cfg-section:hover {
            border-color: rgba(56, 189, 248, 0.4);
            background: rgba(15, 23, 42, 0.8);
        }
        .zh-flow-section.shift-section {
            border-color: rgba(168, 85, 247, 0.22);
        }
        .zh-flow-section.shift-section:hover {
            border-color: rgba(168, 85, 247, 0.4);
            background: rgba(15, 23, 42, 0.8);
        }
        .zh-flow-header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
        }
        .zh-flow-toggle-title {
            display: flex;
            align-items: center;
            gap: 7px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            user-select: none;
        }
        .zh-flow-toggle-title input[type="checkbox"] {
            margin: 0;
            cursor: pointer;
        }
        .zh-flow-info-callout {
            display: none;
            background: rgba(2, 6, 23, 0.85);
            border: 1px solid rgba(56, 189, 248, 0.25);
            border-radius: 6px;
            padding: 8px 10px;
            font-size: 11px;
            line-height: 1.45;
            color: var(--text-muted);
            margin-bottom: 8px;
        }
        .zh-flow-info-callout strong {
            color: #38bdf8;
        }
        .zh-flow-body {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .zh-flow-body.is-disabled {
            opacity: 0.4;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
}

function updateFlowBadges() {
    const dynCfgEnable = document.getElementById("dyn-cfg-enable");
    const dynCfgStart = document.getElementById("dyn-cfg-start");
    const dynCfgEnd = document.getElementById("dyn-cfg-end");
    const dynCfgProfile = document.getElementById("dyn-cfg-profile");
    const badgeDynCfg = document.getElementById("badge-dyn-cfg");

    if (badgeDynCfg) {
        if (dynCfgEnable && !dynCfgEnable.checked) {
            badgeDynCfg.textContent = "Bypassed";
            badgeDynCfg.className = "zh-badge zh-badge-gray";
        } else {
            const startVal = parseFloat(dynCfgStart?.value || "3.5").toFixed(1);
            const endVal = parseFloat(dynCfgEnd?.value || "1.8").toFixed(1);
            const prof = dynCfgProfile?.value || "cosine";
            badgeDynCfg.textContent = `${startVal} ➔ ${endVal} (${prof})`;
            badgeDynCfg.className = "zh-badge zh-badge-cyan";
        }
    }

    const shiftEnable = document.getElementById("flow-shift-enable");
    const shiftBase = document.getElementById("flow-base-shift");
    const shiftMax = document.getElementById("flow-max-shift");
    const shiftMode = document.getElementById("flow-shift-mode");
    const badgeShift = document.getElementById("badge-flow-shift");

    if (badgeShift) {
        if (shiftEnable && !shiftEnable.checked) {
            badgeShift.textContent = "Bypassed";
            badgeShift.className = "zh-badge zh-badge-gray";
        } else {
            const baseVal = parseFloat(shiftBase?.value || "0.35").toFixed(2);
            const maxVal = parseFloat(shiftMax?.value || "1.15").toFixed(2);
            const m = (shiftMode?.value || "Auto").split(" ")[0];
            badgeShift.textContent = `${baseVal} ➔ ${maxVal} (${m})`;
            badgeShift.className = "zh-badge zh-badge-purple";
        }
    }
}

function setupFlowDynamics() {
    injectFlowDynamicsStyles();

    const flowCard = document.getElementById("engine-chroma-shift")?.closest(".zh-card")
        || document.querySelector(".zh-col-engine .zh-card:nth-of-type(3)");
    if (!flowCard) return;

    flowCard.innerHTML = `
        <div class="zh-label-row" style="margin-bottom: 8px;">
            <div class="zh-card-title" style="margin: 0;">🌊 Flow Dynamics & Dynamic CFG</div>
            <button type="button" id="btn-flow-info-toggle" class="zh-btn zh-btn-mini zh-btn-subtle" title="Explain Dynamic Guidance & Flow Timestep Shifting" style="font-size: 10px; padding: 2px 7px;">ℹ️ Info</button>
        </div>

        <div id="flow-info-callout" class="zh-flow-info-callout">
            <div><strong>Dynamic CFG Decay:</strong> Adjusts CFG guidance scale across timesteps from Start Scale down to End Scale. Captures composition early, then decays to prevent plastic/waxy skin, over-baking, and burned saturation.</div>
            <div style="margin-top: 4px;"><strong>Resolution Timestep Shift:</strong> Scales continuous Flow-Matching timesteps between Base Shift and Max Shift based on canvas token density for clean micro-details.</div>
        </div>

        <div class="zh-flow-card">
            <!-- Dynamic CFG Section -->
            <div class="zh-flow-section cfg-section">
                <div class="zh-flow-header-row">
                    <label class="zh-flow-toggle-title" style="color: #38bdf8;">
                        <input type="checkbox" id="dyn-cfg-enable" checked>
                        <span>Dynamic CFG Decay</span>
                    </label>
                    <span id="badge-dyn-cfg" class="zh-badge zh-badge-cyan" style="font-size: 10px;">3.5 ➔ 1.8 (cosine)</span>
                </div>

                <div id="dyn-cfg-body" class="zh-flow-body">
                    <div class="zh-field-row" style="gap: 6px;">
                        <div class="zh-field flex-1">
                            <label style="font-size: 10px; color: var(--text-muted);">Guidance Mode</label>
                            <select id="dyn-cfg-mode" class="zh-select" style="font-size: 11px; padding: 2px 6px; height: 26px;">
                                <option value="CFG Scale (Chroma / SDXL / SD1.5)" selected>CFG Scale (Chroma / SDXL / SD1.5)</option>
                                <option value="Flux / SD3 (Distilled Guidance)">Flux / SD3 (Distilled Guidance)</option>
                            </select>
                        </div>
                        <div class="zh-field" style="width: 105px;">
                            <label style="font-size: 10px; color: var(--text-muted);">Decay Curve</label>
                            <select id="dyn-cfg-profile" class="zh-select" style="font-size: 11px; padding: 2px 6px; height: 26px;">
                                <option value="cosine" selected>Cosine (S-Curve)</option>
                                <option value="linear">Linear</option>
                                <option value="exponential">Exponential</option>
                            </select>
                        </div>
                    </div>

                    <div class="zh-field">
                        <div class="zh-label-row">
                            <label style="font-size: 11px;" title="CFG scale applied during early steps for prompt fidelity">Start Scale (Prompt fidelity)</label>
                            <input id="val-dyn-cfg-start" type="number" step="0.1" min="0.5" max="15.0" value="3.5" class="zh-slider-val-input" style="width: 50px;">
                        </div>
                        <input id="dyn-cfg-start" type="range" min="0.5" max="15.0" step="0.1" value="3.5" class="zh-slider">
                    </div>

                    <div class="zh-field">
                        <div class="zh-label-row">
                            <label style="font-size: 11px;" title="CFG scale decayed to at late steps to avoid plastic burn">End Scale (Natural skin / tone)</label>
                            <input id="val-dyn-cfg-end" type="number" step="0.1" min="0.5" max="10.0" value="1.8" class="zh-slider-val-input" style="width: 50px;">
                        </div>
                        <input id="dyn-cfg-end" type="range" min="0.5" max="10.0" step="0.1" value="1.8" class="zh-slider">
                    </div>

                    <div class="zh-field">
                        <div class="zh-label-row">
                            <label style="font-size: 11px;" title="Decay curve exponent">Decay Power</label>
                            <input id="val-dyn-cfg-power" type="number" step="0.1" min="0.1" max="4.0" value="1.0" class="zh-slider-val-input" style="width: 50px;">
                        </div>
                        <input id="dyn-cfg-power" type="range" min="0.1" max="4.0" step="0.1" value="1.0" class="zh-slider">
                    </div>
                </div>
            </div>

            <!-- Resolution Timestep Shift Section -->
            <div class="zh-flow-section shift-section">
                <div class="zh-flow-header-row">
                    <label class="zh-flow-toggle-title" style="color: #c084fc;">
                        <input type="checkbox" id="flow-shift-enable" checked>
                        <span>Resolution Timestep Shift</span>
                    </label>
                    <span id="badge-flow-shift" class="zh-badge zh-badge-purple" style="font-size: 10px;">0.35 ➔ 1.15 (Auto)</span>
                </div>

                <div id="flow-shift-body" class="zh-flow-body">
                    <div class="zh-field">
                        <label style="font-size: 10px; color: var(--text-muted);">Shift Mode</label>
                        <select id="flow-shift-mode" class="zh-select" style="font-size: 11px; padding: 2px 6px; height: 26px;">
                            <option value="Auto (from Latent / Image)" selected>Auto (Scales to Canvas Resolution)</option>
                            <option value="Manual Resolution">Manual Resolution</option>
                            <option value="Fixed Shift">Fixed Constant Shift</option>
                            <option value="Bypass">Bypass</option>
                        </select>
                    </div>

                    <div class="zh-field">
                        <div class="zh-label-row">
                            <label style="font-size: 11px;" title="Low-resolution base shift for coarse flow convergence">Base Shift (Coarse baseline)</label>
                            <input id="val-flow-base-shift" type="number" step="0.05" min="0.0" max="5.0" value="0.35" class="zh-slider-val-input" style="width: 50px;">
                        </div>
                        <input id="flow-base-shift" type="range" min="0.0" max="5.0" step="0.05" value="0.35" class="zh-slider">
                    </div>

                    <div class="zh-field">
                        <div class="zh-label-row">
                            <label style="font-size: 11px;" title="Maximum shift applied for high-resolution micro-details">Max Shift (High-res limit)</label>
                            <input id="val-flow-max-shift" type="number" step="0.05" min="0.0" max="5.0" value="1.15" class="zh-slider-val-input" style="width: 50px;">
                        </div>
                        <input id="flow-max-shift" type="range" min="0.0" max="5.0" step="0.05" value="1.15" class="zh-slider">
                    </div>
                </div>
            </div>
        </div>
    `;

    // Re-bind cached element pointers if referenced elsewhere
    el.chromaShift = document.getElementById("flow-max-shift");
    el.valChromaShift = document.getElementById("val-flow-max-shift");
    el.guidance = document.getElementById("dyn-cfg-start");
    el.valGuidance = document.getElementById("val-dyn-cfg-start");

    // Slider two-way sync helper
    const bindFlowSlider = (sliderId, inputId, decimals = 1) => {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);
        if (!slider || !input) return;
        slider.addEventListener("input", () => {
            input.value = Number(slider.value).toFixed(decimals);
            updateFlowBadges();
        });
        input.addEventListener("input", () => {
            const num = parseFloat(input.value);
            if (!isNaN(num)) {
                slider.value = num;
                updateFlowBadges();
            }
        });
        input.addEventListener("change", () => {
            const num = parseFloat(input.value);
            if (!isNaN(num)) {
                slider.value = num;
                input.value = Number(slider.value).toFixed(decimals);
                updateFlowBadges();
            }
        });
    };

    bindFlowSlider("dyn-cfg-start", "val-dyn-cfg-start", 1);
    bindFlowSlider("dyn-cfg-end", "val-dyn-cfg-end", 1);
    bindFlowSlider("dyn-cfg-power", "val-dyn-cfg-power", 1);
    bindFlowSlider("flow-base-shift", "val-flow-base-shift", 2);
    bindFlowSlider("flow-max-shift", "val-flow-max-shift", 2);

    // Profile & Mode listeners
    document.getElementById("dyn-cfg-profile")?.addEventListener("change", updateFlowBadges);
    document.getElementById("flow-shift-mode")?.addEventListener("change", updateFlowBadges);

    // Enable/disable toggles
    const dynCfgEnable = document.getElementById("dyn-cfg-enable");
    const dynCfgBody = document.getElementById("dyn-cfg-body");
    dynCfgEnable?.addEventListener("change", () => {
        if (dynCfgBody) {
            dynCfgBody.classList.toggle("is-disabled", !dynCfgEnable.checked);
        }
        updateFlowBadges();
    });

    const shiftEnable = document.getElementById("flow-shift-enable");
    const shiftBody = document.getElementById("flow-shift-body");
    shiftEnable?.addEventListener("change", () => {
        if (shiftBody) {
            shiftBody.classList.toggle("is-disabled", !shiftEnable.checked);
        }
        updateFlowBadges();
    });

    // Info toggle button
    const infoBtn = document.getElementById("btn-flow-info-toggle");
    const infoCallout = document.getElementById("flow-info-callout");
    infoBtn?.addEventListener("click", () => {
        if (infoCallout) {
            infoCallout.style.display = infoCallout.style.display === "block" ? "none" : "block";
        }
    });

    updateFlowBadges();
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

let profileRackInitialized = false;

function setupProfileRack() {
    if (profileRackInitialized) return;
    profileRackInitialized = true;

    const rack = document.querySelector(".zh-profile-rack");
    if (!rack || !el.profileSelect) return;

    // Inject Update button if missing
    let btnUpdate = document.getElementById("btn-update-profile");
    if (!btnUpdate) {
        btnUpdate = document.createElement("button");
        btnUpdate.id = "btn-update-profile";
        btnUpdate.className = "zh-btn zh-btn-primary";
        btnUpdate.title = "Update and overwrite current workflow without prompting";
        btnUpdate.innerHTML = "🔄 Update";
        if (el.btnSaveProfile) {
            rack.insertBefore(btnUpdate, el.btnSaveProfile);
        } else {
            rack.appendChild(btnUpdate);
        }
    }
    el.btnUpdateProfile = btnUpdate;

    if (el.btnSaveProfile) {
        el.btnSaveProfile.innerHTML = "💾 Save As...";
        el.btnSaveProfile.title = "Save current setup as a new Studio Workflow";
    }

    // Attach listeners ONCE
    btnUpdate.addEventListener("click", async () => {
        const currentName = el.profileSelect?.value;
        if (!currentName || currentName === "Untitled Workflow") {
            const name = prompt("Enter workflow name to save:", currentName && currentName !== "Untitled Workflow" ? currentName : "My Studio Workflow");
            if (!name || !name.trim()) return;
            await saveProfileWithName(name.trim());
            return;
        }

        const pData = gatherCurrentProfileData();
        const resp = await fetch("/zombiehaus/studio/profiles/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: currentName, data: pData })
        });
        const res = await resp.json();
        if (res.success) {
            await loadProfiles(currentName);
            showStudioToast(`Updated workflow "${currentName}"!`, "success");
        } else {
            showStudioToast("Update failed: " + (res.message || "Unknown error"), "error");
        }
    });

    el.btnSaveProfile?.addEventListener("click", async () => {
        const currentName = el.profileSelect?.value || "My Studio Workflow";
        const defaultName = currentName === "Untitled Workflow" ? "My Studio Workflow" : `${currentName} (Copy)`;
        const name = prompt("Enter new workflow name to save:", defaultName);
        if (!name || !name.trim()) return;
        await saveProfileWithName(name.trim());
    });

    el.profileSelect?.addEventListener("change", async (e) => {
        const name = e.target.value;
        const resp = await fetch("/zombiehaus/studio/profiles");
        const data = await resp.json();
        const found = data.profiles?.find(p => p.name === name);
        if (found && found.data) {
            applyProfileData(found.data);
            showStudioToast(`Loaded workflow: "${name}"`, "info");
        }
    });

    el.btnExportWorkflow?.addEventListener("click", () => {
        exportStudioWorkflow();
    });

    el.btnImportWorkflow?.addEventListener("click", () => {
        el.workflowFileInput?.click();
    });

    el.workflowFileInput?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            await importStudioWorkflowFile(file);
        }
    });

    el.btnNewWorkflow?.addEventListener("click", () => {
        resetDefaultStudioWorkflow();
    });

    el.btnDeleteProfile?.addEventListener("click", async () => {
        const name = el.profileSelect?.value;
        if (!name) return;
        if (!confirm(`Delete workflow "${name}"?`)) return;

        const resp = await fetch("/zombiehaus/studio/profiles/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name })
        });
        const res = await resp.json();
        if (res.success) {
            await loadProfiles();
            showStudioToast(`Deleted workflow "${name}".`, "info");
        } else {
            alert(res.message || "Failed to delete profile (built-in profiles cannot be deleted)");
        }
    });
}

async function saveProfileWithName(name) {
    const pData = gatherCurrentProfileData();
    const resp = await fetch("/zombiehaus/studio/profiles/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, data: pData })
    });
    const res = await resp.json();
    if (res.success) {
        await loadProfiles(name);
        showStudioToast(`Saved workflow "${name}"!`, "success");
    } else {
        showStudioToast("Save failed: " + (res.message || "Unknown error"), "error");
    }
}

async function loadProfiles(preferredSelection = null) {
    try {
        const resp = await fetch("/zombiehaus/studio/profiles");
        const data = await resp.json();
        if (data.success && data.profiles && el.profileSelect) {
            const currentSelected = preferredSelection || el.profileSelect.value;
            el.profileSelect.innerHTML = "";
            for (const p of data.profiles) {
                const opt = document.createElement("option");
                opt.value = p.name;
                opt.textContent = p.name;
                el.profileSelect.appendChild(opt);
            }
            if (currentSelected && data.profiles.some(p => p.name === currentSelected)) {
                el.profileSelect.value = currentSelected;
            } else if (data.profiles.length > 0) {
                el.profileSelect.value = data.profiles[0].name;
                applyProfileData(data.profiles[0].data);
            }
        }
    } catch (err) {
        console.error("Error loading profiles:", err);
    }
}

function showStudioToast(message, type = "info") {
    let container = document.getElementById("zh-toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "zh-toast-container";
        container.style.cssText = "position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    const colors = {
        info: "var(--accent-cyan)",
        success: "var(--accent-green)",
        error: "#ff4d4f"
    };
    const accent = colors[type] || colors.info;
    toast.style.cssText = `
        background: rgba(18, 22, 31, 0.95);
        color: #e2e8f0;
        border-left: 3px solid ${accent};
        border-radius: 6px;
        padding: 10px 16px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        backdrop-filter: blur(8px);
        transform: translateY(10px);
        opacity: 0;
        transition: all 0.25s ease-out;
        pointer-events: auto;
    `;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.transform = "translateY(0)";
        toast.style.opacity = "1";
    });
    setTimeout(() => {
        toast.style.transform = "translateY(10px)";
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

function exportStudioWorkflow() {
    const name = el.profileSelect?.value || "Studio_Workflow";
    const data = gatherCurrentProfileData();
    const exportObj = {
        app: "Zombiehaus Studio",
        version: "1.0",
        type: "studio_workflow",
        name: name,
        created_at: new Date().toISOString(),
        workflow: data
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zombiehaus_workflow_${name.replace(/[^\w.-]/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStudioToast(`Exported workflow: "${name}"`, "success");
}

function extractWorkflowFromPng(arrayBuffer) {
    try {
        const dataView = new DataView(arrayBuffer);
        if (dataView.getUint32(0) !== 0x89504E47 || dataView.getUint32(4) !== 0x0D0A1A0A) {
            return null;
        }
        let offset = 8;
        const utf8Decoder = new TextDecoder("utf-8");
        while (offset < arrayBuffer.byteLength - 8) {
            const length = dataView.getUint32(offset);
            const type = utf8Decoder.decode(new Uint8Array(arrayBuffer, offset + 4, 4));
            if (type === "tEXt" || type === "iTXt") {
                const chunkData = new Uint8Array(arrayBuffer, offset + 8, length);
                let nullIdx = -1;
                for (let i = 0; i < chunkData.length; i++) {
                    if (chunkData[i] === 0) {
                        nullIdx = i;
                        break;
                    }
                }
                if (nullIdx !== -1) {
                    const keyword = utf8Decoder.decode(chunkData.subarray(0, nullIdx));
                    if (keyword === "extra_pnginfo" || keyword === "workflow") {
                        let textStr = null;
                        if (type === "tEXt") {
                            textStr = utf8Decoder.decode(chunkData.subarray(nullIdx + 1));
                        } else {
                            const compFlag = chunkData[nullIdx + 1];
                            if (compFlag === 0) {
                                let curr = nullIdx + 3;
                                while (curr < chunkData.length && chunkData[curr] !== 0) curr++;
                                curr++;
                                while (curr < chunkData.length && chunkData[curr] !== 0) curr++;
                                curr++;
                                textStr = utf8Decoder.decode(chunkData.subarray(curr));
                            }
                        }
                        if (textStr) {
                            const parsed = JSON.parse(textStr);
                            if (parsed.zombiehaus_studio_workflow) {
                                return parsed.zombiehaus_studio_workflow;
                            }
                        }
                    }
                }
            }
            offset += 12 + length;
        }
    } catch (e) {
        console.warn("Failed parsing PNG chunk metadata:", e);
    }
    return null;
}

async function importStudioWorkflowFile(file) {
    if (!file) return;
    try {
        let workflowData = null;
        let workflowName = file.name.replace(/\.[^/.]+$/, "");

        if (file.name.endsWith(".png")) {
            const buf = await file.arrayBuffer();
            workflowData = extractWorkflowFromPng(buf);
            if (!workflowData) {
                showStudioToast("No Zombiehaus Studio Workflow found in PNG metadata.", "error");
                return;
            }
        } else {
            const text = await file.text();
            const parsed = JSON.parse(text);
            if (parsed.workflow) {
                workflowData = parsed.workflow;
                if (parsed.name) workflowName = parsed.name;
            } else if (parsed.architecture || parsed.mode || parsed.checkpoint_name) {
                workflowData = parsed;
            } else {
                showStudioToast("Unrecognized workflow JSON format.", "error");
                return;
            }
        }

        if (workflowData) {
            applyProfileData(workflowData);

            if (el.profileSelect) {
                let optExists = false;
                for (const opt of el.profileSelect.options) {
                    if (opt.value === workflowName) {
                        opt.selected = true;
                        optExists = true;
                        break;
                    }
                }
                if (!optExists) {
                    const opt = document.createElement("option");
                    opt.value = workflowName;
                    opt.textContent = `📁 ${workflowName} (Imported)`;
                    opt.selected = true;
                    el.profileSelect.insertBefore(opt, el.profileSelect.firstChild);
                }
            }

            showStudioToast(`Imported workflow "${workflowName}" successfully!`, "success");
        }
    } catch (err) {
        console.error("Failed to import studio workflow:", err);
        showStudioToast("Failed to import workflow: " + err.message, "error");
    } finally {
        if (el.workflowFileInput) el.workflowFileInput.value = "";
    }
}

function resetDefaultStudioWorkflow() {
    if (!confirm("Reset Studio to a clean default workflow? Any unsaved modifications will be cleared.")) return;
    const defaultData = {
        mode: "image",
        architecture: "chroma",
        checkpoint_name: "None",
        unet_name: "None",
        weight_dtype: "default",
        clip_name: "disabled",
        clip_type: "flux2",
        vae_name: "None",
        chroma_shift: 1.15,
        guidance: 3.5,
        dyn_cfg_enable: true,
        dyn_cfg_mode: "CFG Scale (Chroma / SDXL / SD1.5)",
        dyn_cfg_profile: "cosine",
        dyn_cfg_start: 3.5,
        dyn_cfg_end: 1.8,
        dyn_cfg_power: 1.0,
        flow_shift_enable: true,
        flow_shift_mode: "Auto (from Latent / Image)",
        flow_base_shift: 0.35,
        flow_max_shift: 1.15,
        loras: [],
        width: 1024,
        height: 1024,
        batch: 1,
        seed: 0,
        steps: 30,
        cfg: 3.5,
        sampler_name: "euler_ancestral",
        scheduler: "simple",
        enable_hires: false,
        hires_scale: 1.5,
        hires_denoise: 0.35,
        enable_detailer: true,
        detailer_confidence: 0.3,
        detailers: [{ model: "face_yolov8m.pt", denoise: 0.45, steps: 20 }],
        enable_dewax: false,
        dewax_grain: 0.05,
        enable_restormer: false,
        restormer_task: "Real-World Image Denoising",
        enable_upscale: false,
        upscale_model: "None",
        positive_prompt: "",
        negative_prompt: "",
        mute_negative: false,
        prompt_style: "Natural Prose (FLUX / SD3)",
        script_text: "",
        style_movement: "none_photorealistic",
        color_palette: "natural_balance",
        style_strength: 1.0,
        glamour_enable: false,
        glamour_age: 0.0,
        glamour_smile: 0.0,
        glamour_skin: 0.0,
        glamour_ethnicity: "keep_original",
        glamour_hair: "keep_original",
        glamour_eyes: "keep_original",
        glamour_breasts: 0.0,
        glamour_waist: 0.0,
        glamour_hips: 0.0,
        glamour_muscle: 0.0,
        i2i_task: "wardrobe",
        i2i_garment_preset: "all_garments",
        i2i_grow_mask: 16,
        i2i_blur_mask: 8,
        i2i_fidelity: 75,
        i2i_positive: "",
        i2i_negative: ""
    };
    applyProfileData(defaultData);
    if (el.profileSelect) {
        let newOpt = el.profileSelect.querySelector("option[value='Untitled Workflow']");
        if (!newOpt) {
            newOpt = document.createElement("option");
            newOpt.value = "Untitled Workflow";
            newOpt.textContent = "📄 Untitled Workflow";
            el.profileSelect.insertBefore(newOpt, el.profileSelect.firstChild);
        }
        newOpt.selected = true;
    }
    showStudioToast("Created new default workflow.", "info");
}

function setupGlobalWorkflowDrop() {
    window.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    window.addEventListener("drop", async (e) => {
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        if (file.name.endsWith(".json")) {
            e.preventDefault();
            e.stopPropagation();
            await importStudioWorkflowFile(file);
        } else if (file.type.startsWith("image/") && currentMode !== "image_edit") {
            if (file.name.endsWith(".png")) {
                const buf = await file.arrayBuffer();
                const wf = extractWorkflowFromPng(buf);
                if (wf) {
                    e.preventDefault();
                    e.stopPropagation();
                    applyProfileData(wf);
                    showStudioToast(`Loaded workflow from image "${file.name}"!`, "success");
                }
            }
        }
    });
}

function applyProfileData(data) {
    if (!data) return;
    const setVal = (elInput, val) => {
        if (elInput && val !== undefined && val !== null) {
            elInput.value = val;
            elInput.dispatchEvent(new Event("input"));
            elInput.dispatchEvent(new Event("change"));
        }
    };
    const setChecked = (elCheck, val) => {
        if (elCheck && val !== undefined && val !== null) {
            elCheck.checked = Boolean(val);
            elCheck.dispatchEvent(new Event("change"));
        }
    };

    // 1. Architecture & Models
    setVal(el.architecture, data.architecture);
    setVal(el.checkpoint, data.checkpoint_name);
    setVal(el.unet, data.unet_name);
    setVal(el.dtype, data.weight_dtype);
    setVal(el.clipName, data.clip_name);
    setVal(el.clipType, data.clip_type);
    setVal(el.vae, data.vae_name);
    setVal(el.chromaShift, data.chroma_shift);
    setVal(el.guidance, data.guidance);

    // Flow Dynamics & Dynamic CFG
    if (data.dyn_cfg_enable !== undefined) {
        const dynEnable = document.getElementById("dyn-cfg-enable");
        if (dynEnable) {
            dynEnable.checked = Boolean(data.dyn_cfg_enable);
            dynEnable.dispatchEvent(new Event("change"));
        }
    }
    setVal(document.getElementById("dyn-cfg-mode"), data.dyn_cfg_mode);
    setVal(document.getElementById("dyn-cfg-profile"), data.dyn_cfg_profile);
    if (data.dyn_cfg_start !== undefined) {
        setVal(document.getElementById("dyn-cfg-start"), data.dyn_cfg_start);
        const valInput = document.getElementById("val-dyn-cfg-start");
        if (valInput) valInput.value = Number(data.dyn_cfg_start).toFixed(1);
    } else if (data.guidance !== undefined) {
        setVal(document.getElementById("dyn-cfg-start"), data.guidance);
        const valInput = document.getElementById("val-dyn-cfg-start");
        if (valInput) valInput.value = Number(data.guidance).toFixed(1);
    }
    if (data.dyn_cfg_end !== undefined) {
        setVal(document.getElementById("dyn-cfg-end"), data.dyn_cfg_end);
        const valInput = document.getElementById("val-dyn-cfg-end");
        if (valInput) valInput.value = Number(data.dyn_cfg_end).toFixed(1);
    }
    if (data.dyn_cfg_power !== undefined) {
        setVal(document.getElementById("dyn-cfg-power"), data.dyn_cfg_power);
        const valInput = document.getElementById("val-dyn-cfg-power");
        if (valInput) valInput.value = Number(data.dyn_cfg_power).toFixed(1);
    }

    if (data.flow_shift_enable !== undefined) {
        const shiftEnable = document.getElementById("flow-shift-enable");
        if (shiftEnable) {
            shiftEnable.checked = Boolean(data.flow_shift_enable);
            shiftEnable.dispatchEvent(new Event("change"));
        }
    }
    setVal(document.getElementById("flow-shift-mode"), data.flow_shift_mode);
    if (data.flow_base_shift !== undefined) {
        setVal(document.getElementById("flow-base-shift"), data.flow_base_shift);
        const valInput = document.getElementById("val-flow-base-shift");
        if (valInput) valInput.value = Number(data.flow_base_shift).toFixed(2);
    }
    if (data.flow_max_shift !== undefined) {
        setVal(document.getElementById("flow-max-shift"), data.flow_max_shift);
        const valInput = document.getElementById("val-flow-max-shift");
        if (valInput) valInput.value = Number(data.flow_max_shift).toFixed(2);
    } else if (data.chroma_shift !== undefined) {
        setVal(document.getElementById("flow-max-shift"), data.chroma_shift);
        const valInput = document.getElementById("val-flow-max-shift");
        if (valInput) valInput.value = Number(data.chroma_shift).toFixed(2);
    }

    if (typeof updateFlowBadges === "function") {
        updateFlowBadges();
    }

    if (el.badgeArch && data.architecture) {
        el.badgeArch.textContent = data.architecture.toUpperCase();
    }

    // 2. LoRA Stack
    if (Array.isArray(data.loras) && el.loraStackContainer) {
        el.loraStackContainer.innerHTML = "";
        for (const l of data.loras) {
            const lName = typeof l === "string" ? l : (l.name || "None");
            const lStr = typeof l === "object" && l.strength !== undefined ? l.strength : 1.0;
            addLoraItem(lName, lStr);
        }
        if (data.loras.length === 0) addLoraItem("None", 1.0);
    }

    // 3. Resolution & KSampler
    setVal(el.width, data.width);
    setVal(el.height, data.height);
    setVal(el.batch, data.batch);
    if (data.seed !== undefined) setVal(el.seed, data.seed);
    setVal(el.steps, data.steps);
    setVal(el.cfg, data.cfg);
    setVal(el.sampler, data.sampler_name);
    setVal(el.scheduler, data.scheduler);

    if (el.badgeRes && data.width && data.height) {
        el.badgeRes.textContent = `${data.width} × ${data.height}`;
        document.querySelectorAll(".zh-ratio-btn").forEach(btn => {
            const bw = btn.getAttribute("data-w");
            const bh = btn.getAttribute("data-h");
            if (bw === String(data.width) && bh === String(data.height)) {
                document.querySelectorAll(".zh-ratio-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            }
        });
    }

    // 4. Modular Post-Processing Stages
    if (data.enable_hires !== undefined) setChecked(el.enableHires, data.enable_hires);
    setVal(el.hiresScale, data.hires_scale);
    setVal(el.hiresDenoise, data.hires_denoise);

    if (data.enable_detailer !== undefined) setChecked(el.enableDetailer, data.enable_detailer);
    if (data.detailer_confidence !== undefined) {
        const confNum = document.getElementById("detailer-global-confidence");
        const confSlider = document.getElementById("detailer-global-confidence-slider");
        if (confNum) confNum.value = Number(data.detailer_confidence).toFixed(2);
        if (confSlider) confSlider.value = data.detailer_confidence;
    }
    if (Array.isArray(data.detailers) && el.detailerStackContainer) {
        detailerPasses = [];
        for (const d of data.detailers) {
            addDetailerItem(d);
        }
        if (data.detailers.length === 0) addDetailerItem({ model: "face-yolo8n.pt", denoise: 0.40, steps: 20 });
    }

    if (data.enable_dewax !== undefined) setChecked(el.enableDewax, data.enable_dewax);
    setVal(el.dewaxGrain, data.dewax_grain);

    if (data.enable_restormer !== undefined) setChecked(el.enableRestormer, data.enable_restormer);
    setVal(el.restormerTask, data.restormer_task);

    if (data.enable_upscale !== undefined) setChecked(el.enableUpscale, data.enable_upscale);
    setVal(el.upscaleModel, data.upscale_model);

    // 5. Prompts & Scripts
    if (data.positive_prompt !== undefined) {
        setVal(el.positiveEditor, data.positive_prompt);
        if (typeof updateSyntaxHighlighting === "function") updateSyntaxHighlighting(el.positiveEditor, el.positiveBackdrop);
    }
    if (data.negative_prompt !== undefined) {
        setVal(el.negativeEditor, data.negative_prompt);
        if (typeof updateSyntaxHighlighting === "function") updateSyntaxHighlighting(el.negativeEditor, el.negativeBackdrop);
    }
    if (data.mute_negative !== undefined) setChecked(el.muteNegativeCheckbox, data.mute_negative);
    setVal(el.promptStyle, data.prompt_style);
    if (data.script_text !== undefined) {
        setVal(el.scriptEditor, data.script_text);
        if (typeof updateSyntaxHighlighting === "function") updateSyntaxHighlighting(el.scriptEditor, el.scriptBackdrop);
    }

    // 6. Style Harmonizer
    setVal(el.styleMovementSelect, data.style_movement);
    setVal(el.colorPaletteSelect, data.color_palette);
    setVal(el.styleStrengthSlider, data.style_strength);

    // 7. Glamour & Body Sculpting
    if (data.glamour_enable !== undefined) setChecked(el.glamourEnable, data.glamour_enable);
    setVal(el.glamourAge, data.glamour_age);
    setVal(el.glamourSmile, data.glamour_smile);
    setVal(el.glamourSkin, data.glamour_skin);
    setVal(el.glamourEthnicity, data.glamour_ethnicity);
    setVal(el.glamourHair, data.glamour_hair);
    setVal(el.glamourEyes, data.glamour_eyes);
    setVal(el.glamourBreasts, data.glamour_breasts);
    setVal(el.glamourWaist, data.glamour_waist);
    setVal(el.glamourHips, data.glamour_hips);
    setVal(el.glamourMuscle, data.glamour_muscle);

    // 8. Image Edit / Wardrobe
    if (data.i2i_task && typeof setI2iTask === "function") {
        setI2iTask(data.i2i_task);
        document.querySelectorAll(".zh-i2i-mode-pills [data-i2i-task]").forEach(tab => {
            if (tab.getAttribute("data-i2i-task") === data.i2i_task) {
                document.querySelectorAll(".zh-i2i-mode-pills [data-i2i-task]").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
            }
        });
    }
    setVal(el.i2iGarmentPreset, data.i2i_garment_preset);
    setVal(el.i2iGrowMask, data.i2i_grow_mask);
    setVal(el.i2iBlurMask, data.i2i_blur_mask);
    setVal(el.i2iFidelitySlider, data.i2i_fidelity);
    setVal(el.i2iPositiveEditor, data.i2i_positive);
    setVal(el.i2iNegativeEditor, data.i2i_negative);

    // 9. Video Settings
    setVal(el.videoArch, data.video_arch);
    setVal(el.videoModel, data.video_model);
    setVal(el.videoFps, data.video_fps);
    setVal(el.videoCodec, data.video_codec);
    setVal(el.videoMotion, data.video_motion);
    setVal(el.videoDenoise, data.video_denoise);
    setVal(el.videoDuration, data.video_duration);
    setVal(el.videoSteps, data.video_steps);
    setVal(el.videoPromptEditor, data.video_prompt);

    // 10. Music Settings
    setVal(el.musicGenre, data.music_genre);
    setVal(el.musicVocalStyle, data.music_vocal_style);
    setVal(el.musicKey, data.music_key);
    setVal(el.musicBpm, data.music_bpm);
    if (data.music_mastering !== undefined) setChecked(el.musicMastering, data.music_mastering);
    if (data.music_stereo_3d !== undefined) setChecked(el.musicStereo3D, data.music_stereo_3d);
    setVal(el.musicTitle, data.music_title);
    setVal(el.musicStyleTags, data.music_style_tags);
    setVal(el.musicLyricsEditor, data.music_lyrics);

    // 11. Active Mode
    if (data.mode && data.mode !== currentMode) {
        const modeBtn = document.getElementById(`mode-btn-${data.mode}`);
        modeBtn?.click();
    }
}

function gatherCurrentProfileData() {
    return {
        // Mode & Architecture
        mode: currentMode,
        architecture: el.architecture?.value || "chroma",
        checkpoint_name: el.checkpoint?.value || "None",
        unet_name: el.unet?.value || "None",
        weight_dtype: el.dtype?.value || "default",
        clip_name: el.clipName?.value || "disabled",
        clip_type: el.clipType?.value || "flux2",
        vae_name: el.vae?.value || "None",
        chroma_shift: parseFloat(document.getElementById("flow-max-shift")?.value || el.chromaShift?.value || "1.15"),
        guidance: parseFloat(document.getElementById("dyn-cfg-start")?.value || el.guidance?.value || "3.5"),

        // Flow Dynamics & Dynamic CFG Decay
        dyn_cfg_enable: document.getElementById("dyn-cfg-enable") ? document.getElementById("dyn-cfg-enable").checked : true,
        dyn_cfg_mode: document.getElementById("dyn-cfg-mode")?.value || "CFG Scale (Chroma / SDXL / SD1.5)",
        dyn_cfg_profile: document.getElementById("dyn-cfg-profile")?.value || "cosine",
        dyn_cfg_start: parseFloat(document.getElementById("dyn-cfg-start")?.value || "3.5"),
        dyn_cfg_end: parseFloat(document.getElementById("dyn-cfg-end")?.value || "1.8"),
        dyn_cfg_power: parseFloat(document.getElementById("dyn-cfg-power")?.value || "1.0"),
        flow_shift_enable: document.getElementById("flow-shift-enable") ? document.getElementById("flow-shift-enable").checked : true,
        flow_shift_mode: document.getElementById("flow-shift-mode")?.value || "Auto (from Latent / Image)",
        flow_base_shift: parseFloat(document.getElementById("flow-base-shift")?.value || "0.35"),
        flow_max_shift: parseFloat(document.getElementById("flow-max-shift")?.value || "1.15"),

        // LoRAs
        loras: getLoraStackData(),

        // Canvas & KSampler
        width: parseInt(el.width?.value || "1024", 10),
        height: parseInt(el.height?.value || "1024", 10),
        batch: parseInt(el.batch?.value || "1", 10),
        seed: parseInt(el.seed?.value || "0", 10),
        steps: parseInt(el.steps?.value || "30", 10),
        cfg: parseFloat(el.cfg?.value || "3.5"),
        sampler_name: el.sampler?.value || "euler_ancestral",
        scheduler: el.scheduler?.value || "simple",

        // Modular Post-processing Stages
        enable_hires: el.enableHires?.checked ?? false,
        hires_scale: parseFloat(el.hiresScale?.value || "1.5"),
        hires_denoise: parseFloat(el.hiresDenoise?.value || "0.35"),

        enable_detailer: el.enableDetailer?.checked ?? true,
        detailer_confidence: parseFloat(document.getElementById("detailer-global-confidence")?.value || "0.3"),
        detailers: getDetailerStackData(),

        enable_dewax: el.enableDewax?.checked ?? false,
        dewax_grain: parseFloat(el.dewaxGrain?.value || "0.05"),

        enable_restormer: el.enableRestormer?.checked ?? false,
        restormer_task: el.restormerTask?.value || "Real-World Image Denoising",

        enable_upscale: el.enableUpscale?.checked ?? false,
        upscale_model: el.upscaleModel?.value || "None",

        // Prompts & Script
        positive_prompt: el.positiveEditor?.value || "",
        negative_prompt: el.negativeEditor?.value || "",
        mute_negative: el.muteNegativeCheckbox?.checked ?? false,
        prompt_style: el.promptStyle?.value || "Natural Prose (FLUX / SD3)",
        script_text: el.scriptEditor?.value || "",

        // Style Harmonizer
        style_movement: el.styleMovementSelect?.value || "none_photorealistic",
        color_palette: el.colorPaletteSelect?.value || "natural_balance",
        style_strength: parseFloat(el.styleStrengthSlider?.value || "1.0"),

        // Glamour & Anatomy Sculpting
        glamour_enable: el.glamourEnable?.checked ?? false,
        glamour_age: parseFloat(el.glamourAge?.value || "0.0"),
        glamour_smile: parseFloat(el.glamourSmile?.value || "0.0"),
        glamour_skin: parseFloat(el.glamourSkin?.value || "0.0"),
        glamour_ethnicity: el.glamourEthnicity?.value || "keep_original",
        glamour_hair: el.glamourHair?.value || "keep_original",
        glamour_eyes: el.glamourEyes?.value || "keep_original",
        glamour_breasts: parseFloat(el.glamourBreasts?.value || "0.0"),
        glamour_waist: parseFloat(el.glamourWaist?.value || "0.0"),
        glamour_hips: parseFloat(el.glamourHips?.value || "0.0"),
        glamour_muscle: parseFloat(el.glamourMuscle?.value || "0.0"),

        // Image Edit / Wardrobe
        i2i_task: i2iCurrentTask || "wardrobe",
        i2i_garment_preset: el.i2iGarmentPreset?.value || "all_garments",
        i2i_grow_mask: parseInt(el.i2iGrowMask?.value || "16", 10),
        i2i_blur_mask: parseInt(el.i2iBlurMask?.value || "8", 10),
        i2i_fidelity: parseFloat(el.i2iFidelitySlider?.value || "75"),
        i2i_positive: el.i2iPositiveEditor?.value || "",
        i2i_negative: el.i2iNegativeEditor?.value || "",

        // Video Settings
        video_arch: el.videoArch?.value || "wan21",
        video_model: el.videoModel?.value || "None",
        video_fps: parseInt(el.videoFps?.value || "30", 10),
        video_codec: el.videoCodec?.value || "h264",
        video_motion: parseFloat(el.videoMotion?.value || "1.0"),
        video_denoise: parseFloat(el.videoDenoise?.value || "1.0"),
        video_duration: parseInt(el.videoDuration?.value || "5", 10),
        video_steps: parseInt(el.videoSteps?.value || "30", 10),
        video_prompt: el.videoPromptEditor?.value || "",

        // Music Settings
        music_genre: el.musicGenre?.value || "Pop / Dance Anthem",
        music_vocal_style: el.musicVocalStyle?.value || "Female Belter",
        music_key: el.musicKey?.value || "A minor",
        music_bpm: parseInt(el.musicBpm?.value || "128", 10),
        music_mastering: el.musicMastering?.checked ?? true,
        music_stereo_3d: el.musicStereo3D?.checked ?? true,
        music_title: el.musicTitle?.value || "",
        music_style_tags: el.musicStyleTags?.value || "",
        music_lyrics: el.musicLyricsEditor?.value || ""
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
    if (msg.type === "status") {
        const remaining = msg.data?.status?.exec_info?.queue_remaining ?? 0;
        updateQueueDisplay(remaining);
    } else if (msg.type === "progress") {
        const val = msg.data.value;
        const max = msg.data.max;
        const pct = Math.round((val / max) * 100);
        if (el.progressWrap) el.progressWrap.style.display = "block";
        if (el.progressFill) el.progressFill.style.width = `${pct}%`;
        if (el.progressStep) el.progressStep.textContent = `Processing step ${val} / ${max}`;
        if (el.progressPercent) el.progressPercent.textContent = `${pct}%`;
    } else if (msg.type === "executing") {
        if (msg.data.node === null) {
            if (el.progressFill) el.progressFill.style.width = "100%";
            setTimeout(async () => {
                try {
                    const qRes = await fetch("/queue");
                    const qData = await qRes.json();
                    const pendingCount = (qData.queue_running?.length || 0) + (qData.queue_pending?.length || 0);
                    updateQueueDisplay(pendingCount);
                    if (pendingCount === 0 && el.progressWrap) {
                        el.progressWrap.style.display = "none";
                    }
                } catch (_) {}
            }, 250);
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
        showStudioToast("Generation Error: " + (msg.data.exception_message || "Unknown error"), "error");
        setTimeout(async () => {
            try {
                const qRes = await fetch("/queue");
                const qData = await qRes.json();
                const pendingCount = (qData.queue_running?.length || 0) + (qData.queue_pending?.length || 0);
                updateQueueDisplay(pendingCount);
            } catch (_) {
                setGeneratingState(false);
            }
        }, 300);
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

function setupActionRackControls() {
    const actionRack = document.querySelector(".zh-action-rack");
    if (!actionRack) return;

    // Inject Queue Pill if missing
    if (!document.getElementById("zh-queue-pill")) {
        const pill = document.createElement("span");
        pill.id = "zh-queue-pill";
        pill.className = "zh-queue-pill";
        pill.style.display = "none";
        pill.innerHTML = `<span class="zh-queue-pulse"></span><span id="zh-queue-text">Queue: 0</span>`;
        const connPill = document.getElementById("connection-pill");
        if (connPill && connPill.nextSibling) {
            actionRack.insertBefore(pill, connPill.nextSibling);
        } else {
            actionRack.prepend(pill);
        }
    }

    // Inject Batch Queue Select if missing
    if (!document.getElementById("zh-batch-queue-select") && el.btnGenerate) {
        const select = document.createElement("select");
        select.id = "zh-batch-queue-select";
        select.className = "zh-select zh-queue-dropdown";
        select.title = "Batch Queue Count: Queue multiple generations at once";
        select.innerHTML = `
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
            <option value="4">4x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
        `;
        actionRack.insertBefore(select, el.btnGenerate);
    }
}

function setGeneratingState(isGenerating) {
    if (isGenerating) {
        if (el.btnGenerate) {
            el.btnGenerate.disabled = false;
            el.btnGenerate.classList.add("is-queuing");
        }
        if (el.genBtnLabel) el.genBtnLabel.textContent = "QUEUE (+1)";
        if (el.btnInterrupt) el.btnInterrupt.style.display = "inline-flex";
    } else {
        if (el.btnGenerate) {
            el.btnGenerate.disabled = false;
            el.btnGenerate.classList.remove("is-queuing");
        }
        if (el.genBtnLabel) el.genBtnLabel.textContent = "GENERATE";
        if (el.btnInterrupt) el.btnInterrupt.style.display = "none";
        const qPill = document.getElementById("zh-queue-pill");
        if (qPill) qPill.style.display = "none";
    }
}

function updateQueueDisplay(remainingCount) {
    const qPill = document.getElementById("zh-queue-pill");
    const qText = document.getElementById("zh-queue-text");

    if (remainingCount > 0) {
        if (qPill) qPill.style.display = "inline-flex";
        if (qText) qText.textContent = `Queue: ${remainingCount}`;
        setGeneratingState(true);
    } else {
        if (qPill) qPill.style.display = "none";
        setGeneratingState(false);
    }
}

// ── 6. Prompt Construction & Execution Across All 4 Modes ────────────────────

function buildCurrentPromptGraph(actualSeed) {
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
        let modelPipe = ["2", 5];

        // 1. Resolution Timestep Shift (ZombiehausChromaShift)
        const shiftCheckbox = document.getElementById("flow-shift-enable");
        const shiftEnabled = shiftCheckbox ? shiftCheckbox.checked : true;
        if (shiftEnabled) {
            const baseShift = parseFloat(document.getElementById("flow-base-shift")?.value || "0.35");
            const maxShift = parseFloat(document.getElementById("flow-max-shift")?.value || "1.15");
            const shiftMode = document.getElementById("flow-shift-mode")?.value || "Auto (from Latent / Image)";
            promptGraph["2_shift"] = {
                "class_type": "ZombiehausChromaShift",
                "inputs": {
                    "pipe": modelPipe,
                    "base_shift": isNaN(baseShift) ? 0.35 : baseShift,
                    "max_shift": isNaN(maxShift) ? 1.15 : maxShift,
                    "width": parseInt(el.width?.value || "1024", 10),
                    "height": parseInt(el.height?.value || "1024", 10),
                    "mode": shiftMode,
                    "fixed_shift": 1.0
                }
            };
            modelPipe = ["2_shift", 1];
        }

        // 2. Dynamic CFG Guidance Decay (ZombiehausDynamicGuidance)
        const dynCfgCheckbox = document.getElementById("dyn-cfg-enable");
        const dynCfgEnabled = dynCfgCheckbox ? dynCfgCheckbox.checked : true;
        let dynCfgStartVal = parseFloat(el.cfg?.value || "3.5");
        if (dynCfgEnabled) {
            const scaleStart = parseFloat(document.getElementById("dyn-cfg-start")?.value || "3.5");
            const scaleEnd = parseFloat(document.getElementById("dyn-cfg-end")?.value || "1.8");
            const decayPower = parseFloat(document.getElementById("dyn-cfg-power")?.value || "1.0");
            const decayProfile = document.getElementById("dyn-cfg-profile")?.value || "cosine";
            const guidanceMode = document.getElementById("dyn-cfg-mode")?.value || "CFG Scale (Chroma / SDXL / SD1.5)";
            dynCfgStartVal = isNaN(scaleStart) ? 3.5 : scaleStart;
            promptGraph["2_guidance"] = {
                "class_type": "ZombiehausDynamicGuidance",
                "inputs": {
                    "pipe": modelPipe,
                    "scale_start": dynCfgStartVal,
                    "scale_end": isNaN(scaleEnd) ? 1.8 : scaleEnd,
                    "decay_power": isNaN(decayPower) ? 1.0 : decayPower,
                    "decay_profile": decayProfile,
                    "guidance_mode": guidanceMode
                }
            };
            modelPipe = ["2_guidance", 1];
        }

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
                    "pipe": modelPipe,
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
                    "pipe": modelPipe,
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

    return promptGraph;
}

async function submitSinglePrompt(customSeed = null) {
    const seedVal = parseInt(el.seed?.value || "0", 10);
    const actualSeed = customSeed !== null ? customSeed : (seedVal === 0 ? Math.floor(Math.random() * 1000000000) : seedVal);
    const promptGraph = buildCurrentPromptGraph(actualSeed);
    if (!promptGraph) return { success: false, error: "Validation failed" };

    const studioWorkflowPayload = gatherCurrentProfileData();
    const resp = await fetch("/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: clientId,
            prompt: promptGraph,
            extra_data: {
                extra_pnginfo: {
                    zombiehaus_studio_workflow: studioWorkflowPayload
                }
            }
        })
    });
    const data = await resp.json();
    if (data.prompt_id) {
        currentPromptId = data.prompt_id;
        return { success: true, promptId: data.prompt_id };
    } else if (data.error) {
        return { success: false, error: data.error };
    }
    return { success: false, error: "Unknown response from server" };
}

async function triggerGenerate() {
    const countSelect = document.getElementById("zh-batch-queue-select");
    const count = parseInt(countSelect?.value || "1", 10);

    setGeneratingState(true);
    if (el.progressWrap) {
        el.progressWrap.style.display = "block";
        el.progressFill.style.width = "0%";
        el.progressStep.textContent = count > 1 ? `Queueing ${count} generations...` : "Initializing pipeline...";
        el.progressPercent.textContent = "0%";
    }

    const baseSeedVal = parseInt(el.seed?.value || "0", 10);
    let queuedCount = 0;

    for (let i = 0; i < count; i++) {
        let jobSeed;
        if (baseSeedVal === 0) {
            jobSeed = Math.floor(Math.random() * 1000000000);
        } else {
            jobSeed = baseSeedVal + i;
        }

        const res = await submitSinglePrompt(jobSeed);
        if (res.success) {
            queuedCount++;
        } else {
            setGeneratingState(false);
            showStudioToast("Prompt Error: " + JSON.stringify(res.error), "error");
            break;
        }
    }

    if (queuedCount > 0) {
        showStudioToast(
            queuedCount === 1 ? "Generation queued!" : `Queued ${queuedCount} generations!`,
            "success"
        );
        try {
            const qRes = await fetch("/queue");
            const qData = await qRes.json();
            const pendingCount = (qData.queue_running?.length || 0) + (qData.queue_pending?.length || 0);
            updateQueueDisplay(pendingCount);
        } catch (_) {}
    }
}

async function triggerInterrupt() {
    try {
        await fetch("/interrupt", { method: "POST" });
        await fetch("/queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clear: true })
        });
        setGeneratingState(false);
        updateQueueDisplay(0);
        if (el.progressWrap) el.progressWrap.style.display = "none";
        showStudioToast("Generation stopped & queue cleared.", "info");
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

