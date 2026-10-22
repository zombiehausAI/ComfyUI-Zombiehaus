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
    btnVideo: document.getElementById("mode-btn-video"),
    btnMusic: document.getElementById("mode-btn-music"),

    // Views
    viewScreenplay: document.getElementById("view-screenplay"),
    viewPrompt: document.getElementById("view-prompt"),
    viewVideo: document.getElementById("view-video"),
    viewMusic: document.getElementById("view-music"),

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
    positiveEditor: document.getElementById("positive-editor"),
    negativeEditor: document.getElementById("negative-editor"),
    promptStyle: document.getElementById("prompt-style-select"),
    btnOllama: document.getElementById("btn-ollama-enhance"),

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

async function initStudio() {
    setupSliders();
    setupModeSwitcher();
    setupAspectRatios();
    setupEditorHelpers();
    setupMusicStudio();
    setupVideoStudio();
    setupHotkeys();

    await loadModelAssets();
    await loadProfiles();
    connectWebSocket();
}

function setupSliders() {
    const bindSlider = (slider, display, suffix = "", decimals = 2) => {
        if (!slider || !display) return;
        slider.addEventListener("input", () => {
            display.textContent = Number(slider.value).toFixed(decimals) + suffix;
        });
    };

    bindSlider(el.lora1Strength, el.valLora1, "", 2);
    bindSlider(el.lora2Strength, el.valLora2, "", 2);
    bindSlider(el.chromaShift, el.valChromaShift, "", 1);
    bindSlider(el.guidance, el.valGuidance, "", 1);
    bindSlider(el.steps, el.valSteps, "", 0);
    bindSlider(el.cfg, el.valCfg, "", 1);
    bindSlider(el.dewaxGrain, el.valDewaxGrain, "", 2);

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
    if (el.musicBpm && el.valMusicBpm) {
        el.musicBpm.addEventListener("input", () => {
            el.valMusicBpm.textContent = el.musicBpm.value;
            updateMusicStyleSignature();
        });
    }
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
        [el.btnScreenplay, el.btnPrompt, el.btnVideo, el.btnMusic].forEach(b => b?.classList.remove("active"));
        [el.viewScreenplay, el.viewPrompt, el.viewVideo, el.viewMusic].forEach(v => v?.classList.remove("active"));

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
        }
    };

    el.btnScreenplay?.addEventListener("click", () => setMode("screenplay"));
    el.btnPrompt?.addEventListener("click", () => setMode("prompt"));
    el.btnVideo?.addEventListener("click", () => setMode("video"));
    el.btnMusic?.addEventListener("click", () => setMode("music"));
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
        populateSelect(el.lora1Name, data.loras, "None");
        populateSelect(el.lora2Name, data.loras, "None");
        populateSelect(el.upscaleModel, data.upscalers, "None");
        populateSelect(el.sampler, data.samplers, "euler_ancestral");
        populateSelect(el.scheduler, data.schedulers, "simple");

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

    if (currentMode === "screenplay") {
        promptGraph = {
            "1": {
                "class_type": "ZombiehausModelLoader",
                "inputs": {
                    "unet_name": el.unet?.value || "None",
                    "weight_dtype": el.dtype?.value || "default",
                    "checkpoint_name": el.checkpoint?.value || "None",
                    "clip1_name": el.clipName?.value || "disabled",
                    "clip1_type": el.clipType?.value || "flux2",
                    "vae_name": el.vae?.value || "None"
                }
            },
            "2": {
                "class_type": "ZombiehausLoraLoader",
                "inputs": {
                    "pipe": ["1", 0],
                    "lora_1_name": el.lora1Name?.value || "None",
                    "lora_1_strength": parseFloat(el.lora1Strength?.value || "1.0"),
                    "lora_2_name": el.lora2Name?.value || "None",
                    "lora_2_strength": parseFloat(el.lora2Strength?.value || "1.0")
                }
            },
            "3": {
                "class_type": "ZombiehausLatentPreset",
                "inputs": {
                    "pipe": ["2", 0],
                    "preset": "Manual",
                    "custom_width": parseInt(el.width?.value || "1024", 10),
                    "custom_height": parseInt(el.height?.value || "1024", 10),
                    "batch_size": parseInt(el.batch?.value || "1", 10),
                    "architecture": el.architecture?.value === "sdxl" || el.architecture?.value === "pony" || el.architecture?.value === "sd15" ? "SDXL / Pony (4-channel)" : "Chroma / Flux (16-channel)"
                }
            },
            "4": {
                "class_type": "ZombiehausSceneScriptDirector",
                "inputs": {
                    "pipe": ["3", 0],
                    "script_text": el.scriptEditor?.value || ""
                }
            },
            "5": {
                "class_type": "ZombiehausKSampler",
                "inputs": {
                    "pipe": ["4", 0],
                    "seed": actualSeed,
                    "steps": parseInt(el.steps?.value || "30", 10),
                    "cfg": parseFloat(el.cfg?.value || "3.5"),
                    "sampler_name": el.sampler?.value || "euler_ancestral",
                    "scheduler": el.scheduler?.value || "simple",
                    "denoise": 1.0
                }
            },
            "6": {
                "class_type": "ZombiehausSaveImage",
                "inputs": {
                    "pipe": ["5", 0],
                    "filename_prefix": "Zombiehaus_Director"
                }
            }
        };
    } else if (currentMode === "prompt") {
        promptGraph = {
            "1": {
                "class_type": "ZombiehausModelLoader",
                "inputs": {
                    "unet_name": el.unet?.value || "None",
                    "weight_dtype": el.dtype?.value || "default",
                    "checkpoint_name": el.checkpoint?.value || "None",
                    "clip1_name": el.clipName?.value || "disabled",
                    "clip1_type": el.clipType?.value || "flux2",
                    "vae_name": el.vae?.value || "None"
                }
            },
            "2": {
                "class_type": "ZombiehausLoraLoader",
                "inputs": {
                    "pipe": ["1", 0],
                    "lora_1_name": el.lora1Name?.value || "None",
                    "lora_1_strength": parseFloat(el.lora1Strength?.value || "1.0"),
                    "lora_2_name": el.lora2Name?.value || "None",
                    "lora_2_strength": parseFloat(el.lora2Strength?.value || "1.0")
                }
            },
            "3": {
                "class_type": "ZombiehausLatentPreset",
                "inputs": {
                    "pipe": ["2", 0],
                    "preset": "Manual",
                    "custom_width": parseInt(el.width?.value || "1024", 10),
                    "custom_height": parseInt(el.height?.value || "1024", 10),
                    "batch_size": parseInt(el.batch?.value || "1", 10),
                    "architecture": el.architecture?.value === "sdxl" || el.architecture?.value === "pony" || el.architecture?.value === "sd15" ? "SDXL / Pony (4-channel)" : "Chroma / Flux (16-channel)"
                }
            },
            "4": {
                "class_type": "ZombiehausTextEditor",
                "inputs": {
                    "pipe": ["3", 0],
                    "positive": el.positiveEditor?.value || "",
                    "negative": el.negativeEditor?.value || "",
                    "prompt_style": el.promptStyle?.value || "Natural Prose (FLUX / SD3)"
                }
            },
            "5": {
                "class_type": "ZombiehausKSampler",
                "inputs": {
                    "pipe": ["4", 0],
                    "seed": actualSeed,
                    "steps": parseInt(el.steps?.value || "30", 10),
                    "cfg": parseFloat(el.cfg?.value || "3.5"),
                    "sampler_name": el.sampler?.value || "euler_ancestral",
                    "scheduler": el.scheduler?.value || "simple",
                    "denoise": 1.0
                }
            },
            "6": {
                "class_type": "ZombiehausSaveImage",
                "inputs": {
                    "pipe": ["5", 0],
                    "filename_prefix": "Zombiehaus_Studio"
                }
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

// Start application
window.addEventListener("DOMContentLoaded", initStudio);
